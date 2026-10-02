import os
import torch
from ultralytics import YOLO

class Detector:
    def __init__(self, pose_model='yolo11n-pose.pt', object_model='yolov8n.pt', weapon_model='models/best.pt'):
        # Resolve pose model (local file or auto-downloadable standard model)
        resolved_pose = pose_model
        if not os.path.exists(resolved_pose) and os.path.exists('models/' + pose_model):
            resolved_pose = 'models/' + pose_model
        elif not os.path.exists(resolved_pose):
            resolved_pose = 'yolo11n-pose.pt'

        # Resolve object & vehicle model
        resolved_obj = object_model
        if not os.path.exists(resolved_obj) and os.path.exists('models/' + object_model):
            resolved_obj = 'models/' + object_model
        elif not os.path.exists(resolved_obj):
            resolved_obj = 'yolov8n.pt'

        print(f"[Detector] Loading pose model: {resolved_pose}")
        self.pose_model = YOLO(resolved_pose)
        print(f"[Detector] Loading object model: {resolved_obj}")
        self.object_model = YOLO(resolved_obj)

        # Resolve weapon detection model (custom weight)
        self.weapon_model = None
        if weapon_model and os.path.exists(weapon_model):
            print(f"[Detector] Loading custom weapon model from {weapon_model}")
            self.weapon_model = YOLO(weapon_model)
        elif os.path.exists('models/best.pt'):
            print("[Detector] Loading custom weapon model from models/best.pt")
            self.weapon_model = YOLO('models/best.pt')
        elif os.path.exists('best.pt'):
            print("[Detector] Loading custom weapon model from best.pt")
            self.weapon_model = YOLO('best.pt')
        else:
            print("[Detector] Notice: Custom weapon model 'best.pt' not found. Weapon detection disabled until custom model is trained.")

        # Optimization & caching variables
        self.frame_count = 0
        self.last_weapon_results = None
        self.last_object_results = None

    def process_frame(self, frame, conf_threshold=0.45, active_features=None):
        self.frame_count += 1
        if active_features is None:
            active_features = {}

        run_weapons = active_features.get("weapon_detection", True)
        run_vehicles = active_features.get("vehicle_detection", True)

        # Run inference in torch no_grad mode for zero memory overhead
        with torch.no_grad():
            # 1. Pose estimation & Person tracking (Always runs, powers most logic)
            pose_results = self.pose_model.track(frame, persist=True, tracker="bytetrack.yaml", conf=conf_threshold, verbose=False)

            # 2. Vehicle & Object tracking
            if run_vehicles:
                if self.frame_count % 3 == 0 or self.last_object_results is None:
                    self.last_object_results = self.object_model.track(
                        frame, persist=True, tracker="bytetrack.yaml",
                        classes=[1, 2, 3, 5, 7, 24, 26, 28], conf=conf_threshold, verbose=False
                    )
            else:
                self.last_object_results = None

            # 3. Weapon detection
            if run_weapons and self.weapon_model is not None:
                if self.frame_count % 5 == 0 or self.last_weapon_results is None:
                    self.last_weapon_results = self.weapon_model.predict(frame, conf=conf_threshold, verbose=False)
            else:
                self.last_weapon_results = None

        return pose_results, self.last_object_results, self.last_weapon_results
