import React, { useEffect, useState } from 'react'
import { Tv, X } from 'lucide-react'
import CameraTile from './CameraTile'
import CameraExpandedView from './CameraExpandedView'

export default function TVWallMode({ cameras, onExit, onRename }) {
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (expanded) setExpanded(null)
        else onExit?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded, onExit])

  return (
    <div className="fixed inset-0 z-40 bg-obsidian-950 p-3 sm:p-4">
      <div className="h-full grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cameras.map((camera, i) => (
          <CameraTile
            key={camera.id}
            camera={camera}
            index={i}
            onExpand={setExpanded}
            onRename={onRename}
          />
        ))}
      </div>

      {/* Floating HUD pill */}
      <div className="fixed top-5 right-5 flex items-center gap-3 glass-panel rounded-full pl-4 pr-2 py-2 z-50">
        <div className="flex items-center gap-2 text-cyan-glow">
          <Tv size={14} />
          <span className="font-mono text-[10.5px] tracking-[0.15em] uppercase">
            TV Video Wall Mode <span className="text-white/40">· 4K Fullscreen</span>
          </span>
        </div>
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/[0.06] hover:bg-crimson-glow/20 hover:text-crimson-glow ring-1 ring-white/10 text-white/60 text-[11px] font-mono uppercase tracking-wider transition-all focus-ring"
        >
          <X size={12} /> Exit (Esc)
        </button>
      </div>

      {expanded && <CameraExpandedView camera={expanded} index={cameras.indexOf(expanded)} onClose={() => setExpanded(null)} />}
    </div>
  )
}
