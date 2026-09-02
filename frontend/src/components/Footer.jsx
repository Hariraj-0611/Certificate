import React from 'react';
import logoImg from '../assets/hadescore_logo.png';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <img 
            src={logoImg} 
            alt="Hadescore Logo" 
            className="w-8 h-8 object-contain"
          />
          <div className="text-left">
            <div className="font-black text-sm text-gray-900 leading-none">
              HADESCORE APEX
            </div>
            <div className="text-[9px] text-cyan-600 font-bold tracking-wide">
              & TECHNOLOGIES
            </div>
          </div>
        </div>
        <p className="text-xs font-semibold text-gray-700 mb-1">
          A Branch of HADESCORE PRIVATE LIMITED
        </p>
        <p className="text-xs text-gray-500 mb-3">
          UDYAM Reg: <span className="font-semibold text-gray-700">UDYAM-TN-14-0089975</span> | 
          ISO 21001:2018: <span className="font-semibold text-gray-700">IN01233085</span>
        </p>
        <p className="text-[10px] text-gray-400">
          © {new Date().getFullYear()} Hadescore Apex & Technologies. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
