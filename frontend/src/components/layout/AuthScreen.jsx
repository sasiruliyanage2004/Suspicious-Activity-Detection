import React, { useState, useEffect, useRef } from 'react';

export default function AuthScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const canvasRef = useRef(null);

  useEffect(() => {
    // WebGL Shader Background Logic
    const canvas = canvasRef.current;
    if (!canvas) return;

    function syncSize() {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
    
    window.addEventListener('resize', syncSize);
    syncSize();

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const fs = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec2 v_texCoord;

void main() {
    vec2 uv = v_texCoord;
    
    // Dark deep navy base
    vec3 color = vec3(0.01, 0.02, 0.08);
    
    // Subtle grid lines
    vec2 grid = fract(uv * 40.0 + u_time * 0.02);
    float line = smoothstep(0.02, 0.0, grid.x) + smoothstep(0.02, 0.0, grid.y);
    color += line * vec3(0.0, 0.5, 0.6) * 0.05;
    
    // Faint data pulse
    float pulse = sin(uv.y * 100.0 - u_time * 2.0) * 0.5 + 0.5;
    color += pulse * vec3(0.0, 0.8, 1.0) * 0.02;
    
    // Vignette
    float vig = 1.0 - length(uv - 0.5) * 1.5;
    color *= max(0.2, vig);

    gl_FragColor = vec4(color, 1.0);
}`;

    function cs(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, cs(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, cs(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');

    let animationFrameId;
    function render(t) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    }
    
    render(0);

    return () => {
      window.removeEventListener('resize', syncSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    // Mock login logic
    if (password === 'admin123') {
      onLogin('aethra_vision_token');
    } else {
      setError('ACCESS DENIED. INCORRECT SECURITY CIPHER.');
    }
  };

  return (
    <div className="bg-[#131313] text-[#e2e2e2] min-h-screen flex flex-col font-body-base overflow-hidden relative">
      
      {/* Global Background Shader */}
      <div className="fixed inset-0 w-full h-full z-0 opacity-40">
        <canvas ref={canvasRef} className="block w-full h-full"></canvas>
      </div>

      {/* Top Navigation (Shell Implementation) */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-4 backdrop-blur-md bg-[#131313]/20 border-b border-primary/5">
        <div className="flex items-center gap-2">
          <span className="font-data-mono text-xl tracking-tighter text-[#00dbe9] drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">AETHRA VISION</span>
        </div>
        <div className="hidden md:flex gap-6">
          <span className="font-label-caps text-xs text-primary opacity-50 tracking-widest uppercase">Secured Interface v4.0.2</span>
        </div>
      </header>

      {/* Main Auth Canvas */}
      <main className="flex-grow flex items-center justify-center relative z-10 px-4">
        
        {/* Auth Card */}
        <div className="bg-[#0a0b1e]/60 backdrop-blur-2xl border border-primary/15 shadow-[0_0_30px_rgba(0,0,0,0.5)] max-w-md w-full p-10 rounded-lg flex flex-col items-center gap-6 relative">
          
          {/* Logo Container (Using our 3D animated CSS logo instead of heavy Three.js for performance) */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl"></div>
            <div className="w-32 h-32 rounded-full flex items-center justify-center perspective-[1000px] bg-black/40 border border-primary/20 p-2">
              <img src="/logo.png" alt="Aethra Vision" className="logo-3d w-full h-full object-cover rounded-full shadow-[0_0_15px_rgba(0,240,255,0.3)]" />
            </div>
          </div>

          {/* Header Branding */}
          <div className="text-center">
            <h1 className="font-data-mono text-2xl text-[#00dbe9] glow-cyan tracking-tighter uppercase mb-1">AETHRA VISION</h1>
            <p className="font-label-caps text-[10px] text-on-surface-variant opacity-60 tracking-[0.2em] uppercase">Tactical Intelligence Portal</p>
          </div>

          {error && (
            <div className="w-full p-3 rounded-sm border text-[10px] font-data-mono text-center tracking-widest bg-red-900/40 border-red-500 text-red-300">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5 relative">
            
            {/* Email Field */}
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-[10px] text-primary opacity-70 uppercase tracking-wider ml-1">Terminal ID (Email)</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ADMIN@AETHRA.SEC" 
                  className="w-full bg-transparent border-0 border-b border-[#3b494b] py-2 px-1 font-data-mono text-sm text-primary placeholder:text-outline/30 focus:border-primary focus:shadow-[0_4px_12px_-4px_rgba(0,240,255,0.3)] focus:outline-none transition-all duration-300"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-[10px] text-primary opacity-70 uppercase tracking-wider ml-1">Access Protocol (Password)</label>
              <div className="relative flex items-center">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••" 
                  className="w-full bg-transparent border-0 border-b border-[#3b494b] py-2 px-1 font-data-mono text-sm text-primary placeholder:text-outline/30 focus:border-primary focus:shadow-[0_4px_12px_-4px_rgba(0,240,255,0.3)] focus:outline-none transition-all duration-300 pr-10"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 text-primary/40 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Action Area */}
            <div className="mt-4 flex flex-col gap-4">
              <button 
                type="submit"
                className="relative overflow-hidden w-full bg-primary/10 border border-primary text-primary font-data-mono text-sm py-4 px-6 uppercase tracking-[0.15em] hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:scale-[1.02] transition-all duration-300 group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Initialize Authorization
                  <span className="material-symbols-outlined text-[18px]">lock_open</span>
                </span>
                {/* CSS animated scanline inside the button */}
                <div className="absolute top-0 left-0 w-full h-[20px] bg-gradient-to-b from-transparent via-primary/40 to-transparent animate-[scanline_3s_linear_infinite] pointer-events-none opacity-50"></div>
              </button>
              
              <div className="flex justify-between items-center px-1">
                <button type="button" className="font-label-caps text-[9px] text-on-surface-variant hover:text-primary transition-colors uppercase tracking-tight">Request Credentials</button>
                <button type="button" className="font-label-caps text-[9px] text-on-surface-variant hover:text-primary transition-colors uppercase tracking-tight">System Status</button>
              </div>
            </div>
          </form>

          {/* Bottom HUD details */}
          <div className="w-full pt-4 mt-2 border-t border-primary/10 flex justify-between items-center opacity-50 font-data-mono text-[9px] text-primary tracking-widest">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              ENC: AES-256-GCM
            </div>
            <div>NODE: TRM-094</div>
          </div>

        </div>

        {/* Atmospheric HUD Elements */}
        <div className="absolute top-10 left-10 pointer-events-none opacity-20 hidden lg:block">
          <div className="font-data-mono text-[10px] text-primary space-y-1">
            <div>[ SCANNING SECTOR ]</div>
            <div>ID: 48.8566 | 2.3522</div>
            <div className="w-24 h-px bg-primary/40"></div>
            <div>STATUS: ACTIVE_MONITOR</div>
          </div>
        </div>
        <div className="absolute bottom-10 right-10 pointer-events-none opacity-20 hidden lg:block text-right">
          <div className="font-data-mono text-[10px] text-primary space-y-1">
            <div>[ SYSTEM LOGS ]</div>
            <div>AUTH_READY_V4</div>
            <div className="w-24 h-px bg-primary/40 ml-auto"></div>
            <div>UPTIME: 99.9992%</div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full flex flex-col md:flex-row justify-between items-center px-8 py-6 gap-4 relative z-10 border-t border-primary/5 bg-[#131313]/40 backdrop-blur-sm">
        <div className="font-data-mono text-[10px] font-bold text-primary opacity-60 uppercase tracking-widest">
            © 2024 AETHRA VISION. TACTICAL INTELLIGENCE DEPLOYED.
        </div>
        <nav className="flex gap-6">
          <button className="font-label-caps text-[10px] text-[#849495] hover:text-primary transition-colors duration-200 uppercase tracking-tighter">Security Protocol</button>
          <button className="font-label-caps text-[10px] text-[#849495] hover:text-primary transition-colors duration-200 uppercase tracking-tighter">Terminal Access</button>
        </nav>
      </footer>
    </div>
  );
}
