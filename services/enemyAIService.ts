import { NPC, Player, EnemyCombatAction, StructuredSkill, EnemyAIType, LogEntry, SkillNode } from '../types';

// Helper to cast skills to StructuredSkill[] safely
const getEnemySkills = (enemy: NPC): StructuredSkill[] => {
  if (!enemy.skills || typeof enemy.skills === 'string') return [];
  return enemy.skills as StructuredSkill[];
};

const findSkill = (enemy: NPC, predicate: (s: StructuredSkill) => boolean): StructuredSkill | undefined => {
  const skills = getEnemySkills(enemy);
  return skills.find(predicate);
};

const getRandomSkill = (enemy: NPC): StructuredSkill | undefined => {
  const skills = getEnemySkills(enemy);
  if (skills.length === 0) return undefined;
  return skills[Math.floor(Math.random() * skills.length)];
};

export const decideEnemyAction = (enemy: NPC, player: Player, turnCount: number): EnemyCombatAction => {
  const aiConfig = enemy.aiConfig || { type: 'Basic', specialSkillChance: 0.2 };
  const currentHpPercent = (enemy.hp || 0) / (enemy.maxHp || 100);
  const playerHpPercent = (player.hp || 0) / (player.maxHp || 100);

  // 1. Boss Phase Transition
  if (aiConfig.type === 'Boss' && aiConfig.phases) {
    const currentPhaseIndex = enemy.currentPhase || 0;
    // Check next phase
    const nextPhaseIndex = currentPhaseIndex + 1;
    if (nextPhaseIndex < aiConfig.phases.length) {
       const nextPhase = aiConfig.phases[nextPhaseIndex];
       // If HP drops below threshold
       if (currentHpPercent * 100 <= nextPhase.triggerHpPercentage) {
         return {
           type: 'PhaseTransition',
           description: nextPhase.dialogue || `${enemy.name} 的氣場發生了劇變！進入 ${nextPhase.name} 階段！`,
           skillId: 'phase-transition'
         };
       }
    }
  }

  // 2. Flee Logic (Low HP)
  if (aiConfig.fleeThreshold && currentHpPercent * 100 < aiConfig.fleeThreshold) {
    if (aiConfig.type !== 'Boss' && Math.random() < 0.4) {
      return { type: 'Flee', description: `${enemy.name} 露出恐懼的神色，試圖逃離戰場！` };
    }
  }

  // 3. Heal Logic (Self)
  if (aiConfig.healThreshold && currentHpPercent * 100 < aiConfig.healThreshold) {
    const healSkill = findSkill(enemy, s => s.name.includes('治癒') || s.name.includes('回復') || s.description.includes('回復生命'));
    if (healSkill && Math.random() < 0.8) {
       return { type: 'Heal', skillId: healSkill.id, description: `${enemy.name} 詠唱 ${healSkill.name}，試圖回復體力。` };
    }
  }

  // 4. AI Type Specific Logic
  switch (aiConfig.type) {
    case 'Aggressive':
      return aggressiveAI(enemy, player);
    case 'Defensive':
      return defensiveAI(enemy, player);
    case 'Tactical':
      return tacticalAI(enemy, player);
    case 'Boss':
      return bossAI(enemy, player, currentHpPercent);
    case 'Basic':
    default:
      return basicAI(enemy, player);
  }
};

// --- AI Strategies ---

const basicAI = (enemy: NPC, player: Player): EnemyCombatAction => {
  // 20% chance to use a random skill if available, otherwise Attack
  if (Math.random() < 0.2) {
    const skill = getRandomSkill(enemy);
    if (skill) {
      return { type: 'Skill', skillId: skill.id, description: `${enemy.name} 使用了 ${skill.name}！` };
    }
  }
  return { type: 'Attack', description: `${enemy.name} 發動了攻擊！` };
};

const aggressiveAI = (enemy: NPC, player: Player): EnemyCombatAction => {
  // Prioritize high damage skills
  // 60% chance to use skill
  if (Math.random() < 0.6) {
    // Try to find a damage skill
    const damageSkill = findSkill(enemy, s => !!s.damageType || s.skillType === 'active');
    if (damageSkill) {
       return { type: 'Skill', skillId: damageSkill.id, description: `${enemy.name} 兇猛地使出了 ${damageSkill.name}！` };
    }
  }
  return { type: 'Attack', description: `${enemy.name} 瘋狂地撲向你！` };
};

const defensiveAI = (enemy: NPC, player: Player): EnemyCombatAction => {
  // If HP is low, high chance to Defend
  const hpPercent = (enemy.hp || 0) / (enemy.maxHp || 100);
  if (hpPercent < 0.4 && Math.random() < 0.5) {
    return { type: 'Defend', description: `${enemy.name} 採取防禦姿態，準備抵擋攻擊。` };
  }
  
  // Try to use buff/debuff skills
  if (Math.random() < 0.4) {
    const supportSkill = findSkill(enemy, s => s.skillType === 'buff' || s.skillType === 'debuff');
    if (supportSkill) {
      return { type: 'Skill', skillId: supportSkill.id, description: `${enemy.name} 施展了 ${supportSkill.name}！` };
    }
  }

  return { type: 'Attack', description: `${enemy.name} 謹慎地發動攻擊。` };
};

const tacticalAI = (enemy: NPC, player: Player): EnemyCombatAction => {
  // React to player state
  const playerHpPercent = (player.hp || 0) / (player.maxHp || 100);
  
  // If player is low, try to finish them (High damage skill)
  if (playerHpPercent < 0.3) {
     const finisher = findSkill(enemy, s => (s.damageType !== undefined) && (s.manaCost || 0) > 10);
     if (finisher) {
       return { type: 'Skill', skillId: finisher.id, description: `${enemy.name} 看準你虛弱的瞬間，釋放 ${finisher.name}！` };
     }
  }

  // If player has high MP, maybe drain or debuff? (Not implemented yet)
  
  // Use debuffs early
  const debuff = findSkill(enemy, s => s.skillType === 'debuff');
  if (debuff && Math.random() < 0.3) {
     return { type: 'Skill', skillId: debuff.id, description: `${enemy.name} 試圖削弱你，使用了 ${debuff.name}。` };
  }

  return basicAI(enemy, player);
};

const bossAI = (enemy: NPC, player: Player, hpPercent: number): EnemyCombatAction => {
  // Bosses have higher skill usage chance
  // Phase specific logic could be here, but we handle transition separately
  
  // 1. Ultimate Skill (Low HP desperation)
  if (hpPercent < 0.2 && Math.random() < 0.3) {
    const ultimate = findSkill(enemy, s => s.name.includes('奧義') || s.name.includes('終極') || (s.manaCost || 0) >= 50);
    if (ultimate) {
      return { type: 'Skill', skillId: ultimate.id, description: `${enemy.name} 凝聚全身力量，釋放奧義：${ultimate.name}！！！` };
    }
  }

  // 2. Combo/Special (Random high impact)
  if (Math.random() < 0.4) {
    const special = findSkill(enemy, s => s.skillType === 'special' || s.damageType !== undefined);
    if (special) {
      return { type: 'Skill', skillId: special.id, description: `${enemy.name} 的氣息壓迫而來，使用了 ${special.name}！` };
    }
  }

  // 3. Standard Attack with flavor
  return { type: 'Attack', description: `${enemy.name} 以雷霆萬鈞之勢發動攻擊！` };
};
