import React, { useState } from 'react';
import { User, Mail, Key, CheckCircle2, AlertCircle, Lock, ShieldCheck, Save } from 'lucide-react';
import FormInput from '../components/FormInput';

export default function Profile() {
  const currentEmail = sessionStorage.getItem('admin_email') || 'info@apex.hadescoretech.com';
  const currentRole = sessionStorage.getItem('admin_role') || 'Admin';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [toast, setToast] = useState(null);

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToastMsg('Please fill in all password fields.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToastMsg('New password and confirm password do not match.', 'error');
      return;
    }

    const savedPasswordsStr = localStorage.getItem('admin_passwords_map');
    let savedPasswords = {};
    if (savedPasswordsStr) {
      try { savedPasswords = JSON.parse(savedPasswordsStr); } catch (err) {}
    }

    const emailKey = currentEmail.trim().toLowerCase();
    savedPasswords[emailKey] = newPassword;
    localStorage.setItem('admin_passwords_map', JSON.stringify(savedPasswords));

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToastMsg('Account password updated successfully!');
  };

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-70px)] py-10 w-full flex flex-col items-center">
      <div className="max-w-2xl w-full px-4 sm:px-6">
        
        {/* Notification Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
            <div className={`border rounded-xl shadow-xl p-3.5 pr-8 flex items-center gap-3 ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
              {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              <span className="text-xs font-bold">{toast.msg}</span>
            </div>
          </div>
        )}

        {/* Page Title */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Account Settings
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            View your profile details and update security password
          </p>
        </div>

        {/* Single Unified Pristine Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          
          {/* Header Profile Banner */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center shadow-md text-2xl font-black">
              {currentEmail.charAt(0).toUpperCase()}
            </div>
            
            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-base font-bold text-slate-900 truncate">
                  {currentEmail}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-[11px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3 text-cyan-600" />
                  {currentRole}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Root System Administrator &bull; HADESCORE PVT LTD
              </p>
            </div>
          </div>

          {/* Password Security Form */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Change Password
              </h3>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <FormInput
                label="Current Password"
                name="currentPassword"
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                icon={Lock}
                required
              />

              <FormInput
                label="New Password"
                name="newPassword"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                icon={Key}
                required
              />

              <FormInput
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={CheckCircle2}
                required
              />

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-100 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
