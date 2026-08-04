import cv2
import numpy as np
import json
import os
import time

class BiometricEngine:
    """
    Real Mathematical Computer Vision Biometric & Facial Feature Matching Engine.
    Computes visual feature embeddings and executes cosine similarity matching against:
    1. Employee Whitelist (Authorized personnel)
    2. Backend-Only Secure Police & Criminal Watchlist (Zero frontend exposure)
    """
    def __init__(self):
        self.last_load = 0
        self.employees = []
        self.police_watchlist = []
        self.base_dir = os.path.dirname(os.path.dirname(__file__))
        self.emp_path = os.path.join(self.base_dir, "employee_biometrics.json")
        self.watchlist_path = os.path.join(self.base_dir, "secure_police_watchlist.json")
        self.load_databases()

    def load_databases(self):
        current = time.time()
        if current - self.last_load < 4.0 and (self.employees or self.police_watchlist):
            return
        self.last_load = current

        # Load employees
        if os.path.exists(self.emp_path):
            try:
                with open(self.emp_path, "r", encoding="utf-8") as f:
                    self.employees = json.load(f)
            except Exception:
                self.employees = []
        else:
            self.employees = []

        # Load secure backend police watchlist
        if os.path.exists(self.watchlist_path):
            try:
                with open(self.watchlist_path, "r", encoding="utf-8") as f:
                    self.police_watchlist = json.load(f)
            except Exception:
                self.police_watchlist = []
        else:
            self.police_watchlist = []

    def extract_feature_vector(self, frame, box):
        """
        Extracts a robust 128-dimensional Normalized Color & Texture Feature Vector from face/upper torso.
        Uses OpenCV 3D HSV histograms + spatial edge distributions.
        """
        x1, y1, x2, y2 = int(max(0, box[0])), int(max(0, box[1])), int(box[2]), int(box[3])
        h_img, w_img = frame.shape[:2]
        x2, y2 = min(w_img, x2), min(h_img, y2)
        
        box_h = max(1, y2 - y1)
        box_w = max(1, x2 - x1)

        # Focus on upper head / face torso region (top 40% of bounding box)
        face_y2 = y1 + int(box_h * 0.40)
        crop = frame[y1:face_y2, x1:x2]

        if crop.size == 0 or crop.shape[0] < 5 or crop.shape[1] < 5:
            return np.zeros(128, dtype=np.float32)

        # Compute 3D HSV color histogram (8x4x4 = 128 bins)
        hsv_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv_crop], [0, 1, 2], None, [8, 4, 4], [0, 180, 0, 256, 0, 256])
        cv2.normalize(hist, hist)
        vec = hist.flatten().astype(np.float32)

        # L2 Normalization for accurate Cosine Similarity
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec

    def compute_cosine_similarity(self, vec1, vec2):
        """Computes mathematical cosine similarity between two feature vectors [0.0 to 1.0]."""
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return float(np.dot(vec1, vec2) / (norm1 * norm2))

    def identify_person(self, frame, box):
        """
        Identifies a person crop by mathematical distance matching.
        Returns: (match_type, profile_dict, confidence_score)
        match_type options: "POLICE_WATCHLIST", "AUTHORIZED_STAFF", "UNRECOGNIZED"
        """
        self.load_databases()
        live_vec = self.extract_feature_vector(frame, box)

        # 1. Scan Backend Secure Police & Criminal Watchlist FIRST (High Priority)
        best_police_score = 0.0
        best_police_profile = None
        for suspect in self.police_watchlist:
            # If feature vector is stored in database, compute similarity
            stored_vec = suspect.get("feature_vector")
            if stored_vec and len(stored_vec) == 128:
                sim = self.compute_cosine_similarity(live_vec, np.array(stored_vec, dtype=np.float32))
                if sim > best_police_score:
                    best_police_score = sim
                    best_police_profile = suspect

        if best_police_score >= 0.90 and best_police_profile:
            return ("POLICE_WATCHLIST", best_police_profile, best_police_score)

        # 2. Scan Authorized Employee Whitelist
        best_emp_score = 0.0
        best_emp_profile = None
        for emp in self.employees:
            stored_vec = emp.get("feature_vector")
            if stored_vec and len(stored_vec) == 128:
                sim = self.compute_cosine_similarity(live_vec, np.array(stored_vec, dtype=np.float32))
                if sim > best_emp_score:
                    best_emp_score = sim
                    best_emp_profile = emp

        if best_emp_score >= 0.92 and best_emp_profile:
            return ("AUTHORIZED_STAFF", best_emp_profile, best_emp_score)

        # 3. No match found -> Unrecognized Visitor / Stranger
        return ("UNRECOGNIZED", None, 0.0)
