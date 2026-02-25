
import React from 'react';
import { Quest, QuestRequirement, QuestReward } from '../types';
import { Card } from './Layout';
import { Scroll, CheckCircle, XCircle, AlertCircle, Target, Star, Eye, Sword, MapPin, Package, MessageCircle, Coins, Zap, Gift, Clock } from 'lucide-react';

interface QuestPanelProps {
  quests: Quest[];
  onToggleTrack?: (questId: string) => void;
}

export const QuestPanel: React.FC<QuestPanelProps> = ({ quests = [], onToggleTrack }) => {
  const activeQuests = (quests || []).filter(q => q.status === 'active');
  const completedQuests = (quests || []).filter(q => q.status !== 'active');

  const getQuestTypeColor = (type: string) => {
      switch(type) {
          case 'main': return 'text-yellow-400 border-yellow-500/50 bg-yellow-950/30';
          case 'challenge': return 'text-red-400 border-red-500/50 bg-red-950/30';
          default: return 'text-cyan-400 border-cyan-500/50 bg-cyan-950/30';
      }
  };

  const getRequirementIcon = (type: string) => {
      switch(type) {
          case 'kill': return <Sword size={12}/>;
          case 'visit': return <MapPin size={12}/>;
          case 'collect': return <Package size={12}/>;
          case 'interact': return <MessageCircle size={12}/>;
          default: return <Target size={12}/>;
      }
  };

  const getRequirementTypeLabel = (type: string) => {
      switch(type) {
          case 'kill': return '擊殺';
          case 'visit': return '探索';
          case 'collect': return '收集';
          case 'interact': return '互動';
          default: return type;
      }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-4">
      <Card className="flex-1 flex flex-col" title="進行中任務">
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
          {activeQuests.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full opacity-40 text-slate-400">
                 <Scroll size={48} className="mb-2" strokeWidth={1}/>
                 <p>目前沒有進行中的任務。</p>
             </div>
          )}
          {activeQuests.map(q => (
            <div key={q.id} className="bg-slate-800/50 border border-white/10 rounded p-3 relative overflow-hidden group hover:bg-slate-800 transition-colors">
               <div className={`absolute top-0 left-0 w-1 h-full ${q.isTracked ? 'bg-cyan-500' : 'bg-slate-700'}`}></div>
               
               <div className="flex justify-between items-start">
                   <div className="flex items-center gap-2">
                       <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${getQuestTypeColor(q.type)}`}>{q.type === 'main' ? '主線' : (q.type === 'challenge' ? '挑戰' : '支線')}</span>
                       <h4 className="font-bold text-white flex items-center gap-2">
                           {q.title}
                       </h4>
                       {q.deadline && (
                           <span className="text-[10px] text-red-400 font-mono border border-red-500/30 px-1 rounded flex items-center gap-1">
                               <Clock size={10} /> 限時: {q.deadline} 回合
                           </span>
                       )}
                   </div>
                   {onToggleTrack && (
                       <button 
                           onClick={() => onToggleTrack(q.id)} 
                           className={`p-1 rounded hover:bg-slate-700 transition-colors ${q.isTracked ? 'text-cyan-400' : 'text-slate-600 hover:text-slate-400'}`}
                           title="追蹤任務"
                       >
                           {q.isTracked ? <Eye size={16} fill="currentColor"/> : <Eye size={16}/>}
                       </button>
                   )}
               </div>

               <p className="text-sm text-slate-300 mt-2 leading-relaxed">{q.description}</p>
               
               {/* Requirements List */}
               {q.requirements && q.requirements.length > 0 && (
                  <div className="mt-3 space-y-1 bg-black/20 p-2 rounded">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Target size={10}/> 任務需求</div>
                    {q.requirements.map((req, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-slate-400">
                         <div className="flex items-center gap-2">
                             {getRequirementIcon(req.type)}
                             <span className="capitalize">{getRequirementTypeLabel(req.type)} {req.target}</span>
                         </div>
                         <span className={req.current >= req.count ? 'text-green-400' : 'text-slate-500'}>
                             {req.current} / {req.count}
                         </span>
                      </div>
                    ))}
                  </div>
               )}

               {/* Legacy Objectives List */}
               {(!q.requirements || q.requirements.length === 0) && q.objectives && q.objectives.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Target size={10}/> 任務目標</div>
                    {q.objectives.map((obj, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-400 ml-1">
                         <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div> 
                         <span>{obj}</span>
                      </div>
                    ))}
                  </div>
               )}

               {/* Rewards */}
               {q.rewards && (
                   <div className="mt-3 flex gap-2 flex-wrap">
                       {q.rewards.exp && <span className="text-[10px] bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20 flex items-center gap-1"><Zap size={10}/> {q.rewards.exp} 經驗</span>}
                       {q.rewards.gold && <span className="text-[10px] bg-yellow-900/40 text-yellow-300 px-2 py-0.5 rounded border border-yellow-500/20 flex items-center gap-1"><Coins size={10}/> {q.rewards.gold} 金幣</span>}
                       {q.rewards.items && q.rewards.items.length > 0 && <span className="text-[10px] bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1"><Gift size={10}/> 物品</span>}
                   </div>
               )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="flex-1 flex flex-col md:w-1/3" title="任務日誌">
        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
          {completedQuests.length === 0 && <p className="text-center text-xs text-slate-600 italic py-4">歷史記錄為空。</p>}
          {completedQuests.map(q => (
            <div key={q.id} className={`p-3 rounded border flex flex-col gap-1 ${q.status === 'completed' ? 'bg-green-900/10 border-green-900/30' : 'bg-red-900/10 border-red-900/30'}`}>
                <div className="flex justify-between items-start">
                    <span className={`font-bold text-sm ${q.status === 'completed' ? 'text-green-400' : 'text-red-400'}`}>{q.title}</span>
                    {q.status === 'completed' ? <CheckCircle size={14} className="text-green-500"/> : <XCircle size={14} className="text-red-500"/>}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">{q.description}</p>
                {q.status === 'completed' && <div className="text-[10px] text-green-600 mt-1 uppercase font-bold tracking-wider">任務完成</div>}
                {q.status === 'failed' && <div className="text-[10px] text-red-600 mt-1 uppercase font-bold tracking-wider">任務失敗</div>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
