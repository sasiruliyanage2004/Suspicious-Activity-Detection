from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from core.cyber_shield import cyber_shield, CyberSecurityEvent

router = APIRouter(prefix="/api/security", tags=["Cyber Defense"])

class BlockIPRequest(BaseModel):
    ip: str
    reason: Optional[str] = "Manual Security Intervention"

class UnblockIPRequest(BaseModel):
    ip: str

class SimulateAttackRequest(BaseModel):
    threat_type: str # 'BRUTE_FORCE', 'SQL_INJECTION', 'MALICIOUS_PROBE', 'DDOS_BURST'
    attacker_ip: Optional[str] = "192.168.1.189"

@router.get("/stats")
def get_security_stats():
    """Returns real-time firewall & cyber defense telemetry."""
    return {
        "status": "OPERATIONAL",
        "inspected_requests": cyber_shield.stats["inspected_requests"],
        "thwarted_attacks": cyber_shield.stats["thwarted_attacks"],
        "active_blocks": len(cyber_shield.blocked_ips),
        "recent_events_count": len(cyber_shield.events)
    }

@router.get("/events")
def get_security_events(limit: int = 50):
    """Returns recent cyber threat incidents and logs."""
    return cyber_shield.events[:limit]

@router.get("/blocked_ips")
def get_blocked_ips():
    """Returns currently blacklisted / quarantined IP addresses."""
    return list(cyber_shield.blocked_ips.values())

@router.post("/block_ip")
def block_ip(req: BlockIPRequest):
    """Manually add an IP address to the Cyber Shield blacklist."""
    success = cyber_shield.block_ip(req.ip, reason=req.reason, permanent=True)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot block protected loopback IP.")
    return {"status": "SUCCESS", "message": f"IP {req.ip} has been quarantined.", "ip": req.ip}

@router.post("/unblock_ip")
def unblock_ip(req: UnblockIPRequest):
    """Manually unblock an IP address from the blacklist."""
    success = cyber_shield.unblock_ip(req.ip)
    if not success:
        raise HTTPException(status_code=404, detail=f"IP {req.ip} is not currently blocked.")
    return {"status": "SUCCESS", "message": f"IP {req.ip} has been released from quarantine.", "ip": req.ip}

@router.post("/simulate_attack")
def simulate_attack(req: SimulateAttackRequest):
    """Allows security administrator to test live intrusion detection & broadcast notification."""
    threat_map = {
        "BRUTE_FORCE": ("BRUTE_FORCE_ATTACK", "CRITICAL", f"Automated dictionary credential cracking burst on /api/auth/login", "/api/auth/login"),
        "SQL_INJECTION": ("SQL_INJECTION", "CRITICAL", f"SQL payload 'UNION SELECT username, password FROM users' neutralized", "/api/alerts/export"),
        "MALICIOUS_PROBE": ("MALICIOUS_PROBE", "HIGH", f"Exploit scanner scanning for exposed .env credentials file", "/.env"),
        "DDOS_BURST": ("RATE_LIMIT_EXCEEDED", "MEDIUM", f"High-frequency request flooding (320 req/sec) throttled", "/api/system/health")
    }
    
    t_type, sev, details, path = threat_map.get(
        req.threat_type, 
        ("CYBER_ANOMALY", "MEDIUM", "Unauthorized reconnaissance attempt detected", "/admin")
    )
    
    event = CyberSecurityEvent(
        ip=req.attacker_ip,
        threat_type=t_type,
        severity=sev,
        details=details,
        path=path,
        method="POST"
    )
    
    cyber_shield.record_event(event, auto_block=(sev == "CRITICAL"))
    return {
        "status": "SIMULATED",
        "message": f"Cyber threat {t_type} triggered. Real-time alert dispatched to Command Center.",
        "event": event.to_dict()
    }
