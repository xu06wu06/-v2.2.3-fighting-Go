
import React, { useEffect } from 'react';
import { Card, Button } from './Layout';
import { 
  BookOpen, User, Backpack, Zap, Users, Scroll, Settings, ArrowRight, CheckCircle2, AlertTriangle, MousePointerClick, Gamepad2
} from 'lucide-react';
import { TabView } from '../types';

interface TutorialOverlayProps {
  step: number;
  onNext: () => void;
  onSkip: () => void;
  onFinish: () => void;
  setActiveTab: (tab: TabView) => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext, onSkip, onFinish, setActiveTab }) => {
  
  // Automatically switch tabs based on the current step
  useEffect(() => {
    switch (step) {
      case 1: setActiveTab('story'); break;
      case 2: setActiveTab('status'); break;
      case 3: setActiveTab('inventory'); break;
      case 4: setActiveTab('skills'); break;
      case 5: setActiveTab('npcs'); break;
      case 6: setActiveTab('quests'); break;
      case 7: setActiveTab('action'); break;
      case 8: setActiveTab('settings'); break;
      default: break;
    }
  }, [step, setActiveTab]);

  const renderContent = () => {
    switch (step) {
      case 0:
        return (
          <>
            <div className="w-20 h-20 bg-cyan-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-cyan-500 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)] animate-pulse">
              <BookOpen size={40} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 text-center">歡迎來到 以太編年史</h2>
            <p className="text-slate-300 text-base mb-8 leading-relaxed text-center">
              這是一個由 AI 驅動的無限文字冒險世界。<br/>
              你的每一個選擇都會即時影響劇情的發展，創造獨一無二的傳奇。
            </p>
          </>
        );
      case 1:
        return (
          <>
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-600 text-slate-200">
              <BookOpen size={32} />
            </div>
            <h2 className="text-xl font-bold text-cyan-400 mb-2 text-center">故事面板 (Story)</h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed text-center">
              這裡是冒險的核心。閱讀日誌了解當前處境。<br/>
              下方有 AI 生成的選項，你可以選擇「莽撞」、「理智」或「搞笑」的風格。<br/>
              <span className="text-yellow-400 font-bold">更棒的是，你可以直接輸入任何你想做的行動！</span>
            </p>
          </>
        );
      case 2:
        return (
          <>
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-600 text-slate-200">
              <User size={32} />
            </div>
            <h2 className="text-xl font-bold text-cyan-400 mb-2 text-center">角色狀態 (Status)</h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed text-center">
              查看你的屬性、裝備與稱號。<br/>
              升級後獲得的屬性點 (Stat Points) 可以在這裡分配，強化你的力量、智力或敏捷等數值。
            </p>
          </>
        );
      case 3:
        return (
          <>
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-600 text-slate-200">
              <Backpack size={32} />
            </div>
            <h2 className="text-xl font-bold text-cyan-400 mb-2 text-center">背包管理 (Inventory)</h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed text-center">
              管理你的物品。點擊物品可以裝備、使用或丟棄。<br/>
              如果你收集了足夠的材料並學會了配方，還可以在這裡進行<span className="text-yellow-400">合成 (Crafting)</span>。
            </p>
          </>
        );
      case 4:
        return (
          <>
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-600 text-slate-200">
              <Zap size={32} />
            </div>
            <h2 className="text-xl font-bold text-cyan-400 mb-2 text-center">技能樹 (Skills)</h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed text-center">
              消耗技能點 (SP) 來學習或升級技能。<br/>
              技能分為主動與被動，高等級的技能甚至會衍生出不同的分支路線！
            </p>
          </>
        );
      case 5:
        return (
          <>
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-600 text-slate-200">
              <Users size={32} />
            </div>
            <h2 className="text-xl font-bold text-cyan-400 mb-2 text-center">NPC 互動</h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed text-center">
              與你在旅途中遇見的角色互動。<br/>
              你可以與他們交易、贈送禮物以提升好感度，或者接取他們的委託。
            </p>
          </>
        );
      case 6:
        return (
          <>
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-600 text-slate-200">
              <Scroll size={32} />
            </div>
            <h2 className="text-xl font-bold text-cyan-400 mb-2 text-center">任務日誌 (Quests)</h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed text-center">
              追蹤你當前的任務目標。<br/>
              完成任務是獲得經驗值與稀有獎勵的主要途徑。
            </p>
          </>
        );
      case 7:
        return (
          <>
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-600 text-slate-200">
              <Gamepad2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-cyan-400 mb-2 text-center">動作模式 (Action)</h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed text-center">
              體驗即時戰鬥！使用 WASD 移動，Z/K 攻擊。<br/>
              將技能分配到快捷鍵 (1-4) 即可在戰鬥中使用。<br/>
              <span className="text-xs text-slate-500">(此模式為實驗性功能，根據當前場景生成關卡)</span>
            </p>
          </>
        );
      case 8:
        return (
          <>
            <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500 text-red-400 animate-bounce">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-red-400 mb-2 text-center">重要：存檔機制</h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed text-center bg-red-950/30 p-4 rounded border border-red-500/30">
              本遊戲<span className="text-red-400 font-bold underline decoration-wavy">不會</span>自動儲存進度到雲端。<br/>
              請務必定期點擊右上角的「下載進度」按鈕，將存檔保存為 JSON 文件。<br/>
              下次遊玩時，在開始畫面選擇「匯入存檔」即可繼續。
            </p>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <Card className="max-w-md w-full relative border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.2)] bg-slate-900/90">
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-800 rounded-t-lg overflow-hidden">
          <div 
            className="h-full bg-cyan-500 transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / 9) * 100}%` }}
          ></div>
        </div>

        <div className="p-6">
          {renderContent()}

          <div className="flex flex-col gap-3 mt-4">
            {step < 8 ? (
              <Button 
                onClick={onNext} 
                className="w-full py-3 text-lg flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-500/20"
              >
                下一步 <ArrowRight size={20} />
              </Button>
            ) : (
              <Button 
                onClick={onFinish} 
                className="w-full py-3 text-lg bg-green-600 hover:bg-green-500 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={20} />
                我明白了，開始冒險！
              </Button>
            )}
            
            <button 
              onClick={onSkip} 
              className="text-xs text-slate-500 hover:text-slate-300 underline py-2 transition-colors"
            >
              跳過教學
            </button>
          </div>
        </div>
        
        <div className="absolute -bottom-12 left-0 w-full text-center text-slate-500 text-xs">
           步驟 {step + 1} / 9
        </div>
      </Card>
    </div>
  );
};
