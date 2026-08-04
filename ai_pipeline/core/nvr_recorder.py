import os
import cv2
import time
import threading
from datetime import datetime
from collections import deque

class NVRRecorder:
    def __init__(self, vault_path=None, buffer_maxlen=150):
        if vault_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            self.vault_path = os.path.join(base_dir, "backend", "recordings_vault")
        else:
            self.vault_path = vault_path
        
        os.makedirs(self.vault_path, exist_ok=True)
        self.buffers = {}
        self.buffer_maxlen = buffer_maxlen
        self.lock = threading.Lock()
        self.active_recordings = {}  # { camera_id: [list_of_target_queues] }

    def add_frame(self, camera_id, frame):
        if frame is None:
            return
        with self.lock:
            if camera_id not in self.buffers:
                self.buffers[camera_id] = deque(maxlen=self.buffer_maxlen)
            self.buffers[camera_id].append(frame.copy())
            
            # Feed frame to any actively encoding incident clips (Post-event capture)
            if camera_id in self.active_recordings:
                for q in self.active_recordings[camera_id]:
                    try: q.append(frame.copy())
                    except Exception: pass

    def record_incident(self, camera_id, behavior_type, current_frame):
        """Asynchronously extracts HD snapshot & encodes buffered video clip with both pre-event and live post-event footage."""
        timestamp_str = datetime.now().strftime("%Y%m%d-%H%M%S-%f")[:19]
        safe_type = behavior_type.lower().replace(" ", "-").replace("/", "-")
        safe_cam = str(camera_id).replace("_", "-")
        
        base_name = f"inc-{safe_cam}-{safe_type}-{timestamp_str}"
        snap_filename = f"{base_name}.jpg"
        clip_filename = f"{base_name}.mp4"
        
        snap_path = os.path.join(self.vault_path, snap_filename)
        clip_path = os.path.join(self.vault_path, clip_filename)
        
        # Retrieve pre-event frames from circular RAM buffer
        with self.lock:
            pre_frames = list(self.buffers.get(camera_id, []))[-60:] # Last ~4 seconds before threat
            if current_frame is not None:
                pre_frames.append(current_frame.copy())
            elif not current_frame and pre_frames:
                current_frame = pre_frames[-1].copy()
                
            post_queue = []
            if camera_id not in self.active_recordings:
                self.active_recordings[camera_id] = []
            self.active_recordings[camera_id].append(post_queue)

        # Save HD snapshot immediately
        if current_frame is not None:
            try:
                cv2.imwrite(snap_path, current_frame, [cv2.IMWRITE_JPEG_QUALITY, 92])
            except Exception:
                pass
        
        # Write MP4 clip asynchronously with real live post-event frames
        def encode_clip():
            try:
                # Wait up to 3.0 seconds to actively collect live post-incident frames as the action unfolds
                start_w = time.time()
                while time.time() - start_w < 3.0 and len(post_queue) < 45:
                    time.sleep(0.1)
                
                with self.lock:
                    if camera_id in self.active_recordings and post_queue in self.active_recordings[camera_id]:
                        self.active_recordings[camera_id].remove(post_queue)
                
                all_frames = pre_frames + post_queue
                if not all_frames:
                    return
                    
                h, w, _ = all_frames[0].shape
                fourcc = cv2.VideoWriter_fourcc(*'avc1')
                out = cv2.VideoWriter(clip_path, fourcc, 15.0, (w, h))
                for f in all_frames:
                    out.write(f)
                # Ensure minimum playable clip length
                if len(all_frames) < 30:
                    for _ in range(30 - len(all_frames)):
                        out.write(all_frames[-1])
                out.release()
            except Exception as e:
                pass

        threading.Thread(target=encode_clip, daemon=True).start()

        return f"/vault/{clip_filename}", f"/vault/{snap_filename}"

def np_array_equal(a, b):
    try:
        return a.shape == b.shape and (a == b).all()
    except Exception:
        return False

nvr_recorder = NVRRecorder()
