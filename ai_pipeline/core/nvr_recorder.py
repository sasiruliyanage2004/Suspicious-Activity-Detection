import os
import cv2
import time
import threading
from datetime import datetime
from collections import deque

class NVRRecorder:
    def __init__(self, vault_path=None, buffer_maxlen=50):
        if vault_path is None:
            # Point directly to the backend static vault directory
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            self.vault_path = os.path.join(base_dir, "backend", "recordings_vault")
        else:
            self.vault_path = vault_path
        
        os.makedirs(self.vault_path, exist_ok=True)
        self.buffers = {}
        self.buffer_maxlen = buffer_maxlen
        self.lock = threading.Lock()

    def add_frame(self, camera_id, frame):
        if frame is None:
            return
        with self.lock:
            if camera_id not in self.buffers:
                self.buffers[camera_id] = deque(maxlen=self.buffer_maxlen)
            self.buffers[camera_id].append(frame.copy())

    def record_incident(self, camera_id, behavior_type, current_frame):
        """Asynchronously extracts snapshot & encodes buffered video clip without blocking live stream."""
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19]
        safe_type = behavior_type.lower().replace(" ", "_").replace("/", "_")
        safe_cam = str(camera_id).replace("-", "_")
        
        base_name = f"inc_{safe_cam}_{safe_type}_{timestamp_str}"
        snap_filename = f"{base_name}.jpg"
        clip_filename = f"{base_name}.mp4"
        
        snap_path = os.path.join(self.vault_path, snap_filename)
        clip_path = os.path.join(self.vault_path, clip_filename)
        
        # Retrieve buffered frames for clip generation
        with self.lock:
            frames_to_write = list(self.buffers.get(camera_id, []))
            if current_frame is not None and (not frames_to_write or not np_array_equal(frames_to_write[-1], current_frame)):
                frames_to_write.append(current_frame.copy())
            elif current_frame is None and frames_to_write:
                current_frame = frames_to_write[-1].copy()

        # Save HD snapshot immediately
        if current_frame is not None:
            try:
                cv2.imwrite(snap_path, current_frame, [cv2.IMWRITE_JPEG_QUALITY, 88])
            except Exception:
                pass
        
        # Write MP4 clip asynchronously
        def encode_clip():
            if not frames_to_write:
                return
            try:
                h, w, _ = frames_to_write[0].shape
                # Use mp4v codec which works out of the box on Windows OpenCV without external FFmpeg DLL errors
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                out = cv2.VideoWriter(clip_path, fourcc, 15.0, (w, h))
                for f in frames_to_write:
                    out.write(f)
                # To make sure clip lasts at least 2-3 seconds during rapid events, loop frame buffer slightly if too short
                if len(frames_to_write) < 25:
                    for _ in range(25 - len(frames_to_write)):
                        out.write(frames_to_write[-1])
                out.release()
            except Exception:
                pass

        threading.Thread(target=encode_clip, daemon=True).start()

        return f"/vault/{clip_filename}", f"/vault/{snap_filename}"

def np_array_equal(a, b):
    try:
        return a.shape == b.shape and (a == b).all()
    except Exception:
        return False

nvr_recorder = NVRRecorder()
