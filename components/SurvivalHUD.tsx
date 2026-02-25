
import React, { useState } from 'react';
import { Apple, Droplet, Battery, AlertTriangle, Heart, Zap, ChevronDown, ChevronUp, Star, Award, Activity, Plus } from 'lucide-react';
import { Stats } from '../types';

interface SurvivalHUDProps {
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  hunger: number;
  thirst: number;
  energy: number;
  exp?: number;
  statPoints?: number;
  stats?: Stats;
  onStatIncrease?: (stat: keyof Stats) => void;
}

export const SurvivalHUD: React.FC<SurvivalHUDProps> = ({ 
  level, hp, maxHp, mp, maxMp, hunger, thirst, energy, exp = 0,
  statPoints = 0, stats, onStatIncrease
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (val: number, type: 'hp' | 'mp' | 'survival') => {
    if (type === 'hp') return val <= 25 ? 'from-red-600 to-rose-500 animate-pulse' : 'from-rose-600 to-pink-500';
    if (type === 'mp') return 'from-cyan-600 to-blue-500';
    
    if (val <= 25) return 'from-red-600 to-orange-500 animate-pulse';
    if (val <= 60) return 'from-amber-500 to-yellow-400';
    return 'from-emerald-500 to-teal-400';
  };

  const getTextColor = (val: number) => {
    if (val > 60) return 'text-emerald-400';
    if (val > 25) return 'text-amber-400';
    return 'text-red-500';
  };

  const renderMiniStatus = (icon: React.ReactNode, value: number, colorClass: string) => (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/20 border border-white/5 ${value <= 25 ? 'animate-pulse border-red-500/30' : ''}`}>
        <div className={colorClass}>{icon}</div>
        <div className="w-8 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${getStatusColor(value, 'survival')}`} style={{ width: `${value}%` }}></div>
        </div>
    </div>
  );

  const statLabels: Record<keyof Stats, string> = {
    strength: '力量',
    intelligence: '智力',
    agility: '敏捷',
    charisma: '魅力',
    luck: '幸運',
    endurance: '耐力',
    perception: '感知',
    hitRate: '命中',
    evasionRate: '閃避'
  };

  return (
    <div className={`bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-500 ease-in-out overflow-hidden group ${isExpanded ? 'p-6' : 'p-2 px-4'}`}>
      {/* 頂部控制列 / 收起模式 */}
      <div className="flex items-center justify-between w-full gap-4">
        <div className="flex items-center gap-4 flex-1">
          {/* 等級標記 */}
          <div className="flex items-center gap-2 shrink-0">
             <div className="bg-cyan-500/10 border border-cyan-500/30 p-1 rounded-lg">
                <Award size={14} className="text-cyan-400" />
             </div>
             <div className="flex flex-col leading-none">
                <span className="text-sm font-mono font-black text-white">LV.{level}</span>
                {statPoints > 0 && <span className="text-[9px] text-yellow-400 animate-pulse">可用點數: {statPoints}</span>}
             </div>
          </div>
          
          <div className="h-4 w-px bg-white/10 hidden sm:block"></div>

          {/* 收起狀態下的核心指標條 */}
          {!isExpanded && (
            <div className="flex flex-1 items-center gap-4 animate-fade-in overflow-hidden">
                {/* HP 簡版 */}
                <div className="flex items-center gap-2 flex-1 max-w-[120px]">
                    <Heart size={12} className="text-rose-500 shrink-0" />
                    <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                        <div className={`h-full bg-gradient-to-r ${getStatusColor((hp/maxHp)*100, 'hp')}`} style={{ width: `${(hp/maxHp)*100}%` }}></div>
                    </div>
                </div>

                {/* MP 簡版 */}
                <div className="flex items-center gap-2 flex-1 max-w-[120px] hidden md:flex">
                    <Zap size={12} className="text-cyan-400 shrink-0" />
                    <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                        <div className={`h-full bg-gradient-to-r ${getStatusColor((mp/maxMp)*100, 'mp')}`} style={{ width: `${(mp/maxMp)*100}%` }}></div>
                    </div>
                </div>

                {/* 生存指標小圖標 */}
                <div className="flex items-center gap-2 ml-auto">
                    {renderMiniStatus(<Apple size={10}/>, hunger, getTextColor(hunger))}
                    {renderMiniStatus(<Droplet size={10}/>, thirst, getTextColor(thirst))}
                    {renderMiniStatus(<Battery size={10}/>, energy, getTextColor(energy))}
                </div>
            </div>
          )}

          {isExpanded && (
            <div className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.4em] animate-fade-in">
                神經連結狀態: <span className="text-emerald-400">穩定</span>
            </div>
          )}
        </div>

        {/* 展開/收起 切換鈕 */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 bg-white/5 hover:bg-cyan-500/20 rounded-full text-slate-400 hover:text-cyan-400 transition-all active:scale-90 border border-transparent hover:border-cyan-500/30"
        >
          {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
        </button>
      </div>
      
      {/* 展開狀態內容 */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-500 ${isExpanded ? 'mt-6 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
        <div className="space-y-4 bg-black/40 p-5 rounded-2xl border border-white/5 shadow-inner">
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                <Activity size={12}/> 生命徵象 (Vitals)
            </h4>
            
            {/* HP 詳細條 */}
            <div className="space-y-1.5">
                <div className="flex justify-between items-end px-1">
                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1"><Heart size={12}/> 生命</span>
                    <span className="text-xs font-mono font-bold text-white">{Math.round(hp)}/{maxHp}</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full border border-white/5 overflow-hidden">
                    <div className={`h-full bg-gradient-to-r transition-all duration-1000 ${getStatusColor((hp/maxHp)*100, 'hp')}`} style={{ width: `${(hp/maxHp)*100}%` }}></div>
                </div>
            </div>

            {/* MP 詳細條 */}
            <div className="space-y-1.5">
                <div className="flex justify-between items-end px-1">
                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1"><Zap size={12}/> 魔力</span>
                    <span className="text-xs font-mono font-bold text-white">{Math.round(mp)}/{maxMp}</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full border border-white/5 overflow-hidden">
                    <div className={`h-full bg-gradient-to-r transition-all duration-1000 ${getStatusColor((mp/maxMp)*100, 'mp')}`} style={{ width: `${(mp/maxMp)*100}%` }}></div>
                </div>
            </div>

            {/* 屬性點分配 */}
            {stats && (
                <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                            <Star size={12}/> 基礎屬性 (Stats)
                        </h4>
                        {statPoints > 0 && <span className="text-[10px] text-yellow-400 font-bold animate-pulse">剩餘點數: {statPoints}</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(stats) as Array<keyof Stats>).map((key) => (
                            <div key={key} className="flex justify-between items-center bg-white/5 p-1.5 rounded border border-white/5">
                                <span className="text-[10px] text-slate-300 font-bold">{statLabels[key]}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-white">{stats[key]}</span>
                                    {statPoints > 0 && onStatIncrease && (
                                        <button 
                                            onClick={() => onStatIncrease(key)}
                                            className="p-0.5 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 rounded transition-colors"
                                        >
                                            <Plus size={10} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <div className="space-y-4 bg-black/40 p-5 rounded-2xl border border-white/5 shadow-inner">
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                <Compass size={12}/> 環境適應指標 (Adaptation)
            </h4>
            <div className="grid grid-cols-1 gap-3">
                {/* 飢餓、飲水、體力 整合渲染 */}
                {[
                    { label: '飢餓', val: hunger, icon: <Apple size={12}/>, desc: "生理能量儲備" },
                    { label: '口渴', val: thirst, icon: <Droplet size={12}/>, desc: "水分代謝平衡" },
                    { label: '體力', val: energy, icon: <Battery size={12}/>, desc: "肌肉疲勞閾值" }
                ].map((stat) => (
                    <div key={stat.label} className="space-y-1">
                        <div className="flex justify-between items-end px-1">
                            <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${getTextColor(stat.val)}`}>{stat.icon} {stat.label}</span>
                            <span className="text-[10px] font-mono text-slate-400">{stat.val}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-950 rounded-full border border-white/5 overflow-hidden">
                            <div className={`h-full bg-gradient-to-r transition-all duration-1000 ${getStatusColor(stat.val, 'survival')}`} style={{ width: `${stat.val}%` }}></div>
                        </div>
                        {stat.val <= 25 && (
                            <div className="text-[8px] text-red-500 font-bold animate-pulse pl-1 flex items-center gap-1">
                                <AlertTriangle size={8}/> 效能嚴重受損：需要立即補充 {stat.label}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      </div>

      <style>{`
        .animate-bounce-subtle {
          animation: bounce-subtle 2s infinite ease-in-out;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
};

const Compass = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
    </svg>
);
