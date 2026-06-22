import React, { useState } from 'react';

function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === 'admin123') {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/40 via-black to-black"></div>
        <div className="absolute inset-x-0 h-[1px] bg-primary/20 shadow-[0_0_15px_rgba(125,211,252,0.5)] top-1/2 animate-[scan_8s_linear_infinite] z-20"></div>
      </div>
      
      <div className="glass-card w-full max-w-md p-8 rounded-3xl relative z-10 border border-primary/20 shadow-[0_0_50px_rgba(125,211,252,0.1)]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30 mb-4 shadow-[0_0_15px_rgba(125,211,252,0.3)]">
            <span className="material-symbols-outlined text-4xl text-primary">security</span>
          </div>
          <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight">CCTV System</h1>
          <p className="text-on-surface-variant text-sm mt-1 uppercase tracking-widest font-mono">Restricted Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-primary text-xs font-bold mb-2 uppercase tracking-wider font-mono">Master Password</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">lock</span>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-black/50 border ${error ? 'border-error' : 'border-primary/30'} rounded-xl py-3 pl-12 pr-4 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono`}
                placeholder="••••••••"
                autoFocus
              />
            </div>
            {error && <p className="text-error text-xs mt-2 font-mono flex items-center gap-1"><span className="material-symbols-outlined text-sm">warning</span> Access Denied</p>}
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-primary text-on-primary font-bold py-3 rounded-xl hover:bg-primary-container hover:text-on-primary-container transition-all hover:shadow-[0_0_20px_rgba(125,211,252,0.4)] active:scale-95 flex justify-center items-center gap-2"
          >
            INITIALIZE UPLINK <span className="material-symbols-outlined text-sm">login</span>
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-primary/10 flex justify-between text-xs font-mono text-on-surface-variant/50">
          <span>v2.4.0-BETA</span>
          <span>SYSTEM OFFLINE</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
