import cv2
import numpy as np

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

    def detect_attributes(self, frame, box, keypoints=None):
        """
        Analyzes a detected person crop and returns visual attributes:
        e.g. ['Female', 'Long Hair', 'White Top']
        """
        x1, y1, x2, y2 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
        h, w = frame.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        
        box_w = x2 - x1
        box_h = y2 - y1
        if box_w <= 10 or box_h <= 10:
            return ["Person", "Short Hair", "White Top"]

        # 1. Upper Torso Color Analysis (12% to 52% of bounding box height)
        torso_y1 = y1 + int(box_h * 0.12)
        torso_y2 = y1 + int(box_h * 0.52)
        torso_crop = frame[torso_y1:torso_y2, x1:x2]

        top_color = "White Top"
        if torso_crop.size > 0:
            hsv_torso = cv2.cvtColor(torso_crop, cv2.COLOR_BGR2HSV)
            max_pixels = 0
            for label, (lower, upper) in self.color_ranges.items():
                mask = cv2.inRange(hsv_torso, np.array(lower), np.array(upper))
                count = cv2.countNonZero(mask)
                if count > max_pixels:
                    max_pixels = count
                    top_color = label

        # 2. Hair / Head Analysis (check area below the crown to detect actual long hair)
        # Long hair extends below the ears (e.g., 15% to 35% of the bounding box height)
        hair_y1 = y1 + int(box_h * 0.15)
        hair_y2 = y1 + int(box_h * 0.35)
        hair_crop = frame[hair_y1:hair_y2, x1:x2]
        hair_style = "Short Hair"
        
        if hair_crop.size > 0:
            hair_hsv = cv2.cvtColor(hair_crop, cv2.COLOR_BGR2HSV)
            # Detect dark hair pixels in this lower band
            dark_hair_mask = cv2.inRange(hair_hsv, np.array([0, 0, 0]), np.array([180, 255, 80]))
            hair_pixels = cv2.countNonZero(dark_hair_mask)
            ratio = hair_pixels / float(hair_crop.shape[0] * hair_crop.shape[1] + 1)
            
            # Only classify as Long Hair if a significant portion of this lower band is hair
            hair_style = "Long Hair" if ratio > 0.40 else "Short Hair"

        # 3. Gender Estimation
        aspect = box_h / max(1, box_w)
        # Default to Male unless clear indicators of Female (very long hair or specific aspect ratios)
        gender = "Female" if hair_style == "Long Hair" and aspect > 2.2 else "Male"

        return [gender, hair_style, top_color]

    def draw_attribute_badge(self, image, box, attributes):
        """
        Draws the futuristic Blue HUD Attribute Badge above the person (matches exact design from user screenshot).
        """
        x1, y1, x2, y2 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
        
        # Badge text lines
        lines = attributes
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.45
        thickness = 1
        line_height = 16
        padding = 5

        # Calculate max line width
        max_w = 0
        for line in lines:
            (w_text, h_text), _ = cv2.getTextSize(line, font, font_scale, thickness)
            if w_text > max_w:
                max_w = w_text

        badge_w = max_w + (padding * 2)
        badge_h = (len(lines) * line_height) + padding

        # Position badge above person's head
        badge_x1 = x1
        badge_y1 = max(0, y1 - badge_h - 6)
        badge_x2 = badge_x1 + badge_w
        badge_y2 = badge_y1 + badge_h

        # Draw semi-transparent Blue HUD Box (#1A56DB in BGR: (219, 86, 26))
        overlay = image.copy()
        cv2.rectangle(overlay, (badge_x1, badge_y1), (badge_x2, badge_y2), (219, 86, 26), -1)
        cv2.addWeighted(overlay, 0.65, image, 0.35, 0, image)
        
        # Draw border
        cv2.rectangle(image, (badge_x1, badge_y1), (badge_x2, badge_y2), (255, 255, 255), 1)

        # Draw crisp white text lines
        for idx, line in enumerate(lines):
            ty = badge_y1 + padding + (idx + 1) * line_height - 3
            cv2.putText(image, line, (badge_x1 + padding, ty), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)

        # Draw wireframe yellow bounding box around person
        cv2.rectangle(image, (x1, y1), (x2, y2), (0, 235, 255), 1)

    def draw_threat_alert_badge(self, image, box, alert_text):
        """
        Draws Red Threat Alert Bounding Box & Red Warning Badge below/above the suspect
        (matches exact design from user screenshot: Red Box + '! Fight Detected' / '! Weapon Detected').
        """
        x1, y1, x2, y2 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
        h_img, w_img = image.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w_img, x2), min(h_img, y2)

        # 1. Red Bounding Box around suspect
        cv2.rectangle(image, (x1, y1), (x2, y2), (0, 0, 255), 3)

        # 2. Red Threat Alert Badge Box
        msg = f"! {alert_text}"
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.55
        thickness = 2
        (w_text, h_text), _ = cv2.getTextSize(msg, font, font_scale, thickness)

        padding = 6
        bx1 = x1
        by1 = y2 + 4
        bx2 = bx1 + w_text + (padding * 2)
        by2 = by1 + h_text + (padding * 2)

        # Ensure badge stays within image viewport
        if by2 > h_img - 5:
            by1 = max(0, y1 - h_text - 14)
            by2 = by1 + h_text + (padding * 2)

        # Draw Semi-Transparent Red Badge Background (BGR: 0, 0, 220)
        overlay = image.copy()
        cv2.rectangle(overlay, (bx1, by1), (bx2, by2), (0, 0, 220), -1)
        cv2.addWeighted(overlay, 0.75, image, 0.25, 0, image)
        
        # Draw Red Border
        cv2.rectangle(image, (bx1, by1), (bx2, by2), (0, 0, 255), 1)
        # Draw crisp White Text
        cv2.putText(image, msg, (bx1 + padding, by2 - padding - 2), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)

    def classify_vehicle(self, cls_id, box):
        """
        Classifies vehicles into specific categories:
        Car / Sedan, Van / Minivan, SUV, Motorcycle, Bus, Truck, Bicycle.
        """
        x1, y1, x2, y2 = box
        box_w = max(1, x2 - x1)
        box_h = max(1, y2 - y1)
        aspect = box_h / float(box_w)

        if cls_id == 2:  # COCO car class
            if aspect > 0.65 or (box_w > 180 and aspect > 0.58):
                return "Van / Minivan"
            elif aspect > 0.50:
                return "SUV / Crossover"
            else:
                return "Car / Sedan"
        elif cls_id == 3:
            return "Motorcycle"
        elif cls_id == 5:
            return "Bus / Coach"
        elif cls_id == 7:
            return "Truck / Lorry"
        elif cls_id == 1:
            return "Bicycle"
        return "Vehicle"

    def draw_vehicle_badge(self, image, box, vehicle_type, track_id=None, conf=0.8):
        """
        Draws Green/Amber Futuristic Vehicle HUD Badge and Bounding Box.
        """
        x1, y1, x2, y2 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
        h_img, w_img = image.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w_img, x2), min(h_img, y2)

        # Draw Amber Bounding Box around Vehicle
        cv2.rectangle(image, (x1, y1), (x2, y2), (0, 165, 255), 2)

        # Vehicle HUD Header Badge
        title = f"VEHICLE: {vehicle_type}"
        sub = f"TRACK ID: {track_id}" if track_id else "TRACKED"
        lines = [title, sub]

        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.5
        thickness = 1
        line_height = 18
        padding = 6

        max_w = 0
        for line in lines:
            (w_text, _), _ = cv2.getTextSize(line, font, font_scale, thickness)
            if w_text > max_w:
                max_w = w_text

        badge_w = max_w + (padding * 2)
        badge_h = (len(lines) * line_height) + padding

        bx1 = x1
        by1 = max(0, y1 - badge_h - 4)
        bx2 = bx1 + badge_w
        by2 = by1 + badge_h

        # Draw Amber Solid Badge Background
        cv2.rectangle(image, (bx1, by1), (bx2, by2), (0, 120, 220), -1)
        cv2.rectangle(image, (bx1, by1), (bx2, by2), (0, 165, 255), 1)

        for idx, line in enumerate(lines):
            ty = by1 + padding + (idx + 1) * line_height - 4
            cv2.putText(image, line, (bx1 + padding, ty), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)

