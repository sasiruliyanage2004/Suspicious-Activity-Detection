import time
import json
import re
import asyncio
from typing import Dict, List, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from core.ws_manager import manager

class CyberSecurityEvent:
    def __init__(self, ip: str, threat_type: str, severity: str, details: str, path: str, method: str):
        self.id = f"CYB-{int(time.time() * 1000)}"
        self.ip = ip
        self.threat_type = threat_type # e.g., 'BRUTE_FORCE', 'MALICIOUS_SCAN', 'SQL_INJECTION', 'PATH_TRAVERSAL', 'RATE_LIMIT_EXCEEDED'
        self.severity = severity       # 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
        self.details = details
        self.path = path
        self.method = method
        self.timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        self.timestamp_epoch = time.time()
        self.blocked = False

    def to_dict(self):
        return {
            "id": self.id,
            "ip": self.ip,
            "threat_type": self.threat_type,
            "severity": self.severity,
            "details": self.details,
            "path": self.path,
            "method": self.method,
            "timestamp": self.timestamp,
            "blocked": self.blocked
        }

class CyberShieldEngine:
    def __init__(self):
        # In-memory IP tracking
        self.request_history: Dict[str, List[float]] = {}
        self.failed_logins: Dict[str, List[float]] = {}
        self.blocked_ips: Dict[str, dict] = {} # ip -> {reason, blocked_at, permanent}
        self.events: List[dict] = []
        self.stats = {
            "inspected_requests": 0,
            "thwarted_attacks": 0,
            "active_blocks": 0
        }
        
        # Suspicious exploit and vulnerability scan signatures
        self.suspicious_path_patterns = [
            re.compile(r"(\.env|\.git|\.aws|\.svn)", re.IGNORECASE),
            re.compile(r"(wp-login|wp-admin|xmlrpc\.php)", re.IGNORECASE),
            re.compile(r"(phpmyadmin|pma|adminer|cgi-bin)", re.IGNORECASE),
            re.compile(r"(\.\./|\.\.\\)", re.IGNORECASE), # directory traversal
            re.compile(r"(eval-stdin|invokefunction|\$\{jndi:)", re.IGNORECASE), # log4j & RCE
            re.compile(r"(shell\.php|config\.json\.bak|backup\.sql)", re.IGNORECASE)
        ]
        
        self.sql_injection_patterns = [
            re.compile(r"(\bUNION\b.*\bSELECT\b)", re.IGNORECASE),
            re.compile(r"(/\*|\*/|--\s)", re.IGNORECASE),
            re.compile(r"(\bOR\b\s+['\"0-9]+\s*=\s*['\"0-9]+)", re.IGNORECASE),
            re.compile(r"(\bDROP\b\s+\bTABLE\b|\bINSERT\b\s+\bINTO\b)", re.IGNORECASE)
        ]

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
            self.block_ip(event.ip, reason=f"{event.threat_type}: {event.details}", permanent=permanent)
        
        event_dict = event.to_dict()
        self.events.insert(0, event_dict)
        if len(self.events) > 300:
            self.events = self.events[:300]
        
        self.stats["thwarted_attacks"] += 1

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
                "details": f"Attacker IP: {event_dict['ip']} | Vector: {event_dict['threat_type']} | Path: {event_dict['path']}",
                "cyber_event": event_dict
            }
            await manager.broadcast(json.dumps(ws_payload))
        except Exception as e:
            print(f"[CyberShield WS Error] {e}")

    def block_ip(self, ip: str, reason: str = "Manual Admin Block", permanent: bool = True):
        # Prevent blocking loopback
        if ip in ("127.0.0.1", "localhost", "::1"):
            return False
        self.blocked_ips[ip] = {
            "ip": ip,
            "reason": reason,
            "blocked_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
            "permanent": permanent
        }
        self.stats["active_blocks"] = len(self.blocked_ips)
        return True

    def unblock_ip(self, ip: str):
        if ip in self.blocked_ips:
            del self.blocked_ips[ip]
            self.stats["active_blocks"] = len(self.blocked_ips)
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
        url_str = str(request.url)
        path = request.url.path
        method = request.method

        # 1. Check path against malicious scan patterns
        for pattern in self.suspicious_path_patterns:
            if pattern.search(path):
                return CyberSecurityEvent(
                    ip=ip,
                    threat_type="MALICIOUS_PROBE",
                    severity="HIGH",
                    details=f"Probing unauthorized/sensitive vulnerability target path: {path}",
                    path=path,
                    method=method
                )

        # 2. Check query params for SQL Injection
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

        # 3. Check for malicious user-agents (e.g. sqlmap, nikto, wpscan)
        ua = request.headers.get("user-agent", "").lower()
        if any(bot in ua for bot in ["sqlmap", "nikto", "wpscan", "havij", "masscan"]):
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

        # 1. Check if IP is already in Blacklist
        block_info = cyber_shield.is_blocked(ip)
        if block_info:
            return JSONResponse(
                status_code=403,
                content={
                    "status": "BLOCKED",
                    "error": "Aethra Cyber Defense: Connection Terminated",
                    "ip": ip,
                    "reason": block_info.get("reason", "Suspicious Activity")
                }
            )

        # 2. Inspect request pattern (SQL injection, probe paths, bots)
        threat = cyber_shield.inspect_request(request, ip)
        if threat:
            # Auto-block critical scanner or probe
            cyber_shield.record_event(threat, auto_block=True, permanent=False)
            return JSONResponse(
                status_code=403,
                content={
                    "status": "THREAT_BLOCKED",
                    "error": "Access Denied by Aethra Intrusion Prevention System",
                    "threat_type": threat.threat_type,
                    "attacker_ip": ip,
                    "details": threat.details
                }
            )

        # 3. Rate limiting check (e.g. 150 req/min for general routes, 30 for login)
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

        # 5. Inject Modern Security Hardening Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Cyber-Defense"] = "Aethra-Vision-IPS-Active"

        return response
