import React from 'react';

export default function Ticker() {
  return (
    <div className="fixed bottom-0 left-0 lg:left-[72px] right-0 h-7 bg-obsidian-950 border-t border-cyan-500/30 overflow-hidden flex items-center z-[90]">
      <div className="flex items-center px-4 bg-cyan-950/50 h-full border-r border-cyan-500/30 shrink-0 z-10 shadow-[5px_0_15px_rgba(0,0,0,0.5)]">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse mr-2"></span>
        <span className="font-mono text-[9px] font-bold text-cyan-400 tracking-widest uppercase">Live Feed</span>
      </div>
      <div className="w-full overflow-hidden relative flex-1">
        <div className="whitespace-nowrap animate-marquee flex gap-12 font-mono text-[10px] text-cyan-500/70 tracking-widest uppercase">
          <span>AETHRA VISION CORE v2.4</span>
          <span>&bull;</span>
          <span>SYSTEM NOMINAL</span>
          <span>&bull;</span>
          <span>ALL ZONES SECURE</span>
          <span>&bull;</span>
          <span>YOLOV11 POSE ACTIVE</span>
          <span>&bull;</span>
          <span>WEAPON & BAGGAGE RADAR ARMED</span>
          <span>&bull;</span>
          <span>CROSS-CAMERA RE-ID 99.1%</span>
          <span>&bull;</span>
          <span>AUTONOMOUS PTZ TRACKING</span>
          <span>&bull;</span>
          <span>BIOMETRIC SCANNING ONLINE</span>
        </div>
      </div>

      {/* Right Telemetry Status (Matches Reference Video Frame 20s) */}
      <div className="hidden lg:flex items-center gap-3 px-4 bg-cyan-950/60 h-full border-l border-cyan-500/30 shrink-0 font-mono text-[9.5px] text-cyan-300/80 uppercase tracking-wider z-10">
        <span>ENCRYPTION: <strong className="text-cyan-200">AES-256</strong></span>
        <span className="text-white/20">|</span>
        <span>LATENCY: <strong className="text-emerald-400">12MS</strong></span>
        <span className="text-white/20">|</span>
        <span>CPU LOAD: <strong className="text-cyan-300">34%</strong></span>
        <span className="text-white/20">|</span>
        <span>MEM: <strong className="text-cyan-300">18.2GB</strong></span>
        <span className="text-white/20">|</span>
        <span>FPS: <strong className="text-emerald-400">60FPS</strong></span>
        <span className="text-white/20">|</span>
        <span>DISK: <strong className="text-cyan-300">78%</strong></span>
      </div>
    </div>
  );
}
