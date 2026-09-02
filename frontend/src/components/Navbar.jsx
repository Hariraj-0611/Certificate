import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Lock, 
  LogOut, 
  Home, 
  BarChart3, 
  FileText, 
  Briefcase, 
  Award, 
  FilePlus, 
  Users, 
  Mail, 
  Menu as MenuIcon, 
  X, 
  User, 
  ChevronRight,
  ShieldCheck,
  Layers
} from 'lucide-react';
import logoImg from '../assets/hadescore_logo.png';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return Boolean(sessionStorage.getItem('admin_token'));
  });

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const userRole = sessionStorage.getItem('admin_role') || 'Admin';

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_email');
    sessionStorage.removeItem('admin_role');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    setIsAdminLoggedIn(false);
    setIsMobileDrawerOpen(false);
    navigate('/login', { replace: true });
  };

  const currentEmail = (sessionStorage.getItem('admin_email') || '').toLowerCase();
  const isRootAdmin = currentEmail === "info@apex.hadescoretech.com";

  // Sync auth state & close mobile drawer on route navigation
  useEffect(() => {
    setIsAdminLoggedIn(Boolean(sessionStorage.getItem('admin_token')));
    setIsMobileDrawerOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;

  const renderNavLinks = () => (
    <div className="space-y-6">
      {/* Section 1: Main Dashboards */}
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-3 mb-2">
          Dashboards
        </h4>
        <div className="space-y-1">
          <Link
            to="/"
            className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
              isActive('/') 
                ? 'bg-cyan-100 text-cyan-800 font-black shadow-sm' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-cyan-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <Home className="w-4 h-4 text-cyan-600" strokeWidth={2.5} />
              <span>Home</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            to="/dashboard"
            className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
              isActive('/dashboard') 
                ? 'bg-cyan-100 text-cyan-800 font-black shadow-sm' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-cyan-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-cyan-600" strokeWidth={2.5} />
              <span>Dashboard</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Section 2: Certificate Generators */}
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-3 mb-2">
          Certificates & Forms
        </h4>
        <div className="space-y-1">
          <Link
            to="/certificates/course-completion"
            className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
              isActive('/certificates/course-completion') 
                ? 'bg-cyan-100 text-cyan-800 font-black shadow-sm' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-cyan-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-blue-600" strokeWidth={2.5} />
              <span>Course Completion</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            to="/certificates/internship"
            className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
              isActive('/certificates/internship') 
                ? 'bg-cyan-100 text-cyan-800 font-black shadow-sm' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-cyan-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <Briefcase className="w-4 h-4 text-teal-600" strokeWidth={2.5} />
              <span>Internship Certificate</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            to="/certificates/campus-ambassador"
            className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
              isActive('/certificates/campus-ambassador') 
                ? 'bg-cyan-100 text-cyan-800 font-black shadow-sm' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-cyan-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <Award className="w-4 h-4 text-purple-600" strokeWidth={2.5} />
              <span>Campus Ambassador</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            to="/certificates/offer-letter"
            className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
              isActive('/certificates/offer-letter') 
                ? 'bg-cyan-100 text-cyan-800 font-black shadow-sm' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-cyan-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <FilePlus className="w-4 h-4 text-amber-600" strokeWidth={2.5} />
              <span>Internship Offer Letter</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            to="/certificates/tech-offer-letter"
            className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
              isActive('/certificates/tech-offer-letter') 
                ? 'bg-cyan-100 text-cyan-800 font-black shadow-sm' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-cyan-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <FilePlus className="w-4 h-4 text-cyan-600" strokeWidth={2.5} />
              <span>Tech Offer Letter</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Section 3: Admin Configuration & Tools */}
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-3 mb-2">
          Admin Tools
        </h4>
        <div className="space-y-1">
          <Link
            to="/email-templates"
            className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
              isActive('/email-templates') 
                ? 'bg-cyan-100 text-cyan-800 font-black shadow-sm' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-cyan-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-cyan-600" strokeWidth={2.5} />
              <span>Email Templates</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>

          {isRootAdmin && (
            <Link
              to="/admin/users"
              className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                isActive('/admin/users') 
                  ? 'bg-cyan-100 text-cyan-800 font-black shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-cyan-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-purple-600" strokeWidth={2.5} />
                <span>User Management</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ========================================================================= */}
      {/* PERSISTENT STATIC LEFT SIDEBAR (ALWAYS VISIBLE ON DESKTOP lg:flex) */}
      {/* ========================================================================= */}
      {isAdminLoggedIn && (
        <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-gray-200/80 shadow-sm z-40 flex-col justify-between overflow-y-auto">
          <div>
            {/* Sidebar Top Logo Header */}
            <div className="p-5 border-b border-gray-100 bg-slate-50/50 flex items-center gap-3">
              <Link to="/" className="flex items-center gap-3 group">
                <img 
                  src={logoImg} 
                  alt="Hadescore Apex Logo" 
                  className="w-10 h-10 object-contain transition-transform group-hover:scale-105"
                />
                <div>
                  <div className="font-black text-sm tracking-tight text-gray-900 leading-tight">
                    HADESCORE APEX
                  </div>
                  <div className="text-[10px] text-cyan-600 font-bold tracking-wide">
                    & TECHNOLOGIES
                  </div>
                </div>
              </Link>
            </div>

            {/* Sidebar Menu Items */}
            <div className="p-4">
              {renderNavLinks()}
            </div>
          </div>

          {/* Sidebar Bottom Profile & Logout Footer */}
          <div className="p-4 border-t border-gray-100 bg-slate-50/60 space-y-3">
            <Link
              to="/profile"
              className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-gray-200 hover:border-cyan-300 transition-all"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-black text-xs flex items-center justify-center uppercase shadow-sm shrink-0">
                {currentEmail ? currentEmail.charAt(0) : 'A'}
              </div>
              <div className="overflow-hidden text-left">
                <p className="text-xs font-black text-gray-900 leading-tight truncate">{userRole}</p>
                <p className="text-[9px] font-bold text-cyan-600 leading-tight truncate">{currentEmail}</p>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-black text-xs uppercase tracking-wider rounded-xl transition-all border border-red-200/60"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>Log Out</span>
            </button>
          </div>
        </aside>
      )}

      {/* Mobile Top Header (Hidden on Desktop since Static Left Sidebar is active) */}
      <header className={`lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200/60 shadow-sm w-full`}>
        <div className="w-full px-4 sm:px-8">
          <div className="flex items-center justify-between h-[60px]">
            {/* Mobile Hamburger Toggle & Logo */}
            <div className="flex items-center gap-3">
              {isAdminLoggedIn && (
                <button
                  onClick={() => setIsMobileDrawerOpen(true)}
                  className="p-2 rounded-xl bg-slate-900 text-white hover:bg-black transition-colors"
                  title="Open Navigation Menu"
                >
                  <MenuIcon className="w-5 h-5 text-cyan-400" strokeWidth={2.5} />
                </button>
              )}

              <Link to="/" className="flex items-center gap-2.5">
                <img src={logoImg} alt="Hadescore Logo" className="w-8 h-8 object-contain" />
                <div className="font-black text-sm tracking-tight text-gray-900">
                  HADESCORE APEX
                </div>
              </Link>
            </div>

            {!isAdminLoggedIn && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-xl font-bold">
                <Lock className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>Protected</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer (Only shown on small screens when hamburger is clicked) */}
      {isAdminLoggedIn && isMobileDrawerOpen && (
        <>
          <div 
            onClick={() => setIsMobileDrawerOpen(false)}
            className="lg:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm transition-opacity"
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl flex flex-col justify-between p-4 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2">
                  <img src={logoImg} alt="Hadescore" className="w-8 h-8 object-contain" />
                  <span className="font-black text-sm text-gray-900">HADESCORE</span>
                </div>
                <button onClick={() => setIsMobileDrawerOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {renderNavLinks()}
            </div>
            <div className="pt-4 border-t border-gray-100">
              <button onClick={handleLogout} className="w-full py-2.5 bg-red-600 text-white font-bold text-xs rounded-xl">
                Log Out
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
