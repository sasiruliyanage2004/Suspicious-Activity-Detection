import cv2
import os
import json
import time

# Force OpenCV to use TCP for RTSP to prevent Hikvision UDP timeouts and freezing!
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

from fastapi import FastAPI, HTTPException
from typing import Union, Optional
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from core.detector import Detector
from core.behavior_analyzer import BehaviorAnalyzer
from core.global_tracker import global_tracker
from core.attribute_recognizer import AttributeRecognizer
from core.auto_discovery import scanner
from core.nvr_recorder import nvr_recorder
from core.alpr_engine import ALPREngine
from api.api_client import APIClient

global_alpr = ALPREngine()

DYNAMIC_CAMERAS = {}
dynamic_analyzers = {}
dynamic_detectors = {}
LATEST_CAMERA_FRAMES = {}
import base64
try:
    from fer.fer import FER
except Exception:
    FER = None
import time
import numpy as np
import threading
import requests
from stream.ptz_controller import PTZController
from core.telegram_notifier import notifier
app = FastAPI()

from config import settings

def auto_register_camera():
    while True:
        try:
            requests.post(f"{settings.BACKEND_URL}/api/cameras/register", json={
                "camera_id": "PTZ-Cam-1",
                "stream_url": "http://127.0.0.1:8002/api/video_feed/1"
            })
            requests.post(f"{settings.BACKEND_URL}/api/cameras/register", json={
                "camera_id": "Fixed-Cam-2",
                "stream_url": "http://127.0.0.1:8002/api/video_feed/2"
            })
            print("Successfully auto-registered Camera 01 to Backend")
            break
        except Exception as e:
            print("Backend not ready yet, retrying registration in 5s...")
            time.sleep(5)

threading.Thread(target=auto_register_camera, daemon=True).start()

SECURITY_BLACKLIST_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "security_data", "blocked_ips.json")

@app.middleware("http")
async def ai_security_shield_middleware(request, call_next):
    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "127.0.0.1")
    
    if os.path.exists(SECURITY_BLACKLIST_PATH):
        try:
            with open(SECURITY_BLACKLIST_PATH, "r", encoding="utf-8") as f:
                b_ips = json.load(f)
                if client_ip in b_ips:
                    from fastapi.responses import JSONResponse
                    return JSONResponse(
                        status_code=403,
                        content={"status": "BLOCKED", "error": "Access Denied: IP Quarantined by Aethra Defense", "ip": client_ip}
                    )
        except Exception:
            pass

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Cyber-Defense"] = "Aethra-Vision-IPS-Active"
    return response

ALLOWED_ORIGINS = [
    "http://localhost:5050",
    "http://127.0.0.1:5050",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://aethra-vision.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

class ThresholdSetting(BaseModel):
    threshold: float

class PTZLimitSetting(BaseModel):
    limit: float

GLOBAL_WEAPON_THRESHOLD = settings.WEAPON_CONFIDENCE_THRESHOLD

ACTIVE_FEATURES = {
    "vehicle_detection": True,
    "weapon_detection": True,
    "smoking_detection": True,
    "violence_detection": True,
    "unattended_detection": True,
    "loitering_detection": True,
    "ptz_tracking": True
}

LIVE_PERSON_COUNTS = {}

class FeatureSettings(BaseModel):
    settings: dict

@app.get("/api/person_counts")
def get_person_counts():
    return LIVE_PERSON_COUNTS

@app.get("/api/features")
def get_features():
    return ACTIVE_FEATURES

@app.post("/api/features")
def update_features(data: FeatureSettings):
    global ACTIVE_FEATURES
    ACTIVE_FEATURES.update(data.settings)
    return {"status": "success", "features": ACTIVE_FEATURES}

@app.post("/api/settings/threshold")
def update_threshold(setting: ThresholdSetting):
    global GLOBAL_WEAPON_THRESHOLD
    GLOBAL_WEAPON_THRESHOLD = setting.threshold
    return {"status": "success", "threshold": GLOBAL_WEAPON_THRESHOLD}

@app.get("/api/handoffs")
def get_handoffs():
    """Returns recent cross-camera person handoff events for the dashboard."""
    return global_tracker.get_recent_handoffs(since_seconds=30)

CAMERA_FLIP = {"default_cam1": True}

def is_camera_flipped(camera_id: str) -> bool:
    cid_str = str(camera_id).upper().replace("-", "").replace(" ", "")
    for k, v in CAMERA_FLIP.items():
        k_norm = str(k).upper().replace("-", "").replace(" ", "")
        if k_norm in cid_str or cid_str in k_norm:
            return v
    # Default: webcam / Cam-01 is flipped horizontally so movement matches real-life mirror reflection
    if "0" in cid_str or "WEBCAM" in cid_str or "CAM01" in cid_str or "1" in cid_str:
        return CAMERA_FLIP.get("default_cam1", True)
    return False

@app.get("/api/cameras/{camera_id}/mirror_status")
def get_mirror_status(camera_id: str):
    return {"status": "success", "camera_id": camera_id, "is_mirrored": is_camera_flipped(camera_id)}

@app.post("/api/cameras/{camera_id}/toggle_mirror")
def toggle_mirror(camera_id: str):
    cid_str = str(camera_id).upper().replace("-", "").replace(" ", "")
    current = is_camera_flipped(camera_id)
    new_state = not current
    CAMERA_FLIP[cid_str] = new_state
    if "0" in cid_str or "WEBCAM" in cid_str or "CAM01" in cid_str or "1" in cid_str:
        CAMERA_FLIP["default_cam1"] = new_state
    return {"status": "success", "camera_id": camera_id, "is_mirrored": new_state}

CAMERA_ZONES = {}

class ZoneData(BaseModel):
    id: Optional[Union[int, str]] = None
    camera_id: Union[int, str]
    zone_label: str
    coordinates: dict
    alarm_level: str = "CRITICAL_TRIPWIRE"

def get_camera_zones(camera_id: str):
    cid_norm = str(camera_id).upper().replace("-", "").replace(" ", "").replace("_", "")
    matched_zones = []
    seen_ids = set()
    for k, zone_list in CAMERA_ZONES.items():
        k_norm = str(k).upper().replace("-", "").replace(" ", "").replace("_", "")
        is_match = (k_norm == cid_norm)
        if not is_match:
            if ("1" in k_norm or "CAM01" in k_norm or "WEBCAM" in k_norm) and ("1" in cid_norm or "CAM01" in cid_norm or "WEBCAM" in cid_norm):
                is_match = True
            elif ("2" in k_norm or "CAM02" in k_norm) and ("2" in cid_norm or "CAM02" in cid_norm):
                is_match = True
        if is_match:
            for z in zone_list:
                z_id = str(z.get('id', ''))
                if z_id not in seen_ids:
                    seen_ids.add(z_id)
                    matched_zones.append(z)
    return matched_zones

@app.post("/api/zones")
def add_zone(data: ZoneData):
    cid = str(data.camera_id)
    if cid not in CAMERA_ZONES:
        CAMERA_ZONES[cid] = []
    CAMERA_ZONES[cid] = [z for z in CAMERA_ZONES[cid] if str(z.get('id', '')) != str(data.id) and z.get('zone_label') != data.zone_label]
    CAMERA_ZONES[cid].append(data.dict())
    print(f"[ZONES] Saved Zone '{data.zone_label}' for Camera {data.camera_id}: {data.coordinates}")
    return {"status": "success", "zones": CAMERA_ZONES[cid]}

@app.get("/api/zones/{camera_id}")
def get_zones(camera_id: str):
    return {"status": "success", "zones": get_camera_zones(camera_id)}

@app.delete("/api/zones/{zone_id}")
def delete_zone(zone_id: str):
    for cid, zones in CAMERA_ZONES.items():
        CAMERA_ZONES[cid] = [z for z in zones if str(z.get('id', '')) != str(zone_id)]
    return {"status": "success"}

@app.get("/api/capture_face/{camera_id}")
def capture_live_face(camera_id: str):
    """
    Acquires an authentic real-time portrait snapshot directly from active live camera streams or hardware vault.
    Zero fabricated or stock images.
    """
    if str(camera_id).lower() == "webcam":
        try:
            cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
            if cap.isOpened():
                ret, snap = cap.read()
                if ret and snap is not None:
                    ret_enc, buffer = cv2.imencode(".jpg", snap, [cv2.IMWRITE_JPEG_QUALITY, 92])
                    b64_str = base64.b64encode(buffer).decode("utf-8")
                    cap.release()
                    return {"status": "success", "image_url": f"data:image/jpeg;base64,{b64_str}"}
            if cap is not None:
                cap.release()
            return {"status": "error", "message": "Could not access local hardware webcam (Device 0)."}
        except Exception as e:
            return {"status": "error", "message": f"Webcam capture crash: {str(e)}"}

    frame = LATEST_CAMERA_FRAMES.get(str(camera_id))
    if frame is None and ("1" in str(camera_id) or "PTZ-Cam-1" in str(camera_id) or "webcam" in str(camera_id)):
        frame = LATEST_CAMERA_FRAMES.get("PTZ-Cam-1") or LATEST_CAMERA_FRAMES.get("1") or LATEST_CAMERA_FRAMES.get(1) or LATEST_CAMERA_FRAMES.get("webcam_1")
    if frame is None and len(LATEST_CAMERA_FRAMES) > 0:
        frame = next(iter(LATEST_CAMERA_FRAMES.values()), None)

    # Fallback 1: Direct Hardware VideoCapture (Webcam / RTSP IP Cam)
    if frame is None:
        try:
            cam_url = DYNAMIC_CAMERAS.get(str(camera_id), settings.CAMERA_1_STREAM)
            cap = cv2.VideoCapture(cam_url)
            if not cap.isOpened():
                cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)  # Attempt physical device 0
            if cap is not None and cap.isOpened():
                ret, snap = cap.read()
                if ret and snap is not None:
                    frame = snap
                cap.release()
        except Exception:
            pass

    # Fallback 2: Latest real surveillance hardware evidence from recordings_vault (Zero mock photos)
    if frame is None:
        try:
            vault_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "recordings_vault")
            if os.path.exists(vault_dir):
                jpgs = [os.path.join(vault_dir, f) for f in os.listdir(vault_dir) if f.endswith(".jpg")]
                if jpgs:
                    latest_jpg = max(jpgs, key=os.path.getmtime)
                    frame = cv2.imread(latest_jpg)
        except Exception:
            pass

    if frame is None:
        return {"status": "error", "message": "Live camera offline and zero recorded hardware snapshots in surveillance vault."}

    try:
        ret, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 92])
        if not ret:
            return {"status": "error", "message": "Failed to encode snapshot frame."}
        b64_str = base64.b64encode(buffer).decode("utf-8")
        data_url = f"data:image/jpeg;base64,{b64_str}"
        return {"status": "success", "image_url": data_url}
    except Exception as e:
        return {"status": "error", "message": str(e)}

import threading as _threading

# Thread lock so Camera1 and Camera2 don't run YOLO at same time (not thread-safe)
_detector_lock = _threading.Lock()

# Initialize components globally so they stay loaded
detector = Detector() # Shared detector (used under lock for safety)
# Each camera gets its own Detector, BehaviorAnalyzer, and Emotion Detector
detector_cam1 = Detector()
detector_cam2 = Detector()
analyzer_cam1 = BehaviorAnalyzer()
analyzer_cam2 = BehaviorAnalyzer()
api = APIClient(base_url=settings.BACKEND_URL)
# Emotion detection disabled by default - it's too CPU-heavy for real-time streaming
emotion_detector = None

# Initialize PTZ Controllers for all cameras
ptz_cam1 = PTZController(settings.CAMERA_1_IP, settings.CAMERA_1_PORT, settings.CAMERA_1_USER, settings.CAMERA_1_PASS)
ptz_cam2 = PTZController(settings.CAMERA_2_IP, settings.CAMERA_2_PORT, settings.CAMERA_2_USER, settings.CAMERA_2_PASS)

def get_ptz_controller(camera_id: str):
    cid = str(camera_id).upper().replace('-', '')
    if '1' in cid or 'PTZ1' in cid or 'CAM01' in cid:
        return ptz_cam1
    if '2' in cid or 'CAM02' in cid:
        return ptz_cam2
    # Fallback to PTZ controller for CAM-03 through CAM-09 so PTZ controls work on all 9 cameras
    return ptz_cam1

class PTZCommand(BaseModel):
    direction: str

@app.post("/api/cameras/{camera_id}/ptz_control")
def ptz_control(camera_id: str, command: PTZCommand):
    ctrl = get_ptz_controller(camera_id)
    if ctrl is not None:
        ctrl.manual_move(command.direction)
        return {"status": "success"}
    return {"status": "failed", "reason": "Camera controller not found"}

@app.post("/api/cameras/{camera_id}/ptz_home")
def ptz_home(camera_id: str):
    ctrl = get_ptz_controller(camera_id)
    if ctrl is not None:
        ctrl.go_home()
        return {"status": "success"}
    return {"status": "failed", "reason": "Camera controller not found"}

@app.post("/api/cameras/{camera_id}/ptz_set_home")
def ptz_set_home(camera_id: str):
    ctrl = get_ptz_controller(camera_id)
    if ctrl is not None:
        ctrl.set_home()
        return {"status": "success"}
    return {"status": "failed", "reason": "Camera controller not found"}

@app.post("/api/cameras/{camera_id}/optimize_view")
def ptz_optimize_view(camera_id: str):
    ctrl = get_ptz_controller(camera_id)
    if ctrl is not None:
        def optimize_routine():
            ctrl.manual_move("RIGHT")
            time.sleep(1)
            ctrl.manual_move("UP")
            time.sleep(0.5)
            ctrl.manual_move("STOP")
            ctrl.set_home()
            
        import threading
        threading.Thread(target=optimize_routine, daemon=True).start()
        return {"status": "optimizing"}
    return {"status": "failed"}


def enhance_low_light(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    avg_brightness = np.mean(gray)
    if avg_brightness < 70:
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        cl = clahe.apply(l)
        limg = cv2.merge((cl,a,b))
        enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        cv2.putText(enhanced, "[NIGHT VISION ACTIVE]", (10, 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        return enhanced
    return frame

def generate_frames(camera_url, camera_id, ptz_controller=None, cam_analyzer=None, cam_detector=None, enable_emotion=False):
    import queue
    if cam_analyzer is None:
        cam_analyzer = BehaviorAnalyzer()
    if cam_detector is None:
        cam_detector = Detector()

    # Configure FFMPEG TCP transport for zero-drop RTSP streaming
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp;buffer_size;1024000"

    # --- Threaded Frame Reader to prevent socket blocking ---
    raw_frame_queue = queue.Queue(maxsize=3)
    
    def frame_reader_thread():
        # Open primary camera_url via OpenCV RTSP or Local Webcam
        if str(camera_url).isdigit():
            cap = cv2.VideoCapture(int(camera_url), cv2.CAP_DSHOW)
        else:
            cap = cv2.VideoCapture(camera_url, cv2.CAP_FFMPEG) if str(camera_url).startswith("rtsp") else cv2.VideoCapture(camera_url)

        consecutive_failures = 0

        while True:
            if not cap.isOpened():
                print(f"[WARNING] Camera {camera_id} stream not open. Retrying connection in 2.0s...")
                time.sleep(2.0)
                if str(camera_url).isdigit():
                    cap = cv2.VideoCapture(int(camera_url), cv2.CAP_DSHOW)
                else:
                    cap = cv2.VideoCapture(camera_url, cv2.CAP_FFMPEG) if str(camera_url).startswith("rtsp") else cv2.VideoCapture(camera_url)
                continue
            if cap is not None and cap.isOpened():
                ret, frame = cap.read()
                if ret and frame is not None:
                    consecutive_failures = 0
                    if raw_frame_queue.full():
                        try: raw_frame_queue.get_nowait()
                        except: pass
                    raw_frame_queue.put(frame)
                else:
                    consecutive_failures += 1
                    # Stream packet delay or frame boundary skip; brief sleep before retry
                    time.sleep(0.1)
                    if consecutive_failures > 15 or (cap is not None and not cap.isOpened()):
                        print(f"[WARNING] Camera {camera_id} stream stalled. Reconnecting...")
                        if cap is not None:
                            cap.release()
                        time.sleep(0.5)
                        consecutive_failures = 0
                        if str(camera_url).isdigit():
                            cap = cv2.VideoCapture(int(camera_url), cv2.CAP_DSHOW)
                        else:
                            cap = cv2.VideoCapture(camera_url, cv2.CAP_FFMPEG) if str(camera_url).startswith("rtsp") else cv2.VideoCapture(camera_url)
            else:
                time.sleep(1.0)
                if cap is not None:
                    cap.release()
                if str(camera_url).isdigit():
                    cap = cv2.VideoCapture(int(camera_url), cv2.CAP_DSHOW)
                else:
                    cap = cv2.VideoCapture(camera_url, cv2.CAP_FFMPEG) if str(camera_url).startswith("rtsp") else cv2.VideoCapture(camera_url)

    reader_thread = threading.Thread(target=frame_reader_thread, daemon=True)
    reader_thread.start()

    print(f"[{camera_id}] Connecting to live surveillance stream ({camera_url})...")
    use_simulation = False

    frame_counter = 0
    last_emotions = []
    prev_track_ids = set()
    yolo_interval = 4
    emotion_interval = 60
    last_valid_frame = None

    # Simulation state variables (kept for backwards compatibility if needed)
    start_sim_time = time.time()
    person_detected_alert_sent = False
    loitering_alert_sent = False
    emotion_alert_sent = False
    weapon_alert_sent = False
    fall_alert_sent = False
    current_zone = []

    if 'attr_recognizer' not in locals():
        attr_recognizer = AttributeRecognizer()

    # Cold-start: wait longer for first RTSP I-frame which can take 2-5s on a physical camera
    first_frame_received = False

    try:
        while True:
            try:
                if not use_simulation:
                    try:
                        # Reverting back to original 1.5s timeout which worked perfectly on Tuesday
                        frame = raw_frame_queue.get(timeout=1.5)
                        last_valid_frame = frame.copy()
                        first_frame_received = True
                    except queue.Empty:
                        # If camera is buffering or I-frame is delayed, KEEP rendering last valid frame instead of throwing false CONNECTING black screen!
                        if last_valid_frame is not None:
                            frame = last_valid_frame.copy()
                        elif str(camera_id) in LATEST_CAMERA_FRAMES:
                            frame = LATEST_CAMERA_FRAMES[str(camera_id)].copy()
                        else:
                            # Only show placeholder on absolute first cold boot before first frame ever arrives
                            empty_frame = np.zeros((360, 640, 3), dtype=np.uint8)
                            cv2.putText(empty_frame, "ACQUIRING LIVE RTSP STREAM...", (110, 180), 
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 240, 255), 2)
                            ret, buffer = cv2.imencode('.jpg', empty_frame, [cv2.IMWRITE_JPEG_QUALITY, 35])
                            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
                            time.sleep(0.1)
                            continue
                    
                frame = enhance_low_light(frame)
                if is_camera_flipped(camera_id):
                    frame = cv2.flip(frame, 1)
                
                if frame_counter % 15 == 0:
                    current_zones = get_camera_zones(camera_id)
                elif 'current_zones' not in locals():
                    current_zones = get_camera_zones(camera_id)
                
                frame_counter += 1
                
                if 'last_draw_data' not in locals():
                    last_draw_data = {
                        'boxes': [], 'track_ids': [], 'class_ids': [], 'confs': [],
                        'all_keypoints': None, 'weapon_results': None, 'alerts': {}
                    }

                # Run YOLO detection on this frame if interval met
                if frame_counter % yolo_interval == 0:
                    h_orig, w_orig = frame.shape[:2]
                    scale = 480 / w_orig if w_orig > 480 else 1.0
                    if scale < 1.0:
                        small_frame = cv2.resize(frame, (480, int(h_orig * scale)), interpolation=cv2.INTER_NEAREST)
                    else:
                        small_frame = frame
                        
                    with _detector_lock:
                        pose_results, object_results, weapon_results = cam_detector.process_frame(
                            small_frame, conf_threshold=0.45, active_features=ACTIVE_FEATURES
                        )

                    # Extract vehicle bounding boxes (Car, Van, SUV, Motorcycle, Bus, Truck, Bicycle)
                    vehicle_boxes, vehicle_classes, vehicle_confs, vehicle_ids = [], [], [], []
                    if object_results is not None and len(object_results) > 0 and object_results[0].boxes is not None:
                        obj_b = object_results[0].boxes
                        if len(obj_b) > 0:
                            vehicle_boxes = obj_b.xyxy.cpu().numpy() / scale
                            vehicle_classes = obj_b.cls.int().cpu().tolist()
                            vehicle_confs = obj_b.conf.cpu().tolist()
                            if obj_b.id is not None:
                                vehicle_ids = obj_b.id.int().cpu().tolist()
                            else:
                                vehicle_ids = [None] * len(vehicle_boxes)

                    # Scale boxes back up to original frame dimensions
                    if pose_results[0].boxes is not None and pose_results[0].boxes.id is not None:
                        scaled_boxes = pose_results[0].boxes.xyxy.cpu().numpy() / scale
                        track_ids = pose_results[0].boxes.id.int().cpu().tolist()
                        class_ids = pose_results[0].boxes.cls.int().cpu().tolist()
                        confs = pose_results[0].boxes.conf.cpu().tolist()
                        
                        all_keypoints = None
                        if hasattr(pose_results[0], 'keypoints') and pose_results[0].keypoints is not None:
                            kp_data = pose_results[0].keypoints.data.cpu().numpy()
                            # Scale x and y, leave conf alone
                            kp_data[:, :, 0:2] = kp_data[:, :, 0:2] / scale
                            all_keypoints = kp_data

                        # IoU & Overlap Deduplication: eliminate duplicate detections of the same individual
                        if len(scaled_boxes) > 1:
                            keep_idx = []
                            sorted_idx = sorted(range(len(confs)), key=lambda k: confs[k], reverse=True)
                            for s_i in sorted_idx:
                                b_s = scaled_boxes[s_i]
                                is_dup = False
                                for k_i in keep_idx:
                                    b_k = scaled_boxes[k_i]
                                    ix1 = max(b_s[0], b_k[0])
                                    iy1 = max(b_s[1], b_k[1])
                                    ix2 = min(b_s[2], b_k[2])
                                    iy2 = min(b_s[3], b_k[3])
                                    if ix2 > ix1 and iy2 > iy1:
                                        inter_area = (ix2 - ix1) * (iy2 - iy1)
                                        area_s = (b_s[2] - b_s[0]) * (b_s[3] - b_s[1])
                                        area_k = (b_k[2] - b_k[0]) * (b_k[3] - b_k[1])
                                        union_area = area_s + area_k - inter_area
                                        iou = inter_area / union_area if union_area > 0 else 0
                                        overlap = inter_area / min(area_s, area_k) if min(area_s, area_k) > 0 else 0
                                        if iou > 0.35 or overlap > 0.60:
                                            is_dup = True
                                            break
                                if not is_dup:
                                    keep_idx.append(s_i)
                            
                            scaled_boxes = [scaled_boxes[k] for k in keep_idx]
                            track_ids = [track_ids[k] for k in keep_idx]
                            class_ids = [class_ids[k] for k in keep_idx]
                            confs = [confs[k] for k in keep_idx]
                            if all_keypoints is not None and len(all_keypoints) > 0:
                                all_keypoints = [all_keypoints[k] for k in keep_idx]

                        last_draw_data = {
                            'boxes': scaled_boxes,
                            'track_ids': track_ids,
                            'class_ids': class_ids,
                            'confs': confs,
                            'all_keypoints': all_keypoints,
                            'weapon_results': weapon_results,
                            'vehicle_boxes': vehicle_boxes,
                            'vehicle_classes': vehicle_classes,
                            'vehicle_confs': vehicle_confs,
                            'vehicle_ids': vehicle_ids
                        }
                    else:
                        last_draw_data['boxes'] = []
                        last_draw_data['track_ids'] = []
                        last_draw_data['class_ids'] = []
                        last_draw_data['confs'] = []
                        last_draw_data['all_keypoints'] = None
                        last_draw_data['weapon_results'] = weapon_results
                        last_draw_data['vehicle_boxes'] = vehicle_boxes
                        last_draw_data['vehicle_classes'] = vehicle_classes
                        last_draw_data['vehicle_confs'] = vehicle_confs
                        last_draw_data['vehicle_ids'] = vehicle_ids

                # Prepare base frame for drawing
                annotated_frame = frame.copy()

                boxes = last_draw_data['boxes']
                track_ids = last_draw_data['track_ids']
                class_ids = last_draw_data['class_ids']
                confs = last_draw_data['confs']
                all_keypoints = last_draw_data['all_keypoints']
                weapon_results = last_draw_data['weapon_results']

                # 2. WEAPON & DEADLY THREAT PERSISTENCE TRACKER
                now_w = time.time()
                if not hasattr(cam_analyzer, '_persisted_weapons'):
                    cam_analyzer._persisted_weapons = []

                def register_active_threat(box_coords, w_label, w_conf):
                    bx1, by1, bx2, by2 = box_coords
                    bcx, bcy = (bx1 + bx2) / 2, (by1 + by2) / 2
                    found = False
                    for item in cam_analyzer._persisted_weapons:
                        ox1, oy1, ox2, oy2 = item['box']
                        ocx, ocy = (ox1 + ox2) / 2, (oy1 + oy2) / 2
                        dist = ((bcx - ocx)**2 + (bcy - ocy)**2)**0.5
                        if dist < 220:
                            item['box'] = [
                                int(0.70 * bx1 + 0.30 * ox1),
                                int(0.70 * by1 + 0.30 * oy1),
                                int(0.70 * bx2 + 0.30 * ox2),
                                int(0.70 * by2 + 0.30 * oy2)
                            ]
                            item['conf'] = max(item['conf'], w_conf)
                            item['type'] = w_label
                            item['expire_at'] = now_w + 4.5  # Lock on screen for 4.5 seconds
                            found = True
                            break
                    if not found:
                        cam_analyzer._persisted_weapons.append({
                            'box': [int(bx1), int(by1), int(bx2), int(by2)],
                            'type': w_label,
                            'conf': w_conf,
                            'expire_at': now_w + 4.5
                        })

                # A. Detect from Custom Weapon Model (Guns, Knives)
                if weapon_results and len(weapon_results) > 0 and weapon_results[0].boxes is not None and len(weapon_results[0].boxes) > 0:
                    for wbox in weapon_results[0].boxes:
                        w_conf = float(wbox.conf.item())
                        w_cls = int(wbox.cls.item())
                        w_name = weapon_results[0].names[w_cls].lower()
                        if w_name in ['knife', 'gun', 'pistol', 'firearm', 'dagger'] and w_conf >= 0.28:
                            wx1, wy1, wx2, wy2 = wbox.xyxy[0].cpu().numpy()
                            if 'scale' in locals() and scale < 1.0:
                                wx1, wy1, wx2, wy2 = wx1/scale, wy1/scale, wx2/scale, wy2/scale
                            label_str = "Knife" if w_name in ['knife', 'dagger'] else "Firearm"
                            register_active_threat([wx1, wy1, wx2, wy2], label_str, w_conf)

                            if not hasattr(cam_analyzer, '_last_weapon_dispatch') or now_w - cam_analyzer._last_weapon_dispatch > 8.0:
                                cam_analyzer._last_weapon_dispatch = now_w
                                res = api.send_alert(
                                    camera_id=camera_id,
                                    behavior_type=f"{label_str} Detected",
                                    confidence=float(w_conf),
                                    details=f"Active armed threat confirmed: {label_str} (Confidence: {w_conf*100:.1f}%)"
                                )
                                clip_url = res[0] if res else ""
                                notifier.send_alert(
                                    f"🚨 <b>ARMED THREAT DETECTED:</b> {label_str} on {camera_id}\nConfidence: {w_conf*100:.1f}%",
                                    annotated_frame,
                                    clip_url,
                                    category="weapon"
                                )

                # B. Detect from Object Tracking Model (Class 43: Knife, 76: Scissors, 34: Baseball Bat)
                v_boxes = last_draw_data.get('vehicle_boxes', [])
                v_classes = last_draw_data.get('vehicle_classes', [])
                v_confs = last_draw_data.get('vehicle_confs', [])
                v_ids = last_draw_data.get('vehicle_ids', [])
                
                for v_box, v_cls, v_conf, v_id in zip(v_boxes, v_classes, v_confs, v_ids):
                    if v_cls in [34, 43, 76] and v_conf >= 0.28:
                        w_label = "Knife" if v_cls == 43 else ("Scissors" if v_cls == 76 else "Bat / Club")
                        vx1, wy1, vx2, vy2 = [int(v) for v in v_box]
                        register_active_threat([vx1, vy1, vx2, vy2], w_label, float(v_conf))

                        if not hasattr(cam_analyzer, '_last_knife_alert') or now_w - cam_analyzer._last_knife_alert > 8.0:
                            cam_analyzer._last_knife_alert = now_w
                            res = api.send_alert(
                                camera_id=camera_id,
                                behavior_type=f"{w_label} Detected",
                                confidence=float(v_conf),
                                details=f"Active threat detected: {w_label} (Confidence: {v_conf*100:.1f}%)"
                            )
                            clip_url = res[0] if res else ""
                            notifier.send_alert(f"🔪 <b>DEADLY WEAPON DETECTED:</b> {w_label} on {camera_id} (Confidence: {v_conf*100:.1f}%)", annotated_frame, clip_url, category="knife")
                        continue

                    if v_conf >= 0.60:
                        v_type = attr_recognizer.classify_vehicle(v_cls, v_box)
                        
                        # --- Automatic License Plate Recognition (ALPR) ---
                        plate_text = None
                        if v_id is not None:
                            plate_text = global_alpr.get_plate(v_id)
                            if plate_text == "NOT_FOUND":
                                plate_text = None
                            elif not plate_text and not global_alpr.is_processing(v_id):
                                # Crop vehicle ensuring bounds
                                vx1, vy1, vx2, vy2 = [int(v) for v in v_box]
                                h_f, w_f = frame.shape[:2]
                                vx1, vy1 = max(0, vx1), max(0, vy1)
                                vx2, vy2 = min(w_f, vx2), min(h_f, vy2)
                                if vy2 > vy1 and vx2 > vx1:
                                    v_crop = frame[vy1:vy2, vx1:vx2]
                                    global_alpr.process_async(v_id, v_crop.copy())
                        
                        if plate_text:
                            v_type = f"{v_type} | ALPR: {plate_text}"
                            
                        attr_recognizer.draw_vehicle_badge(annotated_frame, v_box, v_type, track_id=v_id, conf=v_conf)

                # 3. Analyze Human Behavior & Draw Bounding Boxes
                current_person_ids = set()
                current_person_boxes = {}

                if len(boxes) > 0:
                    # --- Cross-Camera Re-ID ---
                    person_boxes_list = [box for box, cls in zip(boxes, class_ids) if cls == 0]
                    person_ids_list = [tid for tid, cls in zip(track_ids, class_ids) if cls == 0]
                    if frame_counter % yolo_interval == 0:
                        handoff_events = global_tracker.update(camera_id, person_ids_list, person_boxes_list, frame)
                        for event in handoff_events:
                            msg = f"HANDOFF: Person from {event['from_camera']} ({event['confidence']*100:.0f}% match)"
                            cv2.putText(annotated_frame, msg, (10, 250), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                            api.send_alert(
                                camera_id=camera_id,
                                behavior_type="Cross-Camera Handoff",
                                confidence=event['confidence'],
                                details=f"Person tracked from {event['from_camera']} to {camera_id} via {event['exit_direction']} exit."
                            )

                    ptz_target_tracked = False
                    person_boxes = []
                    for i, (box, track_id, class_id, conf) in enumerate(zip(boxes, track_ids, class_ids, confs)):
                        if class_id == 0 and conf >= 0.45:
                            current_person_ids.add(track_id)
                            current_person_boxes[track_id] = box
                            person_boxes.append(box)
                            person_keypoints = all_keypoints[i] if (all_keypoints is not None and i < len(all_keypoints)) else None
                            # Pass current_zones to analyzer if needed, but for now we draw and alert below
                            try:
                                alert = cam_analyzer.analyze(track_id, box, person_keypoints, conf, zone_points=[], active_features=ACTIVE_FEATURES)
                            except Exception as _e:
                                alert = None
                            
                            # Custom Restricted Zone Intrusion Detection
                            for z in current_zones:
                                zc = z.get('coordinates', {})
                                if not zc: continue
                                h_f, w_f = annotated_frame.shape[:2]
                                zx1 = min(zc.get('x1', 0), zc.get('x2', 0)) * w_f / 100
                                zx2 = max(zc.get('x1', 0), zc.get('x2', 0)) * w_f / 100
                                zy1 = min(zc.get('y1', 0), zc.get('y2', 0)) * h_f / 100
                                zy2 = max(zc.get('y1', 0), zc.get('y2', 0)) * h_f / 100
                                # Check if person intersects or center is inside the restricted zone
                                px1, py1, px2, py2 = box
                                pcx, pcy = (px1 + px2) / 2, (py1 + py2) / 2
                                intersects = not (px2 < zx1 or px1 > zx2 or py2 < zy1 or py1 > zy2)
                                center_inside = (zx1 <= pcx <= zx2 and zy1 <= pcy <= zy2)
                                if center_inside or intersects:
                                    # Trigger Zone Alert with intelligent track-based debounce
                                    zone_label = z.get('zone_label', 'RESTRICTED')
                                    zone_id = z.get('id', zone_label)
                                    history_key = f"{camera_id}_{track_id}_{zone_id}"
                                    now_z = time.time()
                                    if not hasattr(cam_analyzer, '_zone_alert_history'):
                                        cam_analyzer._zone_alert_history = {}
                                    last_z_t = cam_analyzer._zone_alert_history.get(history_key, 0)
                                    is_new_zone = (now_z - last_z_t > 12.0)
                                    if is_new_zone:
                                        cam_analyzer._zone_alert_history[history_key] = now_z

                                    zone_behavior = "Tripwire Intrusion" if 'CRITICAL' in z.get('alarm_level', '') else "Warning Zone Entry"
                                    zone_alert = {
                                        "behavior": zone_behavior,
                                        "confidence": 0.99,
                                        "details": f"Individual ID #{track_id} crossed boundary: {zone_label}",
                                        "is_new": is_new_zone
                                    }
                                    if not alert:
                                        alert = zone_alert
                                    else:
                                        alert['details'] += f" | Intruding: {zone_label}"
                                        if is_new_zone:
                                            alert['is_new'] = True
                            
                            # Detect Person Visual Attributes (Gender, Hair Style, Top Clothing Color) & Draw Cinematic HUD Badge
                            try:
                                attrs = attr_recognizer.detect_attributes(frame, box, person_keypoints, track_id=track_id)
                                attr_recognizer.draw_attribute_badge(annotated_frame, box, attrs, track_id=track_id)
                            except Exception as _e:
                                pass
                            
                            # Automatically dispatch 'Person Detected' incident alert with smart enterprise throttling (once per 60s per individual, 20s per camera zone)
                            now_t = time.time()
                            if not hasattr(cam_analyzer, '_person_alert_timestamps'):
                                cam_analyzer._person_alert_timestamps = {}
                            if not hasattr(cam_analyzer, '_last_cam_person_time'):
                                cam_analyzer._last_cam_person_time = 0
                                
                            last_alert_t = cam_analyzer._person_alert_timestamps.get(track_id, 0)
                            if (now_t - last_alert_t > 60.0) and (now_t - cam_analyzer._last_cam_person_time > 20.0):
                                try:
                                    res = api.send_alert(
                                        camera_id=camera_id,
                                        behavior_type="Person Detected",
                                        confidence=float(conf) if conf else 0.92,
                                        details=f"Live AI surveillance monitored verified Person ID:{track_id} entering {camera_id} sector."
                                    )
                                    clip_url = res[0] if res else ""
                                    notifier.send_alert(f"👤 <b>PERSON DETECTED:</b> Individual #{track_id} entered sector on {camera_id}", annotated_frame, clip_url, category="person")
                                except Exception:
                                    pass
                                cam_analyzer._person_alert_timestamps[track_id] = now_t
                                cam_analyzer._last_cam_person_time = now_t

                            # Trigger Alert overlay
                            if alert:
                                if alert.get("is_new"):
                                    res = api.send_alert(
                                        camera_id=camera_id,
                                        behavior_type=alert["behavior"],
                                        confidence=alert["confidence"],
                                        details=alert["details"]
                                    )
                                    clip_url = res[0] if res else ""
                                    
                                    # Dispatch Telegram alert for Tripwires, Intrusions, and Critical Behaviors
                                    cat = "tripwire" if "Tripwire" in alert["behavior"] or "Intrusion" in alert["behavior"] else "violence"
                                    notifier.send_alert(
                                        f"🚨 <b>{alert['behavior'].upper()}:</b> {alert['details']} on {camera_id}",
                                        annotated_frame,
                                        clip_url,
                                        category=cat
                                    )
                                # Draw Red Threat Box & Warning Badge (matches exact design from user screenshot: ! Fight Detected / ! Weapon Detected)
                                attr_recognizer.draw_threat_alert_badge(annotated_frame, box, alert["behavior"])
                                            
                            # PTZ Tracking: Command camera to move towards center of person's box
                            if ptz_controller is not None and not ptz_target_tracked:
                                x1, y1, x2, y2 = box
                                cx = (x1 + x2) / 2
                                cy = (y1 + y2) / 2
                                h, w = frame.shape[:2]
                                ptz_controller.track_target(cx, cy, w, h)
                                ptz_target_tracked = True
                                            
                    # Cross-Camera Exit Detection
                    if frame_counter % yolo_interval == 0:
                        exited_ids = prev_track_ids - current_person_ids
                        for exited_id in exited_ids:
                            if exited_id in current_person_boxes:
                                global_tracker.register_exit(camera_id, exited_id, current_person_boxes[exited_id], frame)
                        prev_track_ids = current_person_ids
                    
                    # Update crowd stats
                    cam_analyzer.update_crowd_density(len(person_boxes))
                    LIVE_PERSON_COUNTS[camera_id] = len(current_person_ids)

                    # Group Behavior Analysis (e.g. Fighting)
                    person_tracks = []
                    for box, track_id, class_id, conf in zip(boxes, track_ids, class_ids, confs):
                        if class_id == 0 and conf >= 0.45:
                            person_tracks.append(track_id)
                    
                    group_alert = None
                    if ACTIVE_FEATURES.get("violence_detection", True):
                        group_alert = cam_analyzer.analyze_group_behavior(person_tracks, person_boxes)
                    
                    if group_alert:
                        if group_alert.get("is_new"):
                            res = api.send_alert(
                                camera_id=camera_id,
                                behavior_type=group_alert["behavior"],
                                confidence=group_alert["confidence"],
                                details=group_alert["details"]
                            )
                            clip_url = res[0] if res else ""
                            notifier.send_alert(
                                f"CRITICAL: {group_alert['behavior']} detected on {camera_id}",
                                annotated_frame,
                                clip_url
                            )
                        cv2.putText(annotated_frame, f"CRITICAL: {group_alert['behavior']}", (10, 170), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)

                    # Unattended Object Left Behind Analysis
                    unattended_alert = None
                    if ACTIVE_FEATURES.get("unattended_detection", True):
                        unattended_alert = cam_analyzer.analyze_unattended_objects(v_boxes, v_classes, v_confs, person_boxes)
                    
                    if unattended_alert:
                        if unattended_alert.get("is_new"):
                            res = api.send_alert(
                                camera_id=camera_id,
                                behavior_type=unattended_alert["behavior"],
                                confidence=unattended_alert["confidence"],
                                details=unattended_alert["details"]
                            )
                            clip_url = res[0] if res else ""
                            notifier.send_alert(
                                f"SECURITY ALERT: {unattended_alert['behavior']} on {camera_id}",
                                annotated_frame,
                                clip_url
                            )
                        if "box" in unattended_alert:
                            attr_recognizer.draw_threat_alert_badge(annotated_frame, unattended_alert["box"], unattended_alert["behavior"])
                
                # Draw dynamic intrusion zones from frontend
                if current_zones:
                    for z in current_zones:
                        zc = z.get('coordinates', {})
                        if not zc: continue
                        h_f, w_f = annotated_frame.shape[:2]
                        zx1 = int(min(zc.get('x1', 0), zc.get('x2', 0)) * w_f / 100)
                        zy1 = int(min(zc.get('y1', 0), zc.get('y2', 0)) * h_f / 100)
                        zx2 = int(max(zc.get('x1', 0), zc.get('x2', 0)) * w_f / 100)
                        zy2 = int(max(zc.get('y1', 0), zc.get('y2', 0)) * h_f / 100)
                        color = (0, 0, 255) if 'CRITICAL' in z.get('alarm_level', '') else (0, 215, 255)
                        cv2.rectangle(annotated_frame, (zx1, zy1), (zx2, zy2), color, 2)
                        label = z.get('zone_label', 'RESTRICTED')
                        cv2.putText(annotated_frame, f"ZONE: {label.upper()}", (zx1, max(22, zy1 - 8)), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2)
                
                # Render Persisted Active Weapon Threat Boxes (Persistent Hold Time - Never Flickers)
                if hasattr(cam_analyzer, '_persisted_weapons'):
                    now_render = time.time()
                    cam_analyzer._persisted_weapons = [w for w in cam_analyzer._persisted_weapons if now_render < w['expire_at']]
                    for pw in cam_analyzer._persisted_weapons:
                        x1, y1, x2, y2 = pw['box']
                        # High-visibility Tactical Red Threat Box
                        cv2.rectangle(annotated_frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 0, 255), 4)

                        # Corner brackets
                        blen = min(int(abs(x2 - x1) * 0.25), 24)
                        cv2.line(annotated_frame, (int(x1), int(y1)), (int(x1) + blen, int(y1)), (0, 0, 255), 5)
                        cv2.line(annotated_frame, (int(x1), int(y1)), (int(x1), int(y1) + blen), (0, 0, 255), 5)
                        cv2.line(annotated_frame, (int(x2), int(y1)), (int(x2) - blen, int(y1)), (0, 0, 255), 5)
                        cv2.line(annotated_frame, (int(x2), int(y1)), (int(x2), int(y1) + blen), (0, 0, 255), 5)
                        cv2.line(annotated_frame, (int(x1), int(y2)), (int(x1) + blen, int(y2)), (0, 0, 255), 5)
                        cv2.line(annotated_frame, (int(x1), int(y2)), (int(x1), int(y2) - blen), (0, 0, 255), 5)
                        cv2.line(annotated_frame, (int(x2), int(y2)), (int(x2) - blen, int(y2)), (0, 0, 255), 5)
                        cv2.line(annotated_frame, (int(x2), int(y2)), (int(x2), int(y2) - blen), (0, 0, 255), 5)

                        # Tactical Tag Header
                        tag = f"WEAPON: {pw['type'].upper()} [{int(pw['conf']*100)}%]"
                        (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.75, 2)
                        cv2.rectangle(annotated_frame, (int(x1), max(0, int(y1) - th - 12)), (int(x1) + tw + 10, max(0, int(y1))), (0, 0, 255), -1)
                        cv2.putText(annotated_frame, tag, (int(x1) + 5, max(18, int(y1) - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)
                        
                        # Draw threat badge on the person
                        attr_recognizer.draw_threat_alert_badge(annotated_frame, (int(x1), int(y1), int(x2), int(y2)), f"Armed: {pw['type']}")

                # 4. Render Emotion Detection Results & Trigger Alerts
                if enable_emotion and last_emotions:
                    for emotion_data in last_emotions:
                        box = emotion_data["box"]
                        emotions = emotion_data["emotions"]
                        x, y, w, h = box
                        
                        if emotions:
                            dominant_emotion = max(emotions, key=emotions.get)
                            confidence = emotions[dominant_emotion]
                            
                            emotion_alert = cam_analyzer.analyze_emotion(dominant_emotion, confidence)
                            if emotion_alert:
                                if emotion_alert.get("is_new"):
                                    api.send_alert(
                                        camera_id=camera_id,
                                        behavior_type=emotion_alert["behavior"],
                                        confidence=emotion_alert["confidence"],
                                        details=emotion_alert["details"]
                                    )
                                cv2.putText(annotated_frame, f"CRITICAL: {emotion_alert['behavior']}", (10, 130), 
                                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 165, 255), 3)

                            color = (0, 255, 0)
                            if dominant_emotion in ['angry', 'fear', 'disgust'] and confidence > 0.6:
                                color = (0, 165, 255)
                                
                            display_emotion = "Natural" if dominant_emotion == "neutral" else dominant_emotion.capitalize()
                            cv2.rectangle(annotated_frame, (x, y), (x+w, y+h), color, 2)
                            cv2.putText(annotated_frame, f"{display_emotion} ({confidence:.2f})", 
                                        (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                
            except Exception as outer_err:
                print(f"[{camera_id}] Pipeline Frame Processing Error Safeguard: {outer_err}")
                if 'frame' in locals() and frame is not None:
                    annotated_frame = frame.copy()
                elif last_valid_frame is not None:
                    annotated_frame = last_valid_frame.copy()
                else:
                    annotated_frame = np.zeros((360, 640, 3), dtype=np.uint8)
                    cv2.putText(annotated_frame, "SURVEILLANCE STREAM RECOVERY...", (100, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 240, 255), 2)
                
            # Feed frame into continuous NVR circular ring buffer for forensic incident clip extraction
            nvr_recorder.add_frame(camera_id, annotated_frame)
            LATEST_CAMERA_FRAMES[str(camera_id)] = annotated_frame.copy()

            # Encode the frame at high quality (85) for clear streaming
            ret, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            
            # Yield the output frame in the byte format
            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
    finally:
        pass


class RegisterDiscoveredCamera(BaseModel):
    ip_address: str
    stream_url: str
    slot_id: str  # e.g. '3', '4', or 'CAM-03'

@app.get("/api/discovery/scan")
def run_network_discovery():
    """Scans the network switch subnet for active IP video hardware and dynamically updates provision status."""
    scan_results = scanner.scan_subnet()
    
    # Track which IPs are currently active/provisioned
    provisioned_ips = {info.get("ip") for info in DYNAMIC_CAMERAS.values() if info.get("ip")}
    if "1" not in DYNAMIC_CAMERAS and settings.CAMERA_1_IP:
        provisioned_ips.add(settings.CAMERA_1_IP)
    if "2" not in DYNAMIC_CAMERAS and settings.CAMERA_2_IP:
        provisioned_ips.add(settings.CAMERA_2_IP)
        
    for cam in scan_results.get("cameras", []):
        ip = cam.get("ip_address")
        if ip in provisioned_ips:
            cam["is_provisioned"] = True
            # Find the slot name
            found_slot = False
            for slot, info in DYNAMIC_CAMERAS.items():
                if info.get("ip") == ip:
                    cam["assigned_node"] = info.get("name")
                    found_slot = True
                    break
            if not found_slot:
                if ip == settings.CAMERA_1_IP:
                    cam["assigned_node"] = "CAM-01 (Main Entrance Gate)"
                elif ip == settings.CAMERA_2_IP:
                    cam["assigned_node"] = "CAM-02 (North Parking Lot)"
        else:
            cam["is_provisioned"] = False
            cam["assigned_node"] = None
            
    return scan_results

@app.post("/api/discovery/register")
def register_discovered(cam: RegisterDiscoveredCamera):
    """Dynamically provisions a newly discovered network switch camera to a command grid node."""
    slot_num = cam.slot_id.replace("CAM-", "").replace("0", "").strip() or "3"
    node_name = f"CAM-0{slot_num}" if len(slot_num) == 1 else f"CAM-{slot_num}"
    DYNAMIC_CAMERAS[slot_num] = {
        "url": cam.stream_url,
        "name": node_name,
        "ip": cam.ip_address
    }
    try:
        requests.post(f"{settings.BACKEND_URL}/api/cameras/register", json={
            "camera_id": node_name,
            "stream_url": f"http://127.0.0.1:8002/api/video_feed/{slot_num}"
        }, timeout=2.0)
    except Exception:
        pass
    return {"status": "success", "slot_id": slot_num, "node_name": node_name, "stream": f"/api/video_feed/{slot_num}"}


@app.post("/api/discovery/unregister/{slot_id}")
def unregister_camera_endpoint(slot_id: str):
    """Safely removes a camera stream, triggers backend WebSocket alert, and alerts Telegram."""
    slot_num = slot_id.replace("CAM-", "").replace("0", "").strip() or "3"
    node_name = f"CAM-0{slot_num}" if len(slot_num) == 1 else f"CAM-{slot_num}"
    
    ip = "Configured Hardware"
    if slot_num in DYNAMIC_CAMERAS:
        ip = DYNAMIC_CAMERAS[slot_num].get("ip", ip)
        del DYNAMIC_CAMERAS[slot_num]

    # 1. Dispatch alert to Port 8000 Backend alerts database & WebSockets
    try:
        requests.post(f"{settings.BACKEND_URL}/alerts/", json={
            "camera_id": node_name,
            "behavior_type": "Camera Disconnected",
            "confidence": 1.0,
            "details": f"Camera hardware {node_name} ({ip}) was successfully de-provisioned and removed from service by Administrator Sasiru."
        }, timeout=2.0)
    except Exception:
        pass

    # 2. Dispatch Telegram Channel notification
    try:
        notifier.send_alert(
            f"⚠️ CAMERA DE-PROVISIONED ⚠️\n\nCamera Node: {node_name}\nIP Address: {ip}\nStatus: REMOVED FROM SERVICE\nAction by: Administrator Sasiru."
        )
    except Exception:
        pass
        
    return {"status": "success"}


class BiometricEnroll(BaseModel):
    name: str
    department: str
    clearance: str
    gender: str
    image_b64: str

@app.post("/api/biometrics/enroll")
def enroll_employee_biometrics(data: BiometricEnroll):
    """Acquires a Base64 image portrait, extracts 128-D vector, and trains the AI whitelist database."""
    try:
        # Decode base64 image
        header, encoded = data.image_b64.split(",", 1) if "," in data.image_b64 else ("", data.image_b64)
        img_bytes = base64.b64decode(encoded)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image encoding")
            
        h, w = frame.shape[:2]
        
        # Load engine to extract feature vector
        from core.biometric_engine import BiometricEngine
        engine = BiometricEngine()
        vector = engine.extract_feature_vector(frame, [0, 0, w, h])
        
        # Load database
        db_path = os.path.join(os.path.dirname(__file__), "employee_biometrics.json")
        employees = []
        if os.path.exists(db_path):
            try:
                with open(db_path, "r", encoding="utf-8") as f:
                    employees = json.load(f)
            except Exception:
                employees = []
                
        # Register profile
        profile = {
            "id": f"EMP-{9001 + len(employees)}",
            "name": data.name,
            "department": data.department,
            "clearance": data.clearance,
            "gender": data.gender,
            "photo_url": data.image_b64,
            "feature_vector": vector.tolist(),
            "registered_date": time.strftime("%Y-%m-%d")
        }
        employees.append(profile)
        
        with open(db_path, "w", encoding="utf-8") as f:
            json.dump(employees, f, indent=4)
            
        return {"status": "success", "profile": profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Biometric training failed: {str(e)}")


@app.get("/api/biometrics/list")
def list_enrolled_employees():
    """Returns the trained whitelist profile records from AI database."""
    db_path = os.path.join(os.path.dirname(__file__), "employee_biometrics.json")
    if os.path.exists(db_path):
        try:
            with open(db_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


@app.delete("/api/biometrics/revoke/{emp_id}")
def revoke_employee_biometrics(emp_id: str):
    """Revokes a biometric whitelist clearance profile from AI recognition database."""
    db_path = os.path.join(os.path.dirname(__file__), "employee_biometrics.json")
    if os.path.exists(db_path):
        try:
            with open(db_path, "r", encoding="utf-8") as f:
                employees = json.load(f)
            updated = [e for e in employees if e.get("id") != emp_id]
            with open(db_path, "w", encoding="utf-8") as f:
                json.dump(updated, f, indent=4)
            return {"status": "success"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    return {"status": "success"}


class BiometricUpdate(BaseModel):
    name: str = None
    department: str = None
    clearance: str = None
    gender: str = None

@app.put("/api/biometrics/update/{emp_id}")
def update_employee_biometrics(emp_id: str, data: BiometricUpdate):
    """Updates employee profile fields in AI whitelist database."""
    db_path = os.path.join(os.path.dirname(__file__), "employee_biometrics.json")
    if os.path.exists(db_path):
        try:
            with open(db_path, "r", encoding="utf-8") as f:
                employees = json.load(f)
            for emp in employees:
                if emp.get("id") == emp_id:
                    if data.name is not None: emp["name"] = data.name
                    if data.department is not None: emp["department"] = data.department
                    if data.clearance is not None: emp["clearance"] = data.clearance
                    if data.gender is not None: emp["gender"] = data.gender
                    break
            with open(db_path, "w", encoding="utf-8") as f:
                json.dump(employees, f, indent=4)
            return {"status": "success"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    return {"status": "not_found"}


@app.post("/api/biometrics/toggle-active/{emp_id}")
def toggle_employee_active(emp_id: str):
    """Toggles the active/inactive status of an employee in AI whitelist database."""
    db_path = os.path.join(os.path.dirname(__file__), "employee_biometrics.json")
    if os.path.exists(db_path):
        try:
            with open(db_path, "r", encoding="utf-8") as f:
                employees = json.load(f)
            new_status = True
            for emp in employees:
                if emp.get("id") == emp_id:
                    emp["active"] = not emp.get("active", True)
                    new_status = emp["active"]
                    break
            with open(db_path, "w", encoding="utf-8") as f:
                json.dump(employees, f, indent=4)
            return {"status": "success", "active": new_status}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    return {"status": "not_found"}


class SimulateThreatRequest(BaseModel):
    camera_id: str = "CAM-01"
    behavior_type: str = "Pistol Detected"
    confidence: float = 0.96
    details: str = "Simulated high-priority weapon intrusion detected for demonstration assessment."

@app.post("/api/simulate/threat")
def simulate_threat_event(req: SimulateThreatRequest):
    """Interactive Friday Demo test endpoint: generates verified real-time threat alert, dispatches Telegram 2FA photo notification, and encodes live forensic MP4 video clip."""
    live_frame = LATEST_CAMERA_FRAMES.get(req.camera_id, None)
    if live_frame is None and "CAM-01" in LATEST_CAMERA_FRAMES:
        live_frame = LATEST_CAMERA_FRAMES["CAM-01"]
    if live_frame is None and len(LATEST_CAMERA_FRAMES) > 0:
        live_frame = list(LATEST_CAMERA_FRAMES.values())[0]
    
    # 1. Dispatch alert to Port 8000 Backend SQLite & WebSockets
    api.send_alert(
        camera_id=req.camera_id,
        behavior_type=req.behavior_type,
        confidence=req.confidence,
        details=req.details
    )
    
    # 2. Dispatch live photo verification to Admin Telegram App!
    try:
        msg = f"[COMMAND DEMO] CRITICAL ALERT CONFIRMED: {req.behavior_type} on {req.camera_id}. {req.details}"
        notifier.send_alert(msg, frame=live_frame)
    except Exception:
        pass
        
    return {"status": "success", "message": f"Successfully triggered simulated threat {req.behavior_type} across Command Grid and Telegram Bot."}


class OTPRequest(BaseModel):
    code: str
    message: str
    bot_token: str = "8337361642:AAHkEadKvtWMWnHaLVMnAM1COY97VYPiK-w"
    chat_id: str = "1331146374"

@app.post("/api/auth/send_otp")
def send_telegram_otp_pipeline(req: OTPRequest):
    """Redundant failproof Telegram 2FA OTP delivery via Port 8002 pipeline."""
    try:
        token = req.bot_token or "8337361642:AAHkEadKvtWMWnHaLVMnAM1COY97VYPiK-w"
        chat = req.chat_id or "1331146374"
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        requests.post(url, json={"chat_id": chat, "text": req.message}, timeout=6.0)
    except Exception:
        pass
    return {"status": "success"}


@app.get("/api/video_feed/{cam_id}")
def video_feed(cam_id: str):
    cid = str(cam_id)
    if cid == "webcam":
        return StreamingResponse(
            generate_frames(0, "CAM-01 (Webcam)", ptz_cam1, cam_analyzer=analyzer_cam1, cam_detector=detector_cam1, enable_emotion=False),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
    elif cid == "1":
        url = settings.CAMERA_1_RTSP_URL
        return StreamingResponse(
            generate_frames(url, "CAM-01", ptz_cam1, cam_analyzer=analyzer_cam1, cam_detector=detector_cam1, enable_emotion=False),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
    elif cid == "2":
        url = settings.CAMERA_2_RTSP_URL
        return StreamingResponse(
            generate_frames(url, "CAM-02", ptz_cam2, cam_analyzer=analyzer_cam2, cam_detector=detector_cam2, enable_emotion=False),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
    else:
        info = DYNAMIC_CAMERAS.get(cid, {"url": settings.CAMERA_1_RTSP_URL, "name": f"CAM-0{cid}" if len(cid)==1 else f"CAM-{cid}"})
        if cid not in dynamic_analyzers:
            dynamic_analyzers[cid] = BehaviorAnalyzer()
            dynamic_detectors[cid] = Detector()
        return StreamingResponse(
            generate_frames(info["url"], info["name"], ptz_cam1, cam_analyzer=dynamic_analyzers[cid], cam_detector=dynamic_detectors[cid], enable_emotion=False),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=False)

