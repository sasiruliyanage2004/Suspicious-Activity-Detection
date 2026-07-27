import React from 'react'

const accentMap = {
  cyan: {
    ring: 'ring-cyan-glow/20',
    icon: 'text-cyan-glow bg-cyan-glow/10',
    value: 'text-cyan-glow',
    glow: 'group-hover:shadow-glow-cyan-sm',
  },
  emerald: {
    ring: 'ring-emerald-400/20',
    icon: 'text-emerald-400 bg-emerald-400/10',
    value: 'text-emerald-400',
    glow: 'group-hover:shadow-[0_0_16px_-2px_rgba(52,211,153,0.4)]',
  },
  amber: {
    ring: 'ring-amber-glow/20',
    icon: 'text-amber-glow bg-amber-glow/10',
    value: 'text-amber-glow',
    glow: 'group-hover:shadow-glow-amber',
  },
  neutral: {
    ring: 'ring-white/10',
    icon: 'text-white/60 bg-white/[0.06]',
    value: 'text-white/85',
    glow: 'group-hover:shadow-[0_0_16px_-4px_rgba(255,255,255,0.15)]',
  },
}

export default function MetricCard({ icon: Icon, label, value, sub, accent = 'cyan' }) {
  const a = accentMap[accent] ?? accentMap.cyan
  return (
    <div
      className={`group glass-panel rounded-2xl p-5 flex items-center gap-4 transition-shadow duration-300 ${a.glow}`}
    >
      <div className={`h-11 w-11 shrink-0 rounded-xl grid place-items-center ring-1 ${a.ring} ${a.icon}`}>
        <Icon size={19} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-white/35 truncate">{label}</p>
        <p className={`font-display text-xl font-semibold tabular-nums ${a.value}`}>{value}</p>
        {sub && <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
