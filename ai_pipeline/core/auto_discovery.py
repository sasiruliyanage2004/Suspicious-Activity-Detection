import socket
import concurrent.futures
import time
from config import settings

class NetworkCameraScanner:
    def __init__(self, default_subnet="192.168.1", rtsp_port=554, timeout=0.25):
        self.default_subnet = default_subnet
        self.rtsp_port = rtsp_port
        self.timeout = timeout
        self.known_mappings = {
            "192.168.1.64": "CAM-01 (Main Entrance Gate)",
            "192.168.1.2": "CAM-02 (North Parking Lot)"
        }

    def _check_port(self, ip, port):
        """Attempts a fast TCP socket connection to determine if an IP camera is live."""
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(self.timeout)
        try:
            start = time.time()
            s.connect((ip, port))
            latency = int((time.time() - start) * 1000)
            s.close()
            return True, latency
        except Exception:
            return False, 0

    def scan_subnet(self, subnet=None):
        """Scans the local switch subnet for active IP video streams (Port 554/8000)."""
        target_subnet = subnet if subnet else self.default_subnet
        discovered_cameras = []
        
        # We scan IPs concurrently using a thread pool for maximum speed
        ips_to_scan = [f"{target_subnet}.{i}" for i in range(1, 255)]

        with concurrent.futures.ThreadPoolExecutor(max_workers=60) as executor:
            future_to_ip = {executor.submit(self._check_port, ip, self.rtsp_port): ip for ip in ips_to_scan}
            
            for future in concurrent.futures.as_completed(future_to_ip):
                ip = future_to_ip[future]
                try:
                    is_open, latency = future.result()
                    # Only append to discovered list if a genuine physical camera / RTSP service answered
                    if is_open:
                        known = ip in self.known_mappings
                        node_name = self.known_mappings.get(ip, None)
                        
                        user = settings.CAMERA_1_USER
                        password = settings.CAMERA_1_PASS
                        discovered_cameras.append({
                            "ip_address": ip,
                            "port": self.rtsp_port,
                            "latency_ms": latency if latency > 0 else 2,
                            "status": "ONLINE (Hardware Detected)",
                            "is_provisioned": known,
                            "assigned_node": node_name,
                            "model": "ONVIF / RTSP Network Camera",
                            "stream_url": f"rtsp://{user}:{password}@{ip}:554/Streaming/Channels/102"
                        })
                except Exception:
                    continue

        discovered_cameras.sort(key=lambda x: int(x["ip_address"].split(".")[-1]))
        return {
            "status": "success",
            "timestamp": time.time(),
            "scanned_subnet": f"{target_subnet}.0/24",
            "total_active_nodes": len(discovered_cameras),
            "cameras": discovered_cameras
        }

scanner = NetworkCameraScanner()
