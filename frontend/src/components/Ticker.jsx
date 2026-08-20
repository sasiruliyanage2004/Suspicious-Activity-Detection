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
          <span>AETHRA VISION OS v2.1</span>
          <span>&bull;</span>
          <span>SYSTEM NOMINAL</span>
          <span>&bull;</span>
          <span>ALL ZONES SECURE</span>
          <span>&bull;</span>
          <span>AI ENGINE ACTIVE</span>
          <span>&bull;</span>
          <span>LATENCY 12ms</span>
          <span>&bull;</span>
          <span>ENCRYPTION AES-256</span>
          <span>&bull;</span>
          <span>BIOMETRIC SCANNING ONLINE</span>
          <span>&bull;</span>
          <span>AETHRA VISION OS v2.1</span>
          <span>&bull;</span>
          <span>SYSTEM NOMINAL</span>
          <span>&bull;</span>
          <span>ALL ZONES SECURE</span>
          <span>&bull;</span>
          <span>AI ENGINE ACTIVE</span>
          <span>&bull;</span>
          <span>LATENCY 12ms</span>
          <span>&bull;</span>
          <span>ENCRYPTION AES-256</span>
          <span>&bull;</span>
          <span>BIOMETRIC SCANNING ONLINE</span>
        </div>
      </div>
    </div>
  );
}
