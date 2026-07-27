import React, { useState, useEffect } from 'react';

function LiveClock() {
  const [timeStr, setTimeStr] = useState(() => new Date().toLocaleTimeString('en-GB', { hour12: false }) + ' GMT');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString('en-GB', { hour12: false }) + ' GMT');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <span className="font-mono-data text-xs text-[#0EA5E9] font-bold tracking-tight">{timeStr}</span>;
}

export default function Header({ timeStr: initialTime, isMuted, setIsMuted, sensitivity, handleSensitivityChange, onLogout, activeCameraCount = 9, is3DMode, setIs3DMode, toggleTvWallMode }) {
  return (
    <header className="bg-[#0B0E13]/80 backdrop-blur-2xl w-full border-b border-[#FF8A00]/20 flex flex-wrap justify-between items-center px-[clamp(12px,1.5vw,36px)] py-3 sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.8)] select-none">
      {/* Left Branding & Sector Info */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-gradient-to-br from-[#0EA5E9] to-[#FF8A00] flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.5)] brand-emblem-3d">
            <span className="material-symbols-outlined text-black font-bold text-xl">shield</span>
          </div>
          <div className="flex flex-col">
            <span className="font-space text-lg font-bold tracking-wider text-white flex items-center gap-2">
              AETHRA <span className="text-[#FF8A00]">VISION</span>
            </span>
            <span className="font-mono-data text-[10px] text-[#0EA5E9] tracking-widest uppercase">
              TACTICAL AI SURVEILLANCE • COMMAND CENTER (SECTOR 01)
            </span>
          </div>
        </div>

        {/* Status Pill & Sensitivity */}
        <div className="hidden lg:flex items-center gap-4 border-l border-white/10 pl-6">
          <div className="flex items-center gap-2 bg-[#00E676]/10 border border-[#00E676]/30 px-3 py-1 rounded">
            <span className="w-2.5 h-2.5 rounded-full pulsing-dot-green"></span>
            <span className="font-mono-data text-[11px] font-bold text-[#00E676] tracking-wider uppercase">
              SYSTEM SECURE
            </span>
          </div>

          <div className="flex items-center gap-2.5 bg-black/40 border border-white/10 px-3 py-1 rounded">
            <span className="font-mono-data text-[10px] text-gray-400 uppercase">SENSITIVITY</span>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={sensitivity} 
              onChange={handleSensitivityChange} 
              className="w-24 h-1 bg-gray-700 rounded appearance-none cursor-pointer accent-[#FF8A00]"
            />
            <span className="font-mono-data text-xs text-[#FF8A00] font-bold">{sensitivity}%</span>
          </div>
        </div>
      </div>

      {/* Right Controls & User Info */}
      <div className="flex items-center gap-4">
        {/* TV Wall Fullscreen Button */}
        <button 
          onClick={toggleTvWallMode}
          className="font-mono-data text-[10px] uppercase tracking-widest px-3 py-1.5 rounded transition-all flex items-center gap-2 bg-[#FF8A00]/20 border border-[#FF8A00] text-[#FF8A00] hover:bg-[#FF8A00]/30 shadow-[0_0_12px_rgba(255,138,0,0.4)]"
          title="Enter 100% Fullscreen TV Video Wall Mode for Security Displays"
        >
          <span className="material-symbols-outlined text-sm">tv</span>
          <span>TV WALL MODE</span>
        </button>

        {/* Isolated Live Clock */}
        <div className="hidden sm:flex flex-col items-end border-l border-white/10 pl-4">
          <LiveClock />
          <span className="font-mono-data text-[9px] text-gray-400 tracking-widest">LIVE 4K SYNC</span>
        </div>

        {/* Mute & Admin Dropdown */}
        <div className="flex items-center gap-3 border-l border-white/10 pl-4">
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className={`p-2 rounded border transition-all ${
              isMuted 
                ? 'border-red-500/50 bg-red-500/10 text-red-400' 
                : 'border-[#0EA5E9]/40 bg-[#0EA5E9]/10 text-[#0EA5E9] hover:bg-[#0EA5E9]/20'
            }`}
            title={isMuted ? "Unmute Audio Siren" : "Mute Audio Siren"}
          >
            <span className="material-symbols-outlined text-sm">{isMuted ? 'volume_off' : 'volume_up'}</span>
          </button>

          <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 px-3 py-1 rounded">
            <div className="w-6 h-6 rounded bg-[#FF8A00]/20 border border-[#FF8A00]/40 flex items-center justify-center text-[#FF8A00]">
              <span className="material-symbols-outlined text-sm">security</span>
            </div>
            <span className="font-space text-xs font-bold text-white">COMMANDER</span>
            <button onClick={onLogout} title="Logout" className="text-gray-400 hover:text-red-400 transition-colors ml-1">
              <span className="material-symbols-outlined text-sm">power_settings_new</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

