from onvif import ONVIFCamera
import math
import time
import threading

class PTZController:
    def __init__(self, ip, port, user, password):
        self.ip = ip
        self.port = port
        self.user = user
        self.password = password
        self.camera = None
        self.ptz = None
        self.media = None
        self.profile = None
        self.request = None
        self.last_move_time = 0
        self.is_connected = False
        self._connect_thread = threading.Thread(target=self._connect, daemon=True)
        self._connect_thread.start()

    def _connect(self):
        try:
            print(f"Connecting to ONVIF camera at {self.ip}...")
            # wsdl_dir is usually required on Windows for zeep. We'll specify the standard package path if needed, but try default first.
            self.camera = ONVIFCamera(self.ip, self.port, self.user, self.password, wsdl_dir='C:/Users/Sasiru/AppData/Local/Packages/PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0/LocalCache/local-packages/Python313/site-packages/wsdl')
            self.media = self.camera.create_media_service()
            self.ptz = self.camera.create_ptz_service()
            
            media_profile = self.media.GetProfiles()[0]
            self.profile = media_profile
            
            self.request = self.ptz.create_type('ContinuousMove')
            self.request.ProfileToken = self.profile.token
            
            status = self.ptz.GetStatus({'ProfileToken': self.profile.token})
            
            # Setup velocity types
            self.request.Velocity = status.Position
            self.is_connected = True
            print(f"Successfully connected to ONVIF PTZ on {self.ip}")
        except Exception as e:
            print(f"Failed to connect to ONVIF camera {self.ip}: {e}")
            self.is_connected = False

    def track_target(self, cx, cy, frame_width, frame_height):
        if not self.is_connected or self.ptz is None:
            return

        current_time = time.time()
        # Throttle commands to max 5 times a second to prevent flooding the camera API
        if current_time - self.last_move_time < 0.2:
            return

        # Calculate error from center
        error_x = cx - (frame_width / 2)
        error_y = cy - (frame_height / 2)

        # Deadzone: if target is within 10% of the center, don't move
        deadzone_x = frame_width * 0.1
        deadzone_y = frame_height * 0.1

        pan_speed = 0.0
        tilt_speed = 0.0

        if abs(error_x) > deadzone_x:
            # Proportional speed calculation, normalized between -1.0 and 1.0
            pan_speed = (error_x / (frame_width / 2))
        
        if abs(error_y) > deadzone_y:
            # Reverse Y because pixel coordinates grow downwards, but tilt grows upwards
            tilt_speed = -(error_y / (frame_height / 2))

        # Stop if inside deadzone
        if pan_speed == 0.0 and tilt_speed == 0.0:
            self.stop()
            return

        try:
            self.request.Velocity.PanTilt.x = pan_speed
            self.request.Velocity.PanTilt.y = tilt_speed
            self.ptz.ContinuousMove(self.request)
            self.last_move_time = current_time
        except Exception as e:
            print(f"PTZ Move Error: {e}")

    def stop(self):
        if not self.is_connected or self.ptz is None:
            return
        try:
            self.ptz.Stop({'ProfileToken': self.profile.token})
        except Exception as e:
            pass
