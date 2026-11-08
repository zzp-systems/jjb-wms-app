import React, { useState } from 'react';
import { 
  Lock, User, Key, ShieldCheck, CheckCircle2, AlertTriangle, 
  Eye, EyeOff, Sparkles, Building2, ChevronRight, X
} from 'lucide-react';
import { AUTH_USERS, authenticateUser } from '../data/authUsers';

export default function LoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUsername = ''
}) {
  const [username, setUsername] = useState(currentUsername);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    setTimeout(() => {
      const user = authenticateUser(username, password);
      if (user) {
        onLoginSuccess(user);
        setPassword('');
        setErrorMsg('');
      } else {
        setErrorMsg('Invalid username or password. Please verify credentials.');
      }
      setLoading(false);
    }, 200);
  };

  const handleQuickSelect = (u) => {
    setUsername(u.username);
    setPassword('');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#E2D1B8] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#3D1C52] text-white p-6 relative border-b border-[#C8963E]/40 text-center">
          {onClose && (
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
            Staff Role Authentication Gateway · SOP-WAR-002
          </p>
          <div className="inline-flex items-center gap-1.5 mt-2 bg-[#240e32] px-3 py-1 rounded-full text-[11px] text-gray-300 border border-[#C8963E]/30 font-mono">
            <ShieldCheck size={13} className="text-[#C8963E]" />
            <span>Indangan Plant FDA LTO #3000013388488</span>
          </div>
        </div>

        {/* Quick User Selector Bar */}
        <div className="bg-[#FAF6EE] p-3 border-b border-[#E2D1B8]">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 text-center">
            Select Terminal User to Pre-Fill:
          </p>
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
              Terminal Username
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

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Security Password
            </label>
            <div className="relative">
              <Key size={15} className="absolute left-3 top-3 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter authorized password..."
                required
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
              <span>{loading ? 'Authenticating...' : 'Sign In to Warehouse & Kitting OS'}</span>
            </button>
          </div>
        </form>

        {/* Footer Reference */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <span>Single Session Terminal Mode</span>
          <span className="font-mono text-gray-400">v4.6 Auth Guard</span>
        </div>
      </div>
    </div>
  );
}
