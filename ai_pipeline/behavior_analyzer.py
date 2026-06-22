import time

class BehaviorAnalyzer:
    def __init__(self):
        # Dictionary to store tracking history: { track_id: {"first_seen": timestamp, "last_pos": (x,y)} }
        self.track_history = {}
        # Simple loitering threshold (seconds)
        self.loitering_threshold = 2.0
        # Movement threshold to consider "same place"
        self.movement_threshold = 50.0 
        # Weapon state
        self.weapon_alerted = False
        self.last_weapon_alert_time = 0
    
    def analyze(self, track_id, bbox, keypoints=None, conf=0.9):
        # Extract center of bounding box
        x1, y1, x2, y2 = bbox
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        
        current_time = time.time()
        
        if track_id not in self.track_history:
            self.track_history[track_id] = {
                "first_seen": current_time,
                "last_pos": (cx, cy),
                "alerted": False,
                "fall_alerted": False
            }
            return {
                "behavior": "Person Detected",
                "confidence": float(conf),
                "details": f"Person {track_id} entered the camera view.",
                "is_new": True
            }
        
        history = self.track_history[track_id]
        
        # 1. Fall Detection (using Pose Keypoints)
        if keypoints is not None and len(keypoints) >= 13:
            # keypoints shape is usually (17, 2) or (17, 3)
            # 0: Nose, 11: Left Hip, 12: Right Hip
            nose_y = keypoints[0][1]
            l_hip_y = keypoints[11][1]
            r_hip_y = keypoints[12][1]
            
            # If nose is below hips (Y increases downwards in images)
            if nose_y > l_hip_y and nose_y > r_hip_y:
                is_new_fall = not history.get("fall_alerted", False)
                history["fall_alerted"] = True
                return {
                    "behavior": "Falling Detected",
                    "confidence": 0.90,
                    "details": f"Person {track_id} has fallen down!",
                    "is_new": is_new_fall
                }
            else:
                # Reset fall alert if they stand back up
                history["fall_alerted"] = False

        # 2. Loitering Detection
        time_spent = current_time - history["first_seen"]
        
        if time_spent > self.loitering_threshold:
            is_new = not history["alerted"]
            history["alerted"] = True
            return {
                "behavior": "Loitering",
                "confidence": 0.85,
                "details": f"Person {track_id} loitering for {time_spent:.1f}s",
                "is_new": is_new
            }
        
        return None

    def analyze_weapons(self, weapon_results, threshold=0.65):
        current_time = time.time()
        
        # Check if weapon model detected anything
        if not weapon_results or len(weapon_results) == 0:
            return None
            
        boxes = weapon_results[0].boxes
        if boxes is None or len(boxes) == 0:
            # No weapons detected. Reset alert after 5 seconds of clear frame
            if current_time - self.last_weapon_alert_time > 5.0:
                self.weapon_alerted = False
            return None
            
        # Iterate over detections
        for box in boxes:
            conf = box.conf.item()
            # Usually class 0 or 1 in weapon models represents a weapon (pistol/knife)
            # Dynamic threshold
            if conf > threshold:
                cls_id = int(box.cls.item())
                weapon_type = weapon_results[0].names[cls_id].capitalize()
                
                # Filter out mobile phones (tall vertical rectangles)
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                width = x2 - x1
                height = y2 - y1
                if weapon_type == "Gun" and height > width * 1.5:
                    continue
                
                is_new = not self.weapon_alerted
                self.weapon_alerted = True
                self.last_weapon_alert_time = current_time
                
                return {
                    "behavior": f"{weapon_type} Detected",
                    "confidence": float(conf),
                    "details": f"{weapon_type} detected with {conf*100:.1f}% confidence!",
                    "is_new": is_new
                }
        return None
