
import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass', size?: 'sm' | 'md' | 'lg' }> = ({ children, className = '', variant = 'primary', size = 'md', ...props }) => {
  const variants = {
    primary: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_10px_rgba(8,145,178,0.5)] border border-cyan-400',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-500',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)] border border-red-400',
    ghost: 'bg-transparent hover:bg-slate-800/50 text-slate-300',
    glass: 'bg-black/30 backdrop-blur-md border border-white/10 hover:bg-black/40 text-white'
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button 
      className={`rounded-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => (
  <div className={`bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-lg p-4 shadow-xl ${className}`}>
    {title && <h3 className="text-lg font-bold text-cyan-400 mb-3 border-b border-slate-700 pb-2 uppercase tracking-widest">{title}</h3>}
    {children}
  </div>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    className="w-full bg-slate-950/50 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
    {...props}
  />
);

export const LoadingOverlay: React.FC<{ message?: string }> = ({ message = "Thinking..." }) => (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-fade-in">
        <div className="relative mb-8">
            <div className="animate-spin rounded-full h-24 w-24 border-t-2 border-b-2 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.4)]"></div>
            <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                <div className="h-12 w-12 rounded-full bg-cyan-500/10 border border-cyan-500/30"></div>
            </div>
        </div>
        <div className="flex flex-col items-center gap-3">
            <p className="text-cyan-400 text-xl font-mono font-black tracking-[0.3em] uppercase animate-pulse drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
                {message}
            </p>
            <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 animate-[loading-bar_2s_infinite_ease-in-out]"></div>
            </div>
        </div>
        <style>{`
            @keyframes loading-bar {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
        `}</style>
    </div>
);
