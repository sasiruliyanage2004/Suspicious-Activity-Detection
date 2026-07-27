import React from 'react'
import { PersonStanding } from 'lucide-react'

function DigitCounter({ value, digits = 6 }) {
  const str = String(value).padStart(digits, '0')
  return (
    <div className="flex gap-1">
      {str.split('').map((d, i) => (
        <span
          key={i}
          className="w-6 sm:w-7 h-9 sm:h-10 grid place-items-center rounded-md bg-black/40 ring-1 ring-white/[0.06] font-mono text-lg sm:text-xl text-cyan-glow text-glow-cyan"
        >
          {d}
        </span>
      ))}
    </div>
  )
}

export default function OccupancyPanel({ inside = 0, capacity = 100 }) {
  return (
    <div className="glass-panel rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-full bg-emerald-400/25 blur-xl" />
          <div className="relative h-14 w-14 rounded-full bg-emerald-400/10 ring-1 ring-emerald-400/40 grid place-items-center">
            <PersonStanding size={28} className="text-emerald-400" strokeWidth={2.2} />
          </div>
        </div>
        <div>
          <p className="font-display text-[15px] font-semibold text-white">Welcome!</p>
          <p className="font-mono text-[10px] tracking-[0.15em] text-white/35 uppercase">Sector Occupancy — Live</p>
        </div>
      </div>

      <div className="hidden sm:block w-px self-stretch bg-white/[0.06]" />

      <div className="flex flex-1 flex-wrap items-center gap-8">
        <div>
          <p className="font-mono text-[10px] tracking-[0.15em] text-white/35 uppercase mb-1.5">People Inside</p>
          <DigitCounter value={inside} />
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-[0.15em] text-white/35 uppercase mb-1.5">Remaining Capacity</p>
          <DigitCounter value={capacity} />
        </div>
      </div>
    </div>
  )
}
