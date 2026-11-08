import React, { useState } from 'react';
import { 
  Lock, User, Key, ShieldCheck, CheckCircle2, AlertTriangle, 
  Eye, EyeOff, Sparkles, Building2, ChevronRight, X, Hash
} from 'lucide-react';
import { AUTH_USERS, authenticateUser } from '../data/authUsers';

export const DEFAULT_SHIFT_PIN = "2026";

export default function LoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUsername = '',
  isMandatoryGate = false
}) {
  const [username, setUsername] = useState(currentUsername || AUTH_USERS[0].username);
  const [authMethod, setAuthMethod] = useState('password'); // 'password' | 'pin'
  const [password, setPassword] = useState('');
  const [shiftPin, setShiftPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    setTimeout(() => {
      let matchedUser = null;

      if (authMethod === 'password') {
        matchedUser = authenticateUser(username, password);
      } else {
        // Shift PIN verification
        if (shiftPin.trim() === DEFAULT_SHIFT_PIN) {
          matchedUser = AUTH_USERS.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
        }
      }

      if (matchedUser) {
        onLoginSuccess(matchedUser);
        setPassword('');
        setShiftPin('');
        setErrorMsg('');
      } else {
        if (authMethod === 'password') {
          setErrorMsg('Invalid username or password. Please verify your credentials.');
        } else {
          setErrorMsg(`Invalid 4-digit shift PIN for ${username}. (Default active shift PIN: ${DEFAULT_SHIFT_PIN})`);
        }
      }
      setLoading(false);
    }, 200);
  };

  // Quick select pre-fills ONLY the username; never auto-fills password
  const handleQuickSelect = (u) => {
    setUsername(u.username);
    setPassword('');
    setShiftPin('');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#E2D1B8] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#3D1C52] text-white p-6 relative border-b border-[#C8963E]/40 text-center">
          {!isMandatoryGate && onClose && (
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              title="Close (stay in current session)"
            >
              <X size={18} />
            </button>
          )}

          <div className="w-14 h-14 mx-auto rounded-full bg-white p-1.5 border-2 border-[#C8963E] shadow-lg flex items-center justify-center mb-3">
            <img 
              src="https://raw.githubusercontent.com/zzp-systems/jjb-systems/refs/heads/main/jjb-logo-transaparent.png" 
              alt="JJB Logo" 
              className="w-full h-full object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          <h2 className="font-serif font-bold text-xl text-white">JJB Warehouse &amp; Kitting OS</h2>
          <p className="text-xs text-[#E5C585] mt-1 font-medium">
            Staff Authentication &amp; Access Control Gate · SOP-WAR-002
          </p>
          <div className="inline-flex items-center gap-1.5 mt-2 bg-[#240e32] px-3 py-1 rounded-full text-[11px] text-gray-300 border border-[#C8963E]/30 font-mono">
            <ShieldCheck size={13} className="text-[#C8963E]" />
            <span>Indangan Plant FDA LTO #3000013388488</span>
          </div>
        </div>

        {/* Quick User Selector Bar (Pre-fills Username ONLY) */}
        <div className="bg-[#FAF6EE] p-3.5 border-b border-[#E2D1B8]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
              1. Tap Role Chip to Pre-Fill Username:
            </p>
            <span className="text-[10px] text-[#C8963E] font-bold">
              (Password NEVER auto-filled)
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {AUTH_USERS.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickSelect(u)}
                className={`p-1.5 rounded-lg border text-center transition flex flex-col items-center justify-center ${
                  username.toLowerCase() === u.username.toLowerCase()
                    ? 'border-[#3D1C52] bg-[#3D1C52] text-white shadow-sm ring-1 ring-[#C8963E]'
                    : 'border-gray-200 bg-white hover:bg-gray-100 text-gray-700'
                }`}
                title={`${u.name} (${u.title})`}
              >
                <div className={`w-5 h-5 rounded-full ${u.avatarBg} text-white text-[9px] font-bold flex items-center justify-center mb-0.5`}>
                  {u.name.charAt(0)}
                </div>
                <span className="text-[10px] font-semibold truncate w-full">{u.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Authentication Mode Switcher: Password vs 4-Digit Shift PIN */}
        <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setAuthMethod('password'); setErrorMsg(''); }}
            className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition ${
              authMethod === 'password'
                ? 'bg-white text-[#3D1C52] border-b-2 border-[#3D1C52] font-bold shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Key size={13} />
            <span>Master Password</span>
          </button>
          <button
            type="button"
            onClick={() => { setAuthMethod('pin'); setErrorMsg(''); }}
            className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition ${
              authMethod === 'pin'
                ? 'bg-white text-[#1E7A3E] border-b-2 border-[#1E7A3E] font-bold shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Hash size={13} />
            <span>4-Digit Floor Shift PIN</span>
            <span className="bg-[#1E7A3E] text-white text-[9px] px-1.5 rounded">Fast Switch</span>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Authorized Staff Username
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. jadedelacruz, romeomalusay..."
                required
                className="w-full pl-9 pr-4 py-2.5 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C8963E] font-medium"
              />
            </div>
          </div>

          {authMethod === 'password' ? (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-700">
                  Security Password
                </label>
                <span className="text-[10px] text-gray-400">Production Auth</span>
              </div>
              <div className="relative">
                <Key size={15} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter authorized password..."
                  required
                  autoFocus
                  className="w-full pl-9 pr-10 py-2.5 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C8963E] font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-700">
                  4-Digit Active Shift PIN
                </label>
                <span className="text-[10px] text-[#1E7A3E] font-bold">Shift: {DEFAULT_SHIFT_PIN}</span>
              </div>
              <div className="relative">
                <Hash size={15} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="password"
                  maxLength={4}
                  value={shiftPin}
                  onChange={(e) => setShiftPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 4-digit shift PIN (e.g. 2026)"
                  required
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E7A3E] font-mono tracking-widest text-base font-bold text-center"
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Allows fast operator switching between Jade &amp; Romeo on shared floor tablets.
              </p>
            </div>
          )}

          {/* Active Selection Details Preview */}
          {(() => {
            const selected = AUTH_USERS.find(u => u.username.toLowerCase() === username.toLowerCase());
            if (!selected) return null;
            return (
              <div className="bg-[#FAF6EE] p-3 rounded-xl border border-[#E2D1B8] text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#3D1C52]">{selected.name}</span>
                  <span className="text-[10px] font-mono bg-[#5B2E7A] text-white px-2 py-0.5 rounded font-bold">
                    {selected.title}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600">
                  <strong className="text-gray-700">Station:</strong> {selected.station}
                </p>
                <p className="text-[10px] text-gray-500 italic">
                  {selected.description}
                </p>
              </div>
            );
          })()}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3D1C52] hover:bg-[#240e32] disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <Lock size={14} className="text-[#C8963E]" />
              <span>{loading ? 'Verifying Credentials...' : 'Authenticate & Unlock WMS Terminal'}</span>
            </button>
          </div>
        </form>

        {/* Footer Reference */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <span>Enterprise Role Gate</span>
          <span className="font-mono text-gray-400">v4.6 Auth Security</span>
        </div>
      </div>
    </div>
  );
}
