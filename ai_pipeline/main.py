import cv2
import os

# Force OpenCV to use TCP for RTSP to prevent Hikvision UDP timeouts and freezing!
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from core.detector import Detector
from core.behavior_analyzer import BehaviorAnalyzer
from core.global_tracker import global_tracker
from core.attribute_recognizer import AttributeRecognizer
from core.auto_discovery import scanner
from core.nvr_recorder import nvr_recorder
from api.api_client import APIClient

DYNAMIC_CAMERAS = {}
dynamic_analyzers = {}
dynamic_detectors = {}
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ThresholdSetting(BaseModel):
    threshold: float

GLOBAL_WEAPON_THRESHOLD = settings.WEAPON_CONFIDENCE_THRESHOLD

ACTIVE_FEATURES = {
    "vehicle_detection": True,
    "weapon_detection": True,
    "smoking_detection": True,
    "violence_detection": True,
    "unattended_detection": True,
    "loitering_detection": True
}

class FeatureSettings(BaseModel):
    settings: dict

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
api = APIClient()
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


def generate_frames(camera_url, camera_id, ptz_controller=None, cam_analyzer=None, cam_detector=None, enable_emotion=False):
    import queue
    if cam_analyzer is None:
        cam_analyzer = BehaviorAnalyzer()
    if cam_detector is None:
        cam_detector = Detector()

    # --- Threaded Frame Reader to prevent blocking ---
    raw_frame_queue = queue.Queue(maxsize=2)
    
    def frame_reader_thread():
        # Open primary camera_url (RTSP IP Camera)
        cap = cv2.VideoCapture(camera_url)

        while True:
            if cap is not None and cap.isOpened():
                ret, frame = cap.read()
                if ret:
                    if raw_frame_queue.full():
                        try: raw_frame_queue.get_nowait()
                        except: pass
                    raw_frame_queue.put(frame)
                    time.sleep(0.02)
                else:
                    # Stream disconnected or lost frame, attempt to reconnect
                    if cap is not None:
                        cap.release()
                    time.sleep(1.0)
                    cap = cv2.VideoCapture(camera_url)
            else:
                time.sleep(2.0)
                if cap is not None:
                    cap.release()
                cap = cv2.VideoCapture(camera_url)

    reader_thread = threading.Thread(target=frame_reader_thread, daemon=True)
    reader_thread.start()

    # Wait for first frame - max 0.5s to prevent socket blocking
    print(f"[{camera_id}] Checking camera stream feed...")
    for _ in range(5):  # 5 x 0.1s = 0.5s fast check
        if not raw_frame_queue.empty():
            break
        time.sleep(0.1)
    
    # We always use real frames from RTSP
    use_simulation = False
    print(f"[{camera_id}] Starting live video pipeline (Live RTSP Stream).")

    frame_counter = 0
    last_emotions = []
    prev_track_ids = set()
    yolo_interval = 4
    emotion_interval = 60

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

    try:
        while True:
            if not use_simulation:
                try:
                    frame = raw_frame_queue.get(timeout=1.0)
                except queue.Empty:
                    # Keep MJPEG HTTP stream alive while OpenCV RTSP socket blocks in background
                    empty_frame = np.zeros((360, 640, 3), dtype=np.uint8)
                    cv2.putText(empty_frame, "CONNECTING TO CAMERA STREAM...", (120, 180), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 2)
                    ret, buffer = cv2.imencode('.jpg', empty_frame, [cv2.IMWRITE_JPEG_QUALITY, 30])
                    yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
                    continue
                    
                frame = cv2.flip(frame, 1)
                
                if frame_counter % 30 == 0:
                    current_zone = api.get_zone(camera_id)
                
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
                        
                    pose_results, object_results, weapon_results = cam_detector.process_frame(
                        small_frame, conf_threshold=GLOBAL_WEAPON_THRESHOLD, active_features=ACTIVE_FEATURES
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
                            all_keypoints = pose_results[0].keypoints.xy.cpu().numpy() / scale

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

                # 2. Analyze Weapon Behavior & Draw
                if weapon_results and len(weapon_results) > 0 and weapon_results[0].boxes is not None and len(weapon_results[0].boxes) > 0:
                    weapon_alert = cam_analyzer.analyze_weapons(weapon_results, threshold=GLOBAL_WEAPON_THRESHOLD)
                    if weapon_alert and weapon_alert.get("is_new"):
                        api.send_alert(
                            camera_id=camera_id,
                            behavior_type=weapon_alert["behavior"],
                            confidence=weapon_alert["confidence"],
                            details=weapon_alert["details"]
                        )
                        notifier.send_alert(
                            f"CRITICAL: {weapon_alert['behavior']} detected on {camera_id}",
                            frame
                        )
                    for wbox in weapon_results[0].boxes:
                        if wbox.conf.item() > GLOBAL_WEAPON_THRESHOLD:
                            wx1, wy1, wx2, wy2 = wbox.xyxy[0].cpu().numpy()
                            # Scale weapon box if needed
                            if 'scale' in locals() and scale < 1.0:
                                wx1, wy1, wx2, wy2 = wx1/scale, wy1/scale, wx2/scale, wy2/scale
                            wcls_id = int(wbox.cls.item())
                            weapon_type = weapon_results[0].names[wcls_id].upper()
                            cv2.rectangle(annotated_frame, (int(wx1), int(wy1)), (int(wx2), int(wy2)), (0, 0, 255), 4)
                            cv2.putText(annotated_frame, f"WEAPON: {weapon_type}", (int(wx1), int(wy1)-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)

                # 2b. Draw Vehicle Detections (Car, Van, SUV, Motorcycle, Bus, Truck, Bicycle)
                v_boxes = last_draw_data.get('vehicle_boxes', [])
                v_classes = last_draw_data.get('vehicle_classes', [])
                v_confs = last_draw_data.get('vehicle_confs', [])
                v_ids = last_draw_data.get('vehicle_ids', [])
                
                for v_box, v_cls, v_conf, v_id in zip(v_boxes, v_classes, v_confs, v_ids):
                    v_type = attr_recognizer.classify_vehicle(v_cls, v_box)
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
                    for i, (box, track_id, class_id, conf) in enumerate(zip(boxes, track_ids, class_ids, confs)):
                        if class_id == 0:
                            current_person_ids.add(track_id)
                            current_person_boxes[track_id] = box
                            person_keypoints = all_keypoints[i] if all_keypoints is not None else None
                            alert = cam_analyzer.analyze(track_id, box, person_keypoints, conf, zone_points=current_zone, active_features=ACTIVE_FEATURES)
                            
                            # Detect Person Visual Attributes (Gender, Hair Style, Top Clothing Color) & Draw Blue HUD Badge
                            attrs = attr_recognizer.detect_attributes(frame, box, person_keypoints)
                            attr_recognizer.draw_attribute_badge(annotated_frame, box, attrs)
                            
                            # Trigger Alert overlay
                            if alert:
                                if alert.get("is_new"):
                                    api.send_alert(
                                        camera_id=camera_id,
                                        behavior_type=alert["behavior"],
                                        confidence=alert["confidence"],
                                        details=alert["details"]
                                    )
                                    if any(b in alert["behavior"] for b in ["Falling", "Suspicious", "Smoking", "Violence"]):
                                        notifier.send_alert(
                                            f"ALERT: {alert['behavior']} detected on {camera_id}",
                                            annotated_frame
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
                                cv2.drawMarker(annotated_frame, (int(cx), int(cy)), (0, 255, 255), cv2.MARKER_CROSS, 25, 2)
                                            
                    # Cross-Camera Exit Detection
                    if frame_counter % yolo_interval == 0:
                        exited_ids = prev_track_ids - current_person_ids
                        for exited_id in exited_ids:
                            if exited_id in current_person_boxes:
                                global_tracker.register_exit(camera_id, exited_id, current_person_boxes[exited_id], frame)
                        prev_track_ids = current_person_ids
                    
                    # Group Behavior Analysis (e.g. Fighting)
                    person_tracks = []
                    person_boxes = []
                    for box, track_id, class_id in zip(boxes, track_ids, class_ids):
                        if class_id == 0:
                            person_tracks.append(track_id)
                            person_boxes.append(box)
                            
                    group_alert = None
                    if ACTIVE_FEATURES.get("violence_detection", True):
                        group_alert = cam_analyzer.analyze_group_behavior(person_tracks, person_boxes)
                    
                    if group_alert:
                        if group_alert.get("is_new"):
                            api.send_alert(
                                camera_id=camera_id,
                                behavior_type=group_alert["behavior"],
                                confidence=group_alert["confidence"],
                                details=group_alert["details"]
                            )
                            notifier.send_alert(
                                f"CRITICAL: {group_alert['behavior']} detected on {camera_id}",
                                annotated_frame
                            )
                        cv2.putText(annotated_frame, f"CRITICAL: {group_alert['behavior']}", (10, 170), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)

                    # Unattended Object Left Behind Analysis
                    unattended_alert = None
                    if ACTIVE_FEATURES.get("unattended_detection", True):
                        unattended_alert = cam_analyzer.analyze_unattended_objects(v_boxes, v_classes, person_boxes)
                    
                    if unattended_alert:
                        if unattended_alert.get("is_new"):
                            api.send_alert(
                                camera_id=camera_id,
                                behavior_type=unattended_alert["behavior"],
                                confidence=unattended_alert["confidence"],
                                details=unattended_alert["details"]
                            )
                            notifier.send_alert(
                                f"SECURITY ALERT: {unattended_alert['behavior']} on {camera_id}",
                                annotated_frame
                            )
                        if "box" in unattended_alert:
                            attr_recognizer.draw_threat_alert_badge(annotated_frame, unattended_alert["box"], unattended_alert["behavior"])
                
                # Draw intrusion zone
                if current_zone and len(current_zone) >= 3:
                    pts = np.array(current_zone, np.int32)
                    pts = pts.reshape((-1, 1, 2))
                    cv2.polylines(annotated_frame, [pts], True, (0, 0, 255), 2)
                    cv2.putText(annotated_frame, "INTRUSION ZONE ACTIVE", (10, 210), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                
                # Render weapon detection results on top
                if weapon_results and len(weapon_results) > 0 and weapon_results[0].boxes is not None and len(weapon_results[0].boxes) > 0:
                    for box in weapon_results[0].boxes:
                        if box.conf.item() > GLOBAL_WEAPON_THRESHOLD:
                            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                            cls_id = int(box.cls.item())
                            weapon_type = weapon_results[0].names[cls_id].upper()
                            
                            cv2.rectangle(annotated_frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 0, 255), 4)
                            cv2.putText(annotated_frame, weapon_type, (int(x1), int(y1)-10), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

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
            else:
                # --- SIMULATION MODE ---
                # 1. Create simulated base frame
                frame = np.zeros((720, 1280, 3), dtype=np.uint8)
                # Draw grid lines
                for y in range(0, 720, 80):
                    cv2.line(frame, (0, y), (1280, y), (20, 20, 20), 1)
                for x in range(0, 1280, 80):
                    cv2.line(frame, (x, 0), (x, 720), (20, 20, 20), 1)

                annotated_frame = frame.copy()
                
                # Display "SIMULATED FEED" warning indicator
                cv2.putText(annotated_frame, "DEMO MODE: SIMULATED CCTV FEED", (380, 45), 
                            cv2.FONT_HERSHEY_SIMPLEX, 1.0, (125, 211, 252), 2)
                
                # State calculations
                sim_time = (time.time() - start_sim_time) % 45.0
                
                # Draw blinking simulation status
                blink = int(time.time() * 2) % 2 == 0
                if blink:
                    cv2.circle(annotated_frame, (50, 40), 10, (0, 0, 255), -1)
                    cv2.putText(annotated_frame, "REC", (75, 48), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                else:
                    cv2.putText(annotated_frame, "REC", (75, 48), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (100, 100, 100), 2)
                                
                cv2.putText(annotated_frame, "ACTIVE MONITORING", (160, 48), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 2)
                
                # Determine state and render content
                if sim_time < 5.0:
                    # State 0: Empty/Idle
                    cv2.putText(annotated_frame, "STATUS: SECURE", (10, 100), 
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                    
                    # Reset triggers for next cycle
                    person_detected_alert_sent = False
                    loitering_alert_sent = False
                    emotion_alert_sent = False
                    weapon_alert_sent = False
                    fall_alert_sent = False
                    
                elif sim_time < 12.0:
                    # State 1: Person Entered (walking from right to center)
                    progress = (sim_time - 5.0) / 7.0 # 0.0 to 1.0
                    cx = int(1280 - progress * 640) # Starts at 1280, moves to 640
                    cy = 360
                    w, h = 180, 400
                    x1, y1 = cx - w//2, cy - h//2
                    x2, y2 = cx + w//2, cy + h//2
                    
                    # Send alert
                    if not person_detected_alert_sent:
                        api.send_alert(
                            camera_id="webcam_1",
                            behavior_type="Person Detected",
                            confidence=0.92,
                            details="Person 101 entered the camera view."
                        )
                        person_detected_alert_sent = True
                        
                    # Draw Person Box
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (255, 0, 0), 3)
                    cv2.putText(annotated_frame, f"ID:101 Person 0.92", (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2)
                    
                elif sim_time < 20.0:
                    # State 2: Loitering (swaying in center)
                    offset_x = int(10 * np.sin(time.time() * 2))
                    cx = 640 + offset_x
                    cy = 360
                    w, h = 180, 400
                    x1, y1 = cx - w//2, cy - h//2
                    x2, y2 = cx + w//2, cy + h//2
                    
                    # Send alert after 3 seconds of loitering
                    if sim_time >= 15.0 and not loitering_alert_sent:
                        api.send_alert(
                            camera_id="webcam_1",
                            behavior_type="Loitering",
                            confidence=0.85,
                            details="Person 101 loitering for 3.0s"
                        )
                        loitering_alert_sent = True
                        
                    # Draw Person Box
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (255, 0, 0), 3)
                    cv2.putText(annotated_frame, f"ID:101 Person 0.92", (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2)
                    
                    # Show loitering warning
                    cv2.putText(annotated_frame, "ALERT: Loitering", (10, 100), 
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 191, 255), 2)
                                
                elif sim_time < 27.0:
                    # State 3: Suspicious Emotion (Angry face)
                    cx, cy = 640, 360
                    w, h = 180, 400
                    x1, y1 = cx - w//2, cy - h//2
                    x2, y2 = cx + w//2, cy + h//2
                    
                    # Face box
                    fx, fy, fw, fh = cx - 40, y1 + 20, 80, 80
                    
                    # Send alert
                    if not emotion_alert_sent:
                        api.send_alert(
                            camera_id="webcam_1",
                            behavior_type="Suspicious Emotion",
                            confidence=0.87,
                            details="High stress emotion detected: ANGRY (87%)"
                        )
                        emotion_alert_sent = True
                        
                    # Draw Person & Face Box
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (255, 0, 0), 3)
                    cv2.putText(annotated_frame, f"ID:101 Person 0.92", (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2)
                                
                    cv2.rectangle(annotated_frame, (fx, fy), (fx+fw, fy+fh), (0, 165, 255), 2)
                    cv2.putText(annotated_frame, "Angry (0.87)", (fx, fy - 8), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)
                                
                    # Show emotion warning
                    cv2.putText(annotated_frame, "CRITICAL: Suspicious Emotion", (10, 100), 
                                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 165, 255), 2)
                                
                elif sim_time < 35.0:
                    # State 4: Weapon Detected (Pistol)
                    cx, cy = 640, 360
                    w, h = 180, 400
                    x1, y1 = cx - w//2, cy - h//2
                    x2, y2 = cx + w//2, cy + h//2
                    
                    # Hand/Weapon box
                    wx, wy, ww, wh = cx + 50, cy - 20, 70, 70
                    
                    # Send alert
                    if not weapon_alert_sent:
                        api.send_alert(
                            camera_id="webcam_1",
                            behavior_type="Pistol Detected",
                            confidence=0.94,
                            details="Pistol detected with 94.0% confidence!"
                        )
                        weapon_alert_sent = True
                        
                    # Draw Person & Weapon Box
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (255, 0, 0), 3)
                    cv2.putText(annotated_frame, f"ID:101 Person 0.92", (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2)
                                
                    cv2.rectangle(annotated_frame, (wx, wy), (wx+ww, wy+wh), (0, 0, 255), 4)
                    cv2.putText(annotated_frame, "PISTOL", (wx, wy - 8), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                                
                    # Show weapon warning
                    cv2.putText(annotated_frame, "CRITICAL: Pistol Detected", (10, 100), 
                                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
                                
                elif sim_time < 41.0:
                    # State 5: Fall Detected (Box is wide and on the floor)
                    cx, cy = 640, 580
                    w, h = 400, 180
                    x1, y1 = cx - w//2, cy - h//2
                    x2, y2 = cx + w//2, cy + h//2
                    
                    # Send alert
                    if not fall_alert_sent:
                        api.send_alert(
                            camera_id="webcam_1",
                            behavior_type="Falling Detected",
                            confidence=0.90,
                            details="Person 101 has fallen down!"
                        )
                        fall_alert_sent = True
                        
                    # Draw fallen Person Box
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
                    cv2.putText(annotated_frame, f"ID:101 Person 0.90", (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                                
                    # Show fall warning
                    cv2.putText(annotated_frame, "ALERT: Falling Detected", (10, 100), 
                                cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 0, 255), 2)
                                
                else:
                    # State 6: Person Leaves (exiting to left)
                    progress = (sim_time - 41.0) / 4.0 # 0.0 to 1.0
                    cx = int(640 - progress * 800) # Starts at 640, moves off screen
                    cy = 360
                    w, h = 180, 400
                    x1, y1 = cx - w//2, cy - h//2
                    x2, y2 = cx + w//2, cy + h//2
                    
                    if cx > -w:
                        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (255, 0, 0), 3)
                        cv2.putText(annotated_frame, f"ID:101 Person 0.92", (x1, y1 - 10), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2)
                                    
                time.sleep(0.04)

            # Feed frame into continuous NVR circular ring buffer for forensic incident clip extraction
            nvr_recorder.add_frame(camera_id, annotated_frame)

            # Encode the frame at optimized quality (42) for ultra-low latency streaming
            ret, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 42])
            frame_bytes = buffer.tobytes()
            
            # Yield the output frame in the byte format
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    finally:
        pass


class RegisterDiscoveredCamera(BaseModel):
    ip_address: str
    stream_url: str
    slot_id: str  # e.g. '3', '4', or 'CAM-03'

@app.get("/api/discovery/scan")
def run_network_discovery():
    """Scans the network switch subnet for active IP video hardware."""
    return scanner.scan_subnet()

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


@app.get("/api/video_feed/{cam_id}")
def video_feed(cam_id: str):
    cid = str(cam_id)
    if cid == "1":
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
