import React from 'react'
import { LayoutGrid, Camera, ShieldAlert, ChartNoAxesCombined, ScanLine, Settings2, Clapperboard } from 'lucide-react'

const NAV = [
  { key: 'grid', icon: LayoutGrid, label: 'Overview Grid' },
  { key: 'cameras', icon: Camera, label: 'Camera Nodes' },
  { key: 'nvr', icon: Clapperboard, label: 'NVR Incident Vault' },
  { key: 'alerts', icon: ShieldAlert, label: 'Threat Audit Logs' },
  { key: 'analytics', icon: ChartNoAxesCombined, label: 'AI Analytics' },
  { key: 'zones', icon: ScanLine, label: 'Intrusion Zones' },
  { key: 'settings', icon: Settings2, label: 'Node Settings' },
]

export default function Sidebar({ activeTab = 'grid', onTabChange }) {
  return (
    <aside className="hidden lg:flex flex-col items-center gap-2 w-[68px] shrink-0 py-6 sticky top-16 h-[calc(100vh-4rem)]">
      {NAV.map((item) => {
        const isActive = activeTab === item.key
        return (
          <button
            key={item.key}
            onClick={() => onTabChange?.(item.key)}
            title={item.label}
            className={`group relative h-11 w-11 grid place-items-center rounded-xl transition-all focus-ring ${
              isActive
                ? 'bg-cyan-glow/12 ring-1 ring-cyan-glow/35 text-cyan-glow shadow-glow-cyan-sm'
                : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04] ring-1 ring-transparent'
            }`}
          >
            <item.icon size={18} strokeWidth={1.8} />
            {isActive && (
              <span className="absolute -left-[9px] top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-cyan-glow shadow-glow-cyan-sm" />
            )}
            <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-obsidian-800 ring-1 ring-white/10 px-2.5 py-1.5 text-[11px] text-white/80 opacity-0 group-hover:opacity-100 transition-opacity shadow-glass">
              {item.label}
            </span>
          </button>
        )
      })}

      <div className="flex-1" />

      <div className="h-9 w-9 rounded-full bg-emerald-400/10 ring-1 ring-emerald-400/30 grid place-items-center" title="System Live">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
      </div>
    </aside>
  )
}
