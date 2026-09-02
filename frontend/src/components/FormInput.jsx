import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function FormInput({ label, name, type = 'text', placeholder, value, onChange, required = true, icon: Icon, uppercase = false }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const isUppercase = uppercase || name === 'name' || name === 'cert_id';

  const handleChange = (e) => {
    if (isUppercase && e.target.value) {
      e.target.value = e.target.value.toUpperCase();
    }
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-bold text-gray-800 flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
            <Icon className="w-[18px] h-[18px]" strokeWidth={2.5} />
          </div>
        )}
        <input
          type={inputType}
          name={name}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          className={`w-full bg-white border-2 border-gray-200 rounded-xl py-3 ${
            Icon ? 'pl-11' : 'pl-4'
          } ${isPassword ? 'pr-11' : 'pr-4'} text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-50 transition-all ${
            isUppercase ? 'uppercase font-bold tracking-wide' : 'font-medium'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-[18px] h-[18px]" strokeWidth={2.5} />
            ) : (
              <Eye className="w-[18px] h-[18px]" strokeWidth={2.5} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
