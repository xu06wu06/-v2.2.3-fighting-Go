
import { GoogleGenAI, Type } from "@google/genai";
import { GameState, Item, NPC, SkillNode, Location, Profession, Player, NPCArchive, StructuredSkill, Affix, LogEntry, NPCBehaviorAnalysis, EnemyAIConfig, Stats } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_TEXT = 'gemini-3-flash-preview';
const MODEL_PRO = 'gemini-3-pro-preview';
const MODEL_IMAGE = 'gemini-2.5-flash-image'; 

const StatsProperties = {
  strength: { type: Type.INTEGER },
  intelligence: { type: Type.INTEGER },
  agility: { type: Type.INTEGER },
  charisma: { type: Type.INTEGER },
  luck: { type: Type.INTEGER },
  endurance: { type: Type.INTEGER },
  hitRate: { type: Type.INTEGER, description: "Flat bonus to hit roll (d20 scale, e.g., 1-5)" },
  evasionRate: { type: Type.INTEGER, description: "Flat bonus to Armor Class (AC) (e.g., 1-5)" }
};

const StatsSchema = {
  type: Type.OBJECT,
  properties: StatsProperties
};

const AffixSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    name: { type: Type.STRING },
    effect: { type: Type.STRING },
    stats: { ...StatsSchema, nullable: true, description: "Numeric stat bonuses granted by this affix" },
    rarity: { type: Type.STRING, description: "common, rare, epic, legendary" }
  },
  required: ["name", "effect", "rarity"]
};

const StructuredSkillSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    skillType: { type: Type.STRING, description: "active, passive, buff, debuff, special" },
    affixes: { type: Type.ARRAY, items: AffixSchema },
    damageType: { type: Type.STRING, description: "slash, pierce, blunt, fire, ice, lightning, holy, dark" },
    elementType: { type: Type.STRING, description: "Neutral, Fire, Water, Wind, Earth, Lightning, Holy, Dark" },
    statusEffect: { type: Type.STRING },
    cooldown: { type: Type.INTEGER },
    manaCost: { type: Type.INTEGER },
    staminaCost: { type: Type.INTEGER },
    level: { type: Type.INTEGER },
    tacticalAnalysis: { type: Type.STRING },
    visualEffect: { type: Type.STRING, description: "Visual description of the skill's effect" },
    loreSignificance: { type: Type.STRING, description: "The skill's significance in the world's lore" },
    targetType: { type: Type.STRING, description: "single, aoe, self, ally, random" },
    scalingFormula: { type: Type.STRING, description: "e.g. '1.5 * STR + 0.5 * INT'" },
    hitRate: { type: Type.INTEGER, description: "Percentage hit rate (e.g. 95)" },
    critRate: { type: Type.INTEGER, description: "Percentage crit rate (e.g. 5)" }
  },
  required: ["name", "description", "skillType", "visualEffect", "loreSignificance"]
};

const ItemSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    type: { type: Type.STRING, description: "MUST BE one of: equipment, consumable, material, food, misc" },
    rarity: { type: Type.STRING },
    quantity: { type: Type.INTEGER },
    level: { type: Type.INTEGER },
    slot: { type: Type.STRING, nullable: true },
    affixes: { type: Type.ARRAY, items: AffixSchema },
    stats: {
      type: Type.OBJECT,
      nullable: true,
      properties: StatsProperties
    },
    weight: { type: Type.NUMBER },
    setId: { type: Type.STRING, nullable: true },
    binding: { type: Type.STRING, description: "equip, pickup, none" },
    craftingRecipe: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
    exclusiveSkills: { type: Type.ARRAY, items: StructuredSkillSchema, nullable: true },
    damageType: { type: Type.STRING, description: "slash, pierce, blunt, fire, ice, lightning, holy, dark" },
    elementType: { type: Type.STRING, description: "Neutral, Fire, Water, Wind, Earth, Lightning, Holy, Dark" }
  },
  required: ["name", "description", "type"]
};

const StoryResponseSchema = {
  type: Type.OBJECT,
  properties: {
    narrative: { type: Type.STRING },
    sceneDescription: { type: Type.STRING },
    inCombat: { type: Type.BOOLEAN },
    timePassed: { type: Type.INTEGER },
    playerUpdates: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
            hpChange: { type: Type.INTEGER },
            mpChange: { type: Type.INTEGER },
            goldChange: { type: Type.INTEGER },
            expChange: { type: Type.INTEGER },
            spChange: { type: Type.INTEGER },
            hungerChange: { type: Type.INTEGER },
            thirstChange: { type: Type.INTEGER },
            energyChange: { type: Type.INTEGER },
            reputationChange: { type: Type.INTEGER },
            statusEffects: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, description: "poison, burn, freeze, stun, bleed, buff, debuff, starvation, dehydration, exhaustion" },
                        name: { type: Type.STRING },
                        duration: { type: Type.INTEGER },
                        description: { type: Type.STRING }
                    },
                    required: ["type", "name", "duration", "description"]
                }
            },
            newTitle: { 
                type: Type.OBJECT,
                nullable: true,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    bonus: StatsSchema
                }
            },
            statsChange: StatsSchema
        }
    },
    options: {
      type: Type.OBJECT,
      properties: {
        impulsive: { type: Type.STRING },
        smart: { type: Type.STRING },
        funny: { type: Type.STRING },
        characteristic1: { type: Type.STRING },
        characteristic2: { type: Type.STRING },
        characteristic3: { type: Type.STRING },
        characteristic4: { type: Type.STRING },
      },
      required: ["impulsive", "smart", "funny", "characteristic1", "characteristic2", "characteristic3", "characteristic4"],
    },
    newItems: {
      type: Type.ARRAY,
      items: ItemSchema
    },
    newQuests: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          type: { type: Type.STRING, description: "main, side, or challenge" },
          rewards: {
            type: Type.OBJECT,
            properties: {
              exp: { type: Type.INTEGER },
              gold: { type: Type.INTEGER },
              items: { type: Type.ARRAY, items: { type: Type.STRING } }, // Simplified item names for now
              reputation: { type: Type.INTEGER }
            }
          },
          requirements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "kill, collect, visit, interact" },
                target: { type: Type.STRING },
                count: { type: Type.INTEGER }
              },
              required: ["type", "target", "count"]
            }
          },
          objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
          initialProgress: { type: Type.INTEGER }
        },
        required: ["title", "description", "type"]
      }
    },
    newLore: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            category: { type: Type.STRING, description: "History, Geography, Faction, Myth, Botany, Other" }
        },
        required: ["title", "content", "category"]
    },
    npcUpdates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          memoryToAdd: { type: Type.STRING, nullable: true },
          affectionChange: { type: Type.INTEGER, nullable: true },
          hpChange: { type: Type.INTEGER, nullable: true },
          mpChange: { type: Type.INTEGER, nullable: true },
          factionReputationChange: { 
              type: Type.OBJECT,
              nullable: true,
              properties: {
                  factionName: { type: Type.STRING },
                  scoreChange: { type: Type.INTEGER },
                  newRank: { type: Type.STRING, nullable: true }
              },
              required: ["factionName", "scoreChange"]
          }
        },
        required: ["name"]
      }
    },
    newNPCs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          initialAffection: { type: Type.INTEGER },
          faction: { type: Type.STRING, nullable: true },
          stats: StatsSchema,
          skills: { 
            type: Type.ARRAY,
            items: StructuredSkillSchema
          },
          inventory: {
            type: Type.ARRAY,
            items: ItemSchema,
            description: "Unique inventory items based on NPC background and location"
          }
        },
        required: ["name", "description"]
      }
    }
  },
  required: ["narrative", "sceneDescription", "options"]
};

const SYSTEM_INSTRUCTION = `
你是一位擁有 10 年以上經驗的世界級輕小說作家與 RPG 設計師。
【核心原則】
1. **絕對沈浸感**：除非是系統提示，否則不要跳出角色或劇情。
2. **物品分類協議 (Item Categorization Protocol)**：
    - 所有生成的物品必須明確歸類為：\`equipment\` (裝備), \`consumable\` (藥水/藥品), \`food\` (食材/烹飪), \`material\` (鍛造/煉金材料), \`misc\` (雜項)。
    - **裝備必須包含 slot**（如 head, body, right_hand 等）。
    - **消耗品必須有 potionEffect**。
    - **食品必須有 nutrition/hydration**。
3. **屬性動力學矩陣 (Attribute Dynamics Matrix)**：
    - **數值化詞綴**：所有生成的物品 (\`Item\`)、技能 (\`StructuredSkill\`) 或稱號 (\`newTitle\`)，其詞綴 (\`affixes\`) 必須包含明確的數值加成 (\`stats\`)。
    - **邏輯一致性**：物品的主屬性 (\`stats\`) 應與其描述一致；詞綴屬性 (\`affixes[].stats\`) 應是額外的、機率性的或針對性的強化。
    - **稀有度梯度**：普通 (Common) 0-1 詞綴；稀有 (Rare) 1-2 詞綴；史詩 (Epic) 2-3 詞綴；傳說 (Legendary) 3-5 詞綴。傳說級應包含至少一個 +5 以上的單項屬性。
4. **角色自動提取協議**：
    - 每當你在敘述 (narrative) 中引入新角色，必須在 \`newNPCs\` 數組中生成完整數據，包含其專屬的數值化技能。
5. **資源採集協議 (Resource Gathering Protocol)**：
    - 當玩家執行「採集」、「搜索」或類似行動時，必須在 \`newItems\` 中返回 1-3 個符合當前環境的 \`material\` (材料) 或 \`food\` (食材)。
    - 這些材料應該可以用於製作或烹飪。
7. **成長協議 (Progression Protocol)**：
    - 當玩家完成任務、擊敗敵人或達成成就時，必須在 \`playerUpdates.expChange\` 中給予經驗值。
    - 經驗值參考標準：小型戰鬥/事件 10-50 XP，中型 50-200 XP，大型/Boss 200-1000 XP。
    - 若玩家等級提升（由前端判斷），請在敘述中描繪其力量的增長或心境的變化。
8. **輸出格式**：僅限有效的 JSON，所有文字內容均使用繁體中文。不要包含任何 Markdown 代碼塊標籤。
`;

async function generateStructured(model: string, system: string, prompt: string, schema: any) {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: system + "\n請確保所有文字內容均使用繁體中文。",
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });
  
  let text = response.text || '{}';
  text = text.trim();
  if (text.startsWith('```')) {
      text = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON Parse Error:", e, "Raw Text:", text);
    const match = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
    if (match) {
        try {
            return JSON.parse(match[0]);
        } catch (innerE) {
            return {};
        }
    }
    return {};
  }
}

export const refineSkillDescription = async (skillName: string, currentDesc: string, worldSetting: string): Promise<string> => {
  const prompt = `請為技能「${skillName}」撰寫一段詳細、華麗且富有史詩感的描述。
  當前描述：${currentDesc}
  世界觀背景：${worldSetting}
  描述應包含其戰術用途、施放時的視覺效果以及在世界觀中的意義。請務必使用繁體中文。`;
  
  const res = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: prompt,
    config: { systemInstruction: "你是一位精通奇幻設定的作家。請輸出約 150 字的華麗描述。" }
  });
  return res.text || currentDesc;
};

export const generateDynamicWorld = async (currentLocation: Location, worldSetting: string): Promise<{
  name: string;
  description: string;
  type: 'town' | 'dungeon' | 'wilderness';
  features: string[];
  atmosphere: string;
}> => {
  const prompt = `
  基於當前地點 "${currentLocation.name}" (${currentLocation.description}) 和世界觀 "${worldSetting}"，
  請生成一個相鄰的新區域。
  
  請提供以下資訊：
  1. 區域名稱 (Name): 富有奇幻色彩的地名。
  2. 區域描述 (Description): 詳細的環境描寫，包含視覺、聽覺和氛圍。
  3. 區域類型 (Type): 必須是 'town' (城鎮), 'dungeon' (地牢), 或 'wilderness' (荒野)。
  4. 區域特徵 (Features): 3-5 個該區域的獨特地標或互動點 (例如：古老的祭壇、廢棄的礦坑入口、神秘的商人)。
  5. 氛圍 (Atmosphere): 該區域的整體氣氛 (例如：陰森、熱鬧、寧靜)。

  請以 JSON 格式輸出。
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      description: { type: Type.STRING },
      type: { type: Type.STRING, enum: ['town', 'dungeon', 'wilderness'] },
      features: { type: Type.ARRAY, items: { type: Type.STRING } },
      atmosphere: { type: Type.STRING }
    },
    required: ["name", "description", "type", "features", "atmosphere"]
  };

  return await generateStructured(MODEL_TEXT, "你是一位精通奇幻世界構建的設計師。", prompt, schema);
};

export const analyzeNPCSkillTactics = async (skill: StructuredSkill, npcName: string, worldSetting: string): Promise<string> => {
    const prompt = `
    請為 NPC "${npcName}" 的技能 "${skill.name}" 提供深度的「史詩級戰術分析」。
    技能類型：${skill.skillType}
    詞綴效果：${skill.affixes?.map(a => a.name + ": " + a.effect).join(", ") || "無"}
    當前技能描述：${skill.description}
    世界觀：${worldSetting}

    請以專業、華麗且富有情境感的方式撰寫，包含以下三個維度：
    1. 戰略價值：此招式如何在戰場中發揮最大效用。
    2. 現象觀測：施放時以太能量流動的具體細節。
    3. 傳奇意義：這招式在世界觀歷史中的地位。
    字數約 150-200 字。
    `;
    const res = await ai.models.generateContent({
        model: MODEL_PRO,
        contents: prompt,
        config: { systemInstruction: "你是一位戰術大師與歷史學家。" }
    });
    return res.text || "無法解析戰術數據。";
};

export const analyzePlayerSkillTactics = async (skill: SkillNode, worldSetting: string): Promise<{
    tacticalAnalysis: string;
    visualEffect: string;
    loreSignificance: string;
}> => {
    const prompt = `
    請為玩家技能 "${skill.name}" 提供深度的「戰術分析 (Tactical Analysis)」。
    技能類型：${skill.skillType}
    當前描述：${skill.description}
    世界觀：${worldSetting}

    請以戰術教官或戰鬥大師的口吻，分析此技能在實戰中的應用：
    1. **最佳使用時機**：何時施放效益最大（例如：敵人破防時、被包圍時）。
    2. **連招建議**：適合與哪些類型的技能或狀態配合。
    3. **風險評估**：施放此技能的潛在代價或破綻。
    4. **以太視覺效果**：描述技能施放時的視覺特效。
    5. **世界觀意義**：此技能在世界觀中的傳承或象徵意義。
    
    請務必使用繁體中文。
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            tacticalAnalysis: { type: Type.STRING },
            visualEffect: { type: Type.STRING },
            loreSignificance: { type: Type.STRING }
        },
        required: ["tacticalAnalysis", "visualEffect", "loreSignificance"]
    };

    return generateStructured(MODEL_TEXT, SYSTEM_INSTRUCTION, prompt, schema);
};

export const structureNPCSkills = async (npcName: string, rawSkillsText: string, worldSetting: string): Promise<StructuredSkill[]> => {
    const prompt = `
    請將 NPC "${npcName}" 的以下原始技能描述轉化為結構化數據：
    原始描述：${rawSkillsText}
    世界觀：${worldSetting}

    請輸出一個符合 StructuredSkill 介面的 JSON 陣列。
    必須包含：
    - 技能名稱 (name)
    - 詳細描述 (description)
    - 技能類型 (skillType)
    - 戰術分析 (tacticalAnalysis)
    - 以太視覺效果 (visualEffect)
    - 世界觀意義 (loreSignificance)
    - 詞綴 (affixes)
    `;
    const schema = {
        type: Type.ARRAY,
        items: StructuredSkillSchema
    };
    return generateStructured(MODEL_TEXT, SYSTEM_INSTRUCTION, prompt, schema);
};

export const generateNPCInventory = async (npc: NPC, worldSetting: string, history: string = "", locationContext?: string): Promise<Item[]> => {
    const prompt = `
    【NPC 專屬物品具現協議啟動】
    請為 NPC "${npc.name}" 生成 3-5 個與其身分深度連動的專屬物品。
    
    NPC 身份背景：${npc.archive?.background || npc.description}
    NPC 核心秘密：${npc.archive?.secret || '未知'}
    所屬勢力：${npc.faction || '無'}
    當前地點：${locationContext || '未知'}
    世界觀背景：${worldSetting}
    
    要求：
    1. **主題連動**：物品必須體現該 NPC 的過去或秘密（例如：落魄貴族可能持有帶有家族紋章但已破損的史詩墜飾）。
    2. **稀有度與詞綴**：必須包含 rarity (common/rare/epic/legendary) 並附帶 1-3 條具有數值加成的 affixes。
    3. **類別嚴格化**：類別必須為 equipment, consumable, material, food, misc。裝備必須指定 slot。
    
    請輸出符合 Item 介面的 JSON 陣列。
    `;

    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                type: { type: Type.STRING },
                rarity: { type: Type.STRING },
                quantity: { type: Type.INTEGER },
                slot: { type: Type.STRING, nullable: true },
                isGiftable: { type: Type.BOOLEAN },
                affixes: { type: Type.ARRAY, items: AffixSchema },
                stats: StatsSchema,
                price: { type: Type.INTEGER },
                weight: { type: Type.NUMBER },
                setId: { type: Type.STRING, nullable: true },
                binding: { type: Type.STRING },
                craftingRecipe: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true }
            },
            required: ["name", "description", "type", "rarity", "quantity", "affixes"]
        }
    };

    return generateStructured(MODEL_TEXT, SYSTEM_INSTRUCTION, prompt, schema);
};

export const fuseSkills = async (baseSkills: SkillNode[], worldSetting: string): Promise<any> => {
  const prompt = `
  【技能融合協議啟動】
  素材技能：${baseSkills.map(s => s.name).join(' + ')}
  世界觀：${worldSetting}

  請演化出一個全新的、繼承素材特性的「融合技能」。
  要求：
  1. 具備 3-5 條史詩級或傳說級詞綴。
  2. 描述必須展現多種能量混合的華麗視覺效果。
  3. 提供深度的「戰術詳解 (tacticalAnalysis)」，說明其在戰鬥中的極限運用。
  4. 描述施放時的「以太視覺效果 (visualEffect)」。
  5. 說明該技能在世界觀中的「傳承或意義 (loreSignificance)」。
  `;
  const schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      description: { type: Type.STRING },
      skillType: { type: Type.STRING },
      affixes: { type: Type.ARRAY, items: AffixSchema },
      damageType: { type: Type.STRING },
      elementType: { type: Type.STRING },
      cooldown: { type: Type.INTEGER },
      manaCost: { type: Type.INTEGER },
      tacticalAnalysis: { type: Type.STRING },
      visualEffect: { type: Type.STRING },
      loreSignificance: { type: Type.STRING },
      fusionNarrative: { type: Type.STRING },
      targetType: { type: Type.STRING },
      scalingFormula: { type: Type.STRING }
    },
    required: ["name", "description", "skillType", "affixes", "tacticalAnalysis", "fusionNarrative", "visualEffect", "loreSignificance"]
  };
  return generateStructured(MODEL_PRO, SYSTEM_INSTRUCTION, prompt, schema);
};

export const generateProfessions = async (worldSetting: string): Promise<Profession[]> => {
  const prompt = `Generate 4 thematic RPG professions for world: "${worldSetting}". Include stats bonuses and starting skills. Respond in Traditional Chinese.`;
  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        statsBonus: StatsSchema,
        startingSkills: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["name", "description", "statsBonus", "startingSkills"]
    }
  };
  return generateStructured(MODEL_TEXT, "You are an RPG system architect. Respond in Traditional Chinese.", prompt, schema);
};

export const generateStorySegment = async (gameState: GameState, action: string, actionType: string) => {
  const history = gameState.logs.slice(-10).map(l => `${l.type === 'narrative' ? 'Game' : 'Player'}: ${l.text}`).join('\n');
  const player = gameState.player;
  
  const appearanceText = player.appearance ? `外貌：${player.appearance.hairstyle}, ${player.appearance.eyeColor}眼睛, ${player.appearance.clothingStyle}` : "";
  const traitsText = player.traits && player.traits.length > 0 ? `特質：${player.traits.join(', ')}` : "";
  const backgroundText = player.backgroundStory ? `背景故事：${player.backgroundStory}` : "";

  const factionRepContext = player.factions.length > 0 
    ? `玩家派系聲望清單：\n${player.factions.map(f => `- ${f.factionName}: ${f.score} (${f.rank})`).join('\n')}`
    : "玩家尚未在任何派系建立聲望。";

  const statusContext = `Level:${player.level}, HP:${player.hp}/${player.maxHp}, MP:${player.mp}/${player.maxMp}, Stats:[STR:${player.stats.strength}, INT:${player.stats.intelligence}, AGI:${player.stats.agility}, CHA:${player.stats.charisma}, LUK:${player.stats.luck}, END:${player.stats.endurance}], Hunger:${player.hunger}, Thirst:${player.thirst}, Energy:${player.energy}, Rep:${player.reputation}, Title:${player.titles.find(t => t.id === player.activeTitleId)?.name || '無'}`;
  
  const unlockedSkills = gameState.skills.filter(s => s.unlocked).map(s => `- ${s.name} (${s.skillType}, ${s.damageType || 'physical'}, Level ${s.level || 1})`).join('\n');
  const skillsContext = unlockedSkills ? `玩家已解鎖技能：\n${unlockedSkills}` : "玩家尚未解鎖任何技能。";

  const localNPCs = gameState.npcs.filter(n => n.locationId === gameState.currentLocation.id);
  const npcContext = localNPCs.map(n => `- ${n.name} (個人好感:${n.affection}, 派系:${n.faction || '無'})`).join('\n');

  const fastModeInstruction = gameState.fastMode ? "請保持敘事簡潔明快，專注於推進劇情，減少冗長的環境描寫。" : "請進行詳盡的環境與心理描寫，營造沉浸式體驗。";

  const prompt = `
  世界觀: ${gameState.worldSetting}
  當前位置: ${gameState.currentLocation.name}
  玩家角色: ${player.name} (${player.gender})
  ${appearanceText}
  ${traitsText}
  ${backgroundText}
  ${factionRepContext}
  玩家狀態: ${statusContext}
  ${skillsContext}
  場景 NPC: ${npcContext}
  歷史記錄:
  ${history}
  玩家行動: "${action}" (${actionType})
  
  請確保生成的新 NPC、物品和任務與當前「歷史記錄」中的伏筆、劇情轉折與世界觀設定嚴格同步。
  若引入新 NPC，必須為其生成獨特的物品欄 (inventory)，並根據其背景、性格和當前地點 (location) 進行設計。
  特別注意：玩家的外貌、背景故事和特質應該影響 NPC 的反應和可選的互動選項。
  若處於戰鬥中 (inCombat=true)，請根據玩家技能與敵人弱點進行戰鬥描述。
  ${fastModeInstruction}
  請務必以繁體中文回應。
  `;

  return generateStructured(MODEL_TEXT, SYSTEM_INSTRUCTION, prompt, StoryResponseSchema);
};

export const generateImage = async (prompt: string, type: 'scene' | 'portrait' | 'icon' | 'background' | 'map', style: string = "Anime Light Novel Style") => {
  const response = await ai.models.generateContent({
    model: MODEL_IMAGE,
    contents: { parts: [{ text: `High quality ${type} art: ${prompt}. ${style}. Vibrant colors.` }] },
    config: {
      imageConfig: { aspectRatio: (type === 'background' || type === 'scene') ? "16:9" : "1:1" }
    }
  });
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return '';
};

export const generateGameAsset = async (prompt: string, type: 'sprite' | 'background' | 'enemy' | 'boss') => {
  const aspectRatio = type === 'background' ? "16:9" : "1:1";
  let stylePrompt = "";
  
  switch(type) {
    case 'sprite':
      stylePrompt = "Single pixel art character sprite, side view, white background, dynamic action pose, fantasy style, isolated";
      break;
    case 'enemy':
      stylePrompt = "Single pixel art enemy sprite, side view, white background, menacing, fantasy creature, isolated";
      break;
    case 'boss':
      stylePrompt = "Single large pixel art boss sprite, side view, white background, epic, intimidating, huge scale, isolated";
      break;
    case 'background':
      stylePrompt = "Pixel art 2D side scrolling game background, seamless loop, atmospheric";
      break;
  }

  const response = await ai.models.generateContent({
    model: MODEL_IMAGE,
    contents: { parts: [{ text: `${stylePrompt}: ${prompt}. High quality, retro game style.` }] },
    config: {
      imageConfig: { aspectRatio }
    }
  });
  
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return '';
};

export const analyzeNPCBehavior = async (npc: NPC, player: Player, worldSetting: string, history: string = ""): Promise<NPCBehaviorAnalysis> => {
  const archiveContext = npc.archive ? `\nNPC 背景: ${npc.archive.background}\n秘密: ${npc.archive.secret}\n目標: ${npc.archive.goal}\n性格: ${npc.archive.personalityTraits.join(', ')}` : "";
  const interactionStyleContext = npc.playerInteractionStyle ? `\nNPC 對玩家的印象: "${npc.playerInteractionStyle}"` : "";
  
  const prompt = `
  請分析 NPC "${npc.name}" 在當前情境下的行為模式與決策邏輯。
  
  NPC 資訊:
  ${archiveContext}
  ${interactionStyleContext}
  當前好感度: ${npc.affection}
  所屬勢力: ${npc.faction || '無'}
  
  玩家資訊:
  姓名: ${player.name}
  等級: ${player.level}
  聲望: ${player.reputation}
  
  世界觀: ${worldSetting}
  近期劇情: ${history}
  
  任務：
  基於 NPC 的性格、目標、對玩家的印象以及當前情境，分析 NPC 的心理狀態與下一步行動。
  
  請輸出以下 JSON 格式（繁體中文）：
  - currentMood: NPC 當前的情緒狀態（例如：警戒、貪婪、恐懼、興奮）。
  - primaryGoal: NPC 在此情境下的首要目標（例如：存活、獲取利益、保護秘密、復仇）。
  - strategy: NPC 為了達成目標採取的策略（例如：虛張聲勢、假裝無知、利誘玩家、直接攻擊）。
  - nextAction: NPC 預計採取的具體行動（例如：發起交易、提供任務、逃跑、攻擊）。
  `;

  return generateStructured(MODEL_PRO, "你是一位精通角色心理學與行為邏輯的 AI 分析師。請務必使用繁體中文。", prompt, {
    type: Type.OBJECT,
    properties: {
      currentMood: { type: Type.STRING },
      primaryGoal: { type: Type.STRING },
      strategy: { type: Type.STRING },
      nextAction: { type: Type.STRING }
    },
    required: ["currentMood", "primaryGoal", "strategy", "nextAction"]
  });
};

export const chatWithNPC = async (npc: NPC, message: string, history: string[], behaviorAnalysis?: NPCBehaviorAnalysis, actionType?: string) => {
  const archiveContext = npc.archive ? `\nNPC 背景: ${npc.archive.background}\n秘密: ${npc.archive.secret}\n目標: ${npc.archive.goal}` : "";
  const interactionStyleContext = npc.playerInteractionStyle ? `\n[重要] NPC 對玩家的印象/互動模式認知: "${npc.playerInteractionStyle}"。請根據此認知調整 NPC 的語氣。` : "";
  const behaviorContext = behaviorAnalysis ? `\n[重要] NPC 行為邏輯分析:\n情緒: ${behaviorAnalysis.currentMood}\n目標: ${behaviorAnalysis.primaryGoal}\n策略: ${behaviorAnalysis.strategy}\n預計行動: ${behaviorAnalysis.nextAction}\n請確保回應與此行為邏輯一致。` : "";
  
  const prompt = `
  NPC: ${npc.name} (所屬派系: ${npc.faction || '無'}, 當前好感: ${npc.affection}, 狀態: ${npc.status})${archiveContext}
  ${interactionStyleContext}
  ${behaviorContext}
  
  Player Action Type: ${actionType || 'General Chat'}
  Player Message: "${message}"
  History: 
  ${history.slice(-5).join('\n')}

  任務：
  1. 分析玩家當前的語氣與互動模式。
  2. 根據玩家的語氣更新 NPC 對玩家的「互動模式認知 (playerInteractionStyle)」。
  3. 生成 NPC 的回應，必須反映出 NPC 的個性、對玩家的印象以及當前的行為策略。
  4. 若玩家行為是 "Ask for Quest" (請求委託)，請嘗試生成一個符合 NPC 目標的任務 (triggeredQuest)。
  5. 若玩家行為是 "Threaten" (威脅)：
     - 若判定威脅成功，可給予物品 (givenItem) 但大幅降低好感 (-20 ~ -50)。
     - 若判定威脅失敗，NPC 可能會憤怒並拒絕交流。
     - 若玩家持續威脅或好感度過低，請將 newStatus 設為 'Enemy'。
  6. 若好感度低於 -20，請將 newStatus 設為 'Enemy'；若高於 50，設為 'Ally'；若高於 90，設為 'Lover'。
  7. **視覺控制**：
     - visualMood: 根據回應內容，設定 NPC 的表情情緒 (例如: happy, angry, sad, shy, surprised, neutral, blush)。
     - visualAction: 根據回應內容，設定 NPC 的動作姿態 (例如: waving, arms_crossed, thinking, pointing, holding_chest, crying, laughing)。
  
  Respond in Traditional Chinese.
  `;

  return generateStructured(MODEL_TEXT, "Roleplay accurately in Traditional Chinese using the NPC's archive, affection level, and behavior analysis. Adapt to the player's interaction style.", prompt, {
    type: Type.OBJECT,
    properties: {
      reply: { type: Type.STRING },
      affectionChange: { type: Type.INTEGER },
      newStatus: { type: Type.STRING, description: "Neutral, Ally, Enemy, Lover" },
      memoryUpdate: { type: Type.STRING },
      playerInteractionStyle: { type: Type.STRING, description: "Updated perception of the player's interaction style" },
      visualMood: { type: Type.STRING, description: "happy, angry, sad, shy, surprised, neutral, blush" },
      visualAction: { type: Type.STRING, description: "waving, arms_crossed, thinking, pointing, holding_chest, crying, laughing" },
      triggeredQuest: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          type: { type: Type.STRING, description: "main, side, or challenge" },
          rewards: {
            type: Type.OBJECT,
            properties: {
              exp: { type: Type.INTEGER },
              gold: { type: Type.INTEGER },
              items: { type: Type.ARRAY, items: { type: Type.STRING } },
              reputation: { type: Type.INTEGER }
            }
          },
          requirements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "kill, collect, visit, interact" },
                target: { type: Type.STRING },
                count: { type: Type.INTEGER }
              },
              required: ["type", "target", "count"]
            }
          },
          objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
          initialProgress: { type: Type.INTEGER }
        },
        required: ["title", "description", "type"]
      },
      givenItem: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          type: { type: Type.STRING },
          rarity: { type: Type.STRING },
          quantity: { type: Type.INTEGER },
          affixes: { type: Type.ARRAY, items: AffixSchema }
        },
        required: ["name", "description", "type", "rarity", "quantity"]
      }
    },
    required: ["reply", "playerInteractionStyle", "visualMood", "visualAction"]
  });
};

export const generateCharacterSprite = async (npc: NPC, mood: string, action: string, style: string = "Anime style, high quality, detailed, visual novel tachie") => {
  const appearanceDesc = npc.description;
  const prompt = `
    Character: ${npc.name}
    Description: ${appearanceDesc}
    Style Prompt: ${npc.stylePrompt || ''}
    Mood: ${mood}
    Action: ${action}
    Style: ${style}
    View: Full body or knee-up, front facing, isolated on white background.
    High quality, detailed, anime art style.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_IMAGE,
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: { aspectRatio: "3:4" } // Portrait for Tachie
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return '';
};

export const generateSceneBackground = async (worldSetting: string, location: string, mood: string, style: string = "Anime background art, high quality, visual novel style") => {
  const prompt = `
    Location: ${location}
    World Setting: ${worldSetting}
    Mood/Atmosphere: ${mood}
    Style: ${style}
    View: Wide angle, scenic.
    High quality, detailed, anime background art.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_IMAGE,
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: { aspectRatio: "16:9" } // Landscape for Background
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return '';
};

export const giftItemToNPC = async (npc: NPC, item: Item, worldSetting: string) => {
  const archiveContext = npc.archive ? `\nNPC 背景: ${npc.archive.background}\n秘密: ${npc.archive.secret}\n目標: ${npc.archive.goal}` : "";
  const prompt = `
    玩家贈送了物品「${item.name}」給 NPC「${npc.name}」。
    物品描述：${item.description}
    NPC 資訊：${npc.description}${archiveContext}
    當前好感度：${npc.affection}%
    世界觀：${worldSetting}

    請根據 NPC 的性格、背景與物品的價值/意義，生成 NPC 的反應。
    
    請輸出以下 JSON 格式（繁體中文）：
    - reply: NPC 的口頭回應。
    - affectionChange: 好感度變化（整數，通常在 -20 到 +50 之間）。
    - memoryUpdate: 這次互動在 NPC 記憶中的簡短紀錄。
  `;

  return generateStructured(MODEL_TEXT, "你是一位角色扮演大師。請根據物品與 NPC 的契合度給出真實的反應。", prompt, {
    type: Type.OBJECT,
    properties: {
      reply: { type: Type.STRING },
      affectionChange: { type: Type.INTEGER },
      memoryUpdate: { type: Type.STRING }
    },
    required: ["reply", "affectionChange", "memoryUpdate"]
  });
};

export const analyzeNPCRelations = async (npc: NPC, player: Player, allNPCs: NPC[], worldSetting: string, history: string = "") => {
  const localNPCs = allNPCs.filter(n => n.locationId === npc.locationId);
  const localNPCNames = localNPCs.filter(n => n.id !== npc.id).map(n => n.name).join(', ');
  const playerFactions = player.factions.map(f => `${f.factionName}: ${f.score}`).join(', ');
  
  const prompt = `
    請分析以下 NPC 在當前場景社交網中的深度關係：
    主體 NPC：${npc.name} (${npc.faction || '無勢力'})
    玩家在各勢力的聲望：${playerFactions || '無'}
    場景中其他 NPC：${localNPCNames || '無'}
    當前 worldSetting：${worldSetting}
    劇情進度回顧：${history}

    要求：
    1. 必須考慮當前劇情中發生的事件（例如：NPC 是否在之前的對話中表露過敵意）。
    2. 分析 NPC 之間的潛在衝突、秘密結盟或利益鏈。
    
    請輸出以下 JSON 格式的深度分析（繁體中文）：
    - factionStanding: 該 NPC 在其所屬勢力中的具體地位、立場與潛在的忠誠度疑慮。
    - socialConflict: 與場景中其他 NPC 之間是否存在競爭、仇恨、依賴或暗戀等複雜關係。
    - strategicAdvice: 根據上述關係與當前故事走向，建議玩家應如何以此為切入點與其互動（例如：挑撥、利用特定利益交換、或透過第三方施壓）。
  `;

  return generateStructured(MODEL_PRO, "你是一位精通權謀與社交動力學的策略分析師。請務必使用繁體中文。", prompt, {
    type: Type.OBJECT,
    properties: {
      factionStanding: { type: Type.STRING },
      socialConflict: { type: Type.STRING },
      strategicAdvice: { type: Type.STRING }
    },
    required: ["factionStanding", "socialConflict", "strategicAdvice"]
  });
};

export const chatWithPlayer = async (player: Player, message: string, history: string[], worldSetting: string) => {
  const prompt = `Subconscious conversation. Message: "${message}". Respond in Traditional Chinese.`;
  return generateStructured(MODEL_TEXT, "Player Subconscious in Traditional Chinese.", prompt, {
    type: Type.OBJECT,
    properties: {
      reply: { type: Type.STRING },
      affectionChange: { type: Type.INTEGER }
    },
    required: ["reply"]
  });
};

export const generateNPCArchive = async (npc: NPC, worldSetting: string, history: string = ""): Promise<NPCArchive> => {
  const prompt = `
  請為以下 NPC 撰寫深度的「核心檔案 (Archive)」：
  姓名：${npc.name}
  簡述：${npc.description}
  所屬勢力：${npc.faction || '未知'}
  當前 worldSetting：${worldSetting}
  劇情歷史脈絡：${history}

  要求：
  1. 檔案內容必須與劇情進度與世界觀嚴格一致。
  2. 生成一個與世界觀伏筆相關的「不為人知的秘密」。

  請生成以下 JSON 格式數據（必須使用繁體中文）：
  - background: 詳細的出身背景與過去經歷（約 200 字）。
  - secret: 一個不為人知的驚人秘密。
  - goal: NPC 的終極目標或目前最渴望的事。
  - firstImpression: 玩家第一次見到此人時的感官細節描述。
  - personalityTraits: 3-5 個性格特徵詞（陣列格式）。
  `;

  return generateStructured(MODEL_TEXT, "你是一位深度角色設計師。請務必使用繁體中文創作。", prompt, {
    type: Type.OBJECT,
    properties: {
      background: { type: Type.STRING },
      secret: { type: Type.STRING },
      goal: { type: Type.STRING },
      firstImpression: { type: Type.STRING },
      personalityTraits: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["background", "secret", "goal", "firstImpression", "personalityTraits"]
  });
};

export const craftItem = async (ingredients: Item[]): Promise<any> => {
  const prompt = `
  【物品合成協議啟動】
  合成材料：${ingredients.map(i => i.name).join('、')}
  請根據這些素材的物理特性、魔法屬性或象徵意義，推演出一個全新的 RPG 物品。
  
  要求：
  1. 生成 1-3 條符合材料特性的強大詞綴（含數值加成）。
  2. 物品類別必須為：equipment, consumable, material, food, misc。
  3. 描述應強調合成過程中的以太融合反應。
  4. **物品專屬技能 (Exclusive Skills)**：根據物品稀有度，生成 0-3 個專屬技能。
     - Common: 0 個
     - Rare: 0-1 個
     - Epic: 1-2 個
     - Legendary: 2+ 個
     這些技能必須與物品的主題緊密相關，且強度應高於普通技能。
  `;
  const schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      description: { type: Type.STRING },
      type: { type: Type.STRING },
      slot: { type: Type.STRING, nullable: true },
      rarity: { type: Type.STRING },
      level: { type: Type.INTEGER },
      affixes: { type: Type.ARRAY, items: AffixSchema },
      stats: StatsSchema,
      potionEffect: { type: Type.STRING, nullable: true },
      durability: { type: Type.INTEGER, nullable: true },
      maxDurability: { type: Type.INTEGER, nullable: true },
      nutrition: { type: Type.INTEGER, nullable: true },
      hydration: { type: Type.INTEGER, nullable: true },
      weight: { type: Type.NUMBER },
      setId: { type: Type.STRING, nullable: true },
      binding: { type: Type.STRING },
      craftingRecipe: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
      exclusiveSkills: { type: Type.ARRAY, items: StructuredSkillSchema, nullable: true }
    },
    required: ["name", "description", "type", "rarity", "affixes"]
  };
  return generateStructured(MODEL_TEXT, SYSTEM_INSTRUCTION, prompt, schema);
};

export const upgradeItem = async (baseItem: Item, material: Item): Promise<any> => {
  const prompt = `請將基底物品「${baseItem.name}」與強化材料「${material.name}」融合，並演化出更高級的詞綴與專屬技能。請務必使用繁體中文。
  若物品稀有度提升，請根據新的稀有度追加 0-2 個物品專屬技能 (Exclusive Skills)。
  `;
  const schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      description: { type: Type.STRING },
      level: { type: Type.INTEGER },
      rarity: { type: Type.STRING },
      affixes: { type: Type.ARRAY, items: AffixSchema },
      stats: StatsSchema,
      durability: { type: Type.INTEGER, nullable: true },
      maxDurability: { type: Type.INTEGER, nullable: true },
      exclusiveSkills: { type: Type.ARRAY, items: StructuredSkillSchema, nullable: true }
    },
    required: ["name", "description", "level", "rarity", "affixes"]
  };
  return generateStructured(MODEL_TEXT, SYSTEM_INSTRUCTION, prompt, schema);
};

export const reforgeItem = async (item: Item, worldSetting: string): Promise<any> => {
  const prompt = `
  【物品洗鍊/附魔協議啟動】
  目標物品：${item.name}
  當前描述：${item.description}
  稀有度：${item.rarity}
  世界觀：${worldSetting}

  請為此物品重新生成一組全新的「以太編碼詞綴 (Affixes)」與「物品專屬技能 (Exclusive Skills)」。
  要求：
  1. 詞綴數量與強度需符合稀有度 (${item.rarity})。
  2. 詞綴名稱需華麗且符合世界觀。
  3. 必須包含數值加成 (stats)。
  4. **特殊效果**：請包含條件觸發效果（例如：「生命低於 30% 時，防禦力提升 50%」）或特殊被動（例如：「攻擊時有 10% 機率造成流血」）。
  5. 若物品原本有特殊效果 (potionEffect)，請保留或微調增強。
  6. **物品專屬技能**：根據稀有度重新生成專屬技能。
     - Common: 0 個
     - Rare: 0-1 個
     - Epic: 1-2 個
     - Legendary: 2+ 個
     這些技能只有在裝備此物品時才能使用。
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      affixes: { type: Type.ARRAY, items: AffixSchema },
      stats: StatsSchema,
      potionEffect: { type: Type.STRING, nullable: true },
      exclusiveSkills: { type: Type.ARRAY, items: StructuredSkillSchema, nullable: true }
    },
    required: ["affixes"]
  };
  return generateStructured(MODEL_TEXT, SYSTEM_INSTRUCTION, prompt, schema);
};

export const reforgeSkill = async (skill: SkillNode, worldSetting: string): Promise<any> => {
  const prompt = `
  【技能洗鍊/重構協議啟動】
  目標技能：${skill.name}
  當前描述：${skill.description}
  類型：${skill.skillType}
  世界觀：${worldSetting}

  請為此技能重新生成一組全新的「以太編碼詞綴 (Affixes)」並微調其屬性。
  要求：
  1. 詞綴數量 1-3 個。
  2. 詞綴名稱需華麗且符合技能特性。
  3. 必須包含數值加成 (stats)。
  4. **技能修正**：請包含技能機制的改變（例如：「冷卻時間 -1 回合」、「射程 +2」、「命中時附加燃燒效果」、「消耗減少 20%」）。
  5. 詞綴效果應顯著增強技能的戰術價值。
  6. 請重新評估技能的傷害類型 (damageType)、元素屬性 (elementType) 與附加狀態 (statusEffect)。
  7. 提供深度的戰術分析 (tacticalAnalysis)。
  8. 描述施放時的「以太視覺效果 (visualEffect)」。
  9. 說明該技能在世界觀中的「傳承或意義 (loreSignificance)」。
  請務必使用繁體中文。
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      affixes: { type: Type.ARRAY, items: AffixSchema },
      tacticalAnalysis: { type: Type.STRING },
      visualEffect: { type: Type.STRING },
      loreSignificance: { type: Type.STRING },
      damageType: { type: Type.STRING },
      elementType: { type: Type.STRING },
      statusEffect: { type: Type.STRING, nullable: true },
      targetType: { type: Type.STRING },
      scalingFormula: { type: Type.STRING }
    },
    required: ["affixes", "tacticalAnalysis", "visualEffect", "loreSignificance"]
  };
  return generateStructured(MODEL_TEXT, SYSTEM_INSTRUCTION, prompt, schema);
};

export const generateRandomSetup = async (type: 'world' | 'character', currentWorld: string, gender: string, difficulty: string, gameMode: string): Promise<any> => {
  const prompt = `Generate a random ${type} setting for an RPG. 
    Current World context: ${currentWorld}
    Player Gender: ${gender}
    Difficulty: ${difficulty}
    Game Mode: ${gameMode}
    Respond in Traditional Chinese.`;
    
  if (type === 'world') {
    const res = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: { systemInstruction: "Generate a creative world setting in Traditional Chinese. Return only the description string." }
    });
    return res.text;
  } else {
    const schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        setting: { type: Type.STRING },
        skills: { type: Type.STRING },
        items: { type: Type.STRING },
        hairstyle: { type: Type.STRING },
        eyeColor: { type: Type.STRING },
        clothingStyle: { type: Type.STRING },
        backgroundStory: { type: Type.STRING },
        traits: { type: Type.STRING },
        stylePrompt: { type: Type.STRING, description: "Art style prompt for image generation (e.g., 'Cyberpunk', 'Watercolor', 'Dark Fantasy')" },
        race: { type: Type.STRING },
        profession: { type: Type.STRING },
        stats: StatsSchema
      },
      required: ["name", "setting", "skills", "items", "hairstyle", "eyeColor", "clothingStyle", "backgroundStory", "traits", "stylePrompt", "race", "profession", "stats"]
    };
    return generateStructured(MODEL_TEXT, "Generate a creative character setting with a unique name, appearance, background, traits, race, profession, and stats in Traditional Chinese.", prompt, schema);
  }
};

export const generateSurpriseMeSetup = async (difficulty: string, gameMode: string, selectedGender: string): Promise<any> => {
  const prompt = `Create a complete RPG setup with a surprise theme. 
    Difficulty: ${difficulty}
    Game Mode: ${gameMode}
    Selected Player Gender: ${selectedGender}.
    Please provide a unique, epic name for the character that fits the selected gender and world.
    Respond in Traditional Chinese.`;
    
  const schema = {
    type: Type.OBJECT,
    properties: {
      world: { type: Type.STRING },
      name: { type: Type.STRING },
      character: { type: Type.STRING },
      skills: { type: Type.STRING },
      items: { type: Type.STRING }
    },
    required: ["world", "name", "character", "skills", "items"]
  };
  return generateStructured(MODEL_TEXT, "You are a creative RPG designer. Surprise the player with a unique theme and legendary character name in Traditional Chinese.", prompt, schema);
};

export const parseInitialSetup = async (worldSetting: string, characterSetting: string, skillsText: string, itemsText: string, player: Player): Promise<any> => {
  const appearanceText = player.appearance ? `外貌：髮型-${player.appearance.hairstyle}, 眼睛-${player.appearance.eyeColor}, 服裝-${player.appearance.clothingStyle}` : "";
  const traitsText = player.traits && player.traits.length > 0 ? `特質：${player.traits.join(', ')}` : "";
  const backgroundText = player.backgroundStory ? `背景故事：${player.backgroundStory}` : "";
  const raceText = player.race ? `種族：${player.race}` : "";
  const professionText = player.profession ? `職業：${player.profession}` : "";

  const prompt = `
  【系統初始化：深度解析與數據生成協議】
  世界觀：「${worldSetting}」
  角色：「${player.name}」
  描述：「${characterSetting}」
  ${appearanceText}
  ${backgroundText}
  ${traitsText}
  ${raceText}
  ${professionText}
  
  任務：
  1. 解析技能文本：「${skillsText}」。
     - 若文本包含具體技能，請提取名稱與類型。
     - **若文本為空、模糊或僅有通用描述（如"基本劍術"），請根據角色設定與職業自動生成 3-5 個符合身份的初始技能**。
     - 必須為每個技能生成 1-2 個符合世界觀的「詞綴」(affixes)。
     - 必須生成具體的「戰術分析」(tacticalAnalysis)。
     - 必須描述技能施放時的「以太視覺效果」(visualEffect)。
     - 必須說明該技能在世界觀中的「傳承或意義」(loreSignificance)。
  2. 解析物品文本：「${itemsText}」。
     - 若文本包含具體物品，請提取名稱、類型與數量。
     - **若文本為空、模糊或僅有通用描述（如"冒險者套裝"），請根據角色設定自動生成 3-5 個初始物品（包含適合的武器、防具與補給品）**。
     - 必須為每個裝備/物品生成 1-2 個符合世界觀的「詞綴」(affixes)。
     - 必須生成具體的「數值」(stats)。
  3. 決定「初始六維屬性」(initialStats)，範圍 5-15。
  4. 決定角色的初始抗性 (resistances) 與弱點 (weaknesses)。

  請確保所有生成的文本（名稱、描述、詞綴等）皆為「繁體中文」。
  請快速輸出 JSON。
  `;
  const schema = {
    type: Type.OBJECT,
    properties: {
      initialStats: StatsSchema,
      resistances: { type: Type.ARRAY, items: { type: Type.STRING } },
      weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
      skills: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            skillType: { type: Type.STRING },
            damageType: { type: Type.STRING, description: "slash, pierce, blunt, fire, ice, lightning, holy, dark" },
            elementType: { type: Type.STRING, description: "Neutral, Fire, Water, Wind, Earth, Lightning, Holy, Dark" },
            cooldown: { type: Type.INTEGER },
            manaCost: { type: Type.INTEGER },
            staminaCost: { type: Type.INTEGER },
            affixes: { type: Type.ARRAY, items: AffixSchema },
            tacticalAnalysis: { type: Type.STRING },
            visualEffect: { type: Type.STRING },
            loreSignificance: { type: Type.STRING },
            targetType: { type: Type.STRING },
            scalingFormula: { type: Type.STRING }
          },
          required: ["name", "description", "skillType"]
        }
      },
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING },
            quantity: { type: Type.INTEGER },
            slot: { type: Type.STRING, nullable: true },
            rarity: { type: Type.STRING },
            affixes: { type: Type.ARRAY, items: AffixSchema },
            stats: StatsSchema,
            price: { type: Type.INTEGER },
            weight: { type: Type.NUMBER },
            damageType: { type: Type.STRING, description: "slash, pierce, blunt, fire, ice, lightning, holy, dark" },
            elementType: { type: Type.STRING, description: "Neutral, Fire, Water, Wind, Earth, Lightning, Holy, Dark" }
          },
          required: ["name", "description", "type"]
        }
      }
    },
    required: ["initialStats", "skills", "items"]
  };
  return generateStructured(MODEL_TEXT, SYSTEM_INSTRUCTION, prompt, schema);
};

export const generateIntroStory = async (gameState: GameState): Promise<any> => {
  const player = gameState.player;
  const prompt = `
  GAME START.
  World: ${gameState.worldSetting}
  Character: ${player.name} (${player.gender})
  Background: ${player.backgroundStory}
  
  Write a short, immersive opening scene (approx 100 words) and 3 initial options.
  Respond in Traditional Chinese.
  `;
  
  const schema = {
    type: Type.OBJECT,
    properties: {
      narrative: { type: Type.STRING },
      sceneDescription: { type: Type.STRING },
      options: {
        type: Type.OBJECT,
        properties: {
          impulsive: { type: Type.STRING },
          smart: { type: Type.STRING },
          funny: { type: Type.STRING },
          characteristic1: { type: Type.STRING },
          characteristic2: { type: Type.STRING },
          characteristic3: { type: Type.STRING },
          characteristic4: { type: Type.STRING },
        },
        required: ["impulsive", "smart", "funny", "characteristic1", "characteristic2", "characteristic3", "characteristic4"],
      }
    },
    required: ["narrative", "sceneDescription", "options"]
  };
  
  return generateStructured(MODEL_TEXT, SYSTEM_INSTRUCTION, prompt, schema);
};



export const generateSkillBranches = async (skill: SkillNode, characterSkills: string): Promise<any[]> => {
  const prompt = `
  技能突破協議啟動！
  
  原技能：「${skill.name}」(等級 5)
  原描述：${skill.description}
  角色當前技能樹脈絡：${characterSkills}

  請演化出「剛好 3 個」更高級、更強大的進階技能變體，並附帶強大的進化詞綴。
  每個變體都應該有獨特的戰術定位 (tacticalAnalysis)、傷害類型 (damageType) 與元素屬性 (elementType)。
  必須描述施放時的「以太視覺效果 (visualEffect)」。
  必須說明該技能在世界觀中的「傳承或意義 (loreSignificance)」。
  請務必使用繁體中文。
  `;
  
  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        skillType: { type: Type.STRING },
        affixes: { type: Type.ARRAY, items: AffixSchema },
        cooldown: { type: Type.INTEGER },
        manaCost: { type: Type.INTEGER },
        staminaCost: { type: Type.INTEGER },
        damageType: { type: Type.STRING },
        elementType: { type: Type.STRING },
        statusEffect: { type: Type.STRING, nullable: true },
        tacticalAnalysis: { type: Type.STRING },
        visualEffect: { type: Type.STRING },
        loreSignificance: { type: Type.STRING },
        targetType: { type: Type.STRING },
        scalingFormula: { type: Type.STRING }
      },
      required: ["name", "description", "skillType", "affixes", "tacticalAnalysis", "visualEffect", "loreSignificance"]
    }
  };
  const res = await generateStructured(MODEL_TEXT, SYSTEM_INSTRUCTION, prompt, schema);
  return Array.isArray(res) ? res : [];
};

export const generateCheatItem = async (itemName: string): Promise<any> => {
  const prompt = `Generate a legendary RPG item named "${itemName}" with overpowered affixes. Categorize it correctly as equipment, consumable, material, or food.`;
  const schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      description: { type: Type.STRING },
      type: { type: Type.STRING },
      slot: { type: Type.STRING, nullable: true },
      rarity: { type: Type.STRING },
      affixes: { type: Type.ARRAY, items: AffixSchema },
      stats: StatsSchema,
      potionEffect: { type: Type.STRING, nullable: true },
      durability: { type: Type.INTEGER, nullable: true },
      maxDurability: { type: Type.INTEGER, nullable: true },
      price: { type: Type.INTEGER },
      quantity: { type: Type.INTEGER }
    },
    required: ["name", "description", "type", "rarity", "affixes"]
  };
  return generateStructured(MODEL_PRO, SYSTEM_INSTRUCTION, prompt, schema);
};

export const generateCheatSkill = async (skillName: string): Promise<any> => {
  const prompt = `
  Generate an overpowered RPG skill named "${skillName}" with god-tier affixes.
  Must include:
  - visualEffect: A description of the visual effects when cast.
  - loreSignificance: The skill's significance in the world's lore.
  Tag it as passive or active correctly.
  Respond in Traditional Chinese.
  `;
  const schema = StructuredSkillSchema;
  return generateStructured(MODEL_PRO, SYSTEM_INSTRUCTION, prompt, schema);
};

export const generateNewNPC = async (worldSetting: string, locationName: string, overrides: { name?: string, description?: string, faction?: string, desiredSkills?: string } = {}, history: string = ""): Promise<any> => {
  const prompt = `
  請在位置 "${locationName}" 生成一個全新的 RPG NPC。
  當前 worldSetting 背景："${worldSetting}"
  劇情發展現況："${history}"

  【玩家提供的命運碎片】(若為空則由你自由編織)：
  - 核心真名: ${overrides.name || '未指定'}
  - 身分與特徵描述: ${overrides.description || '未指定'}
  - 所屬勢力或立場: ${overrides.faction || '未指定'}
  - 期望具備的特技方向: ${overrides.desiredSkills || '未指定'}

  要求：
  1. NPC 必須擁有獨特的、符合其身份、職業與背景故事的「專屬技能組」。
  2. 每個技能必須包含：
     - 名稱 (name) 與 描述 (description)
     - 具體效果 (effect) 與 數值消耗 (manaCost, staminaCost)
     - 獨特的以太視覺效果 (visualEffect)
     - 世界觀傳承或意義 (loreSignificance)
  3. NPC 的性格與目標應與劇情現狀產生連動或衝突。
  4. 物品類型 (type) 必須是: equipment, consumable, material, food, misc 其中之一。
  5. 設定 NPC 的戰鬥 AI 風格 (aiConfig)，包括類型 (Basic/Aggressive/Defensive/Tactical/Healer/Boss)、逃跑/治療閾值。
  6. 設定 NPC 的抗性 (resistances) 與弱點 (weaknesses)，例如 fire, ice, slash 等。

  請根據上述條件補完完整的數據，並確保包含具有深度詞綴的專屬技能。
  `;
  
  const schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      description: { type: Type.STRING },
      initialAffection: { type: Type.INTEGER },
      faction: { type: Type.STRING },
      stats: StatsSchema,
      resistances: { type: Type.ARRAY, items: { type: Type.STRING } },
      weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
      skills: { 
          type: Type.ARRAY,
          items: StructuredSkillSchema
      },
      aiConfig: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "Basic, Aggressive, Defensive, Tactical, Healer, Boss" },
          aggroRange: { type: Type.INTEGER },
          fleeThreshold: { type: Type.INTEGER },
          healThreshold: { type: Type.INTEGER },
          specialSkillChance: { type: Type.NUMBER },
          phases: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                triggerHpPercentage: { type: Type.INTEGER },
                name: { type: Type.STRING },
                dialogue: { type: Type.STRING },
                newSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                statMultipliers: StatsSchema
              },
              required: ["triggerHpPercentage", "name"]
            }
          }
        },
        required: ["type"]
      },
      inventory: {
          type: Type.ARRAY,
          items: {
              type: Type.OBJECT,
              properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  type: { type: Type.STRING, description: "equipment, consumable, material, food, misc" },
                  rarity: { type: Type.STRING },
                  quantity: { type: Type.INTEGER },
                  slot: { type: Type.STRING, nullable: true },
                  affixes: { type: Type.ARRAY, items: AffixSchema },
                  stats: StatsSchema,
                  price: { type: Type.INTEGER }
              },
              required: ["name", "description", "type", "rarity", "quantity"]
          }
      }
    },
    required: ["name", "description", "initialAffection", "stats", "skills", "inventory", "aiConfig"]
  };
  return generateStructured(MODEL_TEXT, SYSTEM_INSTRUCTION, prompt, schema);
};

export const generateCharacterBreakdown = async (description: string, worldSetting: string): Promise<string> => {
  const prompt = `Detailed character breakdown sheet for: ${description}. World: ${worldSetting}. Show different expressions, equipment details, and character profile. Anime high quality concept art.`;
  return generateImage(prompt, 'portrait');
};

export const generateWorldEvent = async (gameState: GameState): Promise<{ narrative: string }> => {
  const history = gameState.logs.slice(-5).map(l => l.text).join('\n');
  const prompt = `
  基於以下遊戲狀態生成一個隨機的小型世界事件 (World Event) 的「核心描述」：
  
  當前世界觀: ${gameState.worldSetting}
  當前位置: ${gameState.currentLocation.name} (${gameState.currentLocation.description})
  當前時間: Day ${gameState.gameTime.day} ${gameState.gameTime.hour}:${gameState.gameTime.minute}
  天氣/氛圍: ${gameState.currentLocation.atmosphere}
  玩家狀態: ${gameState.player.name} (Level ${gameState.player.level})
  近期歷史: ${history}
  
  請生成一個與當前環境、時間或玩家近期行為相關的突發事件概念。
  例如：
  - 夜晚森林中遇到迷路的精靈。
  - 城鎮中聽到吟遊詩人的傳說。
  - 暴風雨中發現避難的商人。
  - 戰鬥後發現敵人的遺落物。
  
  只需返回事件的敘述文本 (narrative)，不需要選項。
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      narrative: { type: Type.STRING, description: "事件的描述" }
    },
    required: ["narrative"]
  };

  return generateStructured(MODEL_TEXT, "你是一位擅長創造隨機遭遇的地下城主。", prompt, schema);
};

export const generateVoxelMapHTML = async (name: string, description: string): Promise<string> => {
  const prompt = `Create a standalone HTML file using Three.js that visualizes a 3D voxel-style scene for the location: "${name}" (${description}). 
    The scene should have blocks representing the environment. Include basic orbital controls. 
    Make it look like a diorama. Return ONLY the HTML code.`;
    
  const res = await ai.models.generateContent({
    model: MODEL_PRO,
    contents: prompt,
    config: { systemInstruction: "You are a creative web developer and 3D artist. Write high-quality Three.js code in a single HTML file." }
  });
  return res.text || '<html><body>Failed to generate map scene</body></html>';
};
