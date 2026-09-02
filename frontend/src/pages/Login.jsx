import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FormInput from '../components/FormInput';
import { Lock, Mail, CheckCircle2, Shield, AlertCircle, X } from 'lucide-react';
import logoImg from '../assets/hadescore_logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem('admin_token') === 'authorized_root_admin') {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setShowToast(false);

    const inputEmail = email.trim().toLowerCase();

    // Fetch dynamic users list from localStorage
    const savedUsersStr = localStorage.getItem('app_users_list');
    let savedUsers = [];
    if (savedUsersStr) {
      try {
        savedUsers = JSON.parse(savedUsersStr);
      } catch (e) {
        savedUsers = [];
      }
    }

    // Default allowed root emails
    const defaultEmails = [
      "info@apex.hadescoretech.com"
    ];

    // Build complete set of authorized emails
    const allValidEmails = new Set([
      ...defaultEmails.map(e => e.toLowerCase()),
      ...savedUsers.map(u => (u.email || '').trim().toLowerCase())
    ]);

    const isEmailValid = allValidEmails.has(inputEmail);

    // Fetch dynamic passwords map from localStorage
    const savedPasswordsStr = localStorage.getItem('admin_passwords_map');
    let savedPasswords = {};
    if (savedPasswordsStr) {
      try {
        savedPasswords = JSON.parse(savedPasswordsStr);
      } catch (e) {
        savedPasswords = {};
      }
    }

    // Look up user password (case-insensitive key search)
    let savedPasswordForEmail = null;
    for (const [keyEmail, passVal] of Object.entries(savedPasswords)) {
      if (keyEmail.trim().toLowerCase() === inputEmail) {
        savedPasswordForEmail = passVal;
        break;
      }
    }

    const isRootAdmin = inputEmail === 'info@apex.hadescoretech.com';
    const isMasterPassword = password === '@Hadescore@123';
    const matchesSavedPassword = savedPasswordForEmail ? password === savedPasswordForEmail : false;

    // Master root password @Hadescore@123 ALWAYS works for root admin, plus any custom saved passwords
    const isPasswordCorrect = (isRootAdmin && isMasterPassword) || matchesSavedPassword || (password === "@Hadescore@123");

    if (!isEmailValid || !isPasswordCorrect) {
      setShowToast(true);
      setEmail('');
      setPassword('');
      setLoading(false);
      return;
    }

    // Determine user role
    let matchedUser = savedUsers.find(u => (u.email || '').trim().toLowerCase() === inputEmail);
    let userRole = matchedUser ? matchedUser.role : 'Admin';

    // Instant Authentication & Fast SPA Navigation
    sessionStorage.setItem('admin_token', 'authorized_root_admin');
    sessionStorage.setItem('admin_email', inputEmail);
    sessionStorage.setItem('admin_role', userRole);
    setLoading(false);
    navigate('/', { replace: true });
  };

  return (
    <>
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-white border border-red-200 rounded-xl shadow-2xl p-4 pr-12 max-w-sm flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Invalid Credentials</h3>
              <p className="text-xs text-gray-600 mt-0.5">Access denied. Root admin only.</p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-screen flex items-center justify-center w-full px-4 py-8">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          
          {/* Ambient Glow accents */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-100 rounded-full blur-3xl pointer-events-none opacity-40" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-100 rounded-full blur-3xl pointer-events-none opacity-40" />

          <div className="text-center mb-6 relative z-10">
            <img 
              src={logoImg} 
              alt="Hadescore Apex Logo" 
              className="w-20 h-20 mx-auto mb-3 object-contain drop-shadow-md"
            />
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-wide">
              HADESCORE APEX
            </h1>
            <p className="text-sm text-indigo-600 font-black tracking-widest uppercase mt-0.5">
              & TECHNOLOGIES
            </p>
            <p className="text-[11px] text-gray-500 font-bold tracking-wider uppercase mt-1">
              Certificate Automation
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            <FormInput
              label="Email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              required
            />

            <FormInput
              label="Password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={Lock}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-200 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Log In to System</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200 text-center relative z-10">
            <p className="text-[11px] text-gray-500 font-medium">
              Hadescore APEX & Technologies &copy; 2026. All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
