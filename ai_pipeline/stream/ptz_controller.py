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
        
        self._command_thread = threading.Thread(target=self._process_commands, daemon=True)
        self._command_thread.start()

    def track_target(self, cx, cy, frame_width, frame_height):
        if not self.is_connected:
            return

        error_x = cx - (frame_width / 2)
        error_y = cy - (frame_height / 2)

        deadzone_x = frame_width * 0.15
        deadzone_y = frame_height * 0.15

        pan_speed = 0
        tilt_speed = 0

        # Proportional speeds
        if abs(error_x) > deadzone_x:
            # Map the error to a speed between 10 and 60 to ensure it actually moves
            base_speed = (abs(error_x) / (frame_width / 2)) * 60
            speed = max(10, min(60, int(base_speed)))
            pan_speed = speed if error_x > 0 else -speed
        
        if abs(error_y) > deadzone_y:
            base_speed = (abs(error_y) / (frame_height / 2)) * 60
            speed = max(10, min(60, int(base_speed)))
            # Downward pixel movement means tilt down (negative tilt)
            tilt_speed = -speed if error_y > 0 else speed

        try:
            if self.command_queue.full():
                self.command_queue.get_nowait()
            self.command_queue.put((pan_speed, tilt_speed))
        except:
            pass

    def _process_commands(self):
        last_pan = None
        last_tilt = None
        
        while True:
            try:
                # If YOLO doesn't detect anyone for 0.5s, it will timeout and we automatically send (0,0) to stop the camera
                pan, tilt = self.command_queue.get(timeout=0.5)
            except queue.Empty:
                pan, tilt = 0, 0
                
            # Only send the command if the speed has actually changed, to prevent flooding the camera with identical HTTP requests
            if pan == last_pan and tilt == last_tilt:
                continue
                
            last_pan = pan
            last_tilt = tilt
            
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
            self.command_queue.put((pan, tilt))
        except:
            pass

    def set_home(self):
        url = f"http://{self.ip}:{self.port}/ISAPI/PTZCtrl/channels/1/presets/1"
        try:
            requests.put(url, auth=HTTPDigestAuth(self.user, self.password), timeout=2)
        except Exception as e:
            pass

    def go_home(self):
        url = f"http://{self.ip}:{self.port}/ISAPI/PTZCtrl/channels/1/presets/1/goto"
        try:
            requests.put(url, auth=HTTPDigestAuth(self.user, self.password), timeout=2)
            self.stop() # Ensure continuous move stops tracking
        except Exception as e:
            pass

    def stop(self):
        try:
            if self.command_queue.full():
                self.command_queue.get_nowait()
            self.command_queue.put((0, 0))
        except:
            pass
