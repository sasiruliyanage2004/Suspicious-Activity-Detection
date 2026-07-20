import cv2
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from detector import Detector
from behavior_analyzer import BehaviorAnalyzer
from api_client import APIClient
from fer.fer import FER
import time
import numpy as np

import threading
import requests
from ptz_controller import PTZController
app = FastAPI()

def auto_register_camera():
    while True:
        try:
            requests.post("http://127.0.0.1:8000/api/cameras/register", json={
                "camera_id": "PTZ-Cam-1",
                "stream_url": "http://127.0.0.1:8002/api/video_feed/1"
            })
            requests.post("http://127.0.0.1:8000/api/cameras/register", json={
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

GLOBAL_WEAPON_THRESHOLD = 0.65

@app.post("/api/settings/threshold")
def update_threshold(setting: ThresholdSetting):
    global GLOBAL_WEAPON_THRESHOLD
    GLOBAL_WEAPON_THRESHOLD = setting.threshold
    return {"status": "success", "threshold": GLOBAL_WEAPON_THRESHOLD}

# Initialize components globally so they stay loaded
detector = Detector()
analyzer = BehaviorAnalyzer()
api = APIClient()
# Initialize Emotion Detector (mtcnn=True uses MTCNN which is much more accurate for face detection)
emotion_detector = FER(mtcnn=True)

# Initialize PTZ Controllers
ptz_cam1 = PTZController("192.168.1.64", 80, "admin", "Hikvision321")
ptz_cam2 = None # Camera 2 is fixed or we don't have credentials for it yet

def generate_frames(camera_url, camera_id, ptz_controller=None):
    import queue

    # --- Threaded Frame Reader to prevent blocking ---
    raw_frame_queue = queue.Queue(maxsize=2)
    
    def frame_reader_thread():
        cap = cv2.VideoCapture(camera_url)
        if cap.isOpened():
            print(f"[{camera_id}] Frame reader connected to {camera_url}")
        else:
            print(f"[{camera_id}] Cannot connect to {camera_url}")
        while True:
            if cap.isOpened():
                ret, frame = cap.read()
                if ret:
                    # Drop oldest if full, always keep latest
                    if raw_frame_queue.full():
                        try: raw_frame_queue.get_nowait()
                        except: pass
                    raw_frame_queue.put(frame)
                else:
                    time.sleep(0.1)
            else:
                time.sleep(1)
                cap = cv2.VideoCapture(camera_url)

    reader_thread = threading.Thread(target=frame_reader_thread, daemon=True)
    reader_thread.start()

    # Wait for first frame or fall back to simulation
    time.sleep(2)
    use_simulation = raw_frame_queue.empty()
    if use_simulation:
        print(f"[{camera_id}] No frames received, using simulation mode")

    frame_counter = 0
    last_emotions = []

    # Simulation state variables
    start_sim_time = time.time()
    person_detected_alert_sent = False
    loitering_alert_sent = False
    emotion_alert_sent = False
    weapon_alert_sent = False
    fall_alert_sent = False

    try:
        while True:
            if not use_simulation:
                # Non-blocking get with timeout
                try:
                    frame = raw_frame_queue.get(timeout=1.0)
                except queue.Empty:
                    use_simulation = True
                    continue
                    
                # Flip the frame horizontally to fix mirror effect
                frame = cv2.flip(frame, 1)
                
                # Run emotion detection every 10 frames to save processing power
                frame_counter += 1
                
                if frame_counter % 10 == 0:
                    # Detect emotions in the frame
                    last_emotions = emotion_detector.detect_emotions(frame)
                    
                # 1. Detect & Track
                pose_results, weapon_results = detector.process_frame(frame, conf_threshold=GLOBAL_WEAPON_THRESHOLD)
                
                # 2. Analyze Weapon Behavior
                weapon_alert = analyzer.analyze_weapons(weapon_results, threshold=GLOBAL_WEAPON_THRESHOLD)
                if weapon_alert:
                    if weapon_alert.get("is_new"):
                        api.send_alert(
                            camera_id=camera_id,
                            behavior_type=weapon_alert["behavior"],
                            confidence=weapon_alert["confidence"],
                            details=weapon_alert["details"]
                        )
                    cv2.putText(frame, f"CRITICAL: {weapon_alert['behavior']}", (10, 90), 
                                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)

                # Base frame for drawing
                annotated_frame = frame.copy()

                # 3. Analyze Human Behavior
                if pose_results[0].boxes.id is not None:
                    boxes = pose_results[0].boxes.xyxy.cpu().numpy()
                    track_ids = pose_results[0].boxes.id.int().cpu().tolist()
                    class_ids = pose_results[0].boxes.cls.int().cpu().tolist()
                    confs = pose_results[0].boxes.conf.cpu().tolist()
                    
                    # Extract keypoints if Pose model is used
                    all_keypoints = None
                    if hasattr(pose_results[0], 'keypoints') and pose_results[0].keypoints is not None:
                        all_keypoints = pose_results[0].keypoints.xy.cpu().numpy()
                    
                    for i, (box, track_id, class_id, conf) in enumerate(zip(boxes, track_ids, class_ids, confs)):
                        # In Pose model, person is class 0
                        if class_id == 0:
                            person_keypoints = all_keypoints[i] if all_keypoints is not None else None
                            alert = analyzer.analyze(track_id, box, person_keypoints, conf)
                            
                            # Draw person bounding box manually (removes skeleton lines)
                            x1, y1, x2, y2 = box
                            cv2.rectangle(annotated_frame, (int(x1), int(y1)), (int(x2), int(y2)), (255, 0, 0), 3)
                            cv2.putText(annotated_frame, f"ID:{track_id} Person {conf:.2f}", (int(x1), int(y1)-10), 
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2)
                            
                            # 3. Trigger Alert
                            if alert:
                                if alert.get("is_new"):
                                    api.send_alert(
                                        camera_id=camera_id,
                                        behavior_type=alert["behavior"],
                                        confidence=alert["confidence"],
                                        details=alert["details"]
                                    )
                                
                                # Draw warning on frame continuously
                                cv2.putText(annotated_frame, f"ALERT: {alert['behavior']}", (10, 50), 
                                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                                            
                            # PTZ Tracking: Command camera to move towards the center of this person's bounding box
                            if ptz_controller is not None:
                                cx = (x1 + x2) / 2
                                cy = (y1 + y2) / 2
                                h, w = frame.shape[:2]
                                ptz_controller.track_target(cx, cy, w, h)
                                
                                # Draw target crosshair
                                cv2.drawMarker(annotated_frame, (int(cx), int(cy)), (0, 255, 255), cv2.MARKER_CROSS, 20, 2)
                                            
                    # Group Behavior Analysis (e.g. Fighting)
                    person_tracks = []
                    person_boxes = []
                    for box, track_id, class_id in zip(boxes, track_ids, class_ids):
                        if class_id == 0:
                            person_tracks.append(track_id)
                            person_boxes.append(box)
                            
                    group_alert = analyzer.analyze_group_behavior(person_tracks, person_boxes)
                    if group_alert:
                        if group_alert.get("is_new"):
                            api.send_alert(
                                camera_id=camera_id,
                                behavior_type=group_alert["behavior"],
                                confidence=group_alert["confidence"],
                                details=group_alert["details"]
                            )
                        cv2.putText(annotated_frame, f"CRITICAL: {group_alert['behavior']}", (10, 170), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
                
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
                if last_emotions:
                    for emotion_data in last_emotions:
                        box = emotion_data["box"]
                        emotions = emotion_data["emotions"]
                        x, y, w, h = box
                        
                        if emotions:
                            dominant_emotion = max(emotions, key=emotions.get)
                            confidence = emotions[dominant_emotion]
                            
                            emotion_alert = analyzer.analyze_emotion(dominant_emotion, confidence)
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
                                    
                # Add delay to match ~15 FPS in simulation mode
                time.sleep(0.066)

            # Encode the frame in JPEG format with optimized quality for faster streaming
            ret, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
            frame_bytes = buffer.tobytes()
            
            # Yield the output frame in the byte format
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    finally:
        if cap is not None:
            cap.release()


@app.get("/api/video_feed/1")
def video_feed_1():
    url = "rtsp://admin:Hikvision321@192.168.1.64:554/Streaming/Channels/101"
    return StreamingResponse(generate_frames(url, "PTZ-Cam-1", ptz_cam1), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/api/video_feed/2")
def video_feed_2():
    url = "rtsp://admin:Hikvision321@192.168.1.2:554/Streaming/Channels/101"
    return StreamingResponse(generate_frames(url, "Fixed-Cam-2", ptz_cam2), media_type="multipart/x-mixed-replace; boundary=frame")
