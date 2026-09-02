import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const colorMap = {
  cyan: {
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-700',
    icon: 'text-cyan-600',
    hover: 'hover:border-cyan-400 hover:shadow-cyan-100',
  },
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    icon: 'text-indigo-600',
    hover: 'hover:border-indigo-400 hover:shadow-indigo-100',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    icon: 'text-purple-600',
    hover: 'hover:border-purple-400 hover:shadow-purple-100',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: 'text-blue-600',
    hover: 'hover:border-blue-400 hover:shadow-blue-100',
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    icon: 'text-emerald-600',
    hover: 'hover:border-emerald-400 hover:shadow-emerald-100',
  },
};

export default function CertificateCard({ title, subtitle, icon: Icon, route, tag, color = 'cyan' }) {
  const colors = colorMap[color];

  return (
    <Link
      to={route}
      className={`group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white border-2 ${colors.border} ${colors.hover} card-hover shadow-sm transition-all`}
    >
      <div className="absolute top-3.5 right-3.5">
        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${colors.bg} ${colors.text} ${colors.border} border`}>
          {tag}
        </span>
      </div>

      <div>
        <div className={`w-11 h-11 rounded-xl ${colors.bg} flex items-center justify-center ${colors.icon} mb-3 group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5" strokeWidth={2.5} />
        </div>

        <h3 className="text-base font-black text-gray-900 mb-1 pr-14 leading-tight">
          {title}
        </h3>

        <p className="text-xs text-gray-500 leading-snug line-clamp-2">
          {subtitle}
        </p>
      </div>

      <div className={`mt-3 flex items-center gap-1.5 text-xs font-bold ${colors.text} group-hover:gap-2.5 transition-all`}>
        <span>Generate Now</span>
        <ArrowRight className="w-3.5 h-3.5" strokeWidth={3} />
      </div>
    </Link>
  );
}
