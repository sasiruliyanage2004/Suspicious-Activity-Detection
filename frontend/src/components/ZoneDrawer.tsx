import React, { useRef, useState } from 'react'
import { ScanLine, Undo2, Trash2, Check, X } from 'lucide-react'

export default function ZoneDrawer({ onClose, onSave }) {
  const containerRef = useRef(null)
  const [points, setPoints] = useState([])

  const handleClick = (e) => {
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPoints((p) => [...p, { x, y }])
  }

  const undo = (e) => {
    e.stopPropagation()
    setPoints((p) => p.slice(0, -1))
  }

  const clear = (e) => {
    e.stopPropagation()
    setPoints([])
  }

  const polygonStr = points.map((p) => `${p.x}%,${p.y}%`).join(' ')

  return (
    <div className="absolute inset-0 z-20">
      {/* click surface */}
      <div ref={containerRef} onClick={handleClick} className="absolute inset-0 cursor-crosshair">
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {points.length > 1 && (
            <polygon
              points={polygonStr}
              fill="rgba(255,138,0,0.14)"
              stroke="#FF8A00"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />
          )}
          {points.map((p, i) => (
            <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r="4" fill="#FF8A00" stroke="#0B0E13" strokeWidth="1.5" />
          ))}
        </svg>
      </div>

      {/* toolbar */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 glass-panel rounded-full px-2 py-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 px-2.5 text-amber-glow text-[11px] font-mono uppercase tracking-wider">
          <ScanLine size={13} /> Draw Intrusion Zone
        </div>
        <div className="w-px h-5 bg-white/10" />
        <button onClick={undo} className="h-8 w-8 grid place-items-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-ring">
          <Undo2 size={14} />
        </button>
        <button onClick={clear} className="h-8 w-8 grid place-items-center rounded-full text-white/60 hover:text-crimson-glow hover:bg-white/10 transition-colors focus-ring">
          <Trash2 size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSave?.(points)
          }}
          disabled={points.length < 3}
          className="h-8 px-3 flex items-center gap-1.5 rounded-full bg-amber-glow text-obsidian-950 text-[11.5px] font-display font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all focus-ring"
        >
          <Check size={13} /> Save Zone
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose?.()
          }}
          className="h-8 w-8 grid place-items-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-ring"
        >
          <X size={14} />
        </button>
      </div>

      <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] font-mono text-white/40 bg-black/40 rounded-full px-3 py-1">
        Click to place points · minimum 3 points to save
      </p>
    </div>
  )
}
