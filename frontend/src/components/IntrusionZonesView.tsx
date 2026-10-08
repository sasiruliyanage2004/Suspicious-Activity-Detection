import React, { useState, useRef, useMemo, useEffect } from 'react'
import { ScanLine, Plus, Save, Trash2, Camera, Lock, CheckCircle2, ShieldAlert, Layers, MousePointer, RefreshCw, AlertTriangle } from 'lucide-react'
import { safeFetch, AI_URL } from '../utils/api'

export default function IntrusionZonesView({ cameras = [] }) {
  const [selectedCam, setSelectedCam] = useState(cameras?.[0]?.id || 1)
  const [zones, setZones] = useState(() => {
    try {
      const stored = localStorage.getItem('aethra_restricted_zones');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Ensure all parsed zones have valid coords and types
          return parsed.filter(z => z && typeof z === 'object').map(z => ({
            ...z,
            name: z.name || 'Unknown Zone',
            type: z.type || 'Warning (Yellow Zone)',
            coords: z.coords || { x1: 0, y1: 0, x2: 0, y2: 0 }
          }));
        }
      }
    } catch { /* fallback */ }
    return [
      { id: 1, camId: 1, name: 'Main Entrance Doorway', type: 'High Security (Red Zone)', coords: { x1: 20, y1: 15, x2: 75, y2: 85 } },
      { id: 2, camId: 2, name: 'Vault Security Hall', type: 'Warning (Yellow Zone)', coords: { x1: 10, y1: 20, x2: 65, y2: 75 } }
    ];
  });

  const [zoneName, setZoneName] = useState('')
  const [alarmType, setAlarmType] = useState('CRITICAL_TRIPWIRE')
  const [toast, setToast] = useState('')

  const flashToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Interactive mouse drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<any>(null)
  const [currentRect, setCurrentRect] = useState<any>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // Sync zones to localStorage and live AI Pipeline backend
  useEffect(() => {
    localStorage.setItem('aethra_restricted_zones', JSON.stringify(zones));
    if (Array.isArray(zones) && zones.length > 0) {
      zones.forEach((z: any) => {
        if (z && z.coords) {
          safeFetch(`${AI_URL}/api/zones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: z.id,
              camera_id: z.camId || 1,
              zone_label: z.name,
              coordinates: z.coords,
              alarm_level: z.type?.includes('Red') ? 'CRITICAL_TRIPWIRE' : 'WARNING_ZONE'
            })
          }, 2000).catch(() => {})
        }
      })
    }
  }, [zones]);

  const camObj = useMemo(() => {
    return cameras?.find((c: any) => c.id === Number(selectedCam)) || null
  }, [cameras, selectedCam])

  const camZones = useMemo(() => {
    return (Array.isArray(zones) ? zones : []).filter((z: any) => z && typeof z === 'object' && z.camId === Number(selectedCam))
  }, [zones, selectedCam])

  // Handle Mouse Down - start drawing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasContainerRef.current) return
    const rect = canvasContainerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    setIsDrawing(true)
    setStartPoint({ x, y })
    setCurrentRect({ x1: x, y1: y, x2: x, y2: y })
  }

  // Handle Mouse Move - stretch rectangle/line
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPoint || !canvasContainerRef.current) return
    const rect = canvasContainerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    
    setCurrentRect({
      x1: Math.min(startPoint.x, x),
      y1: Math.min(startPoint.y, y),
      x2: Math.max(startPoint.x, x),
      y2: Math.max(startPoint.y, y)
    })
  }

  // Handle Mouse Up - lock in coordinate box & auto-fill zone name if blank
  const handleMouseUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (!zoneName.trim() && currentRect) {
      setZoneName(`Restricted Zone ${camZones.length + 1}`)
    }
  }

  const handleAddZone = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentRect || Math.abs(currentRect.x2 - currentRect.x1) < 2) {
      flashToast('⚠️ Please click and drag on the camera video preview to draw your zone box!')
      return
    }

    const finalName = zoneName.trim() || `Restricted Zone ${camZones.length + 1}`
    const x1 = Math.round(Math.min(currentRect.x1, currentRect.x2))
    const x2 = Math.round(Math.max(currentRect.x1, currentRect.x2))
    const y1 = Math.round(Math.min(currentRect.y1, currentRect.y2))
    const y2 = Math.round(Math.max(currentRect.y1, currentRect.y2))

    const newZone = {
      id: Date.now(),
      camId: Number(selectedCam),
      name: finalName,
      type: alarmType === 'CRITICAL_TRIPWIRE' ? 'High Security (Red Zone)' : 'Warning (Yellow Zone)',
      coords: { x1, y1, x2, y2 },
      camera: camObj ? `${camObj.code} (${camObj.location})` : `CAM-0${selectedCam}`
    }

    const updated = [...zones, newZone]
    setZones(updated)
    setZoneName('')
    setCurrentRect(null)
    flashToast(`🛡️ Active Zone "${finalName}" successfully armed & activated!`)

    // Notify backend AI detection engine of new perimeter coordinates
    safeFetch(`${AI_URL}/api/zones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newZone.id,
        camera_id: selectedCam,
        zone_label: newZone.name,
        coordinates: newZone.coords,
        alarm_level: alarmType
      })
    }, 2000).catch(() => {})
  }

  const handleDeleteZone = (id: any) => {
    setZones((prev: any) => prev.filter((z: any) => z.id !== id))
    safeFetch(`${AI_URL}/api/zones/${id}`, { method: 'DELETE' }, 2000).catch(() => {})
    flashToast('🗑️ Zone removed')
  }

  return (
    <div className="flex-1 min-w-0 p-6 space-y-6 animate-fade-in text-gray-200 font-sans relative">
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-cyan-400 text-obsidian-950 font-bold text-xs animate-rise z-50 shadow-[0_0_20px_rgba(0,255,255,0.6)]">
          {toast}
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2.5 uppercase tracking-wider">
            <ScanLine size={24} className="text-cyan-400 animate-pulse" />
            Restricted Zones Setup
          </h1>
          <p className="font-mono text-xs text-gray-400 mt-1">
            Draw virtual boxes on camera views to immediately detect and alert when unauthorized people enter restricted areas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold border flex items-center gap-1.5 ${
            camZones.length > 0 
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'bg-white/5 text-gray-400 border-white/10'
          }`}>
            {camZones.length > 0 ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{camZones.length} RESTRICTED ZONES ACTIVE</span>
              </>
            ) : (
              <span>⚪ NO ZONES SETUP FOR THIS CAMERA</span>
            )}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Drawing Canvas / Preview (2 Cols) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-4 border border-white/10 space-y-3 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col">
          <div className="flex justify-between items-center font-mono text-xs text-gray-300 px-1">
            <span className="flex items-center gap-2 font-bold text-white">
              <Camera size={15} className="text-cyan-400" />
              <span>SELECTED CAMERA VIEW: <strong className="text-cyan-400">{camObj ? `${camObj.code} (${camObj.location})` : `CAM-0${selectedCam}`}</strong></span>
            </span>
            <span className="text-[11px] text-amber-300 font-mono flex items-center gap-1">
              <MousePointer size={13} className="animate-bounce" />
              <span>Click &amp; drag below to draw zone</span>
            </span>
          </div>

          {/* Canvas Box */}
          <div
            ref={canvasContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="relative w-full aspect-video rounded-xl bg-obsidian-950 overflow-hidden border border-white/15 shadow-inner select-none cursor-crosshair group flex items-center justify-center"
          >
            {/* Live Camera Background Stream */}
            {camObj && camObj.streamUrl ? (
              <img
                src={camObj.streamUrl || `http://127.0.0.1:8002/api/video_feed/${camObj.id}`}
                alt={camObj.code}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  setTimeout(() => {
                    if (target && camObj?.streamUrl) target.src = `${camObj.streamUrl}?t=${Date.now()}`;
                  }, 1500);
                }}
              />
            ) : null}

            {/* Sub-grid measurement overlay background */}
            <div className="absolute inset-0 opacity-25 pointer-events-none bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:32px_32px]" />

            {/* Offline notification if camera is disconnected */}
            {(!camObj || !camObj.streamUrl) && (
              <div className="z-0 flex flex-col items-center justify-center text-center p-6 space-y-2 pointer-events-none">
                <ScanLine size={36} className="text-white/15" />
                <p className="font-mono text-xs font-bold text-gray-400 uppercase tracking-wide">
                  Camera Feed Offline &mdash; Setup Mode Ready
                </p>
                <p className="font-mono text-[11px] text-gray-500 max-w-sm">
                  You can still draw restricted zone boxes on the video frame above. Alarms will automatically activate when the camera connects.
                </p>
              </div>
            )}

            {/* Render Already Configured Armed Zones */}
            {camZones.filter(z => z && z.coords).map((z) => (
              <div
                key={z.id}
                style={{
                  left: `${z.coords.x1}%`,
                  top: `${z.coords.y1}%`,
                  width: `${Math.max(z.coords.x2 - z.coords.x1, 2)}%`,
                  height: `${Math.max(z.coords.y2 - z.coords.y1, 2)}%`,
                }}
                className={`absolute border-2 transition-all pointer-events-none rounded flex flex-col justify-between p-1.5 overflow-hidden ${
                  String(z.type || '').includes('Red') 
                    ? 'border-crimson-glow border-dashed bg-crimson-glow/20 shadow-[0_0_20px_rgba(255,51,102,0.4)]'
                    : 'border-amber-400 border-dashed bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-white font-bold max-w-fit shadow">
                  <Lock size={11} className={String(z.type || '').includes('Red') ? 'text-crimson-glow' : 'text-amber-400'} />
                  <span className="truncate">{z.name}</span>
                </div>
                <div className="text-[9px] font-mono bg-black/60 px-1 rounded max-w-fit text-cyan-300 opacity-80">
                  [{z.coords.x1}%, {z.coords.y1}% &rarr; {z.coords.x2}%, {z.coords.y2}%]
                </div>
              </div>
            ))}

            {/* Currently Drawing Live Rect Box */}
            {currentRect && (
              <div
                style={{
                  left: `${currentRect.x1}%`,
                  top: `${currentRect.y1}%`,
                  width: `${Math.max(currentRect.x2 - currentRect.x1, 1)}%`,
                  height: `${Math.max(currentRect.y2 - currentRect.y1, 1)}%`,
                }}
                className="absolute border-2 border-cyan-400 bg-cyan-400/25 rounded pointer-events-none animate-pulse shadow-[0_0_15px_rgba(0,255,255,0.5)] flex items-center justify-center text-center"
              >
                <span className="px-2 py-1 rounded bg-black/80 text-cyan-300 font-mono text-[10px] font-bold shadow">
                  Drawing Zone... [{Math.round(currentRect.x1)}%, {Math.round(currentRect.y1)}%]
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-gray-400 px-1 pt-1">
            <span>💡 Tip: Click and drag your mouse over doors, fences, or high-value areas to draw an alert box.</span>
            {currentRect && (
              <button
                onClick={() => setCurrentRect(null)}
                className="text-red-400 hover:text-red-300 font-bold underline"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>

        {/* Configuration Panel (1 Col) */}
        <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-5 shadow-[0_0_25px_rgba(0,0,0,0.4)] flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Plus size={16} className="text-cyan-400" />
              Add New Restricted Zone
            </h2>

            <form onSubmit={handleAddZone} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[11px] text-gray-300 font-bold uppercase flex items-center gap-1.5">
                  <Camera size={13} className="text-cyan-400" />
                  Select Camera
                </label>
                <select
                  value={selectedCam}
                  onChange={(e) => {
                    setSelectedCam(Number(e.target.value))
                    setCurrentRect(null)
                  }}
                  style={{ backgroundColor: '#090e1a', color: '#ffffff' }}
                  className="bg-[#090e1a] border border-cyan-400/40 text-xs font-mono text-white font-semibold rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-md"
                >
                  {cameras?.length > 0 ? (
                    cameras.map((c: any) => (
                      <option key={c.id} value={c.id} style={{ backgroundColor: '#090e1a', color: '#ffffff' }}>
                        {c.code} &mdash; {c.location}
                      </option>
                    ))
                  ) : (
                    <option value="1" style={{ backgroundColor: '#090e1a', color: '#ffffff' }}>
                      CAM-01 (Main Gate)
                    </option>
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[11px] text-gray-300 font-bold uppercase">Zone Name / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Vault Entrance Doorway"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  style={{ backgroundColor: '#090e1a', color: '#ffffff' }}
                  className="bg-[#090e1a] border border-white/20 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder:text-gray-500 font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[11px] text-gray-300 font-bold uppercase">Alarm Alert Level</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAlarmType('CRITICAL_TRIPWIRE')}
                    className={`p-2.5 rounded-xl text-[11px] font-mono font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      alarmType === 'CRITICAL_TRIPWIRE'
                        ? 'bg-crimson-glow/20 border-crimson-glow/60 text-crimson-glow shadow-[0_0_15px_rgba(255,51,102,0.3)]'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <span>🚨 HIGH SECURITY</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlarmType('WARNING_ZONE')}
                    className={`p-2.5 rounded-xl text-[11px] font-mono font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      alarmType === 'WARNING_ZONE'
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <span>⚠️ WARNING</span>
                  </button>
                </div>
              </div>

              {/* Coordinates Preview Box */}
              <div className="p-3 rounded-xl bg-obsidian-900/80 border border-white/10 font-mono text-xs text-gray-300 space-y-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Box Position Coordinates:</span>
                {currentRect && Math.abs(currentRect.x2 - currentRect.x1) >= 2 ? (
                  <div className="text-cyan-300 font-bold flex items-center justify-between">
                    <span>X: {Math.round(currentRect.x1)}% &rarr; {Math.round(currentRect.x2)}%</span>
                    <span>Y: {Math.round(currentRect.y1)}% &rarr; {Math.round(currentRect.y2)}%</span>
                  </div>
                ) : (
                  <span className="text-amber-400/90 text-[11px] italic">No box drawn yet. Click and drag on the camera video on the left.</span>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-400 hover:from-cyan-500 hover:to-cyan-300 text-obsidian-950 font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,255,255,0.4)] cursor-pointer"
              >
                <Save size={16} /> Save &amp; Activate Zone
              </button>
            </form>
          </div>

          {/* Active Configured Zones List */}
          <div className="border-t border-white/10 pt-4 space-y-2.5">
            <h3 className="font-mono text-xs text-gray-300 uppercase font-bold flex items-center justify-between">
              <span>Active Zones List</span>
              <span className="text-cyan-400">({camZones.length})</span>
            </h3>
            <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
              {camZones.length === 0 ? (
                <p className="text-gray-500 font-mono text-xs text-center py-6 border border-white/5 rounded-xl bg-obsidian-900/40 leading-relaxed px-4">
                  No restricted zones set for this camera. Draw a box on the view above and click Save.
                </p>
              ) : (
                camZones.filter(z => z && z.coords).map((z) => (
                  <div
                    key={z.id}
                    className="bg-black/60 border border-white/15 rounded-xl p-3 flex items-center justify-between text-xs font-mono hover:border-cyan-400/50 transition-all group shadow-sm"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${String(z.type || '').includes('Red') ? 'bg-crimson-glow animate-ping' : 'bg-amber-400'}`} />
                        <p className="text-white font-bold truncate">{z.name}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 truncate">
                        Coords: [{z.coords.x1}%, {z.coords.y1}% &rarr; {z.coords.x2}%, {z.coords.y2}%] &bull; <strong className={String(z.type || '').includes('Red') ? 'text-crimson-glow' : 'text-amber-400'}>{z.type}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteZone(z.id)}
                      title="Remove Restricted Zone"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500 hover:text-white text-gray-400 transition-all shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
