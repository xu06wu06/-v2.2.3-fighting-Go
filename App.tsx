
import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { 
  GameState, INITIAL_GAME_STATE, TabView, Item, NPC, SkillNode, EquipmentSlots, Stats, LogEntry, StoryOptions, Quest, Location, QuickSlot, Player, StatusEffect
} from './types';
import * as GeminiService from './services/geminiService';
import { resolveCombatRound } from './services/combatService';
import { decideEnemyAction } from './services/enemyAIService';
import { Button, LoadingOverlay, Card, Input } from './components/Layout';
import { StoryPanel } from './components/StoryPanel';
import { TutorialOverlay } from './components/TutorialOverlay';
import { 
  BookOpen, User, Backpack, Zap, Users, Settings, Download, Upload, Award, Crown, Dices, Scroll, X, RefreshCcw, Sparkles as SparklesIcon, ImageIcon, Clock, Globe, Coins, ShoppingCart, Lock, ArrowRight, Play, Sun, Moon, Pause, HardDrive, Gauge, ShieldAlert, Skull, Shuffle, Trash2, Cloud, CloudUpload, CloudDownload, CheckCircle2, Save, FileDown, AlertCircle, Gamepad2, Package
} from 'lucide-react';

const Inventory = lazy(() => import('./components/Inventory').then(module => ({ default: module.Inventory })));
const SkillTree = lazy(() => import('./components/SkillTree').then(module => ({ default: module.SkillTree })));
const NPCPanel = lazy(() => import('./components/NPCPanel').then(module => ({ default: module.NPCPanel })));
const QuestPanel = lazy(() => import('./components/QuestPanel').then(module => ({ default: module.QuestPanel })));
const CharacterCard = lazy(() => import('./components/CharacterCard').then(module => ({ default: module.CharacterCard })));
const ActionGamePanel = lazy(() => import('./components/ActionGamePanel').then(module => ({ default: module.ActionGamePanel })));
import { AchievementPanel, ACHIEVEMENTS_DATA } from './components/AchievementPanel';

const MAX_LOG_HISTORY = 100; 

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center flex-1 min-w-[60px] p-2 rounded-lg transition-all active:scale-95 shrink-0 ${active ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
    >
        <div className={`mb-1 transition-transform ${active ? 'scale-110' : ''}`}>{icon}</div>
        <span className="text-[10px] font-bold tracking-wide whitespace-nowrap">{label}</span>
    </button>
);

const App: React.FC = () => {
  const sanitizeState = (loaded: any): GameState => {
    const base = { ...INITIAL_GAME_STATE };
    if (!loaded) return base;

    return {
      ...base,
      ...loaded,
      player: {
        ...base.player,
        ...(loaded.player || {}),
        hp: loaded.player?.hp ?? base.player.hp,
        maxHp: loaded.player?.maxHp ?? base.player.maxHp,
        stats: { ...base.player.stats, ...(loaded.player?.stats || {}) },
        equipment: { ...base.player.equipment, ...(loaded.player?.equipment || {}) },
        statusEffects: Array.isArray(loaded.player?.statusEffects) ? loaded.player.statusEffects : [],
        appearance: loaded.player?.appearance || base.player.appearance,
        backgroundStory: loaded.player?.backgroundStory || base.player.backgroundStory,
        traits: Array.isArray(loaded.player?.traits) ? loaded.player.traits : base.player.traits
      },
      inventory: Array.isArray(loaded.inventory) ? loaded.inventory : [],
      skills: Array.isArray(loaded.skills) ? loaded.skills : [],
      quests: Array.isArray(loaded.quests) ? loaded.quests : [],
      npcs: Array.isArray(loaded.npcs) ? loaded.npcs : [],
      pets: Array.isArray(loaded.pets) ? loaded.pets : [], 
      logs: Array.isArray(loaded.logs) ? loaded.logs : [],
      visitedLocations: Array.isArray(loaded.visitedLocations) ? loaded.visitedLocations : [],
      achievements: Array.isArray(loaded.achievements) ? loaded.achievements : [],
      recipes: Array.isArray(loaded.recipes) ? loaded.recipes : [],
      quickSlots: Array.isArray(loaded.quickSlots) ? loaded.quickSlots : [null, null, null, null],
      tutorialCompleted: loaded.tutorialCompleted ?? false,
      tutorialStep: loaded.tutorialStep ?? 0,
      gameTime: loaded.gameTime || { day: 1, hour: 8, minute: 0 },
      notificationsEnabled: loaded.notificationsEnabled ?? true,
      fastMode: loaded.fastMode ?? true,
      generateStoryImages: loaded.generateStoryImages ?? true,
    };
  };

  const [gameState, setGameState] = useState<GameState>(() => {
    return sanitizeState(null);
  });
  
  const [activeTab, setActiveTab] = useState<TabView>('story');
  const [rightPanelTab, setRightPanelTab] = useState<'inventory' | 'skills' | 'status' | 'quests'>('inventory');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<number>(0);
  const [selectedNPCId, setSelectedNPCId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');

  const [showShop, setShowShop] = useState(false);
  const [showGodMode, setShowGodMode] = useState(false);
  const [godModePassword, setGodModePassword] = useState('');
  const [godModeData, setGodModeData] = useState('');
  const [isGodModeUnlocked, setIsGodModeUnlocked] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);
  const [showSetup, setShowSetup] = useState(!gameState.logs.length); 
  const [setupWorld, setSetupWorld] = useState('');
  const [setupName, setSetupName] = useState('');
  const [setupChar, setSetupChar] = useState('');
  const [setupGender, setSetupGender] = useState<'Male'|'Female'|'Other'>('Male');
  const [setupSkills, setSetupSkills] = useState('');
  const [setupItems, setSetupItems] = useState('');
  const [setupDifficulty, setSetupDifficulty] = useState<string>('Medium');
  const [setupGameMode, setSetupGameMode] = useState<string>('正常模式');
  const [setupFastMode, setSetupFastMode] = useState<boolean>(true); 
  const [setupGenerateImages, setSetupGenerateImages] = useState<boolean>(true);
  const [setupHairstyle, setSetupHairstyle] = useState('');
  const [setupEyeColor, setSetupEyeColor] = useState('');
  const [setupClothingStyle, setSetupClothingStyle] = useState('');
  const [setupBackgroundStory, setSetupBackgroundStory] = useState('');
  const [setupTraits, setSetupTraits] = useState('');
  const [setupRace, setSetupRace] = useState('');
  const [setupProfession, setSetupProfession] = useState('');
  const [setupStylePrompt, setSetupStylePrompt] = useState('Anime Light Novel Style');
  const [setupStats, setSetupStats] = useState<Stats>({ strength: 5, intelligence: 5, agility: 5, charisma: 5, luck: 5, endurance: 5 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gameModeDescriptions: Record<string, string> = {
      '正常模式': '標準的難度和資源平衡，體驗原汁原味的冒險。',
      'GM模式': '全能的神，主宰一切。所有資源無限，屬性頂尖，你就是這個世界的造物主。',
      '這很好！極限應對！模式': '強調臨機應變，玩家必須使用手邊僅有的奇怪工具解決大危機。風格荒謬且熱血。',
      '印度模式': '充滿寶萊塢風格的歌舞、誇張的物理效果、慢動作特寫以及違反地心引力的動作場面。',
      '類銀河惡魔城模式': '強調地圖探索、解鎖能力以通過障礙、非線性敘事與隱藏房間。',
      '成本五百億模式': '極度奢華的形容詞，強調場面的宏大、特效的華麗，彷彿每一幀展開燃燒經費。',
      '屎尿屁模式': '充滿低級趣味、排泄物相關的笑話與噁心的描述。',
      '美爆了模式': '極度唯美，強調光影、色彩與角色的美貌，如同藝術電影。',
      '初音未來模式': '世界充滿蔥綠色，背景音樂是電子音，NPC 說話帶有機械感，充滿二次元歌姬元素。',
      '美式英雄模式': '充滿美漫風格，強調個人英雄主義、緊身衣、肌肉線條與誇張的狀聲詞 (BOOM! POW!)。',
      '考試模式': '所有戰鬥與對話都變成考試題目，需要邏輯推理或回答知識問題才能過關。',
      'no game no life模式': '禁止一切暴力，所有爭端都必須透過「遊戲」來解決，強調智鬥與規則。',
      'EVA模式': '充滿宗教隱喻、巨大的生物兵器、心理創傷與暴走，氣氛壓抑且哲學。',
      '肉鴿模式': '強調隨機性，死亡後會失去大部分物品，但獲得永久強化，劇情碎片化。',
      '性轉模式': '玩家與 NPC 的性別全部反轉，強調性別反轉後的互動與反差萌。',
      '惡墮模式': '強調純潔的主角逐漸被世界的惡意侵蝕、墮落的過程，風格陰陰煽情。',
      '關門！放狗！一個不留！模式': '極度暴力，強調爽快殺戮，敵人數量極多，如同無雙遊戲。',
      '天下地下唯我獨尊模式': '主角性格極度狂妄，實力碾壓一切，所有人都必須膜拜主角。',
      '來我萬魂帆一聚模式': '修仙魔道風格，將敵人煉化為法寶，強調弱弱強食與修真的殘酷。',
      'FPS模式': '第一人稱射擊視覺，強調槍械型號、換彈動作、戰術掩護與爆頭。',
      '正宗RPG模式': '強調回合制戰鬥、數值堆疊、打怪升級、勇者鬥惡龍式的王道劇情。',
      '原神模式': '強調元素反應、開放世界探索、抽卡(雖然是文字模擬)、派蒙式的嚮導。',
      '閒暇模式': '節奏極慢，強調享受生活、釣魚、發呆、看風景，沒有緊迫的主線。',
      '仙俠模式': '御劍飛行、煉丹、渡劫、宗宗門鬥爭，充滿東方玄幻色彩。',
      '你要不要聽聽你現在在說什麼？模式': '對話充滿邏輯謬誤與廢話，讓人忍不住吐槽，充滿迷因感。',
      'QQㄋㄟㄋㄟ好喝到咩噗茶模式': '充滿台灣手搖飲文化、可愛的疊字與無厘頭的年輕用語。',
      '劍與魔法模式': '最傳統的西幻風格，騎士、法師、龍與地下城。',
      '絕區零模式': '強調都市潮流、復古電視美學、高速戰鬥與繩匠的特殊身份。',
      '絕對安全模式': '玩家擁有絕對防禦，永遠不會死亡，適合只想看劇情的玩家。',
      '休閒模式': '資源豐富，戰鬥簡單，輕鬆享受遊戲樂趣。',
      'Q版模式': '所有描述和圖像都將變得可愛有趣，充滿童趣。',
      '無敵是多麼寂寞模式': '初始能力極高，一擊必殺，體驗碾壓一切的快感。',
      '可愛即時正義模式': '所有怪物和NPC都變成萌系生物，戰鬥是為了守護可愛。',
      '古風描述': '使用文言文或武俠風格的語言進行敘事，古色古香。',
      '別玩了吧模式': '極度困難，充滿惡意，幾乎不可能通關，挑戰你的極限。',
      '美食之旅模式': '專注於尋找和製作美食，戰鬥可以轉化為食材獲取。',
      '我還是喜歡你桀喚不馴的樣子模式': 'NPC態度傲慢，充滿挑戰性，需要用實力說話。',
      '搞怪模式': '隨機事件頻發，目標是讓你開懷大笑。',
      '歡愉模式': '運氣極佳，獎勵豐厚，劇情輕鬆愉快，適合放鬆。',
      '神模式': '全知全能，可以隨意修改現實，真正的神之視角。',
      '大富翁模式': '所有事件都圍繞金錢，擲骰子決定命運，可以買下土地和城市。',
      '無敵有錢模式': '初始金幣無限，體驗揮金如土的快感，用錢解決一切問題。',
      '地球online模式': '極度寫實，沒有魔法，只有現實的壓力和房貸，硬核生存。',
      '刀劍神域模式': '死亡即刪檔，困在遊戲世界中，必須通關才能登出。',
      '~``|√π÷••``π÷÷•||~¥π×√•`~`模式': 'Glitch Mode，世界崩壞，充滿亂碼與不可名狀的錯誤。',
      '百倍時間加速模式': '時間流逝極快，一天等於現實的一秒，滄海桑田轉瞬即逝。',
      '星穹列車模式': '搭乘列車穿梭於不同星球之間，開拓未知的星系。',
      '登出鍵？沒有的呦～親♡⁠～模式': '被困在遊戲裡，GM 是個病嬌，隨時監視著你。',
      '養女兒模式': '遊戲目標變成將一位少女撫養長大，充滿溫馨與父愛。',
      'DLC模式': '所有內容都需要「解鎖」，諷刺現代遊戲的付費機制。',
      '原始資料模式': '介面極極簡，直接與數據庫對話，看穿世界的本質。',
      '我要吃飯！！！模式': '飢餓度下降極快，一切為了尋找食物，變身美食獵人。',
      '將大局逆轉吧！開！模式': '總是從絕境開始，必須利用智謀逆轉勝。',
      '規則類模式': '世界充滿奇怪的規則（怪談），必須遵守否則會被抹殺。',
      '唱歌模式': '所有對話和攻擊都必須用唱的，音樂戰鬥。',
      '魂系模式': '敵人極度強大，死亡是家常便飯，碎片化敘事。',
      'JOJO的奇幻冒險模式': '畫風突變，充滿替身使者與誇張的姿勢，歐拉歐拉！',
      '極限模式類型': '資源極度豐富，受傷無法自然恢復，考驗極限生存。',
      '惡趣味類型': '充滿製作者的惡意玩笑與陷阱，不要相信任何人。',
      '歐尼醬♡⁠～模式': '所有 NPC 都變成妹妹屬性，充滿撒嬌與依賴。',
      '地獄梗模式': '充滿黑色幽默與不正確的笑話，地獄空蕩蕩，魔鬼在人間。',
      '霹靂宇宙超級無敵霹靂難模式': '難度係數爆表，專為受虐狂設計。',
      '看光光嘍模式': '擁有透視眼，可以看到隱藏的秘密、寶箱與...其他東西。',
      '看廣告復活模式': '死亡後可以看廣告（模擬）復活，充滿手遊即視感。',
      '黃粱一夢模式': '經歷一生後醒來發現只是一場夢，虛無主義。',
      '壓勒壓勒模式': '主角是無敵的高中生，口頭禪是「真是夠了」，充滿無敵流的淡定。',
      '詭異模式': '充滿不可名狀的恐怖與異常現象 (克蘇魯風格)。',
      '全都是美少女爽啦！模式': '所有角色都會被娘化成美少女，後宮向。',
      '我跟你心連心，你跟我玩腦筋模式': '極度燒腦的解謎與心理戰，充滿欺騙。',
      '戀愛模擬器模式': '專注於攻略角色，好感度系統更加細緻，戀愛視覺小說。',
      '日記模式': '以寫日記的方式進行遊戲，注重內心獨白與紀錄。',
      '直播模式': '模擬直播主視覺，會有觀眾彈幕互動，需要取悅觀眾。',
      'APP模式': '遊戲介面與互動方式模擬手機 APP，像是在玩文字通訊軟體。',
      '此子斷不可留模式': 'NPC 對玩家充滿敵意，隨時想除掉玩家，舉世皆敵。',
      '模式模式': '一個非常普通、沒有特點的模式，甚至有點無聊。',
      '好奇心會害死貓，但我就想當那隻貓模式': '充滿致命陷阱，但誘惑巨大的秘密。',
      '媽媽我戀愛了模式': '容易對 NPC 一見腫情，劇情極度肉麻，戀愛腦全開。',
      '夢境模式': '邏輯混亂，場景跳躍，充滿象徵意義，分不清現實與夢境。',
      '台灣模式': '充滿台灣在地元素、梗、美食與文化。',
      'vtuber模式': '玩家扮演 Vtuber，需要經營中之人與皮套的關係。',
      '媽媽我要娶她模式': '看到任何角色都想求婚的瘋狂求愛模式。',
      '講幹話模式': '對話選項充滿廢話、幹話與幽默，不正經的冒險。',
      '繪圖模式': '強調場景描寫，AI 生成圖片頻率變高，如同繪本。',
      '漫畫模式': '嘗試以漫畫分鏡的方式描述劇情，充滿狀聲詞。'
  };

  const saveGameToStorage = async (state: GameState, notify = false) => {
    setSyncStatus('syncing');
    await new Promise(resolve => setTimeout(resolve, 500));
    setSyncStatus('synced');
    if (notify) showNotification("狀態同步成功，請記得下載存檔");
    setTimeout(() => setSyncStatus('idle'), 2000);
  };

  const vacuumLogs = () => {
    if (confirm("這將移除所有過往的冒險日誌圖片與 90% 的對話文本，僅保留最後 5 條紀錄以減少存檔體積。確定執行？")) {
        setGameState(prev => {
            const newLogs = prev.logs.slice(-5).map(l => {
                const { imageUrl, ...rest } = l;
                return rest as LogEntry;
            });
            const newState = { ...prev, logs: newLogs };
            showNotification("日誌數據已壓縮，建議立即下載存檔。");
            return newState;
        });
    }
  };

  const showNotification = (msg: string) => {
      if (!gameState.notificationsEnabled) return;
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
  };

  const mergeNewItems = (currentInventory: Item[], newItems: Item[]) => {
      const updatedInventory = [...(currentInventory || [])];
      
      newItems.forEach(newItem => {
          const stackable = newItem.type === 'consumable' || newItem.type === 'material' || newItem.type === 'misc' || newItem.type === 'food';
          const existingItemIndex = updatedInventory.findIndex(
              i => i.name === newItem.name && i.type === newItem.type && stackable
          );

          if (existingItemIndex > -1) {
              updatedInventory[existingItemIndex] = {
                  ...updatedInventory[existingItemIndex],
                  quantity: (updatedInventory[existingItemIndex].quantity || 1) + (newItem.quantity || 1),
                  isNew: true 
              };
          } else {
              updatedInventory.push({ 
                  ...newItem, 
                  quantity: newItem.quantity || 1,
                  isNew: true 
              });
          }
      });
      return updatedInventory;
  };

  const handleBuyItemFromNPC = (npcId: string, item: Item) => {
      const price = item.price || (item.rarity === 'legendary' ? 2000 : item.rarity === 'epic' ? 500 : item.rarity === 'rare' ? 150 : 50);
      if (gameState.player.gold < price && gameState.gameMode !== 'GM模式') {
          showNotification("金幣不足");
          return;
      }
      setGameState(prev => {
          const npc = prev.npcs.find(n => n.id === npcId);
          if (!npc || !npc.inventory) return prev;
          
          const updatedNpcInv = npc.inventory.filter(i => i.id !== item.id);
          const updatedPlayerInv = mergeNewItems(prev.inventory, [{ ...item, quantity: 1, isNew: true }]);
          
          return {
              ...prev,
              player: { ...prev.player, gold: prev.player.gold - (prev.gameMode === 'GM模式' ? 0 : price) },
              inventory: updatedPlayerInv,
              npcs: prev.npcs.map(n => n.id === npcId ? { ...n, inventory: updatedNpcInv } : n)
          };
      });
      showNotification(`購入了 ${item.name}`);
  };

  const handleSellItemToNPC = (npcId: string, item: Item) => {
      const basePrice = item.price || (item.rarity === 'legendary' ? 2000 : item.rarity === 'epic' ? 500 : item.rarity === 'rare' ? 150 : 50);
      const sellPrice = Math.floor(basePrice * 0.5);
      
      setGameState(prev => {
          const playerItemIdx = prev.inventory.findIndex(i => i.id === item.id);
          if (playerItemIdx === -1) return prev;

          let updatedPlayerInv = [...prev.inventory];
          if (updatedPlayerInv[playerItemIdx].quantity > 1) {
              updatedPlayerInv[playerItemIdx] = { ...updatedPlayerInv[playerItemIdx], quantity: updatedPlayerInv[playerItemIdx].quantity - 1 };
          } else {
              updatedPlayerInv.splice(playerItemIdx, 1);
          }

          const npc = prev.npcs.find(n => n.id === npcId);
          const updatedNpcInv = mergeNewItems(npc?.inventory || [], [{ ...item, quantity: 1 }]);

          return {
              ...prev,
              player: { ...prev.player, gold: prev.player.gold + sellPrice },
              inventory: updatedPlayerInv,
              npcs: prev.npcs.map(n => n.id === npcId ? { ...n, inventory: updatedNpcInv } : n)
          };
      });
      showNotification(`出售了 ${item.name} (+${sellPrice} G)`);
  };

  useEffect(() => {
    if (activeTab !== 'skills' || isPaused || loading) return;

    const enrichSkills = async () => {
        const skillsToEnrich = gameState.skills.filter(s => 
            s.unlocked && (!s.iconUrl || (s.skillType === 'active' && !s.tacticalAnalysis))
        );

        if (skillsToEnrich.length === 0) return;
        const target = skillsToEnrich[0];
        
        try {
            let updatedSkill = { ...target };
            let hasUpdate = false;

            if (gameState.generateStoryImages && !target.iconUrl) {
                const style = gameState.player.appearance?.stylePrompt || "Anime Light Novel Style";
                const updatedIcon = await GeminiService.generateImage(`Skill icon: ${target.name}. ${target.description}`, 'icon', style);
                updatedSkill.iconUrl = updatedIcon;
                hasUpdate = true;
            }

            if (target.skillType === 'active' && !target.tacticalAnalysis) {
                const analysis = await GeminiService.analyzePlayerSkillTactics(target, gameState.worldSetting);
                updatedSkill.tacticalAnalysis = analysis;
                hasUpdate = true;
            }

            if (hasUpdate) {
                setGameState(prev => {
                    const nextSkills = prev.skills.map(s => 
                        s.id === target.id ? updatedSkill : s
                    );
                    return { ...prev, skills: nextSkills };
                });
            }
        } catch (e) {
            console.error("Skill enrichment failed", e);
        }
    };

    const timer = setTimeout(enrichSkills, 2000); 
    return () => clearTimeout(timer);
  }, [activeTab, gameState.skills, isPaused, loading, gameState.generateStoryImages, gameState.player.appearance?.stylePrompt, gameState.worldSetting]);

  useEffect(() => {
    if (activeTab !== 'bag' || isPaused || loading) return;

    const enrichItems = async () => {
        const itemsToEnrich = gameState.inventory.filter(i => 
            !i.iconUrl
        );

        if (itemsToEnrich.length === 0) return;
        const target = itemsToEnrich[0];
        
        try {
            if (gameState.generateStoryImages) {
                const style = gameState.player.appearance?.stylePrompt || "Anime Light Novel Style";
                const updatedIcon = await GeminiService.generateImage(target.name, 'icon', style);

                setGameState(prev => {
                    const nextInventory = prev.inventory.map(i => 
                        i.id === target.id ? { ...i, iconUrl: updatedIcon } : i
                    );
                    return { ...prev, inventory: nextInventory };
                });
            }
        } catch (e) {
            console.error("Item enrichment failed", e);
        }
    };

    const timer = setTimeout(enrichItems, 2000); 
    return () => clearTimeout(timer);
  }, [activeTab, gameState.inventory, isPaused, loading, gameState.generateStoryImages, gameState.player.appearance?.stylePrompt]);

  const handleRegenerateItemIcons = () => {
      if (!confirm("確定要重新生成所有物品的圖標嗎？這將花費一些時間。")) return;
      
      setGameState(prev => ({
          ...prev,
          inventory: prev.inventory.map(i => ({ ...i, iconUrl: undefined }))
      }));
      showNotification("已將所有物品圖標重置，系統將在背景重新繪製...");
  };

  const handleRegenerateSkillIcons = () => {
      if (!confirm("確定要重新生成所有已解鎖技能的圖標嗎？這將花費一些時間。")) return;
      
      setGameState(prev => ({
          ...prev,
          skills: prev.skills.map(s => s.unlocked ? { ...s, iconUrl: undefined } : s)
      }));
      showNotification("已將所有技能圖標重置，系統將在背景重新繪製...");
  };

  const totalStats = useMemo(() => {
      const final = { ...gameState.player.stats };
      const equip = gameState.player.equipment;
      const items = gameState.inventory || [];
      const skills = gameState.skills || [];

      Object.values(equip).forEach(id => {
          if (!id) return;
          const item = items.find(i => i.id === id);
          if (item && (item.durability === undefined || item.durability > 0)) {
              if (item.stats) {
                  Object.entries(item.stats).forEach(([k, v]) => {
                      if (v) final[k as keyof Stats] += v;
                  });
              }
              item.affixes?.forEach(affix => {
                  if (affix.stats) {
                      Object.entries(affix.stats).forEach(([k, v]) => {
                          if (v) final[k as keyof Stats] += v;
                      });
                  }
              });
          }
      });

      skills.filter(s => s.unlocked).forEach(skill => {
          skill.affixes?.forEach(affix => {
              if (affix.stats) {
                  Object.entries(affix.stats).forEach(([k, v]) => {
                      if (v) final[k as keyof Stats] += v;
                  });
              }
          });
      });

      const activeTitle = gameState.player.titles.find(t => t.id === gameState.player.activeTitleId);
      if (activeTitle?.bonus) {
          Object.entries(activeTitle.bonus).forEach(([k, v]) => {
              if (v) final[k as keyof Stats] += v;
          });
      }

      return final;
  }, [gameState.player.stats, gameState.player.equipment, gameState.inventory, gameState.skills, gameState.player.activeTitleId]);

  const currentMaxHp = useMemo(() => {
      const baseHp = 100;
      const enduranceMultiplier = 10;
      return baseHp + (totalStats.endurance * enduranceMultiplier);
  }, [totalStats.endurance]);

  useEffect(() => {
      if (currentMaxHp !== gameState.player.maxHp) {
          setGameState(prev => ({
              ...prev,
              player: { ...prev.player, maxHp: currentMaxHp }
          }));
      }
  }, [currentMaxHp]);

  const formattedTime = useMemo(() => {
      const { day, hour, minute } = gameState.gameTime;
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      return `Day ${day} ${h}:${m}`;
  }, [gameState.gameTime]);

  const isNight = gameState.gameTime.hour < 6 || gameState.gameTime.hour >= 18;

  useEffect(() => {
      setGameState(prev => {
          if (!prev.visitedLocations.some(loc => loc.id === prev.currentLocation.id)) {
              return { ...prev, visitedLocations: [...prev.visitedLocations, prev.currentLocation] };
          }
          return prev;
      });
  }, [gameState.currentLocation]);

  const handleRefresh = () => {
      setRefreshKey(prev => prev + 1);
      showNotification("介面緩存已清理");
  };

  const handlePause = () => {
      if (!isPaused) {
          setIsPaused(true);
          setPauseStartTime(Date.now());
      } else {
          setIsPaused(false);
          if (gameState.inCombat && gameState.combatStartTime) {
              const pausedDuration = Date.now() - pauseStartTime;
              setGameState(prev => ({
                  ...prev,
                  combatStartTime: (prev.combatStartTime || 0) + pausedDuration
              }));
          }
      }
  };

  const advanceTime = (minutes: number) => {
      setGameState(prev => {
          let { day, hour, minute } = prev.gameTime;
          minute += minutes;
          while (minute >= 60) {
              minute -= 60;
              hour += 1;
          }
          while (hour >= 24) {
              hour -= 24;
              day += 1;
          }
          
          // Stamina Regeneration: 1 point per 2 minutes
          const staminaRegen = Math.floor(minutes * 0.5);
          const newStamina = Math.min(prev.player.maxStamina, prev.player.stamina + staminaRegen);
          
          return { ...prev, gameTime: { day, hour, minute }, player: { ...prev.player, stamina: newStamina } };
      });
  };

  const calculateRequiredExp = (level: number) => Math.floor(100 * Math.pow(level, 1.5));



  const handleTutorialNext = () => {
      setGameState(prev => ({ ...prev, tutorialStep: prev.tutorialStep + 1 }));
  };

  const handleTutorialSkip = () => {
      setGameState(prev => ({ ...prev, tutorialCompleted: true }));
  };

  const handleTutorialFinish = () => {
      setGameState(prev => ({ ...prev, tutorialCompleted: true }));
  };



  const handleRandomSetup = async (type: 'world' | 'character') => {
      setLoading(true);
      setLoadingMsg(`正在生成隨機${type === 'world' ? '世界' : '角色'}設定...`);
      try {
          const result = await GeminiService.generateRandomSetup(
              type, 
              setupWorld, 
              setupGender,
              setupDifficulty,
              setupGameMode
          );
          
          if (type === 'world') {
              setSetupWorld(typeof result === 'string' ? result : JSON.stringify(result));
          } else {
              if (typeof result === 'object') {
                  setSetupName(result.name || '');
                  setSetupChar(result.setting || '');
                  setSetupSkills(result.skills || '');
                  setSetupItems(result.items || '');
                  setSetupHairstyle(result.hairstyle || '');
                  setSetupEyeColor(result.eyeColor || '');
                  setSetupClothingStyle(result.clothingStyle || '');
                  setSetupBackgroundStory(result.backgroundStory || '');
                  setSetupTraits(result.traits || '');
                  setSetupStylePrompt(result.stylePrompt || 'Anime Light Novel Style');
                  if (result.race) setSetupRace(result.race);
                  if (result.profession) setSetupProfession(result.profession);
                  if (result.stats) setSetupStats(result.stats);
              } else {
                  setSetupChar(String(result));
              }
          }
      } catch (e) {
          console.error(e);
      }
      setLoading(false);
  };

  const handleSurpriseMe = async () => {
    setLoading(true);
    setLoadingMsg("正在編織命運的絲線 (Surprise Me)...");
    try {
        const result = await GeminiService.generateSurpriseMeSetup(setupDifficulty, setupGameMode, setupGender);
        setSetupWorld(result.world);
        setSetupName(result.name);
        setSetupChar(result.character);
        setSetupSkills(result.skills);
        setSetupItems(result.items);
        const finalData = { 
            ...result, 
            gender: setupGender,
            difficulty: setupDifficulty, 
            gameMode: setupGameMode 
        };
        startAdventureWithData(finalData);
    } catch (e) {
        console.error(e);
        showNotification("命運編織失敗，請重試。");
        setLoading(false);
    }
  };

  const startAdventureWithData = async (data: any) => {
      setLoading(true);
      setLoadingMsg("正在解析冒險者基因...");
      
      let newGameState = { 
          ...INITIAL_GAME_STATE, 
          worldSetting: data.world, 
          characterSetting: data.character,
          characterSkills: data.skills,
          characterSkillsRefined: false,
          characterSkillsRefinedAt: 0,
          characterStartingItems: data.items,
          player: { 
            ...INITIAL_GAME_STATE.player, 
            name: data.name || setupName || "無名英雄", 
            description: data.character, 
            gender: data.gender as any,
            backgroundStory: data.backgroundStory,
            race: data.race || INITIAL_GAME_STATE.player.race || "Human",
            profession: data.profession || INITIAL_GAME_STATE.player.profession || "Adventurer",
            appearance: {
              hairstyle: data.hairstyle || INITIAL_GAME_STATE.player.appearance?.hairstyle || "普通",
              eyeColor: data.eyeColor || INITIAL_GAME_STATE.player.appearance?.eyeColor || "黑色",
              clothingStyle: data.clothingStyle || INITIAL_GAME_STATE.player.appearance?.clothingStyle || "冒險者便裝",
              stylePrompt: data.stylePrompt || INITIAL_GAME_STATE.player.appearance?.stylePrompt || "Anime Light Novel Style"
            },
            traits: data.traits ? (typeof data.traits === 'string' ? data.traits.split(',').map((t: string) => t.trim()) : data.traits) : [],
            stats: data.stats || INITIAL_GAME_STATE.player.stats
          },
          gold: 1000, 
          difficulty: data.difficulty as any,
          gameMode: data.gameMode,
          fastMode: setupFastMode,
          generateStoryImages: setupGenerateImages
      };

      if (data.gameMode.includes('有錢') || data.gameMode.includes('大富翁')) {
          newGameState.player.gold = 10000000;
          newGameState.player.skillPoints += 10;
      }
      if (data.gameMode.includes('無敵') || data.gameMode.includes('神') || data.gameMode === 'GM模式') {
          newGameState.player.stats = {
              strength: data.gameMode === 'GM模式' ? 999 : 100, 
              intelligence: data.gameMode === 'GM模式' ? 999 : 100, 
              agility: data.gameMode === 'GM模式' ? 999 : 100,
              charisma: data.gameMode === 'GM模式' ? 999 : 100, 
              luck: data.gameMode === 'GM模式' ? 999 : 100, 
              endurance: data.gameMode === 'GM模式' ? 999 : 100
          };
          newGameState.player.level = data.gameMode === 'GM模式' ? 999 : 99;
          newGameState.player.skillPoints = data.gameMode === 'GM模式' ? 99999 : 99;
          newGameState.player.maxHp = data.gameMode === 'GM模式' ? 999999 : 9999;
          newGameState.player.hp = newGameState.player.maxHp;
          newGameState.player.maxMp = data.gameMode === 'GM模式' ? 999999 : 9999;
          newGameState.player.mp = newGameState.player.maxMp;
          if (data.gameMode === 'GM模式') newGameState.player.gold = 999999999;
      }

      try {
          setLoadingMsg("正在構建量子場域...");
          const [parsedSetup, response] = await Promise.all([
              GeminiService.parseInitialSetup(data.world, data.character, data.skills || "", data.items || "", newGameState.player),
              GeminiService.generateIntroStory(newGameState)
          ]);
          
          // Only overwrite stats if they are default and we have AI generated ones
          const isDefaultStats = JSON.stringify(data.stats) === JSON.stringify(INITIAL_GAME_STATE.player.stats);
          if (isDefaultStats && parsedSetup.initialStats) {
              newGameState.player.stats = parsedSetup.initialStats;
          }

          if (parsedSetup.resistances) {
              newGameState.player.resistances = parsedSetup.resistances;
          }
          if (parsedSetup.weaknesses) {
              newGameState.player.weaknesses = parsedSetup.weaknesses;
          }

          if (parsedSetup.skills && parsedSetup.skills.length > 0) {
              const structuredSkills = parsedSetup.skills.map((s: any) => ({
                  ...s,
                  id: crypto.randomUUID(),
                  unlocked: true,
                  parentId: 'root',
                  cost: 0,
                  level: s.level || 1,
                  cooldown: s.cooldown || 3,
                  currentCooldown: 0,
              }));
              newGameState.skills = [...newGameState.skills, ...structuredSkills];
          }

          if (parsedSetup.items && parsedSetup.items.length > 0) {
              const structuredItems = parsedSetup.items.map((i: any) => ({
                  ...i,
                  id: crypto.randomUUID(),
                  rarity: i.rarity || 'common',
                  quantity: i.quantity || 1,
                  isNew: true,
                  durability: 100,
                  maxDurability: 100
              }));
              newGameState.inventory = structuredItems;
          }

          const newLogId = crypto.randomUUID();
          const startLoc: Location = { 
            ...newGameState.currentLocation, 
            description: response.sceneDescription,
          };

          const newLog: LogEntry = {
              id: newLogId,
              text: response.narrative,
              type: 'narrative',
              timestamp: Date.now(),
              options: response.options
          };
          
          const finalState: GameState = {
              ...newGameState,
              logs: [newLog],
              currentLocation: startLoc,
              visitedLocations: [startLoc],
              tutorialCompleted: false, 
              tutorialStep: 0
          };

          setGameState(finalState);
          setShowSetup(false);
          setLoading(false); 

          const shouldGenImage = newGameState.generateStoryImages !== false;
          if (shouldGenImage) {
              const style = newGameState.player.appearance?.stylePrompt || "Anime Light Novel Style";
              Promise.all([
                  GeminiService.generateImage(response.sceneDescription, 'scene', style),
                  GeminiService.generateImage(`Anime style portrait: ${newGameState.player.gender} character, ${newGameState.characterSetting}`, 'portrait', style),
                  GeminiService.generateImage(response.sceneDescription, 'background', style)
              ]).then(([sceneImg, avatarUrl, bgUrl]) => {
                  setGameState(prev => ({
                      ...prev,
                      player: { ...prev.player, avatarUrl },
                      backgroundImageUrl: bgUrl,
                      logs: prev.logs.map(l => l.id === newLogId ? { ...l, imageUrl: sceneImg } : l)
                  }));
              });

              finalState.inventory.forEach(item => {
                  GeminiService.generateImage(item.name, 'icon', style).then(url => {
                      setGameState(prev => ({
                          ...prev,
                          inventory: prev.inventory.map(i => i.id === item.id ? { ...i, iconUrl: url } : i)
                      }));
                  });
              });
          }
      } catch (e) {
          console.error(e);
          setLoading(false);
      }
  };

  const handleStartGame = async () => {
      if(!setupWorld || !setupChar) return;
      startAdventureWithData({
          world: setupWorld,
          character: setupChar,
          skills: setupSkills,
          items: setupItems,
          name: setupName,
          gender: setupGender,
          difficulty: setupDifficulty,
          gameMode: setupGameMode,
          hairstyle: setupHairstyle,
          eyeColor: setupEyeColor,
          clothingStyle: setupClothingStyle,
          backgroundStory: setupBackgroundStory,
          traits: setupTraits,
          race: setupRace,
          profession: setupProfession,
          stylePrompt: setupStylePrompt,
          stats: setupStats
      });
  };

  const decreaseDurability = (inv: Item[], equipped: EquipmentSlots) => {
      const updatedInv = [...inv];
      const equippedIds = Object.values(equipped).filter(Boolean);
      if (equippedIds.length === 0) return updatedInv;
      
      const targetId = equippedIds[Math.floor(Math.random() * equippedIds.length)];
      const itemIdx = updatedInv.findIndex(i => i.id === targetId);
      
      if (itemIdx > -1) {
          const item = updatedInv[itemIdx];
          if (item.durability !== undefined && item.durability > 0) {
              updatedInv[itemIdx] = { ...item, durability: item.durability - 1 };
              if (updatedInv[itemIdx].durability === 0) {
                   showNotification(`${item.name} 已損壞! 屬性失效。`);
              }
          }
      }
      return updatedInv;
  };

  const processStatusEffects = (player: Player): { player: Player, logs: string[] } => {
      let newPlayer = { ...player };
      const logs: string[] = [];
      
      if (!newPlayer.statusEffects) return { player: newPlayer, logs };

      newPlayer.statusEffects.forEach(effect => {
          switch (effect.type) {
              case 'poison':
                  const poisonDmg = Math.max(1, Math.floor(newPlayer.maxHp * 0.05));
                  newPlayer.hp = Math.max(0, newPlayer.hp - poisonDmg);
                  logs.push(`[中毒] 受到 ${poisonDmg} 點毒素傷害。`);
                  break;
              case 'burn':
                  const burnDmg = Math.max(1, Math.floor(newPlayer.maxHp * 0.03));
                  newPlayer.hp = Math.max(0, newPlayer.hp - burnDmg);
                  logs.push(`[燃燒] 受到 ${burnDmg} 點火焰傷害。`);
                  break;
              case 'bleed':
                  const bleedDmg = Math.max(1, Math.floor(newPlayer.maxHp * 0.04));
                  newPlayer.hp = Math.max(0, newPlayer.hp - bleedDmg);
                  logs.push(`[流血] 受到 ${bleedDmg} 點流血傷害。`);
                  break;
              case 'starvation':
                  newPlayer.hp = Math.max(0, newPlayer.hp - 1);
                  newPlayer.stamina = Math.max(0, newPlayer.stamina - 5);
                  logs.push(`[飢餓] 體力流失，生命值緩慢下降。`);
                  break;
               case 'dehydration':
                  newPlayer.hp = Math.max(0, newPlayer.hp - 1);
                  newPlayer.mp = Math.max(0, newPlayer.mp - 5);
                  logs.push(`[脫水] 魔力流失，生命值緩慢下降。`);
                  break;
               case 'exhaustion':
                  newPlayer.stamina = Math.max(0, newPlayer.stamina - 10);
                  logs.push(`[力竭] 體力快速流失。`);
                  break;
          }
      });

      return { player: newPlayer, logs };
  };

  const addStatusEffect = (effect: StatusEffect) => {
      setGameState(prev => {
          const existing = prev.player.statusEffects?.find(e => e.type === effect.type);
          let newEffects;
          if (existing) {
              newEffects = prev.player.statusEffects.map(e => 
                  e.type === effect.type ? { ...e, duration: Math.max(e.duration, effect.duration) } : e
              );
          } else {
              newEffects = [...(prev.player.statusEffects || []), effect];
          }
          return {
              ...prev,
              player: {
                  ...prev.player,
                  statusEffects: newEffects
              }
          };
      });
      showNotification(`獲得狀態: ${effect.name}`);
  };

  const handleAction = async (action: string, type: string, usedSkillId?: string) => {
      setLoading(true);
      setLoadingMsg(type === 'world_event' ? "觸發量子坍縮中..." : "正在書寫命運軌跡...");
      
      const playerLog: LogEntry = {
          id: crypto.randomUUID(),
          text: action,
          type: type === 'world_event' ? 'world_event' : 'system', 
          timestamp: Date.now()
      };
      
      let tempState = { ...gameState, logs: [...gameState.logs, playerLog] };
      
      tempState.skills = tempState.skills.map(skill => {
          let cd = Math.max(0, (skill.currentCooldown || 0) - 1);
          if (usedSkillId && skill.id === usedSkillId) {
              cd = skill.cooldown || 3;
          }
          return { ...skill, currentCooldown: cd };
      });
      
      // Process Status Effects (Damage/Effects)
      if (tempState.player.statusEffects && tempState.player.statusEffects.length > 0) {
          const effectResult = processStatusEffects(tempState.player);
          tempState.player = effectResult.player;
          effectResult.logs.forEach(text => {
              tempState.logs.push({
                  id: crypto.randomUUID(),
                  text,
                  type: 'system',
                  timestamp: Date.now()
              });
          });
          
          // Decrement duration and filter
          tempState.player.statusEffects = tempState.player.statusEffects
              .map(e => ({ ...e, duration: e.duration - 1 }))
              .filter(e => e.duration > 0);
      }

      if (gameState.inCombat && type !== 'flee' && gameState.gameMode !== 'GM模式') {
          tempState.inventory = decreaseDurability(tempState.inventory, tempState.player.equipment);
          
          // --- Combat System Integration ---
          const activeEnemy = tempState.npcs.find(n => n.locationId === tempState.currentLocation.id && n.status === 'Enemy');
          if (activeEnemy) {
              const usedSkill = usedSkillId ? tempState.skills.find(s => s.id === usedSkillId) : undefined;
              
              // Resource Check
              const staminaCost = usedSkill?.staminaCost || (usedSkill ? 5 : 2);
              const manaCost = usedSkill?.manaCost || 0;

              if (tempState.player.stamina < staminaCost) {
                  showNotification("體力不足，無法行動！");
                  setLoading(false);
                  return;
              }
              if (tempState.player.mp < manaCost) {
                  showNotification("魔力不足，無法行動！");
                  setLoading(false);
                  return;
              }

              // Deduct Resources
              tempState.player.stamina -= staminaCost;
              tempState.player.mp -= manaCost;

              // --- AI Decision ---
              const enemyAction = decideEnemyAction(activeEnemy, tempState.player, tempState.turnCount);

              const weaponId = tempState.player.equipment.right_hand;
              const weapon = tempState.inventory.find(i => i.id === weaponId);
              const combatResult = resolveCombatRound(tempState.player, activeEnemy, action, usedSkill, enemyAction, weapon);
              
              // --- Bestiary Update (Encounter) ---
              const existingEntryIndex = tempState.bestiary.findIndex(b => b.id === activeEnemy.id || b.name === activeEnemy.name);
              if (existingEntryIndex === -1) {
                  tempState.bestiary.push({
                      id: activeEnemy.id,
                      name: activeEnemy.name,
                      description: activeEnemy.description,
                      type: activeEnemy.race || 'Unknown',
                      killCount: 0,
                      firstEncounteredAt: Date.now(),
                      abilities: [], // Could extract from skills if available
                      weaknesses: activeEnemy.weaknesses,
                      resistances: activeEnemy.resistances,
                      image: activeEnemy.avatarUrl
                  });
              }

              // Apply Damage
              if (combatResult.enemyDamageTaken > 0) {
                  const enemyIdx = tempState.npcs.findIndex(n => n.id === activeEnemy.id);
                  if (enemyIdx > -1) {
                      const currentHp = tempState.npcs[enemyIdx].hp ?? 50; // Default HP if undefined
                      const newHp = Math.max(0, currentHp - combatResult.enemyDamageTaken);
                      tempState.npcs[enemyIdx] = { ...tempState.npcs[enemyIdx], hp: newHp };
                      
                      if (newHp === 0) {
                          combatResult.log += ` [敵方 ${activeEnemy.name} 已被擊敗!]`;
                          // --- Bestiary Update (Kill) ---
                          const entryIdx = tempState.bestiary.findIndex(b => b.id === activeEnemy.id || b.name === activeEnemy.name);
                          if (entryIdx > -1) {
                              tempState.bestiary[entryIdx].killCount += 1;
                          }
                      }
                  }
              }

              // Apply Enemy Healing
              if (combatResult.enemyHealed > 0) {
                  const enemyIdx = tempState.npcs.findIndex(n => n.id === activeEnemy.id);
                  if (enemyIdx > -1) {
                      const currentHp = tempState.npcs[enemyIdx].hp ?? 50;
                      const maxHp = tempState.npcs[enemyIdx].maxHp ?? 100;
                      const newHp = Math.min(maxHp, currentHp + combatResult.enemyHealed);
                      tempState.npcs[enemyIdx] = { ...tempState.npcs[enemyIdx], hp: newHp };
                  }
              }

              // Handle Phase Transition
              if (enemyAction.type === 'PhaseTransition') {
                  const enemyIdx = tempState.npcs.findIndex(n => n.id === activeEnemy.id);
                  if (enemyIdx > -1) {
                      const currentPhase = tempState.npcs[enemyIdx].currentPhase || 0;
                      const maxHp = tempState.npcs[enemyIdx].maxHp || 100;
                      const healAmount = Math.floor(maxHp * 0.2); // Heal 20% on phase transition
                      const newHp = Math.min(maxHp, (tempState.npcs[enemyIdx].hp || 0) + healAmount);
                      
                      tempState.npcs[enemyIdx] = { 
                          ...tempState.npcs[enemyIdx], 
                          currentPhase: currentPhase + 1,
                          hp: newHp
                      };
                      combatResult.log += ` (回復了 ${healAmount} HP)`;
                  }
              }

              if (combatResult.playerDamageTaken > 0) {
                  const newPlayerHp = Math.max(0, tempState.player.hp - combatResult.playerDamageTaken);
                  tempState.player.hp = newPlayerHp;
                  if (newPlayerHp === 0) {
                      combatResult.log += ` [玩家已倒下!]`;
                  }
              }

              // Append system log to action for Gemini context
              action += `\n\n${combatResult.log}`;
              showNotification(`戰鬥結算: 造成 ${combatResult.enemyDamageTaken} 傷害, 受到 ${combatResult.playerDamageTaken} 傷害`);
          }
          // ---------------------------------
      }

      setGameState(tempState);

      try {
          let response;
          if (type === 'world_event') {
               const eventRes = await GeminiService.generateWorldEvent(tempState);
               response = await GeminiService.generateStorySegment(tempState, `Trigger World Event: ${eventRes.narrative}`, 'world_event');
          } else {
               response = await GeminiService.generateStorySegment(tempState, action, type);
          }

          const shouldGenImage = gameState.generateStoryImages !== false;
          const updatedState = { ...tempState };

          if (response.timePassed) {
              advanceTime(response.timePassed);
          } else {
              if (updatedState.inCombat) advanceTime(2); 
              else if (type === 'world_event') advanceTime(30);
              else advanceTime(15);
          }
          
          if (response.inCombat !== undefined) {
              if (response.inCombat && !updatedState.inCombat) {
                  updatedState.combatStartTime = Date.now(); 
              } else if (!response.inCombat) {
                  updatedState.combatStartTime = undefined; 
              }
              updatedState.inCombat = response.inCombat;
          }
          
          if (response.playerUpdates) {
             if (response.playerUpdates.goldChange) updatedState.player.gold += response.playerUpdates.goldChange;
             if (response.playerUpdates.expChange) {
                 updatedState.player.exp += response.playerUpdates.expChange;
                 
                 // Level Up Logic
                 let expRequired = calculateRequiredExp(updatedState.player.level);
                 while (updatedState.player.exp >= expRequired) {
                     updatedState.player.level += 1;
                     updatedState.player.exp -= expRequired;
                     updatedState.player.statPoints = (updatedState.player.statPoints || 0) + 5;
                     updatedState.player.skillPoints += 1;
                     updatedState.player.maxHp += 10;
                     updatedState.player.maxMp += 10;
                     updatedState.player.maxStamina += 5; // Increase max stamina
                     updatedState.player.hp = updatedState.player.maxHp;
                     updatedState.player.mp = updatedState.player.maxMp;
                     updatedState.player.stamina = updatedState.player.maxStamina;
                     showNotification(`升級了！等級 ${updatedState.player.level} (獲得 5 屬性點, 1 技能點)`);
                     expRequired = calculateRequiredExp(updatedState.player.level);
                 }
             }
             
             if (response.playerUpdates.hpChange) {
                 const newHp = Math.min(updatedState.player.maxHp, Math.max(0, updatedState.player.hp + response.playerUpdates.hpChange));
                 const diff = newHp - updatedState.player.hp;
                 updatedState.player.hp = newHp;
                 if (diff < 0 && gameState.gameMode !== 'GM模式') showNotification(`受到傷害: ${diff}`);
                 if (diff > 0) showNotification(`恢復生命: +${diff}`);
             }

             if (response.playerUpdates.statsChange) {
                 updatedState.player.stats = {
                     ...updatedState.player.stats,
                     ...response.playerUpdates.statsChange
                 };
             }

             if (response.playerUpdates.statusEffects) {
                 response.playerUpdates.statusEffects.forEach(effect => {
                     const existing = updatedState.player.statusEffects?.find(e => e.type === effect.type);
                     if (existing) {
                         updatedState.player.statusEffects = updatedState.player.statusEffects.map(e => 
                             e.type === effect.type ? { ...e, duration: Math.max(e.duration, effect.duration) } : e
                         );
                     } else {
                         updatedState.player.statusEffects = [...(updatedState.player.statusEffects || []), effect];
                     }
                     showNotification(`獲得狀態: ${effect.name}`);
                 });
             }
          }

          const newLogId = crypto.randomUUID();
          const newLog: LogEntry = {
              id: newLogId,
              text: response.narrative,
              type: 'narrative',
              timestamp: Date.now(),
              options: response.options
          };
          updatedState.logs.push(newLog);

          if(response.newItems && response.newItems.length > 0) {
              const newItemsToAdd = response.newItems.map((item: any) => ({
                  ...item,
                  id: crypto.randomUUID(),
                  rarity: item.rarity || 'common',
                  quantity: item.quantity || 1,
                  durability: item.durability || 100,
                  maxDurability: item.maxDurability || 100
              }));
              updatedState.inventory = mergeNewItems(updatedState.inventory, newItemsToAdd);
              showNotification(`獲得 ${newItemsToAdd.length} 個新物品`);
              
              // --- Encyclopedia Update (Items) ---
              newItemsToAdd.forEach((item: any) => {
                  if (!updatedState.discoveredItems.includes(item.name)) {
                      updatedState.discoveredItems.push(item.name);
                  }
              });

              if (shouldGenImage) {
                newItemsToAdd.forEach((item: any) => {
                    GeminiService.generateImage(item.name, 'icon').then(url => {
                        setGameState(prev => ({
                            ...prev,
                            inventory: prev.inventory.map(i => i.id === item.id ? { ...i, iconUrl: url } : i)
                        }));
                    });
                });
              }
          }

          // --- Encyclopedia Update (Lore) ---
          if (response.newLore) {
              const existingLore = updatedState.loreFragments.find(l => l.title === response.newLore.title);
              if (!existingLore) {
                  updatedState.loreFragments.push({
                      id: crypto.randomUUID(),
                      title: response.newLore.title,
                      content: response.newLore.content,
                      category: response.newLore.category as any,
                      unlockedAt: Date.now()
                  });
                  showNotification(`解鎖新知識: ${response.newLore.title}`);
              }
          }

          if (response.newQuests) {
             const newQuestsAdded = response.newQuests.map((q: any) => ({
                 id: crypto.randomUUID(),
                 title: q.title,
                 description: q.description,
                 type: q.type || 'side', // Default to side quest
                 status: 'active',
                 rewards: q.rewards,
                 requirements: q.requirements || [],
                 objectives: q.objectives || [],
                 progress: q.initialProgress || 0
             }));
             updatedState.quests = [...updatedState.quests, ...newQuestsAdded];
             showNotification(`接受新任務: ${newQuestsAdded[0].title}`);
          }

          if(response.newNPCs) {
              const newNPCsAdded = response.newNPCs.map((npc: any) => ({
                  id: crypto.randomUUID(),
                  name: npc.name,
                  description: npc.description,
                  affection: npc.initialAffection || 0,
                  status: 'Neutral',
                  memory: [],
                  stylePrompt: '',
                  interactionLog: [],
                  locationId: updatedState.currentLocation.id,
                  faction: npc.faction,
                  stats: npc.stats,
                  skills: npc.skills,
                  inventory: npc.inventory ? npc.inventory.map((i: any) => ({
                      ...i,
                      id: crypto.randomUUID(),
                      rarity: i.rarity || 'common',
                      quantity: i.quantity || 1
                  })) : []
              }));
              updatedState.npcs = [...updatedState.npcs, ...newNPCsAdded];
              
              if (shouldGenImage) {
                  newNPCsAdded.forEach((npc: any) => {
                      // Generate NPC Portrait
                      GeminiService.generateImage(npc.description, 'portrait').then(avatarUrl => {
                          setGameState(prev => ({
                              ...prev,
                              npcs: prev.npcs.map(n => n.id === npc.id ? { ...n, avatarUrl } : n)
                          }));
                      });

                      // Generate NPC Inventory Icons
                      if (npc.inventory && npc.inventory.length > 0) {
                          Promise.all(npc.inventory.map(async (item: any) => {
                              try {
                                  const iconUrl = await GeminiService.generateImage(item.name, 'icon');
                                  return { id: item.id, iconUrl };
                              } catch (e) { return null; }
                          })).then(iconResults => {
                              setGameState(prev => ({
                                  ...prev,
                                  npcs: prev.npcs.map(n => {
                                      if (n.id !== npc.id) return n;
                                      return {
                                          ...n,
                                          inventory: n.inventory.map((invItem: any) => {
                                              const iconResult = iconResults.find((r: any) => r && r.id === invItem.id);
                                              return iconResult ? { ...invItem, iconUrl: iconResult.iconUrl } : invItem;
                                          })
                                      };
                                  })
                              }));
                          });
                      }
                  });
              }
          }

          setGameState(updatedState);
          setLoading(false); 

          if (shouldGenImage) {
              GeminiService.generateImage(response.sceneDescription, 'scene').then(sceneImg => {
                  setGameState(prev => ({
                      ...prev,
                      logs: prev.logs.map(l => l.id === newLogId ? { ...l, imageUrl: sceneImg } : l)
                  }));
              });
          }
      } catch (e) {
          console.error(e);
          showNotification("與以太場連結不穩定...");
          setLoading(false);
      }
  };

  const handleMarkAsSeen = (itemId: string) => {
      setGameState(prev => ({
          ...prev,
          inventory: prev.inventory.map(i => i.id === itemId ? { ...i, isNew: false } : i)
      }));
  };

  const handleCraft = (newItems: Item[], consumedIds: string[]) => {
      setGameState(prev => {
          if (prev.player.skillPoints < 5 && gameState.gameMode !== 'GM模式') {
              return prev;
          }
          let updatedInv = [...prev.inventory];
          
          consumedIds.forEach(id => {
              const idx = updatedInv.findIndex(i => i.id === id);
              if (idx > -1) {
                  if (updatedInv[idx].quantity > 1) {
                      updatedInv[idx] = { ...updatedInv[idx], quantity: updatedInv[idx].quantity - 1 };
                  } else {
                      updatedInv.splice(idx, 1);
                  }
              }
          });

          updatedInv = mergeNewItems(updatedInv, newItems);
          
          // --- Encyclopedia Update (Items) ---
          const newDiscovered = [...prev.discoveredItems];
          newItems.forEach(item => {
              if (!newDiscovered.includes(item.name)) {
                  newDiscovered.push(item.name);
              }
          });

          return { 
              ...prev, 
              player: { ...prev.player, skillPoints: prev.player.skillPoints - (gameState.gameMode === 'GM模式' ? 0 : 5) },
              inventory: updatedInv,
              discoveredItems: newDiscovered
          };
      });
      showNotification("合成成功! 消耗了 5 SP");
  };

  const handleUpgrade = (newItem: Item, consumedIds: string[]) => {
       setGameState(prev => {
           let updatedInv = [...prev.inventory];
           consumedIds.forEach(id => {
              const idx = updatedInv.findIndex(i => i.id === id);
              if (idx > -1) {
                  if (updatedInv[idx].quantity > 1) {
                      updatedInv[idx] = { ...updatedInv[idx], quantity: updatedInv[idx].quantity - 1 };
                  } else {
                      updatedInv.splice(idx, 1);
                  }
              }
           });
           
           const baseIdx = updatedInv.findIndex(i => i.id === newItem.id);
           if (baseIdx > -1) {
               updatedInv[baseIdx] = newItem;
           } else {
               updatedInv.push(newItem); 
           }

           return { ...prev, inventory: updatedInv };
      });
      showNotification("強化成功!");
  };

  const handleEquip = (itemId: string, slot: keyof EquipmentSlots) => {
      setGameState(prev => {
          const newEquip = { ...prev.player.equipment };
          newEquip[slot] = itemId;
          return { ...prev, player: { ...prev.player, equipment: newEquip } };
      });
  };

  const handleUnequip = (slot: keyof EquipmentSlots) => {
      setGameState(prev => {
          const newEquip = { ...prev.player.equipment };
          newEquip[slot] = null;
          return { ...prev, player: { ...prev.player, equipment: newEquip } };
      });
  };

  const handleLearnSkill = async (updatedSkill: SkillNode, cost: number) => {
      setGameState(prev => ({
          ...prev,
          skills: prev.skills.map(s => s.id === updatedSkill.id ? { ...s, unlocked: true } : s),
          player: { ...prev.player, skillPoints: prev.player.skillPoints - (gameState.gameMode === 'GM模式' ? 0 : cost) }
      }));
      showNotification(`習得技能: ${updatedSkill.name}`);
  };

  const handleUpgradeSkill = async (skillId: string, cost: number) => {
    // 處理 dummy ID "root" 僅扣除 SP
    if (skillId === "root") {
        setGameState(prev => ({
            ...prev,
            player: { ...prev.player, skillPoints: Math.max(0, prev.player.skillPoints - cost) }
        }));
        return;
    }

    const skillToUpgrade = gameState.skills.find(s => s.id === skillId);
    if (!skillToUpgrade || (gameState.player.skillPoints < cost && gameState.gameMode !== 'GM模式')) return;

    const newLevel = (skillToUpgrade.level || 1) + 1;

    setGameState(prev => ({ 
        ...prev, 
        player: { ...prev.player, skillPoints: prev.player.skillPoints - (gameState.gameMode === 'GM模式' ? 0 : cost) }, 
        skills: prev.skills.map(s => s.id === skillId ? { ...s, level: newLevel } : s) 
    }));

    if (newLevel === 5) {
        showNotification(`技能「${skillToUpgrade.name}」已達到最高階級！`);
        GeminiService.generateSkillBranches(skillToUpgrade, gameState.characterSkills).then(branches => {
            if (branches && branches.length > 0) {
                const newSkillNodes = branches.slice(0, 3).map((branch: any) => ({
                    id: crypto.randomUUID(),
                    name: branch.name,
                    description: branch.description,
                    skillType: branch.skillType || 'active',
                    affixes: branch.affixes || [],
                    unlocked: false,
                    parentId: skillId, 
                    cost: 10, 
                    cooldown: branch.cooldown || 5,
                    currentCooldown: 0,
                    level: 1,
                    damageType: branch.damageType,
                    elementType: branch.elementType,
                    statusEffect: branch.statusEffect,
                    tacticalAnalysis: branch.tacticalAnalysis
                }));

                setGameState(prev => {
                    return {
                        ...prev,
                        skills: [...prev.skills, ...newSkillNodes]
                    };
                });
                showNotification(`突破成功！「${skillToUpgrade.name}」出現了新分支！`);
            }
        });
    }
  };

  const handleReforgeSkill = async (skill: SkillNode) => {
      const cost = 2; // SP cost
      if (gameState.player.skillPoints < cost && gameState.gameMode !== 'GM模式') {
          showNotification(`技能點不足 (需 ${cost} SP)`);
          return;
      }

      setLoading(true);
      setLoadingMsg("正在重構技能矩陣...");
      
      try {
          const result = await GeminiService.reforgeSkill(skill, gameState.worldSetting);
          
          setGameState(prev => {
              const updatedSkill = {
                  ...skill,
                  affixes: result.affixes || [],
                  tacticalAnalysis: result.tacticalAnalysis || skill.tacticalAnalysis,
                  damageType: result.damageType || skill.damageType,
                  elementType: result.elementType || skill.elementType,
                  statusEffect: result.statusEffect || skill.statusEffect
              };
              
              return {
                  ...prev,
                  player: {
                      ...prev.player,
                      skillPoints: prev.player.skillPoints - (gameState.gameMode === 'GM模式' ? 0 : cost)
                  },
                  skills: prev.skills.map(s => s.id === skill.id ? updatedSkill : s)
              };
          });
          
          showNotification(`重構成功！${skill.name} 獲得了新的特性`);
      } catch (e) {
          console.error(e);
          showNotification("重構失敗，矩陣崩潰...");
      }
      setLoading(false);
  };

  const handleStatIncrease = (stat: keyof Stats) => {
      if (gameState.player.statPoints > 0) {
          setGameState(prev => ({
              ...prev,
              player: {
                  ...prev.player,
                  statPoints: prev.player.statPoints - 1,
                  stats: {
                      ...prev.player.stats,
                      [stat]: prev.player.stats[stat] + 1
                  }
              }
          }));
          showNotification(`${stat} 提升了！`);
      }
  };

  const handleCheatItem = async (itemName: string) => {
      setLoading(true);
      setLoadingMsg("正在具現化違禁品...");
      try {
          const result = await GeminiService.generateCheatItem(itemName);
          const newItem: Item = {
              id: crypto.randomUUID(),
              name: result.name || itemName,
              description: result.description || "具現化物質",
              type: (result.type as any) || 'misc',
              slot: result.slot,
              stats: result.stats,
              rarity: (result.rarity as any) || 'legendary',
              quantity: result.quantity || 1,
              isNew: true,
              potionEffect: result.potionEffect || undefined,
              durability: result.durability,
              maxDurability: result.maxDurability,
              price: result.price || 500
          };
          
          setGameState(prev => {
              return {
                  ...prev,
                  inventory: mergeNewItems(prev.inventory, [newItem])
              };
          });
          
          if (gameState.generateStoryImages) {
            GeminiService.generateImage(result.name || itemName, 'icon').then(iconUrl => {
                setGameState(prev => ({
                    ...prev,
                    inventory: prev.inventory.map(i => i.id === newItem.id ? { ...i, iconUrl } : i)
                }));
            });
          }

          showNotification(`[GM] 獲得物品: ${newItem.name}`);
      } catch (e) {
          console.error(e);
      }
      setLoading(false);
  };

  const handleCheatSkill = async (skillName: string) => {
      setLoading(true);
      setLoadingMsg("正在編解碼基因潛能...");
      try {
          const result = await GeminiService.generateCheatSkill(skillName);
          const newSkill: SkillNode = {
              ...result,
              id: crypto.randomUUID(),
              unlocked: true,
              parentId: 'root', 
              cost: 0,
              cooldown: result.cooldown || 3,
              currentCooldown: 0,
              level: 1
          };
          setGameState(prev => {
              return {
                  ...prev,
                  skills: [...prev.skills, newSkill]
              };
          });
          handleLearnSkill(newSkill, 0); 
          showNotification(`[GM] 習得技能: ${newSkill.name}`);
      } catch (e) {
          console.error(e);
      }
      setLoading(false);
  };

  const handleGenerateNPC = async (overrides?: any) => {
      setLoading(true);
      setLoadingMsg("正在召喚平行時空投影...");
      const historyText = gameState.logs.slice(-10).map(l => l.text).join('\n');
      try {
          const result = await GeminiService.generateNewNPC(gameState.worldSetting, gameState.currentLocation.name, overrides, historyText);
          if (result) {
              const newNpcId = crypto.randomUUID();
              
              // Process inventory immediately but without icons first
              const initialInventory = result.inventory ? result.inventory.map((i: any) => ({
                  ...i,
                  id: crypto.randomUUID(),
                  iconUrl: undefined // Will be populated later
              })) : [];

              const newNpc: NPC = {
                  ...result,
                  id: newNpcId,
                  interactionLog: [],
                  memory: [],
                  affection: result.initialAffection || 0,
                  status: 'Neutral',
                  locationId: gameState.currentLocation.id,
                  stats: result.stats || { strength: 5, intelligence: 5, agility: 5, charisma: 5, luck: 5, endurance: 5 },
                  inventory: initialInventory
              };

              // Update state immediately with the new NPC
              setGameState(prev => {
                  return { ...prev, npcs: [...prev.npcs, newNpc] };
              });
              
              showNotification(`遇見了新角色: ${newNpc.name}`);

              // Generate inventory icons in background
              if (initialInventory.length > 0) {
                  Promise.all(initialInventory.map(async (item: any) => {
                      try {
                          const iconUrl = await GeminiService.generateImage(item.name, 'icon');
                          return { id: item.id, iconUrl };
                      } catch (e) {
                          console.error("Failed to generate icon for", item.name);
                          return null;
                      }
                  })).then(iconResults => {
                      setGameState(prev => ({
                          ...prev,
                          npcs: prev.npcs.map(n => {
                              if (n.id !== newNpcId) return n;
                              return {
                                  ...n,
                                  inventory: n.inventory?.map(invItem => {
                                      const iconResult = iconResults.find(r => r && r.id === invItem.id);
                                      return iconResult ? { ...invItem, iconUrl: iconResult.iconUrl } : invItem;
                                  })
                              };
                          })
                      }));
                  });
              }
              
              // Generate portrait in background
              if (gameState.generateStoryImages) {
                GeminiService.generateImage(result.description, 'portrait').then(avatarUrl => {
                    setGameState(prev => ({
                        ...prev,
                        npcs: prev.npcs.map(n => n.id === newNpcId ? { ...n, avatarUrl } : n)
                    }));
                });
              }
          }
      } catch (e) {
          console.error("NPC Gen failed", e);
          showNotification("召喚失敗，時空亂流干擾...");
      }
      setLoading(false);
  };



  const handleConsumeItem = (item: Item) => {
      setGameState(prev => {
          const newInventory = [...prev.inventory];
          const itemIndex = newInventory.findIndex(i => i.id === item.id);
          
          if (itemIndex === -1) return prev;

          // Consume quantity
          if (newInventory[itemIndex].quantity > 1) {
              newInventory[itemIndex] = { 
                  ...newInventory[itemIndex], 
                  quantity: newInventory[itemIndex].quantity - 1 
              };
          } else {
              newInventory.splice(itemIndex, 1);
          }

          // Apply effects
          const newState = { ...prev, inventory: newInventory };
          const recoveryInfo: string[] = [];

          // Core stat recovery based on item properties
          if (item.potionEffect || item.type === 'food' || item.type === 'consumable') {
              if (item.nutrition) {
                  const oldHunger = newState.player.hunger;
                  newState.player.hunger = Math.min(100, newState.player.hunger + item.nutrition);
                  recoveryInfo.push(`飽食度 +${newState.player.hunger - oldHunger}`);
              }
              if (item.hydration) {
                  const oldThirst = newState.player.thirst;
                  newState.player.thirst = Math.min(100, newState.player.thirst + item.hydration);
                  recoveryInfo.push(`飲水度 +${newState.player.thirst - oldThirst}`);
              }
              if (item.staminaRestore) {
                  const oldEnergy = newState.player.energy;
                  newState.player.energy = Math.min(100, newState.player.energy + item.staminaRestore);
                  recoveryInfo.push(`體力 +${newState.player.energy - oldEnergy}`);
              }

              // Potion specific effects from string parsing
              const pe = (item.potionEffect || "").toLowerCase();
              if (pe.includes('heal') || pe.includes('life') || pe.includes('hp')) {
                  const healAmount = 30; // Default heal
                  const oldHp = newState.player.hp;
                  newState.player.hp = Math.min(newState.player.maxHp, newState.player.hp + healAmount);
                  recoveryInfo.push(`生命值 +${newState.player.hp - oldHp}`);
              }
              if (pe.includes('mana') || pe.includes('ether') || pe.includes('mp')) {
                  const manaAmount = 30; // Default mana restore
                  const oldMp = newState.player.mp;
                  newState.player.mp = Math.min(newState.player.maxMp, newState.player.mp + manaAmount);
                  recoveryInfo.push(`以太量 +${newState.player.mp - oldMp}`);
              }
          }

          const effectDesc = recoveryInfo.length > 0 ? recoveryInfo.join(', ') : (item.potionEffect || "無明顯效果");
          const log: LogEntry = {
              id: crypto.randomUUID(),
              text: `使用了 [${item.name}]。${effectDesc}`,
              type: 'system',
              timestamp: Date.now()
          };
          newState.logs = [...newState.logs, log];

          showNotification(`使用了: ${item.name} (${effectDesc})`);
          return newState;
      });
  };

  const handleSellItems = (itemsToSell: Item[]) => {
      setGameState(prev => {
          let updatedInv = [...prev.inventory];
          let goldGain = 0;
          itemsToSell.forEach(item => {
              const idx = updatedInv.findIndex(i => i.id === item.id);
              if (idx > -1) {
                 const price = item.price || (item.rarity === 'legendary' ? 1000 : item.rarity === 'epic' ? 200 : item.rarity === 'rare' ? 50 : 10);
                 updatedInv.splice(idx, 1);
                 goldGain += price;
              }
          });
          const newState = {
              ...prev,
              inventory: updatedInv,
              player: { ...prev.player, gold: prev.player.gold + goldGain }
          };
          return newState;
      });
  };

  const handleRepairItem = (item: Item) => {
      if (gameState.player.gold < 50 && gameState.gameMode !== 'GM模式') {
          showNotification("金幣不足 (需 50 G)");
          return;
      }
      setGameState(prev => {
        const newState = {
          ...prev,
          player: { ...prev.player, gold: prev.player.gold - (gameState.gameMode === 'GM模式' ? 0 : 50) },
          inventory: prev.inventory.map(i => i.id === item.id ? { ...i, durability: i.maxDurability } : i)
        };
        return newState;
      });
      showNotification(`已修復 ${item.name}`);
  };

  const handleReforge = async (item: Item) => {
      const cost = 200;
      if (gameState.player.gold < cost && gameState.gameMode !== 'GM模式') {
          showNotification(`金幣不足 (需 ${cost} G)`);
          return;
      }

      setLoading(true);
      setLoadingMsg("正在重構以太序列...");
      
      try {
          const result = await GeminiService.reforgeItem(item, gameState.worldSetting);
          
          setGameState(prev => {
              const updatedItem = {
                  ...item,
                  affixes: result.affixes || [],
                  stats: result.stats || item.stats,
                  potionEffect: result.potionEffect || item.potionEffect
              };
              
              return {
                  ...prev,
                  player: {
                      ...prev.player,
                      gold: prev.player.gold - (gameState.gameMode === 'GM模式' ? 0 : cost)
                  },
                  inventory: prev.inventory.map(i => i.id === item.id ? updatedItem : i)
              };
          });
          
          showNotification(`洗鍊成功！${item.name} 獲得了新的詞綴`);
      } catch (e) {
          console.error(e);
          showNotification("洗鍊失敗，以太能量不穩定...");
      }
      setLoading(false);
  };

  const handleAllocateStat = (statName: keyof Stats) => {
      setGameState(prev => {
          if (prev.player.statPoints <= 0 && prev.gameMode !== 'GM模式') return prev;
          
          const newStats = { ...prev.player.stats };
          newStats[statName] = (newStats[statName] || 0) + 1;
          
          return {
              ...prev,
              player: {
                  ...prev.player,
                  stats: newStats,
                  statPoints: prev.player.statPoints - (prev.gameMode === 'GM模式' ? 0 : 1)
              }
          };
      });
      showNotification(`${statName} 提升了！`);
  };

  const handleAssignQuickSlot = (target: Item | SkillNode, index?: number) => {
      setGameState(prev => {
          const slots = [...prev.quickSlots];
          const isItem = 'type' in target; 
          const slotData: QuickSlot = { 
              type: isItem ? 'item' : 'skill', 
              id: target.id 
          };

          if (index !== undefined && index >= 0 && index < 4) {
              slots[index] = slotData;
          } else {
              const emptyIdx = slots.findIndex(s => s === null);
              const idx = emptyIdx > -1 ? emptyIdx : 0;
              slots[idx] = slotData;
          }
          const newState = { ...prev, quickSlots: slots };
          return newState;
      });
      showNotification(`【${target.name}】已成功登錄至快捷槽`);
  };

  const handleQuickSlotUse = (index: number) => {
      const slot = gameState.quickSlots[index];
      if (!slot) return;
      
      if (slot.type === 'item') {
          const item = gameState.inventory.find(i => i.id === slot.id);
          if (item) handleConsumeItem(item);
      } else {
          const skill = gameState.skills.find(s => s.id === slot.id);
          if (skill) {
              if (skill.currentCooldown && skill.currentCooldown > 0 && gameState.gameMode !== 'GM模式') {
                  showNotification(`${skill.name} 冷卻中 (${skill.currentCooldown})`);
                  return;
              }
              handleAction(`使用技能: ${skill.name}`, "custom", skill.id);
          }
      }
  };

  const handleUpdateNPC = React.useCallback((updatedNPC: NPC) => {
      setGameState(prev => {
        const newState = {
          ...prev,
          npcs: prev.npcs.map(n => n.id === updatedNPC.id ? updatedNPC : n)
        };
        return newState;
      });
  }, []);

  const handleDeleteNPC = (npcId: string) => {
      setGameState(prev => {
        const newState = {
          ...prev,
          npcs: prev.npcs.filter(n => n.id !== npcId)
        };
        return newState;
      });
  };

  const handleQuestReceived = (quest: Quest) => {
      setGameState(prev => {
          const newState = {
              ...prev,
              quests: [...prev.quests, quest],
              logs: [
                  ...prev.logs,
                  {
                      id: crypto.randomUUID(),
                      text: `[任務] 接受了新委託：${quest.title}`,
                      type: 'system' as const,
                      timestamp: Date.now()
                  }
              ]
          };
          return newState;
      });
      showNotification(`新任務：${quest.title}`);
  };

  const checkAchievements = () => {
      const unlockedIds = gameState.achievements.map(a => a.id);
      const newUnlocked: string[] = [];

      ACHIEVEMENTS_DATA.forEach(achievement => {
          if (unlockedIds.includes(achievement.id)) return;

          let unlocked = false;
          switch (achievement.id) {
              case 'first_step':
                  if (gameState.turnCount > 0) unlocked = true;
                  break;
              case 'social_star':
                  if (gameState.npcs.some(n => n.affection >= 100)) unlocked = true;
                  break;
              case 'skill_master':
                  if (gameState.skills.some(s => (s.level || 1) >= 5)) unlocked = true;
                  break;
              case 'rich_man':
                  if (gameState.player.gold >= 5000) unlocked = true;
                  break;
              case 'explorer':
                  if (gameState.visitedLocations.length >= 5) unlocked = true;
                  break;
              case 'survivor':
                  if (gameState.player.hp < gameState.player.maxHp * 0.1 && gameState.logs.some(l => l.text.includes("勝利") || l.text.includes("擊敗"))) unlocked = true;
                  break;
              case 'legendary_hero':
                  if (gameState.inventory.some(i => i.rarity === 'legendary') || Object.values(gameState.player.equipment).some(id => gameState.inventory.find(i => i.id === id)?.rarity === 'legendary')) unlocked = true;
                  break;
              case 'crafter':
                  if (gameState.recipes.length >= 1) unlocked = true; // Simplified check
                  break;
              case 'full_gear':
                  const eq = gameState.player.equipment;
                  if (eq.head && eq.body && eq.legs && eq.mainHand && (eq.offHand || eq.accessory1)) unlocked = true;
                  break;
              case 'polymath':
                  if (gameState.skills.filter(s => s.unlocked).length >= 8) unlocked = true;
                  break;
              case 'faction_leader':
                  if (gameState.player.factions.some(f => f.score >= 500)) unlocked = true;
                  break;
              case 'hoarder':
                  if (gameState.inventory.length >= 20) unlocked = true;
                  break;
              case 'quest_master':
                  if (gameState.quests.filter(q => q.status === 'completed').length >= 3) unlocked = true;
                  break;
          }

          if (unlocked) {
              newUnlocked.push(achievement.id);
          }
      });

      if (newUnlocked.length > 0) {
          setGameState(prev => ({
              ...prev,
              achievements: [
                  ...prev.achievements,
                  ...newUnlocked.map(id => ({ id, unlockedAt: new Date().toISOString() }))
              ]
          }));
          newUnlocked.forEach(id => {
              const data = ACHIEVEMENTS_DATA.find(a => a.id === id);
              if (data) showNotification(`成就解鎖: ${data.title}`);
          });
      }
  };

  useEffect(() => {
      const timer = setTimeout(checkAchievements, 1000);
      return () => clearTimeout(timer);
  }, [gameState.turnCount, gameState.player.gold, gameState.player.hp, gameState.npcs, gameState.skills, gameState.inventory, gameState.visitedLocations, gameState.recipes, gameState.player.equipment, gameState.player.factions, gameState.quests]);

  const handleRecipeLearned = (recipeData: any) => {
      const newRecipe = {
          id: crypto.randomUUID(),
          name: recipeData.name,
          description: recipeData.description,
          ingredients: recipeData.ingredients,
          resultItemName: recipeData.resultItemName,
          unlocked: true
      };
      setGameState(prev => {
        const newState = {
          ...prev,
          recipes: [...prev.recipes, newRecipe]
        };
        return newState;
      });
  };

  const handleToggleTrackQuest = (questId: string) => {
      setGameState(prev => {
          const newState = {
              ...prev,
              quests: prev.quests.map(q => 
                  q.id === questId ? { ...q, isTracked: !q.isTracked } : q
              )
          };
          return newState;
      });
  };
  
  const resetGame = () => {
      if(confirm("確定要重置嗎? 你的當前進度若未下載將會永久丟失。")) {
          window.location.reload();
      }
  };

  const exportSave = () => {
      const blob = new Blob([JSON.stringify(gameState, null, 2)], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Aether_Chronicles_Save_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      showNotification("存檔下載已啟動");
  };
  
  const triggerImport = () => {
      fileInputRef.current?.click();
  };
  
  const importSave = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const content = e.target?.result as string;
              const parsed = JSON.parse(content);
              if (parsed && (parsed.player || parsed.logs)) {
                  const cleanState = sanitizeState(parsed);
                  setGameState(cleanState);
                  setShowSetup(false);
                  showNotification("存檔導入成功！");
              }
          } catch (err) {
              alert("讀取存檔失敗，文件格式可能不正確。");
          }
      };
      reader.readAsText(file);
  };

  const buySkillPoint = () => {
      if (gameState.player.gold >= 100 || gameState.gameMode === 'GM模式') {
          setGameState(prev => ({
              ...prev,
              player: {
                  ...prev.player,
                  gold: prev.player.gold - (gameState.gameMode === 'GM模式' ? 0 : 100),
                  skillPoints: prev.player.skillPoints + 1
              }
          }));
          showNotification("購買成功: +1 技能點");
      } else {
          showNotification("金幣不足 (需 100 G)");
      }
  };

  const checkGodMode = () => {
      if (godModePassword === '0000') {
          setIsGodModeUnlocked(true);
          setGodModeData(JSON.stringify(gameState, null, 2));
      } else {
          alert("密碼錯誤");
      }
  };

  const saveGodMode = () => {
      try {
          const parsed = JSON.parse(godModeData);
          setGameState(sanitizeState(parsed));
          setShowGodMode(false);
          showNotification("God Mode 修改已應用");
      } catch (e) {
          alert("JSON 格式錯誤");
      }
  };

  const handleNPCClick = (npcId: string) => {
      setSelectedNPCId(npcId);
      setActiveTab('npcs');
  };

  const trackedQuests = useMemo(() => gameState.quests.filter(q => q.status === 'active' && q.isTracked), [gameState.quests]);
  const localNPCs = useMemo(() => gameState.npcs.filter(n => n.locationId === gameState.currentLocation.id), [gameState.npcs, gameState.currentLocation.id]);

  if (showSetup) {
      return (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 bg-[url('https://picsum.photos/1920/1080?blur=10')] bg-cover bg-center font-serif">
              <Card className="w-full max-w-2xl bg-black/80 backdrop-blur-xl border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                  <div className="text-center mb-6">
                      <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">Aether Chronicles</h1>
                      <p className="text-slate-400 font-mono text-sm">Create your Legend (創造你的傳奇)</p>
                  </div>
                  
                  <div className="space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar pr-2">
                      <div className="bg-red-950/30 border border-red-500/30 p-3 rounded-lg flex items-center gap-3 mb-4">
                          <AlertCircle className="text-red-400 shrink-0" size={20}/>
                          <p className="text-[11px] text-red-200/80 leading-relaxed">
                              本遊戲採用<span className="text-white font-bold">手動存檔機制</span>。系統不會自動儲存進度到瀏覽器中。
                              請在遊玩期間透過「下載存檔」按鈕備份進度，或點擊下方按鈕匯入過往存檔以繼續冒險。
                          </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-cyan-400 font-bold text-sm block mb-1">遊戲難度 (Difficulty)</label>
                              <select 
                                  className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                                  value={setupDifficulty}
                                  onChange={(e) => setSetupDifficulty(e.target.value)}
                              >
                                  <option value="Easy">簡單 (Easy)</option>
                                  <option value="Medium">普通 (Medium)</option>
                                  <option value="Hard">困難 (Hard)</option>
                                  <option value="Impossible">不可能 (Impossible)</option>
                                  <option value="Hopeless">沒救了 (Hopeless)</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-cyan-400 font-bold text-sm block mb-1">遊戲模式 (Game Mode)</label>
                              <select 
                                  className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                                  value={setupGameMode}
                                  onChange={(e) => setSetupGameMode(e.target.value)}
                              >
                                  {Object.keys(gameModeDescriptions).map(mode => (
                                      <option key={mode} value={mode}>{mode}</option>
                                  ))}
                              </select>
                          </div>
                      </div>
                      <div className="text-xs text-slate-400 italic bg-slate-900/30 p-2 rounded border border-slate-800">
                          {gameModeDescriptions[setupGameMode]}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 p-2 rounded">
                            <span className="text-cyan-400 font-bold text-sm flex items-center gap-2">
                                <Gauge size={16}/> 加快運行速度 (Fast Mode)
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={setupFastMode}
                                        onChange={(e) => setSetupFastMode(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 p-2 rounded">
                            <span className="text-cyan-400 font-bold text-sm flex items-center gap-2">
                                <ImageIcon size={16}/> 啟用 AI 圖片生成
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={setupGenerateImages}
                                        onChange={(e) => setSetupGenerateImages(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                            </label>
                        </div>
                      </div>

                      <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-cyan-400 font-bold text-sm">世界觀設定</label>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleRandomSetup('world'); }} disabled={loading} className="text-[10px] py-0.5"><Dices size={12} className="mr-1"/> 隨機</Button>
                          </div>
                          <textarea 
                             className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none resize-none leading-relaxed"
                             placeholder="例如: 一個被魔法財團統治的賽博龐克城市..."
                             value={setupWorld}
                             onChange={e => setSetupWorld(e.target.value)}
                          />
                      </div>
                      
                      <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-cyan-400 font-bold text-sm">角色設定</label>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleRandomSetup('character'); }} disabled={loading} className="text-[10px] py-0.5"><Dices size={12} className="mr-1"/> 隨機</Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                              <div>
                                <label className="text-slate-500 text-[10px] uppercase font-bold block mb-1">角色名稱</label>
                                <Input 
                                    className="bg-slate-900/50 border-slate-700 text-sm"
                                    placeholder="輸入姓名..."
                                    value={setupName}
                                    onChange={e => setSetupName(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-slate-500 text-[10px] uppercase font-bold block mb-1">角色性別</label>
                                <div className="flex gap-2 h-[42px]">
                                    {['Male', 'Female', 'Other'].map(g => (
                                        <button 
                                            key={g} 
                                            onClick={() => setSetupGender(g as any)}
                                            className={`flex-1 rounded text-xs border transition-all ${setupGender === g ? 'bg-cyan-700 border-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                        >
                                            {g === 'Male' ? '男' : g === 'Female' ? '女' : '其他'}
                                        </button>
                                    ))}
                                </div>
                              </div>
                              <div>
                                <label className="text-slate-500 text-[10px] uppercase font-bold block mb-1">種族</label>
                                <Input 
                                    className="bg-slate-900/50 border-slate-700 text-sm"
                                    placeholder="例如: 人類, 精靈, 獸人..."
                                    value={setupRace}
                                    onChange={e => setSetupRace(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-slate-500 text-[10px] uppercase font-bold block mb-1">職業</label>
                                <Input 
                                    className="bg-slate-900/50 border-slate-700 text-sm"
                                    placeholder="例如: 戰士, 法師, 遊俠..."
                                    value={setupProfession}
                                    onChange={e => setSetupProfession(e.target.value)}
                                />
                              </div>
                          </div>
                          
                          <div className="mb-4 p-4 bg-slate-900/50 border border-slate-700 rounded-xl">
                              <label className="text-cyan-400 font-bold text-sm block mb-3">初始屬性</label>
                              <div className="grid grid-cols-3 gap-3">
                                  {Object.keys(setupStats).map((stat) => (
                                      <div key={stat} className="flex flex-col gap-1">
                                          <label className="text-[10px] text-slate-500 uppercase font-black">{stat}</label>
                                          <Input 
                                              type="number"
                                              className="bg-black/30 border-slate-700 text-sm font-mono text-center"
                                              value={setupStats[stat as keyof Stats]}
                                              onChange={e => setSetupStats(prev => ({ ...prev, [stat]: parseInt(e.target.value) || 0 }))}
                                          />
                                      </div>
                                  ))}
                              </div>
                          </div>

                          <textarea 
                             className="w-full h-24 bg-slate-900/50 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none resize-none"
                             placeholder="例如: 一位擁有了機械手臂的厭世偵探..."
                             value={setupChar}
                             onChange={e => setSetupChar(e.target.value)}
                          />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <label className="text-cyan-400 font-bold text-sm block mb-1">外貌設定</label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input placeholder="髮型 (如: 銀色長髮)" value={setupHairstyle} onChange={e => setSetupHairstyle(e.target.value)} className="bg-slate-900/50 border-slate-700 text-sm" />
                            <Input placeholder="眼睛顏色 (如: 翠綠色)" value={setupEyeColor} onChange={e => setSetupEyeColor(e.target.value)} className="bg-slate-900/50 border-slate-700 text-sm" />
                          </div>
                          <Input placeholder="服裝風格 (如: 輕便皮甲)" value={setupClothingStyle} onChange={e => setSetupClothingStyle(e.target.value)} className="bg-slate-900/50 border-slate-700 text-sm" />
                          <Input placeholder="畫風 (如: Cyberpunk, Watercolor)" value={setupStylePrompt} onChange={e => setSetupStylePrompt(e.target.value)} className="bg-slate-900/50 border-slate-700 text-sm" />
                        </div>
                        <div className="space-y-4">
                          <label className="text-cyan-400 font-bold text-sm block mb-1">背景故事</label>
                          <textarea className="w-full h-[108px] bg-slate-900/50 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none resize-none" placeholder="你的過去..." value={setupBackgroundStory} onChange={e => setSetupBackgroundStory(e.target.value)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-cyan-400 font-bold text-sm block mb-1">角色技能</label>
                              <textarea 
                                 className="w-full h-20 bg-slate-900/50 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none resize-none"
                                 placeholder="例如: 時間暫停(5秒)、火球術、絕對防禦..."
                                 value={setupSkills}
                                 onChange={e => setSetupSkills(e.target.value)}
                              />
                          </div>
                          <div>
                              <label className="text-cyan-400 font-bold text-sm block mb-1">初始特質</label>
                              <textarea 
                                 className="w-full h-20 bg-slate-900/50 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none resize-none"
                                 placeholder="例如: 勇敢, 貪財, 貴族出身 (以逗號分隔)..."
                                 value={setupTraits}
                                 onChange={e => setSetupTraits(e.target.value)}
                              />
                          </div>
                      </div>

                      <div>
                          <label className="text-cyan-400 font-bold text-sm block mb-1">初始物品</label>
                          <textarea 
                             className="w-full h-20 bg-slate-900/50 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none resize-none"
                             placeholder="例如: 破舊的左輪手槍、祖傳的護身符、3個麵包..."
                             value={setupItems}
                             onChange={e => setSetupItems(e.target.value)}
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <Button 
                            className="py-3 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 group transition-all"
                            onClick={handleSurpriseMe}
                            disabled={loading}
                        >
                            <Shuffle size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                            命運隨機
                        </Button>
                        <Button 
                            className="py-3 text-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 group transition-all"
                            onClick={() => startAdventureWithData({ 
                              world: setupWorld, 
                              name: setupName,
                              gender: setupGender,
                              character: setupChar, 
                              hairstyle: setupHairstyle,
                              eyeColor: setupEyeColor,
                              clothingStyle: setupClothingStyle,
                              stylePrompt: setupStylePrompt,
                              backgroundStory: setupBackgroundStory,
                              traits: setupTraits,
                              skills: setupSkills, 
                              items: setupItems, 
                              difficulty: setupDifficulty, 
                              gameMode: setupGameMode 
                            })}
                            disabled={!setupWorld || !setupChar || loading}
                        >
                            <Play size={20} />
                            開始冒險
                        </Button>
                      </div>
                      
                      <div className="mt-4 p-4 border border-dashed border-slate-700 rounded-xl bg-slate-900/30 flex flex-col items-center gap-4">
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">已有傳奇冒險？匯入以續寫篇章</p>
                          <input type="file" ref={fileInputRef} onChange={importSave} className="hidden" accept=".json" />
                          <Button onClick={triggerImport} variant="secondary" className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 border-slate-600 hover:border-cyan-500 text-white">
                              <Upload size={18}/> 匯入本地存檔 (.json)
                          </Button>
                      </div>
                  </div>
              </Card>
          </div>
      );
  }

  return (
    <div className={`h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden flex flex-col font-serif relative transition-colors duration-1000`}>
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none transition-opacity duration-1000"
        style={{ 
            backgroundImage: `url(${gameState.backgroundImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        }}
      ></div>

      {notification && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
              <div className="bg-cyan-900/90 text-cyan-100 px-6 py-2 rounded-full border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.4)] backdrop-blur-md flex items-center gap-2">
                  <SparklesIcon /> {notification}
              </div>
          </div>
      )}

      {loading && <LoadingOverlay message={loadingMsg} />}

      {!gameState.tutorialCompleted && (
          <TutorialOverlay 
              step={gameState.tutorialStep}
              onNext={handleTutorialNext}
              onSkip={handleTutorialSkip}
              onFinish={handleTutorialFinish}
              setActiveTab={setActiveTab}
          />
      )}

      {isPaused && (
          <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <Card className="w-full max-sm text-center border-yellow-500/50 shadow-[0_0_50px_rgba(234,179,8,0.2)]">
                  <h2 className="text-3xl font-bold text-yellow-500 mb-6 flex items-center justify-center gap-2">
                      <Pause size={32}/> 暫停
                  </h2>
                  <div className="space-y-3">
                      <Button onClick={handlePause} className="w-full py-3 text-lg">繼續冒險</Button>
                      <Button onClick={() => { setActiveTab('settings'); handlePause(); }} variant="secondary" className="w-full py-3">設定</Button>
                      <Button onClick={exportSave} className="w-full py-3 bg-cyan-600 border-cyan-400">下載當前進度</Button>
                  </div>
                  <p className="mt-6 text-xs text-slate-500 text-center px-4 italic">
                      提醒：離開瀏覽器前必須下載存檔，否則進度將會遺失。
                  </p>
              </Card>
          </div>
      )}

      <div className="flex-1 overflow-hidden relative z-10 p-4 pb-0">
        <div className="h-full max-w-7xl mx-auto flex flex-col gap-4 relative">
            
            {activeTab !== 'settings' && (
                <div className="absolute top-0 right-0 z-50 flex gap-2">
                     <button 
                        onClick={exportSave}
                        className={`bg-slate-900/80 rounded px-2 py-1 border text-xs font-mono flex items-center gap-2 transition-all duration-500 border-cyan-500/50 text-cyan-300 hover:bg-cyan-600 hover:text-white shadow-[0_0_10px_rgba(6,182,212,0.2)]`}
                        title="下載當前存檔到本地"
                     >
                         <FileDown size={14} className={syncStatus === 'syncing' ? 'animate-bounce' : ''} />
                         <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">
                             下載進度
                         </span>
                     </button>
                     <div className="bg-slate-900/80 rounded px-2 py-1 text-slate-300 border border-slate-700/50 text-xs font-mono flex items-center gap-1">
                         {isNight ? <Moon size={14} className="text-purple-400"/> : <Sun size={14} className="text-yellow-400"/>}
                         {formattedTime}
                     </div>
                     <button onClick={() => setShowShop(true)} className="bg-slate-900/80 rounded px-2 py-1 text-yellow-500 border border-yellow-500/20 text-xs font-mono flex items-center gap-1 hover:bg-slate-800 transition-colors">
                         <Coins size={14} /> {gameState.player.gold} G
                     </button>
                     <button className="bg-slate-900/80 rounded px-2 py-1 text-cyan-500 border border-yellow-500/20 text-xs font-mono flex items-center gap-1">
                         <Zap size={14} /> {gameState.player.skillPoints} SP
                     </button>
                     <Button 
                        variant="ghost" 
                        onClick={handleRefresh} 
                        className="bg-slate-900/60 backdrop-blur-sm text-cyan-400 hover:text-cyan-200 border border-cyan-500/20 px-3 py-1 text-xs hover:border-cyan-500/50"
                     >
                        <RefreshCcw size={14}/>
                     </Button>
                     <Button 
                        variant="ghost" 
                        onClick={handlePause} 
                        className={`bg-slate-900/60 backdrop-blur-sm border border-yellow-500/20 px-3 py-1 text-xs hover:border-yellow-500/50 ${isPaused ? 'text-yellow-400' : 'text-slate-400 hover:text-yellow-200'}`}
                     >
                        <Pause size={14} />
                     </Button>
                </div>
            )}

            <div className={`flex-1 min-h-0 relative transition-all duration-500 ${
                (activeTab === 'story' || activeTab === 'action') ? 'lg:grid lg:grid-cols-[1fr_380px] lg:gap-4' : ''
            }`}>
                <div className="h-full min-h-0 relative flex flex-col">
                <Suspense fallback={<LoadingOverlay message="載入量子元件中..." />}>
                    {activeTab === 'story' && (
                        <StoryPanel 
                            logs={gameState.logs || []} 
                            currentOptions={gameState.logs?.[gameState.logs.length-1]?.options} 
                            onAction={handleAction}
                            isProcessing={loading}
                            inCombat={gameState.inCombat}
                            quickSlots={gameState.quickSlots || []}
                            items={gameState.inventory || []}
                            skills={gameState.skills || []}
                            onQuickSlotUse={handleQuickSlotUse}
                            combatStartTime={gameState.combatStartTime}
                            isPaused={isPaused}
                            activeStatusEffects={gameState.player.statusEffects}
                            level={gameState.player.level}
                            hp={gameState.player.hp}
                            maxHp={gameState.player.maxHp}
                            mp={gameState.player.mp}
                            maxMp={gameState.player.maxMp}
                            hunger={gameState.player.hunger}
                            thirst={gameState.player.thirst}
                            energy={gameState.player.energy}
                            exp={gameState.player.exp}
                            statPoints={gameState.player.statPoints}
                            stats={gameState.player.stats}
                            onStatIncrease={handleStatIncrease}
                            trackedQuests={trackedQuests}
                            localNPCs={localNPCs}
                            onNPCClick={handleNPCClick}
                        />
                    )}
                    
                    {activeTab === 'status' && (
                        <div key={`status-${refreshKey}`} className="h-full pt-8 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                            <CharacterCard 
                                character={gameState.player} 
                                items={gameState.inventory} 
                                skills={gameState.skills} 
                                stats={totalStats}
                                isPlayer={true} 
                                quickSlots={gameState.quickSlots}
                                onAssignQuickSlot={handleAssignQuickSlot}
                                worldSetting={gameState.worldSetting}
                                onAllocateStat={handleAllocateStat}
                                onUpdateCharacter={(updated: any) => setGameState(prev => ({...prev, player: updated}))}
                                onClose={() => setActiveTab('story')}
                                onQuestReceived={handleQuestReceived}
                            />
                        </div>
                    )}

                    {activeTab === 'inventory' && (
                        <div className="h-full pt-8" key={`inv-${refreshKey}`}>
                            <Inventory 
                                items={gameState.inventory || []} 
                                equipment={gameState.player.equipment}
                                recipes={gameState.recipes || []}
                                gold={gameState.player.gold}
                                skillPoints={gameState.player.skillPoints}
                                onCraft={handleCraft}
                                onEquip={handleEquip}
                                onUnequip={handleUnequip}
                                onUpgrade={handleUpgrade}
                                onCheatItem={handleCheatItem}
                                onConsume={handleConsumeItem}
                                onMarkAsSeen={handleMarkAsSeen}
                                onSell={handleSellItems}
                                onRepair={handleRepairItem}
                                onReforge={handleReforge}
                                onAssignQuickSlot={(target) => handleAssignQuickSlot(target as Item)}
                                onRegenerateIcons={handleRegenerateItemIcons}
                            />
                        </div>
                    )}

                    {activeTab === 'encyclopedia' && (
                        <div className="h-full pt-8 overflow-y-auto custom-scrollbar p-4 space-y-8">
                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold text-cyan-400 border-b border-cyan-500/30 pb-2 flex items-center gap-2">
                                    <BookOpen size={24} /> 怪物圖鑑 (Bestiary)
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {gameState.bestiary.length === 0 ? (
                                        <p className="text-slate-500 italic col-span-full text-center py-8">尚未遭遇任何怪物...</p>
                                    ) : (
                                        gameState.bestiary.map(entry => (
                                            <div key={entry.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-cyan-500/50 transition-colors">
                                                <div className="flex items-center gap-3 mb-2">
                                                    {entry.image ? (
                                                        <img src={entry.image} alt={entry.name} className="w-12 h-12 rounded-full object-cover border border-slate-600" />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-600">
                                                            <Skull size={20} className="text-slate-500" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h3 className="font-bold text-slate-200">{entry.name}</h3>
                                                        <span className="text-xs text-slate-500">{entry.type}</span>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-400 line-clamp-2 mb-2">{entry.description}</p>
                                                <div className="flex justify-between text-xs text-slate-500 border-t border-slate-800 pt-2">
                                                    <span>討伐數: <span className="text-red-400">{entry.killCount}</span></span>
                                                    <span>{new Date(entry.firstEncounteredAt).toLocaleDateString()}</span>
                                                </div>
                                                {(entry.weaknesses && entry.weaknesses.length > 0) && (
                                                    <div className="mt-2 text-xs">
                                                        <span className="text-slate-500">弱點: </span>
                                                        <span className="text-red-300">{entry.weaknesses.join(', ')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold text-yellow-500 border-b border-yellow-500/30 pb-2 flex items-center gap-2">
                                    <Scroll size={24} /> 世界傳說 (Lore)
                                </h2>
                                <div className="space-y-3">
                                    {gameState.loreFragments.length === 0 ? (
                                        <p className="text-slate-500 italic text-center py-8">尚未發現任何歷史片段...</p>
                                    ) : (
                                        gameState.loreFragments.map(lore => (
                                            <div key={lore.id} className="bg-slate-900/30 border border-slate-700/50 rounded-lg p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-bold text-yellow-100/90">{lore.title}</h3>
                                                    <span className="text-[10px] uppercase tracking-wider bg-slate-800 px-2 py-1 rounded text-slate-400">{lore.category}</span>
                                                </div>
                                                <p className="text-sm text-slate-300 leading-relaxed font-serif italic opacity-90">{lore.content}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold text-emerald-400 border-b border-emerald-500/30 pb-2 flex items-center gap-2">
                                    <Package size={24} /> 物品圖鑑 (Items)
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {gameState.discoveredItems.length === 0 ? (
                                        <p className="text-slate-500 italic w-full text-center py-8">尚未發現任何物品...</p>
                                    ) : (
                                        gameState.discoveredItems.map((itemName, idx) => (
                                            <span key={idx} className="bg-slate-800/50 border border-slate-700 px-3 py-1 rounded-full text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-default">
                                                {itemName}
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'skills' && (
                        <div className="h-full pt-8" key={`skill-${refreshKey}`}>
                            <SkillTree 
                                skills={[
                                    ...(gameState.skills || []),
                                    ...Object.values(gameState.player.equipment || {}).reduce<SkillNode[]>((acc, itemId) => {
                                        if (!itemId) return acc;
                                        const item = gameState.inventory.find(i => i.id === itemId);
                                        if (item?.exclusiveSkills) acc.push(...item.exclusiveSkills);
                                        return acc;
                                    }, [])
                                ]} 
                                skillPoints={gameState.player.skillPoints}
                                worldSetting={gameState.worldSetting}
                                quickSlots={gameState.quickSlots}
                                inventory={gameState.inventory}
                                onLearnSkill={handleLearnSkill}
                                onUpgradeSkill={handleUpgradeSkill}
                                onCheatSkill={handleCheatSkill}
                                onBuySkillPoint={buySkillPoint}
                                onAssignQuickSlot={handleAssignQuickSlot}
                                onReforge={handleReforgeSkill}
                                onUpdateSkill={(updatedSkill) => setGameState(prev => ({
                                    ...prev,
                                    skills: prev.skills.map(s => s.id === updatedSkill.id ? updatedSkill : s)
                                }))}
                                onAddSkill={(skill) => setGameState(prev => ({ 
                                    ...prev, 
                                    player: { ...prev.player, skillPoints: prev.player.skillPoints - (gameState.gameMode === 'GM模式' ? 0 : 10) },
                                    skills: [...prev.skills, skill] 
                                }))}
                                onUseSkill={(skill) => handleAction(`使用技能: ${skill.name}`, "custom", skill.id)}
                            />
                        </div>
                    )}

                    {activeTab === 'npcs' && (
                        <div className="h-full pt-8" key={`npc-${refreshKey}`}>
                            <NPCPanel 
                                npcs={gameState.npcs || []} 
                                inventory={gameState.inventory || []}
                                skills={gameState.skills || []}
                                onUpdateNPC={handleUpdateNPC}
                                onDeleteNPC={handleDeleteNPC}
                                player={gameState.player} // Pass player
                                locations={[gameState.currentLocation, ...gameState.visitedLocations]}
                                onQuestReceived={handleQuestReceived}
                                onRecipeLearned={handleRecipeLearned}
                                onGenerateNPC={handleGenerateNPC}
                                isGenerating={loading}
                                history={gameState.logs}
                                onGiftItem={(npc, item) => {
                                    handleConsumeItem(item); 
                                    showNotification(`送出了 ${item.name}`);
                                }}
                                onBuyItem={handleBuyItemFromNPC}
                                onSellItem={handleSellItemToNPC}
                                selectedId={selectedNPCId}
                                setSelectedId={setSelectedNPCId}
                                worldSetting={gameState.worldSetting}
                            />
                        </div>
                    )}

                    {activeTab === 'quests' && (
                        <div className="h-full pt-8" key={`quest-${refreshKey}`}>
                            <QuestPanel 
                                quests={gameState.quests || []} 
                                onToggleTrack={handleToggleTrackQuest}
                            />
                        </div>
                    )}

                    {activeTab === 'achievements' && (
                        <div className="h-full pt-8" key={`achievements-${refreshKey}`}>
                            <AchievementPanel unlockedAchievements={gameState.achievements} />
                        </div>
                    )}

                    {activeTab === 'action' && (
                        <div className="h-full pt-8" key={`action-${refreshKey}`}>
                            <ActionGamePanel 
                                gameState={gameState} 
                                onUpdateGameState={(newState) => setGameState(newState)}
                            />
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="h-full flex items-center justify-center p-4">
                            <Card title="系統設定" className="w-full max-md">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-300">遊戲難度</span>
                                        <select 
                                            className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1"
                                            value={gameState.difficulty}
                                            onChange={(e) => setGameState(prev => ({...prev, difficulty: e.target.value as any}))}
                                        >
                                            <option value="Easy">簡單</option>
                                            <option value="Medium">普通</option>
                                            <option value="Hard">困難</option>
                                            <option value="Impossible">不可能</option>
                                            <option value="Hopeless">沒救了</option>
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-2 mt-2 border-t border-slate-800 pt-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-300 flex items-center gap-2"><Dices size={16}/> 遊戲模式</span>
                                            <select 
                                                className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 max-w-[150px] text-sm"
                                                value={gameState.gameMode}
                                                onChange={(e) => setGameState(prev => ({...prev, gameMode: e.target.value}))}
                                            >
                                                {Object.keys(gameModeDescriptions).map(mode => (
                                                    <option key={mode} value={mode}>{mode}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 pt-4">
                                         <span className="text-slate-300 flex items-center gap-2 text-red-400 font-bold"><Trash2 size={16}/> 真空化日誌</span>
                                         <Button onClick={vacuumLogs} variant="danger" size="sm" className="px-4">執行壓縮</Button>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 pt-4">
                                         <span className="text-slate-300 flex items-center gap-2"><Globe size={16}/> 語言</span>
                                         <select 
                                            className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1"
                                            value={gameState.language}
                                            onChange={(e) => setGameState(prev => ({...prev, language: e.target.value}))}
                                        >
                                            <option value="Traditional Chinese">繁體中文</option>
                                            <option value="English">English</option>
                                            <option value="Japanese">日本語</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                                        <span className="text-slate-300 flex items-center gap-2"><ImageIcon size={16}/> 全局 AI 圖片生成</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer"
                                                checked={gameState.generateStoryImages ?? true}
                                                onChange={(e) => setGameState(prev => ({ ...prev, generateStoryImages: e.target.checked }))}
                                            />
                                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <span className="text-slate-300 flex items-center gap-2"><Gauge size={16}/> 極速模式</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer"
                                                checked={gameState.fastMode ?? true}
                                                onChange={(e) => setGameState(prev => ({ ...prev, fastMode: e.target.checked }))}
                                            />
                                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                                         <span className="text-slate-300 flex items-center gap-2"><SparklesIcon size={16}/> 重繪所有技能圖標</span>
                                         <Button onClick={handleRegenerateSkillIcons} variant="secondary" size="sm" className="px-4 bg-orange-900/40 border-orange-500/30 text-orange-400 hover:bg-orange-800 hover:text-white">執行重繪</Button>
                                    </div>

                                    <div className="pt-2">
                                        <Button variant="ghost" onClick={() => setShowGodMode(true)} className="w-full text-xs text-red-500/50 hover:text-red-500 hover:bg-red-950/20">
                                            <Lock size={12} className="mr-1"/> 上帝模式 (數據編輯器)
                                        </Button>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-4 border-t border-slate-800">
                                        <div className="flex flex-col gap-3">
                                            <Button onClick={exportSave} className="w-full flex items-center justify-center gap-2 py-4 bg-cyan-600 border-cyan-400 text-white shadow-lg">
                                                <Download size={20}/> 下載當前存檔 (.json)
                                            </Button>
                                            <Button onClick={triggerImport} variant="secondary" className="w-full flex items-center justify-center gap-2 py-4 bg-slate-800 border-slate-600 hover:border-cyan-500 text-white">
                                                <Upload size={20}/> 匯入本地存檔
                                            </Button>
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={importSave} className="hidden" accept=".json" />
                                        <Button onClick={resetGame} variant="danger" className="w-full mt-4">
                                            重置並開啟新局
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'achievements' && (
                        <div className="h-full pt-8" key={`achievements-${refreshKey}`}>
                            <AchievementPanel unlockedAchievements={gameState.achievements} />
                        </div>
                    )}
                </Suspense>
                </div>

                {(activeTab === 'story' || activeTab === 'action') && (
                    <div className="hidden lg:flex flex-col h-full bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl animate-slide-left">
                        <div className="flex border-b border-slate-700/50 bg-slate-950/50 p-1 gap-1 shrink-0">
                            {[
                            { id: 'inventory', icon: Backpack, label: '物品' },
                            { id: 'skills', icon: Zap, label: '技能' },
                            { id: 'status', icon: User, label: '狀態' },
                            { id: 'quests', icon: Scroll, label: '任務' }
                            ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setRightPanelTab(tab.id as any)}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1 ${
                                    rightPanelTab === tab.id 
                                    ? 'bg-slate-800 text-cyan-400 shadow-inner' 
                                    : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
                                }`}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                            </button>
                            ))}
                        </div>
                        
                        <div className="flex-1 overflow-hidden relative bg-slate-900/30">
                            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div></div>}>
                                {rightPanelTab === 'inventory' && (
                                <div className="h-full p-2">
                                    <Inventory 
                                        items={gameState.inventory || []} 
                                        equipment={gameState.player.equipment}
                                        recipes={gameState.recipes || []}
                                        gold={gameState.player.gold}
                                        skillPoints={gameState.player.skillPoints}
                                        onCraft={handleCraft}
                                        onEquip={handleEquip}
                                        onUnequip={handleUnequip}
                                        onUpgrade={handleUpgrade}
                                        onCheatItem={handleCheatItem}
                                        onConsume={handleConsumeItem}
                                        onMarkAsSeen={handleMarkAsSeen}
                                        onSell={handleSellItems}
                                        onRepair={handleRepairItem}
                                        onReforge={handleReforge}
                                        onAssignQuickSlot={(target) => handleAssignQuickSlot(target as Item)}
                                        onRegenerateIcons={handleRegenerateItemIcons}
                                    />
                                </div>
                                )}
                                {rightPanelTab === 'skills' && (
                                <div className="h-full p-2">
                                    <SkillTree 
                                        skills={gameState.skills || []} 
                                        skillPoints={gameState.player.skillPoints}
                                        worldSetting={gameState.worldSetting}
                                        quickSlots={gameState.quickSlots}
                                        inventory={gameState.inventory}
                                        onLearnSkill={handleLearnSkill}
                                        onUpgradeSkill={handleUpgradeSkill}
                                        onCheatSkill={handleCheatSkill}
                                        onBuySkillPoint={buySkillPoint}
                                        onAssignQuickSlot={handleAssignQuickSlot}
                                        onReforge={handleReforgeSkill}
                                        onUpdateSkill={(updatedSkill) => setGameState(prev => ({
                                            ...prev,
                                            skills: prev.skills.map(s => s.id === updatedSkill.id ? updatedSkill : s)
                                        }))}
                                        onAddSkill={(skill) => setGameState(prev => ({ 
                                            ...prev, 
                                            player: { ...prev.player, skillPoints: prev.player.skillPoints - (gameState.gameMode === 'GM模式' ? 0 : 10) },
                                            skills: [...prev.skills, skill] 
                                        }))}
                                        onUseSkill={(skill) => handleAction(`使用技能: ${skill.name}`, "custom", skill.id)}
                                        onRegenerateIcons={handleRegenerateSkillIcons}
                                    />
                                </div>
                                )}
                                {rightPanelTab === 'status' && (
                                <div className="h-full p-2 overflow-y-auto custom-scrollbar">
                                    <CharacterCard 
                                        character={gameState.player} 
                                        items={gameState.inventory} 
                                        skills={gameState.skills} 
                                        stats={totalStats}
                                        isPlayer={true} 
                                        quickSlots={gameState.quickSlots}
                                        onAssignQuickSlot={handleAssignQuickSlot}
                                        worldSetting={gameState.worldSetting}
                                        onAllocateStat={handleAllocateStat}
                                        onUpdateCharacter={(updated: any) => setGameState(prev => ({...prev, player: updated}))}
                                        onClose={() => {}}
                                    />
                                </div>
                                )}
                                {rightPanelTab === 'quests' && (
                                <div className="h-full p-2 overflow-y-auto custom-scrollbar">
                                    <QuestPanel 
                                        quests={gameState.quests || []} 
                                        onToggleTrack={handleToggleTrackQuest}
                                    />
                                </div>
                                )}
                            </Suspense>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="shrink-0 h-16 bg-slate-900 border-t border-slate-800 flex justify-between px-2 pb-2 pt-1 gap-2 z-50 overflow-x-auto custom-scrollbar">
                <NavButton active={activeTab === 'story'} onClick={() => setActiveTab('story')} icon={<BookOpen size={20}/>} label="故事" />
                <NavButton active={activeTab === 'status'} onClick={() => setActiveTab('status')} icon={<User size={20}/>} label="狀態" />
                <NavButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Backpack size={20}/>} label="背包" />
                <NavButton active={activeTab === 'skills'} onClick={() => setActiveTab('skills')} icon={<Zap size={20}/>} label="技能" />
                <NavButton active={activeTab === 'npcs'} onClick={() => setActiveTab('npcs')} icon={<Users size={20}/>} label="NPC" />
                <NavButton active={activeTab === 'quests'} onClick={() => setActiveTab('quests')} icon={<Scroll size={20}/>} label="任務" />
                <NavButton active={activeTab === 'encyclopedia'} onClick={() => setActiveTab('encyclopedia')} icon={<BookOpen size={20}/>} label="圖鑑" />
                <NavButton active={activeTab === 'action'} onClick={() => setActiveTab('action')} icon={<Gamepad2 size={20}/>} label="動作" />
                <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20}/>} label="設定" />
            </div>
        </div>
      </div>

      {showShop && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <Card title="道具商店" className="w-full max-md relative">
                  <button onClick={() => setShowShop(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20}/></button>
                  <div className="text-center py-4">
                       <p className="text-slate-400 mb-6">歡迎光臨！需要變強嗎？</p>
                       <div className="flex items-center justify-center gap-4 mb-6 bg-slate-800 p-4 rounded-lg">
                           <div className="text-center">
                               <div className="text-xs text-slate-500">擁有金幣</div>
                               <div className="text-xl text-yellow-500 font-mono font-bold">{gameState.player.gold} G</div>
                           </div>
                           <div className="h-8 w-px bg-slate-600"></div>
                           <div className="text-center">
                               <div className="text-xs text-slate-500">技能點數</div>
                               <div className="text-xl text-cyan-500 font-mono font-bold">{gameState.player.skillPoints} SP</div>
                           </div>
                       </div>
                       
                       <Button onClick={buySkillPoint} disabled={gameState.player.gold < 100 && gameState.gameMode !== 'GM模式'} className="w-full py-4 flex items-center justify-center gap-2 text-lg">
                           <ShoppingCart /> 購買 1 技能點 (100 G)
                       </Button>
                  </div>
              </Card>
          </div>
      )}

      {showGodMode && (
          <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
              <Card title="上帝模式 (數據編輯器)" className="w-full max-w-4xl h-[80vh] flex flex-col relative">
                  <button onClick={() => setShowGodMode(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20}/></button>
                  <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                      <p className="text-red-500 text-xs font-bold uppercase tracking-widest text-center">警告：直接修改底層狀態可能導致數據損毀。</p>
                      {!isGodModeUnlocked ? (
                          <div className="flex-1 flex flex-col items-center justify-center gap-4">
                              <Lock size={48} className="text-slate-800 opacity-50"/>
                              <div className="flex flex-col gap-1 w-full max-w-xs">
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">加密權限密碼</label>
                                  <Input 
                                      type="password" 
                                      placeholder="管理員密碼..." 
                                      value={godModePassword} 
                                      onChange={e => setGodModePassword(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && checkGodMode()}
                                      className="bg-black/40 border-slate-800 text-center text-cyan-400"
                                  />
                              </div>
                              <Button onClick={checkGodMode} className="w-full max-w-xs bg-red-900/40 border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white">解鎖存取權限</Button>
                          </div>
                      ) : (
                          <div className="flex-1 flex flex-col gap-4 overflow-hidden animate-fade-in">
                              <div className="flex-1 relative group">
                                  <textarea 
                                      className="w-full h-full bg-black/60 border border-slate-700 rounded-xl p-6 font-mono text-[10px] text-green-500 focus:outline-none focus:border-green-500/50 custom-scrollbar resize-none"
                                      value={godModeData}
                                      onChange={e => setGodModeData(e.target.value)}
                                      spellCheck={false}
                                  />
                                  <div className="absolute top-2 right-2 text-[8px] font-black text-slate-700 uppercase pointer-events-none group-hover:text-green-900">原始 JSON 狀態</div>
                              </div>
                              <div className="flex gap-3">
                                  <Button onClick={() => setIsGodModeUnlocked(false)} variant="secondary" className="flex-1">鎖定權限</Button>
                                  <Button onClick={saveGodMode} className="flex-[2] bg-red-600 border-red-400 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)]">執行原子級寫入</Button>
                              </div>
                          </div>
                      )}
                  </div>
              </Card>
          </div>
      )}
    </div>
  );
};

export default App;
