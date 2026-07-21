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
        
        # Emotion state
        self.emotion_alerted = False
        self.last_emotion_alert_time = 0
        
        # Violence state
        self.violence_alerted = False
        self.last_violence_time = 0
    
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
        
        # Calculate instantaneous velocity for fighting detection
        if "prev_pos" in history:
            px, py = history["prev_pos"]
            pt = history["prev_time"]
            dt = current_time - pt
            if dt > 0:
                history["velocity"] = ((cx - px)**2 + (cy - py)**2)**0.5 / dt
        
        history["prev_pos"] = (cx, cy)
        history["prev_time"] = current_time
        
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

        # 2. Suspicious Activity (Loitering) Detection
        last_x, last_y = history["last_pos"]
        # Calculate squared distance to avoid math.sqrt
        sq_distance = (cx - last_x)**2 + (cy - last_y)**2
        
        if sq_distance > self.movement_threshold**2:
            # Person has moved significantly, reset the timer and position
            history["first_seen"] = current_time
            history["last_pos"] = (cx, cy)
            history["alerted"] = False

        time_spent = current_time - history["first_seen"]
        
        # Trigger alert if they stay in the same area for more than 4 seconds
        if time_spent > 4.0:
            is_new = not history["alerted"]
            history["alerted"] = True
            return {
                "behavior": "Suspicious Activity",
                "confidence": 0.88,
                "details": f"Person {track_id} detected exhibiting suspicious stationary behavior for {time_spent:.1f}s",
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

    def analyze_emotion(self, dominant_emotion, confidence):
        current_time = time.time()
        
        # Define high stress emotions
        high_stress = ["angry", "fear", "disgust"]
        
        if dominant_emotion in high_stress and confidence > 0.6:
            is_new = not self.emotion_alerted
            self.emotion_alerted = True
            self.last_emotion_alert_time = current_time
            
            return {
                "behavior": "Suspicious Emotion",
                "confidence": float(confidence),
                "details": f"High stress emotion detected: {dominant_emotion.upper()} ({confidence*100:.1f}%)",
                "is_new": is_new
            }
        else:
            # Reset emotion alert after 5 seconds of normal emotion
            if current_time - self.last_emotion_alert_time > 5.0:
                self.emotion_alerted = False
            return None

    def analyze_group_behavior(self, current_tracks, boxes):
        current_time = time.time()
        n = len(current_tracks)
        
        # We need at least 2 people to fight
        if n < 2:
            if current_time - self.last_violence_time > 5.0:
                self.violence_alerted = False
            return None
            
        for i in range(n):
            for j in range(i+1, n):
                id1 = current_tracks[i]
                id2 = current_tracks[j]
                
                box1 = boxes[i]
                box2 = boxes[j]
                
                # Calculate distance between centers
                cx1, cy1 = (box1[0]+box1[2])/2, (box1[1]+box1[3])/2
                cx2, cy2 = (box2[0]+box2[2])/2, (box2[1]+box2[3])/2
                
                dist = ((cx1-cx2)**2 + (cy1-cy2)**2)**0.5
                
                # If they are very close (e.g. < 200 pixels)
                if dist < 200:
                    v1 = self.track_history.get(id1, {}).get("velocity", 0)
                    v2 = self.track_history.get(id2, {}).get("velocity", 0)
                    
                    # If both are moving rapidly (e.g. > 250 pixels/sec)
                    if v1 > 250 and v2 > 250:
                        is_new = not self.violence_alerted
                        self.violence_alerted = True
                        self.last_violence_time = current_time
                        return {
                            "behavior": "Violence Detected",
                            "confidence": 0.85,
                            "details": f"Physical altercation detected between IDs {id1} and {id2}",
                            "is_new": is_new
                        }
        
        # Reset alert if no fighting detected recently
        if current_time - self.last_violence_time > 5.0:
            self.violence_alerted = False
            
        return None
