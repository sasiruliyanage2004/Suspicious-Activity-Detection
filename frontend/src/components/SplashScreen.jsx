import React, { useState, useEffect } from 'react';

export default function SplashScreen({ onComplete }) {
  const [lines, setLines] = useState([]);
  const [fading, setFading] = useState(false);

  const sequence = [
    '> INITIATING AETHRA VISION OS v2.1...',
    '> CONNECTING TO SECURE TACTICAL GRID...',
    '> CALIBRATING AI NEURAL NETWORKS...',
    '> ENABLING HARDWARE ENCRYPTION...',
    '> SYSTEM NOMINAL. ACCESS GRANTED.'
  ];

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < sequence.length) {
        setLines(prev => [...prev, sequence[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => setFading(true), 500);
        setTimeout(() => onComplete(), 1000);
      }
    }, 300);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[999999] bg-obsidian-950 flex flex-col items-center justify-center transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}>
      <div className="w-full max-w-2xl px-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.5)]">
            <div className="w-6 h-6 bg-cyan-400 rounded-full animate-pulse"></div>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-cyan-400 tracking-widest">AETHRA <span className="text-white">VISION</span></h1>
        </div>
        <div className="font-mono text-cyan-500 text-sm md:text-base space-y-2">
          {lines.map((line, i) => (
            <p key={i} className="animate-fade-in">{line}</p>
          ))}
          <p className="animate-pulse mt-2">_</p>
        </div>
      </div>
    </div>
  );
}
