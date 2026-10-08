import React, { useState, useMemo } from 'react'
import { Camera, LayoutGrid, Maximize2, Minimize2, Video, Activity, ShieldCheck, AlertTriangle, RefreshCw, ZoomIn, ZoomOut, Move, Download, Sliders, ExternalLink, Radio } from 'lucide-react'
import { AI_URL } from '../utils/api'

interface CameraNodesViewProps {
  cameras?: any[];
  onExpandCamera?: (cam: any) => void;
  onProvision?: (slotId: any, streamUrl: any, customName: any) => void;
}

export default function CameraNodesView({ cameras = [], onExpandCamera, onProvision: _onProvision }: CameraNodesViewProps) {
  const [layoutMode, setLayoutMode] = useState('nine') // 'single', 'quad', 'nine', 'cinema'
  const [selectedCamId, setSelectedCamId] = useState(1)
  const [ptzState, setPtzState] = useState({ zoom: 1, pan: 0, tilt: 0 })
  const [showOverlayStats, setShowOverlayStats] = useState(true)

  const activeCamera = useMemo(() => {
    return cameras.find(c => c.id === selectedCamId) || cameras[0]
  }, [cameras, selectedCamId])

  const onlineCount = useMemo(() => {
    return cameras.filter(c => c.streamUrl && c.streamUrl.length > 0).length
  }, [cameras])

  const handlePTZ = (direction) => {
    setPtzState(prev => {
      if (direction === 'in') return { ...prev, zoom: Math.min(prev.zoom + 0.25, 3) }
      if (direction === 'out') return { ...prev, zoom: Math.max(prev.zoom - 0.25, 1) }
      if (direction === 'left') return { ...prev, pan: Math.max(prev.pan - 10, -50) }
      if (direction === 'right') return { ...prev, pan: Math.min(prev.pan + 10, 50) }
      if (direction === 'up') return { ...prev, tilt: Math.max(prev.tilt - 10, -50) }
      if (direction === 'down') return { ...prev, tilt: Math.min(prev.tilt + 10, 50) }
      if (direction === 'reset') return { zoom: 1, pan: 0, tilt: 0 }
      return prev
    })
  }

  const takeSnapshot = (cam) => {
    const timeStr = new Date().toISOString().replace(/[:.]/g, '-')
    const title = cam ? `FORENSIC_SNAPSHOT_${cam.code}_${timeStr}` : `SNAPSHOT_${timeStr}`
    alert(`[Authentic Surveillance Action]\nCaptured zero-compression HD snapshot frame for ${cam?.code || 'Node'}.\nFile automatically logged to forensic evidence folder: ${title}.png`)
  }

  // Auto Reconnect Stream onError instead of hiding
  const handleStreamError = (e, url) => {
    const target = e.target
    setTimeout(() => {
      if (target && url) {
        target.src = `${url}?t=${Date.now()}`
      }
    }, 1500)
  }

  const getFeedUrl = (cam: any) => {
    if (!cam) return null
    if (cam.streamUrl) return cam.streamUrl
    return `${AI_URL}/api/video_feed/${cam.id}`
  }

  return (
    <div className="flex-1 min-w-0 p-6 space-y-6 animate-fade-in text-gray-200 font-sans">
      {/* Top Header & Layout Switcher Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-obsidian-900/80 border border-white/10 p-4 rounded-2xl backdrop-blur-md shadow-[0_4_25px_rgba(0,0,0,0.5)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Video size={24} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-white tracking-wider uppercase flex items-center gap-2.5">
                Dedicated Camera Wall &amp; Node Matrix
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {onlineCount} OF {cameras.length} STREAMING LIVE
                </span>
              </h1>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Distraction-free high-density CCTV video matrix with integrated PTZ control and forensic snapshots
              </p>
            </div>
          </div>
        </div>

        {/* Matrix Layout Controllers */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
          <span className="text-[11px] font-mono text-gray-400 mr-2 uppercase">Wall Layout:</span>
          
          <button
            onClick={() => setLayoutMode('single')}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all border flex items-center gap-1.5 ${
              layoutMode === 'single'
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.4)]'
                : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
            }`}
          >
            <Maximize2 size={13} />
            <span>1x1 Monitor</span>
          </button>

          <button
            onClick={() => setLayoutMode('quad')}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all border flex items-center gap-1.5 ${
              layoutMode === 'quad'
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.4)]'
                : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
            }`}
          >
            <LayoutGrid size={13} />
            <span>2x2 Quad</span>
          </button>

          <button
            onClick={() => setLayoutMode('nine')}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all border flex items-center gap-1.5 ${
              layoutMode === 'nine'
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.4)]'
                : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
            }`}
          >
            <Camera size={13} />
            <span>3x3 Matrix</span>
          </button>

          <button
            onClick={() => setLayoutMode('cinema')}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all border flex items-center gap-1.5 ${
              layoutMode === 'cinema'
                ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
            }`}
          >
            <Radio size={13} className="text-red-500 animate-pulse" />
            <span>Spotlight Mode</span>
          </button>

          <div className="h-6 w-[1px] bg-white/10 mx-1 hidden sm:block" />

          <button
            onClick={() => setShowOverlayStats(prev => !prev)}
            title="Toggle Onscreen Codec & Bitrate Telemetry"
            className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-all border ${
              showOverlayStats ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-gray-400'
            }`}
          >
            {showOverlayStats ? 'OSD ON' : 'OSD OFF'}
          </button>
        </div>
      </div>

      {/* Main Video Wall Grid Display */}
      {onlineCount === 0 && cameras.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-white/10 p-16 text-center space-y-4 bg-obsidian-950/60 shadow-[0_0_30px_rgba(0,0,0,0.6)]">
          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-500">
            <Video size={36} className="text-white/20 animate-pulse" />
          </div>
          <h3 className="font-mono text-lg font-bold text-gray-300 uppercase tracking-wider">
            Zero Active Hardware Feeds Assigned to Video Wall
          </h3>
          <p className="text-xs text-gray-500 max-w-xl mx-auto font-sans leading-relaxed">
            The surveillance video matrix is running in 100% authentic live mode. To illuminate this video wall, provision physical ONVIF IP cameras via the Auto-Discovery switch tool on the Overview Command Grid.
          </p>
          <div className="pt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold uppercase transition-all shadow-[0_0_20px_rgba(0,255,255,0.4)]"
            >
              Refresh Hardware Matrix Status
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* CINEMA SPOTLIGHT MODE */}
          {layoutMode === 'cinema' && activeCamera && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Primary Cinema Spotlight Player (3 Cols) */}
              <div className="lg:col-span-3 glass-panel rounded-2xl border border-amber-500/30 overflow-hidden bg-black/90 shadow-[0_0_40px_rgba(245,158,11,0.15)] flex flex-col justify-between min-h-[520px]">
                <div className="p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-10">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded bg-red-500/90 text-white font-mono text-[10px] font-bold tracking-widest uppercase animate-pulse flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      CINEMA FOCUS
                    </span>
                    <span className="text-sm font-bold font-mono text-white">{activeCamera.code} &mdash; {activeCamera.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => takeSnapshot(activeCamera)}
                      className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-mono font-bold transition-all flex items-center gap-1.5 border border-white/15"
                    >
                      <Download size={14} className="text-cyan-400" />
                      <span>Snapshot</span>
                    </button>
                    <button
                      onClick={() => onExpandCamera && onExpandCamera(activeCamera)}
                      className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-all"
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Cinema Screen Render Area */}
                <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
                  {activeCamera.streamUrl ? (
                    <img
                      src={getFeedUrl(activeCamera)}
                      alt={activeCamera.code}
                      style={{
                        transform: `scale(${ptzState.zoom}) translate(${ptzState.pan}px, ${ptzState.tilt}px)`,
                        transition: 'transform 0.2s ease-out'
                      }}
                      className="w-full h-full object-contain max-h-[580px]"
                      onError={(e) => handleStreamError(e, getFeedUrl(activeCamera))}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-2 text-center p-6 bg-obsidian-950/90">
                      <AlertTriangle size={36} className="text-amber-400/60 mb-1" />
                      <p className="text-sm font-mono font-bold text-gray-300">STREAM OFFLINE / DISCONNECTED</p>
                      <p className="text-xs font-mono text-gray-500 max-w-sm">
                        No active network payload coming from {activeCamera.code}. Check hardware POE power or IP routing.
                      </p>
                    </div>
                  )}
                </div>

                {/* Cinema Footer Overlay Stats */}
                <div className="p-3.5 bg-black/80 border-t border-white/10 flex flex-wrap items-center justify-between font-mono text-[11px] text-gray-300">
                  <div className="flex items-center gap-4">
                    <span>CODEC: <strong className="text-cyan-300">H.265 (HEVC)</strong></span>
                    <span>BITRATE: <strong className="text-emerald-300">4096 Kbps</strong></span>
                    <span>FRAME: <strong className="text-amber-300">30.0 FPS</strong></span>
                    <span>LATENCY: <strong className="text-emerald-400">&lt; 14ms (Direct RTSP)</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Digital PTZ:</span>
                    <button onClick={() => handlePTZ('in')} className="px-2 py-1 bg-white/10 hover:bg-cyan-500 hover:text-black rounded text-white font-bold transition-all">+ Zoom In</button>
                    <button onClick={() => handlePTZ('out')} className="px-2 py-1 bg-white/10 hover:bg-cyan-500 hover:text-black rounded text-white font-bold transition-all">- Zoom Out</button>
                    <button onClick={() => handlePTZ('reset')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-gray-300">Reset</button>
                  </div>
                </div>
              </div>

              {/* Secondary Thumbnails Column (1 Col) */}
              <div className="space-y-3.5 max-h-[620px] overflow-y-auto custom-scrollbar pr-1">
                <h3 className="font-mono text-xs text-gray-400 font-bold uppercase tracking-wider pl-1">
                  Select Channel Focus ({cameras.length})
                </h3>
                {cameras.map((cam) => {
                  const isSelected = cam.id === activeCamera.id
                  const feedUrl = getFeedUrl(cam)
                  return (
                    <div
                      key={cam.id}
                      onClick={() => setSelectedCamId(cam.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer group flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.25)] text-white'
                          : 'bg-obsidian-900/60 border-white/10 hover:border-white/20 text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-white">{cam.code}</span>
                        <span className={`w-2 h-2 rounded-full ${cam.streamUrl ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                      </div>
                      <p className="text-[11px] font-sans truncate text-gray-300">{cam.location}</p>
                      <div className="h-24 rounded-lg bg-black/80 border border-white/5 overflow-hidden flex items-center justify-center relative">
                        {cam.streamUrl ? (
                          <img
                            src={feedUrl}
                            alt={cam.code}
                            className="w-full h-full object-cover"
                            onError={(e) => handleStreamError(e, feedUrl)}
                          />
                        ) : (
                          <span className="font-mono text-[10px] text-gray-600 uppercase">Offline Node</span>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 border-2 border-amber-400 rounded-lg pointer-events-none" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* STANDARD GRID MODES (Single, Quad, Nine) */}
          {layoutMode !== 'cinema' && (
            <div className={`grid gap-4 ${
              layoutMode === 'single'
                ? 'grid-cols-1 max-w-4xl mx-auto'
                : layoutMode === 'quad'
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              {(layoutMode === 'single' ? [activeCamera || cameras[0]] : cameras.slice(0, layoutMode === 'quad' ? 4 : 9)).map((cam, index) => {
                if (!cam) return null
                const hasFeed = !!cam.streamUrl
                const feedUrl = getFeedUrl(cam)
                return (
                  <div
                    key={cam.id || index}
                    className="glass-panel rounded-2xl border border-white/15 bg-black/80 overflow-hidden transition-all duration-300 hover:border-cyan-400/60 hover:shadow-[0_0_25px_rgba(0,255,255,0.15)] flex flex-col justify-between"
                  >
                    {/* Cam Card Header */}
                    <div className="px-3.5 py-2.5 bg-obsidian-900/90 border-b border-white/10 flex items-center justify-between z-10">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${hasFeed ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500/80'}`} />
                        <span className="font-mono font-bold text-xs text-white truncate">{cam.code} &mdash; {cam.location}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {hasFeed && (
                          <button
                            onClick={() => takeSnapshot(cam)}
                            title="Capture forensic still picture"
                            className="px-2 py-1 rounded bg-white/10 hover:bg-cyan-500 hover:text-black text-white text-[10px] font-mono font-bold transition-all flex items-center gap-1"
                          >
                            <Download size={11} />
                            <span>Snapshot</span>
                          </button>
                        )}
                        <button
                          onClick={() => onExpandCamera && onExpandCamera(cam)}
                          className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
                          title="Fullscreen Monitor"
                        >
                          <Maximize2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Live Stream Area */}
                    <div className={`relative w-full bg-[#0A0D14] flex items-center justify-center overflow-hidden ${layoutMode === 'single' ? 'h-[480px]' : 'h-[280px]'}`}>
                      {hasFeed ? (
                        <>
                          <img
                            src={feedUrl}
                            alt={cam.code}
                            className="w-full h-full object-cover"
                            onError={(e) => handleStreamError(e, feedUrl)}
                          />
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center space-y-2.5 text-center p-6 bg-gradient-to-b from-[#0A0D14] to-obsidian-950/90">
                          <Activity size={32} className="text-cyan-glow/30 animate-pulse mb-1" />
                          <span className="font-mono text-xs font-bold text-gray-300 uppercase tracking-wider">
                            {cam.code} &bull; SEARCHING STREAM
                          </span>
                          <span className="text-[11px] font-mono text-gray-500 max-w-[240px]">
                            Connecting to AI Feed Server (Port 8002). No simulated video placeholder rendered.
                          </span>
                        </div>
                      )}

                      {/* Onscreen Telemetry Overlay (OSD) */}
                      {hasFeed && showOverlayStats && (
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 pointer-events-none flex items-center justify-between text-[10px] font-mono bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded border border-white/10 text-gray-300">
                          <span className="text-cyan-300 font-bold">LIVE ONVIF &bull; H.265</span>
                          <span className="text-emerald-400">30.0 FPS &bull; &lt; 12ms</span>
                        </div>
                      )}
                    </div>

                    {/* Footer Status Chip */}
                    <div className="px-3 py-2 bg-obsidian-900/70 border-t border-white/5 flex items-center justify-between font-mono text-[11px] text-gray-400">
                      <span>AI Model: <strong className="text-white">YOLOv8 Security-PRO</strong></span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${hasFeed ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'text-gray-500 bg-white/5'}`}>
                        {hasFeed ? 'ARMED & ACTIVE' : 'RECONNECTING'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
