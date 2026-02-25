
import React, { useState, useEffect, useMemo } from 'react';
import { Item, Recipe, EquipmentSlots, Stats, Affix } from '../types';
import { Card, Button, Input } from './Layout';
import { 
  Hammer, Info, Book, Shield, Sword, User, Gem, ArrowUpCircle, 
  Sparkles, Terminal, Filter, Layers, Hand, FlaskConical, 
  Search, PlayCircle, Footprints, ScanFace, Coins, Wrench, 
  Zap, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, 
  Backpack, Shirt, AlertTriangle, LogOut, Utensils, Shuffle, 
  Flame, Droplets, Snowflake, Skull, CheckCircle2, Link as LinkIcon, 
  Crown, Activity, X, Upload, Trash2, ShoppingBag, Recycle, Star, 
  BrainCircuit, Target, Heart, MousePointer2, PlusCircle, Wand2,
  HandHelping, ArrowBigUpDash, PackageOpen, Coffee, Droplet, Apple,
  Crosshair, SlidersHorizontal, Battery, Tag, HelpCircle,
  Wand, Scale, Lock
} from 'lucide-react';
import * as GeminiService from '../services/geminiService';

interface InventoryProps {
  items: Item[];
  equipment: EquipmentSlots;
  recipes?: Recipe[];
  gold: number; 
  skillPoints?: number;
  onCraft: (newItems: Item[], removedIds: string[]) => void;
  onEquip: (itemId: string, slot: keyof EquipmentSlots) => void;
  onUnequip: (slot: keyof EquipmentSlots) => void;
  onUpgrade: (newItem: Item, consumedIds: string[]) => void;
  onCheatItem: (name: string) => void;
  onConsume: (item: Item) => void;
  onMarkAsSeen?: (itemId: string) => void;
  onSell?: (items: Item[]) => void;
  onRepair?: (item: Item) => void;
  onReforge?: (item: Item) => void;
  onAssignQuickSlot?: (item: Item, index?: number) => void;
  onRegenerateIcons?: () => void;
}

export const Inventory: React.FC<InventoryProps> = ({ 
    items, 
    equipment, 
    recipes = [], 
    gold, 
    skillPoints = 0,
    onCraft, 
    onEquip, 
    onUnequip, 
    onUpgrade, 
    onCheatItem, 
    onConsume, 
    onMarkAsSeen, 
    onSell, 
    onRepair, 
    onReforge,
    onAssignQuickSlot,
    onRegenerateIcons
}) => {
  const [activeTab, setActiveTab] = useState<'bag' | 'craft' | 'cooking' | 'upgrade' | 'repair' | 'disposal' | 'reforge'>('bag');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewItem, setViewItem] = useState<Item | null>(null);
  const [confirmUpgrade, setConfirmUpgrade] = useState<{base: Item, material: Item, result: Item} | null>(null);
  const [sortType, setSortType] = useState<'all' | 'consumable' | 'equipment' | 'material' | 'misc' | 'food'>('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | 'common' | 'rare' | 'epic' | 'legendary'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [slotFilter, setSlotFilter] = useState<string | null>(null);
  const [effectFilter, setEffectFilter] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<{item: Item, x: number, y: number} | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false); 
  const [isEquipPanelCollapsed, setIsEquipPanelCollapsed] = useState(false); 
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [batchSummary, setBatchSummary] = useState<{
      type: 'sell' | 'discard' | 'craft';
      itemsCount: number;
      goldGain?: number;
      removedNames: string[];
  } | null>(null);

  const bagItems = useMemo(() => {
    return items.filter(i => !Object.values(equipment).includes(i.id));
  }, [items, equipment]);

  const filteredBagItems = useMemo(() => {
    return bagItems.filter(i => {
       const typeMatch = sortType === 'all' || i.type === sortType;
       const rarityMatch = rarityFilter === 'all' || i.rarity === rarityFilter;
       const nameMatch = i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (i.affixes && i.affixes.some(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())));
       const slotMatch = !slotFilter || i.slot === slotFilter;
       
       let effectMatch = true;
       if (effectFilter) {
           const pe = (i.potionEffect || "").toLowerCase();
           const itemName = i.name.toLowerCase();
           if (effectFilter === 'heal') effectMatch = pe.includes('heal') || pe.includes('hp') || pe.includes('life') || pe.includes('生命') || pe.includes('治癒') || itemName.includes('藥水') || itemName.includes('繃帶');
           else if (effectFilter === 'mana') effectMatch = pe.includes('mana') || pe.includes('mp') || pe.includes('ether') || pe.includes('以太') || pe.includes('魔力');
           else if (effectFilter === 'nutrition') effectMatch = (i.nutrition || 0) > 0 || pe.includes('hunger') || pe.includes('food') || pe.includes('飢餓') || pe.includes('飽食') || i.type === 'food';
           else if (effectFilter === 'hydration') effectMatch = (i.hydration || 0) > 0 || pe.includes('thirst') || pe.includes('water') || pe.includes('口渴') || pe.includes('飲水');
           else if (effectFilter === 'energy') effectMatch = (i.staminaRestore || 0) > 0 || pe.includes('energy') || pe.includes('stamina') || pe.includes('體力') || pe.includes('精力');
           else if (effectFilter === 'affix') effectMatch = i.affixes !== undefined && i.affixes.length > 0;
       }
       return typeMatch && rarityMatch && nameMatch && slotMatch && effectMatch;
    });
  }, [bagItems, sortType, rarityFilter, searchQuery, slotFilter, effectFilter]);

  const damagedItems = useMemo(() => {
    return items.filter(i => i.durability !== undefined && i.maxDurability !== undefined && i.durability < i.maxDurability).sort((a, b) => (a.durability! / a.maxDurability!) - (b.durability! / b.maxDurability!));
  }, [items]);

  const handleManualCreate = () => {
    if (!newItemName.trim()) return;
    onCheatItem(newItemName.trim());
    setNewItemName('');
    setIsCreateModalOpen(false);
  };

  const getSlotDisplayName = (slot?: string) => {
      const slots: Record<string, string> = { head: '頭部', neck: '頸部', body: '軀幹', right_hand: '右手', left_hand: '左手', feet: '足部', accessory: '飾品', back: '背部', waist: '腰部' };
      return slot ? (slots[slot] || slot) : '通用';
  };

  const getTypeLabel = (type: string) => {
      switch(type) {
          case 'equipment': return { label: '裝備', icon: <Shirt size={10}/>, color: 'text-cyan-400 bg-cyan-900/30 border-cyan-500/30' };
          case 'consumable': return { label: '消耗', icon: <FlaskConical size={10}/>, color: 'text-emerald-400 bg-emerald-900/30 border-emerald-500/30' };
          case 'material': return { label: '材料', icon: <Layers size={10}/>, color: 'text-amber-400 bg-emerald-900/30 border-emerald-500/30' };
          case 'food': return { label: '食物', icon: <Utensils size={10}/>, color: 'text-orange-400 bg-orange-900/30 border-orange-500/30' };
          case 'misc': return { label: '雜項', icon: <Tag size={10}/>, color: 'text-slate-400 bg-slate-900/30 border-slate-500/30' };
          default: return { label: '未知', icon: <HelpCircle size={10}/>, color: 'text-slate-500 bg-slate-900/30 border-slate-700' };
      }
  };

  useEffect(() => {
    const newItems = items.filter(i => i.isNew);
    if (newItems.length > 0 && onMarkAsSeen) {
       const timer = setTimeout(() => { newItems.forEach(i => onMarkAsSeen(i.id)); }, 5000);
       return () => clearTimeout(timer);
    }
  }, [items, onMarkAsSeen]);

  const toggleSelect = (item: Item, max: number = 99) => {
    setSelectedItems(prev => {
        const countSelected = prev.filter(id => id === item.id).length;
        if (max <= 2) {
             if (prev.includes(item.id)) return prev.filter(id => id !== item.id);
             if (prev.length >= max) return prev;
             return [...prev, item.id];
        }
        if (countSelected < item.quantity) return [...prev, item.id];
        else return prev.filter(id => id !== item.id);
    });
  };

  const handleCraft = async () => {
    if (selectedItems.length < 2) return;
    if (skillPoints < 5) { alert("物質合成需要至少 5 SP 以穩定以太場。"); return; }
    setIsProcessing(true);
    const ingredients = items.filter(i => selectedItems.includes(i.id));
    try {
        const result = await GeminiService.craftItem(ingredients);
        const newItem: Item = {
            id: crypto.randomUUID(),
            name: result.name || "未知合成物",
            description: result.description || "...",
            type: (result.type as any) || 'misc',
            slot: result.slot,
            stats: result.stats,
            affixes: result.affixes,
            rarity: (result.rarity as any) || 'common',
            quantity: 1,
            isNew: true,
            level: result.level || 1,
            potionEffect: result.potionEffect || undefined,
            durability: result.durability,
            maxDurability: result.maxDurability,
            nutrition: result.nutrition,
            iconUrl: await GeminiService.generateImage(result.name, 'icon')
        };
        onCraft([newItem], selectedItems);
        setBatchSummary({ type: 'craft', itemsCount: selectedItems.length, removedNames: ingredients.map(i => i.name) });
        setSelectedItems([]);
    } catch(e) { console.error(e); }
    setIsProcessing(false);
  };

  const handlePreviewUpgrade = async () => {
     if (selectedItems.length !== 2) return;
     const baseItem = items.find(i => i.id === selectedItems[0]);
     const material = items.find(i => i.id === selectedItems[1]);
     if (baseItem && material) {
         setIsProcessing(true);
         try {
             const resultData = await GeminiService.upgradeItem(baseItem, material);
             const resultItem: Item = {
                 ...baseItem,
                 name: resultData.name,
                 description: resultData.description,
                 stats: resultData.stats || baseItem.stats,
                 affixes: resultData.affixes || baseItem.affixes,
                 level: (resultData.level || (baseItem.level || 1) + 1),
                 rarity: (resultData.rarity as any) || baseItem.rarity,
                 isNew: true,
                 iconUrl: baseItem.iconUrl,
                 durability: resultData.durability || baseItem.durability,
                 maxDurability: resultData.maxDurability || baseItem.maxDurability
             };
             setConfirmUpgrade({ base: baseItem, material, result: resultItem });
         } catch(e) { console.error(e); alert("預覽生成失敗"); }
         setIsProcessing(false);
     }
  };

  const executeUpgrade = async () => {
     if (!confirmUpgrade) return;
     onUpgrade(confirmUpgrade.result, [confirmUpgrade.material.id]);
     setSelectedItems([]);
     setConfirmUpgrade(null);
  };

  const handleBatchSell = () => {
      if (!onSell || selectedItems.length === 0) return;
      const itemsToSell = items.filter(i => selectedItems.includes(i.id));
      const totalGold = itemsToSell.reduce((sum, item) => {
          const count = selectedItems.filter(id => id === item.id).length;
          const price = item.price || (item.rarity === 'legendary' ? 1000 : item.rarity === 'epic' ? 200 : item.rarity === 'rare' ? 50 : 10);
          return sum + (price * count);
      }, 0);
      if (confirm(`確定要批量出售選中的 ${selectedItems.length} 件物品嗎？總收益預計: ${totalGold} G`)) {
          onSell(itemsToSell);
          setBatchSummary({ type: 'sell', itemsCount: selectedItems.length, goldGain: totalGold, removedNames: Array.from(new Set(itemsToSell.map(i => i.name))) });
          setSelectedItems([]);
      }
  };

  const handleBatchDiscard = () => {
      if (selectedItems.length === 0) return;
      const itemsToDiscard = items.filter(i => selectedItems.includes(i.id));
      if (confirm(`【警告】確定要徹底丟棄選中的 ${selectedItems.length} 件物品嗎？此操作不可逆且無任何收益。`)) {
          if (onSell) onSell(itemsToDiscard); 
          setBatchSummary({ type: 'discard', itemsCount: selectedItems.length, removedNames: Array.from(new Set(itemsToDiscard.map(i => i.name))) });
          setSelectedItems([]);
      }
  };

  const applyRecipe = (recipe: Recipe) => {
      const foundIds: string[] = [];
      let allFound = true;
      recipe.ingredients.forEach(ingName => {
          const match = items.find(i => i.name.includes(ingName) && !foundIds.includes(i.id) && !Object.values(equipment).includes(i.id));
          if(match) foundIds.push(match.id);
          else allFound = false;
      });
      if(allFound) setSelectedItems(foundIds);
      else alert("背包中缺少此配方所需的材料!");
  };

  const getRarityClass = (rarity?: string) => {
      switch(rarity) {
          case 'legendary': return 'rarity-legendary';
          case 'epic': return 'rarity-epic';
          case 'rare': return 'rarity-rare';
          default: return 'rarity-common';
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

  const getAffixColor = (rarity?: string) => {
      switch(rarity) {
          case 'legendary': return 'bg-yellow-900/30 border-yellow-500/50 text-yellow-300';
          case 'epic': return 'bg-purple-900/30 border-purple-500/50 text-purple-300';
          case 'rare': return 'bg-blue-900/30 border-blue-500/50 text-blue-300';
          default: return 'bg-slate-800 border-white/10 text-slate-400';
      }
  };

  const getRarityColor = (rarity?: string) => {
      switch(rarity) {
          case 'legendary': return '#facc15';
          case 'epic': return '#c084fc';
          case 'rare': return '#60a5fa';
          default: return '#94a3b8';
      }
  };

  const handleQuickEquipFilter = (slot: string) => {
      setActiveTab('bag'); setSortType('equipment'); setSlotFilter(slot); setEffectFilter(null); setSearchQuery('');
  };

  const currentBatchTotalValue = useMemo(() => {
    return items.filter(i => selectedItems.includes(i.id)).reduce((sum, item) => {
        const count = selectedItems.filter(id => id === item.id).length;
        const price = item.price || (item.rarity === 'legendary' ? 1000 : item.rarity === 'epic' ? 200 : item.rarity === 'rare' ? 50 : 10);
        return sum + (price * count);
    }, 0);
  }, [selectedItems, items]);

  const renderEquipSlot = (slot: keyof EquipmentSlots, icon: React.ReactNode, label: string) => {
      const equippedId = equipment[slot];
      const item = items.find(i => i.id === equippedId);
      const isDamaged = item && item.durability !== undefined && item.maxDurability && item.durability < item.maxDurability;
      const isBroken = item && item.durability !== undefined && item.maxDurability && item.durability === 0;
      const isLowDurability = item && item.durability !== undefined && item.maxDurability && item.durability < item.maxDurability * 0.2;
      const isSelectedSlot = slotFilter === slot;
      return (
          <div className="flex flex-col items-center gap-1.5 group/slot relative">
              <div 
                className={`w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center relative bg-slate-900 border-2 transition-all duration-300 cursor-pointer hover:bg-slate-800 hover:scale-105 active:scale-95 ${item ? getRarityClass(item.rarity) : 'border-slate-800 border-dashed hover:border-slate-600'} ${isSelectedSlot ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-slate-950 scale-105 border-cyan-400' : ''}`}
                onClick={() => { if (activeTab !== 'bag') return; if (item) setViewItem(item); else handleQuickEquipFilter(slot); }}
                onMouseEnter={(e) => item && setHoveredItem({item, x: e.clientX, y: e.clientY})}
                onMouseLeave={() => setHoveredItem(null)}
              >
                  {item ? <div className="w-full h-full p-0.5"><img src={item.iconUrl} className={`w-full h-full object-cover rounded-lg ${isBroken ? 'grayscale opacity-50' : ''}`} /></div> : <div className={`transition-colors ${isSelectedSlot ? 'text-cyan-400 animate-pulse' : 'text-slate-700 group-hover/slot:text-slate-500'}`}>{icon}</div>}
                  {item && activeTab === 'bag' && <button className="absolute -top-1.5 -right-1.5 bg-red-600 rounded-full w-5 h-5 flex items-center justify-center text-white text-[10px] hover:bg-red-500 shadow-lg opacity-0 group-hover/slot:opacity-100 transition-opacity z-10 border border-red-400/50" onClick={(e) => { e.stopPropagation(); onUnequip(slot); }} title="卸下"><LogOut size={10}/></button>}
                  {!item && !isSelectedSlot && activeTab === 'bag' && <button className="absolute -bottom-1 -right-1 bg-cyan-600 rounded-full w-5 h-5 flex items-center justify-center text-white text-[10px] hover:bg-cyan-500 shadow-lg border border-cyan-400/50" onClick={(e) => { e.stopPropagation(); handleQuickEquipFilter(slot); }} title="從背包中加載物品"><Upload size={10}/></button>}
                  {item && isDamaged && onRepair && <button className="absolute -top-1.5 -left-1.5 bg-yellow-600 rounded-full w-5 h-5 flex items-center justify-center text-white text-[10px] hover:bg-yellow-500 shadow-lg opacity-0 group-hover/slot:opacity-100 transition-opacity z-10 border border-yellow-400/50" onClick={(e) => { e.stopPropagation(); onRepair(item); }} title="修理 - 50G"><Wrench size={10}/></button>}
                  {item && item.maxDurability && item.durability !== undefined && <div className="absolute bottom-0 left-0 w-full h-1 bg-black/40 rounded-b-lg overflow-hidden"><div className={`h-full transition-all duration-300 ${isLowDurability ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'bg-green-500'}`} style={{ width: `${(item.durability / item.maxDurability) * 100}%` }}></div></div>}
              </div>
              <span className={`text-[10px] uppercase font-black tracking-widest ${isSelectedSlot ? 'text-cyan-400' : 'text-slate-500'}`}>{label}</span>
          </div>
      );
  };

  const renderItemGrid = (itemList: Item[], selectMode = false, maxSelect = 99) => (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 overflow-y-auto content-start custom-scrollbar p-1 pb-20 relative">
          {itemList.length === 0 && <div className="col-span-full text-center text-slate-500 mt-10 italic">沒有符合的物品</div>}
          {itemList.map(item => {
              const selectionCount = selectedItems.filter(id => id === item.id).length;
              const isSelected = selectionCount > 0;
              const isStacked = item.quantity > 1;
              const isBroken = item.maxDurability && item.durability !== undefined && item.durability === 0;
              const hasAffixes = item.affixes && item.affixes.length > 0;
              const isConsumable = item.type === 'consumable' || item.type === 'food';
              const isEquippable = item.type === 'equipment' && item.slot;
              const isSlotMatching = slotFilter && item.slot === slotFilter;
              const typeLabel = getTypeLabel(item.type);
              return (
              <div key={item.id} className={`relative aspect-square bg-slate-800 rounded-xl border-2 cursor-pointer group transition-all duration-300 hover:scale-105 ${isSelected && selectMode ? 'ring-2 ring-cyan-500/50 scale-95' : ''} ${getRarityClass(item.rarity)} ${item.isNew ? 'animate-pulse ring-4 ring-yellow-400/50' : ''} ${isBroken ? 'opacity-60 grayscale' : ''} ${(slotFilter || effectFilter) && !isSlotMatching && !effectFilter ? 'opacity-30' : ''} ${isSlotMatching ? 'ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)]' : ''}`}
                   onClick={() => { if (selectMode) toggleSelect(item, maxSelect); else if (slotFilter && isSlotMatching) { onEquip(item.id, slotFilter as keyof EquipmentSlots); setSlotFilter(null); } else { if (activeTab === 'bag') { setViewItem(item); if(item.isNew && onMarkAsSeen) onMarkAsSeen(item.id); } } }}
                   onMouseEnter={(e) => item && setHoveredItem({item, x: e.clientX, y: e.clientY})}
                   onMouseLeave={() => setHoveredItem(null)}
              >
                  {isStacked && <div className={`absolute -top-1 -right-1 w-full h-full rounded-xl border bg-slate-800 z-0 ${getRarityClass(item.rarity)} opacity-50`}></div>}
                  <div className="relative w-full h-full z-10 bg-slate-900 rounded-lg overflow-hidden group">
                      {item.iconUrl && <img src={item.iconUrl} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />}
                      <div className={`absolute top-1 left-1 z-30 flex items-center gap-1 px-1.5 py-0.5 rounded border text-[7px] font-black uppercase tracking-tighter shadow-md ${typeLabel.color}`}>{typeLabel.icon} {typeLabel.label}</div>
                      {!selectMode && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-40 backdrop-blur-[1px]">
                             {isConsumable && <button onClick={(e) => { e.stopPropagation(); onConsume(item); }} className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-500 hover:scale-110 transition-all shadow-lg border border-emerald-400/50" title="快速使用"><PackageOpen size={16}/></button>}
                             {isEquippable && <button onClick={(e) => { e.stopPropagation(); onEquip(item.id, item.slot!); setSlotFilter(null); }} className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center hover:bg-cyan-500 hover:scale-110 transition-all shadow-lg border border-cyan-400/50" title="快速裝備"><ArrowBigUpDash size={16}/></button>}
                             <button onClick={(e) => { e.stopPropagation(); setViewItem(item); }} className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600 hover:scale-110 transition-all shadow-lg border border-slate-500/50" title="查看詳情"><Info size={16}/></button>
                        </div>
                      )}
                      {item.isNew && <div className="absolute top-1 right-8 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg animate-bounce z-30">NEW</div>}
                      {isStacked && <div className="absolute top-1 right-1 bg-cyan-900/90 backdrop-blur-sm text-cyan-100 text-[10px] px-2 py-0.5 rounded-full border border-cyan-500/50 font-mono shadow-md z-30 font-black min-w-[22px] text-center">{item.quantity}</div>}
                      {(item.level !== undefined) && <div className="absolute bottom-1 left-1 bg-black/70 backdrop-blur-sm text-yellow-300 text-[8px] px-1.5 rounded-full border border-yellow-900/50 font-mono z-20 font-bold">LV.{item.level}</div>}
                      {hasAffixes && <div className="absolute top-5 left-1 flex gap-0.5 z-20">{item.affixes!.slice(0, 3).map((_, i) => (<div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)] animate-pulse"></div>))}</div>}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-1.5 pt-4 text-center z-20 pointer-events-none group-hover:opacity-0 transition-opacity"><div className="truncate text-[10px] text-white font-bold drop-shadow-md">{item.name}</div></div>
                  </div>
              </div>
          )})}
      </div>
  );

  const getStatIcon = (stat: string) => {
    switch (stat) {
        case 'strength': return <Sword size={12} className="text-red-400" />;
        case 'intelligence': return <BrainCircuit size={12} className="text-blue-400" />;
        case 'agility': return <Zap size={12} className="text-yellow-400" />;
        case 'charisma': return <Sparkles size={12} className="text-pink-400" />;
        case 'luck': return <Target size={12} className="text-emerald-400" />;
        case 'endurance': return <Activity size={12} className="text-orange-400" />;
        default: return <PlusCircle size={12} className="text-slate-400" />;
    }
  };

  const slotFilterOptions = [
    { id: 'head', label: '頭部', icon: <Crown size={14}/> },
    { id: 'neck', label: '頸部', icon: <LinkIcon size={14}/> },
    { id: 'body', label: '軀幹', icon: <Shirt size={14}/> },
    { id: 'right_hand', label: '右手', icon: <Sword size={14}/> },
    { id: 'left_hand', label: '左手', icon: <Shield size={14}/> },
    { id: 'feet', label: '足部', icon: <Footprints size={14}/> },
    { id: 'accessory', label: '飾品', icon: <Gem size={14}/> },
    { id: 'back', label: '背部', icon: <Backpack size={14}/> },
    { id: 'waist', label: '腰部', icon: <Layers size={14}/> },
  ];

  const effectFilterOptions = [
    { id: 'heal', label: '治癒', icon: <Heart size={14} className="text-pink-500"/> },
    { id: 'mana', label: '以太', icon: <Zap size={14} className="text-cyan-400"/> },
    { id: 'nutrition', label: '飽食', icon: <Apple size={14} className="text-green-500"/> },
    { id: 'hydration', label: '水分', icon: <Droplet size={14} className="text-blue-400"/> },
    { id: 'energy', label: '體力', icon: <Battery size={14} className="text-yellow-500"/> },
    { id: 'affix', label: '詞綴', icon: <Sparkles size={14} className="text-purple-500"/> },
  ];

  return (
    <div className={`h-full flex flex-col gap-4 animate-slide-up relative ${isCollapsed ? 'max-h-[60px] overflow-hidden' : ''}`}>
      <div className="absolute top-2 right-2 z-50 flex gap-2"><Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)}>{isCollapsed ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}</Button></div>
      <div className={`h-full flex flex-row gap-4 transition-all duration-300 relative ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        
        {/* Tooltip - 增強附帶技能與效果顯示 */}
        {hoveredItem && !viewItem && activeTab === 'bag' && (
            <div className="fixed z-[100] pointer-events-none bg-slate-950/98 border border-slate-700 p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl min-w-[260px] max-w-[320px] animate-fade-in ring-1 ring-white/10" style={{ top: Math.min(window.innerHeight - 380, hoveredItem.y + 10), left: Math.min(window.innerWidth - 340, hoveredItem.x + 10) }}>
                <div className={`text-base font-black ${getRarityText(hoveredItem.item.rarity)} mb-1.5 flex justify-between items-center`}>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: getRarityColor(hoveredItem.item.rarity) }}></div><span className="truncate">{hoveredItem.item.name}</span></div>
                    {hoveredItem.item.level !== undefined && <span className="text-[10px] text-yellow-500 font-mono">Lv.{hoveredItem.item.level}</span>}
                </div>
                <div className="flex gap-2 mb-3"><span className={`text-[10px] px-2 py-0.5 rounded uppercase font-black tracking-widest border ${getTypeLabel(hoveredItem.item.type).color}`}>{getTypeLabel(hoveredItem.item.type).label}</span><span className={`text-[10px] px-2 py-0.5 rounded uppercase font-black tracking-widest bg-black/30 ${getRarityText(hoveredItem.item.rarity)}`}>{hoveredItem.item.rarity || '普通'}</span></div>

                {/* 物品屬性面板 (Stats Panel) */}
                {(hoveredItem.item.stats && Object.keys(hoveredItem.item.stats).length > 0) || (hoveredItem.item.affixes && hoveredItem.item.affixes.length > 0) ? (
                    <div className="mb-3 bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                        {/* Primary Stats */}
                        {hoveredItem.item.stats && Object.keys(hoveredItem.item.stats).length > 0 && (
                            <div className="p-2 border-b border-slate-800">
                                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">基礎屬性</div>
                                <div className="grid grid-cols-2 gap-1">
                                    {Object.entries(hoveredItem.item.stats).map(([k, v]) => (
                                        <div key={k} className="flex justify-between items-center px-1.5 py-0.5 rounded bg-slate-800/50 border border-slate-700/50">
                                            <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1 uppercase">{getStatIcon(k)} {k.substring(0,3)}</span>
                                            <span className="text-[9px] font-mono font-black text-cyan-300">+{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Affix Stats Summary (Secondary) */}
                        {hoveredItem.item.affixes && hoveredItem.item.affixes.some(a => a.stats) && (
                            <div className="p-2 bg-slate-800/30">
                                <div className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">詞綴加成</div>
                                <div className="flex flex-wrap gap-1">
                                    {hoveredItem.item.affixes.filter(a => a.stats).flatMap(a => Object.entries(a.stats!)).map(([k, v], i) => (
                                        <div key={i} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-900/20 border border-indigo-500/20">
                                            <span className="text-[8px] text-indigo-300 uppercase">{k.substring(0,3)}</span>
                                            <span className="text-[8px] font-mono font-bold text-white">+{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}

                {/* 核心效果 (附帶技能) */}
                {hoveredItem.item.potionEffect && (
                    <div className="mb-3 p-2 bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
                        <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Wand size={10}/> 附帶物質效果</div>
                        <p className="text-[10px] text-emerald-200/80 font-serif italic">{hoveredItem.item.potionEffect}</p>
                    </div>
                )}

                {/* 詞綴詳情 */}
                {hoveredItem.item.affixes && hoveredItem.item.affixes.length > 0 && (
                    <div className="mb-3 space-y-1">
                        <div className="flex justify-between items-center px-1">
                            <div className="text-[8px] font-black text-yellow-500/70 uppercase tracking-widest">以太編碼 ({hoveredItem.item.affixes.length})</div>
                        </div>
                        {hoveredItem.item.affixes.map((a, i) => (
                            <div key={i} className={`flex flex-col px-2 py-1 rounded border text-[9px] ${getAffixColor(a.rarity)}`}>
                                <div className="flex items-center justify-between">
                                    <span className="font-black truncate max-w-[120px]">{a.name}</span>
                                </div>
                                <div className="text-[8px] opacity-80 italic">{a.effect}</div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-between items-end gap-2">
                    <p className="text-[10px] text-slate-400 italic leading-relaxed line-clamp-2 flex-1">{hoveredItem.item.description}</p>
                    <div className="flex flex-col items-end shrink-0">
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">潛在價值</span>
                        <span className="text-xs font-mono font-black text-yellow-500 flex items-center gap-1"><Coins size={10}/> {hoveredItem.item.price || 0}</span>
                    </div>
                </div>
                
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between opacity-50"><span className="text-[8px] font-black uppercase tracking-widest text-slate-500">點擊查看或直接執行快速動作</span><MousePointer2 size={10} className="text-slate-500" /></div>
            </div>
        )}

        <div className={`transition-all duration-300 ease-in-out relative ${isEquipPanelCollapsed ? 'w-8' : 'w-full md:w-80 shrink-0'} flex flex-col`}>
            <button onClick={() => setIsEquipPanelCollapsed(!isEquipPanelCollapsed)} className="absolute top-1/2 -right-4 -translate-y-1/2 z-20 bg-slate-800 border border-slate-600 rounded-r text-slate-400 hover:text-white p-1 shadow-md h-12 flex items-center">{isEquipPanelCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}</button>
            {!isEquipPanelCollapsed && (
                <Card className="w-full h-full flex flex-col gap-4 bg-slate-900/60 border-slate-800 shadow-2xl" title="武裝狀態">
                    <div className="flex flex-col gap-6 py-4 items-center relative">
                        <div className="grid grid-cols-3 gap-y-6 gap-x-8 justify-items-center w-full max-w-[240px]">
                            <div className="col-start-2">{renderEquipSlot('head', <Crown size={28}/>, '頭部')}</div>
                            <div className="col-start-1">{renderEquipSlot('right_hand', <Sword size={28}/>, '右手')}</div>
                            <div className="col-start-2">{renderEquipSlot('body', <Shirt size={28}/>, '軀幹')}</div>
                            <div className="col-start-3">{renderEquipSlot('left_hand', <Shield size={28}/>, '左手')}</div>
                            <div className="col-start-1">{renderEquipSlot('neck', <LinkIcon size={24}/>, '頸部')}</div>
                            <div className="col-start-2">{renderEquipSlot('accessory', <Gem size={28}/>, '飾品')}</div>
                            <div className="col-start-3">{renderEquipSlot('feet', <Footprints size={28}/>, '足部')}</div>
                            <div className="col-start-1">{renderEquipSlot('back', <Backpack size={26}/>, '背部')}</div>
                            <div className="col-start-3">{renderEquipSlot('waist', <Layers size={24}/>, '腰部')}</div>
                        </div>
                        {slotFilter && <div className="w-full text-center mt-4"><Button size="sm" variant="ghost" onClick={() => setSlotFilter(null)} className="text-cyan-400 border border-cyan-500/30 bg-cyan-950/20 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">取消選擇槽位模式</Button></div>}
                    </div>
                </Card>
            )}
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
            <div className="flex flex-col gap-2 mb-2 shrink-0">
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                    <div className="flex gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-hide shrink-0">
                      <Button variant={activeTab === 'bag' ? 'primary' : 'ghost'} onClick={() => { setActiveTab('bag'); setSlotFilter(null); setEffectFilter(null); setSelectedItems([]); }} className="text-sm py-1 whitespace-nowrap"><Backpack size={16} className="mr-1 inline"/> 全部物品</Button>
                      <Button variant={activeTab === 'disposal' ? 'primary' : 'ghost'} onClick={() => { setActiveTab('disposal'); setSelectedItems([]); }} className="text-sm py-1 whitespace-nowrap"><Recycle size={16} className="mr-1 inline"/> 批量清理</Button>
                      <Button variant={activeTab === 'craft' ? 'primary' : 'ghost'} onClick={() => { setActiveTab('craft'); setSelectedItems([]); }} className="text-sm py-1 whitespace-nowrap"><Hammer size={16} className="mr-1 inline"/> 物質合成</Button>
                      <Button variant={activeTab === 'cooking' ? 'primary' : 'ghost'} onClick={() => { setActiveTab('cooking'); setSelectedItems([]); }} className="text-sm py-1 whitespace-nowrap"><Utensils size={16} className="mr-1 inline"/> 食譜烹飪</Button>
                      <Button variant={activeTab === 'upgrade' ? 'primary' : 'ghost'} onClick={() => { setActiveTab('upgrade'); setSelectedItems([]); }} className="text-sm py-1 whitespace-nowrap"><ArrowUpCircle size={16} className="mr-1 inline"/> 裝備強化</Button>
                      <Button variant={activeTab === 'reforge' ? 'primary' : 'ghost'} onClick={() => { setActiveTab('reforge'); setSortType('equipment'); setSelectedItems([]); }} className="text-sm py-1 whitespace-nowrap"><Sparkles size={16} className="mr-1 inline"/> 詞綴洗鍊</Button>
                      <Button variant={activeTab === 'repair' ? 'primary' : 'ghost'} onClick={() => { setActiveTab('repair'); setSelectedItems([]); }} className="text-sm py-1 whitespace-nowrap"><Wrench size={16} className="mr-1 inline"/> 損毀維修</Button>
                      <Button variant="ghost" onClick={() => setIsCreateModalOpen(true)} className="text-sm py-1 whitespace-nowrap bg-emerald-900/30 text-emerald-400 hover:bg-emerald-800/40 border border-emerald-500/20"><PlusCircle size={16} className="mr-1 inline"/> 手動具現</Button>
                      {onRegenerateIcons && (
                          <Button variant="ghost" onClick={onRegenerateIcons} className="text-sm py-1 whitespace-nowrap bg-orange-900/30 text-orange-400 hover:bg-orange-800/40 border border-orange-500/20" title="重繪所有物品圖標"><Sparkles size={16} className="mr-1 inline"/> 重繪圖標</Button>
                      )}
                    </div>
                    {(activeTab === 'bag' || activeTab === 'disposal') && <div className="relative flex-1 w-full sm:w-48 sm:max-w-xs shrink-0"><Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500"/><input type="text" placeholder="搜尋物品名稱..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded text-xs py-1.5 pl-7 pr-2 text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder-slate-600"/></div>}
                </div>
                {(activeTab === 'bag' || activeTab === 'disposal') && (
                    <div className="flex flex-col gap-2 mt-1">
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                            <button onClick={() => { setSortType('all'); setSlotFilter(null); setEffectFilter(null); }} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap border ${sortType === 'all' && !slotFilter && !effectFilter ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}>全部總覽</button>
                            <button onClick={() => { setSortType('equipment'); setEffectFilter(null); }} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap border ${sortType === 'equipment' ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}><Shirt size={10} className="inline mr-1"/> 核心裝備</button>
                            <button onClick={() => { setSortType('consumable'); setSlotFilter(null); }} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap border ${sortType === 'consumable' ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}><FlaskConical size={10} className="inline mr-1"/> 消耗補給</button>
                            <button onClick={() => { setSortType('food'); setSlotFilter(null); }} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap border ${sortType === 'food' ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}><Utensils size={10} className="inline mr-1"/> 美食料理</button>
                            <button onClick={() => { setSortType('material'); setSlotFilter(null); setEffectFilter(null); }} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap border ${sortType === 'material' ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}><Layers size={10} className="inline mr-1"/> 製造材料</button>
                        </div>
                        {sortType === 'equipment' && <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1 animate-fade-in"><div className="flex items-center text-[10px] font-black text-slate-600 mr-1 uppercase tracking-tighter shrink-0"><SlidersHorizontal size={10} className="mr-1"/> 裝備部位:</div>{slotFilterOptions.map(opt => (<button key={opt.id} onClick={() => setSlotFilter(slotFilter === opt.id ? null : opt.id)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all border whitespace-nowrap ${slotFilter === opt.id ? 'bg-cyan-900/50 border-cyan-500/50 text-cyan-300' : 'bg-slate-900/40 border-white/5 text-slate-600 hover:text-slate-400 hover:border-white/10'}`}>{opt.icon} {opt.label}</button>))}</div>}
                        {(sortType === 'consumable' || sortType === 'food') && <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1 animate-fade-in"><div className="flex items-center text-[10px] font-black text-slate-600 mr-1 uppercase tracking-tighter shrink-0"><SlidersHorizontal size={10} className="mr-1"/> 效果分類:</div>{effectFilterOptions.map(opt => (<button key={opt.id} onClick={() => setEffectFilter(effectFilter === opt.id ? null : opt.id)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all border whitespace-nowrap ${effectFilter === opt.id ? 'bg-cyan-900/50 border-cyan-500/50 text-cyan-300' : 'bg-slate-900/40 border-white/5 text-slate-600 hover:text-slate-400 hover:border-white/10'}`}>{opt.icon} {opt.label}</button>))}</div>}
                    </div>
                )}
            </div>

            <div className={`flex-1 bg-slate-900/50 rounded-[2rem] border p-6 overflow-hidden flex flex-col shadow-inner relative transition-colors duration-500 ${slotFilter || effectFilter ? 'border-cyan-500/40 bg-cyan-900/10' : 'border-slate-800'}`}>
                {(slotFilter || effectFilter) && <div className="absolute top-0 left-0 right-0 bg-cyan-500/10 backdrop-blur-md px-6 py-2 flex justify-between items-center z-30 border-b border-cyan-500/20 animate-fade-in"><span className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2"><Filter size={14}/> 智能過濾：{slotFilter ? `[${getSlotDisplayName(slotFilter)}]` : ''}{effectFilter ? `[${effectFilterOptions.find(o => o.id === effectFilter)?.label}]` : ''}</span><button onClick={() => { setSlotFilter(null); setEffectFilter(null); }} className="text-cyan-400 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><X size={14}/> 清除</button></div>}
                <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar ${slotFilter || effectFilter ? 'mt-8' : ''}`}>
                    {activeTab === 'bag' && renderItemGrid(filteredBagItems, false)}
                    {activeTab === 'disposal' && (<div className="flex flex-col h-full overflow-hidden"><div className="bg-black/30 p-3 rounded-2xl mb-4 border border-white/5 flex justify-between items-center shrink-0"><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-yellow-900/20 text-yellow-500 border border-yellow-500/30"><Coins size={18}/></div><div className="flex flex-col"><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">預期收益</span><span className="text-lg font-mono font-black text-yellow-400">+{currentBatchTotalValue} G</span></div></div><div className="flex gap-2"><Button disabled={selectedItems.length === 0} onClick={handleBatchSell} className="bg-yellow-600 hover:bg-yellow-500 text-xs font-black py-2.5 px-6 rounded-full shadow-lg transition-all active:scale-95">批量出售</Button><Button disabled={selectedItems.length === 0} onClick={handleBatchDiscard} variant="danger" className="text-xs font-black py-2.5 px-6 rounded-full shadow-lg transition-all active:scale-95">徹底丟棄</Button></div></div>{renderItemGrid(filteredBagItems, true, 99)}</div>)}
                    {(activeTab === 'craft' || activeTab === 'cooking') && (<div className="flex h-full gap-4 overflow-hidden"><div className="w-1/3 border-r border-white/5 pr-4 overflow-y-auto custom-scrollbar hidden sm:block"><h4 className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-widest">發現數據庫</h4>{recipes.filter(r => (activeTab === 'cooking' ? r.type === 'cooking' : r.type !== 'cooking')).map(r => (<div key={r.id} className="p-3 mb-3 rounded-2xl cursor-pointer border bg-slate-800/50 border-white/5 hover:border-slate-600 transition-all" onClick={() => applyRecipe(r)}><div className="font-black text-sm text-cyan-300 uppercase">{r.resultItemName}</div><div className="text-[10px] text-slate-500 mt-1.5 font-bold">{r.ingredients.join(' + ')}</div></div>))}</div><div className="flex-1 flex flex-col min-h-0 overflow-hidden">{renderItemGrid(filteredBagItems, true, 99)}<div className="mt-4 flex flex-col gap-2"><div className="flex justify-between items-center px-4 py-2 bg-slate-950/50 border border-cyan-500/20 rounded-xl"><span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em]">所需催化能: 5 SP</span><span className={`text-[10px] font-black uppercase ${skillPoints >= 5 ? 'text-emerald-400' : 'text-red-500'}`}>持有: {skillPoints} SP</span></div><Button onClick={handleCraft} disabled={isProcessing || selectedItems.length < 2 || skillPoints < 5} className="w-full py-4 font-black uppercase tracking-widest text-sm shadow-2xl">{isProcessing ? "組建中..." : "開始物質合成"}</Button></div></div></div>)}
                    {activeTab === 'upgrade' && (<div className="flex flex-col h-full overflow-hidden"><div className="text-center text-slate-500 text-xs font-black uppercase mb-4">選擇：基底 + 核心元件</div>{renderItemGrid(filteredBagItems, true, 2)}<Button onClick={handlePreviewUpgrade} disabled={isProcessing || selectedItems.length !== 2} className="w-full mt-4 py-4 font-black uppercase">模擬強化結果</Button></div>)}
                    {activeTab === 'reforge' && (<div className="flex flex-col h-full overflow-hidden"><div className="text-center text-slate-500 text-xs font-black uppercase mb-4">選擇一件裝備進行以太重構 (需 200 G)</div>{renderItemGrid(filteredBagItems.filter(i => i.type === 'equipment'), true, 1)}<Button onClick={() => { if (selectedItems.length !== 1) return; const item = items.find(i => i.id === selectedItems[0]); if (item && onReforge) { if (gold < 200) { alert("金幣不足 (需 200 G)"); return; } onReforge(item); setSelectedItems([]); } }} disabled={isProcessing || selectedItems.length !== 1 || gold < 200} className="w-full mt-4 py-4 font-black uppercase shadow-lg bg-purple-600 hover:bg-purple-500 border-purple-400">{isProcessing ? "重構中..." : "開始洗鍊 (200 G)"}</Button></div>)}
                    {activeTab === 'repair' && (<div className="flex flex-col h-full overflow-hidden"><div className="grid grid-cols-1 gap-3 overflow-y-auto custom-scrollbar">{damagedItems.map(item => (<div key={item.id} className="flex items-center gap-4 bg-slate-800/40 p-3 rounded-2xl border border-white/5 group shadow-sm"><div className={`w-14 h-14 rounded-xl bg-black shrink-0 relative overflow-hidden border-2 ${getRarityClass(item.rarity)} shadow-inner`}>{item.iconUrl && <img src={item.iconUrl} className="w-full h-full object-cover"/>}</div><div className="flex-1 min-w-0"><div className={`font-black text-sm truncate uppercase ${getRarityText(item.rarity)}`}>{item.name}</div><div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden mt-1.5 shadow-inner"><div className="h-full bg-green-500 transition-all duration-1000" style={{width: `${(item.durability!/item.maxDurability!)*100}%`}}></div></div></div><Button size="sm" className="bg-yellow-600 hover:bg-yellow-500" onClick={() => onRepair && onRepair(item)}>50 G</Button></div>))}</div></div>)}
                </div>
            </div>
        </div>

        {/* Item Creation Modal */}
        {isCreateModalOpen && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in p-4"><Card title="手動物質具現化" className="w-full max-md bg-slate-900 border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.2)]"><p className="text-xs text-slate-400 mb-4 font-serif italic">輸入物品的名稱或核心概念，以太矩陣將自動推演其餘屬性與分類。</p><div className="space-y-4"><div><label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1.5 block">物品名稱或描述</label><Input autoFocus value={newItemName} onChange={e => setNewItemName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleManualCreate()} placeholder="例如: 弒神者的餘燼、被詛咒的懷錶..." className="bg-black/40 border-slate-700 focus:border-emerald-500"/></div><div className="flex gap-3 pt-2"><Button onClick={() => setIsCreateModalOpen(false)} variant="secondary" className="flex-1">取消</Button><Button onClick={handleManualCreate} disabled={!newItemName.trim()} className="flex-1 bg-emerald-600 border-emerald-400 hover:bg-emerald-500"><Wand2 size={16} className="mr-1 inline"/> 具現化</Button></div></div></Card></div>
        )}

        {/* View Item Detailed Modal - 修正物質轉換效果顯示 */}
        {viewItem && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in" onClick={() => setViewItem(null)}>
                <div className={`bg-slate-900 border-2 rounded-[2rem] w-full max-w-2xl max-h-[85vh] flex flex-col relative shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-scale-up ${getRarityClass(viewItem.rarity)}`} onClick={e => e.stopPropagation()}>
                    <button className="absolute top-4 right-4 z-50 p-2 bg-black/40 rounded-full text-slate-400 hover:text-white hover:bg-black/60 transition-all" onClick={() => setViewItem(null)}><X size={20}/></button>
                    
                    <div className="overflow-y-auto custom-scrollbar p-6 sm:p-8 relative z-10">
                        <div className="flex flex-col sm:flex-row gap-6 mb-8 relative z-10">
                            <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-black shrink-0 overflow-hidden border-2 shadow-2xl mx-auto sm:mx-0 ${getRarityClass(viewItem.rarity)}`}>{viewItem.iconUrl && <img src={viewItem.iconUrl} className="w-full h-full object-cover"/>}</div>
                            <div className="flex-1 min-w-0 pt-2 text-center sm:text-left">
                                <h3 className={`text-2xl sm:text-3xl font-black uppercase leading-tight tracking-tight mb-3 ${getRarityText(viewItem.rarity)}`}>{viewItem.name}</h3>
                                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                   <span className={`text-[10px] border px-3 py-1 rounded-full uppercase font-black tracking-widest ${getTypeLabel(viewItem.type).color}`}>{getTypeLabel(viewItem.type).label}</span>
                                   <span className={`text-[10px] px-3 py-1 rounded-full uppercase font-black border bg-black/40 tracking-widest ${getRarityText(viewItem.rarity)}`}>{viewItem.rarity || '普通'}</span>
                                   {viewItem.level !== undefined && <span className="text-[10px] px-3 py-1 rounded-full uppercase font-black bg-yellow-950/40 text-yellow-500 border border-yellow-500/20">LV. {viewItem.level}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 relative z-10">
                            {/* 附帶技能 (核心效果) */}
                            {viewItem.potionEffect && (
                                <div className="bg-emerald-950/20 p-5 rounded-3xl border border-emerald-500/30">
                                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Wand size={14}/> 物質轉換效果</h4>
                                    <p className="text-emerald-100 font-serif italic text-lg leading-relaxed">{viewItem.potionEffect}</p>
                                </div>
                            )}

                            {/* Exclusive Skills (物品專屬技能) */}
                            {viewItem.exclusiveSkills && viewItem.exclusiveSkills.length > 0 && (
                                <div className="bg-amber-950/20 p-5 rounded-3xl border border-amber-500/30">
                                    <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Zap size={14}/> 物品專屬技能</h4>
                                    <div className="space-y-3">
                                        {viewItem.exclusiveSkills.map((skill, i) => (
                                            <div key={i} className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-amber-900/40 border border-amber-500/30 flex items-center justify-center shrink-0">
                                                        <img src={skill.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(skill.name)}&background=451a03&color=fbbf24`} className="w-full h-full object-cover rounded-md" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-amber-200">{skill.name}</div>
                                                        <div className="text-[9px] text-amber-500/70 font-mono flex gap-2">
                                                            <span>LV.{skill.level || 1}</span>
                                                            {skill.manaCost && <span>MP: {skill.manaCost}</span>}
                                                            {skill.cooldown && <span>CD: {skill.cooldown}s</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-amber-100/80 font-serif italic pl-10 leading-relaxed">{skill.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Stat Bonuses */}
                            {viewItem.stats && Object.keys(viewItem.stats).length > 0 && (
                                <div className="bg-black/40 p-5 rounded-3xl border border-white/5">
                                    <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Activity size={12}/> 屬性強化參數</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {Object.entries(viewItem.stats).map(([stat, val]) => (
                                            <div key={stat} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-xl border border-white/5"><span className="text-[9px] uppercase font-black text-slate-500 flex items-center gap-2">{getStatIcon(stat)} {stat}</span><span className="text-sm font-mono font-black text-cyan-400">+{val}</span></div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Aether Affixes (附帶被動技能) */}
                            {viewItem.affixes && viewItem.affixes.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2 px-2"><Sparkles size={12}/> 以太編碼詞綴矩陣</h4>
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {viewItem.affixes.map((affix, i) => (
                                            <div key={i} className={`p-3.5 rounded-2xl border flex flex-col gap-1 transition-all hover:scale-[1.02] ${getAffixColor(affix.rarity)}`}>
                                                <div className="flex justify-between items-center"><span className="font-black uppercase tracking-tighter text-xs flex items-center gap-2"><Star size={10} className="fill-current"/> {affix.name}</span><span className="text-[8px] opacity-40 uppercase font-black px-2 py-0.5 rounded-full border border-current">{affix.rarity}</span></div>
                                                <p className="text-[10px] font-serif italic text-white/70 leading-relaxed">{affix.effect}</p>
                                                {affix.stats && Object.keys(affix.stats).length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-1 pt-1 border-t border-white/10">
                                                        {Object.entries(affix.stats).map(([k, v]) => (
                                                            <div key={k} className="flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded text-[8px]">
                                                                {getStatIcon(k)} <span className="font-mono font-bold">+{v}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="p-6 bg-black/20 rounded-3xl border border-white/5">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Book size={12}/> 物質描述</h4>
                                <p className="text-slate-400 text-sm italic font-serif leading-relaxed border-l-2 border-white/10 pl-4">{viewItem.description}</p>
                                
                                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/5">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><Coins size={10}/> 潛在價值</span>
                                        <span className="text-sm font-mono font-black text-yellow-500">{viewItem.price || 0} G</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><Scale size={10}/> 重量</span>
                                        <span className="text-sm font-mono font-black text-slate-300">{viewItem.weight || 0} kg</span>
                                    </div>
                                    {viewItem.setId && (
                                        <div className="flex flex-col gap-1 col-span-2">
                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><Layers size={10}/> 套裝 ID</span>
                                            <span className="text-xs font-mono font-bold text-cyan-400">{viewItem.setId}</span>
                                        </div>
                                    )}
                                    {viewItem.binding && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><Lock size={10}/> 綁定狀態</span>
                                            <span className="text-xs font-bold text-red-400 uppercase">{viewItem.binding === 'equip' ? '裝備後綁定' : viewItem.binding === 'pickup' ? '拾取後綁定' : '未綁定'}</span>
                                        </div>
                                    )}
                                    {viewItem.craftingRecipe && (
                                        <div className="flex flex-col gap-1 col-span-2">
                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><Hammer size={10}/> 合成配方</span>
                                            <div className="flex flex-wrap gap-1">
                                                {viewItem.craftingRecipe.map((ing, i) => (
                                                    <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">{ing}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {onAssignQuickSlot && (<div className="p-5 bg-slate-950/40 rounded-3xl border border-cyan-500/20"><h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-4 text-center">快捷槽載入</h4><div className="flex justify-center gap-3">{[0, 1, 2, 3].map(idx => (<button key={idx} onClick={() => { onAssignQuickSlot(viewItem, idx); setViewItem(null); }} className="w-12 h-12 rounded-2xl border-2 border-slate-800 hover:border-cyan-500 bg-slate-900/50 flex flex-col items-center justify-center transition-all active:scale-90 group/btn shadow-lg"><span className="text-[8px] font-black text-slate-600 group-hover/btn:text-cyan-400">快捷鍵</span><span className="text-lg font-mono font-black text-slate-400 group-hover/btn:text-white">{idx + 1}</span></button>))}</div></div>)}
                            <div className="flex flex-col gap-3 pt-4 border-t border-white/5">{(viewItem.type === 'consumable' || viewItem.type === 'food') && (<Button size="lg" onClick={() => { onConsume(viewItem); setViewItem(null); }} className="bg-emerald-600 hover:bg-emerald-500 py-4 font-black rounded-full shadow-[0_10px_20px_rgba(16,185,129,0.3)]">執行物質轉換</Button>)}{viewItem.type === 'equipment' && viewItem.slot && (<Button size="lg" onClick={() => { onEquip(viewItem.id, viewItem.slot!); setViewItem(null); setSlotFilter(null); }} className="bg-cyan-600 hover:bg-cyan-500 py-4 font-black rounded-full shadow-[0_10px_20px_rgba(6,182,212,0.3)]">核心武裝同步</Button>)}</div>
                        </div>
                        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none"></div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
