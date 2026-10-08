import React, { useState, useEffect } from 'react'
import { Activity, ShieldAlert, CheckCircle, Video, Search } from 'lucide-react'

export default function ActivityLog() {
  const [logs, setLogs] = useState([
    { id: 1, type: 'info', msg: 'System initialized & neural net loaded', time: 'Just now' },
  ])

  // Connect to real AI backend WebSockets
  useEffect(() => {
    let ws = null;
    try {
      ws = new WebSocket('ws://127.0.0.1:8000/ws/alerts');
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.behavior_type) {
            setLogs(prev => {
              const newLog = {
                id: Date.now(),
                type: 'alert',
                msg: `${data.behavior_type} detected on ${data.camera_id}: ${data.details}`,
                time: 'Just now'
              };
              return [newLog, ...prev];
            });
          }
        } catch (e) {}
      };
    } catch (err) {}

    return () => { if (ws) ws.close(); };
  }, []);

  return (
    <div className="flex flex-col h-full bg-obsidian-950 border-l border-white/10 w-80 shrink-0">
      <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
        <h3 className="font-display font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <Activity size={16} className="text-cyan-400" /> Activity Log
        </h3>
        <span className="flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>

      <div className="p-3 border-b border-white/5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Filter logs..."
            className="w-full bg-black/60 text-white font-mono text-[11px] pl-8 pr-3 py-2 rounded-lg border border-white/10 outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {logs.map(log => (
          <div key={log.id} className="group flex gap-3 items-start animate-fade-in">
            <div className="shrink-0 mt-0.5">
              {log.type === 'info' && <Video size={14} className="text-cyan-400" />}
              {log.type === 'success' && <CheckCircle size={14} className="text-emerald-400" />}
              {log.type === 'alert' && <ShieldAlert size={14} className="text-red-400" />}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className={`font-mono text-[11px] leading-relaxed ${
                log.type === 'alert' ? 'text-red-200' : 'text-gray-300'
              }`}>
                {log.msg}
              </p>
              <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">{log.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
