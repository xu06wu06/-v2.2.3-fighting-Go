
export type WeatherType = 'Sunny' | 'Cloudy' | 'Rainy' | 'Snowy' | 'Foggy' | 'Stormy';
export type ElementType = 'Neutral' | 'Fire' | 'Water' | 'Wind' | 'Earth' | 'Lightning' | 'Holy' | 'Dark';
export type SkillType = 'active' | 'passive' | 'buff' | 'debuff' | 'special';

export interface Affix {
  id: string;
  name: string;
  effect: string;
  stats?: Partial<Stats>; // Added for deterministic calculations
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Profession {
  name: string;
  description: string;
  statsBonus: Partial<Stats>;
  startingSkills: string[];
}

export interface Title {
  id: string;
  name: string;
  description: string;
  bonus?: Partial<Stats>;
}

export interface FactionReputation {
  factionName: string;
  score: number; // -100 to 100
  rank: string;
}

export interface StructuredSkill {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  damageType?: DamageType;
  elementType?: ElementType;
  skillType: SkillType; // 新增：技能類型
  affixes?: Affix[]; // 新增：詞綴系統
  cooldown?: number;
  manaCost?: number; 
  staminaCost?: number; // Added stamina cost
  level?: number;
  tacticalAnalysis?: string; 
  visualEffect?: string; // 新增：以太視覺效果
  loreSignificance?: string; // 新增：世界觀意義
  targetType?: 'single' | 'aoe' | 'self' | 'ally' | 'random'; // 新增：目標類型
}

export interface NPCArchive {
  background: string;
  secret: string;
  goal: string;
  firstImpression: string;
  personalityTraits: string[];
}

export interface NPCRelationsAnalysis {
  factionStanding: string;
  socialConflict: string;
  strategicAdvice: string;
}

export type EnemyAIType = 'Basic' | 'Aggressive' | 'Defensive' | 'Tactical' | 'Healer' | 'Boss';

export interface BossPhase {
  triggerHpPercentage: number;
  name: string;
  dialogue?: string;
  newSkills?: string[]; // IDs of skills to unlock/use
  statMultipliers?: Partial<Stats>;
}

export interface EnemyAIConfig {
  type: EnemyAIType;
  aggroRange?: number;
  fleeThreshold?: number; // HP percentage to flee
  healThreshold?: number; // HP percentage to heal
  specialSkillChance?: number; // Chance to use special skill
  phases?: BossPhase[]; // For bosses
}

export type EnemyActionType = 'Attack' | 'Defend' | 'Skill' | 'Flee' | 'Heal' | 'Wait' | 'PhaseTransition';

export interface EnemyCombatAction {
  type: EnemyActionType;
  skillId?: string;
  targetId?: string; // For multi-target or self
  description: string;
}

export interface NPC {
  id: string;
  name: string;
  description: string;
  affection: number; 
  status: 'Neutral' | 'Ally' | 'Enemy' | 'Lover';
  relationshipLevel?: string; 
  avatarUrl?: string;
  breakdownImageUrl?: string;
  memory: string[]; 
  stylePrompt: string;
  interactionLog: InteractionLogEntry[];
  stats?: Stats;
  skills?: string | StructuredSkill[]; 
  locationId?: string;
  resistances?: DamageType[]; 
  weaknesses?: DamageType[]; 
  statusEffects?: StatusEffect[];
  hp?: number;
  maxHp?: number;
  mp?: number;
  maxMp?: number;
  faction?: string;
  elementalAffinity?: ElementType;
  archive?: NPCArchive;
  isPinned?: boolean;
  relationsAnalysis?: NPCRelationsAnalysis;
  inventory?: Item[];
  playerInteractionStyle?: string; // 新增：NPC 對玩家互動風格的認知
  behaviorAnalysis?: NPCBehaviorAnalysis; // 新增：NPC 行為模式分析
  visuals?: {
    spriteUrl?: string;
    backgroundUrl?: string;
    currentMood?: string;
    currentAction?: string;
  };
  aiConfig?: EnemyAIConfig; // Added AI config
  currentPhase?: number; // Added for bosses
}

export interface NPCBehaviorAnalysis {
  currentMood: string; // 當前情緒 (e.g., "Cautious", "Aggressive", "Desperate")
  primaryGoal: string; // 當前首要目標 (e.g., "Survival", "Profit", "Revenge")
  strategy: string; // 採取的策略 (e.g., "Feign ignorance", "Intimidate", "Barter")
  nextAction: string; // 預計採取的下一步行動 (e.g., "Attack", "Flee", "Offer quest")
}

export interface InteractionLogEntry {
  id: string;
  timestamp: number;
  summary: string;
  affectionChange: number;
}

export interface QuestReward {
  exp?: number;
  gold?: number;
  items?: Item[];
  reputation?: number;
}

export interface QuestRequirement {
  type: 'kill' | 'collect' | 'visit' | 'interact';
  target: string;
  count: number;
  current: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'main' | 'side' | 'challenge';
  status: 'active' | 'completed' | 'failed';
  rewards?: QuestReward;
  requirements?: QuestRequirement[];
  objectives?: string[]; // Legacy support or narrative objectives
  progress?: number; 
  isTracked?: boolean; 
  deadline?: number; // Added deadline (turn count)
}

export interface Location {
  id: string;
  name: string;
  description: string;
  type?: 'town' | 'dungeon' | 'wilderness'; // Added type
  features?: string[]; // Added features
  atmosphere?: string; // Added atmosphere
  voxelMapUrl?: string; 
  mapImageUrl?: string; 
}

export interface LogEntry {
  id: string;
  text: string;
  type: 'narrative' | 'system' | 'chat' | 'world_event';
  imageUrl?: string;
  timestamp: number;
  options?: StoryOptions; 
}

export interface StoryOptions {
  impulsive: string;
  smart: string;
  funny: string;
  characteristic1: string;
  characteristic2: string;
  characteristic3: string;
  characteristic4: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedAt: number;
  icon?: string; 
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: string[]; 
  resultItemName: string;
  type?: 'crafting' | 'cooking';
  unlocked: boolean;
}

export interface BestiaryEntry {
  id: string;
  name: string;
  description: string;
  type?: string;
  killCount: number;
  firstEncounteredAt: number;
  abilities?: string[];
  weaknesses?: string[];
  resistances?: string[];
  image?: string;
}

export interface LoreEntry {
  id: string;
  title: string;
  content: string;
  category: 'History' | 'Geography' | 'Faction' | 'Myth' | 'Botany' | 'Other';
  unlockedAt: number;
}

export type TabView = 'story' | 'status' | 'inventory' | 'skills' | 'npcs' | 'quests' | 'settings' | 'map' | 'action' | 'achievements' | 'encyclopedia';

export interface Player {
  name: string;
  description: string;
  backgroundStory?: string;
  appearance?: {
    hairstyle: string;
    eyeColor: string;
    clothingStyle: string;
    stylePrompt?: string; // 新增：畫風設定
  };
  traits: string[];
  race?: string; // Added race
  profession?: string;
  professionDescription?: string;
  gender: 'Male' | 'Female' | 'Other';
  avatarUrl: string;
  breakdownImageUrl?: string;
  level: number;
  hp: number; 
  maxHp: number; 
  mp: number; 
  maxMp: number; 
  stamina: number; // Added stamina
  maxStamina: number; // Added maxStamina
  exp: number;
  skillPoints: number;
  statPoints: number; // Added for manual stat allocation
  stats: Stats; 
  equipment: EquipmentSlots;
  gold: number;
  statusEffects: StatusEffect[];
  resistances?: DamageType[];
  weaknesses?: DamageType[];
  hunger: number; 
  thirst: number; 
  energy: number; 
  reputation: number;
  factions: FactionReputation[];
  titles: Title[];
  activeTitleId?: string;
  elementalAffinity: ElementType;
  affection: number; 
  memory: string[];
  interactionLog: InteractionLogEntry[];
}

export interface Stats {
  strength: number;
  intelligence: number;
  agility: number;
  charisma: number;
  luck: number;
  endurance: number;
  perception: number; // Added: Perception stat
  hitRate?: number; // Added: Base hit rate bonus
  evasionRate?: number; // Added: Base evasion rate bonus
}

export interface EquipmentSlots {
  head: string | null; 
  neck: string | null; 
  body: string | null;
  right_hand: string | null; 
  left_hand: string | null;
  feet: string | null; 
  accessory: string | null;
  back: string | null;
  waist: string | null;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: 'consumable' | 'equipment' | 'material' | 'misc' | 'food';
  slot?: 'head' | 'body' | 'right_hand' | 'left_hand' | 'accessory' | 'feet' | 'neck' | 'back' | 'waist'; 
  stats?: Partial<Stats>; 
  affixes?: Affix[]; // 新增：詞綴系統
  iconUrl?: string; 
  level?: number; 
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  quantity: number;
  isNew?: boolean;
  potionEffect?: string; 
  durability?: number; 
  maxDurability?: number; 
  nutrition?: number; 
  hydration?: number; 
  staminaRestore?: number; 
  damageType?: DamageType;
  elementType?: ElementType; // Added element type
  statusEffect?: StatusEffectType;
  price?: number;
  isGiftable?: boolean;
  weight?: number; // 新增：重量
  setId?: string; // 新增：套裝 ID
  binding?: 'equip' | 'pickup' | 'none'; // 新增：綁定狀態
  craftingRecipe?: string[]; // 新增：合成配方
  exclusiveSkills?: SkillNode[]; // 新增：物品專屬技能
}

export type StatusEffectType = 'poison' | 'burn' | 'freeze' | 'stun' | 'bleed' | 'buff' | 'debuff' | 'starvation' | 'dehydration' | 'exhaustion';
export type DamageType = 'slash' | 'pierce' | 'blunt' | 'fire' | 'ice' | 'lightning' | 'holy' | 'dark';

export interface StatusEffect {
  type: StatusEffectType;
  name: string;
  duration: number; 
  description: string;
}

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  parentId?: string;
  iconUrl?: string;
  skillType: SkillType; // 新增：技能類型
  affixes?: Affix[]; // 新增：詞綴系統
  cost: number;
  level?: number;
  cooldown?: number; 
  currentCooldown?: number; 
  manaCost?: number; 
  staminaCost?: number; // Added stamina cost
  x?: number;
  y?: number;
  damageType?: DamageType;
  elementType?: ElementType; 
  statusEffect?: StatusEffectType;
  tacticalAnalysis?: string; 
  visualEffect?: string; // 新增：以太視覺效果
  loreSignificance?: string; // 新增：世界觀意義
  targetType?: 'single' | 'aoe' | 'self' | 'ally' | 'random'; // 新增：目標類型
  scalingFormula?: string; // 新增：倍率公式 (e.g., "1.5 * STR + 0.5 * INT")
  hitRate?: number; // 新增：命中率 (%)
  critRate?: number; // 新增：暴擊率 (%)
}

export interface QuickSlot {
  type: 'item' | 'skill';
  id: string;
}

export interface GameTime {
  day: number;
  hour: number;
  minute: number;
}

export interface Pet {
  id: string;
  name: string;
  type: string;
  description: string;
  level: number;
  affection: number; 
  avatarUrl?: string;
  stats?: Partial<Stats>; 
}

export interface GameState {
  player: Player;
  inventory: Item[];
  skills: SkillNode[];
  quests: Quest[];
  npcs: NPC[];
  pets: Pet[]; 
  logs: LogEntry[];
  currentLocation: Location;
  visitedLocations: Location[];
  turnCount: number;
  gameTime: GameTime;
  weather: WeatherType; 
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Impossible' | 'Hopeless';
  gameMode: string; 
  backgroundImageUrl: string;
  achievements: Achievement[];
  recipes: Recipe[];
  worldSetting: string; 
  characterSetting: string;
  characterSkills: string;
  characterSkillsRefined?: boolean;
  characterStartingItems: string;
  tutorialCompleted: boolean;
  tutorialStep: number; 
  generateStoryImages: boolean;
  fastMode: boolean; 
  autoSaveInterval: number; 
  inCombat: boolean;
  combatStartTime?: number; 
  quickSlots: (QuickSlot | null)[];
  language: string;
  notificationsEnabled: boolean;
  bestiary: BestiaryEntry[];
  loreFragments: LoreEntry[];
  discoveredItems: string[]; // List of discovered item names
}

export const INITIAL_GAME_STATE: GameState = {
  player: {
    name: "無名英雄",
    description: "異世界的流浪者。",
    backgroundStory: "",
    appearance: {
      hairstyle: "普通",
      eyeColor: "黑色",
      clothingStyle: "冒險者便裝",
      stylePrompt: "Anime Light Novel Style" // 預設畫風
    },
    traits: [],
    race: "Human",
    gender: 'Male',
    avatarUrl: "https://picsum.photos/200",
    level: 1,
    hp: 100,
    maxHp: 100,
    mp: 100,
    maxMp: 100,
    stamina: 100,
    maxStamina: 100,
    exp: 0,
    skillPoints: 3,
    statPoints: 0,
    gold: 1000, 
    stats: { strength: 5, intelligence: 5, agility: 5, charisma: 5, luck: 5, endurance: 5, perception: 5, hitRate: 0, evasionRate: 0 },
    equipment: { 
      head: null, neck: null, body: null, 
      right_hand: null, left_hand: null, 
      feet: null, accessory: null,
      back: null, waist: null
    },
    statusEffects: [],
    resistances: [],
    weaknesses: [],
    affection: 100, 
    memory: ["你覺醒於這個世界。"],
    interactionLog: [],
    hunger: 100,
    thirst: 100,
    energy: 100,
    reputation: 0,
    factions: [],
    titles: [],
    elementalAffinity: 'Neutral'
  },
  inventory: [],
  skills: [
    { 
      id: 'root', 
      name: '覺醒', 
      description: '一切的開始。', 
      unlocked: true, 
      skillType: 'passive', 
      cost: 0, 
      level: 1, 
      x: 50, 
      y: 50, 
      cooldown: 0, 
      currentCooldown: 0, 
      manaCost: 0, 
      damageType: 'holy', 
      elementType: 'Holy', 
      visualEffect: '全身散發出柔和的金色光芒，如同初升的朝陽，溫暖而不刺眼。',
      loreSignificance: '這是靈魂初次接觸以太流動時產生的共鳴，象徵著英雄旅程的起點。',
      affixes: [{ id: 'init-1', name: '起源之光', effect: '全屬性提升 5%', stats: { strength: 1, intelligence: 1, agility: 1, charisma: 1, luck: 1, endurance: 1 }, rarity: 'legendary' }] 
    },
    {
      id: 'aether-chronicle',
      name: '以太編年史',
      description: '傳說中，宇宙的真理被銘刻在流動的以太之中。此技能並非單純的招式，而是通往「阿卡西紀錄」的鑰匙。當施術者以此權能干涉現實時，周遭的空間將浮現出無數發光的古老文字，如同歷史長河的具現。它象徵著「觀測者」的絕對權威——不僅能讀取過去的榮光，更能將早已失傳的古代奇蹟，暫時重寫於當下的時間軸上。',
      unlocked: false,
      parentId: 'root',
      skillType: 'special',
      cost: 5,
      level: 1,
      cooldown: 10,
      manaCost: 50,
      damageType: 'holy',
      elementType: 'Neutral',
      visualEffect: '空間產生漣漪，無數金色的符文環繞施術者旋轉，形成一本光之巨書的幻影，書頁翻動間流瀉出星塵般的粒子。',
      loreSignificance: '在古老的文獻中，這是只有「記錄者」階級才能修習的禁忌秘術。據說修煉至極致者，甚至能觀測到世界重啟的瞬間。',
      tacticalAnalysis: '極高優先級的戰略技能。雖然消耗巨大，但能隨機觸發過去曾使用過的強力效果，或是在短時間內大幅提升對所有屬性的理解（全抗性與全穿透提升）。建議在關鍵時刻作為逆轉戰局的手段。',
      affixes: [
        { id: 'ac-1', name: '歷史回響', effect: '技能發動時，有 30% 機率重置上一個使用技能的冷卻時間。', rarity: 'epic' },
        { id: 'ac-2', name: '全知視界', effect: '永久提升 10% 魔法命中率與暴擊率。', rarity: 'rare' }
      ]
    }
  ],
  quests: [],
  npcs: [],
  pets: [],
  logs: [],
  currentLocation: { id: 'start', name: '起源之地', description: '命運的齒輪開始轉動。' },
  visitedLocations: [],
  turnCount: 0,
  gameTime: { day: 1, hour: 8, minute: 0 },
  weather: 'Sunny', 
  difficulty: 'Medium',
  gameMode: '正常模式', 
  backgroundImageUrl: 'https://picsum.photos/1920/1080?blur=5',
  achievements: [],
  recipes: [],
  worldSetting: "在這片大陸上，重力並非恆定，而是隨著「情緒」波動。悲傷重若千鈞，喜悅則讓人輕如鴻毛。城市建立在巨大的浮浮游生物背上，人們透過操縱情感來控制飛行高度，狩獵雲海中的夢境獸。",
  characterSetting: "",
  characterSkills: "",
  characterStartingItems: "",
  tutorialCompleted: false,
  tutorialStep: 0,
  generateStoryImages: true,
  fastMode: true, 
  autoSaveInterval: 300000, 
  inCombat: false,
  quickSlots: [null, null, null, null],
  language: 'Traditional Chinese',
  notificationsEnabled: true,
  bestiary: [],
  loreFragments: [],
  discoveredItems: []
};
