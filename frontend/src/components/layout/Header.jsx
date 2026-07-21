import React from 'react';

export default function Header({ timeStr, isMuted, setIsMuted, sensitivity, handleSensitivityChange, onLogout }) {
  return (
    <header className="bg-[#070b14]/60 backdrop-blur-xl w-full h-16 border-b border-white/10 flex justify-between items-center px-margin-edge sticky top-0 z-50 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-8">
        <span className="font-label-caps text-label-caps font-bold text-primary tracking-widest uppercase glow-cyan">AEGIS_COMMAND</span>
        <div className="flex items-center gap-4 border-l border-white/10 pl-6 h-8 hidden md:flex">
          <span className="font-data-mono text-data-mono text-primary-fixed-dim bg-primary/10 px-3 py-1 rounded-sm border border-primary/20 animate-[pulse-glow_3s_infinite]">SYSTEM ONLINE</span>
          <div className="flex items-center gap-3">
            <span className="font-label-caps text-[10px] text-on-surface-variant">CONFIDENCE_THRESHOLD</span>
            <input type="range" min="0" max="100" value={sensitivity} onChange={handleSensitivityChange} className="w-32 h-1 bg-surface-variant rounded-full appearance-none cursor-pointer accent-primary-fixed-dim"/>
            <span className="font-data-mono text-data-mono text-primary">{sensitivity}%</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end">
          <span className="font-data-mono text-data-mono text-primary tracking-tighter">{timeStr}</span>
          <span className="font-label-caps text-[9px] text-on-surface-variant tracking-widest">REALTIME_SYNC_ENABLED</span>
        </div>
        <div className="flex gap-4 border-l border-white/10 pl-6 items-center">
          <span 
            onClick={() => setIsMuted(!isMuted)} 
            className={`material-symbols-outlined cursor-pointer transition-all ${isMuted ? 'text-secondary hover:text-secondary/80' : 'text-on-surface-variant hover:text-primary'}`}
            title={isMuted ? "Unmute Voice Alerts" : "Mute Voice Alerts"}
          >
            {isMuted ? 'notifications_off' : 'notifications_active'}
          </span>
          <span className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer transition-all">admin_panel_settings</span>
        </div>
        <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded border border-white/5">
          <div className="w-8 h-8 rounded-sm bg-surface-container-high border border-primary/20 overflow-hidden flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">shield_person</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-caps text-[11px] leading-none text-primary">Admin</span>
            <button onClick={onLogout} className="font-label-caps text-[9px] leading-none text-on-surface-variant hover:text-secondary cursor-pointer transition-colors mt-1 uppercase text-left">LOG_OUT</button>
          </div>
        </div>
      </div>
    </header>
  );
}
