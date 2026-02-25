import React from 'react';
import { Achievement } from '../types';
import { Award, Lock, Calendar, Sword, Heart, Zap, Coins, Map, Skull, Crown, Hammer, Star, Shield, Book, Flag, Backpack, CheckCircle } from 'lucide-react';

export const ACHIEVEMENTS_DATA = [
    { id: 'first_step', title: '旅程的開始', description: '完成第一次行動。', icon: 'Star' },
    { id: 'social_star', title: '萬人迷', description: '與任意 NPC 的好感度達到 100。', icon: 'Heart' },
    { id: 'skill_master', title: '技藝巔峰', description: '將任意技能提升至等級 5 (大師)。', icon: 'Zap' },
    { id: 'rich_man', title: '第一桶金', description: '持有金幣超過 5000 G。', icon: 'Coins' },
    { id: 'explorer', title: '開拓者', description: '探索過 5 個不同的地點。', icon: 'Map' },
    { id: 'survivor', title: '死裡逃生', description: '在 HP 低於 10% 的情況下贏得戰鬥。', icon: 'Skull' },
    { id: 'legendary_hero', title: '傳說之人', description: '獲得一件傳說級 (Legendary) 物品。', icon: 'Crown' },
    { id: 'crafter', title: '造物主', description: '成功合成或重構一件物品。', icon: 'Hammer' },
    { id: 'full_gear', title: '全副武裝', description: '同時裝備頭部、身體、腿部、主手與副手/飾品。', icon: 'Shield' },
    { id: 'polymath', title: '博學多聞', description: '解鎖 8 個不同的技能。', icon: 'Book' },
    { id: 'faction_leader', title: '派系領袖', description: '在任意派系聲望達到 500 點。', icon: 'Flag' },
    { id: 'hoarder', title: '倉鼠症', description: '背包中持有超過 20 件物品。', icon: 'Backpack' },
    { id: 'quest_master', title: '任務達人', description: '完成 3 個任務。', icon: 'CheckCircle' },
];

interface AchievementPanelProps {
    unlockedAchievements: Achievement[];
    onClose?: () => void;
}

export const AchievementPanel: React.FC<AchievementPanelProps> = ({ unlockedAchievements, onClose }) => {
    
    const getIcon = (iconName: string) => {
        switch(iconName) {
            case 'Sword': return <Sword size={24} />;
            case 'Heart': return <Heart size={24} />;
            case 'Zap': return <Zap size={24} />;
            case 'Coins': return <Coins size={24} />;
            case 'Map': return <Map size={24} />;
            case 'Skull': return <Skull size={24} />;
            case 'Crown': return <Crown size={24} />;
            case 'Hammer': return <Hammer size={24} />;
            case 'Star': return <Star size={24} />;
            case 'Shield': return <Shield size={24} />;
            case 'Book': return <Book size={24} />;
            case 'Flag': return <Flag size={24} />;
            case 'Backpack': return <Backpack size={24} />;
            case 'CheckCircle': return <CheckCircle size={24} />;
            default: return <Award size={24} />;
        }
    };

    const sortedAchievements = [...ACHIEVEMENTS_DATA].sort((a, b) => {
        const aUnlocked = unlockedAchievements.some(ua => ua.id === a.id);
        const bUnlocked = unlockedAchievements.some(ub => ub.id === b.id);
        if (aUnlocked && !bUnlocked) return -1;
        if (!aUnlocked && bUnlocked) return 1;
        return 0;
    });

    const unlockedCount = unlockedAchievements.length;
    const totalCount = ACHIEVEMENTS_DATA.length;
    const progress = (unlockedCount / totalCount) * 100;

    return (
        <div className="h-full flex flex-col gap-6 p-4 animate-fade-in">
            <div className="bg-slate-900/80 p-6 rounded-[2rem] border border-yellow-500/30 shadow-lg shrink-0">
                <div className="flex justify-between items-end mb-2">
                    <h2 className="text-2xl font-black text-yellow-400 uppercase tracking-widest flex items-center gap-3">
                        <Award size={28} /> 成就系統
                    </h2>
                    <span className="text-xl font-mono font-bold text-yellow-200">{unlockedCount} / {totalCount}</span>
                </div>
                <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-white/10 shadow-inner">
                    <div 
                        className="h-full bg-gradient-to-r from-yellow-600 to-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.5)] transition-all duration-1000" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                {sortedAchievements.map(achievement => {
                    const unlocked = unlockedAchievements.find(ua => ua.id === achievement.id);
                    return (
                        <div 
                            key={achievement.id} 
                            className={`p-5 rounded-3xl border flex items-center gap-5 transition-all relative overflow-hidden group ${unlocked ? 'bg-yellow-900/20 border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.1)]' : 'bg-slate-900/40 border-white/5 opacity-60 grayscale'}`}
                        >
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border-2 shadow-lg ${unlocked ? 'bg-gradient-to-br from-yellow-600 to-orange-600 border-yellow-300 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                {unlocked ? getIcon(achievement.icon) : <Lock size={24} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className={`text-lg font-black uppercase tracking-tight mb-1 ${unlocked ? 'text-yellow-100' : 'text-slate-500'}`}>
                                    {achievement.title}
                                </h3>
                                <p className="text-xs font-serif italic text-slate-400 leading-relaxed">
                                    {achievement.description}
                                </p>
                                {unlocked && (
                                    <div className="mt-2 flex items-center gap-1 text-[9px] font-mono text-yellow-500/60 uppercase tracking-widest">
                                        <Calendar size={10} />
                                        {new Date(unlocked.unlockedAt).toLocaleDateString()} 解鎖
                                    </div>
                                )}
                            </div>
                            {unlocked && (
                                <div className="absolute top-0 right-0 p-10 bg-yellow-500/10 blur-2xl rounded-full pointer-events-none group-hover:bg-yellow-500/20 transition-colors"></div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
