
import React, { useRef, useEffect, useState } from 'react';
import { LogEntry, StoryOptions, QuickSlot, Item, SkillNode, StatusEffect, Quest, NPC, Stats } from '../types';
import { Button, Card, Input } from './Layout';
import { MessageSquare, Zap, Brain, Smile, PenTool, Globe, ChevronDown, ChevronUp, Sparkles, BookOpen, Star, Eye, Coffee, Sword, MessageCircle, User, Shield, Skull, Wind, PlayCircle, Clock, Activity, Flame, Droplets, Snowflake, Ghost, Heart, Target, Search, Fingerprint, Waves, X, Users, Pickaxe, Apple } from 'lucide-react';
import { SurvivalHUD } from './SurvivalHUD';

interface StoryPanelProps {
  logs: LogEntry[];
  currentOptions?: StoryOptions;
  onAction: (action: string, type: string) => void;
  isProcessing: boolean;
  inCombat: boolean;
  quickSlots: (QuickSlot | null)[];
  items: Item[];
  skills: SkillNode[];
  onQuickSlotUse: (index: number) => void;
  combatStartTime?: number;
  isPaused: boolean;
  activeStatusEffects?: StatusEffect[];
  // 生存系統所需的完整 Props
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  hunger: number;
  thirst: number;
  energy: number;
  exp: number;
  statPoints?: number;
  stats?: Stats;
  onStatIncrease?: (stat: keyof Stats) => void;
  trackedQuests?: Quest[];
  localNPCs?: NPC[];
  onNPCClick?: (npcId: string) => void;
}

export const StoryPanel: React.FC<StoryPanelProps> = ({ 
  logs, currentOptions, onAction, isProcessing, inCombat, quickSlots, items, skills, onQuickSlotUse, combatStartTime, isPaused, activeStatusEffects = [], 
  level, hp, maxHp, mp, maxMp, hunger, thirst, energy, exp, statPoints, stats, onStatIncrease,
  trackedQuests = [], localNPCs = [], onNPCClick 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [customAction, setCustomAction] = useState('');
  const [worldEvent, setWorldEvent] = useState('');
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(true);
  const [combatTimer, setCombatTimer] = useState(0);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [showEnvMenu, setShowEnvMenu] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (currentOptions && !isProcessing) {
      setIsOptionsExpanded(true);
    }
  }, [currentOptions, isProcessing]);

  useEffect(() => {
      let interval: any;
      if (inCombat && combatStartTime && !isPaused) {
          setCombatTimer(Math.floor((Date.now() - combatStartTime) / 1000));
          interval = setInterval(() => {
              setCombatTimer(Math.floor((Date.now() - combatStartTime) / 1000));
          }, 1000);
      } 
      if (!inCombat) setCombatTimer(0);
      return () => clearInterval(interval);
  }, [inCombat, combatStartTime, isPaused]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (isPaused || isProcessing) return;
          if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) return;

          switch(e.key.toLowerCase()) {
              case 'q':
                  setSelectedSlotIndex(prev => (prev - 1 + 4) % 4);
                  break;
              case 'e':
                  setSelectedSlotIndex(prev => (prev + 1) % 4);
                  break;
              case 'r':
                  onQuickSlotUse(selectedSlotIndex);
                  break;
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused, isProcessing, selectedSlotIndex, onQuickSlotUse]);

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (type: string) => {
      switch(type) {
          case 'poison': return <Skull size={14} className="text-green-500"/>;
          case 'burn': return <Flame size={14} className="text-orange-500"/>;
          case 'freeze': return <Snowflake size={14} className="text-cyan-400"/>;
          case 'bleed': return <Droplets size={14} className="text-red-500"/>;
          case 'stun': return <Zap size={14} className="text-yellow-500"/>;
          case 'buff': return <Sparkles size={14} className="text-yellow-400"/>;
          case 'debuff': return <Ghost size={14} className="text-purple-500"/>;
          case 'starvation': return <Apple size={14} className="text-red-400"/>;
          case 'dehydration': return <Droplets size={14} className="text-blue-400"/>;
          case 'exhaustion': return <Activity size={14} className="text-gray-400"/>;
          default: return <Activity size={14} className="text-slate-400"/>;
      }
  };

  const getStatusColor = (type: string) => {
      switch(type) {
          case 'poison': return 'border-green-500/50 bg-green-950/30 text-green-200';
          case 'burn': return 'border-orange-500/50 bg-orange-950/30 text-orange-200';
          case 'freeze': return 'border-cyan-500/50 bg-cyan-950/30 text-cyan-200';
          case 'bleed': return 'border-red-500/50 bg-red-950/30 text-red-200';
          case 'stun': return 'border-yellow-500/50 bg-yellow-950/30 text-yellow-200';
          case 'starvation': return 'border-red-500/50 bg-red-950/30 text-red-200';
          case 'dehydration': return 'border-blue-500/50 bg-blue-950/30 text-blue-200';
          case 'exhaustion': return 'border-gray-500/50 bg-gray-950/30 text-gray-200';
          default: return 'border-slate-500/50 bg-slate-800/50 text-slate-200';
      }
  };

  return (
    <div className="flex flex-col h-full gap-4 relative">
      {/* 生命系統整合至故事面板頂部 */}
      <div className="shrink-0 z-30 animate-slide-up">
        <SurvivalHUD 
          level={level}
          hp={hp}
          maxHp={maxHp}
          mp={mp}
          maxMp={maxMp}
          hunger={hunger}
          thirst={thirst}
          energy={energy}
          exp={exp}
          statPoints={statPoints}
          stats={stats}
          onStatIncrease={onStatIncrease}
        />
      </div>

      <div className={`flex-1 min-h-0 bg-slate-900/80 backdrop-blur-md border rounded-lg shadow-xl relative flex flex-col overflow-hidden transition-all duration-500 ${inCombat ? 'border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.2)] animate-shake' : 'border-slate-700'}`}>
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translate(0, 0); }
            10%, 30%, 50%, 70%, 90% { transform: translate(-1px, 1px); }
            20%, 40%, 60%, 80% { transform: translate(1px, -1px); }
          }
          .animate-shake {
             animation: shake 2s infinite;
             animation-play-state: paused;
          }
          .animate-shake:hover {
             animation-play-state: running;
          }
          .combat-pulse {
             animation: combatPulse 2s infinite ease-in-out;
          }
          @keyframes combatPulse {
            0%, 100% { box-shadow: 0 0 20px rgba(220,38,38,0.2) inset; }
            50% { box-shadow: 0 0 40px rgba(220,38,38,0.4) inset; }
          }
        `}</style>
        
        {inCombat && <div className="absolute inset-0 pointer-events-none combat-pulse z-0"></div>}

        <div className={`p-3 border-b flex justify-between items-center z-10 gap-4 ${inCombat ? 'bg-red-950/50 border-red-500/30' : 'border-slate-700/50 bg-slate-900/50'}`}>
             <div className="flex items-center gap-4 flex-1">
                 <button 
                    onClick={() => !inCombat && setShowEnvMenu(!showEnvMenu)}
                    className={`text-lg font-bold uppercase tracking-widest flex items-center gap-2 shrink-0 transition-all active:scale-95 ${inCombat ? 'text-red-400 animate-pulse cursor-default' : 'text-cyan-400 hover:text-cyan-200'}`}
                 >
                    {inCombat ? <><Sword className="w-5 h-5" /> 戰鬥</> : <><BookOpen className={`w-5 h-5 ${showEnvMenu ? 'animate-bounce' : ''}`} /> 冒險日誌</>}
                 </button>
             </div>

             <div className="flex items-center gap-4">
                 {inCombat && <div className="text-red-400 font-mono flex items-center gap-2 font-bold animate-pulse bg-red-950/30 px-2 py-0.5 rounded border border-red-500/30"><Clock size={14}/> {formatTime(combatTimer)}</div>}
                 <div className="text-xs text-slate-500 font-mono">回合: {logs.length}</div>
             </div>
        </div>

        {(inCombat || localNPCs.length > 0) && (
            <div className={`border-b p-2 flex gap-3 items-center overflow-x-auto z-20 animate-slide-up shadow-inner ${inCombat ? 'bg-black/60 border-red-900/30' : 'bg-slate-900/60 border-slate-700/50'}`}>
                <span className={`text-[9px] font-black uppercase tracking-widest shrink-0 ml-1 flex items-center gap-1 ${inCombat ? 'text-slate-500' : 'text-cyan-600'}`}>
                    <Users size={12}/> {inCombat ? '戰場單元:' : '附近單位:'}
                </span>
                {localNPCs.map(npc => {
                    const isAlly = npc.affection > 20;
                    const isEnemy = npc.affection < -20;
                    const currentHp = npc.hp ?? 100;
                    const maxHp = npc.maxHp ?? 100;
                    const hpPercent = (currentHp / maxHp) * 100;
                    
                    return (
                        <div 
                            key={npc.id} 
                            onClick={() => onNPCClick?.(npc.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] shadow-lg animate-fade-in shrink-0 bg-slate-900/80 cursor-pointer transition-all hover:scale-105 hover:border-white/20 active:scale-95 ${isAlly ? 'border-cyan-500/40 text-cyan-200' : isEnemy ? 'border-red-500/40 text-red-200' : 'border-slate-700 text-slate-400'}`}
                        >
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10 shrink-0">
                                <img src={npc.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(npc.name)}`} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-[60px]">
                                <span className="font-black truncate max-w-[80px]">{npc.name}</span>
                                <div className="h-1 bg-black/40 rounded-full overflow-hidden w-full">
                                    <div className={`h-full transition-all duration-700 ${isEnemy ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${hpPercent}%` }}></div>
                                </div>
                            </div>
                            <span className={`font-black uppercase text-[8px] px-1.5 py-0.5 rounded ${isAlly ? 'bg-cyan-900/50 text-cyan-400' : isEnemy ? 'bg-red-900/50 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                                {isAlly ? '盟友' : isEnemy ? '敵人' : '中立'}
                            </span>
                        </div>
                    );
                })}
            </div>
        )}

        {!inCombat && showEnvMenu && (
            <div className="bg-cyan-900/40 border-b border-cyan-500/30 p-2 flex gap-3 items-center overflow-x-auto z-20 animate-slide-up shadow-lg">
                <span className="text-[10px] text-cyan-200 font-black uppercase tracking-[0.2em] shrink-0 ml-2">深度連結:</span>
                <button 
                    onClick={() => { onAction("運用感知能力仔細搜索四周環境，尋找可能被遺忘、隱藏或掉落在暗處的物品與資源。", "custom"); setShowEnvMenu(false); }}
                    className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-yellow-500/30 rounded-full text-xs text-yellow-100 hover:bg-yellow-500/20 transition-all whitespace-nowrap active:scale-95"
                >
                    <Search size={14} className="text-yellow-400"/> 搜索隱藏物
                </button>
                <button 
                    onClick={() => { onAction("檢查環境中奇怪的標誌或任何隱藏的刻痕。", "custom"); setShowEnvMenu(false); }}
                    className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-cyan-500/20 rounded-full text-xs text-cyan-100 hover:bg-cyan-500/20 transition-all whitespace-nowrap active:scale-95"
                >
                    <Search size={14}/> 檢查奇怪標誌
                </button>
                <button 
                    onClick={() => { onAction("嘗試觸摸周遭發光的結晶或其他異常元素。", "custom"); setShowEnvMenu(false); }}
                    className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-cyan-500/20 rounded-full text-xs text-cyan-100 hover:bg-cyan-500/20 transition-all whitespace-nowrap active:scale-95"
                >
                    <Fingerprint size={14}/> 觸摸異常元素
                </button>
                <button 
                    onClick={() => { onAction("閉上雙眼，感應四周流動的以太能量軌跡。", "custom"); setShowEnvMenu(false); }}
                    className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-cyan-500/20 rounded-full text-xs text-cyan-100 hover:bg-cyan-500/20 transition-all whitespace-nowrap active:scale-95"
                >
                    <Waves size={14}/> 感應以太流動
                </button>
                <button 
                    onClick={() => setShowEnvMenu(false)}
                    className="p-1 text-cyan-500/50 hover:text-white"
                >
                    <X size={14}/>
                </button>
            </div>
        )}

        {activeStatusEffects.length > 0 && (
            <div className="bg-slate-950/90 border-b border-slate-700 p-2 flex gap-2 items-center overflow-x-auto z-10 custom-scrollbar shadow-inner">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1"><Activity size={12}/> 生效中:</span>
                {activeStatusEffects.map((effect, idx) => (
                    <div key={idx} className={`flex items-center gap-1.5 rounded px-2 py-1 border text-xs shadow-sm animate-fade-in ${getStatusColor(effect.type)}`}>
                        {getStatusIcon(effect.type)}
                        <span className="font-bold">{effect.name}</span>
                        <div className="w-px h-3 bg-current opacity-30"></div>
                        <span className="text-[10px] font-mono opacity-80">{effect.duration}t</span>
                    </div>
                ))}
            </div>
        )}

        {trackedQuests.length > 0 && (
            <div className="bg-slate-900/60 border-b border-slate-700/50 p-2 flex flex-col gap-1 z-10 overflow-hidden shadow-inner">
                {trackedQuests.map(q => (
                    <div key={q.id} className="flex items-center gap-2 text-[10px] animate-fade-in group">
                        <Target size={12} className="text-cyan-400 shrink-0 group-hover:scale-110 transition-transform"/>
                        <span className="font-bold text-slate-300 truncate max-w-[150px]">{q.title}:</span>
                        <span className="text-slate-500 truncate italic flex-1">{q.objectives?.[0] || '任務進行中...'}</span>
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                            <div 
                                className="h-full bg-cyan-600 transition-all duration-1000" 
                                style={{ width: `${q.progress || 0}%` }}
                            ></div>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 w-6 text-right">{q.progress || 0}%</span>
                    </div>
                ))}
            </div>
        )}
        
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-8 scroll-smooth z-10">
          {logs.map((log) => (
            <div key={log.id} className={`flex flex-col gap-3 animate-fade-in ${log.type === 'narrative' ? 'text-slate-200' : 'text-cyan-300'}`}>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-500 uppercase tracking-wider opacity-60">
                 <div className="h-px bg-slate-700 flex-1"></div>
                 <span className="flex items-center gap-1"><Clock size={10}/> {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                 <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.type === 'narrative' ? 'bg-slate-800 text-slate-400' : 'bg-cyan-900/30 text-cyan-400'}`}>{log.type}</span>
                 <div className="h-px bg-slate-700 flex-1"></div>
              </div>
              
              {log.imageUrl && (
                 <div className="w-full max-w-2xl mx-auto my-4 rounded-lg overflow-hidden border border-slate-700/50 shadow-2xl group relative">
                    <img src={log.imageUrl} alt="Scene" className="w-full h-auto object-cover transition-transform duration-[3s] ease-out group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                 </div>
              )}

              <div className={`prose prose-invert max-w-none leading-loose text-lg font-serif ${log.type === 'system' ? 'text-center italic text-yellow-500/80' : ''} ${log.type === 'world_event' ? 'text-center font-bold text-purple-400' : ''}`}>
                {log.text}
              </div>
            </div>
          ))}
          {isProcessing && (
              <div className="flex items-center justify-center gap-3 py-8 opacity-80">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
              </div>
          )}
        </div>
      </div>

      <div className={`shrink-0 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col bg-slate-950/80 border-t border-slate-700/50 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.6)] rounded-t-2xl z-20 ${isOptionsExpanded ? 'max-h-[85vh] opacity-100' : 'max-h-[50px] opacity-90'}`}>
        <div 
            className="w-full flex justify-center items-center py-3 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors relative group border-b border-white/5"
            onClick={() => setIsOptionsExpanded(!isOptionsExpanded)}
        >
            <div className={`absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent ${inCombat ? 'via-red-500/50' : 'via-cyan-500/50'} to-transparent opacity-50 group-hover:opacity-100 transition-opacity`}></div>
            <div className={`w-16 h-1 rounded-full transition-all duration-300 ${isOptionsExpanded ? (inCombat ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'bg-cyan-600 shadow-[0_0_10px_rgba(6,182,212,0.5)]') : 'bg-slate-600'}`}></div>
            {isOptionsExpanded ? <ChevronDown size={14} className="absolute right-6 text-slate-500 group-hover:text-cyan-400 transition-colors"/> : <ChevronUp size={14} className="absolute right-6 text-slate-500 group-hover:text-cyan-400 transition-colors"/>}
        </div>

        <div className={`p-4 space-y-5 overflow-y-auto custom-scrollbar transition-opacity duration-300 ${isOptionsExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex flex-col items-center gap-1 pb-2 border-b border-slate-800/50">
               <div className="flex gap-2 justify-center relative">
                   {quickSlots.map((slot, idx) => {
                       let icon = null;
                       let label = "空";
                       let isOnCooldown = false;
                       let cooldownText = '';
                       const isSelected = selectedSlotIndex === idx;

                       if (slot) {
                           if (slot.type === 'item') {
                               const item = items.find(i => i.id === slot.id);
                               if (item) {
                                   icon = item.iconUrl ? <img src={item.iconUrl} className="w-full h-full object-cover rounded-md"/> : <Sparkles size={16}/>;
                                   label = item.name;
                               }
                           } else {
                               const skill = skills.find(s => s.id === slot.id);
                               if (skill) {
                                   icon = skill.iconUrl ? <img src={skill.iconUrl} className="w-full h-full object-cover rounded-md"/> : <Zap size={16}/>;
                                   label = skill.name;
                                   if (skill.currentCooldown && skill.currentCooldown > 0) {
                                       isOnCooldown = true;
                                       cooldownText = String(skill.currentCooldown);
                                   }
                               }
                           }
                       }
                       return (
                           <button 
                               key={idx}
                               onClick={() => { setSelectedSlotIndex(idx); onQuickSlotUse(idx); }}
                               disabled={isProcessing || !slot || isOnCooldown || isPaused}
                               className={`w-12 h-12 border rounded-lg flex items-center justify-center relative group overflow-hidden transition-all active:scale-95 ${slot ? 'bg-slate-900 border-slate-600' : 'bg-slate-900/50 border-slate-800 border-dashed'} ${isSelected ? 'ring-2 ring-yellow-400 scale-105 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'opacity-70 hover:opacity-100'}`}
                               title={label}
                           >
                               {icon || <span className="text-slate-700 text-xs font-mono">{idx + 1}</span>}
                               <span className="absolute bottom-0 right-1 text-[8px] text-slate-500 drop-shadow-md z-20 font-bold">{idx+1}</span>
                               
                               {isOnCooldown && (
                                   <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center text-red-200 z-10 backdrop-blur-[1px] border border-red-500/50 animate-pulse">
                                       <span className="text-[8px] uppercase font-bold tracking-tighter">冷卻</span>
                                       <span className="text-lg font-bold leading-none">{cooldownText}</span>
                                       <span className="text-[8px] uppercase font-bold tracking-tighter">中</span>
                                   </div>
                               )}
                               {slot && !isOnCooldown && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                           </button>
                       );
                   })}
               </div>
               <div className="text-[9px] text-slate-600 font-mono">
                   [Q] 上一個 / [E] 下一個 / [R] 使用選定
               </div>
            </div>

            {inCombat ? (
                <div className="grid grid-cols-4 gap-2">
                    <CombatActionButton icon={<Sword size={24}/>} label="攻擊" sub="攻擊" color="red" onClick={() => onAction("全力攻擊敵人！", "impulsive")} disabled={isProcessing || isPaused} />
                    <CombatActionButton icon={<Shield size={24}/>} label="防禦" sub="防禦" color="blue" onClick={() => onAction("採取防禦姿態，尋找反擊機會。", "smart")} disabled={isProcessing || isPaused} />
                    <CombatActionButton icon={<Zap size={24}/>} label="技能" sub="技能" color="yellow" onClick={() => onAction("使用特殊技能進行突襲！", "custom")} disabled={isProcessing || isPaused} />
                    <CombatActionButton icon={<Wind size={24}/>} label="逃跑" sub="逃跑" color="green" onClick={() => onAction("尋找機會逃離戰場！", "smart")} disabled={isProcessing || isPaused} />
                </div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    <BasicActionButton icon={<Eye size={18}/>} label="觀察" onClick={() => onAction("觀察四周環境細節", "custom")} disabled={isProcessing || isPaused} />
                    <BasicActionButton icon={<Search size={18}/>} label="搜索" onClick={() => onAction("運用感知能力仔細搜索四周環境，尋找可能被遺忘、隱藏或掉落在暗處的物品與資源。", "custom")} disabled={isProcessing || isPaused} />
                    <BasicActionButton icon={<PenTool size={18}/>} label="行動" onClick={() => onAction("採取主動行動探索", "custom")} disabled={isProcessing || isPaused} />
                    <BasicActionButton icon={<Pickaxe size={18}/>} label="採集" onClick={() => onAction("採集周遭的資源與素材", "custom")} disabled={isProcessing || isPaused} />
                    <BasicActionButton icon={<Coffee size={18}/>} label="休息" onClick={() => onAction("尋找安全的地方休息恢復", "custom")} disabled={isProcessing || isPaused} />
                    <BasicActionButton icon={<MessageCircle size={18}/>} label="交流" onClick={() => onAction("嘗試與附近的人或生物溝通", "custom")} disabled={isProcessing || isPaused} />
                    <BasicActionButton icon={<Sword size={18}/>} label="備戰" onClick={() => onAction("準備戰鬥，尋找敵人", "custom")} disabled={isProcessing || isPaused} />
                    <BasicActionButton icon={<Ghost size={18}/>} label="隨機事件" onClick={() => onAction("觸發隨機事件", "world_event")} disabled={isProcessing || isPaused} />
                </div>
            )}

            {currentOptions && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                   <div className="md:col-span-2 lg:col-span-1">
                       <ActionButton 
                          variant="danger" 
                          icon={<Zap size={20} />} 
                          label="莽撞熱血" 
                          desc={currentOptions.impulsive} 
                          onClick={() => onAction(currentOptions.impulsive, 'impulsive')}
                          disabled={isProcessing || isPaused}
                       />
                   </div>
                   <div className="md:col-span-2 lg:col-span-1">
                       <ActionButton 
                          variant="purple" 
                          icon={<Brain size={20} />} 
                          label="理智腹黑" 
                          desc={currentOptions.smart} 
                          onClick={() => onAction(currentOptions.smart, 'smart')}
                          disabled={isProcessing || isPaused}
                       />
                   </div>
                   <div className="md:col-span-2 lg:col-span-1">
                       <ActionButton 
                          variant="green" 
                          icon={<Smile size={20} />} 
                          label="佛系搞笑" 
                          desc={currentOptions.funny} 
                          onClick={() => onAction(currentOptions.funny, 'funny')}
                          disabled={isProcessing || isPaused}
                       />
                   </div>

                   <div className="md:col-span-2 lg:col-span-1 flex flex-col gap-2">
                       <MiniActionButton label="特色 1" desc={currentOptions.characteristic1} onClick={() => onAction(currentOptions.characteristic1, 'characteristic1')} disabled={isProcessing || isPaused} />
                       <MiniActionButton label="特色 2" desc={currentOptions.characteristic2} onClick={() => onAction(currentOptions.characteristic2, 'characteristic2')} disabled={isProcessing || isPaused} />
                   </div>
                   
                   <div className="md:col-span-2 lg:col-span-2 flex gap-3">
                        <ActionButton 
                          variant="gold" 
                          icon={<Star size={20} />} 
                          label="專屬特色 3" 
                          desc={currentOptions.characteristic3 || "..."} 
                          onClick={() => onAction(currentOptions.characteristic3, 'characteristic3')}
                          disabled={isProcessing || isPaused}
                       />
                        <ActionButton 
                          variant="gold" 
                          icon={<Star size={20} />} 
                          label="專屬特色 4" 
                          desc={currentOptions.characteristic4 || "..."} 
                          onClick={() => onAction(currentOptions.characteristic4, 'characteristic4')}
                          disabled={isProcessing || isPaused}
                       />
                   </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-3 pt-2 border-t border-slate-800/50">
                 <div className="flex gap-2 items-center">
                    <div className="bg-slate-800/80 rounded-lg p-2.5 flex items-center justify-center text-slate-400 border border-slate-700/50 shadow-inner">
                        <PenTool size={18} />
                    </div>
                    <div className="relative flex-1 group">
                        <Input 
                          placeholder="撰寫你自己的行動..." 
                          value={customAction}
                          onChange={(e) => setCustomAction(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !isProcessing && !isPaused && onAction(customAction, 'custom')}
                          className="pr-12 bg-slate-900/60 border-slate-700 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all h-11"
                          disabled={isPaused}
                        />
                        <button 
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-cyan-400 hover:text-cyan-200 disabled:opacity-30 transition-colors"
                            onClick={() => onAction(customAction, 'custom')}
                            disabled={!customAction || isProcessing || isPaused}
                        >
                            <Sparkles size={16} fill="currentColor" />
                        </button>
                    </div>
                 </div>
                 
                 <div className="flex gap-2 items-center">
                    <div className="bg-slate-800/80 rounded-lg p-2.5 flex items-center justify-center text-yellow-500/80 border border-slate-700/50 shadow-inner">
                        <Globe size={18} />
                    </div>
                    <div className="relative flex-1 group">
                        <Input 
                          placeholder="觸發世界事件 (改變環境/劇情走向)..." 
                          value={worldEvent}
                          onChange={(e) => setWorldEvent(e.target.value)}
                          className="pr-12 bg-slate-900/60 border-yellow-900/30 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all h-11 text-yellow-100 placeholder-yellow-500/30"
                          onKeyDown={(e) => e.key === 'Enter' && !isProcessing && !isPaused && onAction(worldEvent, 'world_event')}
                          disabled={isPaused}
                        />
                        <button 
                             className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-yellow-400 hover:text-yellow-200 disabled:opacity-30 transition-colors"
                             onClick={() => onAction(worldEvent, 'world_event')}
                             disabled={!worldEvent || isProcessing || isPaused}
                        >
                            <Sparkles size={16} fill="currentColor" />
                        </button>
                    </div>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const CombatActionButton: React.FC<{
    icon: React.ReactNode,
    label: string,
    sub: string,
    color: 'red' | 'blue' | 'yellow' | 'green',
    onClick: () => void,
    disabled: boolean
}> = ({ icon, label, sub, color, onClick, disabled }) => {
    const colors = {
        red: 'from-red-900/40 to-red-950/60 border-red-800 hover:border-red-500 text-red-200 hover:text-white hover:shadow-[0_0_15px_rgba(220,38,38,0.3)]',
        blue: 'from-blue-900/40 to-blue-950/60 border-blue-800 hover:border-blue-500 text-blue-200 hover:text-white hover:shadow-[0_0_15px_rgba(37,99,235,0.3)]',
        yellow: 'from-yellow-900/40 to-yellow-950/60 border-yellow-800 hover:border-yellow-500 text-yellow-200 hover:text-white hover:shadow-[0_0_15px_rgba(234,179,8,0.3)]',
        green: 'from-emerald-900/40 to-emerald-950/60 border-emerald-800 hover:border-emerald-500 text-emerald-200 hover:text-white hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]'
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex flex-col items-center justify-center p-2 rounded-xl border bg-gradient-to-b transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group h-20 ${colors[color]}`}
        >
            <div className="mb-1 transform group-hover:scale-110 transition-transform">{icon}</div>
            <span className="text-sm font-bold leading-none">{label}</span>
            <span className="text-[9px] opacity-60 font-mono uppercase tracking-wider">{sub}</span>
        </button>
    );
};

const BasicActionButton: React.FC<{
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    disabled: boolean,
    className?: string
}> = ({ icon, label, onClick, disabled, className = '' }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex flex-col items-center justify-center gap-1.5 p-3 bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-slate-700 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 hover:text-white shadow-lg group ${className}`}
    >
        <div className="opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">{icon}</div>
        <span className="text-[10px] font-bold tracking-wide uppercase">{label}</span>
    </button>
);

const ActionButton: React.FC<{ 
    variant: 'danger' | 'purple' | 'green' | 'gold', 
    icon: React.ReactNode, 
    label: string, 
    desc: string,
    onClick: () => void,
    disabled: boolean,
    className?: string
}> = ({ variant, icon, label, desc, onClick, disabled, className = '' }) => {
    const styles = {
        danger: 'bg-gradient-to-br from-red-950/80 via-red-900/20 to-slate-950 border-red-500/30 hover:border-red-400 text-red-100 shadow-[0_4px_20px_rgba(153,27,27,0.1)] hover:shadow-[0_4px_25px_rgba(220,38,38,0.2)]',
        purple: 'bg-gradient-to-br from-purple-950/80 via-purple-900/20 to-slate-950 border-purple-500/30 hover:border-purple-400 text-purple-100 shadow-[0_4px_20px_rgba(107,33,168,0.1)] hover:shadow-[0_4px_25px_rgba(168,85,247,0.2)]',
        green: 'bg-gradient-to-br from-emerald-950/80 via-emerald-900/20 to-slate-950 border-emerald-500/30 hover:border-emerald-400 text-emerald-100 shadow-[0_4px_20px_rgba(6,95,70,0.1)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.2)]',
        gold: 'bg-gradient-to-br from-amber-950/80 via-amber-900/20 to-slate-950 border-amber-500/30 hover:border-amber-400 text-amber-100 shadow-[0_4px_20px_rgba(146,64,14,0.1)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.2)]'
    };

    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`
                w-full group relative flex flex-col gap-2 p-3 rounded-xl border transition-all duration-300
                hover:-translate-y-1 active:scale-95 text-left overflow-hidden h-full
                ${styles[variant]} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none
                ${className}
            `}
        >
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            
            <div className="flex items-center gap-2 font-bold tracking-wide text-xs opacity-90 group-hover:scale-105 transition-transform origin-left relative z-10">
                <div className="p-1.5 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 shadow-inner">{icon}</div>
                <span>{label}</span>
            </div>
            <p className="text-[11px] opacity-70 line-clamp-2 leading-relaxed font-serif pl-1 border-l-2 border-white/10 group-hover:border-white/40 transition-colors relative z-10">
                {desc}
            </p>
        </button>
    );
};

const MiniActionButton: React.FC<{
    label: string,
    desc: string,
    onClick: () => void,
    disabled: boolean
}> = ({ label, desc, onClick, disabled }) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className="w-full flex items-center justify-between p-2 bg-slate-900/50 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/30 rounded-lg transition-all active:scale-95 text-left group"
    >
        <div className="flex flex-col min-w-0">
             <span className="text-[10px] text-cyan-400 font-bold uppercase">{label}</span>
             <span className="text-slate-400 truncate w-full group-hover:text-slate-200 text-[10px]">{desc}</span>
        </div>
        <User size={12} className="text-slate-600 group-hover:text-cyan-400" />
    </button>
);
