import cv2
import numpy as np
from core.biometric_engine import BiometricEngine

class AttributeRecognizer:
    def __init__(self):
        # Color ranges in HSV space
        self.color_ranges = {
            'White Top': ([0, 0, 180], [180, 55, 255]),
            'Black Top': ([0, 0, 0], [180, 255, 55]),
            'Blue Top': ([95, 70, 60], [130, 255, 255]),
            'Red Top': ([0, 90, 90], [12, 255, 255]),
            'Green Top': ([35, 70, 60], [85, 255, 255]),
            'Yellow Top': ([15, 90, 90], [35, 255, 255]),
            'Grey Top': ([0, 0, 55], [180, 45, 180]),
        }
        # Initialize real mathematical biometric engine
        self.biometric_engine = BiometricEngine()
        self.identity_cache = {}  # Prevent flickering by caching positive recognitions

    def detect_attributes(self, frame, box, keypoints=None, track_id=None):
        """
        Analyzes detected person crop and performs authentic real-time biometric matching against:
        1) Secure Backend Police Watchlist (High Priority)
        2) Corporate Employee Whitelist
        Returns ASCII-clean text array to prevent Windows terminal and OpenCV Unicode crashes.
        """
        x1, y1, x2, y2 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
        h, w = frame.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        
        box_w = x2 - x1
        box_h = y2 - y1
        if box_w <= 15 or box_h <= 15:
            return ["ID: ANALYZING BIOMETRICS...", "Scanning Feature Vectors...", "Status: Pending...", "Person - Dark Top", "PENDING"]

        # 1. Upper Torso Color Analysis
        torso_y1 = y1 + int(box_h * 0.12)
        torso_y2 = y1 + int(box_h * 0.52)
        torso_crop = frame[torso_y1:torso_y2, x1:x2]

        top_color = "Dark Top"
        if torso_crop.size > 0:
            hsv_torso = cv2.cvtColor(torso_crop, cv2.COLOR_BGR2HSV)
            max_pixels = 0
            for label, (lower, upper) in self.color_ranges.items():
                mask = cv2.inRange(hsv_torso, np.array(lower), np.array(upper))
                count = cv2.countNonZero(mask)
                if count > max_pixels:
                    max_pixels = count
                    top_color = label

        # 2. Enhanced Gender & Hairstyle Analysis using Pose Keypoints & Shoulder Span Ratios
        hair_y1 = y1 + int(box_h * 0.08)
        hair_y2 = y1 + int(box_h * 0.30)
        hair_crop = frame[hair_y1:hair_y2, x1:x2]
        hair_style = "Short Hair"
        
        if hair_crop.size > 0:
            hair_hsv = cv2.cvtColor(hair_crop, cv2.COLOR_BGR2HSV)
            dark_hair_mask = cv2.inRange(hair_hsv, np.array([0, 0, 0]), np.array([180, 255, 75]))
            hair_pixels = cv2.countNonZero(dark_hair_mask)
            ratio = hair_pixels / float(hair_crop.shape[0] * hair_crop.shape[1] + 1)
            hair_style = "Long Hair" if ratio > 0.38 else "Short Hair"

        gender = "Male"
        if keypoints is not None and len(keypoints) >= 7:
            ls_x, rs_x = keypoints[5][0], keypoints[6][0]
            shoulder_width = abs(ls_x - rs_x) if (ls_x > 0 and rs_x > 0) else box_w * 0.4
            shoulder_ratio = shoulder_width / float(box_h)
            if (hair_style == "Long Hair" and shoulder_ratio < 0.28) or (shoulder_ratio < 0.22):
                gender = "Female"
        else:
            aspect = box_h / max(1, box_w)
            gender = "Female" if hair_style == "Long Hair" and aspect > 2.3 else "Male"

        # 3. Real Mathematical Biometric Identification (Zero Mock Matches)
        cached = self.identity_cache.get(track_id)
        if cached:
            match_type, profile, score = cached
        else:
            match_type, profile, score = self.biometric_engine.identify_person(frame, box)
            # Cache the identity to prevent flickering once positively identified
            if track_id is not None and match_type != "UNRECOGNIZED":
                self.identity_cache[track_id] = (match_type, profile, score)

        if match_type == "POLICE_WATCHLIST" and profile:
            name_line = f"[!] WANTED: {profile.get('name', 'UNKNOWN').upper()}"
            gender_line = f"GENDER: {gender.upper()}"
            return [name_line, gender_line, "CRIMINAL_WATCHLIST"]
        elif match_type == "AUTHORIZED_STAFF" and profile:
            name_line = f"[+] STAFF: {profile.get('name', 'STAFF').upper()}"
            gender_line = f"GENDER: {gender.upper()}"
            return [name_line, gender_line, "AUTHORIZED_STAFF"]
        else:
            name_line = "[!] UNREGISTERED VISITOR"
            gender_line = f"GENDER: {gender.upper()}"
            return [name_line, gender_line, "UNRECOGNIZED"]

    def draw_attribute_badge(self, image, box, attributes, track_id=None):
        """
        Draws responsive cyber command HUD text (Cinematic Typewriter Effect) without solid backgrounds.
        """
        x1, y1, x2, y2 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
        
        status = attributes[-1] if len(attributes) > 0 else "UNRECOGNIZED"
        lines = attributes[:-1] if len(attributes) > 1 else attributes

        # Typewriter effect logic
        import time
        if not hasattr(self, '_person_times'):
            self._person_times = {}
            
        if track_id is not None:
            if track_id not in self._person_times:
                self._person_times[track_id] = time.time()
            elapsed = time.time() - self._person_times[track_id]
            chars_to_show = int(elapsed * 25) # 25 chars per second
        else:
            chars_to_show = 999

        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.55
        thickness = 1
        line_height = 20
        padding = 4

        # Dynamic color schemes
        if status == "CRIMINAL_WATCHLIST":
            text_color = (50, 50, 255)     # Red
            box_color = (0, 0, 255)
        elif status == "AUTHORIZED_STAFF":
            text_color = (150, 255, 150)   # Light Green
            box_color = (0, 255, 120)
        else:
            text_color = (255, 230, 180)   # Light Cyan/Amber
            box_color = (0, 235, 255)

        # Draw typewriter text
        current_char_count = 0
        
        # Start text slightly above the box
        start_y = max(20, y1 - (len(lines) * line_height) - 5)

        for idx, line in enumerate(lines):
            line_len = len(line)
            if current_char_count >= chars_to_show:
                break
                
            chars_left = chars_to_show - current_char_count
            text_to_draw = line[:chars_left]
            
            ty = start_y + (idx * line_height)
            
            # Draw cinematic drop shadow / outline for visibility without background
            cv2.putText(image, text_to_draw, (x1, ty), font, font_scale, (10, 10, 10), thickness + 2, cv2.LINE_AA)
            cv2.putText(image, text_to_draw, (x1, ty), font, font_scale, text_color, thickness, cv2.LINE_AA)
            
            current_char_count += line_len

        # Draw thin bounding box
        cv2.rectangle(image, (x1, y1), (x2, y2), box_color, 1)

    def draw_threat_alert_badge(self, image, box, alert_text):
        x1, y1, x2, y2 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
        h_img, w_img = image.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w_img, x2), min(h_img, y2)

        cv2.rectangle(image, (x1, y1), (x2, y2), (0, 0, 255), 3)

        msg = f"[!] {alert_text}"
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.55
        thickness = 2
        (w_text, h_text), _ = cv2.getTextSize(msg, font, font_scale, thickness)

        padding = 6
        bx1 = x1
        by1 = y2 + 4
        bx2 = bx1 + w_text + (padding * 2)
        by2 = by1 + h_text + (padding * 2)

        if by2 > h_img - 5:
            by1 = max(0, y1 - h_text - 14)
            by2 = by1 + h_text + (padding * 2)

        overlay = image.copy()
        cv2.rectangle(overlay, (bx1, by1), (bx2, by2), (0, 0, 220), -1)
        cv2.addWeighted(overlay, 0.80, image, 0.20, 0, image)
        
        cv2.rectangle(image, (bx1, by1), (bx2, by2), (0, 0, 255), 1)
        cv2.putText(image, msg, (bx1 + padding, by2 - padding - 2), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)

    def classify_vehicle(self, cls_id, box):
        x1, y1, x2, y2 = box
        box_w = max(1, x2 - x1)
        box_h = max(1, y2 - y1)
        aspect = box_h / float(box_w)

        if cls_id == 2:
            if aspect > 0.65 or (box_w > 180 and aspect > 0.58):
                return "SUV / Crossover"
            return "Sedan / Car"
        elif cls_id == 5:
            return "Bus / Coach"
        elif cls_id == 7:
            return "Heavy Truck / Trailer"
        elif cls_id == 3:
            return "Motorcycle"
        elif cls_id == 1:
            return "Bicycle"
        elif cls_id == 24 or cls_id == 26 or cls_id == 28:
            return "Van / Minivan"
        return "Vehicle"

    def draw_vehicle_badge(self, image, box, vehicle_type, track_id=None, conf=None):
        x1, y1, x2, y2 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
        label = f"[{vehicle_type.upper()}]"
        if track_id is not None:
            label = f"ID:{track_id} {label}"
        if conf is not None:
            label += f" ({int(conf*100)}%)"

        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.45
        thickness = 1
        (w_text, h_text), _ = cv2.getTextSize(label, font, font_scale, thickness)
        padding = 4

        bx1 = x1
        by1 = max(0, y1 - h_text - (padding * 2) - 4)
        bx2 = bx1 + w_text + (padding * 2)
        by2 = by1 + h_text + (padding * 2)

        overlay = image.copy()
        cv2.rectangle(overlay, (bx1, by1), (bx2, by2), (40, 40, 40), -1)
        cv2.addWeighted(overlay, 0.75, image, 0.25, 0, image)
        
        cv2.rectangle(image, (bx1, by1), (bx2, by2), (255, 160, 0), 1)
        cv2.putText(image, label, (bx1 + padding, by2 - padding - 2), font, font_scale, (255, 215, 0), thickness, cv2.LINE_AA)
        cv2.rectangle(image, (x1, y1), (x2, y2), (255, 160, 0), 2)
