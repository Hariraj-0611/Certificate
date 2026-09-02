import React from 'react';
import { Calendar } from 'lucide-react';

export default function DateInput({ label, name, value, onChange, required = true }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-bold text-gray-800 flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
          <Calendar className="w-[18px] h-[18px]" strokeWidth={2.5} />
        </div>
        <input
          type="date"
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full bg-white border-2 border-gray-200 rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-50 transition-all cursor-pointer"
        />
      </div>
    </div>
  );
}
