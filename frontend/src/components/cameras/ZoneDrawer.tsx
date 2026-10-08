import React, { useState, useRef, useEffect } from 'react';
import { safeFetch, BACKEND_URL } from '../../utils/api';

export default function ZoneDrawer({ cameraId, onClose }: { cameraId: any; onClose: () => void }) {
  const [points, setPoints] = useState<any[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch existing zone if any
  useEffect(() => {
    safeFetch(`${BACKEND_URL}/api/cameras/${cameraId}/zone`, {}, 2500)
      .then(res => res.json())
      .then(data => {
        if (data.points && data.points.length > 0) {
          // Zone points loaded
        }
      })
      .catch(console.error);
  }, [cameraId]);

  const handleSVGClick = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Coordinates relative to the container
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert to percentage 0.0 to 1.0
    const xPct = x / rect.width;
    const yPct = y / rect.height;
    
    setPoints([...points, { xPct, yPct, x, y }]);
  };

  const handleSave = async () => {
    if (points.length < 3) {
        alert("Please draw at least 3 points to form a zone.");
        return;
    }
    // Convert to 1280x720 coordinates
    const backendPoints = points.map(p => [
        Math.round(p.xPct * 1280),
        Math.round(p.yPct * 720)
    ]);

    try {
        await safeFetch(`${BACKEND_URL}/api/cameras/${cameraId}/zone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points: backendPoints })
        }, 2500);
        setIsDrawing(false);
        setPoints([]);
        onClose(); // Hide the drawer UI, backend stream will now show the red box!
    } catch (err) {
        console.error(err);
    }
  };

  const handleClear = async () => {
    setPoints([]);
    try {
        await safeFetch(`${BACKEND_URL}/api/cameras/${cameraId}/zone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points: [] }) // Empty clears it
        }, 2500);
    } catch (err) {}
  };

  if (!isDrawing) {
      return (
          <button 
            onClick={() => setIsDrawing(true)} 
            className="absolute bottom-4 left-4 bg-error/20 hover:bg-error/40 text-error border border-error/50 px-4 py-2 rounded-sm font-label-caps tracking-widest text-[10px] uppercase flex items-center gap-2 transition-colors z-30 shadow-[0_0_10px_rgba(255,82,92,0.2)]"
          >
              <span className="material-symbols-outlined text-[16px]">draw</span> DRAW INTRUSION ZONE
          </button>
      );
  }

  // Generate polygon string for SVG
  const polyString = points.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <div className="absolute inset-0 z-30">
       <div className="absolute top-4 right-4 flex gap-2 z-40">
           <button onClick={handleClear} className="bg-surface-container hover:bg-surface-variant text-white px-4 py-2 rounded-sm font-label-caps text-[10px] tracking-widest border border-white/20">CLEAR</button>
           <button onClick={() => setIsDrawing(false)} className="bg-surface-container hover:bg-surface-variant text-white px-4 py-2 rounded-sm font-label-caps text-[10px] tracking-widest border border-white/20">CANCEL</button>
           <button onClick={handleSave} className="bg-error hover:bg-error/80 text-white px-4 py-2 rounded-sm font-label-caps text-[10px] tracking-widest font-bold">SAVE ZONE</button>
       </div>
       
       <div className="absolute inset-0 bg-black/40 cursor-crosshair" ref={containerRef} onClick={handleSVGClick}>
           <svg className="w-full h-full pointer-events-none">
               {points.length > 0 && (
                   <polygon 
                       points={polyString} 
                       fill="rgba(255, 0, 0, 0.2)" 
                       stroke="red" 
                       strokeWidth="2"
                       strokeDasharray="4" 
                   />
               )}
               {points.map((p, i) => (
                   <circle key={i} cx={p.x} cy={p.y} r="4" fill="red" />
               ))}
           </svg>
           <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 px-4 py-2 rounded border border-error/50 text-error font-data-mono text-xs text-center pointer-events-none animate-pulse">
               Click to draw zone points. Needs at least 3 points.
           </div>
       </div>
    </div>
  );
}
