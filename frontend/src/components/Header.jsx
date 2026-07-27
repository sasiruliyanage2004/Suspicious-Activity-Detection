import React, { useState } from 'react'
import {
  ShieldCheck,
  Volume2,
  VolumeX,
  Maximize2,
  ChevronDown,
  Settings,
  LogOut,
  User,
  SlidersHorizontal,
} from 'lucide-react'

function ShieldEmblem() {
  return (
    <svg width="30" height="30" viewBox="0 0 64 64" className="drop-shadow-[0_0_10px_rgba(14,165,233,0.5)]">
      <path
        d="M32 4L54 13V29C54 44 45 55 32 60C19 55 10 44 10 29V13L32 4Z"
        fill="#0EA5E9"
        fillOpacity="0.12"
        stroke="#0EA5E9"
        strokeWidth="1.5"
      />
      <path
        d="M23 32L29 38L41 24"
        fill="none"
        stroke="#67E8F9"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Header({
  sensitivity,
  onSensitivityChange,
  muted,
  onToggleMute,
  onEnterTvWall,
  onOpenOperatorModal,
  activeUser,
  onLogout
}) {
  const [profileOpen, setProfileOpen] = useState(false)
  const isOperator = activeUser?.role === 'operator'
  const displayName = activeUser?.name || 'Commander Master Admin'

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-obsidian-950/70 border-b border-white/[0.05]">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-7 h-16 flex items-center justify-between gap-4">
        {/* Emblem + name */}
        <div className="flex items-center gap-2.5 shrink-0">
          <ShieldEmblem />
          <div className="leading-tight">
            <p className="font-display font-semibold text-[15px] tracking-tight text-white">
              AETHRA <span className="text-cyan-glow">VISION</span>
            </p>
            <p className="hidden sm:block font-mono text-[9px] tracking-[0.18em] text-white/30 uppercase">
              Command Grid
            </p>
          </div>
        </div>

        {/* Center controls */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 ring-1 ring-emerald-400/25 px-3.5 h-8">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="font-mono text-[10.5px] tracking-wider text-emerald-300 uppercase">System Secure</span>
          </div>

          <div className="flex items-center gap-2.5 rounded-full bg-white/[0.03] ring-1 ring-white/[0.07] px-3.5 h-8 w-[180px]">
            <SlidersHorizontal size={12} className="text-white/35 shrink-0" />
            <input
              type="range"
              min={0}
              max={100}
              value={sensitivity}
              onChange={(e) => onSensitivityChange?.(Number(e.target.value))}
              className="w-full h-1 accent-cyan-glow cursor-pointer"
            />
            <span className="font-mono text-[10.5px] text-cyan-glow tabular-nums w-8 shrink-0">{sensitivity}%</span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {!isOperator ? (
            <button
              onClick={onOpenOperatorModal}
              className="hidden md:flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#FF8A00]/15 ring-1 ring-[#FF8A00]/40 text-[#FF8A00] hover:bg-[#FF8A00]/25 transition-all text-[11px] font-mono font-bold tracking-wider uppercase focus-ring"
              title="Admin Tool: Provision New Security Guard / Operator Badge ID"
            >
              🪪 PROVISION OPERATOR
            </button>
          ) : (
            <div className="hidden md:flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#FF8A00]/10 ring-1 ring-[#FF8A00]/30 text-[#FF8A00] text-[10.5px] font-mono font-bold tracking-wider uppercase">
              🛡️ DUTY OPERATOR ACTIVE
            </div>
          )}

          <button
            onClick={onToggleMute}
            title={muted ? 'Unmute audio' : 'Mute audio'}
            className="h-9 w-9 grid place-items-center rounded-full bg-white/[0.03] ring-1 ring-white/[0.07] text-white/55 hover:text-cyan-glow hover:ring-cyan-glow/40 transition-all focus-ring"
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <button
            onClick={onEnterTvWall}
            className="hidden sm:flex items-center gap-2 h-9 px-3.5 rounded-full bg-white/[0.03] ring-1 ring-white/[0.07] text-white/70 hover:text-cyan-glow hover:ring-cyan-glow/40 transition-all text-[12px] font-display font-medium focus-ring"
          >
            <Maximize2 size={13} />
            TV Wall Mode
          </button>

          <div className="relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-full bg-white/[0.03] ring-1 ring-white/[0.07] hover:ring-cyan-glow/40 transition-all focus-ring"
            >
              <div className={`h-6 w-6 rounded-full grid place-items-center ring-1 ring-white/10 ${
                isOperator ? 'bg-gradient-to-br from-[#FF8A00] to-amber-700' : 'bg-gradient-to-br from-cyan-glow/70 to-cyan-glow/20'
              }`}>
                <User size={12} className="text-white" />
              </div>
              <span className="hidden md:block text-[12px] text-white/70 font-medium">{displayName}</span>
              <ChevronDown size={13} className="text-white/35" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl glass-panel p-2 animate-rise z-40">
                <div className="px-3 py-2">
                  <p className="text-[12.5px] text-white font-semibold truncate">{displayName}</p>
                  <p className="text-[10px] text-cyan-glow font-mono uppercase tracking-wider">
                    {isOperator ? 'DUTY OPERATOR' : 'MASTER ADMIN'}
                  </p>
                </div>
                <div className="divider-fade my-1" />
                <button
                  onClick={() => {
                    setProfileOpen(false)
                    onLogout?.()
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-mono text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={14} /> Terminate Session
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
