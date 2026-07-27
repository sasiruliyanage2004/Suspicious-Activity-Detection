import torch
from ultralytics import YOLO

class Detector:
    def __init__(self, pose_model='models/yolo11n-pose.pt', object_model='models/yolov8n.pt', weapon_model='models/best.pt'):
        # Initialize YOLO Pose model
        self.pose_model = YOLO(pose_model)
        # Initialize YOLO Object & Vehicle model (Car, Van, Motorcycle, Bus, Truck, Bicycle)
        self.object_model = YOLO(object_model)
        # Initialize Weapon detection model
        self.weapon_model = YOLO(weapon_model)
        
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
            if run_weapons:
                if self.frame_count % 5 == 0 or self.last_weapon_results is None:
                    self.last_weapon_results = self.weapon_model.predict(frame, conf=conf_threshold, verbose=False)
            else:
                self.last_weapon_results = None
            
        return pose_results, self.last_object_results, self.last_weapon_results
