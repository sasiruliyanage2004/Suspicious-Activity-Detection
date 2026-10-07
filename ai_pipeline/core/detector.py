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
        base_dir = os.path.dirname(os.path.abspath(__file__))
        candidate_paths = [
            weapon_model if weapon_model else None,
            os.path.join(base_dir, '..', 'models', 'best.pt'),
            os.path.join(base_dir, '..', '..', 'models', 'best.pt'),
            'models/best.pt',
            'ai_pipeline/models/best.pt',
            'best.pt'
        ]
        for p in candidate_paths:
            if p and os.path.exists(p):
                print(f"[Detector] Loading weapon detection model from: {os.path.normpath(p)}")
                try:
                    self.weapon_model = YOLO(p)
                    print(f"[Detector] Weapon model loaded successfully. Classes: {self.weapon_model.names}")
                    break
                except Exception as e:
                    print(f"[Detector] Failed loading weapon model from {p}: {e}")

        if self.weapon_model is None:
            # Attempt auto-download from HuggingFace
            try:
                print("[Detector] Attempting to auto-download weapon detection model from HuggingFace...")
                from huggingface_hub import hf_hub_download
                model_dir = os.path.join(base_dir, '..', 'models')
                os.makedirs(model_dir, exist_ok=True)
                downloaded_path = hf_hub_download(
                    repo_id="Subh775/Threat-Detection-YOLOv8n",
                    filename="best.pt",
                    local_dir=model_dir
                )
                self.weapon_model = YOLO(downloaded_path)
                print(f"[Detector] Downloaded and loaded weapon model successfully: {downloaded_path}")
            except Exception as e:
                print(f"[Detector] Could not auto-download weapon model: {e}")
                print("[Detector] Notice: Fallback knife detection active via object model.")

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

            # 2. Vehicle, Luggage & Knife/Weapon tracking (Classes: 1-bicycle, 2-car, 3-motorcycle, 5-bus, 7-truck, 24-backpack, 26-handbag, 28-suitcase, 34-baseball bat, 43-knife, 76-scissors)
            if run_vehicles or run_weapons:
                if self.frame_count % 3 == 0 or self.last_object_results is None:
                    self.last_object_results = self.object_model.track(
                        frame, persist=True, tracker="bytetrack.yaml",
                        classes=[1, 2, 3, 5, 7, 24, 26, 28, 34, 43, 76], conf=conf_threshold, verbose=False
                    )
            else:
                self.last_object_results = None

            # 3. Dedicated Weapon detection (Gun, Knife, Explosive, Grenade)
            if run_weapons and self.weapon_model is not None:
                if self.frame_count % 2 == 0 or self.last_weapon_results is None:
                    self.last_weapon_results = self.weapon_model.predict(frame, conf=0.25, verbose=False)
            else:
                self.last_weapon_results = None

        return pose_results, self.last_object_results, self.last_weapon_results
