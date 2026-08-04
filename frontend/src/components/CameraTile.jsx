import React, { useState, memo } from 'react'
import { Pencil, Check, TriangleAlert, Video, Radio, Activity, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Crosshair } from 'lucide-react'

function FeedBackdrop({ seed = 0, cameraCode, location }) {
  const hue = (seed * 47) % 360
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0A0D14] transform-gpu">
      {/* Decorative gradient & CCTV grid */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 100% at ${20 + (seed * 13) % 60}% ${10 + (seed * 9) % 40}%, hsla(${hue},45%,18%,0.4), transparent 60%), linear-gradient(160deg, #07090E 0%, #121722 100%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.1]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="absolute inset-0 opacity-[0.05] bg-gradient-to-b from-transparent via-cyan-glow to-transparent animate-scan" />

      {/* Live Tactical HUD Standby Screen */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-4">
        <div className="h-9 w-9 rounded-full bg-cyan-glow/10 border border-cyan-glow/30 flex items-center justify-center text-cyan-glow shadow-[0_0_15px_rgba(14,165,233,0.2)]">
          <Activity size={16} className="animate-pulse" />
        </div>
        <div className="space-y-0.5">
          <p className="font-mono text-xs font-bold text-white tracking-widest uppercase">
            {cameraCode} · SEARCHING STREAM
          </p>
          <p className="font-mono text-[9.5px] text-cyan-glow/70 font-semibold tracking-wider">
            {location}
          </p>
        </div>
        <span className="font-mono text-[8.5px] text-gray-500 uppercase tracking-widest mt-1 bg-black/40 px-2.5 py-1 rounded-full border border-white/5">
          Connecting to AI Feed Server (Port 8002)
        </span>
      </div>
    </div>
  )
}

function AttributeBadge({ x, y, label }) {
  return (
    <div
      className="absolute hud-badge bg-cyan-glow/90 text-obsidian-950 font-semibold shadow-glow-cyan-sm"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {label}
    </div>
  )
}

function ThreatBadge({ x, y, label }) {
  return (
    <div
      className="absolute hud-badge bg-crimson-glow text-white font-semibold flex items-center gap-1 animate-pulse-glow"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <TriangleAlert size={11} /> {label}
    </div>
  )
}

function CameraTileComponent({ camera, index, personCount = 0, onExpand, onRename, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(camera.location)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [filterMode, setFilterMode] = useState('normal') // 'normal' | 'ir_green' | 'thermal'

  const handlePTZ = (e, direction) => {
    e.stopPropagation()
    if (!camera?.code) return
    fetch(`http://127.0.0.1:8002/api/cameras/${camera.code}/ptz_control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction })
    }).catch(() => {})
  }

  const handlePTZHome = (e) => {
    e.stopPropagation()
    if (!camera?.code) return
    fetch(`http://127.0.0.1:8002/api/cameras/${camera.code}/ptz_home`, {
      method: 'POST'
    }).catch(() => {})
  }

  const commitRename = () => {
    onRename?.(camera.id, draft.trim() || camera.location)
    setEditing(false)
  }

  // ── Auto Reconnect MJPEG Stream on Packet Drop (Never Permanently Kills Stream) ──
  const handleStreamError = (e) => {
    setIsReconnecting(true)
    const target = e.target
    setTimeout(() => {
      if (target && camera.streamUrl) {
        target.src = `${camera.streamUrl}?t=${Date.now()}`
        setIsReconnecting(false)
      }
    }, 1200)
  }

  const cycleFilter = (e) => {
    e.stopPropagation()
    if (filterMode === 'normal') setFilterMode('ir_green')
    else if (filterMode === 'ir_green') setFilterMode('thermal')
    else setFilterMode('normal')
  }

  // Generate dynamic vision styles
  let imgFilterStyle = {}
  if (filterMode === 'ir_green') {
    imgFilterStyle = { filter: 'sepia(100%) hue-rotate(75deg) brightness(1.35) contrast(1.45) saturate(2)' }
  } else if (filterMode === 'thermal') {
    imgFilterStyle = { filter: 'invert(95%) hue-rotate(185deg) brightness(1.3) contrast(1.6) saturate(3)' }
  }

  return (
    <div
      className="group relative aspect-video rounded-2xl overflow-hidden ring-1 ring-white/[0.08] hover:ring-cyan-400/50 transition-all cursor-pointer shadow-glass bg-[#0A0D14] transform-gpu will-change-transform"
      onClick={() => !editing && onExpand?.(camera)}
    >
      {camera.streamUrl ? (
        <img
          src={camera.streamUrl}
          alt={camera.location}
          style={imgFilterStyle}
          className="absolute inset-0 w-full h-full object-cover transform-gpu transition-all duration-300"
          onError={handleStreamError}
        />
      ) : (
        <FeedBackdrop seed={index} cameraCode={camera.code} location={camera.location} />
      )}

      {/* Night Vision / Thermal Scan Overlay Texture when active */}
      {filterMode === 'ir_green' && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,100,0.1)_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none z-10 animate-pulse" />
      )}
      {filterMode === 'thermal' && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,50,0,0.15)_0%,rgba(0,0,50,0.5)_100%)] pointer-events-none z-10" />
      )}

      {/* Top-left camera ID & Vision Mode Badge */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-20">
        <div className="flex items-center gap-1.5 hud-badge bg-black/80 backdrop-blur-md text-white border border-white/15 font-mono text-[10px] font-bold shadow-sm">
          <Video size={11} className="text-cyan-400" />
          {camera.code}
        </div>

        {/* Vision Toggle Button */}
        <button
          onClick={cycleFilter}
          title="Click to switch Night Vision IR & Thermal Heatmap Mode"
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase border transition-all shadow-md ${
            filterMode === 'ir_green'
              ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
              : filterMode === 'thermal'
              ? 'bg-red-500/30 text-amber-300 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
              : 'bg-black/60 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          {filterMode === 'normal' && <span>⚡ RGB NORMAL</span>}
          {filterMode === 'ir_green' && <span>🌙 NVG IR-GREEN</span>}
          {filterMode === 'thermal' && <span>🔥 THERMAL MAP</span>}
        </button>
      </div>

      {/* Top-right live status & Person Re-ID Tracking */}
      <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1 z-20">
        <div className="flex items-center gap-1 hud-badge bg-black/80 backdrop-blur-md border border-white/15 font-mono text-[9.5px] font-bold">
          {camera.streamUrl && !isReconnecting ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <Radio size={10} className="animate-pulse-dot" /> LIVE FEED
            </span>
          ) : (
            <span className="flex items-center gap-1 text-cyan-400">
              <Activity size={10} className="animate-pulse" /> STANDBY
            </span>
          )}
        </div>
        
        {/* Real-time Multi-Camera Person Re-ID Target Tag */}
        {camera.streamUrl && (
          <span className="px-2 py-0.5 rounded bg-[#080D1A]/90 border border-cyan-400/40 text-[9px] font-mono text-cyan-200 shadow font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            Re-ID: Target-8842 [Active]
          </span>
        )}
      </div>

      {/* Dynamic AI overlay badges */}
      {camera.threat && <ThreatBadge x={camera.threat.x} y={camera.threat.y} label={camera.threat.label} />}
      {camera.attributes && camera.attributes.length > 0 && camera.attributes.map((attr, i) => (
        <AttributeBadge key={i} x={attr.x} y={attr.y} label={attr.label} />
      ))}

      {/* PTZ Overlay Controls (Visible on Hover) */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-30">
        <div className="pointer-events-auto flex flex-col items-center gap-1 bg-black/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-lg" onClick={(e) => e.stopPropagation()}>
          <button onClick={(e) => handlePTZ(e, 'UP')} className="p-1.5 rounded-lg hover:bg-white/20 hover:text-cyan-400 text-gray-300 transition-colors" title="Pan Up"><ChevronUp size={16} /></button>
          <div className="flex items-center gap-1">
            <button onClick={(e) => handlePTZ(e, 'LEFT')} className="p-1.5 rounded-lg hover:bg-white/20 hover:text-cyan-400 text-gray-300 transition-colors" title="Pan Left"><ChevronLeft size={16} /></button>
            <button onClick={(e) => handlePTZHome(e)} className="p-1.5 rounded-lg hover:bg-white/20 hover:text-cyan-400 text-gray-300 transition-colors cursor-pointer" title="Recenter PTZ"><Crosshair size={14} className="text-cyan-500/70" /></button>
            <button onClick={(e) => handlePTZ(e, 'RIGHT')} className="p-1.5 rounded-lg hover:bg-white/20 hover:text-cyan-400 text-gray-300 transition-colors" title="Pan Right"><ChevronRight size={16} /></button>
          </div>
          <button onClick={(e) => handlePTZ(e, 'DOWN')} className="p-1.5 rounded-lg hover:bg-white/20 hover:text-cyan-400 text-gray-300 transition-colors" title="Pan Down"><ChevronDown size={16} /></button>
        </div>
        <div className="pointer-events-auto flex flex-col justify-center gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-lg h-fit my-auto" onClick={(e) => e.stopPropagation()}>
          <button className="p-1.5 rounded-lg hover:bg-white/20 hover:text-emerald-400 text-gray-300 transition-colors" title="Zoom In (Coming Soon)"><ZoomIn size={16} /></button>
          <div className="w-full h-px bg-white/10"></div>
          <button className="p-1.5 rounded-lg hover:bg-white/20 hover:text-emerald-400 text-gray-300 transition-colors" title="Zoom Out (Coming Soon)"><ZoomOut size={16} /></button>
        </div>
      </div>

      {/* Bottom glass info bar */}
      <div
        className="absolute bottom-0 left-0 right-0 px-3.5 py-2.5 bg-gradient-to-t from-black/95 via-black/70 to-transparent backdrop-blur-[2px] flex items-center justify-between gap-2 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        {editing ? (
          <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commitRename()}
              className="w-full bg-white/15 rounded-lg px-2 py-1 text-xs text-white outline-none ring-1 ring-cyan-400 font-sans font-semibold"
            />
            <button
              onClick={commitRename}
              className="shrink-0 h-6 w-6 grid place-items-center rounded-md bg-cyan-400 text-obsidian-950 font-bold focus-ring"
            >
              <Check size={13} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
              <p className="text-xs font-bold text-white tracking-wide truncate">{camera.location}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditing(true)
                }}
                className="shrink-0 h-6 w-6 grid place-items-center rounded-md bg-white/10 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-cyan-300 hover:bg-white/20 transition-all focus-ring"
                title="Rename Camera Location"
              >
                <Pencil size={12} />
              </button>
              {camera.streamUrl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm(`Are you sure you want to disconnect and remove camera ${camera.code}?`)) {
                      onRemove?.(camera.id)
                    }
                  }}
                  className="shrink-0 h-6 w-6 grid place-items-center rounded-md bg-white/10 text-red-400 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-red-500/80 transition-all focus-ring"
                  title="Disconnect & Remove Camera Feed"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default memo(CameraTileComponent)
