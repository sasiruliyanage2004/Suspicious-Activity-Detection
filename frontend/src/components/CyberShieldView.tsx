import React, { useState, useEffect } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  Ban,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Activity,
  Zap,
  Globe,
  Lock,
  Search,
  Copy,
  ExternalLink,
  Flame
} from 'lucide-react'
import { safeFetch, BACKEND_URL } from '../utils/api'

interface CyberEvent {
  id: string
  ip: string
  threat_type: string
  severity: string
  details: string
  path: string
  method: string
  timestamp: string
  blocked: boolean
}

interface BlockedIP {
  ip: string
  reason: string
  blocked_at: string
  permanent: boolean
}

export default function CyberShieldView() {
  const [stats, setStats] = useState({
    status: 'OPERATIONAL',
    inspected_requests: 0,
    thwarted_attacks: 0,
    active_blocks: 0
  })
  const [events, setEvents] = useState<CyberEvent[]>([])
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [manualIP, setManualIP] = useState('')
  const [manualReason, setManualReason] = useState('Manual Security Intervention')
  const [actionNotice, setActionNotice] = useState('')
  const [simulating, setSimulating] = useState(false)

  const flashNotice = (msg: string) => {
    setActionNotice(msg)
    setTimeout(() => setActionNotice(''), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [resStats, resEvents, resBlocked] = await Promise.all([
        safeFetch(`${BACKEND_URL}/api/security/stats`, {}, 2500).then(r => r.json()).catch(() => null),
        safeFetch(`${BACKEND_URL}/api/security/events?limit=50`, {}, 2500).then(r => r.json()).catch(() => []),
        safeFetch(`${BACKEND_URL}/api/security/blocked_ips`, {}, 2500).then(r => r.json()).catch(() => [])
      ])

      if (resStats) setStats(resStats)
      if (Array.isArray(resEvents)) setEvents(resEvents)
      if (Array.isArray(resBlocked)) setBlockedIPs(resBlocked)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 8000)
    return () => clearInterval(interval)
  }, [])

  const handleBlockIP = async (ipToBlock: string, reason: string) => {
    try {
      const res = await safeFetch(`${BACKEND_URL}/api/security/block_ip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: ipToBlock, reason })
      })
      if (res.ok) {
        flashNotice(`🔒 IP ${ipToBlock} successfully quarantined and blacklisted.`)
        loadData()
      }
    } catch (e) {
      flashNotice(`Error blocking IP: ${e}`)
    }
  }

  const handleUnblockIP = async (ipToUnblock: string) => {
    try {
      const res = await safeFetch(`${BACKEND_URL}/api/security/unblock_ip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: ipToUnblock })
      })
      if (res.ok) {
        flashNotice(`🔓 IP ${ipToUnblock} released from quarantine.`)
        loadData()
      }
    } catch (e) {
      flashNotice(`Error unblocking IP: ${e}`)
    }
  }

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualIP.trim()) return
    handleBlockIP(manualIP.trim(), manualReason.trim() || 'Manual Operator Blacklist')
    setManualIP('')
  }

  const handleSimulateAttack = async (threatType: string) => {
    setSimulating(true)
    try {
      const randomIP = `192.168.1.${Math.floor(100 + Math.random() * 150)}`
      const res = await safeFetch(`${BACKEND_URL}/api/security/simulate_attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threat_type: threatType, attacker_ip: randomIP })
      })
      if (res.ok) {
        flashNotice(`🚨 Cyber attack simulation '${threatType}' dispatched from ${randomIP}. Alert broadcasted!`)
        loadData()
      }
    } catch (e) {
      flashNotice(`Simulation bypassed: ${e}`)
    } finally {
      setSimulating(false)
    }
  }

  const filteredEvents = events.filter(ev => {
    const term = searchTerm.toLowerCase()
    return !term || ev.ip.toLowerCase().includes(term) || ev.threat_type.toLowerCase().includes(term) || ev.details.toLowerCase().includes(term)
  })

  return (
    <div className="flex-1 min-w-0 p-6 space-y-6 overflow-y-auto custom-scrollbar font-sans text-gray-200 animate-fade-in">
      {/* ── Top Header Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-red-950/40 via-obsidian-900 to-obsidian-950 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.15)] relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(circle_at_right,rgba(239,68,68,0.15),transparent_70%)] pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-14 w-14 rounded-2xl bg-red-500/20 border border-red-500/40 grid place-items-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            <ShieldAlert size={28} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-display font-black tracking-wider uppercase text-white">
                Aethra Cyber-Shield &amp; Intrusion Prevention System
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                ACTIVE FIREWALL
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1">
              Real-time Layer-7 Web Application Firewall (WAF), Brute-Force Quarantiner &amp; IP Threat Tracker
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 font-mono text-xs border border-white/10 transition-all cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Sync Firewall</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2 animate-fade-in shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <Zap size={14} className="text-cyan-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* ── Metrics Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 grid place-items-center shrink-0">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-gray-400 tracking-wider">Inspected Packets</p>
            <p className="text-lg font-mono font-bold text-white">{stats.inspected_requests.toLocaleString()}</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-red-500/30 flex items-center gap-3.5 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
          <div className="h-10 w-10 rounded-xl bg-red-500/20 text-red-400 grid place-items-center shrink-0">
            <Flame size={20} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-red-300 tracking-wider">Attacks Neutralized</p>
            <p className="text-lg font-mono font-bold text-red-400">{stats.thwarted_attacks.toLocaleString()}</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 flex items-center gap-3.5 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 grid place-items-center shrink-0">
            <Ban size={20} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-amber-300 tracking-wider">Quarantined IPs</p>
            <p className="text-lg font-mono font-bold text-amber-400">{blockedIPs.length}</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/30 flex items-center gap-3.5 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 grid place-items-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-emerald-300 tracking-wider">Armor Integrity</p>
            <p className="text-lg font-mono font-bold text-emerald-400">100% MAXIMUM</p>
          </div>
        </div>
      </div>

      {/* ── Attack Simulation & Testing Strip ── */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-mono text-gray-300">
          <Terminal size={16} className="text-cyan-400" />
          <span>Interactive Defense Drill (Simulate Attack to verify Real-Time Siren &amp; IP Quarantining):</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSimulateAttack('BRUTE_FORCE')}
            disabled={simulating}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-mono font-semibold transition-all cursor-pointer"
          >
            💥 Test Brute Force
          </button>
          <button
            onClick={() => handleSimulateAttack('SQL_INJECTION')}
            disabled={simulating}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-mono font-semibold transition-all cursor-pointer"
          >
            💉 Test SQL Injection
          </button>
          <button
            onClick={() => handleSimulateAttack('MALICIOUS_PROBE')}
            disabled={simulating}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-mono font-semibold transition-all cursor-pointer"
          >
            🔍 Test .env Probe
          </button>
          <button
            onClick={() => handleSimulateAttack('DDOS_BURST')}
            disabled={simulating}
            className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-mono font-semibold transition-all cursor-pointer"
          >
            🌊 Test Rate Flood
          </button>
        </div>
      </div>

      {/* ── Two Column Layout: Real-Time Cyber Incident Feed & IP Blacklist ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Cyber Incident Logs (2 cols) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl border border-white/10 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-red-400" />
              <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                Live Cyber Threat &amp; Incident Log
              </h2>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Filter by IP or Threat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black/60 text-white font-mono text-xs pl-8 pr-3 py-1.5 rounded-lg border border-white/10 outline-none focus:border-red-400/50 w-56"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-[11px] uppercase tracking-wider">
                  <th className="pb-3 pl-2">Attacker IP</th>
                  <th className="pb-3">Threat Vector</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3">Details / Target Path</th>
                  <th className="pb-3">Time</th>
                  <th className="pb-3 text-right pr-2">Firewall Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No active cyber security threats detected. Perimeter secure.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((ev) => {
                    const isAlreadyBlocked = blockedIPs.some(b => b.ip === ev.ip)
                    return (
                      <tr key={ev.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pl-2 font-bold text-red-400 whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <Globe size={13} className="text-red-400/60" />
                            {ev.ip}
                          </span>
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 border border-white/10 text-gray-300">
                            {ev.threat_type}
                          </span>
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ev.severity === 'CRITICAL'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : ev.severity === 'HIGH'
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          }`}>
                            {ev.severity}
                          </span>
                        </td>
                        <td className="py-3 text-gray-400 text-[11px] max-w-xs truncate" title={ev.details}>
                          {ev.details}
                        </td>
                        <td className="py-3 text-gray-500 text-[10px] whitespace-nowrap">
                          {ev.timestamp}
                        </td>
                        <td className="py-3 text-right pr-2 whitespace-nowrap">
                          {isAlreadyBlocked ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                              QUARANTINED
                            </span>
                          ) : (
                            <button
                              onClick={() => handleBlockIP(ev.ip, `Blocked from Threat Log: ${ev.threat_type}`)}
                              className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-bold border border-red-500/40 transition-all cursor-pointer"
                            >
                              BLOCK IP
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Quarantined IPs & Manual Blacklist (1 col) */}
        <div className="space-y-6">
          {/* Manual Add Form */}
          <div className="glass-panel rounded-2xl border border-white/10 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Ban size={16} className="text-amber-400" />
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                Add IP to Blacklist
              </h3>
            </div>
            <form onSubmit={handleManualAdd} className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-gray-400 uppercase">Target IPv4 Address</label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.150"
                  value={manualIP}
                  onChange={(e) => setManualIP(e.target.value)}
                  className="w-full mt-1 bg-black/60 text-white font-mono text-xs px-3 py-2 rounded-lg border border-white/10 outline-none focus:border-red-400/60"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-gray-400 uppercase">Quarantine Reason</label>
                <input
                  type="text"
                  placeholder="Reason for blocking..."
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full mt-1 bg-black/60 text-white font-mono text-xs px-3 py-2 rounded-lg border border-white/10 outline-none focus:border-red-400/60"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] cursor-pointer"
              >
                Quarantine IP Address
              </button>
            </form>
          </div>

          {/* Quarantined IP List */}
          <div className="glass-panel rounded-2xl border border-white/10 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-red-400" />
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                  Quarantined IP Pool ({blockedIPs.length})
                </h3>
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
              {blockedIPs.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-4 font-mono">
                  No active IP bans. All network nodes permitted.
                </p>
              ) : (
                blockedIPs.map((b) => (
                  <div
                    key={b.ip}
                    className="p-3 rounded-xl bg-black/40 border border-red-500/20 flex items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div>
                      <p className="font-bold text-red-400">{b.ip}</p>
                      <p className="text-[10px] text-gray-400 truncate max-w-[180px]">{b.reason}</p>
                      <p className="text-[9px] text-gray-500">{b.blocked_at}</p>
                    </div>
                    <button
                      onClick={() => handleUnblockIP(b.ip)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap"
                    >
                      UNBLOCK
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
