import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border-2 border-red-200 text-red-700 text-sm font-semibold my-4">
      <AlertCircle className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} />
      <span>{message}</span>
    </div>
  );
}
