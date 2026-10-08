import React, { useState, useEffect } from 'react'
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
  Zap,
  Lock,
  Unlock,
  Sun,
  Moon,
} from 'lucide-react'
import { speechSiren } from '../utils/speechSiren'
import { safeFetch, BACKEND_URL } from '../utils/api'

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

interface HeaderProps {
  sensitivity: number;
  onSensitivityChange: (val: any) => void;
  muted: boolean;
  onToggleMute: () => void;
  onEnterTvWall: () => void;
  onOpenOperatorModal?: () => void;
  onOpenSimulatorModal?: () => void;
  activeUser: any;
  onLogout: () => void;
}

export default function Header({
  sensitivity,
  onSensitivityChange,
  muted,
  onToggleMute,
  onEnterTvWall,
  onOpenOperatorModal,
  onOpenSimulatorModal,
  activeUser,
  onLogout
}: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [gatesLocked, setGatesLocked] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  
  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'GOOD MORNING'
    if (hour < 17) return 'GOOD AFTERNOON'
    return 'GOOD EVENING'
  }
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
  }
  
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  }

  const isOperator = activeUser?.role === 'operator'
  const displayName = activeUser?.name || 'Commander Master Admin'

  useEffect(() => {
    speechSiren.setMuted(muted)
  }, [muted])

  const [theme, setTheme] = useState(() => localStorage.getItem('aethra_theme') || 'dark')

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme')
    } else {
      document.body.classList.remove('light-theme')
    }
    localStorage.setItem('aethra_theme', theme)
  }, [theme])

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-obsidian-950/70 border-b border-white/[0.05]">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
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

        {/* Dynamic Greeting & Clock */}
        <div className="hidden md:flex items-center gap-4 ml-4">
          <div className="w-[1px] h-8 bg-white/10" />
          <div className="flex flex-col">
            <span className="font-sans text-[11px] font-medium tracking-widest text-cyan-400">
              {getGreeting()}, COMMANDER
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[10px] text-white/70">
                {formatDate(currentTime)}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="font-mono text-[10px] text-white">
                {formatTime(currentTime)}
              </span>
            </div>
          </div>
        </div>

        {/* Center Tactical Status Pills (Matches Video) */}
        <div className="hidden lg:flex flex-1 justify-center items-center gap-2.5 mx-2">
          {/* 1. Gates Status Pill */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
            gatesLocked 
              ? 'bg-red-500/15 text-red-300 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
              : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${gatesLocked ? 'bg-red-400' : 'bg-cyan-400'}`} />
            <span>GATES {gatesLocked ? 'LOCKED' : 'UNLOCKED'}</span>
          </div>

          {/* 2. Re-ID Target Tracking Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span>RE-ID TRACKING ACTIVE</span>
          </div>

          {/* 3. Alerts Active Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>AI PERIMETER ARMED</span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 justify-end">
          {/* Perimeter Gate Lock Button */}
          <button
            onClick={() => {
              const newState = !gatesLocked;
              setGatesLocked(newState);
              if (newState) {
                try {
                  const utterance = new SpeechSynthesisUtterance("Perimeter gates locked.");
                  utterance.rate = 1.1;
                  window.speechSynthesis.speak(utterance);
                } catch(e) {}
              }
            }}
            className={`flex items-center gap-1.5 h-9 px-3 sm:px-4 rounded-full transition-all text-[11px] sm:text-xs font-mono font-extrabold tracking-wider uppercase ${
              gatesLocked 
                ? 'bg-red-500/20 ring-1 ring-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                : 'bg-emerald-500/10 ring-1 ring-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20'
            }`}
            title="Toggle Electronic Perimeter Gate Locks"
          >
            {gatesLocked ? <Lock size={14} className="shrink-0" /> : <Unlock size={14} className="shrink-0" />}
            <span className="hidden lg:inline-block">GATES {gatesLocked ? 'LOCKED' : 'UNLOCKED'}</span>
          </button>

          {/* Emergency SOS / Lockdown Button */}
          <button
            onClick={() => {
              const confirmLockdown = window.confirm("🚨 WARNING: Initiate Facility Emergency Lockdown? This will trigger English voice warnings, alarms, and lock perimeter gates.");
              if (confirmLockdown) {
                speechSiren.speakLockdown();
                const banner = document.getElementById('lockdown-strobe-banner');
                if (banner) banner.classList.remove('hidden');
              }
            }}
            className="flex items-center gap-1.5 h-9 px-3 sm:px-4 rounded-full bg-red-600/25 ring-1 ring-red-500 text-red-400 hover:bg-red-600 hover:text-white transition-all text-[11px] sm:text-xs font-mono font-extrabold tracking-wider uppercase shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse"
            title="Immediate Emergency Facility Lockdown & SOS Audio Dispatch"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
            <span className="hidden xl:inline-block">🚨 EMERGENCY LOCKDOWN</span>
            <span className="xl:hidden">🚨 LOCKDOWN</span>
          </button>

          {!isOperator ? (
            <button
              onClick={onOpenOperatorModal}
              className="hidden 2xl:flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#FF8A00]/15 ring-1 ring-[#FF8A00]/40 text-[#FF8A00] hover:bg-[#FF8A00]/25 transition-all text-[11px] font-mono font-bold tracking-wider uppercase focus-ring"
              title="Admin Tool: Provision New Security Guard / Operator Badge ID"
            >
              🪪 PROVISION OPERATOR
            </button>
          ) : (
            <div className="hidden 2xl:flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#FF8A00]/10 ring-1 ring-[#FF8A00]/30 text-[#FF8A00] text-[10.5px] font-mono font-bold tracking-wider uppercase">
              🛡️ DUTY OPERATOR
            </div>
          )}

          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="h-9 w-9 grid place-items-center rounded-full bg-white/[0.03] ring-1 ring-white/[0.07] text-white/55 hover:text-cyan-glow hover:ring-cyan-glow/40 transition-all focus-ring"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

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
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0B0E13] border border-white/20 p-2 animate-rise z-[9999] shadow-[0_0_30px_rgba(0,0,0,0.8)]">
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
                    if (isOperator && activeUser?.badgeId) {
                      safeFetch(`${BACKEND_URL}/api/operators/${activeUser.badgeId}/logout`, { method: 'POST' }, 2000)
                        .finally(() => onLogout?.())
                    } else {
                      onLogout?.()
                    }
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
