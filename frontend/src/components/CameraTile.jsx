import React, { useState, memo } from 'react'
import { Pencil, Check, TriangleAlert, Video, Radio, Activity } from 'lucide-react'

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

function CameraTileComponent({ camera, index, onExpand, onRename }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(camera.location)
  const [isReconnecting, setIsReconnecting] = useState(false)

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

  return (
    <div
      className="group relative aspect-video rounded-2xl overflow-hidden ring-1 ring-white/[0.06] hover:ring-cyan-glow/40 transition-all cursor-pointer shadow-glass bg-[#0A0D14] transform-gpu will-change-transform"
      onClick={() => !editing && onExpand?.(camera)}
    >
      {camera.streamUrl ? (
        <img
          src={camera.streamUrl}
          alt={camera.location}
          className="absolute inset-0 w-full h-full object-cover transform-gpu"
          onError={handleStreamError}
        />
      ) : (
        <FeedBackdrop seed={index} cameraCode={camera.code} location={camera.location} />
      )}

      {/* Top-left camera ID */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 hud-badge bg-black/70 backdrop-blur-md text-white/90 border border-white/10 font-mono text-[10px]">
        <Video size={11} className="text-cyan-glow" />
        {camera.code}
      </div>

      {/* Top-right live status */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 hud-badge bg-black/70 backdrop-blur-md border border-white/10 font-mono text-[9.5px]">
        {camera.streamUrl && !isReconnecting ? (
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <Radio size={10} className="animate-pulse-dot" /> LIVE
          </span>
        ) : (
          <span className="flex items-center gap-1 text-cyan-glow font-bold">
            <Activity size={10} className="animate-pulse" /> RECONNECTING
          </span>
        )}
      </div>

      {/* Dynamic AI overlay badges (Only render when real AI detections arrive) */}
      {camera.threat && <ThreatBadge x={camera.threat.x} y={camera.threat.y} label={camera.threat.label} />}
      {camera.attributes && camera.attributes.length > 0 && camera.attributes.map((attr, i) => (
        <AttributeBadge key={i} x={attr.x} y={attr.y} label={attr.label} />
      ))}

      {/* Bottom glass info bar */}
      <div
        className="absolute bottom-0 left-0 right-0 px-3 py-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent backdrop-blur-[2px] flex items-center justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {editing ? (
          <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commitRename()}
              className="w-full bg-white/10 rounded-lg px-2 py-1 text-[12px] text-white outline-none ring-1 ring-cyan-glow/50 font-body"
            />
            <button
              onClick={commitRename}
              className="shrink-0 h-6 w-6 grid place-items-center rounded-md bg-cyan-glow text-obsidian-950 focus-ring"
            >
              <Check size={12} />
            </button>
          </div>
        ) : (
          <>
            <p className="text-[12.5px] font-medium text-white/90 truncate">{camera.location}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditing(true)
              }}
              className="shrink-0 h-6 w-6 grid place-items-center rounded-md bg-white/[0.06] text-white/40 opacity-0 group-hover:opacity-100 hover:text-cyan-glow hover:bg-white/10 transition-all focus-ring"
            >
              <Pencil size={11} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default memo(CameraTileComponent)
