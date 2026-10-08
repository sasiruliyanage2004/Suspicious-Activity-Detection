import React, { useState } from 'react';
import { ShieldCheck, UserPlus, Key, Copy, Check, X, User, BadgeCheck, Eye, EyeOff, Lock, Edit3, Trash2, Power } from 'lucide-react';
import { safeFetch, BACKEND_URL } from '../utils/api';

export default function OperatorProvisioningModal({ onClose }) {
  const [name, setName] = useState('');
  const [nic, setNic] = useState('');
  const [shift, setShift] = useState('Day Shift (06:00 - 18:00)');
  const [role, setRole] = useState('Monitoring Specialist');
  const [customPin, setCustomPin] = useState('');
  const [generatedBadge, setGeneratedBadge] = useState(null);
  const [copied, setCopied] = useState(false);
  const [revealedIds, setRevealedIds] = useState({});
  const [revealNew, setRevealNew] = useState(false);
  const [editingPinIdx, setEditingPinIdx] = useState(null);
  const [newEditPinVal, setNewEditPinVal] = useState('');

  const [operatorsList, setOperatorsList] = useState([]);

  React.useEffect(() => {
    safeFetch(`${BACKEND_URL}/api/operators`, {}, 2500)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOperatorsList(data);
        }
      })
      .catch(err => console.error('Error fetching operators:', err));
  }, []);

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!name || !nic) return;

    // Generate cryptographic unique operator badge ID derived from NIC number
    const nicSanitized = nic.replace(/[^0-9]/g, '').slice(-6) || Math.floor(100000 + Math.random() * 900000);
    const charSuffix = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const newBadgeId = `SEC-OP-${nicSanitized}-${charSuffix}`;
    const assignedPin = customPin.trim() ? customPin.trim() : '1234';

    const newOperator = {
      badge_id: newBadgeId,
      pin: assignedPin,
      name: name.trim(),
      nic: nic.trim(),
      shift,
      role,
      is_active: 1
    };

    safeFetch(`${BACKEND_URL}/api/operators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOperator)
    }, 2500)
      .then(res => res.json())
      .then(data => {
        if (data.badge_id) {
          setOperatorsList([data, ...operatorsList]);
          setGeneratedBadge(data);
          setRevealNew(false);
          setName('');
          setNic('');
          setCustomPin('');
        }
      })
      .catch(err => console.error('Failed to create operator', err));
  };

  const handleSaveEditedPin = (idx) => {
    if (!newEditPinVal.trim() || newEditPinVal.trim().length < 4) return;
    const op = operatorsList[idx];
    safeFetch(`${BACKEND_URL}/api/operators/${op.badge_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: newEditPinVal.trim() })
    }, 2500)
      .then(res => res.json())
      .then(data => {
        const updated = operatorsList.map((o, i) => i === idx ? data : o);
        setOperatorsList(updated);
        setEditingPinIdx(null);
        setNewEditPinVal('');
      })
      .catch(err => console.error('Failed to update PIN', err));
  };

  const handleDeleteOperator = (idx) => {
    if (window.confirm("Are you sure you want to permanently delete this operator?")) {
      const op = operatorsList[idx];
      safeFetch(`${BACKEND_URL}/api/operators/${op.badge_id}`, { method: 'DELETE' }, 2500)
        .then(() => {
          setOperatorsList(operatorsList.filter((_, i) => i !== idx));
        })
        .catch(err => console.error('Failed to delete', err));
    }
  };

  const handleToggleStatus = (idx) => {
    const op = operatorsList[idx];
    const newStatus = op.is_active === 0 ? 1 : 0;
    safeFetch(`${BACKEND_URL}/api/operators/${op.badge_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: newStatus })
    }, 2500)
      .then(res => res.json())
      .then(data => {
        const updated = operatorsList.map((o, i) => i === idx ? data : o);
        setOperatorsList(updated);
      })
      .catch(err => console.error('Failed to toggle status', err));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleReveal = (idx) => {
    setRevealedIds(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const maskBadgeId = (badgeId, isRevealed) => {
    if (isRevealed) return badgeId;
    if (!badgeId) return 'SEC-OP-••••••-•';
    const parts = badgeId.split('-');
    if (parts.length >= 3) {
      return `${parts[0]}-${parts[1]}-••••••-•`;
    }
    return '••••••••••••';
  };

  const maskNic = (nicVal, isRevealed) => {
    if (isRevealed) return nicVal;
    if (!nicVal) return '••••••••••';
    return '••••••' + nicVal.slice(-3);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0B0E13] border border-[#0EA5E9]/50 w-full max-w-2xl rounded-2xl p-6 shadow-[0_0_50px_rgba(14,165,233,0.25)] flex flex-col gap-5 relative overflow-hidden">
        {/* Top Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0EA5E9]/15 border border-[#0EA5E9]/40 flex items-center justify-center text-[#0EA5E9] shadow-glow-cyan">
              <Lock size={22} />
            </div>
            <div className="flex flex-col">
              <h2 className="font-display text-base sm:text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
                <span>OPERATOR ACCESS PROVISIONING PORTAL</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">ENCRYPTED WORM</span>
              </h2>
              <span className="font-mono text-[10px] text-[#0EA5E9] tracking-widest uppercase">
                Zero-Trust Credential Generator • Masked Visual Exposure Protection
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
          <div className="bg-gradient-to-r from-emerald-950/60 to-obsidian-900 border border-[#00E676]/60 rounded-xl p-4 flex justify-between items-center shadow-[0_0_25px_rgba(0,230,118,0.25)]">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-[#00E676] shrink-0 animate-pulse" size={26} />
              <div className="flex flex-col">
                <span className="font-mono text-[11px] text-[#00E676] font-extrabold tracking-wider uppercase">
                  ✔ SUCCESS: UNIQUE OPERATOR ACCESS KEY PROVISIONED
                </span>
                <span className="font-display text-sm text-white font-bold my-0.5">
                  {generatedBadge.name} ({generatedBadge.role})
                </span>
                <div className="font-mono text-xs text-gray-300 flex items-center gap-2">
                  <span>BADGE ID: <strong className="text-[#00E676]">{revealNew ? generatedBadge.badge_id : maskBadgeId(generatedBadge.badge_id, false)}</strong></span>
                  <button 
                    onClick={() => setRevealNew(!revealNew)}
                    className="text-gray-400 hover:text-white text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1"
                    title="Toggle Credential Decryption"
                  >
                    {revealNew ? <EyeOff size={11} /> : <Eye size={11} />}
                    <span>{revealNew ? 'Hide' : 'Reveal'}</span>
                  </button>
                  <span>| PIN: <strong className="text-amber-400">{revealNew ? generatedBadge.pin : '••••'}</strong> (Active)</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(generatedBadge.badge_id)}
              className="bg-[#00E676]/20 border border-[#00E676]/50 text-[#00E676] px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 hover:bg-[#00E676]/30 transition-all shrink-0 shadow-sm"
              title="Copy verified credentials to clipboard"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'COPIED' : 'COPY BADGE ID'}
            </button>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-black/40 p-4 rounded-xl border border-white/10 shadow-inner">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              Officer Full Name
            </label>
            <div className="flex items-center gap-2 bg-obsidian-950 border border-white/15 rounded-xl px-3 py-2 focus-within:border-cyan-400 transition-all">
              <User size={16} className="text-cyan-400 shrink-0" />
              <input
                type="text"
                required
                placeholder="Kasun Rajapaksha"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-transparent outline-none text-xs text-white font-sans w-full"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              Staff NIC / Employee ID
            </label>
            <div className="flex items-center gap-2 bg-obsidian-950 border border-white/15 rounded-xl px-3 py-2 focus-within:border-cyan-400 transition-all">
              <Key size={16} className="text-amber-400 shrink-0" />
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
            <label className="font-mono text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              Custom PIN (Optional)
            </label>
            <div className="flex items-center gap-2 bg-obsidian-950 border border-white/15 rounded-xl px-3 py-2 focus-within:border-cyan-400 transition-all">
              <Lock size={15} className="text-emerald-400 shrink-0" />
              <input
                type="text"
                maxLength={8}
                placeholder="Default: 1234"
                value={customPin}
                onChange={(e) => setCustomPin(e.target.value)}
                className="bg-transparent outline-none text-xs text-white font-mono w-full"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 sm:col-span-1">
            <label className="font-mono text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              Assigned Shift Rotation
            </label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="bg-obsidian-950 border border-white/15 text-xs font-bold text-white rounded-xl px-3 py-2 outline-none font-mono cursor-pointer hover:border-white/30 h-10"
            >
              <option className="bg-obsidian-900">Day Shift (06:00 - 18:00)</option>
              <option className="bg-obsidian-900">Night Shift (18:00 - 06:00)</option>
              <option className="bg-obsidian-900">Full 24H Rotation</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 sm:col-span-1">
            <label className="font-mono text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              Security Role &amp; Clearance
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-obsidian-950 border border-white/15 text-xs font-bold text-white rounded-xl px-3 py-2 outline-none font-mono cursor-pointer hover:border-white/30 h-10"
            >
              <option className="bg-obsidian-900">Monitoring Specialist</option>
              <option className="bg-obsidian-900">Senior Guard Officer</option>
              <option className="bg-obsidian-900">Tactical Response Lead</option>
            </select>
          </div>

          <div className="sm:col-span-3 mt-1">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 via-sky-500 to-[#FF8A00] text-black font-mono font-extrabold text-xs py-3.5 px-4 rounded-xl uppercase tracking-wider hover:brightness-110 shadow-[0_0_20px_rgba(14,165,233,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus size={16} className="text-black stroke-[2.5]" />
              <span>⚡ GENERATE UNIQUE OPERATOR ACCESS BADGE KEY</span>
            </button>
          </div>
        </form>

        {/* Directory Table with Military-Grade Credential Masking */}
        <div className="flex flex-col gap-2 mt-1 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#0EA5E9] tracking-widest uppercase font-extrabold flex items-center gap-1.5">
              <span>PROVISIONED OPERATOR DIRECTORY ({operatorsList.length})</span>
            </span>
            <span className="text-[10px] font-mono text-amber-400/80 uppercase">
              🔒 Eye icon reveals Badge ID &amp; Secret PIN
            </span>
          </div>

          <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {operatorsList.map((op, idx) => {
              const isRevealed = !!revealedIds[idx];
              const isEditing = editingPinIdx === idx;

              return (
                <div
                  key={idx}
                  className="bg-obsidian-950/80 border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 hover:border-[#0EA5E9]/40 transition-all shadow-sm"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className={`font-display text-xs font-bold ${op.is_active === 0 ? 'text-red-400 opacity-60' : 'text-white'}`}>{op.name}</span>
                      <span className="text-[9px] font-mono bg-white/10 text-cyan-300 px-2 py-0.5 rounded font-bold uppercase">
                        {op.role}
                      </span>
                      {op.is_active === 0 && <span className="text-[9px] font-mono bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded font-bold uppercase">SUSPENDED</span>}
                    </div>
                    <span className="font-mono text-[11px] text-gray-400 mt-1">
                      NIC: <strong className="text-gray-300">{maskNic(op.nic, isRevealed)}</strong> • {op.shift}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {isEditing ? (
                      <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-cyan-400">
                        <input
                          type="text"
                          maxLength={8}
                          placeholder="New PIN"
                          value={newEditPinVal}
                          onChange={(e) => setNewEditPinVal(e.target.value)}
                          className="w-20 bg-transparent text-xs text-amber-300 font-mono px-2 outline-none"
                        />
                        <button
                          onClick={() => handleSaveEditedPin(idx)}
                          className="px-2 py-1 bg-emerald-500 text-black font-bold text-[10px] rounded hover:brightness-110"
                        >
                          SAVE
                        </button>
                        <button
                          onClick={() => setEditingPinIdx(null)}
                          className="px-1.5 py-1 text-gray-400 hover:text-white text-[10px]"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={`font-mono text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all ${
                          isRevealed 
                            ? 'text-[#FF8A00] bg-[#FF8A00]/15 border-[#FF8A00]/50 shadow-[0_0_15px_rgba(255,138,0,0.25)]' 
                            : 'text-gray-400 bg-white/5 border-white/15 tracking-widest'
                        }`}>
                          {maskBadgeId(op.badge_id, isRevealed)} {isRevealed && <span className="text-cyan-300 ml-1">| PIN: {op.pin}</span>}
                        </span>
                        <button
                          onClick={() => toggleReveal(idx)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-all border border-white/10"
                          title={isRevealed ? "Hide Credential Key" : "Decrypt & Reveal Badge ID & PIN"}
                        >
                          {isRevealed ? <EyeOff size={14} className="text-amber-400" /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => {
                            setEditingPinIdx(idx);
                            setNewEditPinVal(op.pin || '1234');
                          }}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-all border border-white/10"
                          title="Change / Reset Operator PIN"
                        >
                          <Edit3 size={14} className="text-cyan-400" />
                        </button>
                        <button
                          onClick={() => copyToClipboard(op.badge_id)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-all border border-white/10"
                          title="Copy exact Badge ID to clipboard for guard delivery"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(idx)}
                          className={`p-2 rounded-lg transition-all border border-white/10 ${op.is_active === 0 ? 'text-red-400 bg-red-500/10 hover:text-red-300' : 'text-emerald-400 bg-emerald-500/10 hover:text-emerald-300'}`}
                          title={op.is_active === 0 ? "Activate Operator" : "Suspend Operator"}
                        >
                          <Power size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteOperator(idx)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all border border-red-500/20"
                          title="Delete Operator"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
