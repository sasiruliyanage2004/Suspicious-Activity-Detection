import React, { useState, useEffect } from 'react'
import { VideoOff, RefreshCw, Radio, ShieldAlert } from 'lucide-react'

interface AiVisionFeedProps {
  camera?: any
  seed?: number
  filterMode?: string
  threat?: any
  isExpanded?: boolean
  className?: string
  onRetry?: () => void
}

/**
 * Normal CCTV Standby & Signal Acquisition Slate.
 * Replaces synthetic/wireframe simulations with an authentic, professional
 * enterprise surveillance standby monitor when an RTSP feed is offline.
 */
export default function AiVisionFeed({
  camera,
  filterMode = 'normal',
  threat = null,
  isExpanded = false,
  className = "w-full h-full object-cover",
  onRetry
}: AiVisionFeedProps) {
  const [clock, setClock] = useState('')
  const [retrying, setRetrying] = useState(false)

  // Real-time ticking CCTV OSD timestamp
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const year = now.getFullYear()
      const month = pad(now.getMonth() + 1)
      const day = pad(now.getDate())
      const h = pad(now.getHours())
      const m = pad(now.getMinutes())
      const s = pad(now.getSeconds())
      const ms = String(now.getMilliseconds()).padStart(3, '0')
      setClock(`${year}-${month}-${day} ${h}:${m}:${s}.${ms}`)
    }
    updateTime()
    const id = setInterval(updateTime, 100)
    return () => clearInterval(id)
  }, [])

  const handleManualRetry = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRetrying(true)
    onRetry?.()
    setTimeout(() => setRetrying(false), 2000)
  }

  const camCode = camera?.code || 'CAM-02'
  const camLocation = camera?.location || 'Sector Feed'

  return (
    <div
      className={`relative w-full h-full bg-[#080B11] flex flex-col justify-between p-4 select-none overflow-hidden font-mono ${className}`}
      style={{
        backgroundImage: 'radial-gradient(ellipse at center, #0F1420 0%, #06080D 100%)'
      }}
    >
      {/* Subtle CCTV CRT Scanline Effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 2px, transparent 2px, transparent 4px)'
        }}
      />

      {/* Top CCTV On-Screen Display (OSD) Telemetry Header */}
      <div className="relative z-10 flex items-center justify-between text-white/70 text-[11px] tracking-wider border-b border-white/[0.06] pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span className="font-bold text-white tracking-widest">{camCode}</span>
          <span className="text-white/40">|</span>
          <span className="text-white/60 uppercase">{camLocation}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-cyan-400 font-semibold">{clock}</span>
          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] text-white/50">1080P · 30FPS</span>
        </div>
      </div>

      {/* Center CCTV Signal Lost / Standby Slate */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto px-4">
        {/* Pulsing Radar Ring Icon */}
        <div className="relative mb-3 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-cyan-500/5 ring-1 ring-cyan-500/20 flex items-center justify-center">
            <VideoOff size={28} className="text-white/40" />
          </div>
          <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-ping opacity-30" />
        </div>

        <h3 className="text-white font-bold tracking-wider text-[14px] md:text-[15px] uppercase flex items-center gap-2">
          NO VIDEO SIGNAL
        </h3>
        <p className="text-white/50 text-[11px] md:text-[12px] mt-1 max-w-sm tracking-wide">
          Camera node is in standby. Awaiting live RTSP video packet from hardware source.
        </p>

        {/* Retry Stream Control Button */}
        <button
          onClick={handleManualRetry}
          disabled={retrying}
          className="mt-4 px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] ring-1 ring-white/10 hover:ring-cyan-400/40 text-cyan-300 text-[11px] font-medium flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={12} className={retrying ? 'animate-spin' : ''} />
          {retrying ? 'Connecting to Stream...' : 'Retry Live Signal'}
        </button>
      </div>

      {/* Bottom CCTV Status & Diagnostics Footer */}
      <div className="relative z-10 flex items-center justify-between text-white/40 text-[10px] tracking-wider border-t border-white/[0.06] pt-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-amber-400/90">
            <Radio size={11} className="animate-pulse" />
            STANDBY / ACQUIRING
          </span>
          <span className="hidden sm:inline text-white/20">|</span>
          <span className="hidden sm:inline">PROTOCOL: RTSP / ONVIF PROFILE S</span>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <span>PORT: 8002</span>
          <span className="text-white/20">·</span>
          <span>BITRATE: 0 KBPS</span>
        </div>
      </div>
    </div>
  )
}
