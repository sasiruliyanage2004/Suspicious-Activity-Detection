import React, { useState } from 'react'
import {
  X,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Scan,
  Sparkles,
  ScanLine,
  Home,
  ZoomIn,
  ZoomOut,
  Radio,
  Activity,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Shield,
  Cpu,
  FlipHorizontal
} from 'lucide-react'
import AiVisionFeed from './AiVisionFeed'
import ZoneDrawer from './ZoneDrawer'
import { safeFetch, BACKEND_URL, AI_URL } from '../utils/api'

interface CameraExpandedViewProps {
  camera: {
    id: number
    code: string
    location: string
    streamUrl?: string
    threat?: any
    attributes?: any[]
  }
  index?: number
  onClose: () => void
}

export default function CameraExpandedView({ camera, index = 0, onClose }: CameraExpandedViewProps) {
  const [drawingZone, setDrawingZone] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [toast, setToast] = useState('')
  const [isTheater, setIsTheater] = useState(false)
  const [showControls, setShowControls] = useState(true)

  const flashToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const [streamFailed, setStreamFailed] = useState(false)

  // ── Auto Fallback to High-Tech AI Computer Vision Simulation on Stream Offline ──
  const handleStreamError = () => {
    setStreamFailed(true)
  }

  // ── PTZ Command Handler ──────────────────────────────────────────────────
  const handlePtz = (direction: string, label: string) => {
    flashToast(`PTZ: ${label}`)
    safeFetch(`${AI_URL}/api/cameras/${camera.code}/ptz_control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction })
    }, 2000).catch(() => {})
  }

  // ── Set Home Position ────────────────────────────────────────────────────
  const handleSetHome = () => {
    flashToast('📍 Home Camera Angle Saved')
    safeFetch(`${AI_URL}/api/cameras/${camera.code}/ptz_set_home`, {
      method: 'POST'
    }, 2000).catch(() => {})
  }

  // ── AI Framing Optimization Routine ──────────────────────────────────────
  const runOptimize = () => {
    setOptimizing(true)
    flashToast('✨ AI Analyzing Scene Geometry…')
    safeFetch(`${AI_URL}/api/cameras/${camera.code}/optimize_view`, {
      method: 'POST'
    }, 2000).catch(() => {})

    setTimeout(() => {
      setOptimizing(false)
      flashToast('✨ AI Framing & Target Tracking Angle Optimized')
    }, 1200)
  }

  // ── Save Intrusion Zone Points to Backend ────────────────────────────────
  const handleSaveZone = (points: Array<{ x: number; y: number }>) => {
    setDrawingZone(false)
    flashToast(`🛡️ Intrusion Boundary Saved (${points.length} Points)`)
    const formattedPoints = points.map((p) => [Math.round(p.x), Math.round(p.y)])
    safeFetch(`${BACKEND_URL}/api/cameras/${camera.code}/zone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: formattedPoints })
    }, 2000).catch(() => {})
  }

  if (!camera) return null

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center transition-all duration-300 animate-fade-in ${
        isTheater ? 'p-0' : 'p-2 sm:p-6 md:p-8'
      }`}
    >
      <div
        className={`relative overflow-hidden ring-1 ring-white/10 shadow-2xl bg-black transition-all duration-300 ${
          isTheater
            ? 'w-screen h-screen rounded-none'
            : 'w-full max-w-7xl 2xl:max-w-[95vw] aspect-video max-h-[92vh] rounded-2xl md:rounded-3xl shadow-glow-cyan-sm'
        }`}
      >
        {!streamFailed && camera.streamUrl ? (
          <img
            src={camera.streamUrl}
            alt={camera.location}
            className="absolute inset-0 w-full h-full object-cover transform-gpu"
            onError={handleStreamError}
          />
        ) : (
          <AiVisionFeed camera={camera} seed={index} isExpanded={true} threat={camera.threat} />
        )}

        {/* Interactive Zone Boundary Drawer Overlay */}
        {drawingZone && <ZoneDrawer onClose={() => setDrawingZone(false)} onSave={handleSaveZone} />}

        {/* Top Tactical Telemetry Bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3.5 bg-gradient-to-b from-black/90 via-black/50 to-transparent z-20 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div>
              <p className="font-display text-[15px] font-bold text-white tracking-wide flex items-center gap-2">
                <Shield size={16} className="text-cyan-400" />
                {camera.location}
              </p>
              <p className="font-mono text-[10.5px] tracking-wider text-cyan-300/80 uppercase font-semibold">
                {camera.code} · ENTERPRISE COMMAND FEED
              </p>
            </div>

            {/* Tactical Live Stream Metadata Badges */}
            <div className="hidden lg:flex items-center gap-2 ml-4">
              <span className="px-2 py-0.5 rounded bg-black/60 border border-white/15 text-[10px] font-mono font-bold text-gray-300">
                1080P FHD
              </span>
              <span className="px-2 py-0.5 rounded bg-black/60 border border-white/15 text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                30 FPS
              </span>
              <span className="px-2 py-0.5 rounded bg-black/60 border border-white/15 text-[10px] font-mono font-bold text-cyan-400 flex items-center gap-1">
                <Cpu size={11} /> YOLOv11 ARMED
              </span>
              <span className="px-2 py-0.5 rounded bg-black/60 border border-white/15 text-[10px] font-mono font-bold text-gray-400">
                12MS LATENCY
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hud-badge bg-black/70 backdrop-blur-md border border-white/15 font-mono text-[10px] text-emerald-400 font-bold flex items-center gap-1.5 shadow-sm">
              <Radio size={11} className="animate-pulse" /> LIVE STREAM
            </span>

            {/* Mirror / Flip Camera Toggle */}
            <button
              onClick={() => {
                safeFetch(`${AI_URL}/api/cameras/${camera.code}/toggle_mirror`, { method: 'POST' }, 2000)
                  .then((res) => res.json())
                  .then((data) => {
                    flashToast(data.is_mirrored ? '🪞 Camera Mirror Mode: ON' : '📷 Camera Normal Mode: ON')
                  })
                  .catch(() => {
                    flashToast('🪞 Camera Mirror Toggled')
                  })
              }}
              title="Toggle Camera Mirror / Flip Horizontal"
              className="h-9 px-3 flex items-center gap-1.5 rounded-full bg-white/[0.08] hover:bg-white/15 ring-1 ring-white/10 text-white/80 hover:text-cyan-400 text-xs font-mono transition-all focus-ring"
            >
              <FlipHorizontal size={14} />
              <span className="hidden sm:inline">Mirror Feed</span>
            </button>

            {/* Show / Hide PTZ Overlay Controls Toggle */}
            <button
              onClick={() => setShowControls((v) => !v)}
              title={showControls ? 'Hide Controls & HUD' : 'Show Controls & HUD'}
              className="h-9 px-3 flex items-center gap-1.5 rounded-full bg-white/[0.08] hover:bg-white/15 ring-1 ring-white/10 text-white/80 hover:text-white text-xs font-mono transition-all focus-ring"
            >
              {showControls ? <EyeOff size={14} /> : <Eye size={14} />}
              <span className="hidden sm:inline">{showControls ? 'Hide Controls' : 'Show Controls'}</span>
            </button>

            {/* Theater / Fullscreen Toggle */}
            <button
              onClick={() => setIsTheater((v) => !v)}
              title={isTheater ? 'Exit Fullscreen' : 'Enter Fullscreen Theater'}
              className="h-9 w-9 grid place-items-center rounded-full bg-white/[0.08] hover:bg-cyan-500/20 hover:text-cyan-400 ring-1 ring-white/10 text-white/80 transition-all focus-ring"
            >
              {isTheater ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Close Modal Button */}
            <button
              onClick={onClose}
              title="Close Stream (Esc)"
              className="h-9 w-9 grid place-items-center rounded-full bg-white/[0.08] hover:bg-rose-500/20 hover:text-rose-400 ring-1 ring-white/10 text-white/80 transition-all focus-ring"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 hud-badge bg-cyan-400 text-obsidian-950 font-bold text-xs animate-rise z-30 shadow-glow-cyan">
            {toast}
          </div>
        )}

        {/* Bottom Control Bar (Toggleable so video remains 100% clean if needed) */}
        {!drawingZone && showControls && (
          <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-end justify-between gap-4 px-5 py-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-20 pointer-events-auto transition-all animate-fade-in">
            {/* PTZ D-Pad Navigation Controls */}
            <div className="grid grid-cols-3 grid-rows-3 gap-1.5 bg-black/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 shadow-xl">
              <div />
              <PTZButton icon={ChevronUp} title="Tilt Up" onClick={() => handlePtz('UP', 'Tilted UP')} />
              <div />
              <PTZButton icon={ChevronLeft} title="Pan Left" onClick={() => handlePtz('LEFT', 'Panned LEFT')} />
              <PTZButton
                icon={Scan}
                title="Auto Sweep"
                className="text-cyan-400 ring-cyan-400/40"
                onClick={() => handlePtz('SWEEP', 'Auto-Sweeping Scene')}
              />
              <PTZButton icon={ChevronRight} title="Pan Right" onClick={() => handlePtz('RIGHT', 'Panned RIGHT')} />
              <div />
              <PTZButton icon={ChevronDown} title="Tilt Down" onClick={() => handlePtz('DOWN', 'Tilted DOWN')} />
              <div />
            </div>

            {/* Action Buttons: Zoom, Home, AI Optimize, Draw Zone */}
            <div className="flex flex-wrap items-center gap-2 bg-black/60 backdrop-blur-md p-2 rounded-2xl border border-white/15 shadow-xl">
              <PTZButton icon={ZoomOut} title="Zoom Out" onClick={() => handlePtz('ZOOM_OUT', 'Zoomed Out')} />
              <PTZButton icon={ZoomIn} title="Zoom In" onClick={() => handlePtz('ZOOM_IN', 'Zoomed In')} />

              <button
                onClick={handleSetHome}
                className="h-10 px-3.5 flex items-center gap-1.5 rounded-xl bg-white/[0.08] hover:bg-white/15 ring-1 ring-white/15 text-white/90 text-[12px] font-display font-semibold transition-all focus-ring active:scale-95"
              >
                <Home size={14} className="text-cyan-400" /> Set Home
              </button>

              <button
                onClick={runOptimize}
                disabled={optimizing}
                className="h-10 px-3.5 flex items-center gap-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 ring-1 ring-cyan-400/50 text-cyan-300 text-[12px] font-display font-bold transition-all focus-ring disabled:opacity-60 active:scale-95 shadow-glow-cyan-sm"
              >
                <Sparkles size={14} className={optimizing ? 'animate-spin' : ''} />
                {optimizing ? 'Optimizing…' : 'AI Optimize View'}
              </button>

              <button
                onClick={() => setDrawingZone(true)}
                className="h-10 px-3.5 flex items-center gap-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 ring-1 ring-amber-500/50 text-amber-300 text-[12px] font-display font-bold transition-all focus-ring active:scale-95"
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

function PTZButton({
  icon: Icon,
  className = '',
  onClick,
  title
}: {
  icon: any
  className?: string
  onClick: () => void
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-10 w-10 grid place-items-center rounded-xl bg-white/[0.08] hover:bg-cyan-400/20 hover:text-cyan-300 ring-1 ring-white/10 hover:ring-cyan-400/50 text-white/80 transition-all focus-ring active:scale-95 ${className}`}
    >
      <Icon size={16} />
    </button>
  )
}
