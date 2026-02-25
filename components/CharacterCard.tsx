
import React, { useState, useEffect, useMemo } from 'react';
import { Player, NPC, Stats, EquipmentSlots, Item, SkillNode, DamageType, StructuredSkill, StatusEffect, NPCArchive, QuickSlot, Affix, Quest } from '../types';
import { 
  Shield, Sword, Zap, Activity, 
  User, Sparkles, Skull, Flame, Droplets, 
  Snowflake, Ghost, Quote, Crosshair,
  TrendingUp, BookOpen, AlertCircle, ShieldAlert, Heart,
  Dna, Target, Wand2, Info, Timer, Briefcase, MessageCircle, History, Send, BrainCircuit, Crown, Clock, Medal, Globe, Frown, Users, Landmark, ChevronRight, Fingerprint, Lock, Compass, Loader2, LayoutGrid, Gift, Book, X, Share2, Eye, Backpack, Search, FlameKindling,
  ShieldCheck,
  Droplet,
  Star,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingBag,
  Wand,
  ArrowLeft,
  LogOut
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import * as GeminiService from '../services/geminiService';
import { Button, Input } from './Layout';

interface CharacterCardProps {
  character: Player | NPC | null;
  mainPlayer?: Player; // Added mainPlayer prop
  items: Item[]; 
  skills?: SkillNode[];
  allNPCs?: NPC[];
  stats?: Stats; 
  isPlayer?: boolean;
  worldSetting?: string;
  onUpdateCharacter?: (updated: any) => void;
  quickSlots?: (QuickSlot | null)[];
  onAssignQuickSlot?: (skill: SkillNode, index?: number) => void;
  onGiftItem?: (npc: NPC, item: Item) => void;
  onBuyItem?: (npcId: string, item: Item) => void;
  onSellItem?: (npcId: string, item: Item) => void;
  onAllocateStat?: (stat: keyof Stats) => void;
  onClose?: () => void;
  onQuestReceived?: (quest: Quest) => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({ 
  character, 
  mainPlayer, // Destructure mainPlayer
  items, 
  skills = [], 
  allNPCs = [],
  stats: overrideStats, 
  isPlayer = false, 
  worldSetting = "", 
  onUpdateCharacter, 
  quickSlots = [], 
  onAssignQuickSlot,
  onGiftItem,
  onBuyItem,
  onSellItem,
  onAllocateStat,
  onClose,
  onQuestReceived
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'archive' | 'relations' | 'skills' | 'inventory' | 'trade' | 'dialogue' | 'logs'>('profile');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingArchive, setIsGeneratingArchive] = useState(false);
  const [isAnalyzingRelations, setIsAnalyzingRelations] = useState(false);
  const [isGeneratingInventory, setIsGeneratingInventory] = useState(false);
  const [isStructuringSkills, setIsStructuringSkills] = useState(false);
  const [showGiftMenu, setShowGiftMenu] = useState(false);
  const [analyzingSkillId, setAnalyzingSkillId] = useState<string | null>(null);
  const [selectedSkillDetail, setSelectedSkillDetail] = useState<StructuredSkill | null>(null);

  if (!character) return <div className="p-10 text-center text-slate-600 italic">無法載入生物資料單元。</div>;

  const npc = !isPlayer ? (character as NPC) : null;
  const player = isPlayer ? (character as Player) : (mainPlayer || null); // Use mainPlayer if viewing NPC
  const displayStats = overrideStats || character.stats || { strength: 5, intelligence: 5, agility: 5, charisma: 5, luck: 5, endurance: 5, perception: 5 };
  const radarData = useMemo(() => [{ subject: '力量 (STR)', A: displayStats.strength, fullMark: 20 }, { subject: '智力 (INT)', A: displayStats.intelligence, fullMark: 20 }, { subject: '敏捷 (AGI)', A: displayStats.agility, fullMark: 20 }, { subject: '魅力 (CHA)', A: displayStats.charisma, fullMark: 20 }, { subject: '幸運 (LUK)', A: displayStats.luck, fullMark: 20 }, { subject: '耐力 (END)', A: displayStats.endurance, fullMark: 20 }, { subject: '感知 (PER)', A: displayStats.perception, fullMark: 20 }], [displayStats]);
  const activeTitle = player?.titles.find(t => t.id === player.activeTitleId);
  const expProgress = useMemo(() => { if (!player) return 0; const required = player.level * 100; return Math.min(100, Math.max(0, (player.exp / required) * 100)); }, [player]);
  const hpValue = character.hp ?? 100;
  const maxHpValue = character.maxHp ?? 100;
  const hpPercent = Math.min(100, Math.max(0, (hpValue / maxHpValue) * 100));
  const mpValue = character.mp ?? (isPlayer ? (player?.mp ?? 100) : 100);
  const maxMpValue = character.maxMp ?? (isPlayer ? (player?.maxMp ?? 100) : 100);
  const mpPercent = Math.min(100, Math.max(0, (mpValue / maxMpValue) * 100));
  const staminaValue = isPlayer ? (player?.stamina ?? 100) : 100;
  const maxStaminaValue = isPlayer ? (player?.maxStamina ?? 100) : 100;
  const staminaPercent = Math.min(100, Math.max(0, (staminaValue / maxStaminaValue) * 100));

  useEffect(() => {
    if (activeTab === 'archive' && !isPlayer && npc && !npc.archive && !isGeneratingArchive) {
      const loadArchive = async () => {
        setIsGeneratingArchive(true);
        try {
          const archive = await GeminiService.generateNPCArchive(npc, worldSetting);
          if (onUpdateCharacter) onUpdateCharacter({ ...npc, archive });
        } catch (e) { console.error(e); }
        setIsGeneratingArchive(false);
      };
      loadArchive();
    }
  }, [activeTab, isPlayer, npc, worldSetting, onUpdateCharacter, isGeneratingArchive]);

  useEffect(() => {
    if (activeTab === 'relations' && !isPlayer && npc && !npc.relationsAnalysis && !isAnalyzingRelations) {
        const analyzeRelations = async () => {
            setIsAnalyzingRelations(true);
            try {
                const dummyPlayer = player || { factions: [] } as any;
                const analysis = await GeminiService.analyzeNPCRelations(npc, dummyPlayer, allNPCs, worldSetting);
                if (onUpdateCharacter) onUpdateCharacter({ ...npc, relationsAnalysis: analysis });
            } catch (e) { console.error(e); }
            setIsAnalyzingRelations(false);
        };
        analyzeRelations();
    }
  }, [activeTab, isPlayer, npc, allNPCs, worldSetting, onUpdateCharacter, isAnalyzingRelations, player]);

  useEffect(() => {
    if ((activeTab === 'inventory' || activeTab === 'trade') && !isPlayer && npc && !npc.inventory && !isGeneratingInventory) {
        const loadInventory = async () => {
            setIsGeneratingInventory(true);
            try {
                const generatedInventory = await GeminiService.generateNPCInventory(npc, worldSetting);
                const itemsWithIcons = await Promise.all(generatedInventory.map(async (item: Item) => {
                    const iconUrl = await GeminiService.generateImage(item.name, 'icon');
                    return { ...item, id: crypto.randomUUID(), iconUrl };
                }));
                if (onUpdateCharacter) onUpdateCharacter({ ...npc, inventory: itemsWithIcons });
            } catch (e) { console.error(e); }
            setIsGeneratingInventory(false);
        };
        loadInventory();
    }
  }, [activeTab, isPlayer, npc, worldSetting, onUpdateCharacter, isGeneratingInventory]);

  useEffect(() => {
    if (activeTab === 'skills' && !isPlayer && npc && typeof npc.skills === 'string' && npc.skills.trim().length > 0 && !isStructuringSkills) handleStructureSkills();
  }, [activeTab, isPlayer, npc]);

  const handleStructureSkills = async () => {
      if (isPlayer || !npc || typeof npc.skills !== 'string' || isStructuringSkills) return;
      setIsStructuringSkills(true);
      try {
          const result = await GeminiService.structureNPCSkills(npc.name, npc.skills, worldSetting);
          if (result && result.length > 0) {
              const mappedSkills = await Promise.all(result.map(async (s: any) => {
                  const iconUrl = await GeminiService.generateImage(s.name, 'icon');
                  return { ...s, id: crypto.randomUUID(), iconUrl };
              }));
              if (onUpdateCharacter) onUpdateCharacter({ ...npc, skills: mappedSkills });
          }
      } catch (e) { console.error(e); }
      setIsStructuringSkills(false);
  };

  const handleAnalyzeSkill = async (skill: any) => {
      if (!npc || analyzingSkillId) return;
      setAnalyzingSkillId(skill.id);
      try {
          const analysis = await GeminiService.analyzeNPCSkillTactics(skill, npc.name, worldSetting);
          if (onUpdateCharacter) {
              const currentSkills = Array.isArray(npc.skills) ? [...npc.skills] : [];
              const updatedSkills = currentSkills.map((s: any) => s.id === skill.id ? { ...s, tacticalAnalysis: analysis } : s);
              onUpdateCharacter({ ...npc, skills: updatedSkills });
              if (selectedSkillDetail?.id === skill.id) setSelectedSkillDetail(prev => prev ? { ...prev, tacticalAnalysis: analysis } : null);
          }
      } catch (e) { console.error(e); }
      setAnalyzingSkillId(null);
  };

  useEffect(() => {
    if (activeTab === 'dialogue' && !isPlayer && npc && !npc.behaviorAnalysis && !isTyping) {
        const analyzeBehavior = async () => {
            if (!player) return;
            try {
                const analysis = await GeminiService.analyzeNPCBehavior(npc, player, worldSetting, chatHistory.join('\n'));
                if (onUpdateCharacter) onUpdateCharacter({ ...npc, behaviorAnalysis: analysis });
            } catch (e) { console.error(e); }
        };
        analyzeBehavior();
    }
  }, [activeTab, isPlayer, npc, player, worldSetting, chatHistory, onUpdateCharacter]);

  const getRelationshipStage = (affection: number) => {
      if (affection <= -50) return { label: '不共戴天 (Nemesis)', color: 'text-red-600', description: '視你為眼中釘，隨時可能攻擊。' };
      if (affection <= -10) return { label: '敵對 (Hostile)', color: 'text-red-400', description: '對你充滿戒心與敵意。' };
      if (affection <= 10) return { label: '陌生人 (Stranger)', color: 'text-slate-400', description: '對你一無所知，保持中立。' };
      if (affection <= 40) return { label: '點頭之交 (Acquaintance)', color: 'text-cyan-200', description: '願意進行基本的交流與交易。' };
      if (affection <= 70) return { label: '朋友 (Friend)', color: 'text-cyan-400', description: '信任你，願意提供幫助與情報。' };
      if (affection <= 90) return { label: '摯友 (Close Friend)', color: 'text-pink-400', description: '願意為你赴湯蹈火，分享秘密。' };
      return { label: '靈魂伴侶 (Soulmate)', color: 'text-pink-500', description: '與你心靈相通，生死與共。' };
  };

  const [visualState, setVisualState] = useState<{
      spriteUrl: string | null;
      backgroundUrl: string | null;
      mood: string;
      action: string;
      isGeneratingSprite: boolean;
      isGeneratingBackground: boolean;
  }>({
      spriteUrl: null,
      backgroundUrl: null,
      mood: 'neutral',
      action: 'standing',
      isGeneratingSprite: false,
      isGeneratingBackground: false
  });

  useEffect(() => {
      if (activeTab === 'dialogue' && !isPlayer && npc) {
          // Initialize visuals if needed
          if (npc.visuals) {
              setVisualState(prev => ({
                  ...prev,
                  spriteUrl: npc.visuals?.spriteUrl || null,
                  backgroundUrl: npc.visuals?.backgroundUrl || null,
                  mood: npc.visuals?.currentMood || 'neutral',
                  action: npc.visuals?.currentAction || 'standing'
              }));
          } else {
              // Generate initial visuals
              const initVisuals = async () => {
                  setVisualState(prev => ({ ...prev, isGeneratingSprite: true, isGeneratingBackground: true }));
                  try {
                      const [sprite, bg] = await Promise.all([
                          GeminiService.generateCharacterSprite(npc, 'neutral', 'standing'),
                          GeminiService.generateSceneBackground(worldSetting, npc.locationId || 'Unknown Location', 'Peaceful')
                      ]);
                      
                      const newVisuals = {
                          spriteUrl: sprite,
                          backgroundUrl: bg,
                          currentMood: 'neutral',
                          currentAction: 'standing'
                      };
                      
                      if (onUpdateCharacter) {
                          onUpdateCharacter({ ...npc, visuals: newVisuals });
                      }
                      
                      setVisualState(prev => ({
                          ...prev,
                          spriteUrl: sprite,
                          backgroundUrl: bg,
                          isGeneratingSprite: false,
                          isGeneratingBackground: false
                      }));
                  } catch (e) {
                      console.error("Failed to generate initial visuals", e);
                      setVisualState(prev => ({ ...prev, isGeneratingSprite: false, isGeneratingBackground: false }));
                  }
              };
              initVisuals();
          }
      }
  }, [activeTab, isPlayer, npc]);

  const handleSendDialogue = async (actionType: string = 'General Chat', messageOverride?: string) => {
    const msg = messageOverride || chatInput.trim();
    if (!msg && actionType === 'General Chat') return;
    if (isTyping || !character) return;
    
    setChatInput(''); 
    setChatHistory(prev => [...prev, `Me [${actionType}]: ${msg}`]); 
    setIsTyping(true);

    try {
      if (isPlayer && player) {
        const response = await GeminiService.chatWithPlayer(player, msg, chatHistory, worldSetting);
        if (response.reply) setChatHistory(prev => [...prev, `Subconscious: ${response.reply}`]);
      } else if (npc) {
        // Re-analyze behavior before replying to ensure context is up-to-date
        let currentBehavior = npc.behaviorAnalysis;
        if (player) {
             try {
                currentBehavior = await GeminiService.analyzeNPCBehavior(npc, player, worldSetting, [...chatHistory, `Me: ${msg}`].join('\n'));
                if (onUpdateCharacter) onUpdateCharacter({ ...npc, behaviorAnalysis: currentBehavior });
             } catch (e) { console.error("Failed to update behavior analysis:", e); }
        }

        const response = await GeminiService.chatWithNPC(npc, msg, chatHistory, currentBehavior, actionType);
        if (response.reply) setChatHistory(prev => [...prev, `${npc.name}: ${response.reply}`]);
        
        let updatedNPC = { ...npc };
        let changed = false;

        // Update Visuals based on response
        if (response.visualMood || response.visualAction) {
            const newMood = response.visualMood || visualState.mood;
            const newAction = response.visualAction || visualState.action;
            
            // Only regenerate if mood/action changed significantly or if we want dynamic updates
            if (newMood !== visualState.mood || newAction !== visualState.action) {
                setVisualState(prev => ({ ...prev, mood: newMood, action: newAction, isGeneratingSprite: true }));
                // Generate new sprite in background
                GeminiService.generateCharacterSprite(npc, newMood, newAction).then(newSprite => {
                    setVisualState(prev => ({ ...prev, spriteUrl: newSprite, isGeneratingSprite: false }));
                    if (onUpdateCharacter) {
                        onUpdateCharacter({ 
                            ...updatedNPC, 
                            visuals: { 
                                ...updatedNPC.visuals, 
                                spriteUrl: newSprite, 
                                currentMood: newMood, 
                                currentAction: newAction 
                            } 
                        });
                    }
                });
            }
        }

        if (response.affectionChange !== undefined) {
           updatedNPC.affection = (npc.affection || 0) + response.affectionChange;
           updatedNPC.interactionLog = [
             ...(npc.interactionLog || []), 
             { 
               id: crypto.randomUUID(), 
               timestamp: Date.now(), 
               summary: response.memoryUpdate || "完成了一次深入交談。", 
               affectionChange: response.affectionChange 
             }
           ];
           changed = true;
        }
        
        if (response.newStatus) {
            updatedNPC.status = response.newStatus as any;
            changed = true;
        }
        
        if (response.playerInteractionStyle) {
            updatedNPC.playerInteractionStyle = response.playerInteractionStyle;
            changed = true;
        }

        if (onUpdateCharacter && changed) {
           onUpdateCharacter(updatedNPC);
        }

        if (response.triggeredQuest) {
          setChatHistory(prev => [...prev, `[系統] ${npc.name} 發布了委託：${response.triggeredQuest.title}`]);
          if (onQuestReceived) {
            const newQuest: Quest = {
              id: crypto.randomUUID(),
              title: response.triggeredQuest.title,
              description: response.triggeredQuest.description,
              type: response.triggeredQuest.type as 'main' | 'side' | 'challenge',
              status: 'active',
              requirements: response.triggeredQuest.requirements || [],
              rewards: response.triggeredQuest.rewards || {},
              objectives: response.triggeredQuest.objectives || [],
              progress: response.triggeredQuest.initialProgress || 0
            };
            onQuestReceived(newQuest);
          }
        }
        if (response.givenItem) {
          setChatHistory(prev => [...prev, `[系統] ${npc.name} 給予了物品：${response.givenItem.name}`]);
          if (onGiftItem) {
              // This is reverse gifting (NPC to Player). onGiftItem is usually Player to NPC.
              // We need a way to add item to player. 
              // For now, just show in chat.
          }
        }
      }
    } catch (e) { console.error(e); }
    setIsTyping(false);
  };

  const getReputationRank = (score: number) => {
      if (score > 500) return { label: '救世傳奇', color: 'text-yellow-400' };
      if (score > 100) return { label: '英雄豪傑', color: 'text-cyan-400' };
      if (score < -500) return { label: '滅世魔王', color: 'text-red-600' };
      if (score < -100) return { label: '惡名昭彰', color: 'text-red-400' };
      return { label: '沒沒無聞', color: 'text-slate-500' };
  };

  const handleGift = async (item: Item) => {
    if (!npc || isTyping) return;
    setIsTyping(true);
    setShowGiftMenu(false);
    setChatHistory(prev => [...prev, `Me: (贈送了 ${item.name})`]);
    setActiveTab('dialogue');
    
    try {
      const response = await GeminiService.giftItemToNPC(npc, item, worldSetting);
      if (response.reply) setChatHistory(prev => [...prev, `${npc.name}: ${response.reply}`]);
      
      if (onGiftItem) {
        onGiftItem(npc, item);
      }

      if (onUpdateCharacter) {
        onUpdateCharacter({ 
          ...npc, 
          affection: (npc.affection || 0) + response.affectionChange, 
          interactionLog: [
            ...(npc.interactionLog || []), 
            { 
              id: crypto.randomUUID(), 
              timestamp: Date.now(), 
              summary: response.memoryUpdate || `贈送了 ${item.name}。`, 
              affectionChange: response.affectionChange 
            }
          ] 
        });
      }
    } catch (e) { console.error(e); }
    setIsTyping(false);
  };
  const getAffixColor = (rarity?: string) => {
    switch(rarity) {
        case 'legendary': return 'bg-yellow-900/30 border-yellow-500/50 text-yellow-300';
        case 'epic': return 'bg-purple-900/30 border-purple-500/50 text-purple-300';
        case 'rare': return 'bg-blue-900/30 border-blue-500/50 text-blue-300';
        default: return 'bg-slate-800 border-white/10 text-slate-400';
    }
  };
  const getRarityText = (rarity?: string) => {
    switch(rarity) {
        case 'legendary': return 'text-yellow-400';
        case 'epic': return 'text-purple-400';
        case 'rare': return 'text-blue-400';
        default: return 'text-slate-400';
    }
  };
  const getItemPrice = (item: Item) => { if (item.price) return item.price; const rarityPrices: Record<string, number> = { legendary: 2000, epic: 500, rare: 150, common: 50 }; return rarityPrices[item.rarity || 'common'] || 100; };

  const renderSkillList = () => {
    let rawSkills = isPlayer ? (skills || []) : (npc?.skills || []);
    
    // Merge equipment skills if player
    if (isPlayer && player && player.equipment) {
        const equipmentSkills: (SkillNode | StructuredSkill)[] = [];
        Object.values(player.equipment).forEach(itemId => {
            if (itemId) {
                const item = items?.find(i => i.id === itemId);
                if (item && item.exclusiveSkills) {
                    equipmentSkills.push(...item.exclusiveSkills);
                }
            }
        });
        if (Array.isArray(rawSkills)) {
            rawSkills = [...rawSkills, ...equipmentSkills];
        }
    }

    const isArray = Array.isArray(rawSkills);
    const isString = typeof rawSkills === 'string';
    if (isStructuringSkills) return (<div className="col-span-full py-20 flex flex-col items-center gap-6 opacity-40"><Loader2 size={64} className="text-cyan-500 animate-spin" /><p className="font-black uppercase tracking-[0.5em] text-lg">正在結構化能力編碼...</p></div>);
    if (isString && (rawSkills as string).trim().length > 0) return (<div className="col-span-full flex flex-col items-center gap-6 py-10"><div className="p-8 bg-black/40 rounded-[2.5rem] border border-amber-500/20 max-w-2xl w-full shadow-inner relative overflow-hidden group"><div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Zap size={100} className="text-amber-500"/></div><h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] mb-4 flex items-center gap-2"><Book size={14}/> 原始能力敘述</h3><p className="text-slate-300 font-serif italic text-lg leading-loose border-l-2 border-amber-500/30 pl-6 py-2">{(rawSkills as string)}</p><div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-4"><Button onClick={handleStructureSkills} className="bg-gradient-to-r from-amber-600 to-orange-600 border-amber-400 text-white font-black px-8 py-3 rounded-full shadow-lg"><Wand className="mr-2 inline"/> 手動啟動結構化重構</Button></div></div></div>);
    if (!isArray || rawSkills.length === 0) return (<div className="col-span-full py-20 flex flex-col items-center opacity-20 text-slate-500"><Zap size={64} /><p className="mt-4 font-black uppercase tracking-widest text-sm">技能矩陣尚未初始化</p></div>);
    return (rawSkills as (SkillNode | StructuredSkill)[]).map((skill, idx) => {
        const isAssigned = isPlayer && quickSlots?.some(s => s?.id === skill.id && s?.type === 'skill');
        const assignedSlot = isPlayer ? quickSlots?.findIndex(s => s?.id === skill.id && s?.type === 'skill') : -1;
        const isNpcSkill = !isPlayer;
        const isPassive = skill.skillType === 'passive';
        // Check if it's an item skill (doesn't have coordinates usually, or we can check ID prefix if we had one, but for now just assume if it's in the list it's valid)
        // We can add a visual indicator for item skills if needed, but the request just says "display in skill system".
        
        return (
        <div className={`p-5 rounded-[2rem] border transition-all duration-500 group relative overflow-hidden bg-black/30 border-white/5 hover:-translate-y-1 shadow-lg ${isPassive ? 'border-purple-500/30 bg-gradient-to-br from-black/40 to-purple-950/10' : (isNpcSkill ? 'hover:border-amber-500/40 bg-gradient-to-br from-black/40 to-amber-950/10' : 'hover:border-cyan-500/30')}`} key={skill.id || idx}>
            {isAssigned && <div className="absolute top-0 right-0 p-3 z-20"><span className="bg-yellow-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg animate-pulse">快捷鍵 {assignedSlot! + 1}</span></div>}
            {isPassive && <div className="absolute -top-1 -right-1 px-3 py-1 bg-purple-600 text-white text-[8px] font-black uppercase tracking-widest rounded-bl-2xl shadow-xl z-20 flex items-center gap-1"><ShieldCheck size={10}/> 被動</div>}
            {isNpcSkill && !isPassive && <div className="absolute -top-1 -left-1 px-3 py-1 bg-amber-600 text-black text-[8px] font-black uppercase tracking-widest rounded-br-2xl shadow-xl z-20 flex items-center gap-1"><FlameKindling size={10}/> NPC 傳奇特技</div>}
            <div className="flex gap-4 items-center relative z-10 pt-4"><div className={`w-14 h-14 rounded-2xl bg-slate-900 border-2 overflow-hidden shrink-0 group-hover:scale-110 transition-transform cursor-pointer ${isPassive ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : (isPlayer ? 'border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]')}`} onClick={() => !isPlayer && setSelectedSkillDetail(skill as StructuredSkill)}><img src={skill.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(skill.name)}&background=${isPassive ? '4c1d95' : (isPlayer ? '0f172a' : '451a03')}&color=fff`} className="w-full h-full object-cover" /></div><div className="min-w-0 flex-1"><h4 className={`text-lg font-black truncate tracking-tight uppercase cursor-pointer hover:underline ${isPassive ? 'text-purple-100' : (isPlayer ? 'text-white' : 'text-amber-200 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]')}`} onClick={() => !isPlayer && setSelectedSkillDetail(skill as StructuredSkill)}>{skill.name}</h4><div className="flex gap-2 mt-1"><span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${isPassive ? 'bg-purple-950 text-purple-400' : (isPlayer ? 'bg-cyan-950 text-cyan-400' : 'bg-amber-950 text-amber-400 border border-amber-500/20')}`}>LV.{skill.level || 1}</span>{skill.manaCost !== undefined && !isPassive && (<span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter bg-blue-950/40 text-blue-400 border border-blue-500/20 flex items-center gap-1"><Droplet size={8}/> {skill.manaCost} MP</span>)}{skill.staminaCost !== undefined && !isPassive && (<span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter bg-orange-950/40 text-orange-400 border border-orange-500/20 flex items-center gap-1"><Activity size={8}/> {skill.staminaCost} SP</span>)}{skill.cooldown !== undefined && skill.cooldown > 0 && <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter bg-slate-950 text-slate-400 border border-white/5 flex items-center gap-1"><Timer size={8}/> {skill.cooldown}T</span>}</div></div></div>
            {skill.affixes && skill.affixes.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5 relative z-10">{skill.affixes.map((affix, i) => (<div key={i} className={`px-2 py-1 rounded-lg border text-[9px] font-bold flex items-center gap-1 ${getAffixColor(affix.rarity)}`} title={affix.effect}><Star size={8} className="fill-current"/> {affix.name}</div>))}</div>}
            <div className="mt-4 space-y-4 relative z-10"><p className={`text-[11px] leading-relaxed italic font-serif pl-2 border-l transition-colors ${isPlayer ? 'text-slate-400 border-white/5 group-hover:text-slate-300' : 'text-amber-100/70 border-amber-500/20 group-hover:text-amber-50'}`}>{skill.description}</p>{skill.tacticalAnalysis && (<div className={`border p-3 rounded-xl animate-fade-in shadow-inner relative overflow-hidden ${isPlayer ? 'bg-cyan-950/20 border-cyan-500/10' : 'bg-amber-950/40 border-amber-500/20'}`}><div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none"><Crown className={isPlayer ? 'text-cyan-500' : 'text-amber-500'} size={32}/></div><div className={`text-[8px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1 ${isPlayer ? 'text-cyan-500' : 'text-amber-500'}`}><ShieldCheck size={10}/> 戰術解析</div><p className={`text-[10px] font-serif leading-relaxed italic ${isPlayer ? 'text-cyan-100/70' : 'text-amber-100/90 font-bold'}`}>{skill.tacticalAnalysis}</p></div>)}</div>
        </div>
    )});
  };

  const renderItemCard = (item: Item, action?: React.ReactNode) => (
      <div key={item.id} className="p-4 bg-slate-900/60 rounded-3xl border border-white/5 flex flex-col gap-3 hover:border-cyan-500/30 transition-all group relative overflow-hidden">
          <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-black border ${getAffixColor(item.rarity)} overflow-hidden shrink-0 shadow-lg`}><img src={item.iconUrl} className="w-full h-full object-cover" /></div>
              <div className="flex-1 min-w-0">
                  <div className={`text-sm font-black uppercase truncate ${getRarityText(item.rarity)}`}>{item.name}</div>
                  <div className="text-[9px] text-slate-500 font-mono flex items-center gap-2">x{item.quantity} • {item.type} {item.level && `• Lv.${item.level}`}</div>
              </div>
              {action}
          </div>
          
          {/* 附帶技能/詞綴縮圖顯示 */}
          {(item.affixes || item.potionEffect || (item.exclusiveSkills && item.exclusiveSkills.length > 0)) && (
              <div className="flex flex-wrap gap-1.5 mt-1 border-t border-white/5 pt-2">
                  {item.potionEffect && (
                      <div className="px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-[8px] text-emerald-400 font-black flex items-center gap-1"><Wand size={8}/> 附帶效果</div>
                  )}
                  {item.exclusiveSkills && item.exclusiveSkills.map((skill, i) => (
                      <div key={i} className="px-2 py-0.5 rounded-full bg-amber-950/40 border border-amber-500/30 text-[8px] text-amber-400 font-black flex items-center gap-1"><Zap size={8}/> {skill.name}</div>
                  ))}
                  {item.affixes?.map((a, i) => (
                      <div key={i} className={`px-2 py-0.5 rounded-full border text-[7px] font-black ${getAffixColor(a.rarity)}`} title={a.effect}>{a.name}</div>
                  ))}
              </div>
          )}
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl animate-fade-in relative">
      <div className="flex gap-2 p-6 border-b border-white/5 bg-slate-950/20 shrink-0 overflow-x-auto scrollbar-hide items-center">
          {onClose && (<button onClick={onClose} className="flex items-center justify-center p-2.5 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:border-red-500/50 hover:bg-red-900/20 transition-all mr-2 shrink-0 group" title="退出卡片"><LogOut size={18} className="group-hover:-translate-x-0.5 transition-transform" /></button>)}
          <div className="flex gap-2">
            {[ { id: 'profile', label: '基礎概況', icon: <User size={14}/> }, { id: 'archive', label: '核心檔案', icon: <Fingerprint size={14}/> }, { id: 'relations', label: '社交分析', icon: <Share2 size={14}/> }, { id: 'skills', label: '技能矩陣', icon: <Zap size={14}/> }, { id: 'inventory', label: '物品欄位', icon: <Backpack size={14}/> }, { id: 'trade', label: '買賣交易', icon: <ShoppingBag size={14}/> }, { id: 'dialogue', label: isPlayer ? '內在心智' : '神經連結', icon: <MessageCircle size={14}/> }, { id: 'logs', label: '交互日誌', icon: <History size={14}/> } ].filter(t => isPlayer ? (t.id !== 'inventory' && t.id !== 'relations' && t.id !== 'trade') : true).map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>{t.icon} {t.label}</button>
            ))}
          </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {activeTab === 'profile' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fade-in">
                  <div className="lg:col-span-4 flex flex-col gap-6">
                      <div className="aspect-[3/4] rounded-[2.5rem] overflow-hidden border border-white/10 relative group bg-slate-950 shadow-2xl">
                          <img src={character.avatarUrl || 'https://picsum.photos/400/600'} className="w-full h-full object-cover transition-transform duration-[5s] group-hover:scale-110" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                          <div className="absolute top-4 left-4 z-20">
                              <div className="px-3 py-1 bg-black/60 border border-white/10 rounded-full text-[12px] font-black text-white shadow-lg backdrop-blur-md">Lv.{character.level || 1}</div>
                          </div>
                          <div className="absolute bottom-6 left-6 right-6">
                              {activeTitle && (
                                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-900/40 border border-yellow-500/30 rounded-full text-yellow-400 text-[9px] font-black uppercase tracking-[0.2em] mb-2 shadow-lg backdrop-blur-sm">
                                      <Medal size={10}/> {activeTitle.name}
                                  </div>
                              )}
                              <h2 className="text-4xl font-black text-white font-serif tracking-tight drop-shadow-2xl">{character.name}</h2>
                              {isPlayer && player && (
                                  <div className="mt-3 space-y-1">
                                      <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                          <span>經驗值</span>
                                          <span>{player.exp} / {player.level * 100}</span>
                                      </div>
                                      <div className="h-1 bg-white/10 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                          <div className="h-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)] transition-all duration-1000" style={{ width: `${expProgress}%` }}></div>
                                      </div>
                                  </div>
                              )}
                              <div className="flex items-center gap-2 mt-4">
                                  <div className="h-1 w-8 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-80">{npc?.faction || '獨立個體'}</span>
                                  {npc && npc.status && (
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                                          npc.status === 'Enemy' ? 'bg-red-900/40 text-red-400 border-red-500/30' :
                                          npc.status === 'Ally' ? 'bg-green-900/40 text-green-400 border-green-500/30' :
                                          npc.status === 'Lover' ? 'bg-pink-900/40 text-pink-400 border-pink-500/30' :
                                          'bg-slate-800 text-slate-400 border-slate-700'
                                      }`}>
                                          {npc.status}
                                      </span>
                                  )}
                              </div>
                          </div>
                      </div>

                      <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 space-y-6 shadow-inner">
                          <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-white/5 pb-2">
                              <Activity size={14}/> 生命體徵矩陣
                          </h3>
                          <div className="space-y-4">
                              <div className="space-y-1.5">
                                  <div className="flex justify-between items-end">
                                      <span className="text-[9px] font-black text-pink-500 uppercase tracking-widest flex items-center gap-1"><Heart size={10}/> 生命能 (HP)</span>
                                      <span className="text-xs font-mono font-black text-slate-300">{Math.round(hpValue)} / {maxHpValue}</span>
                                  </div>
                                  <div className="h-2 bg-slate-900 rounded-full border border-white/5 overflow-hidden relative shadow-inner">
                                      <div className="h-full bg-gradient-to-r from-pink-900 to-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)] transition-all duration-700" style={{ width: `${hpPercent}%` }}></div>
                                  </div>
                              </div>
                              <div className="space-y-1.5">
                                  <div className="flex justify-between items-end">
                                      <span className="text-[9px] font-black text-cyan-500 uppercase tracking-widest flex items-center gap-1"><Zap size={10}/> 以太量 (MP)</span>
                                      <span className="text-xs font-mono font-black text-slate-300">{Math.round(mpValue)} / {maxMpValue}</span>
                                  </div>
                                  <div className="h-2 bg-slate-900 rounded-full border border-white/5 overflow-hidden relative shadow-inner">
                                      <div className="h-full bg-gradient-to-r from-cyan-900 to-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-all duration-700" style={{ width: `${mpPercent}%` }}></div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {!isPlayer && npc && (
                          <div className="grid grid-cols-2 gap-3">
                              <Button onClick={() => setShowGiftMenu(true)} variant="secondary" className="bg-pink-900/20 border-pink-500/30 text-pink-400 py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-black"><Gift size={16}/> 贈送物品</Button>
                              <Button onClick={() => setActiveTab('trade')} variant="secondary" className="bg-amber-900/20 border-amber-500/30 text-amber-400 py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-black"><ShoppingBag size={16}/> 交易物資</Button>
                          </div>
                      )}

                      {isPlayer && player && (
                          <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 space-y-4 shadow-inner">
                              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-white/5 pb-2"><Medal size={14} className="text-yellow-500"/> 稱號收藏庫</h3>
                              <div className="flex flex-wrap gap-2">
                                  {player.titles.length === 0 ? (
                                      <p className="text-[10px] text-slate-700 italic">尚無獲得任何稱號。</p>
                                  ) : (
                                      player.titles.map(t => (
                                          <div key={t.id} className={`px-3 py-1.5 rounded-xl border text-[9px] font-black transition-all ${player.activeTitleId === t.id ? 'bg-yellow-900/30 border-yellow-500 text-yellow-400 scale-105' : 'bg-slate-900/50 border-white/5 text-slate-500 opacity-60'}`}>{t.name}</div>
                                      ))
                                  )}
                              </div>
                          </div>
                      )}

                      {isPlayer && player && (
                          <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 space-y-4 shadow-inner">
                              <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-white/5 pb-2">
                                  <Sparkles size={14}/> 外貌與特質
                              </h3>
                              <div className="space-y-3">
                                  {player.appearance && (
                                      <div className="grid grid-cols-1 gap-2">
                                          <div className="flex justify-between text-[10px]">
                                              <span className="text-slate-500 uppercase font-black tracking-widest">髮型</span>
                                              <span className="text-slate-200 font-serif italic">{player.appearance.hairstyle}</span>
                                          </div>
                                          <div className="flex justify-between text-[10px]">
                                              <span className="text-slate-500 uppercase font-black tracking-widest">眼睛</span>
                                              <span className="text-slate-200 font-serif italic">{player.appearance.eyeColor}</span>
                                          </div>
                                          <div className="flex justify-between text-[10px]">
                                              <span className="text-slate-500 uppercase font-black tracking-widest">服裝</span>
                                              <span className="text-slate-200 font-serif italic">{player.appearance.clothingStyle}</span>
                                          </div>
                                      </div>
                                  )}
                                  {player.traits.length > 0 && (
                                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                                          {player.traits.map((trait, idx) => (
                                              <span key={idx} className="px-2 py-1 bg-cyan-900/20 border border-cyan-500/30 rounded text-cyan-400 text-[9px] font-black uppercase tracking-tighter">
                                                  {trait}
                                              </span>
                                          ))}
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}

                      {!isPlayer && npc && (
                          <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 space-y-4 shadow-inner">
                              <h3 className="text-[10px] font-black text-pink-400 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-pink-500/10 pb-2"><Heart size={14}/> 好感共鳴度</h3>
                              <div className="flex items-center gap-4">
                                  <div className="text-3xl font-mono font-black text-pink-500 tracking-tighter">{npc.affection}%</div>
                                  <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                      <div className="h-full bg-gradient-to-r from-pink-900 to-pink-500" style={{ width: `${Math.max(0, Math.min(100, npc.affection))}%` }}></div>
                                  </div>
                              </div>
                              {npc.playerInteractionStyle && (
                                  <div className="mt-2 pt-2 border-t border-pink-500/10">
                                      <div className="text-[9px] font-black text-pink-400/70 uppercase tracking-widest mb-1">玩家印象</div>
                                      <div className="text-xs text-pink-100 font-serif italic">"{npc.playerInteractionStyle}"</div>
                                  </div>
                              )}
                              {npc.behaviorAnalysis && (
                                  <div className="mt-2 pt-2 border-t border-pink-500/10 space-y-2">
                                      <div>
                                          <div className="text-[9px] font-black text-pink-400/70 uppercase tracking-widest mb-1">當前情緒</div>
                                          <div className="text-xs text-pink-100 font-serif italic">{npc.behaviorAnalysis.currentMood}</div>
                                      </div>
                                      <div>
                                          <div className="text-[9px] font-black text-pink-400/70 uppercase tracking-widest mb-1">首要目標</div>
                                          <div className="text-xs text-pink-100 font-serif italic">{npc.behaviorAnalysis.primaryGoal}</div>
                                      </div>
                                      <div>
                                          <div className="text-[9px] font-black text-pink-400/70 uppercase tracking-widest mb-1">預計行動</div>
                                          <div className="text-xs text-pink-100 font-serif italic">{npc.behaviorAnalysis.nextAction}</div>
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>

                  <div className="lg:col-span-8 flex flex-col gap-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="p-6 bg-black/30 rounded-[2.5rem] border border-white/5 shadow-inner relative overflow-hidden group">
                              <div className="absolute top-4 left-6 z-10">
                                  <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] flex items-center gap-2"><TrendingUp size={14}/> 核心參數推演</h3>
                              </div>
                              <div className="h-64 w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                          <PolarGrid stroke="#1e293b" />
                                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 900 }} />
                                          <PolarRadiusAxis angle={30} domain={[0, 20]} tick={false} axisLine={false} />
                                          <Radar name="Stats" dataKey="A" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.4}/>
                                      </RadarChart>
                                  </ResponsiveContainer>
                              </div>
                          </div>

                          <div className="flex flex-col gap-4">
                              <div className="p-6 bg-slate-900/60 rounded-[2.5rem] border border-cyan-500/20 shadow-2xl">
                                  <div className="flex justify-between items-center mb-4 border-b border-cyan-500/10 pb-2">
                                      <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.4em] flex items-center gap-2"><Shield size={14}/> 最終屬性總覽</h3>
                                      {isPlayer && player && player.statPoints > 0 && (
                                          <div className="text-[10px] font-black text-yellow-400 uppercase tracking-widest animate-pulse bg-yellow-900/40 px-2 py-0.5 rounded border border-yellow-500/30">
                                              可用點數: {player.statPoints}
                                          </div>
                                      )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                      <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all">
                                          <div className="flex items-center gap-2"><Sword size={12} className="text-red-400" /><span className="text-[10px] font-black text-slate-400 uppercase">力量</span></div>
                                          <div className="flex items-center gap-2">
                                              <span className="text-sm font-mono font-black text-white">{displayStats.strength}</span>
                                              {isPlayer && player && player.statPoints > 0 && onAllocateStat && (
                                                  <button onClick={() => onAllocateStat('strength')} className="w-5 h-5 rounded bg-yellow-600 hover:bg-yellow-500 flex items-center justify-center text-black font-bold text-xs shadow-lg active:scale-95 transition-transform">+</button>
                                              )}
                                          </div>
                                      </div>
                                      <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all">
                                          <div className="flex items-center gap-2"><BrainCircuit size={12} className="text-blue-400" /><span className="text-[10px] font-black text-slate-400 uppercase">智力</span></div>
                                          <div className="flex items-center gap-2">
                                              <span className="text-sm font-mono font-black text-white">{displayStats.intelligence}</span>
                                              {isPlayer && player && player.statPoints > 0 && onAllocateStat && (
                                                  <button onClick={() => onAllocateStat('intelligence')} className="w-5 h-5 rounded bg-yellow-600 hover:bg-yellow-500 flex items-center justify-center text-black font-bold text-xs shadow-lg active:scale-95 transition-transform">+</button>
                                              )}
                                          </div>
                                      </div>
                                      <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all">
                                          <div className="flex items-center gap-2"><Zap size={12} className="text-yellow-400" /><span className="text-[10px] font-black text-slate-400 uppercase">敏捷</span></div>
                                          <div className="flex items-center gap-2">
                                              <span className="text-sm font-mono font-black text-white">{displayStats.agility}</span>
                                              {isPlayer && player && player.statPoints > 0 && onAllocateStat && (
                                                  <button onClick={() => onAllocateStat('agility')} className="w-5 h-5 rounded bg-yellow-600 hover:bg-yellow-500 flex items-center justify-center text-black font-bold text-xs shadow-lg active:scale-95 transition-transform">+</button>
                                              )}
                                          </div>
                                      </div>
                                      <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all">
                                          <div className="flex items-center gap-2"><Sparkles size={12} className="text-pink-400" /><span className="text-[10px] font-black text-slate-400 uppercase">魅力</span></div>
                                          <div className="flex items-center gap-2">
                                              <span className="text-sm font-mono font-black text-white">{displayStats.charisma}</span>
                                              {isPlayer && player && player.statPoints > 0 && onAllocateStat && (
                                                  <button onClick={() => onAllocateStat('charisma')} className="w-5 h-5 rounded bg-yellow-600 hover:bg-yellow-500 flex items-center justify-center text-black font-bold text-xs shadow-lg active:scale-95 transition-transform">+</button>
                                              )}
                                          </div>
                                      </div>
                                      <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all">
                                          <div className="flex items-center gap-2"><Target size={12} className="text-emerald-400" /><span className="text-[10px] font-black text-slate-400 uppercase">幸運</span></div>
                                          <div className="flex items-center gap-2">
                                              <span className="text-sm font-mono font-black text-white">{displayStats.luck}</span>
                                              {isPlayer && player && player.statPoints > 0 && onAllocateStat && (
                                                  <button onClick={() => onAllocateStat('luck')} className="w-5 h-5 rounded bg-yellow-600 hover:bg-yellow-500 flex items-center justify-center text-black font-bold text-xs shadow-lg active:scale-95 transition-transform">+</button>
                                              )}
                                          </div>
                                      </div>
                                      <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all">
                                          <div className="flex items-center gap-2"><Activity size={12} className="text-orange-400" /><span className="text-[10px] font-black text-slate-400 uppercase">耐力</span></div>
                                          <div className="flex items-center gap-2">
                                              <span className="text-sm font-mono font-black text-white">{displayStats.endurance}</span>
                                              {isPlayer && player && player.statPoints > 0 && onAllocateStat && (
                                                  <button onClick={() => onAllocateStat('endurance')} className="w-5 h-5 rounded bg-yellow-600 hover:bg-yellow-500 flex items-center justify-center text-black font-bold text-xs shadow-lg active:scale-95 transition-transform">+</button>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              <div className="p-6 bg-black/30 rounded-[2.5rem] border border-white/5 flex-1 shadow-inner">
                                  <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-2 border-b border-purple-500/10 pb-2"><Globe size={14}/> {isPlayer ? '社會聲望矩陣' : '派系立場'}</h3>
                                  {isPlayer ? (
                                      <div className="space-y-4">
                                          <div className="flex justify-between items-end">
                                              <div className="text-[10px] font-black text-slate-500 uppercase">整體社會定位</div>
                                              <div className={`text-lg font-black ${getReputationRank(player?.reputation || 0).color}`}>{getReputationRank(player?.reputation || 0).label}</div>
                                          </div>
                                          {(player?.factions.length || 0) === 0 ? (
                                              <p className="text-[10px] text-slate-700 italic border-t border-white/5 pt-4 mt-4">尚未與特定組織建立顯著連動。</p>
                                          ) : (
                                              <div className="space-y-4 border-t border-white/5 pt-4 mt-4">
                                                  {player?.factions.map(f => (
                                                      <div key={f.factionName} className="flex flex-col gap-1.5">
                                                          <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter">
                                                              <span className="text-slate-400">{f.factionName}</span>
                                                              <span className="text-cyan-400">{f.rank}</span>
                                                          </div>
                                                          <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                                              <div className="h-full bg-gradient-to-r from-cyan-900 to-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: `${(f.score + 100) / 2}%` }}></div>
                                                          </div>
                                                      </div>
                                                  ))}
                                              </div>
                                          )}
                                      </div>
                                  ) : (
                                      <div className="space-y-6">
                                          <div className="flex items-center gap-4 group/item">
                                              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center border border-white/5 transition-colors group-hover/item:border-cyan-500/30">
                                                  <Landmark className="text-slate-500 group-hover/item:text-cyan-400 transition-colors"/>
                                              </div>
                                              <div>
                                                  <div className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-0.5">歸屬勢力</div>
                                                  <div className="text-base font-black text-white uppercase">{npc?.faction || '荒野遊民'}</div>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-4 group/item">
                                              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center border border-white/5 transition-colors group-hover/item:border-yellow-500/30">
                                                  <Zap className="text-slate-500 group-hover/item:text-yellow-400 transition-colors"/>
                                              </div>
                                              <div>
                                                  <div className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-0.5">元素傾向</div>
                                                  <div className="text-base font-black text-white uppercase tracking-tighter">{character.elementalAffinity || 'Neutral'}</div>
                                              </div>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>

                      <div className="p-8 bg-black/20 rounded-[3rem] border border-white/5 shadow-inner relative">
                          <Quote size={48} className="absolute -top-4 -left-4 text-white/5 rotate-12" />
                          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4 flex items-center gap-2"><BookOpen size={14}/> {isPlayer ? '背景故事與描述' : '背景故事紀錄'}</h3>
                          <div className="space-y-4">
                              <p className="text-base text-slate-300 leading-relaxed font-serif italic text-justify px-4 border-l border-white/10">{character.description || '這個生物的描述隱藏在以太的迷霧中。'}</p>
                              {isPlayer && player?.backgroundStory && (
                                  <div className="mt-4 pt-4 border-t border-white/5">
                                      <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">深層背景</h4>
                                      <p className="text-sm text-slate-400 leading-relaxed font-serif italic text-justify px-4">{player.backgroundStory}</p>
                                  </div>
                              )}
                          </div>
                      </div>

                      {!isPlayer && npc && (
                          <div className="p-8 bg-black/20 rounded-[3rem] border border-white/5 shadow-inner relative">
                              <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] mb-4 flex items-center gap-2">
                                  <Crosshair size={14}/> 戰鬥 AI 配置
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">AI 類型</label>
                                      <select 
                                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-300 focus:border-cyan-500/50 outline-none"
                                          value={npc.aiConfig?.type || 'Basic'}
                                          onChange={(e) => {
                                              const newConfig = { ...(npc.aiConfig || { type: 'Basic' }), type: e.target.value as any };
                                              if (onUpdateCharacter) onUpdateCharacter({ ...npc, aiConfig: newConfig });
                                          }}
                                      >
                                          {['Basic', 'Aggressive', 'Defensive', 'Tactical', 'Healer', 'Boss'].map(type => (
                                              <option key={type} value={type}>{type}</option>
                                          ))}
                                      </select>
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">撤退閾值 (HP%)</label>
                                      <div className="flex items-center gap-2">
                                          <input 
                                              type="range" 
                                              min="0" 
                                              max="100" 
                                              className="flex-1 accent-cyan-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                              value={npc.aiConfig?.fleeThreshold || 0}
                                              onChange={(e) => {
                                                  const newConfig = { ...(npc.aiConfig || { type: 'Basic' }), fleeThreshold: parseInt(e.target.value) };
                                                  if (onUpdateCharacter) onUpdateCharacter({ ...npc, aiConfig: newConfig });
                                              }}
                                          />
                                          <span className="text-xs font-mono text-cyan-400 w-8 text-right">{npc.aiConfig?.fleeThreshold || 0}%</span>
                                      </div>
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">治療閾值 (HP%)</label>
                                      <div className="flex items-center gap-2">
                                          <input 
                                              type="range" 
                                              min="0" 
                                              max="100" 
                                              className="flex-1 accent-green-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                              value={npc.aiConfig?.healThreshold || 0}
                                              onChange={(e) => {
                                                  const newConfig = { ...(npc.aiConfig || { type: 'Basic' }), healThreshold: parseInt(e.target.value) };
                                                  if (onUpdateCharacter) onUpdateCharacter({ ...npc, aiConfig: newConfig });
                                              }}
                                          />
                                          <span className="text-xs font-mono text-green-400 w-8 text-right">{npc.aiConfig?.healThreshold || 0}%</span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {activeTab === 'archive' && (
            <div className="h-full flex flex-col gap-8 max-w-5xl mx-auto animate-fade-in">{!isPlayer && npc ? (isGeneratingArchive ? (<div className="flex-1 flex flex-col items-center justify-center gap-6 opacity-40"><Loader2 size={64} className="text-cyan-500 animate-spin" /><p className="font-black uppercase tracking-[0.5em] text-lg">正在解析深層記憶脈衝...</p></div>) : npc.archive ? (<div className="grid grid-cols-1 lg:grid-cols-2 gap-8"><div className="space-y-8"><div className="p-8 bg-black/30 rounded-[2.5rem] border border-white/5 shadow-xl"><h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-2 border-b border-cyan-500/10 pb-2"><History size={16}/> 溯源背景</h3><p className="text-slate-300 leading-loose font-serif italic text-justify">{npc.archive.background}</p></div><div className="p-8 bg-black/30 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group"><div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity"><Skull size={100} /></div><h3 className="text-[10px] font-black text-red-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-2 border-b border-red-500/10 pb-2"><Lock size={16}/> 核心秘密</h3><p className="text-red-200/80 leading-loose font-serif italic blur-sm hover:blur-none transition-all duration-700 cursor-help">{npc.archive.secret}</p><div className="mt-4 text-[9px] text-red-500/40 uppercase font-black text-right">※ 懸停以破解加密記憶</div></div></div><div className="space-y-8"><div className="p-8 bg-black/30 rounded-[2.5rem] border border-white/5 shadow-xl"><h3 className="text-[10px] font-black text-yellow-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-2 border-b border-yellow-500/10 pb-2"><Target size={16}/> 終極目標</h3><p className="text-yellow-100/70 leading-loose font-serif text-lg">「{npc.archive.goal}」</p></div><div className="p-8 bg-black/30 rounded-[2.5rem] border border-white/5 shadow-xl"><h3 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-2 border-b border-purple-500/10 pb-2"><Compass size={16}/> 性格相位</h3><div className="flex flex-wrap gap-3">{npc.archive.personalityTraits.map((trait, idx) => (<span className="px-4 py-2 bg-purple-900/20 border border-purple-500/30 rounded-full text-purple-300 text-[11px] font-black uppercase tracking-wider shadow-inner" key={idx}>{trait}</span>))}</div></div><div className="p-8 bg-black/30 rounded-[2.5rem] border border-white/5 shadow-xl border-dashed"><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4 flex items-center gap-2"><Sparkles size={16}/> 第一印象</h3><p className="text-slate-400 text-sm italic font-serif leading-relaxed">{npc.archive.firstImpression}</p></div></div></div>) : (<div className="flex-1 flex flex-col items-center justify-center gap-6 opacity-20"><Fingerprint size={120} strokeWidth={1} /><p className="font-black uppercase tracking-[0.5em] text-lg">核心檔案未載入</p></div>)) : (<div className="flex-1 flex flex-col items-center justify-center gap-6 opacity-20"><User size={120} strokeWidth={1} /><p className="font-black uppercase tracking-[0.5em] text-lg">玩家檔案由命運即時撰寫</p></div>)}</div>
          )}

          {activeTab === 'relations' && (
              <div className="h-full flex flex-col gap-8 max-w-5xl mx-auto animate-fade-in">{!isPlayer && npc ? (isAnalyzingRelations ? (<div className="flex-1 flex flex-col items-center justify-center gap-6 opacity-40"><Loader2 size={64} className="text-purple-500 animate-spin" /><p className="font-black uppercase tracking-[0.5em] text-lg">正在掃描社會動態場...</p></div>) : npc.relationsAnalysis ? (<div className="grid grid-cols-1 gap-8"><div className="p-8 bg-black/30 rounded-[2.5rem] border border-purple-500/20 shadow-xl"><h3 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-2 border-b border-purple-500/10 pb-2"><Landmark size={16}/> 勢力立足點</h3><p className="text-slate-200 leading-loose font-serif text-justify">{npc.relationsAnalysis.factionStanding}</p></div><div className="p-8 bg-black/30 rounded-[2.5rem] border border-red-500/20 shadow-xl"><h3 className="text-[10px] font-black text-red-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-2 border-b border-red-500/10 pb-2"><Users size={16}/> 社交網絡糾葛</h3><p className="text-slate-200 leading-loose font-serif text-justify">{npc.relationsAnalysis.socialConflict}</p></div><div className="p-8 bg-cyan-900/10 rounded-[2.5rem] border border-cyan-500/30 shadow-xl relative"><div className="absolute top-0 right-0 p-6 opacity-10"><BrainCircuit size={80}/></div><h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-2 border-b border-cyan-500/10 pb-2"><Crosshair size={16}/> 戰略互動建議</h3><p className="text-cyan-100 leading-loose font-serif font-bold italic text-justify">{npc.relationsAnalysis.strategicAdvice}</p></div></div>) : (<div className="flex-1 flex flex-col items-center justify-center gap-6 opacity-20"><Share2 size={120} strokeWidth={1} /><p className="font-black uppercase tracking-[0.5em] text-lg">數據不足，無法解析社會場</p></div>)) : null}</div>
          )}

          {activeTab === 'trade' && !isPlayer && npc && (
            <div className="h-full flex flex-col gap-8 animate-fade-in">
                <div className="flex items-center justify-between bg-black/40 p-6 rounded-[2rem] border border-white/5 shadow-inner"><div className="flex items-center gap-4"><div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-2xl text-yellow-500"><Coins size={24}/></div><div><div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">持有資產</div><div className="text-2xl font-mono font-black text-yellow-400">{(player || overrideStats as any)?.gold || 0} G</div></div></div><div className="text-right"><div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">交易對象</div><div className="text-lg font-black text-white">{npc.name}</div></div></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] flex items-center gap-2 px-2"><ArrowDownLeft size={16}/> 購入物資</h3>
                        <div className="bg-black/30 rounded-[2.5rem] border border-white/5 p-4 min-h-[400px] overflow-y-auto custom-scrollbar flex flex-col gap-3 shadow-inner">
                            {npc.inventory && npc.inventory.length > 0 ? (
                                npc.inventory.map(item => renderItemCard(item, (
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <div className="text-sm font-mono font-bold text-yellow-500">{getItemPrice(item)} G</div>
                                        <Button size="sm" onClick={() => onBuyItem && onBuyItem(npc.id, item)} className="bg-cyan-900/40 border-cyan-500/30 text-cyan-400 hover:bg-cyan-600 hover:text-white text-[10px] font-black py-1 px-4 rounded-full">購買</Button>
                                    </div>
                                )))
                            ) : (<div className="m-auto text-slate-700 italic text-sm">NPC 已無可售物資</div>)}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] flex items-center gap-2 px-2"><ArrowUpRight size={16}/> 出售庫存</h3>
                        <div className="bg-black/30 rounded-[2.5rem] border border-white/5 p-4 min-h-[400px] overflow-y-auto custom-scrollbar flex flex-col gap-3 shadow-inner">
                            {items && items.length > 0 ? (
                                items.map(item => renderItemCard(item, (
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <div className="text-sm font-mono font-bold text-green-500">+{Math.floor(getItemPrice(item) * 0.5)} G</div>
                                        <Button size="sm" onClick={() => onSellItem && onSellItem(npc.id, item)} className="bg-amber-900/40 border-amber-500/30 text-amber-400 hover:bg-amber-600 hover:text-white text-[10px] font-black py-1 px-4 rounded-full">出售</Button>
                                    </div>
                                )))
                            ) : (<div className="m-auto text-slate-700 italic text-sm">背包已空</div>)}
                        </div>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="h-full flex flex-col gap-8 max-w-5xl mx-auto animate-fade-in"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">{renderSkillList()}</div></div>
          )}

          {activeTab === 'inventory' && !isPlayer && npc && (
            <div className="h-full flex flex-col gap-8 max-w-5xl mx-auto animate-fade-in">{isGeneratingInventory ? (<div className="flex-1 flex flex-col items-center justify-center gap-6 opacity-40"><Loader2 className="text-amber-500 animate-spin" size={64} /><p className="font-black uppercase tracking-[0.5em] text-lg">正在掃描掃描物資...</p></div>) : npc.inventory && npc.inventory.length > 0 ? (<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">{npc.inventory.map(item => renderItemCard(item))}</div>) : (<div className="flex-1 flex flex-col items-center justify-center gap-6 opacity-20"><Backpack size={120} strokeWidth={1} /><p className="font-black uppercase tracking-[0.5em] text-lg">物品欄數據空缺</p></div>)}</div>
          )}
          
          {activeTab === 'dialogue' && (
              <div className="h-full flex flex-col relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-black group">
                  {/* Background Layer */}
                  <div className="absolute inset-0 z-0">
                       {visualState.backgroundUrl ? (
                           <img src={visualState.backgroundUrl} className="w-full h-full object-cover opacity-60 transition-opacity duration-1000 animate-fade-in" alt="Background" />
                       ) : (
                           <div className="w-full h-full bg-gradient-to-b from-slate-900 to-black animate-pulse" />
                       )}
                       {visualState.isGeneratingBackground && (
                           <div className="absolute top-4 right-4 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-[10px] text-cyan-400 flex items-center gap-2 border border-cyan-500/30 z-50">
                               <Loader2 size={10} className="animate-spin" /> 生成場景中...
                           </div>
                       )}
                  </div>

                  {/* Character Layer */}
                  <div className="absolute inset-0 z-10 flex items-end justify-center pointer-events-none">
                       {visualState.spriteUrl ? (
                           <img 
                              src={visualState.spriteUrl} 
                              className="h-[90%] object-contain drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] transition-all duration-500 transform translate-y-0 animate-slide-up" 
                              alt="Character" 
                           />
                       ) : (
                           !isPlayer && npc && <div className="h-[80%] w-[300px] bg-black/20 backdrop-blur-sm rounded-t-full border-t border-x border-white/5 animate-pulse" />
                       )}
                       {visualState.isGeneratingSprite && (
                           <div className="absolute bottom-1/2 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-[10px] text-pink-400 flex items-center gap-2 border border-pink-500/30 z-50">
                               <Loader2 size={10} className="animate-spin" /> 生成立繪中...
                           </div>
                       )}
                  </div>

                  {/* Dialogue Interface Layer */}
                  <div className="absolute inset-x-0 bottom-0 z-20 p-6 flex flex-col gap-4 bg-gradient-to-t from-black via-black/90 to-transparent pt-32">
                      
                      {/* Name & Status Tag */}
                      {!isPlayer && npc && (
                          <div className="flex items-center gap-3 self-start animate-fade-in">
                              <div className="bg-black/60 backdrop-blur-md border border-white/10 px-6 py-2 rounded-t-2xl rounded-br-2xl text-xl font-black text-white shadow-lg flex items-center gap-3">
                                  {npc.name}
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getRelationshipStage(npc.affection).color.replace('text-', 'border-').replace('500', '500/30')} bg-black/30`}>
                                      {getRelationshipStage(npc.affection).label}
                                  </span>
                              </div>
                          </div>
                      )}

                      {/* Dialogue Box */}
                      <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-[2rem] p-6 shadow-2xl relative min-h-[160px] flex flex-col gap-2 animate-slide-up">
                          <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[200px] pr-2 space-y-3">
                              {chatHistory.length > 0 ? (
                                  chatHistory.slice(-3).map((line, i) => {
                                       const isMe = line.startsWith('Me');
                                       const content = line.replace(/^(Me(?: \[.*?\])?|[\w\u4e00-\u9fa5]+|Subconscious): /, '');
                                       return (
                                           <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                               <p className={`font-serif text-lg leading-relaxed max-w-[90%] ${isMe ? 'text-slate-400 italic text-sm text-right bg-white/5 px-3 py-1 rounded-lg' : 'text-white'}`}>
                                                   {content}
                                               </p>
                                           </div>
                                       )
                                  })
                              ) : (
                                  <div className="flex flex-col items-center justify-center h-full opacity-30">
                                      <BrainCircuit size={32} className="animate-pulse mb-2" />
                                      <p className="text-slate-500 italic text-sm text-center">神經連結已建立...</p>
                                  </div>
                              )}
                              {isTyping && <div className="text-cyan-400 text-xs animate-pulse font-mono mt-2 flex items-center gap-2"><Loader2 size={10} className="animate-spin"/> 對方正在輸入...</div>}
                          </div>

                          {/* Input Area */}
                          <div className="mt-2 flex gap-3 items-center border-t border-white/5 pt-4">
                               <div className="flex-1 relative group">
                                  <Input 
                                      value={chatInput} 
                                      onChange={e => setChatInput(e.target.value)} 
                                      onKeyDown={e => e.key === 'Enter' && handleSendDialogue()} 
                                      placeholder="回應..." 
                                      className="bg-slate-900/50 border-white/10 rounded-full pl-6 pr-12 h-12 text-slate-200 focus:ring-1 focus:ring-cyan-500/50 transition-all font-serif w-full"
                                      disabled={isTyping}
                                  />
                                  <button 
                                      onClick={() => handleSendDialogue()} 
                                      disabled={isTyping || !chatInput.trim()}
                                      className="absolute right-1 top-1 bottom-1 w-10 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-400 hover:text-white rounded-full flex items-center justify-center transition-all disabled:opacity-0"
                                  >
                                      <Send size={16} />
                                  </button>
                               </div>

                               {/* Action Buttons */}
                               <div className="flex gap-2">
                                  <Button size="icon" variant="ghost" className="rounded-full hover:bg-white/10 text-pink-400 w-10 h-10" title="調情" onClick={() => handleSendDialogue('Flirt', '（調情）')}>
                                      <Heart size={18} />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="rounded-full hover:bg-white/10 text-amber-400 w-10 h-10" title="委託" onClick={() => handleSendDialogue('Ask for Quest', '（請求委託）')}>
                                      <Book size={18} />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="rounded-full hover:bg-white/10 text-red-400 w-10 h-10" title="威脅" onClick={() => handleSendDialogue('Threaten', '（威脅）')}>
                                      <Sword size={18} />
                                  </Button>
                               </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'logs' && (
              <div className="h-full flex flex-col gap-6 max-w-4xl mx-auto animate-fade-in"><div className="space-y-4">{character.interactionLog && character.interactionLog.length > 0 ? (character.interactionLog.map(log => (<div className="bg-black/20 p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors flex items-center gap-6 group" key={log.id}><div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/5 flex flex-col items-center justify-center shrink-0"><Clock className="text-slate-600 mb-1" size={16} /><span className="text-[8px] font-black text-slate-500 uppercase">Sync</span></div><div className="flex-1 min-w-0"><div className="flex justify-between items-center mb-1"><span className="text-[10px] font-mono text-slate-500 uppercase">{new Date(log.timestamp).toLocaleString()}</span><span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${log.affectionChange >= 0 ? 'bg-green-950/40 text-green-400 border border-green-500/20' : 'bg-red-950/40 text-red-400 border border-red-500/20'}`}>{log.affectionChange > 0 ? '+' : ''}{log.affectionChange}% AFF</span></div><p className="text-sm text-slate-300 font-serif italic border-l-2 border-amber-500/20 pl-4 py-1 group-hover:border-amber-500/50 transition-colors">{log.summary}</p></div></div>))) : (<div className="py-32 flex flex-col items-center justify-center opacity-10 text-slate-500 text-center border-2 border-dashed border-white/5 rounded-[3rem]"><History size={80} strokeWidth={1} /><p className="mt-8 font-black uppercase tracking-[0.5em] text-lg">無觀測紀錄</p></div>)}</div></div>
          )}
      </div>

      {selectedSkillDetail && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedSkillDetail(null)}><div className="bg-slate-900 border-2 border-amber-500/40 w-full max-xl rounded-[3rem] p-10 shadow-[0_0_80px_rgba(245,158,11,0.2)] flex flex-col gap-6 relative overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}><div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none rotate-12"><Zap className="text-amber-500" size={200}/></div><div className="flex justify-between items-start relative z-10"><div className="flex gap-5 items-center"><div className={`w-20 h-20 rounded-2xl bg-black/60 border-2 overflow-hidden shadow-2xl ${selectedSkillDetail.skillType === 'passive' ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'border-amber-500/30'}`}><img src={selectedSkillDetail.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedSkillDetail.name)}&background=${selectedSkillDetail.skillType === 'passive' ? '4c1d95' : '451a03'}&color=fff`} className="w-full h-full object-cover" /></div><div><h3 className={`text-3xl font-black uppercase tracking-tight ${selectedSkillDetail.skillType === 'passive' ? 'text-purple-300' : 'text-amber-200'}`}>{selectedSkillDetail.name}</h3><div className="flex gap-2 mt-2"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${selectedSkillDetail.skillType === 'passive' ? 'bg-purple-950 text-purple-400 border-purple-500/20' : 'bg-amber-950 text-amber-400 border border-amber-500/20'}`}>LV.{selectedSkillDetail.level || 1} • {selectedSkillDetail.skillType}</span>{selectedSkillDetail.manaCost !== undefined && selectedSkillDetail.skillType !== 'passive' && (<span className="px-3 py-1 rounded-full bg-blue-950 text-blue-400 text-[10px] font-black uppercase border border-blue-500/20 flex items-center gap-1"><Droplet size={10}/> {selectedSkillDetail.manaCost} MP</span>)}{selectedSkillDetail.staminaCost !== undefined && selectedSkillDetail.skillType !== 'passive' && (<span className="px-3 py-1 rounded-full bg-orange-950 text-orange-400 text-[10px] font-black uppercase border border-orange-500/20 flex items-center gap-1"><Activity size={10}/> {selectedSkillDetail.staminaCost} SP</span>)}{selectedSkillDetail.cooldown !== undefined && selectedSkillDetail.cooldown > 0 && <span className="px-3 py-1 rounded-full bg-cyan-950/30 text-cyan-400 text-[10px] font-black uppercase border border-cyan-500/20 flex items-center gap-1"><Timer size={10}/> {selectedSkillDetail.cooldown}T</span>}</div></div></div><button onClick={() => setSelectedSkillDetail(null)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={24}/></button></div><div className="space-y-6 relative z-10">{selectedSkillDetail.affixes && selectedSkillDetail.affixes.length > 0 && (<div className="grid grid-cols-1 gap-2"><h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest flex items-center gap-2"><Sparkles size={12}/> 技能詞綴矩陣</h4>{selectedSkillDetail.affixes.map((affix, i) => (<div key={i} className={`p-3 rounded-2xl border flex flex-col gap-1 ${getAffixColor(affix.rarity)}`}><div className="flex justify-between items-center"><span className="font-black uppercase tracking-tighter text-xs">{affix.name}</span><span className="text-[8px] opacity-60 px-1.5 rounded-full border border-current">{affix.rarity}</span></div><p className="text-[10px] font-serif italic">{affix.effect}</p></div>))}</div>)}<div className="bg-black/30 p-6 rounded-2xl border border-white/5 shadow-inner"><h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Book size={12}/> 技術規格</h4><p className="text-slate-300 font-serif italic leading-loose">{selectedSkillDetail.description}</p></div>{selectedSkillDetail.tacticalAnalysis ? (<div className="space-y-4"><div className="bg-amber-900/10 p-6 rounded-2xl border border-amber-500/20 shadow-xl relative overflow-hidden"><div className="absolute top-0 right-0 p-3 opacity-10"><BrainCircuit size={40}/></div><h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2"><ShieldCheck size={12}/> 史詩級戰術詳解</h4><p className="text-amber-100 font-serif leading-loose font-bold italic">{selectedSkillDetail.tacticalAnalysis}</p></div>{selectedSkillDetail.visualEffect && (<div className="bg-cyan-900/10 p-6 rounded-2xl border border-cyan-500/20 shadow-xl relative overflow-hidden"><div className="absolute top-0 right-0 p-3 opacity-10"><Zap size={40}/></div><h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Zap size={12}/> 以太視覺效果</h4><p className="text-cyan-100 font-serif leading-loose font-bold italic">{selectedSkillDetail.visualEffect}</p></div>)}{selectedSkillDetail.loreSignificance && (<div className="bg-purple-900/10 p-6 rounded-2xl border border-purple-500/20 shadow-xl relative overflow-hidden"><div className="absolute top-0 right-0 p-3 opacity-10"><Book size={40}/></div><h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Book size={12}/> 世界觀意義</h4><p className="text-purple-100 font-serif leading-loose font-bold italic">{selectedSkillDetail.loreSignificance}</p></div>)}</div>) : (<div className="p-10 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-4 opacity-40"><BrainCircuit className="text-slate-600" size={48}/><p className="text-xs font-black uppercase tracking-widest text-center">戰術數據尚未解鎖</p><Button onClick={() => handleAnalyzeSkill(selectedSkillDetail)} disabled={!!analyzingSkillId} className="bg-amber-900/30 border-amber-500/30 text-amber-400 text-[10px] py-2 px-6 rounded-full">{analyzingSkillId ? <Loader2 className="animate-spin inline mr-1" size={12}/> : <Sparkles className="inline mr-1" size={12}/>}執行以太分析程序</Button></div>)}</div><div className="text-center opacity-20 relative z-10 border-t border-white/5 pt-4"><span className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-500">Ether Link Skill Database v4.0 (Passive Enhanced)</span></div></div></div>
      )}

      {showGiftMenu && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in"><div className="bg-slate-900 border border-pink-500/30 w-full max-md rounded-[3rem] p-8 shadow-2xl flex flex-col gap-6"><div className="flex justify-between items-center"><h3 className="text-xl font-black text-pink-400 uppercase tracking-widest flex items-center gap-2"><Gift size={20}/> 選擇贈送的禮物</h3><button onClick={() => setShowGiftMenu(false)} className="text-slate-500 hover:text-white"><X size={20}/></button></div><div className="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar grid grid-cols-2 gap-3 pr-2">{items.length === 0 ? (<div className="col-span-2 py-10 text-center text-slate-600 italic">背包空空如也...</div>) : items.map(item => (<div className="bg-black/30 p-3 rounded-2xl border border-white/5 hover:border-pink-500/30 transition-all cursor-pointer flex flex-col items-center text-center group" key={item.id} onClick={() => handleGift(item)}><div className="w-12 h-12 bg-slate-800 rounded-xl mb-2 overflow-hidden border border-white/5 group-hover:scale-110 transition-transform">{item.iconUrl ? <img src={item.iconUrl} className="w-full h-full object-cover" /> : <Sparkles className="text-slate-600 m-auto mt-4" size={16}/>}</div><span className="text-[10px] font-black text-slate-300 truncate w-full">{item.name}</span><span className="text-[8px] text-slate-600 font-mono">x{item.quantity}</span></div>))}</div><Button onClick={() => setShowGiftMenu(false)} variant="ghost" className="w-full text-slate-500 py-3">取消送禮</Button></div></div>
      )}
    </div>
  );
};
