import time
import cv2
import numpy as np

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
    
    def analyze(self, track_id, bbox, keypoints=None, conf=0.9, zone_points=None, active_features=None):
        if active_features is None:
            active_features = {}
        # Extract center of bounding box
        x1, y1, x2, y2 = bbox
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        
        # Check intrusion zone if defined
        if zone_points and len(zone_points) >= 3:
            pts = np.array(zone_points, np.int32)
            pts = pts.reshape((-1, 1, 2))
            # If distance is < 0, point is outside the polygon
            dist = cv2.pointPolygonTest(pts, (cx, cy), False)
            if dist < 0:
                return None # Ignore person outside the zone

        current_time = time.time()
        
        if track_id not in self.track_history:
            self.track_history[track_id] = {
                "first_seen": current_time,
                "last_pos": (cx, cy),
                "last_alert_time": 0,
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
                if active_features.get("violence_detection", True): # Grouping fall with violence/safety
                    return {
                        "behavior": "Falling Detected",
                        "confidence": 0.90,
                        "details": f"Person {track_id} has fallen down!",
                        "is_new": is_new_fall
                    }
            else:
                # Reset fall alert if they stand back up
                history["fall_alerted"] = False

        # 1b. Smoking Detection (using Hand-to-Mouth Pose Dynamics)
        if keypoints is not None and len(keypoints) >= 11:
            nose_x, nose_y = keypoints[0][0], keypoints[0][1]
            lw_x, lw_y = keypoints[9][0], keypoints[9][1]
            rw_x, rw_y = keypoints[10][0], keypoints[10][1]
            
            box_h = max(10, y2 - y1)
            mouth_x, mouth_y = nose_x, nose_y + (0.05 * box_h)
            
            dist_lw = ((lw_x - mouth_x)**2 + (lw_y - mouth_y)**2)**0.5 if (lw_x > 0 and lw_y > 0) else 999
            dist_rw = ((rw_x - mouth_x)**2 + (rw_y - mouth_y)**2)**0.5 if (rw_x > 0 and rw_y > 0) else 999
            
            threshold_dist = 0.18 * box_h
            if dist_lw < threshold_dist or dist_rw < threshold_dist:
                history["smoking_frames"] = history.get("smoking_frames", 0) + 1
                if history["smoking_frames"] >= 6:
                    is_new_smoke = not history.get("smoking_alerted", False)
                    history["smoking_alerted"] = True
                    if active_features.get("smoking_detection", True):
                        return {
                            "behavior": "Smoking Detected",
                            "confidence": 0.92,
                            "details": f"Person {track_id} detected smoking in restricted sector!",
                            "is_new": is_new_smoke
                        }
            else:
                history["smoking_frames"] = max(0, history.get("smoking_frames", 0) - 1)
                if history["smoking_frames"] == 0:
                    history["smoking_alerted"] = False

        # 2. Suspicious Activity (Loitering) Detection
        last_x, last_y = history["last_pos"]
        # Calculate squared distance to avoid math.sqrt
        sq_distance = (cx - last_x)**2 + (cy - last_y)**2
        
        if sq_distance > self.movement_threshold**2:
            # Person has moved significantly, reset the timer and position
            history["first_seen"] = current_time
            history["last_pos"] = (cx, cy)

        time_spent = current_time - history["first_seen"]
        
        # Trigger alert if they stay in the same area for more than 4 seconds
        if time_spent > 4.0:
            is_new = False
            # Implement a 60-second cooldown so we don't spam Telegram for the same person
            if current_time - history.get("last_alert_time", 0) > 60.0:
                is_new = True
                history["last_alert_time"] = current_time
                
            if active_features.get("loitering_detection", True):
                return {
                    "behavior": "Suspicious Activity",
                    "confidence": 0.88,
                    "details": f"Person {track_id} detected exhibiting suspicious stationary behavior.",
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
            
        # Check for Crowd Gathering (3 or more people in close proximity)
        if n >= 3:
            close_count = 0
            for i in range(n):
                for j in range(i+1, n):
                    box1, box2 = boxes[i], boxes[j]
                    cx1, cy1 = (box1[0]+box1[2])/2, (box1[1]+box1[3])/2
                    cx2, cy2 = (box2[0]+box2[2])/2, (box2[1]+box2[3])/2
                    if ((cx1-cx2)**2 + (cy1-cy2)**2)**0.5 < 250:
                        close_count += 1
            if close_count >= 2:
                is_new_crowd = not getattr(self, "crowd_alerted", False)
                self.crowd_alerted = True
                self.last_crowd_time = current_time
                return {
                    "behavior": "People Gathering Detected",
                    "confidence": 0.88,
                    "details": f"High crowd density! {n} persons gathered in close proximity.",
                    "is_new": is_new_crowd
                }

        if hasattr(self, "last_crowd_time") and current_time - self.last_crowd_time > 5.0:
            self.crowd_alerted = False

        return None

    def analyze_unattended_objects(self, object_boxes, object_classes, person_boxes):
        """
        Detects unattended luggage, backpacks, or bags left behind with no owner nearby.
        (COCO classes: 24: backpack, 26: handbag, 28: suitcase)
        """
        current_time = time.time()
        luggage_classes = {24: "Backpack", 26: "Handbag", 28: "Suitcase"}
        
        if not hasattr(self, "unattended_history"):
            self.unattended_history = {}  # { obj_key: {"first_seen": ts, "alerted": bool} }

        for box, cls_id in zip(object_boxes, object_classes):
            if cls_id in luggage_classes:
                obj_name = luggage_classes[cls_id]
                cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
                
                # Check distance to closest person
                near_owner = False
                for p_box in person_boxes:
                    pcx, pcy = (p_box[0] + p_box[2]) / 2, (p_box[1] + p_box[3]) / 2
                    dist = ((cx - pcx)**2 + (cy - pcy)**2)**0.5
                    if dist < 220:
                        near_owner = True
                        break

                obj_key = f"{cls_id}_{int(cx/30)}_{int(cy/30)}"
                if not near_owner:
                    if obj_key not in self.unattended_history:
                        self.unattended_history[obj_key] = {"first_seen": current_time, "alerted": False}
                    
                    time_abandoned = current_time - self.unattended_history[obj_key]["first_seen"]
                    if time_abandoned > 4.0:
                        is_new = not self.unattended_history[obj_key]["alerted"]
                        self.unattended_history[obj_key]["alerted"] = True
                        return {
                            "behavior": "Unattended Object Left Behind",
                            "confidence": 0.91,
                            "details": f"Unattended {obj_name} detected with no owner nearby for {time_abandoned:.1f}s!",
                            "is_new": is_new,
                            "box": box
                        }
                else:
                    self.unattended_history.pop(obj_key, None)

        return None
