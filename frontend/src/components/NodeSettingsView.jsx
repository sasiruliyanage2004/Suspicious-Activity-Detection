import React, { useState, useEffect } from 'react'
import { Settings2, Building, Sliders, Send, ShieldCheck, Key, BrainCircuit, ToggleLeft, ToggleRight, Lock, Users, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react'
import DualControlModal from './DualControlModal.jsx'

export default function NodeSettingsView({ sensitivity, onSensitivityChange }) {
  const [license, setLicense] = useState({
    company_name: 'Sasiru Command HQ',
    tenant_id: 'TEN-SASIRU-0001',
    master_admin_email: 'liyanagesasiru@gmail.com',
    telegram_chat_id: '1331146374',
    max_cameras: 32,
    valid_until: '2027-12-31'
  })

  const [features, setFeatures] = useState({
    vehicle_detection: true,
    weapon_detection: true,
    smoking_detection: true,
    violence_detection: true,
    unattended_detection: true,
    loitering_detection: true
  })

  const [retentionDays, setRetentionDays] = useState('30')
  const [showDualControl, setShowDualControl] = useState(false)
  const [purgeSuccess, setPurgeSuccess] = useState(false)
  const [ptzLimit, setPtzLimit] = useState(360)

  const handlePtzLimitChange = (e) => {
    const val = parseInt(e.target.value)
    setPtzLimit(val)
    fetch('http://127.0.0.1:8002/api/settings/ptz_limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: val })
    }).catch(() => {})
  }

  useEffect(() => {
    fetch('/aethra.license.json')
      .then(res => res.json())
      .then(data => setLicense(data))
      .catch(() => {})

    fetch('http://127.0.0.1:8002/api/features')
      .then(res => res.json())
      .then(data => setFeatures(data))
      .catch(() => {})
  }, [])

  const toggleFeature = (key) => {
    const newFeatures = { ...features, [key]: !features[key] }
    setFeatures(newFeatures)
    fetch('http://127.0.0.1:8002/api/features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { [key]: !features[key] } })
    }).catch(() => {})
  }

  return (
    <div className="flex-1 p-6 space-y-6 animate-fade-in text-gray-200 font-sans min-w-0">
      <div className="border-b border-white/10 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2.5 uppercase tracking-wider">
            <Settings2 size={24} className="text-cyan-400 animate-pulse" />
            System &amp; Security Governance
          </h1>
          <p className="font-mono text-xs text-gray-400 mt-1">
            Enterprise Tenant Provisioning, Dual-Control Access Architecture, and AI Sensitivity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <ShieldCheck size={14} />
            <span>ISO/IEC 27001 GOVERNANCE ACTIVE</span>
          </span>
        </div>
      </div>

      {/* Main Governance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dual-Control & Tamper-Proof Audit Policies Panel */}
        <div className="glass-panel rounded-2xl p-6 border border-red-500/40 space-y-5 shadow-[0_0_30px_rgba(255,51,102,0.15)] bg-gradient-to-b from-obsidian-900 to-obsidian-950 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert size={18} className="text-crimson-glow" />
                Tamper-Proof Audit &amp; 2PI Governance
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_0_10px_rgba(255,51,102,0.3)]">
                DUAL-CONTROL MANDATED
              </span>
            </div>

            <p className="text-xs text-gray-400 font-sans leading-relaxed">
              To prevent unauthorized evidence cover-ups or insider database tampering, unilateral log deletion by a single administrator is disabled. Sensitive archival modifications enforce a <strong>Two-Person Integrity (2PI) protocol</strong> requiring simultaneous command verification.
            </p>

            <div className="space-y-3.5 pt-1">
              <div className="bg-black/60 p-3.5 rounded-xl border border-white/10 space-y-2.5 font-mono text-xs shadow-inner">
                <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-wider">Registered Dual-Control Command Hierarchy:</span>
                <div className="flex items-center justify-between text-gray-200 border-b border-white/5 pb-2">
                  <span className="flex items-center gap-1.5"><Lock size={13} className="text-cyan-400"/> Approver 1 (Master CISO)</span>
                  <span className="text-cyan-300 font-bold">{license.master_admin_email}</span>
                </div>
                <div className="flex items-center justify-between text-gray-200">
                  <span className="flex items-center gap-1.5"><Key size={13} className="text-amber-400"/> Approver 2 (Audit Chief)</span>
                  <span className="text-gray-500 italic font-mono text-[11px]">Not Configured</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 bg-black/60 p-3.5 rounded-xl border border-white/10 font-mono text-xs">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-white uppercase">Automated Retention Threshold</span>
                  <p className="text-[10px] text-gray-500 font-sans">Smart FIFO auto-deletion policy for NVR disk space</p>
                </div>
                <select
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(e.target.value)}
                  className="bg-obsidian-800 text-cyan-400 font-bold border border-white/20 rounded-xl px-3 py-2 outline-none cursor-pointer hover:border-cyan-400 transition-all"
                >
                  <option value="14">14 Days FIFO</option>
                  <option value="30">30 Days (Standard)</option>
                  <option value="60">60 Days (Cold Archive)</option>
                  <option value="90">90 Days (Vault Lock)</option>
                </select>
              </div>

              <button
                onClick={() => setShowDualControl(true)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-display font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(255,51,102,0.35)] flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Lock size={15} />
                <span>Initiate Controlled Log &amp; Video Purge (2PI Auth)</span>
              </button>
              {purgeSuccess && (
                <p className="font-mono text-center text-xs text-emerald-400 font-bold animate-pulse pt-1">
                  ✔ Tamper-Proof cryptographic WORM log record appended to forensic ledger.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Stack: Tenant License & AI Controls */}
        <div className="space-y-6 flex flex-col justify-between">
          {/* Tenant License Info */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4 shadow-[0_0_25px_rgba(0,0,0,0.4)]">
            <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Building size={16} className="text-cyan-glow" />
              Active Tenant License Provisioning
            </h2>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <span className="text-gray-400">Licensed Company</span>
                <span className="text-white font-bold">{license.company_name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <span className="text-gray-400">Tenant System ID</span>
                <span className="text-cyan-glow font-bold text-xs bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30 shadow-sm">{license.tenant_id}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <span className="text-gray-400">Authorized Master Admin</span>
                <span className="text-gray-200">{license.master_admin_email}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <span className="text-gray-400">Max Allowed Camera Feeds</span>
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30 shadow-sm">{license.max_cameras} Nodes</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">License Expiry Date</span>
                <span className="text-amber-400 font-bold">{license.valid_until}</span>
              </div>
            </div>
          </div>

          {/* AI Model Controls */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4 shadow-[0_0_25px_rgba(0,0,0,0.4)]">
            <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Sliders size={16} className="text-cyan-glow" />
              Camera &amp; Alert Controls
            </h2>

            <div className="space-y-4 font-mono text-xs">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-gray-400 font-bold text-[11px] uppercase">
                  <span>PTZ Auto-Tracking Max Rotation</span>
                  <span className="text-cyan-400">{ptzLimit}&deg;</span>
                </div>
                <div className="flex items-center gap-4 bg-black/60 border border-white/15 rounded-xl p-3 shadow-inner">
                  <span className="text-gray-500 font-bold">10&deg;</span>
                  <input 
                    type="range" 
                    min="10" max="360" step="10"
                    value={ptzLimit} 
                    onChange={handlePtzLimitChange}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <span className="text-gray-500 font-bold">360&deg;</span>
                </div>
                <p className="text-[10px] text-gray-500 font-sans">
                  Restricts camera rotation during auto-tracking to prevent blind spots and cable snags.
                </p>
              </div>

              <div className="border-t border-white/10 pt-3.5 space-y-2">
                <span className="text-gray-400 font-bold text-[11px] uppercase block">Telegram Real-Time Alert Webhook</span>
                <div className="flex items-center justify-between bg-black/60 border border-white/15 rounded-xl p-3 shadow-inner">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Send size={15} className="text-[#0088cc]" />
                    <span>Target Chat ID: <strong className="text-white font-bold">{license.telegram_chat_id}</strong></span>
                  </div>
                  <span className="text-emerald-400 text-[10px] font-bold bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    CONNECTED
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Features Toggle Section */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4 shadow-[0_0_25px_rgba(0,0,0,0.4)]">
        <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
          <BrainCircuit size={18} className="text-cyan-glow" />
          Active AI Deep-Learning Detection Modules (YOLOv8 Security-PRO)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {[
            { key: 'weapon_detection', label: 'Weapon & Firearm Detection' },
            { key: 'violence_detection', label: 'Violence & Fall Recognition' },
            { key: 'smoking_detection', label: 'Smoking & Thermal Detection' },
            { key: 'vehicle_detection', label: 'License & Vehicle Recognition' },
            { key: 'unattended_detection', label: 'Unattended Luggage / Baggage' },
            { key: 'loitering_detection', label: 'Suspicious Loitering Perimeter' }
          ].map((feature) => (
            <div 
              key={feature.key} 
              onClick={() => toggleFeature(feature.key)}
              className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                features[feature.key] 
                  ? 'bg-gradient-to-r from-cyan-900/30 to-obsidian-900 border-cyan-500/50 shadow-[0_0_15px_rgba(0,255,255,0.15)]' 
                  : 'bg-black/40 border-white/10 hover:border-white/20'
              }`}
            >
              <span className={`font-mono text-xs ${features[feature.key] ? 'text-cyan-300 font-bold' : 'text-gray-400'}`}>
                {feature.label}
              </span>
              {features[feature.key] ? (
                <ToggleRight size={22} className="text-cyan-400" />
              ) : (
                <ToggleLeft size={22} className="text-gray-600" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* RENDER DUAL CONTROL AUTHORIZATION MODAL */}
      {showDualControl && (
        <DualControlModal
          onClose={() => setShowDualControl(false)}
          onSuccess={() => setPurgeSuccess(true)}
          actionTitle="Tamper-Proof Audit Trail Purge & Retention Policy Override"
        />
      )}
    </div>
  )
}
