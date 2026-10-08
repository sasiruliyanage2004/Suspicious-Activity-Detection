import React from 'react'
import { LayoutGrid, Camera, ShieldAlert, ChartNoAxesCombined, ScanLine, Settings2, Clapperboard, UserCheck, Users } from 'lucide-react'
import { playBleep } from '../utils/sounds'

const NAV = [
  { key: 'grid', icon: LayoutGrid, label: 'Live Video Dashboard' },
  { key: 'cameras', icon: Camera, label: 'Connect & Setup Cameras' },
  { key: 'nvr', icon: Clapperboard, label: 'Recorded Video Clips' },
  { key: 'alerts', icon: ShieldAlert, label: 'Security Alert Logs' },
  { key: 'analytics', icon: ChartNoAxesCombined, label: 'AI Detection Statistics' },
  { key: 'zones', icon: ScanLine, label: 'Restricted Zones Setup' },
  { key: 'whitelist', icon: Users, label: 'Personnel Whitelist' },
  { key: 'audit', icon: UserCheck, label: 'Operator Audit & Status', adminOnly: true },
  { key: 'settings', icon: Settings2, label: 'System Settings', adminOnly: true },
]

export default function Sidebar({ activeTab = 'grid', onTabChange, userRole = 'admin' }) {
  return (
    <aside className="hidden lg:flex flex-col items-center gap-2.5 w-[72px] shrink-0 py-6 sticky top-16 h-[calc(100vh-4rem)] z-[100] bg-black/20 border-r border-white/5 backdrop-blur-md">
      {NAV.filter(item => !item.adminOnly || userRole !== 'operator').map((item) => {
        const isActive = activeTab === item.key
        return (
          <button
            key={item.key}
            onClick={() => {
              playBleep();
              onTabChange?.(item.key);
            }}
            className={`group relative h-11 w-11 grid place-items-center rounded-xl transition-all focus-ring ${
              isActive
                ? 'bg-cyan-glow/15 ring-1 ring-cyan-glow/50 text-cyan-glow shadow-[0_0_15px_rgba(0,255,255,0.25)] font-bold'
                : 'text-white/40 hover:text-white/90 hover:bg-white/[0.06] ring-1 ring-transparent hover:ring-white/10'
            }`}
          >
            <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
            {isActive && (
              <span className="absolute -left-[14px] top-1/2 -translate-y-1/2 h-5 w-[3.5px] rounded-r-full bg-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
            )}
            
            {/* Premium High-Visibility Glassmorphic Tooltip */}
            <div className="pointer-events-none absolute left-full ml-4 z-[9999] whitespace-nowrap rounded-xl bg-[#080d1a]/95 backdrop-blur-xl border border-cyan-400/60 px-3.5 py-1.5 text-xs text-cyan-200 font-mono font-bold tracking-wide opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 shadow-[0_0_25px_rgba(0,0,0,0.9),0_0_15px_rgba(0,255,255,0.2)] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{item.label}</span>
              {/* Tooltip Arrow / Pointer */}
              <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#080d1a] border-l border-b border-cyan-400/60 transform rotate-45" />
            </div>
          </button>
        )
      })}

      <div className="flex-1" />

      <div className="group relative h-9 w-9 rounded-full bg-emerald-400/15 ring-1 ring-emerald-400/40 grid place-items-center shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <div className="pointer-events-none absolute left-full ml-4 z-[9999] whitespace-nowrap rounded-xl bg-[#080d1a]/95 backdrop-blur-xl border border-emerald-400/60 px-3 py-1 text-[11px] text-emerald-300 font-mono font-bold tracking-wide opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 shadow-[0_0_20px_rgba(0,0,0,0.9),0_0_15px_rgba(16,185,129,0.2)] flex items-center gap-2">
          <span>SYSTEM ONLINE</span>
        </div>
      </div>
    </aside>
  )
}
