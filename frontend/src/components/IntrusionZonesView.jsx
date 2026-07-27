import React, { useState } from 'react'
import { ScanLine, Plus, Save, Trash2, Camera, Lock } from 'lucide-react'

export default function IntrusionZonesView({ cameras }) {
  const [selectedCam, setSelectedCam] = useState(cameras?.[0]?.id || 1)
  const [zones, setZones] = useState([
    { id: 1, name: 'Restricted Vault Corridor', type: 'No-Entry Red Zone', camera: 'CAM-01 (Main Entrance Gate)' },
    { id: 2, name: 'Fence Line Crossing Boundary', type: 'Perimeter Line', camera: 'CAM-02 (North Parking Lot)' },
  ])
  const [zoneName, setZoneName] = useState('')

  const handleAddZone = (e) => {
    e.preventDefault()
    if (!zoneName.trim()) return
    const camObj = cameras?.find(c => c.id === selectedCam)
    const newZone = {
      id: Date.now(),
      name: zoneName.trim(),
      type: 'Restricted Intrusion Zone',
      camera: camObj ? `${camObj.code} (${camObj.location})` : `CAM-0${selectedCam}`
    }
    setZones([...zones, newZone])
    setZoneName('')
  }

  const handleDeleteZone = (id) => {
    setZones(zones.filter(z => z.id !== id))
  }

  return (
    <div className="flex-1 p-6 space-y-6 animate-fade-in">
      <div className="border-b border-white/10 pb-5">
        <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <ScanLine size={22} className="text-cyan-glow" />
          INTRUSION ZONES &amp; BOUNDARY MAPPING
        </h1>
        <p className="font-mono text-xs text-gray-400 mt-1">
          Draw and configure interactive virtual tripwires and restricted perimeter zones
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas / Preview */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-4 border border-white/10 space-y-3">
          <div className="flex justify-between items-center font-mono text-xs text-gray-300">
            <span className="flex items-center gap-2">
              <Camera size={15} className="text-cyan-glow" />
              LIVE OVERLAY CANVAS: CAM-0{selectedCam}
            </span>
            <span className="text-emerald-400 font-bold">● VIRTUAL BOUNDARY ACTIVE</span>
          </div>

          <div className="relative aspect-video rounded-xl bg-black overflow-hidden ring-1 ring-white/10 flex items-center justify-center">
            {/* Grid overlay background */}
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
            
            {/* Draw tripwire simulation line */}
            <div className="absolute top-1/3 left-10 right-10 border-t-2 border-dashed border-red-500 flex items-center justify-between px-2">
              <span className="bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-0.5 text-[9px] font-mono rounded font-bold">
                ⚠️ RESTRICTED LINE CROSSING TRIPWIRE #1
              </span>
              <Lock size={14} className="text-red-400" />
            </div>

            <p className="font-mono text-xs text-gray-500">
              Click &amp; Drag on camera feed to draw custom polygonal intrusion zones.
            </p>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
          <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider">
            Add New Intrusion Zone
          </h2>

          <form onSubmit={handleAddZone} className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] text-gray-400 uppercase">Target Camera Node</label>
              <select
                value={selectedCam}
                onChange={(e) => setSelectedCam(Number(e.target.value))}
                className="bg-[#12161D] border border-white/10 text-xs font-mono text-white rounded-xl px-3 py-2 outline-none"
              >
                {cameras?.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.location}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] text-gray-400 uppercase">Zone Label Name</label>
              <input
                type="text"
                placeholder="e.g. Back Entrance Perimeter"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full h-10 rounded-xl bg-cyan-glow text-obsidian-950 font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:brightness-110 transition-all"
            >
              <Plus size={15} /> Add Intrusion Zone
            </button>
          </form>

          <div className="border-t border-white/10 pt-3 space-y-2">
            <h3 className="font-mono text-[10px] text-gray-400 uppercase">Active Configured Zones ({zones.length})</h3>
            <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar">
              {zones.map(z => (
                <div key={z.id} className="bg-black/40 border border-white/10 rounded-xl p-2.5 flex items-center justify-between text-xs font-mono">
                  <div>
                    <p className="text-white font-bold">{z.name}</p>
                    <p className="text-[10px] text-gray-400">{z.camera}</p>
                  </div>
                  <button onClick={() => handleDeleteZone(z.id)} className="text-red-400 hover:text-red-300 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
