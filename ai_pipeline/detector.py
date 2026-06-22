from ultralytics import YOLO

class Detector:
    def __init__(self, pose_model='yolov8n-pose.pt', weapon_model='threat_model.pt'):
        # Initialize YOLOv8 Pose model
        self.pose_model = YOLO(pose_model)
        # Initialize Weapon detection model
        self.weapon_model = YOLO(weapon_model)
        
        # Optimization variables
        self.frame_count = 0
        self.last_weapon_results = None
    
    def process_frame(self, frame):
        self.frame_count += 1
        
        # Run tracking using ByteTrack
        pose_results = self.pose_model.track(frame, persist=True, tracker="bytetrack.yaml", verbose=False)
        
        # OPTIMIZATION: Run weapon detection only once every 5 frames to boost FPS
        # We cache the last result for the frames in between.
        if self.frame_count % 5 == 0 or self.last_weapon_results is None:
            self.last_weapon_results = self.weapon_model.predict(frame, verbose=False)
            
        return pose_results, self.last_weapon_results
