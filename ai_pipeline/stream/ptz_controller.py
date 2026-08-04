import queue
import time
import threading
import requests
from requests.auth import HTTPDigestAuth

class PTZController:
    def __init__(self, ip, port, user, password):
        self.ip = ip
        self.port = 80
        self.user = user
        self.password = password
        self.base_url = f"http://{self.ip}:{self.port}/ISAPI/PTZCtrl/channels/1/continuous"
        
        self.is_connected = True
        self.command_queue = queue.Queue(maxsize=2)
        self.last_track_time = time.time()
        self.has_moved = False
        
        self._command_thread = threading.Thread(target=self._process_commands, daemon=True)
        self._command_thread.start()

    def track_target(self, cx, cy, frame_width, frame_height):
        if not self.is_connected:
            return

        # Pause AI tracking for 15 seconds if an operator is manually steering the camera
        if time.time() - getattr(self, 'last_manual_command_time', 0) < 15.0:
            return

        self.last_track_time = time.time()

        error_x = cx - (frame_width / 2)
        error_y = cy - (frame_height / 2)

        deadzone_x = frame_width * 0.15
        deadzone_y = frame_height * 0.15

        pan_speed = 0
        tilt_speed = 0

        # Proportional speeds
        if abs(error_x) > deadzone_x:
            base_speed = (abs(error_x) / (frame_width / 2)) * 100
            speed = max(40, min(100, int(base_speed)))
            pan_speed = speed if error_x > 0 else -speed
        
        if abs(error_y) > deadzone_y:
            base_speed = (abs(error_y) / (frame_height / 2)) * 100
            speed = max(40, min(100, int(base_speed)))
            tilt_speed = -speed if error_y > 0 else speed

        if pan_speed != 0 or tilt_speed != 0:
            self.has_moved = True

        try:
            if self.command_queue.full():
                self.command_queue.get_nowait()
            self.command_queue.put((pan_speed, tilt_speed, False))
        except:
            pass

    def _process_commands(self):
        last_pan = None
        last_tilt = None
        
        while True:
            try:
                # If YOLO doesn't detect anyone for 0.5s, it will timeout and we automatically send (0,0) to stop the camera
                pan, tilt, is_manual = self.command_queue.get(timeout=0.5)
            except queue.Empty:
                pan, tilt, is_manual = 0, 0, False
                
                # Automatic Return to Home Preset: If human target leaves camera view for > 4.0 seconds after tracking, return immediately to Preset 1 (Home Post)
                if getattr(self, 'has_moved', False) and (time.time() - getattr(self, 'last_track_time', 0)) > 4.0:
                    print(f"[PTZ Surveillance] Target left view / inactive for 4 seconds. Automatically returning camera to default setup station (Home Preset 1)...")
                    try:
                        home_url = f"http://{self.ip}:{self.port}/ISAPI/PTZCtrl/channels/1/presets/1/goto"
                        requests.put(home_url, auth=HTTPDigestAuth(self.user, self.password), timeout=2)
                        self.has_moved = False
                        last_pan, last_tilt = 0, 0
                    except Exception as e:
                        pass
                
            if pan == 0 and tilt == 0:
                if last_pan == 0 and last_tilt == 0:
                    continue
                self._send_ptz(0, 0)
                last_pan, last_tilt = 0, 0
                continue
                
            if is_manual:
                if pan == last_pan and tilt == last_tilt:
                    continue
                self._send_ptz(pan, tilt)
                last_pan, last_tilt = pan, tilt
            else:
                # AI Burst Tracking (Step-and-Wait) to prevent ping-pong oscillation from RTSP delay!
                self._send_ptz(pan, tilt)
                time.sleep(0.35) # Move duration burst
                self._send_ptz(0, 0) # Force Stop
                last_pan, last_tilt = 0, 0
                
                # Clear stale frames that were captured while the camera was moving
                while not self.command_queue.empty():
                    try: self.command_queue.get_nowait()
                    except: pass
                time.sleep(0.65) # Cooldown to let RTSP stream catch up to the new physical position

    def _send_ptz(self, pan, tilt):
        xml_data = f"""<?xml version="1.0" encoding="UTF-8"?>
<PTZData>
<pan>{pan}</pan>
<tilt>{tilt}</tilt>
</PTZData>"""
        try:
            requests.put(
                self.base_url,
                auth=HTTPDigestAuth(self.user, self.password),
                data=xml_data,
                headers={'Content-Type': 'application/xml'},
                timeout=2
            )
        except Exception as e:
            pass

    def manual_move(self, direction):
        if not self.is_connected:
            return
        
        self.last_manual_command_time = time.time()
        
        pan, tilt = 0, 0
        speed = 60
        direction = direction.upper()
        
        if direction == "UP": tilt = speed
        elif direction == "DOWN": tilt = -speed
        elif direction == "LEFT": pan = -speed
        elif direction == "RIGHT": pan = speed
        
        try:
            if self.command_queue.full():
                self.command_queue.get_nowait()
            self.command_queue.put((pan, tilt, True))
        except:
            pass

    def set_home(self):
        self.last_manual_command_time = time.time()
        url = f"http://{self.ip}:{self.port}/ISAPI/PTZCtrl/channels/1/presets/1"
        try:
            requests.put(url, auth=HTTPDigestAuth(self.user, self.password), timeout=2)
        except Exception as e:
            pass

    def go_home(self):
        self.last_manual_command_time = time.time()
        url = f"http://{self.ip}:{self.port}/ISAPI/PTZCtrl/channels/1/presets/1/goto"
        try:
            requests.put(url, auth=HTTPDigestAuth(self.user, self.password), timeout=2)
            self.stop() # Ensure continuous move stops tracking
        except Exception as e:
            pass

    def stop(self):
        self.last_manual_command_time = time.time()
        try:
            if self.command_queue.full():
                self.command_queue.get_nowait()
            self.command_queue.put((0, 0, True))
        except:
            pass
