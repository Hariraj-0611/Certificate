import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, Key, Trash2, Mail, Lock, CheckCircle2, AlertCircle, Shield, X, RefreshCw } from 'lucide-react';
import FormInput from '../components/FormInput';

const INITIAL_USERS = [
  {
    id: 'usr_root_1',
    email: 'info@apex.hadescoretech.com',
    role: 'Admin',
    isRoot: true,
    created_at: '2026-01-01',
  }
];

export default function UserManagement() {
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('app_users_list');
    if (!saved) return INITIAL_USERS;
    try {
      const parsed = JSON.parse(saved);
      const hasRoot = parsed.some(u => u.isRoot || u.email === 'info@apex.hadescoretech.com');
      if (!hasRoot) return [...INITIAL_USERS, ...parsed];
      return parsed;
    } catch (e) {
      return INITIAL_USERS;
    }
  });

  const [passwords, setPasswords] = useState(() => {
    const saved = localStorage.getItem('admin_passwords_map');
    let parsed = {};
    if (saved) {
      try { parsed = JSON.parse(saved); } catch (e) {}
    }
    return {
      'info@apex.hadescoretech.com': '@Hadescore@123',
      ...parsed
    };
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('');

  // Password Edit Modal State
  const [editUser, setEditUser] = useState(null);
  const [editPassword, setEditPassword] = useState('');

  const [toast, setToast] = useState(null);

  useEffect(() => {
    localStorage.setItem('app_users_list', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('admin_passwords_map', JSON.stringify(passwords));
  }, [passwords]);

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    const emailTrim = newUserEmail.trim().toLowerCase();

    if (!emailTrim || !newUserPassword || !newUserRole) {
      showToastMsg('Please enter email, password, and select an access role.', 'error');
      return;
    }

    if (users.some(u => u.email.toLowerCase() === emailTrim)) {
      showToastMsg('User with this email already exists.', 'error');
      return;
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      email: emailTrim,
      role: newUserRole,
      isRoot: false,
      created_at: new Date().toISOString().split('T')[0],
    };

    const updatedUsers = [...users, newUser];
    const updatedPasswords = { ...passwords, [emailTrim]: newUserPassword };

    setUsers(updatedUsers);
    setPasswords(updatedPasswords);

    localStorage.setItem('app_users_list', JSON.stringify(updatedUsers));
    localStorage.setItem('admin_passwords_map', JSON.stringify(updatedPasswords));

    setNewUserEmail('');
    setNewUserPassword('');
    setIsModalOpen(false);

    showToastMsg(`User ${emailTrim} created successfully! You can now log in with this account.`);
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (!editUser || !editPassword) return;

    const emailTrim = editUser.email.trim().toLowerCase();
    const updatedPasswords = { ...passwords, [emailTrim]: editPassword };

    setPasswords(updatedPasswords);
    localStorage.setItem('admin_passwords_map', JSON.stringify(updatedPasswords));

    showToastMsg(`Password updated for ${editUser.email}`);
    setEditUser(null);
    setEditPassword('');
  };

  const handleDeleteUser = (user) => {
    if (user.isRoot) {
      showToastMsg('Root Admin email cannot be deleted!', 'error');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${user.email}?`)) {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      showToastMsg(`User ${user.email} deleted successfully.`);
    }
  };

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-70px)] py-8 w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        
        {/* Toast Notification */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
            <div className={`border rounded-xl shadow-2xl p-4 pr-10 flex items-center gap-3 ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
              {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-600" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              <span className="text-xs font-bold">{toast.msg}</span>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-block px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-black uppercase tracking-wider mb-2">
              Admin Portal
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              User Management
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Manage system administrator accounts, security credentials, and access roles
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4" strokeWidth={2.5} />
            <span>Add New User</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white border-2 border-gray-200 rounded-3xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100/80 border-b border-gray-200 text-[11px] font-black uppercase tracking-wider text-gray-600">
                  <th className="py-4 px-6">User Email</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Account Status</th>
                  <th className="py-4 px-6">Created Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs font-semibold text-gray-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${u.isRoot ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-gray-100 text-gray-700'}`}>
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{u.email}</div>
                          {u.isRoot && (
                            <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Root Email (Protected)</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${u.isRoot ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-cyan-100 text-cyan-700 border border-cyan-200'}`}>
                        {u.role}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      {u.isRoot ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
                          <ShieldCheck className="w-3 h-3 text-amber-600" />
                          <span>Delete Protected</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-gray-500 font-bold">
                      {u.created_at}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Update Password Action */}
                        <button
                          onClick={() => {
                            setEditUser(u);
                            setEditPassword(passwords[u.email] || '@Hadescore@123');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors flex items-center gap-1 border border-indigo-200"
                          title="Update Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>Update Password</span>
                        </button>

                        {/* Delete Action - Disabled/Hidden for Root User */}
                        {!u.isRoot && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors border border-transparent hover:border-red-200"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add New User Modal - Inline without navigating pages */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border-2 border-gray-200 rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-wide">
                    Create New User
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <FormInput
                  label="User Email Address"
                  name="newUserEmail"
                  type="email"
                  placeholder="Enter user email address"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  icon={Mail}
                  required
                />

                <FormInput
                  label="Initial Password"
                  name="newUserPassword"
                  type="password"
                  placeholder="Enter initial password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  icon={Lock}
                  required
                />

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-2">
                    Access Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className={`w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-400 ${!newUserRole ? 'text-gray-400 font-bold' : 'text-gray-900 font-bold'}`}
                    required
                  >
                    <option value="" disabled hidden>CHOOSE ACCESS ROLE</option>
                    <option value="Admin" className="text-gray-900 font-bold">Admin</option>
                    <option value="Operation Team" className="text-gray-900 font-bold">Operation Team</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-bold text-xs uppercase hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-md"
                  >
                    Save User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Update Modal */}
        {editUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border-2 border-gray-200 rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-black text-gray-900 uppercase tracking-wide">
                    Update Password
                  </h3>
                </div>
                <button
                  onClick={() => setEditUser(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs">
                <span className="font-bold text-gray-500">Target User:</span>{' '}
                <span className="font-black text-gray-900">{editUser.email}</span>
                {editUser.isRoot && (
                  <p className="text-[11px] text-indigo-600 font-bold mt-1">
                    * Root email cannot be deleted. Password update only.
                  </p>
                )}
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <FormInput
                  label="New Password"
                  name="editPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  icon={Lock}
                  required
                />

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditUser(null)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-bold text-xs uppercase hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-md"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
