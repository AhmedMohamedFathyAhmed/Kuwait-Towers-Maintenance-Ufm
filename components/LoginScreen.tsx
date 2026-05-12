
import React, { useState, useEffect } from 'react';
import { Lock, Building2, KeyRound, ShieldAlert, Power, Fingerprint, RefreshCcw, CalendarClock, AlertTriangle, Eye, Loader2 } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (role: 'ADMIN' | 'CLIENT') => void;
}

// Helper to get local date string YYYY-MM-DD
const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // System State
  const [isSystemLocked, setIsSystemLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState<string | null>(null);
  
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);

  // --- REMOTE CONTROL CHECK ---
  const checkRemoteStatus = async () => {
      setIsLoading(true);
      try {
          // Use absolute path for public assets in SPAs
          // Adding timestamp to prevent browser caching
          const response = await fetch(`/system_config.json?v=${Date.now()}`);
          if (response.ok) {
              const contentType = response.headers.get("content-type");
              if (contentType && contentType.includes("application/json")) {
                  const config = await response.json();
                  
                  // 1. Check Explicit Status
                  if (config.status === 'LOCKED') {
                      setIsSystemLocked(true);
                      setLockMessage(config.lockMessage || 'System Disabled by Administrator');
                  } 
                  
                  // 2. Check Expiry Date
                  else if (config.expiryDate) {
                      const today = getTodayString();
                      if (today > config.expiryDate) {
                          setIsSystemLocked(true);
                          setLockMessage('SUBSCRIPTION EXPIRED. Please contact the developer.');
                      } else {
                          // System is fine
                          setIsSystemLocked(false);
                          setLicenseExpiry(config.expiryDate);
                      }
                  } else {
                      setIsSystemLocked(false);
                  }
              } else {
                  console.warn("Remote config found but is not JSON. Likely index.html fallback.");
                  setIsSystemLocked(false);
              }
          } else {
              console.warn("System config file not found. Defaulting to ACTIVE.");
              setIsSystemLocked(false);
          }
      } catch (err) {
          console.error("Failed to load remote config", err);
          setIsSystemLocked(false);
      } finally {
          setIsLoading(false);
      }
  };

  // Check on mount
  useEffect(() => {
    checkRemoteStatus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // --- 1. OWNER MASTER KEY ---
    // Bypass everything
    if (password === 'Ahmed@Owner') {
      setShowOwnerPanel(true);
      setError('');
      return;
    }

    // --- 2. CHECK LOCK STATUS ---
    if (isSystemLocked) {
      setError(lockMessage || 'System Access is Restricted.');
      setPassword('');
      return;
    }

    // --- 3. ROLES LOGIN ---
    if (password === 'UFM123' || password === 'admin') {
      onLogin('ADMIN');
      return;
    }

    if (password === 'Client@View' || password === 'client') {
       onLogin('CLIENT');
       return;
    }

    setError('Access Denied: Incorrect Password');
    setPassword('');
  };

  const handleManualUnlock = () => {
      setIsSystemLocked(false);
      setShowOwnerPanel(false);
      alert("System UNLOCKED manually for this session.");
  };

  const handleManualLock = () => {
      setIsSystemLocked(true);
      setLockMessage("MANUAL LOCK ENABLED BY OWNER");
      setShowOwnerPanel(false);
      alert("System LOCKED manually for this session.");
  };

  // --- HIDDEN OWNER PANEL RENDER ---
  if (showOwnerPanel) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-mono text-green-500">
        <div className="bg-black/80 border border-green-500/30 p-8 rounded-xl w-full max-w-lg shadow-[0_0_50px_rgba(0,255,0,0.1)] backdrop-blur-md relative overflow-hidden">
          
          <div className="flex items-center gap-4 mb-6 border-b border-green-500/30 pb-4">
             <Fingerprint size={48} className="text-green-400" />
             <div>
               <h1 className="text-2xl font-bold tracking-widest text-white">OWNER DASHBOARD</h1>
               <p className="text-xs text-green-400">Remote Control Status View</p>
             </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
              <h2 className="text-sm font-bold text-slate-400 mb-2 uppercase">Current Remote Status</h2>
              <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400">System State:</span>
                  <span className={`text-xs font-bold ${isSystemLocked ? 'text-red-500' : 'text-green-500'}`}>
                      {isSystemLocked ? 'LOCKED' : 'ACTIVE'}
                  </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400">License Expiry:</span>
                  <span className="text-xs text-white">{licenseExpiry || 'Lifetime / Not Set'}</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">
                  * To permanently change this, edit <b>public/system_config.json</b>.
              </p>
            </div>

            {/* Manual Override */}
            <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
               <h2 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2 mb-2">
                    <Power size={14} /> Emergency Override
               </h2>
               <p className="text-xs text-slate-500 mb-4">
                   Force toggle system state for this specific browser session.
               </p>
               <div className="grid grid-cols-2 gap-3">
                 <button 
                  onClick={handleManualUnlock}
                  className="px-4 py-3 rounded font-bold text-xs bg-green-600 hover:bg-green-500 text-white transition-opacity disabled:opacity-50"
                  disabled={!isSystemLocked}
                 >
                   MANUAL UNLOCK
                 </button>
                 <button 
                  onClick={handleManualLock}
                  className="px-4 py-3 rounded font-bold text-xs bg-red-600 hover:bg-red-500 text-white transition-opacity disabled:opacity-50"
                  disabled={isSystemLocked}
                 >
                   MANUAL LOCK
                 </button>
               </div>
            </div>

            <button 
              onClick={() => setShowOwnerPanel(false)}
              className="w-full mt-4 border border-green-500/30 hover:bg-green-500/10 text-green-500 py-3 rounded uppercase text-xs tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCcw size={14} />
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- NORMAL LOGIN RENDER ---
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-md border border-gray-200">
        
        {/* Header Section */}
        <div className={`p-8 text-center relative overflow-hidden transition-colors duration-500 ${isSystemLocked ? 'bg-red-900' : 'bg-teal-800'}`}>
            <div className="relative z-10 flex flex-col items-center">
                <div className="bg-white/10 p-4 rounded-full mb-4 backdrop-blur-sm">
                    {isSystemLocked ? <ShieldAlert className="text-white" size={40} /> : <Building2 className="text-white" size={40} />}
                </div>
                <h1 className="text-3xl font-bold text-white tracking-wide">UFM</h1>
                <p className="text-teal-100 text-sm uppercase tracking-wider mt-1">
                  {isSystemLocked ? 'System Locked' : 'Maintenance Log System'}
                </p>
            </div>
            
            {/* Decorative circles */}
            <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
            <div className="absolute bottom-[-20px] right-[-20px] w-40 h-40 bg-teal-600/20 rounded-full blur-xl"></div>
        </div>

        {/* Form Section */}
        <div className="p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center flex items-center justify-center gap-2">
              {isLoading ? (
                  <>Checking System <Loader2 className="animate-spin" size={18}/></>
              ) : isSystemLocked ? (
                  'Access Restricted'
              ) : (
                  'System Login'
              )}
            </h2>
            
            <form onSubmit={handleSubmit}>
            <div className="mb-5">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Password / Access Code</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <KeyRound className="text-gray-400 group-focus-within:text-teal-600 transition-colors" size={18} />
                    </div>
                    <input 
                    type="password" 
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all bg-gray-50 focus:bg-white"
                    placeholder={isSystemLocked ? "Contact Administrator..." : "Enter password..."}
                    autoFocus
                    disabled={isLoading}
                    />
                </div>
            </div>
            
            {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 flex items-center justify-center gap-2 border border-red-100 text-center animate-in fade-in slide-in-from-top-1">
                    <AlertTriangle size={14} className="flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <button 
                type="submit"
                disabled={isSystemLocked && password !== 'Ahmed@Owner'}
                className={`w-full font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg transform active:scale-[0.99] flex items-center justify-center gap-2 ${
                  isSystemLocked 
                    ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
                    : 'bg-teal-800 hover:bg-teal-900 text-white'
                }`}
            >
                {isSystemLocked ? 'System Disabled' : 'Access Dashboard'}
            </button>
            </form>
            
            <div className="mt-8 text-center border-t pt-4">
                <p className="text-xs text-gray-400 mb-2">Client View Access available</p>
                <div className="inline-flex items-center gap-1 text-[10px] text-teal-600 bg-teal-50 px-2 py-1 rounded-full border border-teal-100">
                    <Eye size={12} />
                    <span>Login: Client@View</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
