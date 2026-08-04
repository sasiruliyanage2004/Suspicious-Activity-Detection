import React, { useState } from 'react'
import { UserPlus, Users } from 'lucide-react'
import EmployeeBiometricsStudio from './EmployeeBiometricsStudio'
import WhitelistView from './WhitelistView'

export default function PersonnelHub({ cameras = [], isOperator = false }) {
  const [tab, setTab] = useState(isOperator ? 'whitelist' : 'enroll')

  const tabs = [
    ...(!isOperator ? [{ key: 'enroll', label: 'Enroll New Personnel', icon: UserPlus }] : []),
    { key: 'whitelist', label: 'Active Whitelist', icon: Users },
  ]

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-5 pt-4 pb-0 border-b border-white/10 bg-black/30 flex-shrink-0">
        {tabs.map(({ key, label, icon: Icon }) => {
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex items-center gap-2 px-5 py-3 text-xs font-mono font-bold rounded-t-xl transition-all cursor-pointer border-t border-l border-r ${
                active
                  ? 'bg-[#0B0E13] text-cyan-300 border-white/15 border-b-transparent shadow-[0_-4px_12px_rgba(0,0,0,0.4)]'
                  : 'bg-transparent text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              <Icon size={14} />
              <span className="uppercase tracking-wider">{label}</span>
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'enroll' && !isOperator && (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <EmployeeBiometricsStudio cameras={cameras} onEnrolled={() => setTab('whitelist')} />
          </div>
        )}
        {tab === 'whitelist' && (
          <WhitelistView isOperator={isOperator} />
        )}
      </div>
    </div>
  )
}
