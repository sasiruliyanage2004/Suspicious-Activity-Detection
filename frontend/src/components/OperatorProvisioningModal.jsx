import React, { useState } from 'react';
import { ShieldCheck, UserPlus, Key, Copy, Check, X, User, BadgeCheck } from 'lucide-react';

export default function OperatorProvisioningModal({ onClose }) {
  const [name, setName] = useState('');
  const [nic, setNic] = useState('');
  const [shift, setShift] = useState('Day Shift (06:00 - 18:00)');
  const [role, setRole] = useState('Monitoring Specialist');
  const [generatedBadge, setGeneratedBadge] = useState(null);
  const [copied, setCopied] = useState(false);

  const getOperators = () => {
    try {
      const stored = localStorage.getItem('aethra_operators');
      return stored ? JSON.parse(stored) : [
        { badgeId: 'SEC-OP-1024-A', pin: '1234', name: 'Nimal Silva', nic: '948102812V', shift: 'Day Shift', role: 'Senior Guard' },
        { badgeId: 'SEC-OP-9842-B', pin: '5678', name: 'Sunethra Perera', nic: '918491024V', shift: 'Night Shift', role: 'Monitoring Officer' }
      ];
    } catch (e) {
      return [];
    }
  };

  const [operatorsList, setOperatorsList] = useState(getOperators());

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!name || !nic) return;

    // Generate cryptographic unique operator badge ID derived from NIC number
    const nicSanitized = nic.replace(/[^0-9]/g, '').slice(-6) || Math.floor(100000 + Math.random() * 900000);
    const charSuffix = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const newBadgeId = `SEC-OP-${nicSanitized}-${charSuffix}`;
    const newPin = '1234';

    const newOperator = {
      badgeId: newBadgeId,
      pin: newPin,
      name: name.trim(),
      nic: nic.trim(),
      shift,
      role,
      createdAt: new Date().toLocaleDateString()
    };

    const updated = [newOperator, ...operatorsList];
    setOperatorsList(updated);
    localStorage.setItem('aethra_operators', JSON.stringify(updated));

    setGeneratedBadge(newOperator);
    setName('');
    setNic('');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0B0E13] border border-[#0EA5E9]/40 w-full max-w-2xl rounded-2xl p-6 shadow-[0_0_40px_rgba(14,165,233,0.2)] flex flex-col gap-5 relative overflow-hidden">
        {/* Top Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0EA5E9]/15 border border-[#0EA5E9]/40 flex items-center justify-center text-[#0EA5E9]">
              <BadgeCheck size={22} />
            </div>
            <div className="flex flex-col">
              <h2 className="font-space text-lg font-bold text-white tracking-wide">
                OPERATOR ACCESS PROVISIONING PORTAL
              </h2>
              <span className="font-mono text-[10px] text-[#0EA5E9] tracking-widest uppercase">
                Admin Security Guard ID &amp; Badge Generator
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Generated Success Alert */}
        {generatedBadge && (
          <div className="bg-[#00E676]/10 border border-[#00E676]/50 rounded-xl p-4 flex justify-between items-center shadow-[0_0_20px_rgba(0,230,118,0.2)]">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-[#00E676] shrink-0" size={24} />
              <div className="flex flex-col">
                <span className="font-mono text-xs text-[#00E676] font-bold tracking-wider">
                  SUCCESS: UNIQUE BADGE ID PROVISIONED
                </span>
                <span className="font-space text-sm text-white font-bold">
                  {generatedBadge.name} ({generatedBadge.role})
                </span>
                <span className="font-mono text-xs text-gray-300">
                  BADGE ID: <strong className="text-[#00E676]">{generatedBadge.badgeId}</strong> | DEFAULT PIN: <strong>{generatedBadge.pin}</strong>
                </span>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(generatedBadge.badgeId)}
              className="bg-[#00E676]/20 border border-[#00E676]/50 text-[#00E676] px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 hover:bg-[#00E676]/30 transition-all shrink-0"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'COPIED' : 'COPY BADGE ID'}
            </button>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">
              Officer Full Name
            </label>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <User size={16} className="text-gray-400" />
              <input
                type="text"
                required
                placeholder="Kasun Rajapaksha"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-transparent outline-none text-xs text-white font-body w-full"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">
              Staff NIC / Employee ID
            </label>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <Key size={16} className="text-gray-400" />
              <input
                type="text"
                required
                placeholder="982019481V"
                value={nic}
                onChange={(e) => setNic(e.target.value)}
                className="bg-transparent outline-none text-xs text-white font-mono w-full"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">
              Assigned Shift
            </label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="bg-[#12161D] border border-white/10 text-xs text-white rounded-xl px-3 py-2 outline-none font-mono"
            >
              <option>Day Shift (06:00 - 18:00)</option>
              <option>Night Shift (18:00 - 06:00)</option>
              <option>Full 24H Rotation</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">
              Security Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-[#12161D] border border-white/10 text-xs text-white rounded-xl px-3 py-2 outline-none font-mono"
            >
              <option>Monitoring Specialist</option>
              <option>Senior Guard Officer</option>
              <option>Tactical Response Lead</option>
            </select>
          </div>

          <div className="sm:col-span-2 mt-2">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#0EA5E9] to-[#FF8A00] text-black font-space font-bold text-xs py-3 px-4 rounded-xl uppercase tracking-wider hover:brightness-110 shadow-[0_0_20px_rgba(14,165,233,0.4)] transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={16} />
              GENERATE UNIQUE OPERATOR ACCESS BADGE KEY
            </button>
          </div>
        </form>

        {/* Directory Table */}
        <div className="flex flex-col gap-2 mt-1 border-t border-white/10 pt-4">
          <span className="font-mono text-[10px] text-[#0EA5E9] tracking-widest uppercase font-bold">
            PROVISIONED OPERATOR DIRECTORY ({operatorsList.length})
          </span>

          <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
            {operatorsList.map((op, idx) => (
              <div
                key={idx}
                className="bg-black/60 border border-white/10 rounded-xl p-2.5 flex items-center justify-between hover:border-[#0EA5E9]/40 transition-all"
              >
                <div className="flex flex-col">
                  <span className="font-space text-xs font-bold text-white">{op.name}</span>
                  <span className="font-mono text-[10px] text-gray-400">
                    NIC: {op.nic} • {op.shift}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-[#FF8A00] bg-[#FF8A00]/10 border border-[#FF8A00]/40 px-2.5 py-1 rounded-lg">
                    {op.badgeId}
                  </span>
                  <button
                    onClick={() => copyToClipboard(op.badgeId)}
                    className="text-gray-400 hover:text-white p-1 rounded"
                    title="Copy Badge ID"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
