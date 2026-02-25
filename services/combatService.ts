import { Player, NPC, Stats, Item, SkillNode, EnemyCombatAction, StructuredSkill, DamageType, ElementType } from '../types';

export interface CombatResult {
    log: string;
    playerDamageTaken: number;
    enemyDamageTaken: number;
    enemyHealed: number; // Added
    isHit: boolean;
    isCrit: boolean;
    playerDodge: boolean;
    staminaCost: number;
    manaCost: number;
}

const rollDice = (sides: number) => Math.floor(Math.random() * sides) + 1;

const getStatModifier = (stat: number) => Math.floor((stat - 10) / 2); // D&D style modifier

const calculateDamage = (
    attackerStats: Stats, 
    damageType: DamageType = 'blunt', 
    elementType: ElementType = 'Neutral',
    targetResistances: DamageType[] = [],
    targetWeaknesses: DamageType[] = [],
    weapon?: Item, 
    isCrit: boolean = false, 
    skillMultiplier: number = 1.0
) => {
    let baseDamage = rollDice(6); // Default unarmed damage 1d6
    let statBonus = 0;
    let logDetail = "";

    // Determine if magical based on damage type or element
    const isMagical = ['fire', 'ice', 'lightning', 'holy', 'dark'].includes(damageType) || elementType !== 'Neutral';

    if (!isMagical) {
        statBonus = getStatModifier(attackerStats.strength);
        if (weapon) {
            // Placeholder for weapon damage - in real app, use weapon.stats.damage or similar
            baseDamage = rollDice(8); 
            logDetail += `[武器傷害 1d8(${baseDamage})] `;
        } else {
            logDetail += `[徒手傷害 1d6(${baseDamage})] `;
        }
        logDetail += `[力量加成 ${statBonus}] `;
    } else {
        statBonus = getStatModifier(attackerStats.intelligence);
        baseDamage = rollDice(6); // Magic base damage
        logDetail += `[魔法基礎 1d6(${baseDamage})] [智力加成 ${statBonus}] `;
    }
    
    // Apply Multipliers
    let multiplier = 1.0;
    if (targetWeaknesses.includes(damageType)) {
        multiplier *= 1.5;
        logDetail += `[弱點打擊 x1.5] `;
    }
    if (targetResistances.includes(damageType)) {
        multiplier *= 0.5;
        logDetail += `[屬性抵抗 x0.5] `;
    }
    if (isCrit) {
        logDetail += `[暴擊 x2] `;
    }
    if (skillMultiplier !== 1.0) {
        logDetail += `[技能倍率 x${skillMultiplier}] `;
    }

    // Ensure minimum damage of 1
    const rawDamage = (baseDamage + statBonus) * skillMultiplier * multiplier;
    const damage = Math.max(1, Math.floor(isCrit ? rawDamage * 2 : rawDamage));
    
    return { damage, multiplier, logDetail };
};

export const resolveCombatRound = (
    player: Player, 
    enemy: NPC, 
    playerAction: string, 
    usedSkill?: SkillNode, 
    enemyAction?: EnemyCombatAction,
    playerWeapon?: Item
): CombatResult => {
    let log = "";
    let playerDamageTaken = 0;
    let enemyDamageTaken = 0;
    let enemyHealed = 0;
    let isHit = false;
    let isCrit = false;
    let playerDodge = false;
    let staminaCost = 0;
    let manaCost = 0;

    // --- Determine Player Action Cost & Type ---
    let playerDamageType: DamageType = 'blunt';
    let playerElementType: ElementType = 'Neutral';
    let playerSkillMultiplier = 1.0;

    if (usedSkill) {
        staminaCost = usedSkill.staminaCost || 5; 
        manaCost = usedSkill.manaCost || 0;
        if (usedSkill.damageType) {
            playerDamageType = usedSkill.damageType;
        }
        if (usedSkill.elementType) {
            playerElementType = usedSkill.elementType;
        }
        // Fallback for old skills without explicit damageType
        if (!usedSkill.damageType && ['fire', 'ice', 'lightning', 'holy', 'dark'].includes(usedSkill.damageType || '')) {
             // This logic is redundant if damageType is strictly typed, but safe for migration
        }
        
        playerSkillMultiplier = 1.5; // Basic skill multiplier
        // TODO: Use actual skill multiplier from scalingFormula if available
        log += `\n[玩家行動] 使用技能: ${usedSkill.name} (消耗 ${staminaCost} 體力, ${manaCost} 魔力)\n`;
        log += `> 屬性: ${playerElementType} | 類型: ${playerDamageType}\n`;
    } else {
        staminaCost = 2; // Basic attack stamina cost
        if (playerWeapon) {
            playerDamageType = playerWeapon.damageType || 'slash'; // Default weapon to slash if unknown
            playerElementType = playerWeapon.elementType || 'Neutral';
            log += `\n[玩家行動] 使用武器攻擊: ${playerWeapon.name} (消耗 ${staminaCost} 體力)\n`;
            log += `> 屬性: ${playerElementType} | 類型: ${playerDamageType}\n`;
        } else {
            playerDamageType = 'blunt'; // Unarmed
            log += `\n[玩家行動] 徒手攻擊 (消耗 ${staminaCost} 體力)\n`;
        }
    }

    // --- Player Turn ---
    const playerRoll = rollDice(20);
    const playerHitMod = getStatModifier(player.stats.agility) + getStatModifier(player.stats.luck) + (player.stats.hitRate || 0);
    const playerTotalHit = playerRoll + playerHitMod;

    // Enemy Defense (AC)
    const enemyStats = enemy.stats || { strength: 10, intelligence: 10, agility: 10, charisma: 10, luck: 10, endurance: 10, perception: 10, hitRate: 0, evasionRate: 0 };
    let enemyAC = 10 + getStatModifier(enemyStats.agility) + (enemyStats.evasionRate || 0);

    // If enemy is defending, increase AC
    if (enemyAction?.type === 'Defend') {
        enemyAC += 5;
        log += `> [敵方防禦] ${enemy.name} 採取了防禦姿態 (AC +5)。\n`;
    }

    log += `> [命中判定] 1d20(${playerRoll}) + ${playerHitMod} = ${playerTotalHit} (vs AC ${enemyAC}) `;

    if (playerRoll === 20) {
        isHit = true;
        isCrit = true;
        log += "-> **暴擊!**\n";
    } else if (playerRoll === 1) {
        isHit = false;
        log += "-> **大失敗!**\n";
    } else {
        isHit = playerTotalHit >= enemyAC;
        log += isHit ? "-> 命中\n" : "-> 未命中\n";
    }

    if (isHit) {
        const { damage, multiplier, logDetail } = calculateDamage(
            player.stats, 
            playerDamageType, 
            playerElementType,
            enemy.resistances || [],
            enemy.weaknesses || [],
            playerWeapon, 
            isCrit, 
            playerSkillMultiplier
        ); 
        enemyDamageTaken = damage;
        log += `> [傷害計算] ${logDetail}\n`;
        log += `> **造成 ${damage} 點${playerDamageType}傷害**`;
        if (multiplier > 1) log += " (效果拔群!)";
        if (multiplier < 1) log += " (效果不佳...)";
        log += "\n";
    } else {
        log += `> 未命中 (被閃避)。\n`;
    }

    // --- Enemy Turn (AI Decision) ---
    // Only if enemy is still alive (logic handled by caller, but we calculate potential damage here)
    
    if (enemyAction) {
        log += `\n[敵方行動] ${enemyAction.description || enemyAction.type} `;
        
        switch (enemyAction.type) {
            case 'Attack':
            case 'Skill': // Treat skill as attack for now, but maybe with higher damage/effects
                const enemyRoll = rollDice(20);
                const enemyHitMod = getStatModifier(enemyStats.agility) + getStatModifier(enemyStats.luck) + (enemyStats.hitRate || 0);
                const enemyTotalHit = enemyRoll + enemyHitMod;

                const playerAC = 10 + getStatModifier(player.stats.agility) + getStatModifier(player.stats.endurance) + (player.stats.evasionRate || 0); 

                log += `\n> [命中判定] 1d20(${enemyRoll}) + ${enemyHitMod} = ${enemyTotalHit} (vs AC ${playerAC}) `;

                let enemyIsHit = false;
                if (enemyRoll === 20) {
                    enemyIsHit = true;
                    log += "-> **敵方暴擊!**\n";
                } else if (enemyRoll === 1) {
                    enemyIsHit = false;
                    log += "-> **敵方失誤!**\n";
                } else {
                    enemyIsHit = enemyTotalHit >= playerAC;
                    log += enemyIsHit ? "-> 命中\n" : "-> 未命中\n";
                }

                if (enemyIsHit) {
                    let enemySkillMultiplier = 1.0;
                    let enemyDamageType: DamageType = 'blunt';
                    let enemyElementType: ElementType = 'Neutral';
                    
                    if (enemyAction.type === 'Skill' && enemyAction.skillId) {
                        enemySkillMultiplier = 1.5; // Default skill multiplier
                        // Try to find skill details if possible
                        // For now, we don't have easy access to enemy skill details here without passing them
                        // Assuming standard damage type for now or random
                        if (enemy.elementalAffinity && enemy.elementalAffinity !== 'Neutral') {
                            enemyElementType = enemy.elementalAffinity;
                            enemyDamageType = 'magical' as any; // Hack: map element to magic type? 
                            // Better: map element to damage type
                            if (enemyElementType === 'Fire') enemyDamageType = 'fire';
                            else if (enemyElementType === 'Water') enemyDamageType = 'ice'; // Approximation
                            else if (enemyElementType === 'Lightning') enemyDamageType = 'lightning';
                            else if (enemyElementType === 'Holy') enemyDamageType = 'holy';
                            else if (enemyElementType === 'Dark') enemyDamageType = 'dark';
                        }
                    } else {
                        // Basic attack
                        enemyDamageType = 'slash'; // Default enemy attack
                    }

                    const { damage: enemyDamage, multiplier: enemyMultiplier, logDetail: enemyLogDetail } = calculateDamage(
                        enemyStats, 
                        enemyDamageType, 
                        enemyElementType,
                        player.resistances || [],
                        player.weaknesses || [],
                        undefined, 
                        enemyRoll === 20, 
                        enemySkillMultiplier
                    );
                    playerDamageTaken = enemyDamage;
                    log += `> [傷害計算] ${enemyLogDetail}\n`;
                    log += `> **玩家受到 ${enemyDamage} 點${enemyDamageType}傷害**`;
                    if (enemyMultiplier > 1) log += " (效果拔群!)";
                    if (enemyMultiplier < 1) log += " (效果不佳...)";
                    log += "\n";
                } else {
                    playerDodge = true;
                    log += `> 玩家成功閃避!`;
                }
                break;

            case 'Defend':
                // Already handled in AC calculation
                log += `(本回合未發動攻擊)`;
                break;

            case 'Heal':
                // Heal logic
                const healAmount = rollDice(8) + getStatModifier(enemyStats.intelligence);
                enemyHealed = healAmount;
                log += `恢復了 ${healAmount} 點生命值。`;
                break;

            case 'Flee':
                log += `(敵方試圖逃離戰場...)`;
                break;
                
            case 'PhaseTransition':
                log += `\n*** ${enemy.name} 進入了新的階段！ ***`;
                // Phase transition effects (e.g., full heal, buff) could be handled here or in App.tsx
                break;
        }
    } else {
        // Fallback to basic attack if no AI action provided
        const enemyRoll = rollDice(20);
        const enemyHitMod = getStatModifier(enemyStats.agility) + getStatModifier(enemyStats.luck) + (enemyStats.hitRate || 0);
        const enemyTotalHit = enemyRoll + enemyHitMod;
        const playerAC = 10 + getStatModifier(player.stats.agility) + getStatModifier(player.stats.endurance) + (player.stats.evasionRate || 0); 

        log += `\n> [反擊判定] 1d20(${enemyRoll}) + ${enemyHitMod} = ${enemyTotalHit} (vs AC ${playerAC}) `;

        if (enemyTotalHit >= playerAC) {
            const { damage: enemyDamage, logDetail: enemyLogDetail } = calculateDamage(enemyStats, 'blunt', 'Neutral', player.resistances || [], player.weaknesses || []);
            playerDamageTaken = enemyDamage;
            log += `-> 命中\n> [傷害計算] ${enemyLogDetail}\n> **玩家受到 ${enemyDamage} 點傷害**`;
        } else {
            playerDodge = true;
            log += `-> 未命中 (玩家閃避)`;
        }
    }

    return {
        log,
        playerDamageTaken,
        enemyDamageTaken,
        enemyHealed,
        isHit,
        isCrit,
        playerDodge,
        staminaCost,
        manaCost
    };
};
