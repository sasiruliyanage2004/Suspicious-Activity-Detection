import React, { useState, useEffect } from 'react'
import { Settings2, Building, Sliders, Send, Database, ShieldCheck, Key, BrainCircuit, ToggleLeft, ToggleRight } from 'lucide-react'

export default function NodeSettingsView({ sensitivity, onSensitivityChange }) {
  const [license, setLicense] = useState({
    company_name: 'Dialog Axiata HQ',
    tenant_id: 'TEN-DIALOG-98201',
    master_admin_email: 'security_admin@dialog.lk',
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
    })
  }

  return (
    <div className="flex-1 p-6 space-y-6 animate-fade-in max-w-4xl">
      <div className="border-b border-white/10 pb-5">
        <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <Settings2 size={22} className="text-cyan-glow" />
          SYSTEM &amp; NODE CONFIGURATION
        </h1>
        <p className="font-mono text-xs text-gray-400 mt-1">
          Enterprise Tenant License, AI Detection Sensitivity, and Bot Webhooks
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tenant License Info */}
        <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
          <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Building size={16} className="text-cyan-glow" />
            Active License Provisioning
          </h2>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-gray-400">Licensed Company</span>
              <span className="text-white font-bold">{license.company_name}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-gray-400">Tenant System ID</span>
              <span className="text-cyan-glow font-bold">{license.tenant_id}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-gray-400">Authorized Master Admin</span>
              <span className="text-gray-200">{license.master_admin_email}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-gray-400">Max Allowed Camera Feeds</span>
              <span className="text-emerald-400 font-bold">{license.max_cameras} Nodes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">License Expiry Date</span>
              <span className="text-amber-400 font-bold">{license.valid_until}</span>
            </div>
          </div>
        </div>

        {/* AI Model Controls */}
        <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
          <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders size={16} className="text-cyan-glow" />
            AI Detection Sensitivity
          </h2>

          <div className="space-y-4 font-mono text-xs">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Global AI Confidence Threshold</span>
                <span className="text-cyan-glow font-bold">{sensitivity}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={99}
                value={sensitivity}
                onChange={(e) => onSensitivityChange?.(Number(e.target.value))}
                className="w-full accent-cyan-glow cursor-pointer"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Higher sensitivity reduces false positives; lower sensitivity increases detection range.
              </p>
            </div>

            <div className="border-t border-white/10 pt-3 space-y-2">
              <span className="text-gray-400 font-bold text-[10px] uppercase">Telegram Alert Webhook</span>
              <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl p-2.5">
                <div className="flex items-center gap-2 text-gray-300">
                  <Send size={14} className="text-[#0088cc]" />
                  <span>Target Chat ID: {license.telegram_chat_id}</span>
                </div>
                <span className="text-emerald-400 text-[10px] font-bold">CONNECTED</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Features Toggle Section */}
      <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
        <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <BrainCircuit size={16} className="text-cyan-glow" />
          Active AI Detection Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: 'weapon_detection', label: 'Weapon Detection' },
            { key: 'violence_detection', label: 'Violence & Fall Detection' },
            { key: 'smoking_detection', label: 'Smoking Detection' },
            { key: 'vehicle_detection', label: 'Vehicle Recognition' },
            { key: 'unattended_detection', label: 'Unattended Luggage' },
            { key: 'loitering_detection', label: 'Suspicious Loitering' }
          ].map((feature) => (
            <div 
              key={feature.key} 
              onClick={() => toggleFeature(feature.key)}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                features[feature.key] 
                  ? 'bg-cyan-900/20 border-cyan-500/50 shadow-[0_0_15px_rgba(0,255,255,0.1)]' 
                  : 'bg-black/40 border-white/10 hover:border-white/20'
              }`}
            >
              <span className={`font-mono text-xs ${features[feature.key] ? 'text-cyan-400 font-bold' : 'text-gray-400'}`}>
                {feature.label}
              </span>
              {features[feature.key] ? (
                <ToggleRight size={20} className="text-cyan-400" />
              ) : (
                <ToggleLeft size={20} className="text-gray-500" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
