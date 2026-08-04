import React, { useState } from 'react'
import { Zap, ShieldAlert, AlertTriangle, UserX, Crosshair, Package, Play, CheckCircle2, X, Send, Volume2 } from 'lucide-react'
import { speechSiren } from '../utils/speechSiren.js'

const THREAT_PRESETS = [
  {
    id: 'weapon',
    title: 'Pistol / Knife Weapon Detection',
    behavior: 'Pistol Detected',
    confidence: 0.75,
    icon: Crosshair,
    color: 'border-red-500/60 text-red-400 bg-red-950/20 hover:bg-red-950/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]',
    badgeBg: 'bg-red-500 text-black',
    desc: 'Simulates instantaneous firearm or edged weapon reconnaissance in high-security perimeter. Dispatches emergency Telegram 2FA photo verification.'
  },
  {
    id: 'loiter',
    title: 'Suspicious Loitering Perimeter Breach',
    behavior: 'Suspicious Activity Detected',
    confidence: 0.75,
    icon: AlertTriangle,
    color: 'border-amber-500/60 text-amber-400 bg-amber-950/20 hover:bg-amber-950/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]',
    badgeBg: 'bg-amber-500 text-black',
    desc: 'Simulates stationary human loitering exceeding 60-second threshold in restricted tactical watch zone.'
  },
  {
    id: 'violence',
    title: 'Physical Violence & Altercation Test',
    behavior: 'Violence Detected',
    confidence: 0.75,
    icon: ShieldAlert,
    color: 'border-orange-500/60 text-orange-400 bg-orange-950/20 hover:bg-orange-950/40 shadow-[0_0_20px_rgba(249,115,22,0.2)]',
    badgeBg: 'bg-orange-500 text-black',
    desc: 'Simulates multi-subject rapid physical confrontation and aggressive kinetic movement between tracked IDs.'
  },
  {
    id: 'fall',
    title: 'Worker / Citizen Emergency Fall Test',
    behavior: 'Falling Detected',
    confidence: 0.75,
    icon: UserX,
    color: 'border-purple-500/60 text-purple-400 bg-purple-950/20 hover:bg-purple-950/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]',
    badgeBg: 'bg-purple-500 text-white',
    desc: 'Simulates verified horizontal biomechanical collapse of individual requiring urgent medical & intervention dispatch.'
  },
  {
    id: 'unattended',
    title: 'Unattended Luggage / Abandoned Package',
    behavior: 'Unattended Object Left Behind',
    confidence: 0.75,
    icon: Package,
    color: 'border-cyan-500/60 text-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/40 shadow-[0_0_20px_rgba(6,182,212,0.2)]',
    badgeBg: 'bg-cyan-400 text-black',
    desc: 'Simulates detection of abandoned suitcase or backpack left stationary with no identified owner nearby for >4.0s.'
  }
]

export default function DemoSimulatorModal({ onClose, cameras = [] }) {
  const [selectedCam, setSelectedCam] = useState('CAM-01')
  const [loadingId, setLoadingId] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleTrigger = async (preset) => {
    setLoadingId(preset.id)
    setSuccessMsg('')
    setErrorMsg('')

    try {
      // Trigger native AI Voice Siren announcement on stage
      speechSiren.speakAlarm(preset.behavior, selectedCam)

      // Invoke Port 8002 simulation endpoint
      const payload = {
        camera_id: selectedCam,
        behavior_type: preset.behavior,
        confidence: preset.confidence,
        details: `[EXECUTIVE DEMO] ${preset.desc}`
      }

      let res = await fetch('http://127.0.0.1:8002/api/simulate/threat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      // Fallback directly to Port 8000 backend alerts if pipeline port is resetting
      if (!res.ok) {
        res = await fetch('http://127.0.0.1:8000/alerts/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            camera_id: selectedCam,
            behavior_type: preset.behavior,
            confidence: preset.confidence,
            details: `[EXECUTIVE DEMO] ${preset.desc}`
          })
        })
      }

      if (res.ok) {
        setSuccessMsg(`✅ DEPLOYED: "${preset.title}" successfully broadcasted across Command Grid & Telegram 2FA!`)
        setTimeout(() => setSuccessMsg(''), 6000)
      } else {
        setErrorMsg('Notice: Server responded with non-200 status during test dispatch.')
      }
    } catch (err) {
      console.warn("Simulator dispatch info:", err)
      setSuccessMsg(`⚡ OFFLINE SIMULATION: "${preset.title}" triggered audibly via Command AI Siren voice engine!`)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-3xl glass-panel p-7 border border-cyan-500/30 shadow-[0_0_80px_rgba(6,182,212,0.25)] flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-5 border-b border-white/10 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-obsidian-950 shadow-glow-cyan shrink-0">
              <Zap size={24} className="animate-pulse text-black" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white tracking-wide uppercase flex items-center gap-2">
                AETHRA VISION <span className="text-cyan-glow">DEMO COMMAND SANDBOX</span>
              </h2>
              <p className="text-xs font-mono text-gray-400">
                Interactive real-time threat injection & verification console for executive presentations & field evaluation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Camera Selector Pills */}
        <div className="mb-5 flex flex-wrap items-center gap-3 bg-obsidian-950/80 p-3 rounded-2xl border border-white/5">
          <span className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider pl-1">
            📡 Target Sector Camera:
          </span>
          <div className="flex items-center gap-2">
            {['CAM-01', 'CAM-02', 'CAM-03', 'CAM-04'].map((camId) => (
              <button
                key={camId}
                onClick={() => setSelectedCam(camId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                  selectedCam === camId
                    ? 'bg-cyan-glow text-obsidian-950 shadow-glow-cyan'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {camId}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[11px] font-mono text-cyan-400 flex items-center gap-1">
            <Volume2 size={13} /> AI Voice Siren Enabled
          </span>
        </div>

        {/* Status Feedback Banner */}
        {successMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2.5 animate-bounce">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        {/* Preset Cards Scroll List */}
        <div className="overflow-y-auto space-y-3.5 pr-1 flex-1 custom-scrollbar">
          {THREAT_PRESETS.map((preset) => {
            const IconComponent = preset.icon
            const isRunning = loadingId === preset.id

            return (
              <div
                key={preset.id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${preset.color}`}
              >
                <div className="flex items-start gap-3.5 flex-1">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 shrink-0 mt-0.5">
                    <IconComponent size={22} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-sm tracking-wide text-white">
                        {preset.title}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-extrabold uppercase ${preset.badgeBg}`}>
                        {(preset.confidence * 100).toFixed(0)}% AI Confidence
                      </span>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                      {preset.desc}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleTrigger(preset)}
                  disabled={isRunning}
                  className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-obsidian-950 font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shrink-0 active:scale-95 disabled:opacity-50"
                >
                  {isRunning ? (
                    <span className="animate-pulse">Deploying...</span>
                  ) : (
                    <>
                      <Play size={14} className="fill-current" />
                      <span>Deploy Simulation</span>
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-gray-400">
          <span>🛡️ ENTERPRISE COMMAND GRID EVALUATION SANDBOX v2.4</span>
          <span className="text-cyan-glow">READY FOR FRIDAY PRESENTATION</span>
        </div>

      </div>
    </div>
  )
}
