
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { SkillNode, DamageType, StatusEffectType, QuickSlot, Item, Affix } from '../types';
import { 
  Terminal, Sparkles, PlusCircle, Coins, ArrowUp, Flame, Snowflake, Zap, 
  Droplets, Skull, Shield, Ghost, Crosshair, Star, Sword, Combine, X, 
  Check, Loader2, Info, Timer, LayoutGrid, Play, Book, Search, 
  ChevronRight, Droplet, ShieldCheck, Wand2, Activity, Wand, 
  RefreshCcw,
  BrainCircuit, Target, Cpu, Hexagon, Layers, ZapOff, 
  ChevronDown, ChevronUp, Maximize2, Minimize2, Share2, 
  Fingerprint, Compass, Wind, FlameKindling, Waves, Mountain, 
  Zap as Lightning, Sun, Moon, Atom
} from 'lucide-react';
import { Input, Button, Card } from './Layout';
import * as GeminiService from '../services/geminiService';

interface SkillTreeProps {
  skills: SkillNode[];
  skillPoints: number;
  worldSetting?: string;
  quickSlots?: (QuickSlot | null)[];
  inventory?: Item[];
  onLearnSkill: (newSkill: SkillNode, cost: number) => void;
  onUpgradeSkill: (skillId: string, cost: number) => void;
  onCheatSkill: (name: string) => void;
  onBuySkillPoint?: () => void;
  onAddSkill?: (skill: SkillNode) => void; 
  onAssignQuickSlot?: (skill: SkillNode, index?: number) => void;
  onUseSkill?: (skill: SkillNode) => void;
  onReforge?: (skill: SkillNode) => void;
  onRegenerateIcons?: () => void;
  onUpdateSkill?: (skill: SkillNode) => void; // Added onUpdateSkill
}

export const SkillTree: React.FC<SkillTreeProps> = ({ skills, skillPoints, worldSetting = "", quickSlots = [], inventory = [], onLearnSkill, onUpgradeSkill, onCheatSkill, onBuySkillPoint, onAddSkill, onAssignQuickSlot, onUseSkill, onReforge, onRegenerateIcons, onUpdateSkill }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{ node: SkillNode, x: number, y: number } | null>(null);
  const [cheatInput, setCheatInput] = useState('');
  const [justModifiedId, setJustModifiedId] = useState<string | null>(null);

  const [isFusionMode, setIsFusionMode] = useState(false);
  const [selectedForFusion, setSelectedForFusion] = useState<string[]>([]);
  const [isFusing, setIsFusing] = useState(false);
  const [fusionResult, setFusionResult] = useState<any>(null);
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);
  const [isAnalyzingTactics, setIsAnalyzingTactics] = useState(false); // Added loading state for tactics analysis

  const [showManual, setShowManual] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');

  useEffect(() => {
      if (justModifiedId) {
          const timer = setTimeout(() => setJustModifiedId(null), 2000);
          return () => clearTimeout(timer);
      }
  }, [justModifiedId]);

  const isUnlockable = (node: SkillNode, allSkills: SkillNode[]) => {
      if (node.unlocked) return false;
      if (node.id === 'root') return true;
      const parent = allSkills.find(s => s.id === node.parentId);
      return parent && parent.unlocked;
  };

  const handleManualCreate = () => {
    if (!newSkillName.trim()) return;
    onCheatSkill(newSkillName.trim());
    setNewSkillName('');
    setIsCreateModalOpen(false);
  };

  const assignedSkillIds = useMemo(() => {
    return quickSlots.filter(s => s?.type === 'skill').map(s => s!.id);
  }, [quickSlots]);

  const graphData = useMemo(() => {
    try {
        if (!skills || skills.length === 0) return null;
        const rootNode = skills.find(s => s.id === 'root' || s.name === '覺醒');
        const rootId = rootNode?.id || 'root';

        let nodes = skills.map(s => {
            let pid = s.parentId;
            if (s.id !== rootId && (!pid || !skills.find(p => p.id === pid))) {
                pid = rootId;
            }
            return { ...s, parentId: pid === s.id ? undefined : pid };
        });

        const links: {source: string, target: string}[] = [];
        nodes.forEach(n => {
            if (n.parentId && nodes.find(p => p.id === n.parentId)) {
                links.push({ source: n.parentId, target: n.id });
            }
        });

        const depthMap = new Map<string, number>();
        const queue: {id: string, depth: number}[] = [];
        nodes.filter(n => !n.parentId).forEach(n => {
            depthMap.set(n.id, 0);
            queue.push({id: n.id, depth: 0});
        });

        const visited = new Set<string>();
        while(queue.length > 0) {
            const {id, depth} = queue.shift()!;
            visited.add(id);
            const children = links.filter(l => l.source === id).map(l => l.target);
            children.forEach(childId => {
                if(!visited.has(childId)) {
                    depthMap.set(childId, depth + 1);
                    queue.push({id: childId, depth: depth + 1});
                }
            });
        }
        
        nodes = nodes.map(n => ({...n, depth: depthMap.get(n.id) || 0}));
        return { nodes, links };
    } catch (e) { return null; }
  }, [skills]);

  useEffect(() => {
    if (!graphData || !svgRef.current || !wrapperRef.current || showManual) return;
    const resizeObserver = new ResizeObserver(entries => {
        if(!entries || entries.length === 0) return;
        const { width, height } = entries[0].contentRect;
        if (width === 0 || height === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); 
        const g = svg.append("g");
        const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 3]).on("zoom", (event) => g.attr("transform", event.transform));
        svg.call(zoom);

        const defs = svg.append("defs");
        const filter = defs.append("filter").attr("id", "assigned-glow");
        filter.append("feGaussianBlur").attr("stdDeviation", "3.5").attr("result", "blur");
        filter.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

        const masterFilter = defs.append("filter").attr("id", "master-glow");
        masterFilter.append("feGaussianBlur").attr("stdDeviation", "4.5").attr("result", "blur");
        masterFilter.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

        const simulation = d3.forceSimulation(graphData.nodes as any)
            .force("link", d3.forceLink(graphData.links).id((d: any) => d.id).distance(140))
            .force("charge", d3.forceManyBody().strength(-1200))
            .force("collide", d3.forceCollide(80))
            .force("x", d3.forceX(width / 2).strength(0.1))
            .force("y", d3.forceY((d: any) => 100 + (d.depth * 180)).strength(1.5));

        const link = g.append("g").selectAll("line").data(graphData.links).enter().append("line")
            .attr("stroke", (d: any) => {
                const targetNode = graphData.nodes.find(n => n.id === (d.target.id || d.target));
                return targetNode?.unlocked ? "#06b6d4" : "#334155";
            })
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", (d: any) => {
                const targetNode = graphData.nodes.find(n => n.id === (d.target.id || d.target));
                return targetNode?.unlocked ? "none" : "5,5";
            });

        const node = g.append("g").selectAll(".node").data(graphData.nodes).enter().append("g").attr("class", "node").style("cursor", "grab");

        const content = node.append("g");
        
        content.attr("transform", `translate(${width}, 0)`)
               .style("opacity", 0)
               .transition()
               .duration(800)
               .delay((d: any, i: number) => i * 50)
               .ease(d3.easeCubicOut)
               .attr("transform", "translate(0, 0)")
               .style("opacity", 1);

        content.append("circle").attr("r", 35).attr("fill", "#0f172a") 
            .attr("stroke", (d: any) => {
                if (selectedForFusion.includes(d.id)) return "#ec4899"; 
                if (d.level >= 5) return "#f97316"; 
                if (assignedSkillIds.includes(d.id)) return "#fde047"; 
                return d.unlocked ? (d.skillType === 'passive' ? "#a855f7" : "#06b6d4") : (isUnlockable(d, skills) ? "#eab308" : "#475569");
            })
            .attr("stroke-width", (d: any) => selectedForFusion.includes(d.id) ? 6 : (d.level >= 5 ? 5 : (assignedSkillIds.includes(d.id) ? 5 : 3)))
            .style("stroke-dasharray", (d: any) => d.skillType === 'passive' ? "4,2" : "none")
            .style("filter", (d: any) => d.level >= 5 ? "url(#master-glow)" : (assignedSkillIds.includes(d.id) ? "url(#assigned-glow)" : "none"))
            .style("transition", "all 0.3s ease");

        content.append("clipPath").attr("id", (d: any) => `clip-${d.id}`).append("circle").attr("r", 32);
        content.append("image").attr("xlink:href", (d: any) => d.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=0f172a&color=fff`).attr("x", -32).attr("y", -32).attr("width", 64).attr("height", 64).attr("clip-path", (d: any) => `url(#clip-${d.id})`);

        content.append("text").attr("dy", 60).attr("text-anchor", "middle").text((d: any) => d.name).attr("fill", (d: any) => d.unlocked ? "#22d3ee" : "#94a3b8").style("font-size", "12px").style("font-weight", "bold");

        // Passive indicator
        content.filter((d: any) => d.skillType === 'passive' && d.unlocked).append("circle").attr("r", 38).attr("fill", "none").attr("stroke", "#a855f7").attr("stroke-width", 1).style("opacity", 0.5);

        content.filter((d: any) => d.level >= 5).append("rect")
            .attr("x", -20).attr("y", -45).attr("width", 40).attr("height", 14).attr("rx", 4).attr("fill", "#f97316");
        content.filter((d: any) => d.level >= 5).append("text")
            .attr("dy", -35).attr("text-anchor", "middle").text("MASTER").attr("fill", "#fff").style("font-size", "8px").style("font-weight", "black");

        simulation.on("tick", () => {
            link.attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y).attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
            node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
        });

        svg.call(zoom.transform, d3.zoomIdentity.translate(width/2, 50).scale(0.8));

        node.on("mouseenter", function(event, d: any) {
            setHoveredNode({ node: d, x: event.clientX, y: event.clientY });
        }).on("mouseleave", function() {
            setHoveredNode(null);
        }).on("click", (event, d: any) => {
            if (isFusionMode) {
                if (!d.unlocked) return;
                setSelectedForFusion(prev => 
                    prev.includes(d.id) ? prev.filter(id => id !== d.id) : (prev.length < 3 ? [...prev, d.id] : prev)
                );
            } else {
                setSelectedNode(d);
            }
        });
    });
    resizeObserver.observe(wrapperRef.current);
    return () => resizeObserver.disconnect();
  }, [graphData, skills, isFusionMode, selectedForFusion, assignedSkillIds, showManual]);

  const getAffixColor = (rarity?: string) => {
    switch(rarity) {
        case 'legendary': return 'bg-amber-950/40 border-amber-500/50 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
        case 'epic': return 'bg-purple-950/40 border-purple-500/50 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]';
        case 'rare': return 'bg-blue-950/40 border-blue-500/50 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.2)]';
        default: return 'bg-slate-900/60 border-slate-700/50 text-slate-300';
    }
  };

  const getElementIcon = (element?: string) => {
    switch (element?.toLowerCase()) {
      case 'fire': return <Flame size={14} className="text-orange-500" />;
      case 'water': return <Waves size={14} className="text-blue-500" />;
      case 'wind': return <Wind size={14} className="text-cyan-400" />;
      case 'earth': return <Mountain size={14} className="text-emerald-600" />;
      case 'lightning': return <Lightning size={14} className="text-yellow-400" />;
      case 'holy': return <Sun size={14} className="text-amber-300" />;
      case 'dark': return <Moon size={14} className="text-purple-800" />;
      default: return <Atom size={14} className="text-slate-400" />;
    }
  };

  const getStatIcon = (stat: string) => {
    switch (stat) {
        case 'strength': return <Sword size={10} className="text-red-400" />;
        case 'intelligence': return <BrainCircuit size={10} className="text-blue-400" />;
        case 'agility': return <Zap size={10} className="text-yellow-400" />;
        case 'charisma': return <Sparkles size={10} className="text-pink-400" />;
        case 'luck': return <Crosshair size={10} className="text-emerald-400" />;
        case 'endurance': return <Activity size={10} className="text-orange-400" />;
        default: return <PlusCircle size={10} className="text-slate-400" />;
    }
  };

  const handleUnlock = () => {
      if (selectedNode && isUnlockable(selectedNode, skills) && skillPoints >= selectedNode.cost) {
          onLearnSkill(selectedNode, selectedNode.cost);
          setSelectedNode(null);
      }
  };

  const handleUpgrade = () => {
      if (selectedNode && selectedNode.unlocked) {
          const upgradeCost = (selectedNode.level || 1) * 2;
          if (skillPoints >= upgradeCost) {
              onUpgradeSkill(selectedNode.id, upgradeCost);
              setSelectedNode(null);
          }
      }
  };

  const handleInitiateFusion = async () => {
      if (selectedForFusion.length < 2) return;
      if (skillPoints < 10) {
          alert("技能融合需要至少 10 SP 作為催化劑。");
          return;
      }

      setIsFusing(true);
      try {
          const materialSkills = skills.filter(s => selectedForFusion.includes(s.id));
          const result = await GeminiService.fuseSkills(materialSkills, worldSetting);
          
          setFusionResult({ ...result, materials: materialSkills });
          
          setIsGeneratingIcon(true);
          GeminiService.generateImage(`Skill icon for fusion skill: ${result.name}. Theme: ${result.description}`, 'icon').then(iconUrl => {
              setFusionResult((prev: any) => prev ? ({ ...prev, iconUrl }) : null);
              setIsGeneratingIcon(false);
          });
      } catch (e) {
          console.error(e);
          alert("融合矩陣不穩定，推演失敗。");
      }
      setIsFusing(false);
  };

  const finalizeFusion = () => {
      if (!fusionResult || !onAddSkill) return;
      
      const newSkill: SkillNode = {
          id: crypto.randomUUID(),
          name: fusionResult.name,
          description: fusionResult.description,
          skillType: fusionResult.skillType as any || 'active',
          affixes: fusionResult.affixes,
          unlocked: true,
          parentId: fusionResult.materials[0].id, 
          cost: 0,
          level: 1,
          cooldown: fusionResult.cooldown,
          manaCost: fusionResult.manaCost || 10,
          currentCooldown: 0,
          damageType: fusionResult.damageType as any,
          elementType: fusionResult.elementType as any,
          statusEffect: fusionResult.statusEffect as any,
          tacticalAnalysis: fusionResult.tacticalAnalysis,
          iconUrl: fusionResult.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fusionResult.name)}`
      };

      onAddSkill(newSkill);
      // SP 扣除由 parent 的 onAddSkill 負責
      
      setFusionResult(null);
      setIsFusionMode(false);
      setSelectedForFusion([]);
      alert(`繼承成功！你已領悟了全新技能：${newSkill.name}`);
  };

  const handleAnalyzeTactics = async () => {
      if (!selectedNode || !onUpdateSkill || isAnalyzingTactics) return;
      setIsAnalyzingTactics(true);
      try {
          const analysis = await GeminiService.analyzePlayerSkillTactics(selectedNode, worldSetting);
          const updatedSkill = { 
              ...selectedNode, 
              tacticalAnalysis: analysis.tacticalAnalysis,
              visualEffect: analysis.visualEffect,
              loreSignificance: analysis.loreSignificance
          };
          onUpdateSkill(updatedSkill);
          setSelectedNode(updatedSkill);
      } catch (e) {
          console.error(e);
          alert("戰術分析失敗，請稍後再試。");
      }
      setIsAnalyzingTactics(false);
  };

  const manualFilteredSkills = useMemo(() => {
    return skills.filter(s => s.name.includes(manualSearch) || 
                              s.description.includes(manualSearch) || 
                              (s.affixes && s.affixes.some(a => a.name.includes(manualSearch))));
  }, [skills, manualSearch]);

  return (
    <div className="h-full relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800" ref={wrapperRef}>
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pointer-events-none">
             <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-cyan-500/30 shadow-lg flex items-center gap-4 pointer-events-auto">
                 <div className="flex flex-col">
                    <span className="text-slate-500 text-[9px] uppercase font-black tracking-widest">可用技能點</span>
                    <span className="text-2xl font-mono text-cyan-400 font-bold leading-none">{skillPoints}</span>
                 </div>
                 {onBuySkillPoint && (
                    <button onClick={onBuySkillPoint} className="w-8 h-8 rounded-full bg-yellow-900/40 border border-yellow-500/40 flex items-center justify-center text-yellow-400 hover:bg-yellow-800 hover:text-white transition-all" title="購買 SP">
                        <PlusCircle size={16}/>
                    </button>
                 )}
             </div>

             <div className="flex flex-col items-end gap-2 pointer-events-auto">
                <div className="flex gap-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
                    <button 
                        onClick={() => setShowManual(!showManual)}
                        className={`p-2 rounded-full transition-all ${showManual ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                        title={showManual ? '返回矩陣視圖' : '技能百科'}
                    >
                        <Book size={18}/>
                    </button>
                    <button 
                        onClick={() => { setIsFusionMode(!isFusionMode); setSelectedForFusion([]); }}
                        className={`p-2 rounded-full transition-all ${isFusionMode ? 'bg-pink-600 text-white shadow-lg animate-pulse' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                        title={isFusionMode ? '關閉融合模式' : '技能融合協議'}
                    >
                        <Combine size={18}/>
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-1 self-center"></div>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="p-2 rounded-full text-emerald-400 hover:bg-emerald-900/50 hover:text-emerald-300 transition-all"
                        title="新建技能"
                    >
                        <PlusCircle size={18}/>
                    </button>
                    {onAssignQuickSlot && (
                        <button 
                            onClick={() => {
                                const activeSkills = skills.filter(s => s.unlocked && s.skillType !== 'passive');
                                if (activeSkills.length === 0) {
                                    alert("沒有可用的主動技能！");
                                    return;
                                }
                                const sorted = [...activeSkills].sort((a, b) => {
                                    const scoreA = (a.level || 1) * 10 + (a.manaCost || 0) + (a.damageType ? 5 : 0);
                                    const scoreB = (b.level || 1) * 10 + (b.manaCost || 0) + (b.damageType ? 5 : 0);
                                    return scoreB - scoreA;
                                });
                                const topSkills = sorted.slice(0, 4);
                                topSkills.forEach((skill, index) => onAssignQuickSlot(skill, index));
                                alert(`已自動分配 ${topSkills.length} 個強力技能至快捷槽！`);
                            }}
                            className="p-2 rounded-full text-cyan-400 hover:bg-cyan-900/50 hover:text-cyan-300 transition-all"
                            title="自動分配最強技能"
                        >
                            <Zap size={18}/>
                        </button>
                    )}
                    {onRegenerateIcons && (
                        <button 
                            onClick={onRegenerateIcons}
                            className="p-2 rounded-full text-orange-400 hover:bg-orange-900/50 hover:text-orange-300 transition-all"
                            title="重繪圖標"
                        >
                            <Sparkles size={18}/>
                        </button>
                    )}
                </div>

                {isFusionMode && (
                    <div className="bg-pink-950/90 p-4 rounded-2xl border border-pink-500/30 backdrop-blur-md shadow-2xl animate-slide-up flex flex-col gap-3 w-[260px]">
                        <div className="flex justify-between items-center border-b border-pink-500/20 pb-2">
                            <span className="text-[10px] text-pink-200 font-black uppercase tracking-widest">融合矩陣</span>
                            <span className="text-[9px] text-pink-400">{selectedForFusion.length}/3</span>
                        </div>
                        <div className="flex gap-2 justify-center py-2">
                            {[0, 1, 2].map(i => {
                                const id = selectedForFusion[i];
                                const skill = skills.find(s => s.id === id);
                                return (
                                    <div key={i} className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center overflow-hidden transition-all relative ${skill ? 'border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]' : 'bg-black/40 border-slate-800 border-dashed opacity-50'}`}>
                                        {skill ? <img src={skill.iconUrl} className="w-full h-full object-cover"/> : <PlusCircle size={16} className="text-slate-600"/>}
                                        {skill && <div className="absolute inset-0 bg-gradient-to-t from-pink-900/80 to-transparent flex items-end justify-center pb-1"><span className="text-[8px] text-white font-bold truncate px-1 w-full text-center">{skill.name}</span></div>}
                                    </div>
                                );
                            })}
                        </div>
                        <Button 
                            disabled={selectedForFusion.length < 2 || isFusing}
                            onClick={handleInitiateFusion}
                            className="w-full py-2 bg-gradient-to-r from-pink-600 to-purple-600 border-pink-400 text-[10px] font-black tracking-[0.2em] shadow-lg hover:shadow-pink-500/20"
                        >
                            {isFusing ? <Loader2 size={14} className="animate-spin mx-auto"/> : '啟動融合 (10 SP)'}
                        </Button>
                    </div>
                )}
             </div>
        </div>

        {showManual ? (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full pt-24 px-8 pb-24 flex flex-col gap-8 animate-fade-in overflow-hidden"
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <h2 className="text-4xl font-black text-white tracking-tighter uppercase">技能百科 <span className="text-cyan-500">Encyclopedia</span></h2>
                        <p className="text-slate-500 text-xs font-serif italic">記載著所有已覺醒與傳說中的以太權能。</p>
                    </div>
                    <div className="bg-slate-900/50 border border-white/10 p-4 rounded-[2rem] flex items-center gap-4 w-full md:w-96 backdrop-blur-md focus-within:border-cyan-500/50 transition-all shadow-xl">
                        <Search className="text-slate-500" size={20}/>
                        <input 
                            className="bg-transparent border-none focus:ring-0 text-white w-full font-serif placeholder:text-slate-700" 
                            placeholder="搜尋權能名稱或古籍描述..."
                            value={manualSearch}
                            onChange={e => setManualSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {manualFilteredSkills.map((skill, idx) => (
                            <motion.div 
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: idx * 0.05 }}
                                key={skill.id} 
                                onClick={() => setSelectedNode(skill)}
                                className={`group relative p-8 bg-slate-900/40 border rounded-[3rem] transition-all cursor-pointer hover:bg-slate-800/60 hover:shadow-[0_0_40px_rgba(6,182,212,0.1)] ${skill.unlocked ? 'border-cyan-500/20' : 'border-slate-800 opacity-60 grayscale'}`}
                            >
                                <div className="flex gap-6 items-start mb-6">
                                    <div className={`w-20 h-20 rounded-[2rem] bg-slate-950 border-2 overflow-hidden shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${skill.unlocked ? (skill.skillType === 'passive' ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]') : 'border-slate-700'}`}>
                                        <img src={skill.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(skill.name)}`} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-2xl font-black text-white uppercase tracking-tight truncate group-hover:text-cyan-400 transition-colors">{skill.name}</h4>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${skill.skillType === 'passive' ? 'bg-purple-900/50 text-purple-400 border border-purple-500/30' : 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/30'}`}>
                                                {skill.skillType}
                                            </span>
                                            {skill.manaCost !== undefined && skill.skillType !== 'passive' && (
                                                <span className="px-2.5 py-0.5 rounded-full bg-blue-950/30 text-blue-400 text-[9px] font-black uppercase flex items-center gap-1 border border-blue-500/20">
                                                    <Droplet size={10}/> {skill.manaCost}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-4 top-0 bottom-0 w-0.5 bg-white/5 group-hover:bg-cyan-500/30 transition-colors"></div>
                                    <p className="text-xs text-slate-400 leading-relaxed italic font-serif pl-4 line-clamp-3 group-hover:line-clamp-none transition-all duration-500">
                                        {skill.description}
                                    </p>
                                </div>
                                
                                {/* Decorative Corner */}
                                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronRight className="text-cyan-500" size={24} />
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </motion.div>
        ) : (
            <svg ref={svgRef} className="w-full h-full touch-none select-none bg-slate-950 cursor-move"></svg>
        )}

        {isCreateModalOpen && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in p-4">
                <Card title="手動技能具現化 (Manual Creation)" className="w-full max-w-md bg-slate-900 border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                    <p className="text-xs text-slate-400 mb-4 font-serif italic">輸入技能的名稱或核心概念，以太矩陣將自動推演其戰術屬性與史詩詞綴。</p>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1.5 block">技能名稱或概念</label>
                            <Input 
                                autoFocus
                                value={newSkillName}
                                onChange={e => setNewSkillName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleManualCreate()}
                                placeholder="例如: 虛空斬、涅槃重生、萬雷天牢引..."
                                className="bg-black/40 border-slate-700 focus:border-emerald-500"
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button onClick={() => setIsCreateModalOpen(false)} variant="secondary" className="flex-1">取消</Button>
                            <Button onClick={handleManualCreate} disabled={!newSkillName.trim()} className="flex-1 bg-emerald-600 border-emerald-400 hover:bg-emerald-500">
                                <Wand2 size={16} className="mr-1 inline"/> 具現化
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        )}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-black/80 backdrop-blur-xl border border-white/10 p-2.5 rounded-2xl shadow-2xl flex gap-2 items-center">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 transform -rotate-90">快捷<br/>技能</span>
            <div className="flex gap-2">
                {[0, 1, 2, 3].map(idx => {
                    const slot = quickSlots[idx];
                    let iconUrl = null;
                    if (slot) {
                        if (slot.type === 'skill') {
                            const skill = skills.find(s => s.id === slot.id);
                            iconUrl = skill?.iconUrl;
                        } else {
                            const item = inventory.find(i => i.id === slot.id);
                            iconUrl = item?.iconUrl;
                        }
                    }
                    const isOccupiedBySelected = slot?.id === selectedNode?.id;

                    return (
                        <button 
                            key={idx}
                            onClick={() => {
                                if (selectedNode && selectedNode.unlocked && onAssignQuickSlot) {
                                    onAssignQuickSlot(selectedNode, idx);
                                }
                            }}
                            className={`w-11 h-11 rounded-xl border-2 transition-all flex items-center justify-center overflow-hidden group/slot relative ${selectedNode && selectedNode.unlocked ? 'hover:scale-110 hover:border-cyan-400' : ''} ${isOccupiedBySelected ? 'border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.4)]' : (slot ? 'border-slate-700' : 'border-slate-800 border-dashed opacity-50')}`}
                        >
                            {iconUrl ? (
                                <img src={iconUrl} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs font-mono text-slate-700">{idx + 1}</span>
                            )}
                            {selectedNode && selectedNode.unlocked && !isOccupiedBySelected && (
                                <div className="absolute inset-0 bg-cyan-500/20 opacity-0 group-hover/slot:opacity-100 flex items-center justify-center transition-opacity">
                                    <PlusCircle size={16} className="text-cyan-400"/>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>

        {fusionResult && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4 overflow-y-auto">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8, rotateX: 20 }}
                    animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                    className="w-full max-w-4xl bg-slate-950 border-2 border-pink-500/40 rounded-[4rem] p-12 shadow-[0_0_150px_rgba(236,72,153,0.2)] relative overflow-hidden flex flex-col gap-10"
                >
                    {/* Background Effects */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-pink-500/5 via-transparent to-purple-500/5"></div>
                        <div className="absolute -top-48 -right-48 w-96 h-96 bg-pink-500/10 rounded-full blur-[120px] animate-pulse"></div>
                        <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
                    </div>
                    
                    <div className="text-center space-y-4 relative z-10">
                        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-pink-950/30 border border-pink-500/30 text-pink-400 text-xs font-black uppercase tracking-[0.4em] animate-bounce">
                            <Sparkles size={14} /> 奇蹟誕生 <Sparkles size={14} />
                        </div>
                        <h2 className="text-6xl font-black text-white uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                            技能融合成功
                        </h2>
                        <p className="text-slate-500 font-serif italic text-lg">以太矩陣重組完成，新的力量已刻入靈魂深處。</p>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-12 items-start relative z-10">
                        <div className="w-full lg:w-48 flex flex-col items-center gap-6">
                            <div className="w-48 h-48 rounded-[3rem] bg-slate-900 border-4 border-pink-500 shadow-[0_0_50px_rgba(236,72,153,0.4)] overflow-hidden relative group">
                                {isGeneratingIcon ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                                        <div className="relative">
                                            <Loader2 className="animate-spin text-pink-500" size={48}/>
                                            <div className="absolute inset-0 blur-xl animate-pulse bg-pink-500/20"></div>
                                        </div>
                                    </div>
                                ) : (
                                    <img src={fusionResult.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fusionResult.name)}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"/>
                                )}
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">繼承來源</span>
                                <div className="flex -space-x-4">
                                    {fusionResult.materials.map((m: any, i: number) => (
                                        <div key={i} className="w-12 h-12 rounded-2xl border-2 border-slate-800 bg-slate-950 overflow-hidden shadow-xl" title={m.name}>
                                            <img src={m.iconUrl} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-5xl font-black text-white uppercase tracking-tight">{fusionResult.name}</h3>
                                <div className="flex flex-wrap gap-3">
                                    <span className="px-4 py-1.5 rounded-full bg-pink-950/50 text-pink-400 border border-pink-500/30 text-xs font-black uppercase tracking-widest">
                                        {fusionResult.skillType}
                                    </span>
                                    <span className="px-4 py-1.5 rounded-full bg-slate-900/50 text-slate-400 border border-white/10 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                        <Timer size={14}/> {fusionResult.cooldown}T
                                    </span>
                                    <span className="px-4 py-1.5 rounded-full bg-blue-950/50 text-blue-400 border border-blue-500/30 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                        <Droplet size={14}/> {fusionResult.manaCost || 10} MP
                                    </span>
                                </div>
                            </div>
                            <p className="text-xl text-slate-300 font-serif italic leading-relaxed border-l-4 border-pink-500/30 pl-8">
                                {fusionResult.description}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-6">
                            <h4 className="text-xs font-black text-cyan-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                <Sparkles size={16}/> 融合詞綴 (Inherited Affixes)
                            </h4>
                            <div className="space-y-3">
                                {fusionResult.affixes?.map((affix: any, i: number) => (
                                    <div key={i} className={`p-4 rounded-2xl border-2 ${getAffixColor(affix.rarity)}`}>
                                        <div className="font-black uppercase text-xs mb-1">{affix.name}</div>
                                        <div className="opacity-80 font-serif italic text-xs">{affix.effect}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-pink-950/10 p-8 rounded-[3rem] border border-pink-500/20 space-y-6">
                            <h4 className="text-xs font-black text-pink-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                <BrainCircuit size={16}/> 戰術推演 (Tactical Analysis)
                            </h4>
                            <p className="text-pink-100/80 text-sm font-serif leading-relaxed italic text-justify">
                                {fusionResult.tacticalAnalysis}
                            </p>
                            
                            {fusionResult.visualEffect && (
                                <div className="pt-4 border-t border-pink-500/20">
                                    <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Layers size={14}/> 以太視覺
                                    </h4>
                                    <p className="text-cyan-100/80 text-xs font-serif italic leading-relaxed">
                                        {fusionResult.visualEffect}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 pt-8 border-t border-white/10 relative z-10">
                        <Button 
                            onClick={() => setFusionResult(null)} 
                            variant="glass" 
                            className="flex-1 py-6 rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-white/10"
                        >
                            放棄融合 (Discard)
                        </Button>
                        <Button 
                            onClick={finalizeFusion} 
                            className="flex-[2] py-6 rounded-3xl bg-gradient-to-r from-pink-600 to-purple-600 border-pink-400 shadow-[0_0_40px_rgba(236,72,153,0.4)] text-sm font-black tracking-[0.4em] hover:scale-[1.02] active:scale-[0.98] transition-all uppercase"
                        >
                            <Check size={20} className="mr-3 inline"/> 確認繼承 (Consume 10 SP)
                        </Button>
                    </div>
                </motion.div>
            </div>
        )}

        {hoveredNode && !isFusionMode && (
            <div 
                className="fixed z-[100] pointer-events-none animate-fade-in"
                style={{ 
                    top: hoveredNode.y + 20, 
                    left: hoveredNode.x + 20,
                    maxWidth: '320px'
                }}
            >
                <div className="bg-slate-900/95 border border-cyan-500/30 p-4 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-xl text-white">
                    <div className="flex items-start gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-lg overflow-hidden border shrink-0 ${hoveredNode.node.level && hoveredNode.node.level >= 5 ? 'border-orange-500' : (hoveredNode.node.unlocked ? 'border-cyan-500' : 'border-slate-600 grayscale')}`}>
                            <img src={hoveredNode.node.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(hoveredNode.node.name)}`} className="w-full h-full object-cover"/>
                        </div>
                        <div>
                            <h4 className="font-bold text-sm flex items-center gap-2">
                                {hoveredNode.node.name}
                                <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase ${hoveredNode.node.skillType === 'passive' ? 'bg-purple-950 text-purple-400 border-purple-500/30' : 'bg-cyan-950 text-cyan-400 border-cyan-500/30'}`}>{hoveredNode.node.skillType}</span>
                            </h4>
                            <div className="flex gap-2 mt-1">
                                {hoveredNode.node.level && <span className="text-[10px] text-slate-400">LV.{hoveredNode.node.level}</span>}
                                {hoveredNode.node.manaCost !== undefined && hoveredNode.node.skillType !== 'passive' && <span className="text-[10px] text-blue-400 flex items-center gap-0.5"><Droplet size={10}/> {hoveredNode.node.manaCost} MP</span>}
                                {hoveredNode.node.staminaCost !== undefined && hoveredNode.node.skillType !== 'passive' && <span className="text-[10px] text-orange-400 flex items-center gap-0.5"><Activity size={10}/> {hoveredNode.node.staminaCost} SP</span>}
                                {hoveredNode.node.cooldown !== undefined && hoveredNode.node.cooldown > 0 && <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Timer size={10}/> {hoveredNode.node.cooldown}T</span>}
                            </div>
                        </div>
                    </div>
                    
                    <p className="text-xs text-slate-300 italic mb-3 leading-relaxed border-l-2 border-white/10 pl-2">{hoveredNode.node.description}</p>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3 bg-black/20 p-2 rounded-lg">
                        {hoveredNode.node.damageType && <div className="text-[10px] text-slate-400 flex justify-between"><span>類型:</span> <span className="text-red-300">{hoveredNode.node.damageType}</span></div>}
                        {hoveredNode.node.elementType && <div className="text-[10px] text-slate-400 flex justify-between"><span>屬性:</span> <span className="text-yellow-300">{hoveredNode.node.elementType}</span></div>}
                        {hoveredNode.node.targetType && <div className="text-[10px] text-slate-400 flex justify-between"><span>目標:</span> <span className="text-emerald-300">{hoveredNode.node.targetType}</span></div>}
                        {hoveredNode.node.hitRate !== undefined && <div className="text-[10px] text-slate-400 flex justify-between"><span>命中:</span> <span className="text-cyan-300">{hoveredNode.node.hitRate}%</span></div>}
                        {hoveredNode.node.critRate !== undefined && <div className="text-[10px] text-slate-400 flex justify-between"><span>暴擊:</span> <span className="text-orange-300">{hoveredNode.node.critRate}%</span></div>}
                        {hoveredNode.node.scalingFormula && <div className="text-[10px] text-slate-400 col-span-2 border-t border-white/5 pt-1 mt-1 font-mono text-[9px] truncate" title={hoveredNode.node.scalingFormula}>倍率: {hoveredNode.node.scalingFormula}</div>}
                    </div>

                    {hoveredNode.node.tacticalAnalysis && (
                        <div className="mb-3">
                            <div className="text-[9px] font-black text-pink-500 uppercase mb-1 flex items-center gap-1"><BrainCircuit size={10}/> 戰術分析</div>
                            <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-3">{hoveredNode.node.tacticalAnalysis}</p>
                        </div>
                    )}

                    {hoveredNode.node.affixes && hoveredNode.node.affixes.length > 0 && (
                        <div>
                            <div className="text-[9px] font-black text-yellow-500 uppercase mb-1 flex items-center gap-1"><Sparkles size={10}/> 詞綴效果</div>
                            <div className="space-y-1">
                                {hoveredNode.node.affixes.map((affix, i) => (
                                    <div key={i} className={`text-[10px] px-1.5 py-0.5 rounded border ${getAffixColor(affix.rarity)}`}>
                                        <span className="font-bold mr-1">{affix.name}:</span>
                                        <span className="opacity-80">{affix.effect}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {!hoveredNode.node.unlocked && (
                        <div className="mt-3 pt-2 border-t border-white/10 text-center space-y-2">
                            <span className={`text-[10px] font-bold uppercase ${isUnlockable(hoveredNode.node, skills) ? (skillPoints >= hoveredNode.node.cost ? 'text-green-400' : 'text-red-400') : 'text-slate-500'}`}>
                                {isUnlockable(hoveredNode.node, skills) ? `解鎖需求: ${hoveredNode.node.cost} SP` : '需解鎖前置技能'}
                            </span>
                            {isUnlockable(hoveredNode.node, skills) && (
                                <button 
                                    className="w-full py-1.5 rounded bg-amber-600/90 border border-amber-500/50 text-white text-[10px] font-black uppercase hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                    disabled={skillPoints < hoveredNode.node.cost}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLearnSkill(hoveredNode.node, hoveredNode.node.cost);
                                        setHoveredNode(null);
                                    }}
                                >
                                    學習技能
                                </button>
                            )}
                        </div>
                    )}
                    
                    {hoveredNode.node.unlocked && (
                        <div className="mt-3 pt-2 border-t border-white/10">
                            <button 
                                className="w-full py-1.5 rounded bg-cyan-900/40 border border-cyan-500/30 text-cyan-400 text-[10px] font-black uppercase hover:bg-cyan-800 hover:text-white transition-colors flex items-center justify-center gap-2"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedNode(hoveredNode.node);
                                    setHoveredNode(null);
                                }}
                            >
                                <Info size={12}/> 查看詳細資訊
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {selectedNode && !isFusionMode && (
            <AnimatePresence>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="absolute inset-x-4 bottom-24 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl bg-slate-950/90 border border-cyan-500/40 rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.9)] backdrop-blur-2xl z-50 overflow-hidden flex flex-col max-h-[75vh]"
                >
                    {/* Decorative Background */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    </div>

                    {/* Header Section */}
                    <div className="relative p-8 flex flex-col md:flex-row gap-8 items-start md:items-center border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent shrink-0">
                        <button 
                            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all z-20 group"
                            onClick={() => setSelectedNode(null)}
                        >
                            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>

                        <motion.div 
                            layoutId={`skill-icon-${selectedNode.id}`}
                            className={`w-24 h-24 rounded-3xl overflow-hidden bg-slate-900 border-2 shrink-0 relative shadow-2xl ${selectedNode.level && selectedNode.level >= 5 ? 'border-orange-500 shadow-orange-500/30' : (selectedNode.unlocked ? (selectedNode.skillType === 'passive' ? 'border-purple-500 shadow-purple-500/30' : 'border-cyan-500 shadow-cyan-500/30') : 'border-slate-700 grayscale')}`}
                        >
                            <img src={selectedNode.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedNode.name)}`} className="w-full h-full object-cover" />
                            {selectedNode.level && selectedNode.level >= 5 && (
                                <div className="absolute inset-0 bg-gradient-to-t from-orange-600/40 to-transparent flex items-end justify-center pb-1">
                                    <span className="text-[10px] font-black text-white tracking-widest uppercase">Master</span>
                                </div>
                            )}
                        </motion.div>

                        <div className="flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <h3 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">{selectedNode.name}</h3>
                                <div className="flex gap-2">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${selectedNode.skillType === 'passive' ? 'bg-purple-950/50 border-purple-500/50 text-purple-400' : 'bg-cyan-950/50 border-cyan-500/50 text-cyan-400'}`}>
                                        {selectedNode.skillType}
                                    </span>
                                    {selectedNode.unlocked && (
                                        <span className="px-3 py-1 rounded-full bg-slate-800/50 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest">
                                            Level {selectedNode.level || 1}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {selectedNode.damageType && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest">
                                        <Sword size={12} /> {selectedNode.damageType}
                                    </div>
                                )}
                                {selectedNode.elementType && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                                        {getElementIcon(selectedNode.elementType)} {selectedNode.elementType}
                                    </div>
                                )}
                                {selectedNode.targetType && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                        <Target size={12} /> {selectedNode.targetType}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                        {/* Narrative Description */}
                        <section className="space-y-3">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                <Book size={12} /> 技能秘辛
                            </div>
                            <div className="relative">
                                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500/50 to-transparent rounded-full"></div>
                                <p className="text-lg font-serif italic text-slate-300 leading-relaxed pl-4">
                                    {selectedNode.description}
                                </p>
                            </div>
                        </section>

                        {/* Tactical Stats Grid */}
                        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {selectedNode.manaCost !== undefined && selectedNode.skillType !== 'passive' && (
                                <div className="p-4 rounded-2xl bg-blue-950/10 border border-blue-500/20 flex flex-col items-center justify-center gap-1 group hover:bg-blue-950/20 transition-colors">
                                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest opacity-60">以太消耗</span>
                                    <span className="text-xl font-mono font-bold text-white flex items-center gap-2">
                                        <Droplet size={16} className="text-blue-500" /> {selectedNode.manaCost}
                                    </span>
                                </div>
                            )}
                            {selectedNode.staminaCost !== undefined && selectedNode.skillType !== 'passive' && (
                                <div className="p-4 rounded-2xl bg-orange-950/10 border border-orange-500/20 flex flex-col items-center justify-center gap-1 group hover:bg-orange-950/20 transition-colors">
                                    <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest opacity-60">體能消耗</span>
                                    <span className="text-xl font-mono font-bold text-white flex items-center gap-2">
                                        <Activity size={16} className="text-orange-500" /> {selectedNode.staminaCost}
                                    </span>
                                </div>
                            )}
                            {selectedNode.cooldown !== undefined && selectedNode.cooldown > 0 && (
                                <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/10 flex flex-col items-center justify-center gap-1 group hover:bg-slate-800/40 transition-colors">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">冷卻週期</span>
                                    <span className="text-xl font-mono font-bold text-white flex items-center gap-2">
                                        <Timer size={16} className="text-slate-400" /> {selectedNode.cooldown}T
                                    </span>
                                </div>
                            )}
                            {selectedNode.hitRate !== undefined && (
                                <div className="p-4 rounded-2xl bg-cyan-950/10 border border-cyan-500/20 flex flex-col items-center justify-center gap-1 group hover:bg-cyan-950/20 transition-colors">
                                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest opacity-60">精準度</span>
                                    <span className="text-xl font-mono font-bold text-white flex items-center gap-2">
                                        <Target size={16} className="text-cyan-500" /> {selectedNode.hitRate}%
                                    </span>
                                </div>
                            )}
                        </section>

                        {/* Scaling Formula */}
                        {selectedNode.scalingFormula && (
                            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-colors">
                                        <Cpu size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">效能演算法</div>
                                        <div className="text-sm font-mono text-cyan-300">{selectedNode.scalingFormula}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-600 font-mono hidden md:block">Deterministic Logic v2.0</div>
                            </div>
                        )}

                        {/* AI Analysis Sections */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Tactical Analysis */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-pink-500 uppercase tracking-widest">
                                        <BrainCircuit size={14} /> 戰術推演
                                    </div>
                                    {!selectedNode.tacticalAnalysis && (
                                        <button 
                                            onClick={handleAnalyzeTactics} 
                                            disabled={isAnalyzingTactics || !onUpdateSkill}
                                            className="px-3 py-1 rounded-full bg-pink-900/30 text-pink-400 border border-pink-500/30 text-[9px] font-black uppercase hover:bg-pink-800 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isAnalyzingTactics ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                            {isAnalyzingTactics ? '推演中' : '執行分析'}
                                        </button>
                                    )}
                                </div>
                                {selectedNode.tacticalAnalysis ? (
                                    <div className="p-5 rounded-3xl bg-pink-950/10 border border-pink-500/20 relative group">
                                        <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity"><BrainCircuit size={40} /></div>
                                        <p className="text-xs text-pink-100/80 leading-relaxed font-serif text-justify">
                                            {selectedNode.tacticalAnalysis}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-8 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center justify-center gap-2 opacity-40">
                                        <ZapOff size={24} className="text-slate-600" />
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">數據缺失</span>
                                    </div>
                                )}
                            </div>

                            {/* Visual & Lore */}
                            <div className="space-y-6">
                                {selectedNode.visualEffect && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-cyan-500 uppercase tracking-widest">
                                            <Layers size={14} /> 以太視覺
                                        </div>
                                        <div className="p-5 rounded-3xl bg-cyan-950/10 border border-cyan-500/20 font-serif italic text-xs text-cyan-100/80 leading-relaxed">
                                            {selectedNode.visualEffect}
                                        </div>
                                    </div>
                                )}
                                {selectedNode.loreSignificance && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-purple-500 uppercase tracking-widest">
                                            <Fingerprint size={14} /> 世界觀印記
                                        </div>
                                        <div className="p-5 rounded-3xl bg-purple-950/10 border border-purple-500/20 font-serif italic text-xs text-purple-100/80 leading-relaxed">
                                            {selectedNode.loreSignificance}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Affixes */}
                        {selectedNode.affixes && selectedNode.affixes.length > 0 && (
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                    <Sparkles size={14} /> 史詩詞綴 (Affixes)
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedNode.affixes.map((affix, i) => (
                                        <motion.div 
                                            key={i}
                                            whileHover={{ scale: 1.02, y: -2 }}
                                            className={`p-5 rounded-[2rem] border-2 flex flex-col gap-3 transition-all ${getAffixColor(affix.rarity)}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center">
                                                        <Star size={14} className="fill-current" />
                                                    </div>
                                                    <span className="font-black uppercase tracking-tight text-sm">{affix.name}</span>
                                                </div>
                                                <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{affix.rarity}</span>
                                            </div>
                                            <p className="text-xs font-serif italic leading-relaxed opacity-90">{affix.effect}</p>
                                            {affix.stats && Object.keys(affix.stats).length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-3 border-t border-white/10">
                                                    {Object.entries(affix.stats).map(([k, v]) => (
                                                        <div key={k} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/30 border border-white/5">
                                                            {getStatIcon(k)}
                                                            <span className="text-[9px] font-mono font-bold uppercase text-slate-400">{k.substring(0,3)}</span>
                                                            <span className="text-[10px] font-mono font-bold text-white">+{v}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-8 bg-slate-950 border-t border-white/10 flex flex-col gap-4 shrink-0 relative z-10">
                        {selectedNode.unlocked ? (
                            <div className="flex flex-col gap-4">
                                <div className="flex gap-3">
                                    <Button 
                                        onClick={handleUpgrade} 
                                        disabled={selectedNode.level && selectedNode.level >= 5 || skillPoints < (selectedNode.level || 1) * 2} 
                                        className={`flex-1 py-4 rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase transition-all ${selectedNode.level && selectedNode.level >= 5 ? 'bg-orange-900/30 border-orange-500/30 text-orange-400 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_20px_rgba(8,145,178,0.3)]'}`}
                                    >
                                        {selectedNode.level && selectedNode.level >= 5 ? '已達巔峰 (Max Level)' : `升級技能 (Cost: ${(selectedNode.level || 1) * 2} SP)`}
                                    </Button>
                                    {onReforge && (
                                        <Button 
                                            onClick={() => onReforge(selectedNode)} 
                                            disabled={skillPoints < 2} 
                                            className="px-6 rounded-2xl bg-purple-900/40 border border-purple-500/40 hover:bg-purple-800 text-purple-300 transition-all"
                                            title="重構技能詞綴 (2 SP)"
                                        >
                                            <RefreshCcw size={20} />
                                        </Button>
                                    )}
                                </div>
                                
                                {selectedNode.skillType !== 'passive' && (
                                    <div className="flex flex-col md:flex-row gap-4 items-center bg-black/40 p-4 rounded-3xl border border-white/5">
                                        <div className="flex items-center gap-2 shrink-0">
                                            <LayoutGrid size={14} className="text-slate-500" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">快捷鍵分配</span>
                                        </div>
                                        <div className="flex gap-2 w-full">
                                            {[0, 1, 2, 3].map(idx => {
                                                const isAssigned = quickSlots[idx]?.id === selectedNode.id;
                                                return (
                                                    <button 
                                                        key={idx}
                                                        onClick={() => onAssignQuickSlot && onAssignQuickSlot(selectedNode, idx)}
                                                        className={`flex-1 py-2 rounded-xl border text-xs font-mono font-bold transition-all ${isAssigned ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30'}`}
                                                    >
                                                        {idx + 1}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {selectedNode.skillType !== 'passive' && onUseSkill && (
                                    <Button 
                                        onClick={() => onUseSkill(selectedNode)} 
                                        disabled={(selectedNode.currentCooldown || 0) > 0} 
                                        className={`w-full py-5 rounded-2xl font-black tracking-[0.3em] text-sm uppercase transition-all shadow-2xl ${selectedNode.level && selectedNode.level >= 5 ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'}`}
                                    >
                                        {(selectedNode.currentCooldown || 0) > 0 ? `冷卻中 (${selectedNode.currentCooldown}T)` : '即刻具現 (Execute)'}
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <Button 
                                onClick={handleUnlock} 
                                disabled={!isUnlockable(selectedNode, skills) || skillPoints < selectedNode.cost} 
                                className="w-full py-6 rounded-2xl font-black tracking-[0.4em] text-sm bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white disabled:opacity-30 disabled:grayscale transition-all shadow-2xl uppercase"
                            >
                                {isUnlockable(selectedNode, skills) ? `解鎖技能協議 (Cost: ${selectedNode.cost} SP)` : "前置條件未達成 (Locked)"}
                            </Button>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        )}
    </div>
  );
};
