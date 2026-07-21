import React, { useState } from 'react';

export default function AuthScreen({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (password === 'admin123') {
      onLogin('aegis_command_token');
    } else {
      setError('ACCESS DENIED. INCORRECT SECURITY CIPHER.');
    }
  };

  return (
    <div className="bg-background text-on-background font-body-base h-screen w-screen flex items-center justify-center relative overflow-hidden">
      <div className="scanline-container absolute inset-0 opacity-30"></div>
      
      <div className="bg-[#0f1c2f]/90 backdrop-blur-xl rounded-lg w-96 p-8 relative z-10 border border-primary/20 shadow-[0_0_30px_rgba(0,240,255,0.15)] hud-bracket">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full border border-primary flex justify-center items-center mb-4 text-primary bg-primary/5 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <span className="material-symbols-outlined text-3xl">security</span>
          </div>
          <h1 className="font-label-caps text-lg font-bold tracking-widest text-primary uppercase mt-2 glow-cyan">AEGIS_COMMAND</h1>
          <h2 className="font-data-mono text-[10px] text-on-surface-variant tracking-widest uppercase mt-2">Initialize Authorization</h2>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-sm border text-[10px] font-data-mono text-center tracking-widest bg-error-container border-error text-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant text-sm">key</span>
            <input 
              type="password" 
              placeholder="SECURITY CIPHER" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-sm px-10 py-3.5 text-xs text-white focus:outline-none focus:border-primary transition-colors placeholder-on-surface-variant/50 font-data-mono tracking-wider"
              required
            />
          </div>

          <button type="submit" className="w-full py-3.5 rounded-sm text-xs font-label-caps tracking-widest uppercase mt-4 bg-primary/10 border border-primary text-primary hover:bg-primary/20 transition-all glow-cyan hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            Authenticate
          </button>
        </form>

        <div className="mt-8 text-center">
          <span className="font-label-caps text-[9px] text-on-surface-variant uppercase tracking-widest">
            Exhibition Mode Active
          </span>
        </div>
      </div>
    </div>
  );
}
