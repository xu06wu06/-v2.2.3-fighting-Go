
import React, { useState, useMemo, useEffect } from 'react';
import { NPC, Item, SkillNode, FactionReputation, Stats, StructuredSkill, ElementType, SkillType, LogEntry, Player, Location } from '../types';
import { Button, Input, Card } from './Layout';
import { CharacterCard } from './CharacterCard';
import { User, Search, UserPlus, Pin, Users, RefreshCcw, Trash2, X, Sparkles, Wand2, Info, Zap, Settings, Activity, Package, Plus, Target, Dice5, Database, Cpu, FlaskConical, Star, Heart, Radar } from 'lucide-react';
import * as GeminiService from '../services/geminiService';

interface NPCPanelProps {
  npcs: NPC[];
  inventory: Item[];
  skills: SkillNode[];
  onUpdateNPC: (npc: NPC) => void;
  onDeleteNPC?: (npcId: string) => void;
  onQuestReceived: (quest: any) => void;
  onRecipeLearned: (recipe: any) => void;
  onGenerateNPC: (overrides?: any) => void;
  onGiftItem: (npc: NPC, item: Item) => void;
  onBuyItem?: (npcId: string, item: Item) => void;
  onSellItem?: (npcId: string, item: Item) => void;
  isGenerating?: boolean;
  playerFactions?: FactionReputation[];
  worldSetting?: string;
  history?: LogEntry[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  player?: Player;
  locations?: Location[];
}

type CreationTab = 'basic' | 'stats' | 'skills' | 'items';

export const NPCPanel: React.FC<NPCPanelProps> = ({ 
  npcs = [], 
  inventory, 
  skills, 
  onUpdateNPC, 
  onDeleteNPC,
  onGenerateNPC, 
  isGenerating, 
  onGiftItem,
  onBuyItem,
  onSellItem,
  worldSetting = "",
  history = [],
  selectedId,
  setSelectedId,
  player,
  locations = [],
  onQuestReceived
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<'ai' | 'manual'>('ai');
  const [creationTab, setCreationTab] = useState<CreationTab>('basic');
  const [isScanning, setIsScanning] = useState(false);
  const [scanningNPCId, setScanningNPCId] = useState<string | null>(null);

  const historyText = useMemo(() => history.slice(-10).map(l => l.text).join('\n'), [history]);

  const [manualData, setManualData] = useState<{
      name: string;
      description: string;
      faction: string;
      affection: number;
      elementalAffinity: ElementType;
      stats: Stats;
      skills: Partial<StructuredSkill>[];
      inventory: Partial<Item>[];
  }>({
      name: '',
      description: '',
      faction: '',
      affection: 0,
      elementalAffinity: 'Neutral',
      stats: { strength: 10, intelligence: 10, agility: 10, charisma: 10, luck: 10, endurance: 10 },
      skills: [],
      inventory: []
  });

  const [aiCreationPrompt, setAiCreationPrompt] = useState({
      name: '',
      description: '',
      faction: '',
      desiredSkills: ''
  });

  const selectedNPC = useMemo(() => {
    if (!selectedId) return null;
    return npcs.find(n => n.id === selectedId) || null;
  }, [npcs, selectedId]);
  
  const filteredNPCs = useMemo(() => {
    let result = [...npcs];
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(n => 
            n.name.toLowerCase().includes(q) || 
            (n.faction || '').toLowerCase().includes(q) ||
            (n.description || '').toLowerCase().includes(q)
        );
    }
    if (statusFilter !== 'all') {
        if (statusFilter === 'ally') result = result.filter(n => n.affection > 50);
        else if (statusFilter === 'enemy') result = result.filter(n => n.affection < -20);
        else if (statusFilter === 'pinned') result = result.filter(n => n.isPinned);
    }
    result.sort((a, b) => (a.isPinned === b.isPinned) ? (b.affection - a.affection) : (a.isPinned ? -1 : 1));
    return result;
  }, [npcs, searchQuery, statusFilter]);

  const handleCreationSubmit = () => {
      if (creationMode === 'ai') {
          onGenerateNPC(aiCreationPrompt);
      } else {
          onGenerateNPC({
              ...manualData,
              isFullManual: true
          });
      }
      setIsCreatorOpen(false);
      setAiCreationPrompt({ name: '', description: '', faction: '', desiredSkills: '' });
  };

  const handleDeepScan = async () => {
      if (isScanning) return;
      setIsScanning(true);
      
      // 全域掃描：過濾出所有缺少檔案或物品欄的 NPC
      const targetNPCs = npcs.filter(n => !n.archive || !n.inventory || n.inventory.length === 0);
      
      try {
          for (const npc of targetNPCs) {
              setScanningNPCId(npc.id);
              let updated = { ...npc };
              let changed = false;

              // 1. 生成核心檔案 (Archive)
              if (!npc.archive) {
                  const archive = await GeminiService.generateNPCArchive(npc, worldSetting, historyText);
                  updated.archive = archive;
                  changed = true;
              }

              // 2. 生成專屬物品欄 (Inventory) - 現在會根據 Archive 背景生成更有意義的物品
              if (!npc.inventory || npc.inventory.length === 0) {
                  const location = locations.find(l => l.id === npc.locationId);
                  const locationContext = location ? `${location.name} (${location.description})` : undefined;

                  const items = await GeminiService.generateNPCInventory(updated, worldSetting, historyText, locationContext);
                  const itemsWithIcons = await Promise.all(items.map(async (i: any) => {
                      const iconUrl = await GeminiService.generateImage(i.name, 'icon');
                      return { ...i, id: crypto.randomUUID(), iconUrl };
                  }));
                  updated.inventory = itemsWithIcons;
                  changed = true;
              }

              if (changed) {
                  onUpdateNPC(updated);
              }
          }
      } catch (e) { console.error(e); }
      setScanningNPCId(null);
      setIsScanning(false);
  };

  const addManualSkill = () => {
      setManualData(prev => ({
          ...prev,
          skills: [...prev.skills, { id: crypto.randomUUID(), name: '新技能', description: '描述', skillType: 'active' as SkillType, level: 1 }]
      }));
  };

  const addManualItem = () => {
      setManualData(prev => ({
          ...prev,
          inventory: [...prev.inventory, { id: crypto.randomUUID(), name: '新物品', type: 'misc', rarity: 'common', quantity: 1 }]
      }));
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-4 overflow-hidden relative animate-fade-in">
       <div className={`md:w-[350px] flex flex-col gap-4 h-full overflow-hidden shrink-0 border-r border-white/5 pr-2 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
         <div className="flex flex-col gap-2 shrink-0">
             <div className="relative group">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={14} />
                 <Input 
                    placeholder="搜尋姓名、勢力..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    className="pl-9 py-2.5 text-xs bg-slate-950/50 border-slate-800 rounded-xl"
                 />
             </div>
             <div className="flex gap-2">
                 <select 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 focus:outline-none focus:border-cyan-500/50"
                 >
                    <option value="all">所有立場</option>
                    <option value="pinned">已置頂</option>
                    <option value="ally">盟友</option>
                    <option value="enemy">敵對</option>
                 </select>
                 <Button onClick={() => setIsCreatorOpen(true)} disabled={isGenerating} className="px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg border-cyan-400 flex items-center gap-2" variant="primary">
                     {isGenerating ? <RefreshCcw className="animate-spin" size={16}/> : <UserPlus size={16}/>}
                     <span className="text-[10px] font-black uppercase tracking-widest">具現化</span>
                 </Button>
             </div>
             <Button 
                onClick={handleDeepScan} 
                disabled={isScanning || npcs.length === 0} 
                className={`w-full border rounded-xl flex items-center justify-center gap-2 py-2 transition-all ${isScanning ? 'bg-indigo-600 border-indigo-400 text-white animate-pulse' : 'bg-indigo-900/40 border-indigo-500/30 text-indigo-300 hover:bg-indigo-800/50'}`} 
                variant="secondary"
             >
                 {isScanning ? <RefreshCcw className="animate-spin" size={14}/> : <Radar size={14}/>}
                 <span className="text-[10px] font-black uppercase tracking-widest">
                     {isScanning ? '正在重構全域生物編碼...' : '全域深層掃描'}
                 </span>
             </Button>
         </div>

         <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-2 min-h-0 pb-20">
             {filteredNPCs.map(npc => (
                 <div 
                    key={npc.id} 
                    onClick={() => setSelectedId(npc.id)} 
                    className={`p-3 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all relative overflow-hidden ${selectedId === npc.id ? 'bg-slate-800 border-cyan-500 shadow-xl' : 'bg-slate-900/40 border-white/5 hover:bg-slate-900/60'}`}
                 >
                     {scanningNPCId === npc.id && (
                        <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-[1px] flex items-center justify-center z-10 animate-pulse">
                            <RefreshCcw size={16} className="animate-spin text-white opacity-50" />
                        </div>
                     )}
                     <div className={`w-12 h-12 rounded-2xl bg-slate-950 overflow-hidden shrink-0 border-2 ${selectedId === npc.id ? 'border-cyan-500' : 'border-white/10'}`}>
                         {npc.avatarUrl ? <img src={npc.avatarUrl} className="w-full h-full object-cover"/> : <User className="p-2 w-full h-full text-slate-700"/>}
                     </div>
                     <div className="flex-1 min-w-0">
                         <h4 className={`font-black text-sm truncate ${selectedId === npc.id ? 'text-cyan-300' : 'text-slate-200'}`}>{npc.name}</h4>
                         <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase">
                            <span className={npc.affection > 50 ? 'text-green-400' : npc.affection < -20 ? 'text-red-400' : ''}>{npc.affection}%</span>
                            <span className="truncate opacity-50">{npc.faction || '無勢力'}</span>
                            {npc.status && npc.status !== 'Neutral' && (
                                <span className={`px-1.5 py-0.5 rounded text-[8px] border ${
                                    npc.status === 'Enemy' ? 'bg-red-900/40 text-red-400 border-red-500/30' :
                                    npc.status === 'Ally' ? 'bg-green-900/40 text-green-400 border-green-500/30' :
                                    npc.status === 'Lover' ? 'bg-pink-900/40 text-pink-400 border-pink-500/30' : ''
                                }`}>{npc.status}</span>
                            )}
                         </div>
                     </div>
                     {npc.isPinned && <Pin size={12} className="text-yellow-500 fill-current" />}
                 </div>
             ))}
         </div>
       </div>

       <div className={`flex-1 h-full min-h-0 overflow-hidden relative ${selectedId ? 'flex' : 'hidden md:flex'}`}>
           {selectedNPC ? (
                <CharacterCard 
                  character={selectedNPC} 
                  mainPlayer={player}
                  items={inventory} 
                  skills={skills} 
                  allNPCs={npcs} 
                  onUpdateCharacter={onUpdateNPC} 
                  onGiftItem={onGiftItem} 
                  onBuyItem={onBuyItem} 
                  onSellItem={onSellItem} 
                  onQuestReceived={onQuestReceived}
                  worldSetting={worldSetting} 
                  onClose={() => setSelectedId(null)}
                />
           ) : (
               <div className="h-full flex items-center justify-center flex-col gap-4 opacity-20">
                   <Users size={80} strokeWidth={1}/>
                   <p className="font-black uppercase tracking-widest text-sm text-center">選擇現有生物或啟動具現化協議</p>
               </div>
           )}
       </div>

       {isCreatorOpen && (
           <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in">
               <div className="bg-slate-900 border-2 border-cyan-500/30 w-full max-w-5xl h-[85vh] rounded-[3rem] shadow-[0_0_100px_rgba(6,182,212,0.2)] flex flex-col relative overflow-hidden animate-scale-up">
                   
                   <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 bg-slate-950/20">
                       <div>
                           <h3 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                               <Cpu className="text-cyan-400" size={32}/> 以太核心工程儀式
                           </h3>
                           <p className="text-slate-500 text-sm mt-1 font-serif italic">啟動生物單元重組協議，生命將在虛實之間交織。</p>
                       </div>
                       <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                           <button 
                             onClick={() => setCreationMode('ai')}
                             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${creationMode === 'ai' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40' : 'text-slate-500 hover:text-slate-300'}`}
                           >
                               <Wand2 size={14} className="inline mr-2"/> 命運編織 (AI)
                           </button>
                           <button 
                             onClick={() => setCreationMode('manual')}
                             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${creationMode === 'manual' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40' : 'text-slate-500 hover:text-slate-300'}`}
                           >
                               <Settings size={14} className="inline mr-2"/> 核心工程 (手動)
                           </button>
                       </div>
                   </div>

                   <div className="flex-1 flex overflow-hidden">
                       {creationMode === 'manual' && (
                           <div className="w-20 sm:w-64 border-r border-white/5 bg-black/20 flex flex-col p-4 gap-2">
                               {[
                                   { id: 'basic', label: '基礎設定', icon: <User size={18}/> },
                                   { id: 'stats', label: '屬性矩陣', icon: <Activity size={18}/> },
                                   { id: 'skills', label: '技能編碼', icon: <Zap size={18}/> },
                                   { id: 'items', label: '物質配給', icon: <Package size={18}/> },
                               ].map(tab => (
                                   <button 
                                       key={tab.id}
                                       onClick={() => setCreationTab(tab.id as any)}
                                       className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${creationTab === tab.id ? 'bg-white/5 text-white border border-white/10' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}
                                   >
                                       <span className={creationTab === tab.id ? 'text-amber-400' : ''}>{tab.icon}</span>
                                       <span className="hidden sm:inline text-xs font-black uppercase tracking-widest">{tab.label}</span>
                                   </button>
                               ))}
                           </div>
                       )}

                       <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                           {creationMode === 'ai' ? (
                               <div className="max-w-2xl mx-auto space-y-10 animate-fade-in">
                                   <div className="bg-cyan-900/10 border border-cyan-500/20 p-6 rounded-3xl mb-8">
                                       <p className="text-sm text-cyan-100/70 leading-relaxed font-serif italic">
                                           <Info className="inline mr-2 text-cyan-400" size={16}/>
                                           留空欄位點擊「具現化」，系統將根據當前故事因果、世界觀環境及玩家命運，隨機演化出最契合劇情的角色。
                                       </p>
                                   </div>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                       <div className="space-y-4">
                                           <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest flex items-center gap-2"><Database size={12}/> 核心真名</label>
                                           <Input 
                                               value={aiCreationPrompt.name}
                                               onChange={e => setAiCreationPrompt({...aiCreationPrompt, name: e.target.value})}
                                               placeholder="若留空則由命運決定..."
                                               className="bg-black/40 border-slate-800 py-3 rounded-2xl text-lg"
                                           />
                                       </div>
                                       <div className="space-y-4">
                                           <label className="text-[10px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-2"><Users size={12}/> 所屬勢力</label>
                                           <Input 
                                               value={aiCreationPrompt.faction}
                                               onChange={e => setAiCreationPrompt({...aiCreationPrompt, faction: e.target.value})}
                                               placeholder="例如：銀羽教團、自由獵人..."
                                               className="bg-black/40 border-slate-800 py-3 rounded-2xl"
                                           />
                                       </div>
                                   </div>
                                   <div className="space-y-4">
                                       <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2"><Info size={12}/> 身份特徵描述</label>
                                       <textarea 
                                           value={aiCreationPrompt.description}
                                           onChange={e => setAiCreationPrompt({...aiCreationPrompt, description: e.target.value})}
                                           placeholder="例如：一位失去了記憶的瘸腿老兵，手中總握著一把生鏽的斷劍。"
                                           className="w-full h-40 bg-black/40 border border-slate-800 rounded-[2rem] p-6 text-slate-200 focus:border-amber-500/50 focus:outline-none resize-none font-serif leading-relaxed"
                                       />
                                   </div>
                               </div>
                           ) : (
                               <div className="animate-fade-in max-w-3xl">
                                   {creationTab === 'basic' && (
                                       <div className="space-y-10">
                                           <div className="grid grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest">真名</label>
                                                    <Input value={manualData.name} onChange={e => setManualData({...manualData, name: e.target.value})} className="bg-black/40 border-slate-800 text-lg py-4 rounded-2xl" />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest">勢力</label>
                                                    <Input value={manualData.faction} onChange={e => setManualData({...manualData, faction: e.target.value})} className="bg-black/40 border-slate-800 py-4 rounded-2xl" />
                                                </div>
                                           </div>
                                           <div className="space-y-3">
                                               <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest">生平描述</label>
                                               <textarea 
                                                   value={manualData.description} 
                                                   onChange={e => setManualData({...manualData, description: e.target.value})}
                                                   className="w-full h-32 bg-black/40 border border-slate-800 rounded-[2rem] p-6 text-slate-200 focus:border-amber-500/50 focus:outline-none resize-none font-serif"
                                               />
                                           </div>
                                           <div className="grid grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center justify-between">
                                                        <span>初始好感度</span>
                                                        <span className="text-white font-mono">{manualData.affection}%</span>
                                                    </label>
                                                    <input type="range" min="-100" max="100" value={manualData.affection} onChange={e => setManualData({...manualData, affection: parseInt(e.target.value)})} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest">元素相位</label>
                                                    <select 
                                                        value={manualData.elementalAffinity} 
                                                        onChange={e => setManualData({...manualData, elementalAffinity: e.target.value as any})}
                                                        className="w-full bg-black/40 border border-slate-800 rounded-2xl py-3 px-4 text-slate-200 focus:outline-none"
                                                    >
                                                        {['Neutral', 'Fire', 'Water', 'Wind', 'Earth', 'Lightning', 'Holy', 'Dark'].map(e => <option key={e} value={e}>{e}</option>)}
                                                    </select>
                                                </div>
                                           </div>
                                       </div>
                                   )}

                                   {creationTab === 'stats' && (
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                           <div className="space-y-6">
                                               {Object.entries(manualData.stats).map(([stat, val]) => (
                                                   <div key={stat} className="space-y-2 p-4 bg-black/20 rounded-2xl border border-white/5 group hover:border-amber-500/20 transition-all">
                                                       <div className="flex justify-between items-center px-1">
                                                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 group-hover:text-amber-400 transition-colors">
                                                               <Target size={12}/> {stat}
                                                           </span>
                                                           <span className="text-xl font-mono font-black text-white">{val}</span>
                                                       </div>
                                                       <input 
                                                           type="range" min="1" max="100" value={val} 
                                                           onChange={e => setManualData({...manualData, stats: {...manualData.stats, [stat]: parseInt(e.target.value)}})} 
                                                           className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" 
                                                       />
                                                   </div>
                                               ))}
                                           </div>
                                           <div className="flex flex-col items-center justify-center bg-black/40 rounded-[3rem] border border-white/5 p-8 shadow-inner relative overflow-hidden">
                                               <div className="absolute top-0 right-0 p-4 opacity-5"><Dice5 size={120} /></div>
                                               <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] text-center mb-8">物理與精神穩定度模擬</p>
                                               <div className="grid grid-cols-2 gap-4 w-full">
                                                   <div className="p-5 bg-slate-900/60 border border-white/5 rounded-3xl text-center">
                                                       <div className="text-[8px] text-slate-600 font-black uppercase mb-1 flex items-center justify-center gap-1"><Heart size={10}/> 生命上限</div>
                                                       <div className="text-2xl font-mono font-black text-pink-500">{(manualData.stats.endurance * 10) + 100}</div>
                                                   </div>
                                                   <div className="p-5 bg-slate-900/60 border border-white/5 rounded-3xl text-center">
                                                       <div className="text-[8px] text-slate-600 font-black uppercase mb-1 flex items-center justify-center gap-1"><Zap size={10}/> 以太容量</div>
                                                       <div className="text-2xl font-mono font-black text-cyan-500">{(manualData.stats.intelligence * 10) + 100}</div>
                                                   </div>
                                               </div>
                                           </div>
                                       </div>
                                   )}

                                   {creationTab === 'skills' && (
                                       <div className="space-y-6">
                                            <div className="flex justify-between items-center px-2">
                                                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2"><Zap size={14}/> 特技編碼模組</h4>
                                                <Button onClick={addManualSkill} size="sm" className="bg-amber-600/20 border-amber-500/30 text-amber-400 hover:bg-amber-600"><Plus size={14} className="mr-1 inline"/> 新增特技</Button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {manualData.skills.map((skill, idx) => (
                                                    <div key={skill.id} className="p-6 bg-black/40 rounded-[2rem] border border-white/5 space-y-4 relative group hover:border-amber-500/20 transition-all">
                                                        <button onClick={() => setManualData(prev => ({...prev, skills: prev.skills.filter((_, i) => i !== idx)}))} className="absolute top-4 right-4 text-slate-600 hover:text-red-400"><X size={16}/></button>
                                                        <Input value={skill.name} onChange={e => {
                                                            const newSkills = [...manualData.skills];
                                                            newSkills[idx].name = e.target.value;
                                                            setManualData({...manualData, skills: newSkills});
                                                        }} placeholder="技能名稱" className="bg-black/40 border-slate-800 font-black uppercase" />
                                                        <select value={skill.skillType} onChange={e => {
                                                            const newSkills = [...manualData.skills];
                                                            newSkills[idx].skillType = e.target.value as any;
                                                            setManualData({...manualData, skills: newSkills});
                                                        }} className="w-full bg-black/40 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-black text-slate-400">
                                                            <option value="active">Active</option>
                                                            <option value="passive">Passive</option>
                                                            <option value="buff">Buff</option>
                                                            <option value="debuff">Debuff</option>
                                                        </select>
                                                        <textarea value={skill.description} onChange={e => {
                                                            const newSkills = [...manualData.skills];
                                                            newSkills[idx].description = e.target.value;
                                                            setManualData({...manualData, skills: newSkills});
                                                        }} placeholder="技能效果描述..." className="w-full h-20 bg-black/40 border border-slate-800 rounded-xl p-3 text-[10px] text-slate-300 resize-none font-serif" />
                                                    </div>
                                                ))}
                                            </div>
                                       </div>
                                   )}

                                   {creationTab === 'items' && (
                                       <div className="space-y-6">
                                            <div className="flex justify-between items-center px-2">
                                                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2"><Package size={14}/> 初始物質配給</h4>
                                                <Button onClick={addManualItem} size="sm" className="bg-amber-600/20 border-amber-500/30 text-amber-400 hover:bg-amber-600"><Plus size={14} className="mr-1 inline"/> 新增物品</Button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {manualData.inventory.map((item, idx) => (
                                                    <div key={item.id} className="p-5 bg-black/40 rounded-[2.5rem] border border-white/5 space-y-4 relative group hover:border-amber-500/20 transition-all">
                                                        <button onClick={() => setManualData(prev => ({...prev, inventory: prev.inventory.filter((_, i) => i !== idx)}))} className="absolute top-4 right-4 text-slate-600 hover:text-red-400"><X size={16}/></button>
                                                        <Input value={item.name} onChange={e => {
                                                            const newInv = [...manualData.inventory];
                                                            newInv[idx].name = e.target.value;
                                                            setManualData({...manualData, inventory: newInv});
                                                        }} placeholder="物品名稱" className="bg-black/40 border-slate-800 text-xs font-black uppercase" />
                                                        <div className="flex items-center gap-2 px-3 bg-black/40 rounded-xl border border-slate-800">
                                                            <span className="text-[8px] text-slate-600 font-black uppercase">數量</span>
                                                            <input type="number" min="1" value={item.quantity} onChange={e => {
                                                                const newInv = [...manualData.inventory];
                                                                newInv[idx].quantity = parseInt(e.target.value);
                                                                setManualData({...manualData, inventory: newInv});
                                                            }} className="bg-transparent border-none text-[10px] font-mono font-black text-white w-full focus:ring-0" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                       </div>
                                   )}
                               </div>
                           )}
                       </div>
                   </div>

                   <div className="p-8 border-t border-white/5 bg-slate-950/40 flex justify-end items-center gap-4">
                       <button onClick={() => setIsCreatorOpen(false)} className="px-8 py-3 text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">中止程序</button>
                       <Button 
                          onClick={handleCreationSubmit}
                          disabled={isGenerating || (creationMode === 'manual' && !manualData.name.trim())}
                          className={`px-12 py-4 rounded-full text-xs font-black uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 ${creationMode === 'ai' ? 'bg-cyan-600 border-cyan-400' : 'bg-amber-600 border-amber-400'}`}
                       >
                           {isGenerating ? <RefreshCcw className="animate-spin mr-2 inline"/> : <Sparkles className="mr-2 inline"/>}
                           {creationMode === 'ai' ? '執行命運編織' : '啟動核心具現化'}
                       </Button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};
