import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';

export default function LoadingState({ title = "Generating Certificate..." }) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Preparing template...");

  useEffect(() => {
    const messages = [
      { time: 0, text: "Preparing template...", progress: 0 },
      { time: 500, text: "Generating QR code...", progress: 25 },
      { time: 1000, text: "Rendering PDF...", progress: 50 },
      { time: 1500, text: "Uploading to cloud...", progress: 75 },
      { time: 2000, text: "Finalizing certificate...", progress: 90 }
    ];

    const timers = messages.map(({ time, text, progress }) =>
      setTimeout(() => {
        setMessage(text);
        setProgress(progress);
      }, time)
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-gradient-to-br from-white to-cyan-50 border-2 border-cyan-200 rounded-3xl shadow-xl max-w-md mx-auto my-12">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-cyan-100 animate-ping opacity-75"></div>
        <div className="w-24 h-24 rounded-full border-4 border-t-cyan-600 border-r-cyan-400 border-b-cyan-200 border-l-cyan-400 animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap className="w-10 h-10 text-cyan-600 animate-pulse" strokeWidth={2.5} />
        </div>
      </div>

      <h3 className="text-2xl font-black text-gray-900 mb-2">{title}</h3>
      <p className="text-sm font-semibold text-cyan-600 mb-4">{message}</p>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-xs text-gray-500">Processing... {progress}%</p>
    </div>
  );
}

