"""
Global Tracker - Cross-Camera Person Handoff System
=====================================================
When a person exits Camera 1's view, their visual appearance (HSV color histogram)
is saved here. Camera 2 then checks new detections against this store to identify
the same person crossing cameras and raises a HANDOFF event.
"""
import threading
import cv2
import numpy as np
import time


class GlobalTracker:
    def __init__(self):
        self._lock = threading.Lock()
        # {track_id: {camera_id, exit_direction, appearance_hist, timestamp, last_box}}
        self._exited_persons = {}
        # Recent successful handoffs for dashboard/WebSocket
        self._handoffs = []

    def _compute_histogram(self, frame, box):
        """Compute HSV color histogram for a person's bounding box crop."""
        x1, y1, x2, y2 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
        h, w = frame.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        if x2 <= x1 or y2 <= y1:
            return None
        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            return None
        hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], [0, 1], None, [50, 60], [0, 180, 0, 256])
        cv2.normalize(hist, hist)
        return hist.flatten()

    def _get_exit_direction(self, box, frame_w, frame_h, border=0.12):
        """Determine which border the person exited through."""
        x1, y1, x2, y2 = box
        cx = (x1 + x2) / 2
        cy = (y1 + y2) / 2
        if cx < frame_w * border:
            return "LEFT"
        if cx > frame_w * (1 - border):
            return "RIGHT"
        if cy < frame_h * border:
            return "TOP"
        if cy > frame_h * (1 - border):
            return "BOTTOM"
        return None

    def update(self, camera_id, current_track_ids, boxes, frame):
        """
        Called every YOLO frame. Compares current visible tracks with previous frame.
        If a tracked person disappeared near a border, register them as exited.
        Returns list of new handoff events (if any cross-camera match found).
        """
        handoff_events = []
        h, w = frame.shape[:2]

        with self._lock:
            # --- Register persons currently visible ---
            current_appearances = {}
            for track_id, box in zip(current_track_ids, boxes):
                hist = self._compute_histogram(frame, box)
                if hist is not None:
                    current_appearances[track_id] = (hist, box)

            # --- Check if any previously-exited person matches a new detection ---
            matched_keys = []
            for track_id, box in zip(current_track_ids, boxes):
                hist = current_appearances.get(track_id)
                if hist is None:
                    continue
                hist_arr = hist[0]

                for exited_id, info in self._exited_persons.items():
                    if info['camera_id'] == camera_id:
                        continue  # Same camera, skip
                    if info['appearance'] is None:
                        continue

                    score = cv2.compareHist(
                        info['appearance'].astype(np.float32),
                        hist_arr.astype(np.float32),
                        cv2.HISTCMP_CORREL
                    )

                    if score > 0.60:  # Match threshold
                        event = {
                            'original_id': exited_id,
                            'new_track_id': track_id,
                            'from_camera': info['camera_id'],
                            'to_camera': camera_id,
                            'exit_direction': info['exit_direction'],
                            'confidence': round(float(score), 2),
                            'timestamp': time.time()
                        }
                        handoff_events.append(event)
                        self._handoffs = ([event] + self._handoffs)[:20]
                        matched_keys.append(exited_id)
                        break

            # Remove matched (handoff complete)
            for k in matched_keys:
                self._exited_persons.pop(k, None)

            # Clean up old exits (> 15 seconds)
            now = time.time()
            self._exited_persons = {
                k: v for k, v in self._exited_persons.items()
                if now - v['timestamp'] < 15.0
            }

        return handoff_events

    def register_exit(self, camera_id, track_id, box, frame):
        """Explicitly register a person as having exited a camera's view."""
        h, w = frame.shape[:2]
        direction = self._get_exit_direction(box, w, h)
        hist = self._compute_histogram(frame, box)
        with self._lock:
            self._exited_persons[track_id] = {
                'camera_id': camera_id,
                'exit_direction': direction,
                'appearance': hist,
                'timestamp': time.time(),
                'last_box': box
            }

    def get_recent_handoffs(self, since_seconds=30):
        with self._lock:
            cutoff = time.time() - since_seconds
            return [h for h in self._handoffs if h['timestamp'] > cutoff]


# Singleton - shared across all camera threads
global_tracker = GlobalTracker()
