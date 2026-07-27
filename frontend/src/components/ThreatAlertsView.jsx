import React, { useState } from 'react'
import { ShieldAlert, Search, Filter, AlertTriangle, CheckCircle, Clock, Camera, Download } from 'lucide-react'

const MOCK_ALERTS = [
  { id: 'ALT-1092', camera: 'CAM-01 (Main Entrance Gate)', threat: 'Suspicious Crowd Gathering', level: 'WARNING', time: '11:14:02 PM', status: 'PENDING', confidence: '94%' },
  { id: 'ALT-1091', camera: 'CAM-03 (Loading Dock Area)', threat: 'Smoking / Fire Threat Detected', level: 'CRITICAL', time: '11:10:45 PM', status: 'ACKNOWLEDGED', confidence: '98%' },
  { id: 'ALT-1090', camera: 'CAM-02 (West Perimeter Fence)', threat: 'Fight / Physical Altercation', level: 'CRITICAL', time: '10:55:12 PM', status: 'RESOLVED', confidence: '96%' },
  { id: 'ALT-1089', camera: 'CAM-05 (North Parking Lot)', threat: 'Intrusion Line Crossing', level: 'WARNING', time: '10:40:18 PM', status: 'ACKNOWLEDGED', confidence: '91%' },
  { id: 'ALT-1088', camera: 'CAM-04 (VIP Corridor)', threat: 'Person Fall / Collapse Alert', level: 'CRITICAL', time: '09:22:05 PM', status: 'RESOLVED', confidence: '95%' },
  { id: 'ALT-1087', camera: 'CAM-01 (Main Entrance Gate)', threat: 'Unattended Baggage Detected', level: 'WARNING', time: '08:15:30 PM', status: 'RESOLVED', confidence: '89%' },
]

export default function ThreatAlertsView({ cameras }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLevel, setFilterLevel] = useState('ALL')
  const [alerts, setAlerts] = useState(MOCK_ALERTS)

  const handleAcknowledge = (id) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a)))
  }

  const filtered = alerts.filter((a) => {
    const matchesSearch = a.camera.toLowerCase().includes(searchTerm.toLowerCase()) || a.threat.toLowerCase().includes(searchTerm.toLowerCase()) || a.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterLevel === 'ALL' || a.level === filterLevel
    return matchesSearch && matchesFilter
  })

  return (
    <div className="flex-1 p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <ShieldAlert size={22} className="text-crimson-glow" />
            THREAT AUDIT &amp; INCIDENT LOGS
          </h1>
          <p className="font-mono text-xs text-gray-400 mt-1">
            Real-time AI Incident Repository &amp; Dispatch History
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-crimson-glow/15 border border-crimson-glow/40 text-crimson-glow text-xs font-mono font-bold">
            {alerts.filter(a => a.status === 'PENDING').length} PENDING ALERTS
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-xl px-3.5 h-11 focus-within:border-cyan-glow/50">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by threat, camera, or alert ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder:text-gray-500 outline-none font-mono"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="bg-[#12161D] border border-white/10 text-xs font-mono text-white rounded-xl px-3 h-11 outline-none"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="CRITICAL">CRITICAL ONLY</option>
            <option value="WARNING">WARNING ONLY</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/40 font-mono text-[10px] uppercase text-gray-400 tracking-wider">
                <th className="p-4">Alert ID</th>
                <th className="p-4">Node Location</th>
                <th className="p-4">Detected AI Threat</th>
                <th className="p-4">Risk Level</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Confidence</th>
                <th className="p-4">Status &amp; Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-cyan-glow font-bold">{item.id}</td>
                  <td className="p-4 text-white font-semibold">{item.camera}</td>
                  <td className="p-4 text-gray-200">{item.threat}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[9.5px] font-bold ${
                      item.level === 'CRITICAL'
                        ? 'bg-crimson-glow/20 border border-crimson-glow/50 text-crimson-glow'
                        : 'bg-amber-500/20 border border-amber-500/50 text-amber-400'
                    }`}>
                      {item.level}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 text-[11px]">{item.time}</td>
                  <td className="p-4 text-emerald-400 font-bold">{item.confidence}</td>
                  <td className="p-4">
                    {item.status === 'PENDING' ? (
                      <button
                        onClick={() => handleAcknowledge(item.id)}
                        className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 text-[10px] font-bold uppercase transition-all"
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <span className="text-gray-400 flex items-center gap-1 text-[10.5px]">
                        <CheckCircle size={13} className="text-emerald-400" />
                        {item.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
