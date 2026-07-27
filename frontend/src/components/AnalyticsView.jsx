import React from 'react'
import { ChartNoAxesCombined, TrendingUp, Users, ShieldCheck, Activity, Eye, Zap } from 'lucide-react'

export default function AnalyticsView() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="border-b border-white/10 pb-5">
        <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <ChartNoAxesCombined size={22} className="text-cyan-glow" />
          AI INTELLIGENCE &amp; ANALYTICS DASHBOARD
        </h1>
        <p className="font-mono text-xs text-gray-400 mt-1">
          HSV Color Re-ID Person Handoff, Peak Threat Distribution &amp; Detection Performance
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-gray-400 font-mono text-[10px] uppercase">
            <span>Person Re-ID Match Rate</span>
            <Users size={16} className="text-cyan-glow" />
          </div>
          <p className="font-mono text-2xl font-bold text-white">98.4%</p>
          <p className="font-mono text-[10px] text-emerald-400">+2.1% from last shift</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-gray-400 font-mono text-[10px] uppercase">
            <span>Avg Threat Response Time</span>
            <Activity size={16} className="text-amber-400" />
          </div>
          <p className="font-mono text-2xl font-bold text-white">0.42s</p>
          <p className="font-mono text-[10px] text-emerald-400">Zero-lag YOLOv8 pipeline</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-gray-400 font-mono text-[10px] uppercase">
            <span>AI Bounding Box Precision</span>
            <Zap size={16} className="text-emerald-400" />
          </div>
          <p className="font-mono text-2xl font-bold text-white">96.8%</p>
          <p className="font-mono text-[10px] text-emerald-400">Tuned confidence filter</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-gray-400 font-mono text-[10px] uppercase">
            <span>Daily Tracked Targets</span>
            <Eye size={16} className="text-cyan-glow" />
          </div>
          <p className="font-mono text-2xl font-bold text-white">1,482</p>
          <p className="font-mono text-[10px] text-gray-400">Across 9 Active Nodes</p>
        </div>
      </div>

      {/* Visual Bar Graphs Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1 */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
          <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
            <span>Hourly Incident Distribution (24H)</span>
            <TrendingUp size={16} className="text-cyan-glow" />
          </h2>
          <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-white/10">
            {[20, 35, 15, 60, 90, 75, 40, 25, 50, 80, 95, 30].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className="w-full bg-gradient-to-t from-cyan-500/20 to-cyan-glow rounded-t group-hover:brightness-125 transition-all"
                  style={{ height: `${h}%` }}
                />
                <span className="font-mono text-[8px] text-gray-400">{i * 2}h</span>
              </div>
            ))}
          </div>
        </div>

        {/* Graph 2 */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
          <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider">
            Threat Category Breakdown
          </h2>
          <div className="space-y-3 font-mono text-xs">
            <div>
              <div className="flex justify-between text-gray-300 mb-1 text-[11px]">
                <span>Fight / Altercation Detection</span>
                <span className="text-crimson-glow font-bold">42%</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div className="bg-crimson-glow h-full rounded-full" style={{ width: '42%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-gray-300 mb-1 text-[11px]">
                <span>Intrusion Line Crossing</span>
                <span className="text-amber-400 font-bold">28%</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: '28%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-gray-300 mb-1 text-[11px]">
                <span>Person Fall / Collapse</span>
                <span className="text-cyan-glow font-bold">18%</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div className="bg-cyan-glow h-full rounded-full" style={{ width: '18%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-gray-300 mb-1 text-[11px]">
                <span>Smoking / Fire Hazard</span>
                <span className="text-emerald-400 font-bold">12%</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: '12%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
