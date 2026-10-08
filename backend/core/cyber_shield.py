import time
import json
import re
import os
import hashlib
import asyncio
from typing import Dict, List, Optional
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from core.ws_manager import manager

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "security_data")
os.makedirs(STORAGE_DIR, exist_ok=True)
BLOCKED_IPS_FILE = os.path.join(STORAGE_DIR, "blocked_ips.json")
AUDIT_LOG_FILE = os.path.join(STORAGE_DIR, "cyber_audit_trail.jsonl")

MITRE_ATTACK_MAP = {
    "BRUTE_FORCE_ATTACK": "T1110.001: Password Guessing",
    "SQL_INJECTION": "T1190: Exploit Public-Facing Application",
    "MALICIOUS_PROBE": "T1083: File & Directory Discovery",
    "RATE_LIMIT_EXCEEDED": "T1499.002: Endpoint Denial of Service",
    "SECURITY_SCANNER_BOT": "T1595.002: Vulnerability Scanning",
    "PATH_TRAVERSAL": "T1006: Direct Volume / File Traversal",
    "CYBER_ANOMALY": "T1071: Standard Application Layer Protocol",
    "COMMAND_INJECTION": "T1059: Command and Scripting Interpreter"
}

def resolve_network_classification(ip: str) -> str:
    """Classifies IP network zone according to standard SOC taxonomy."""
    if ip in ("127.0.0.1", "localhost", "::1"):
        return "Loopback Host"
    if ip.startswith("192.168.") or ip.startswith("10.") or ip.startswith("172.16."):
        return "Internal LAN / Rogue Camera Device"
    if ip.startswith("185.220.") or ip.startswith("198.96."):
        return "Tor Exit Node / Anonymizer"
    return "Untrusted External WAN Subnet"

class CyberSecurityEvent:
    def __init__(self, ip: str, threat_type: str, severity: str, details: str, path: str, method: str):
        self.id = f"CYB-{int(time.time() * 1000)}"
        self.ip = ip
        self.threat_type = threat_type
        self.severity = severity # 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
        self.details = details
        self.path = path
        self.method = method
        self.mitre_id = MITRE_ATTACK_MAP.get(threat_type, "T1071")
        self.network_zone = resolve_network_classification(ip)
        self.timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        self.timestamp_epoch = time.time()
        self.blocked = False
        
        # Cryptographic Non-Repudiation Checksum (SHA-256)
        raw_sig = f"{self.id}:{self.ip}:{self.threat_type}:{self.mitre_id}:{self.timestamp}"
        self.sha256_fingerprint = hashlib.sha256(raw_sig.encode()).hexdigest()[:16].upper()

    def to_dict(self):
        return {
            "id": self.id,
            "ip": self.ip,
            "threat_type": self.threat_type,
            "mitre_id": self.mitre_id,
            "network_zone": self.network_zone,
            "severity": self.severity,
            "details": self.details,
            "path": self.path,
            "method": self.method,
            "timestamp": self.timestamp,
            "blocked": self.blocked,
            "sha256_fingerprint": self.sha256_fingerprint
        }

class CyberShieldEngine:
    def __init__(self):
        self.request_history: Dict[str, List[float]] = {}
        self.failed_logins: Dict[str, List[float]] = {}
        self.blocked_ips: Dict[str, dict] = self._load_persisted_blocked_ips()
        self.events: List[dict] = []
        self.stats = {
            "inspected_requests": 0,
            "thwarted_attacks": 0,
            "active_blocks": len(self.blocked_ips)
        }
        
        # Threat & Exploit Regex Signatures
        self.suspicious_path_patterns = [
            re.compile(r"(\.env|\.git|\.aws|\.svn)", re.IGNORECASE),
            re.compile(r"(wp-login|wp-admin|xmlrpc\.php)", re.IGNORECASE),
            re.compile(r"(phpmyadmin|pma|adminer|cgi-bin)", re.IGNORECASE),
            re.compile(r"(\.\./|\.\.\\)", re.IGNORECASE), # Path Traversal
            re.compile(r"(eval-stdin|invokefunction|\$\{jndi:)", re.IGNORECASE), # Log4j / RCE
            re.compile(r"(shell\.php|config\.json\.bak|backup\.sql)", re.IGNORECASE)
        ]
        
        self.sql_injection_patterns = [
            re.compile(r"(\bUNION\b.*\bSELECT\b)", re.IGNORECASE),
            re.compile(r"(/\*|\*/|--\s)", re.IGNORECASE),
            re.compile(r"(\bOR\b\s+['\"0-9]+\s*=\s*['\"0-9]+)", re.IGNORECASE),
            re.compile(r"(\bDROP\b\s+\bTABLE\b|\bINSERT\b\s+\bINTO\b)", re.IGNORECASE)
        ]

    def _load_persisted_blocked_ips(self) -> Dict[str, dict]:
        if os.path.exists(BLOCKED_IPS_FILE):
            try:
                with open(BLOCKED_IPS_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[CyberShield] Notice loading persisted blacklist: {e}")
        return {}

    def _save_persisted_blocked_ips(self):
        try:
            with open(BLOCKED_IPS_FILE, "w", encoding="utf-8") as f:
                json.dump(self.blocked_ips, f, indent=2)
        except Exception as e:
            print(f"[CyberShield] Notice saving blacklist: {e}")

    def _append_audit_trail(self, event_dict: dict):
        try:
            with open(AUDIT_LOG_FILE, "a", encoding="utf-8") as f:
                f.write(json.dumps(event_dict) + "\n")
        except Exception:
            pass

    def get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
            if ip:
                return ip
        client = request.client
        return client.host if client else "127.0.0.1"

    def record_event(self, event: CyberSecurityEvent, auto_block: bool = False, permanent: bool = False):
        if auto_block:
            event.blocked = True
            self.block_ip(event.ip, reason=f"{event.threat_type} ({event.mitre_id}): {event.details}", permanent=permanent)
        
        event_dict = event.to_dict()
        self.events.insert(0, event_dict)
        if len(self.events) > 300:
            self.events = self.events[:300]
        
        self.stats["thwarted_attacks"] += 1
        self._append_audit_trail(event_dict)

        # Broadcast via WebSocket asynchronously to connected security dashboards
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self._broadcast_threat(event_dict))
        except RuntimeError:
            try:
                asyncio.run(self._broadcast_threat(event_dict))
            except Exception:
                pass

    async def _broadcast_threat(self, event_dict: dict):
        try:
            ws_payload = {
                "type": "CYBER_THREAT",
                "behavior_type": f"CYBER_ATTACK: {event_dict['threat_type']}",
                "camera_id": f"FIREWALL ({event_dict['ip']})",
                "confidence": 0.99,
                "details": f"Attacker IP: {event_dict['ip']} | Vector: {event_dict['threat_type']} ({event_dict['mitre_id']}) | Path: {event_dict['path']}",
                "cyber_event": event_dict
            }
            await manager.broadcast(json.dumps(ws_payload))
        except Exception as e:
            print(f"[CyberShield WS Error] {e}")

    def block_ip(self, ip: str, reason: str = "Manual Security Intervention", permanent: bool = True):
        if ip in ("127.0.0.1", "localhost", "::1"):
            return False
        self.blocked_ips[ip] = {
            "ip": ip,
            "reason": reason,
            "network_zone": resolve_network_classification(ip),
            "blocked_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
            "permanent": permanent
        }
        self.stats["active_blocks"] = len(self.blocked_ips)
        self._save_persisted_blocked_ips()
        return True

    def unblock_ip(self, ip: str):
        if ip in self.blocked_ips:
            del self.blocked_ips[ip]
            self.stats["active_blocks"] = len(self.blocked_ips)
            self._save_persisted_blocked_ips()
            return True
        return False

    def is_blocked(self, ip: str) -> Optional[dict]:
        return self.blocked_ips.get(ip)

    def record_failed_login(self, ip: str, username: str):
        now = time.time()
        if ip not in self.failed_logins:
            self.failed_logins[ip] = []
        
        # Purge older than 5 minutes
        self.failed_logins[ip] = [t for t in self.failed_logins[ip] if now - t < 300]
        self.failed_logins[ip].append(now)

        attempts = len(self.failed_logins[ip])
        if attempts >= 5:
            event = CyberSecurityEvent(
                ip=ip,
                threat_type="BRUTE_FORCE_ATTACK",
                severity="CRITICAL",
                details=f"Exceeded 5 failed login attempts for account '{username}'. IP quarantined.",
                path="/api/auth/login",
                method="POST"
            )
            self.record_event(event, auto_block=True, permanent=False)
            return True
        return False

    def check_rate_limit(self, ip: str, limit_per_minute: int = 150) -> bool:
        now = time.time()
        if ip not in self.request_history:
            self.request_history[ip] = []
        
        # Keep only timestamps in last 60 seconds
        self.request_history[ip] = [t for t in self.request_history[ip] if now - t < 60]
        self.request_history[ip].append(now)

        if len(self.request_history[ip]) > limit_per_minute:
            return False
        return True

    def inspect_request(self, request: Request, ip: str) -> Optional[CyberSecurityEvent]:
        path = request.url.path
        method = request.method

        # 1. Path Traversal & Sensitive File Probes
        for pattern in self.suspicious_path_patterns:
            if pattern.search(path):
                threat_type = "PATH_TRAVERSAL" if ".." in path else "MALICIOUS_PROBE"
                return CyberSecurityEvent(
                    ip=ip,
                    threat_type=threat_type,
                    severity="HIGH",
                    details=f"Probing unauthorized target path: {path}",
                    path=path,
                    method=method
                )

        # 2. SQL Injection in query strings
        query_str = request.url.query
        if query_str:
            for pattern in self.sql_injection_patterns:
                if pattern.search(query_str):
                    return CyberSecurityEvent(
                        ip=ip,
                        threat_type="SQL_INJECTION",
                        severity="CRITICAL",
                        details=f"SQL injection syntax detected in query payload: {query_str[:80]}",
                        path=path,
                        method=method
                    )

        # 3. Malicious Automated Exploit User-Agents
        ua = request.headers.get("user-agent", "").lower()
        if any(bot in ua for bot in ["sqlmap", "nikto", "wpscan", "havij", "masscan", "zgrab"]):
            return CyberSecurityEvent(
                ip=ip,
                threat_type="SECURITY_SCANNER_BOT",
                severity="HIGH",
                details=f"Automated exploit scanner user-agent detected: {ua[:40]}",
                path=path,
                method=method
            )

        return None

cyber_shield = CyberShieldEngine()

class CyberShieldMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        cyber_shield.stats["inspected_requests"] += 1
        ip = cyber_shield.get_client_ip(request)

        # 1. Check if IP is in Blacklist
        block_info = cyber_shield.is_blocked(ip)
        if block_info:
            return JSONResponse(
                status_code=403,
                content={
                    "status": "BLOCKED",
                    "error": "Aethra Cyber Defense: Connection Quarantined",
                    "ip": ip,
                    "reason": block_info.get("reason", "Suspicious Activity")
                }
            )

        # 2. Inspect request pattern (SQL injection, probe paths, bots)
        threat = cyber_shield.inspect_request(request, ip)
        if threat:
            cyber_shield.record_event(threat, auto_block=True, permanent=False)
            return JSONResponse(
                status_code=403,
                content={
                    "status": "THREAT_BLOCKED",
                    "error": "Access Denied by Aethra Intrusion Prevention System",
                    "threat_type": threat.threat_type,
                    "mitre_id": threat.mitre_id,
                    "attacker_ip": ip,
                    "details": threat.details
                }
            )

        # 3. Rate limiting check (e.g. 30 for login, 200 for general)
        limit = 30 if "/auth/" in request.url.path else 200
        if not cyber_shield.check_rate_limit(ip, limit_per_minute=limit):
            rate_threat = CyberSecurityEvent(
                ip=ip,
                threat_type="RATE_LIMIT_EXCEEDED",
                severity="MEDIUM",
                details=f"Exceeded threshold of {limit} requests per minute.",
                path=request.url.path,
                method=request.method
            )
            cyber_shield.record_event(rate_threat, auto_block=False)
            return JSONResponse(
                status_code=429,
                content={
                    "status": "RATE_LIMITED",
                    "error": "Too Many Requests. Aethra Cyber Shield rate limit enforced.",
                    "ip": ip
                }
            )

        # 4. Proceed with application logic
        response = await call_next(request)

        # 5. Inject Modern Defense-in-Depth Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=(self)"
        response.headers["X-Cyber-Defense"] = "Aethra-Vision-IPS-Active"

        return response
