import React from 'react';

export default function FormSelect({
  label,
  name,
  value,
  onChange,
  options = [],
  required = true,
  icon: Icon,
}) {
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
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className={`w-full bg-white border-2 border-gray-200 rounded-xl py-3 ${
            Icon ? 'pl-11' : 'pl-4'
          } pr-10 text-sm font-medium text-gray-900 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-50 transition-all appearance-none cursor-pointer`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
