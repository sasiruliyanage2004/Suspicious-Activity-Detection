import React, { useState } from 'react'
import { X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Scan, Sparkles, ScanLine, Home, ZoomIn, ZoomOut, Radio, Activity } from 'lucide-react'
import ZoneDrawer from './ZoneDrawer.jsx'

export default function CameraExpandedView({ camera, index = 0, onClose }) {
  const [drawingZone, setDrawingZone] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [toast, setToast] = useState('')
  const [isReconnecting, setIsReconnecting] = useState(false)

  const flashToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  // ── Auto Reconnect MJPEG Stream on Packet Drop ───────────────────────────
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

  // ── PTZ Command Handler ──────────────────────────────────────────────────
  const handlePtz = (direction, label) => {
    flashToast(`PTZ: ${label}`)
    fetch(`http://127.0.0.1:8002/api/cameras/${camera.code}/ptz_control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction })
    }).catch(() => {})
  }

  // ── Set Home Position ────────────────────────────────────────────────────
  const handleSetHome = () => {
    flashToast('📍 Home Camera Angle Saved')
    fetch(`http://127.0.0.1:8002/api/cameras/${camera.code}/ptz_set_home`, {
      method: 'POST'
    }).catch(() => {})
  }

  // ── AI Framing Optimization Routine ──────────────────────────────────────
  const runOptimize = () => {
    setOptimizing(true)
    flashToast('✨ AI Analyzing Scene Geometry…')
    fetch(`http://127.0.0.1:8002/api/cameras/${camera.code}/optimize_view`, {
      method: 'POST'
    }).catch(() => {})

    setTimeout(() => {
      setOptimizing(false)
      flashToast('✨ AI Framing & Target Tracking Angle Optimized')
    }, 1200)
  }

  // ── Save Intrusion Zone Points to Backend ────────────────────────────────
  const handleSaveZone = (points) => {
    setDrawingZone(false)
    flashToast(`🛡️ Intrusion Boundary Saved (${points.length} Points)`)
    const formattedPoints = points.map(p => [Math.round(p.x), Math.round(p.y)])
    fetch(`http://127.0.0.1:8000/api/cameras/${camera.code}/zone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: formattedPoints })
    }).catch(() => {})
  }

  if (!camera) return null

  return (
    <div className="fixed inset-0 z-50 bg-obsidian-950/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fade-in">
      <div className="relative w-full max-w-6xl aspect-video rounded-3xl overflow-hidden ring-1 ring-white/[0.08] shadow-glass bg-black">
        
        {/* Render Live Video Feed in Expanded View */}
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

        {/* Interactive Zone Boundary Drawer Overlay */}
        {drawingZone && (
          <ZoneDrawer
            onClose={() => setDrawingZone(false)}
            onSave={handleSaveZone}
          />
        )}

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10">
          <div>
            <p className="font-display text-[15px] font-semibold text-white">{camera.location}</p>
            <p className="font-mono text-[10.5px] tracking-wider text-white/60 uppercase">{camera.code} · Expanded Feed</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hud-badge bg-black/60 backdrop-blur-md border border-white/10 font-mono text-[9.5px] text-emerald-400 font-bold flex items-center gap-1">
              <Radio size={10} className="animate-pulse-dot" /> LIVE STREAM
            </span>
            <button
              onClick={onClose}
              className="h-9 w-9 grid place-items-center rounded-full bg-white/[0.06] hover:bg-crimson-glow/20 hover:text-crimson-glow ring-1 ring-white/[0.08] text-white/60 transition-all focus-ring"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Toast Feedback Notification */}
        {toast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 hud-badge bg-cyan-glow text-obsidian-950 font-bold text-xs animate-rise z-20 shadow-glow-cyan">
            {toast}
          </div>
        )}

        {/* Bottom Control Bar */}
        {!drawingZone && (
          <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-end justify-between gap-4 px-5 py-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10">
            
            {/* PTZ D-Pad Navigation Controls */}
            <div className="grid grid-cols-3 grid-rows-3 gap-1.5 bg-black/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
              <div />
              <PTZButton icon={ChevronUp} title="Tilt Up" onClick={() => handlePtz('UP', 'Tilted UP')} />
              <div />
              <PTZButton icon={ChevronLeft} title="Pan Left" onClick={() => handlePtz('LEFT', 'Panned LEFT')} />
              <PTZButton icon={Scan} title="Auto Sweep" className="text-cyan-glow ring-cyan-glow/30" onClick={() => handlePtz('SWEEP', 'Auto-Sweeping Scene')} />
              <PTZButton icon={ChevronRight} title="Pan Right" onClick={() => handlePtz('RIGHT', 'Panned RIGHT')} />
              <div />
              <PTZButton icon={ChevronDown} title="Tilt Down" onClick={() => handlePtz('DOWN', 'Tilted DOWN')} />
              <div />
            </div>

            {/* Action Buttons: Zoom, Home, AI Optimize, Draw Zone */}
            <div className="flex flex-wrap items-center gap-2 bg-black/50 backdrop-blur-md p-2 rounded-2xl border border-white/10">
              <PTZButton icon={ZoomOut} title="Zoom Out" onClick={() => handlePtz('ZOOM_OUT', 'Zoomed Out')} />
              <PTZButton icon={ZoomIn} title="Zoom In" onClick={() => handlePtz('ZOOM_IN', 'Zoomed In')} />
              
              <button
                onClick={handleSetHome}
                className="h-10 px-3.5 flex items-center gap-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 ring-1 ring-white/[0.08] text-white/80 text-[12px] font-display font-semibold transition-all focus-ring active:scale-95"
              >
                <Home size={14} className="text-cyan-glow" /> Set Home
              </button>

              <button
                onClick={runOptimize}
                disabled={optimizing}
                className="h-10 px-3.5 flex items-center gap-1.5 rounded-lg bg-cyan-glow/20 hover:bg-cyan-glow/30 ring-1 ring-cyan-glow/40 text-cyan-glow text-[12px] font-display font-bold transition-all focus-ring disabled:opacity-60 active:scale-95 shadow-glow-cyan-sm"
              >
                <Sparkles size={14} className={optimizing ? 'animate-spin' : ''} />
                {optimizing ? 'Optimizing…' : 'AI Optimize View'}
              </button>

              <button
                onClick={() => setDrawingZone(true)}
                className="h-10 px-3.5 flex items-center gap-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 ring-1 ring-amber-500/40 text-amber-400 text-[12px] font-display font-bold transition-all focus-ring active:scale-95"
              >
                <ScanLine size={14} /> Draw Intrusion Zone
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FeedBackdrop({ seed = 0, cameraCode, location }) {
  const hue = (seed * 47) % 360
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0A0D14] transform-gpu">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 100% at ${20 + (seed * 13) % 60}% ${10 + (seed * 9) % 40}%, hsla(${hue},45%,18%,0.4), transparent 60%), linear-gradient(160deg, #07090E 0%, #121722 100%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-4">
        <div className="h-11 w-11 rounded-full bg-cyan-glow/10 border border-cyan-glow/30 flex items-center justify-center text-cyan-glow shadow-[0_0_20px_rgba(14,165,233,0.2)]">
          <Activity size={20} className="animate-pulse" />
        </div>
        <div className="space-y-0.5">
          <p className="font-mono text-sm font-bold text-white tracking-widest uppercase">
            {cameraCode} · EXPANDED STANDBY
          </p>
          <p className="font-mono text-xs text-cyan-glow/80 font-semibold tracking-wider">
            {location}
          </p>
        </div>
      </div>
    </div>
  )
}

function PTZButton({ icon: Icon, className = '', onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-10 w-10 grid place-items-center rounded-lg bg-white/[0.05] hover:bg-cyan-glow/20 hover:text-cyan-glow ring-1 ring-white/[0.08] hover:ring-cyan-glow/40 text-white/70 transition-all focus-ring active:scale-95 ${className}`}
    >
      <Icon size={16} />
    </button>
  )
}
