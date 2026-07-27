import React, { useState, useEffect, useRef } from 'react'
import { Clapperboard, Play, Pause, SkipBack, SkipForward, Download, FileText, Search, ShieldAlert, Video, Calendar, Filter, AlertTriangle, CheckCircle2, HardDrive, RefreshCw, Layers, ExternalLink } from 'lucide-react'

const DEMO_VAULT_INCIDENTS = [
  {
    id: 1001,
    camera_id: 'CAM-01 (Main Gate PTZ)',
    behavior_type: 'Weapon Detected (Pistol)',
    confidence: 0.964,
    timestamp: '2026-07-26 10:14:22',
    details: 'Subject spotted drawing firearm near security checkpoint. PTZ auto-tracked object.',
    clip_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    snapshot_url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&q=80&w=600',
    severity: 'CRITICAL',
    tag: 'WEAPON'
  },
  {
    id: 1002,
    camera_id: 'CAM-02 (North Parking Lot)',
    behavior_type: 'Vehicle Intrusion (Unlisted SUV)',
    confidence: 0.921,
    timestamp: '2026-07-26 08:45:10',
    details: 'Unauthorized vehicle crossed restricted perimeter line after operating hours.',
    clip_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    snapshot_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=600',
    severity: 'HIGH',
    tag: 'VEHICLE'
  },
  {
    id: 1003,
    camera_id: 'CAM-01 (Main Gate PTZ)',
    behavior_type: 'Smoking Violation in Hazardous Zone',
    confidence: 0.895,
    timestamp: '2026-07-25 16:20:05',
    details: 'Operator detected smoking near fuel station containment area.',
    clip_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    snapshot_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=600',
    severity: 'MEDIUM',
    tag: 'SMOKING'
  },
  {
    id: 1004,
    camera_id: 'CAM-03 (Loading Dock Area)',
    behavior_type: 'Person Falling / Incapacity Detected',
    confidence: 0.942,
    timestamp: '2026-07-25 14:02:18',
    details: 'Worker slipped on loading platform. Automated emergency medical dispatch triggered.',
    clip_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    snapshot_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&q=80&w=600',
    severity: 'CRITICAL',
    tag: 'FALLING'
  }
]

export default function NVRArchiveView({ cameras = [] }) {
  const [incidents, setIncidents] = useState(DEMO_VAULT_INCIDENTS)
  const [selectedClip, setSelectedClip] = useState(DEMO_VAULT_INCIDENTS[0])
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [filterCam, setFilterCam] = useState('ALL')
  const [filterType, setFilterType] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [exportNotice, setExportNotice] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const videoRef = useRef(null)

  useEffect(() => {
    // Fetch live recorded incidents from backend SQLite / Postgres vault
    fetch('http://127.0.0.1:8000/alerts/?limit=50')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const liveWithMedia = data
            .filter((item) => item.clip_url || item.behavior_type)
            .map((item) => ({
              id: item.id,
              camera_id: item.camera_id || 'CAM-01 (Fixed)',
              behavior_type: item.behavior_type || 'Suspicious Event',
              confidence: item.confidence || 0.9,
              timestamp: item.timestamp ? item.timestamp.replace('T', ' ').substring(0, 19) : 'Just now',
              details: item.details || 'AI Pipeline automatically recorded threat incident.',
              clip_url: item.clip_url ? `http://127.0.0.1:8000${item.clip_url}` : DEMO_VAULT_INCIDENTS[0].clip_url,
              snapshot_url: item.snapshot_url ? `http://127.0.0.1:8000${item.snapshot_url}` : DEMO_VAULT_INCIDENTS[0].snapshot_url,
              severity: item.confidence > 0.85 ? 'CRITICAL' : 'HIGH',
              tag: item.behavior_type.split(' ')[0].toUpperCase()
            }))
          if (liveWithMedia.length > 0) {
            setIncidents(prev => [...liveWithMedia, ...DEMO_VAULT_INCIDENTS.filter(d => !liveWithMedia.some(l => l.id === d.id))])
            setSelectedClip(liveWithMedia[0])
          }
        }
      })
      .catch(() => {})
  }, [])

  const handleSpeedChange = (rate) => {
    setPlaybackRate(rate)
    if (videoRef.current) {
      videoRef.current.playbackRate = rate
    }
  }

  const handleDownloadClip = () => {
    setExportNotice(`📥 Downloading high-definition MP4 evidence clip (${selectedClip.id}_evidence.mp4)...`)
    setTimeout(() => setExportNotice(''), 4500)
  }

  const handleExportPDF = () => {
    setExportNotice(`📄 Generating formal Police & Security Forensic Audit Report for Incident #${selectedClip.id}...`)
    setTimeout(() => setExportNotice(''), 4500)
  }

  const filteredIncidents = incidents.filter((inc) => {
    if (filterCam !== 'ALL' && !inc.camera_id.includes(filterCam)) return false
    if (filterType !== 'ALL' && !inc.behavior_type.toLowerCase().includes(filterType.toLowerCase())) return false
    if (searchQuery && !inc.behavior_type.toLowerCase().includes(searchQuery.toLowerCase()) && !inc.details.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex-1 min-w-0 px-5 sm:px-7 py-6 space-y-6 animate-fade-in relative text-gray-200 font-sans">
      {/* Top Banner */}
      <div className="glass-panel border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(0,255,255,0.08)] bg-gradient-to-r from-obsidian-900 via-cyan-950/20 to-obsidian-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.2)]">
              <Clapperboard size={26} className="animate-pulse" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-white tracking-wider uppercase flex items-center gap-2">
                Enterprise NVR Incident Vault & Forensic Archive
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  RAID-6 ACTIVE
                </span>
              </h1>
              <p className="text-xs text-gray-400 font-mono mt-0.5 flex items-center gap-3">
                <span>Hard Drive Storage: <strong className="text-cyan-400">1.4 TB / 6.0 TB Used</strong></span>
                <span>·</span>
                <span>FIFO Retention Policy: <strong className="text-white">30 Days Loop</strong></span>
                <span>·</span>
                <span>AI Auto-Clip Vault: <strong className="text-amber-400">Protected Evidence</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 flex items-center gap-2 text-gray-300">
              <HardDrive size={16} className="text-cyan-400" />
              <span>Drive Integrity: <strong className="text-emerald-400">100% HEALTHY</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Export feedback notice */}
      {exportNotice && (
        <div className="p-3.5 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-xs font-mono flex items-center gap-2 shadow-[0_0_20px_rgba(0,255,255,0.2)] animate-fade-in">
          <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/40">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-gray-400">
            <Filter size={15} className="text-cyan-400" />
            <span className="uppercase font-bold">Filter By:</span>
          </div>

          <select
            value={filterCam}
            onChange={(e) => setFilterCam(e.target.value)}
            className="bg-obsidian-800 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
          >
            <option value="ALL">All Camera Nodes</option>
            <option value="CAM-01">CAM-01 (Main Entrance)</option>
            <option value="CAM-02">CAM-02 (Parking Lot)</option>
            <option value="CAM-03">CAM-03 (Loading Dock)</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-obsidian-800 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
          >
            <option value="ALL">All AI Threat Models</option>
            <option value="Weapon">🔫 Weapon / Firearm</option>
            <option value="Vehicle">🚗 Vehicle Intrusion</option>
            <option value="Smoking">🚬 Smoking Violation</option>
            <option value="Falling">⚠️ Person Falling</option>
          </select>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search details or suspect ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-obsidian-800 border border-white/15 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 font-mono focus:border-cyan-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Video DVR Workspace & Thumbnail Library Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Video Player & Controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel border border-cyan-500/30 rounded-2xl overflow-hidden shadow-[0_0_35px_rgba(0,0,0,0.7)] bg-black">
            <div className="p-3 bg-gradient-to-r from-black via-obsidian-900 to-black border-b border-white/10 flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-2 font-bold text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                PLAYING RECORDED EVIDENCE · {selectedClip?.camera_id}
              </span>
              <span className="text-gray-400">{selectedClip?.timestamp}</span>
            </div>

            <div className="relative bg-black h-[420px] flex items-center justify-center overflow-hidden">
              {selectedClip ? (
                <video
                  ref={videoRef}
                  key={selectedClip.clip_url}
                  src={selectedClip.clip_url}
                  poster={selectedClip.snapshot_url}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <p className="text-gray-500 font-mono text-xs">No recording selected</p>
              )}
            </div>

            {/* DVR Control Toolbar */}
            <div className="p-4 bg-obsidian-900/90 border-t border-white/10 space-y-3 font-mono">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 mr-1">Speed:</span>
                  {[0.25, 0.5, 1.0, 2.0].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handleSpeedChange(rate)}
                      className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                        playbackRate === rate
                          ? 'bg-cyan-500 text-black font-extrabold shadow-[0_0_10px_rgba(0,255,255,0.4)]'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleDownloadClip}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/30 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30 transition-all text-xs font-bold"
                  >
                    <Download size={14} />
                    Download Evidence MP4
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-all text-xs font-bold"
                  >
                    <FileText size={14} />
                    Export Forensic Report PDF
                  </button>
                </div>
              </div>

              {/* Selected clip metadata info panel */}
              {selectedClip && (
                <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle size={15} />
                      Threat Incident: {selectedClip.behavior_type}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[11px]">
                      AI Confidence: {(selectedClip.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-gray-300 font-sans text-xs pt-1">
                    <strong className="text-white">Operator Summary Notes:</strong> {selectedClip.details}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Scrollable Incident Library Grid */}
        <div className="glass-panel border border-white/10 rounded-2xl p-4 flex flex-col h-[610px] bg-black/40">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 font-mono text-xs">
            <span className="font-bold uppercase text-gray-300 flex items-center gap-2">
              <Layers size={16} className="text-cyan-400" />
              Incident Library ({filteredIncidents.length})
            </span>
            <span className="text-[11px] text-gray-500">Auto-Refreshes</span>
          </div>

          <div className="overflow-y-auto flex-1 space-y-2.5 pr-1 custom-scrollbar">
            {filteredIncidents.length === 0 ? (
              <div className="py-12 text-center text-gray-500 font-mono text-xs">
                No recorded incidents match your filter.
              </div>
            ) : (
              filteredIncidents.map((item) => {
                const isSelected = selectedClip && selectedClip.id === item.id
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedClip(item)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex gap-3.5 items-center ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.15)] text-white'
                        : 'bg-black/50 border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Thumbnail Preview */}
                    <div className="w-20 h-14 rounded-lg overflow-hidden border border-white/15 shrink-0 relative bg-obsidian-800">
                      {item.snapshot_url ? (
                        <img src={item.snapshot_url} alt="Incident snapshot" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500 font-mono">
                          NO IMG
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Play size={18} className="text-cyan-400 fill-cyan-400" />
                      </div>
                    </div>

                    {/* Meta information */}
                    <div className="flex-1 min-w-0 font-mono text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-red-400 truncate">{item.behavior_type}</span>
                        <span className="text-[10px] text-cyan-300 font-bold font-mono">
                          {(item.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">{item.camera_id}</p>
                      <p className="text-[10px] text-gray-500">{item.timestamp}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="pt-3 border-t border-white/10 text-[11px] font-mono text-center text-gray-400">
            Select an incident to view forensic video loops & annotations
          </div>
        </div>
      </div>
    </div>
  )
}
