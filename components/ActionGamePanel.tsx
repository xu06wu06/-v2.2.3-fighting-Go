import React, { useEffect, useRef, useState } from 'react';
import { GameState, SkillNode, DamageType } from '../types';
import * as GeminiService from '../services/geminiService';
import { audioService } from '../services/audioService';
import { ArrowLeft, ArrowRight, ArrowUp, Sword, Loader2, Zap, Flame, Snowflake, Droplets, Wind, Volume2, VolumeX } from 'lucide-react';

interface ActionGamePanelProps {
  gameState: GameState;
  onUpdateGameState: (newState: GameState) => void;
}

interface Sprite {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  state: 'idle' | 'run' | 'jump' | 'attack' | 'hit';
  direction: 1 | -1; // 1 right, -1 left
  frame: number;
  element?: string; // Enemy elemental type
}

interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
  type: DamageType;
  life: number; // Frames to live
  color: string;
  fromPlayer: boolean;
  active?: boolean; // Added for object pooling
}

interface DamageNumber {
  id: string;
  x: number;
  y: number;
  value: number;
  color: string;
  life: number;
  vy: number;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface GameAssets {
  playerSprite: HTMLImageElement | null;
  background: HTMLImageElement | null;
  enemySprite: HTMLImageElement | null;
  bossSprite: HTMLImageElement | null;
}

export const ActionGamePanel: React.FC<ActionGamePanelProps> = ({ gameState, onUpdateGameState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [assets, setAssets] = useState<GameAssets>({ playerSprite: null, background: null, enemySprite: null, bossSprite: null });
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("正在初始化遊戲引擎...");
  const [stage, setStage] = useState(1);
  const [score, setScore] = useState(0);
  const [bossActive, setBossActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const [shake, setShake] = useState(0);
  
  // Game State Refs (for performance in loop)
  const playerRef = useRef<Sprite & { dashCooldown: number }>({
    x: 100, y: 300, width: 64, height: 64, vx: 0, vy: 0, hp: gameState.player.hp, maxHp: gameState.player.maxHp, state: 'idle', direction: 1, frame: 0, dashCooldown: 0
  });
  const shakeRef = useRef(0);
  const enemiesRef = useRef<Sprite[]>([]);
  // Projectile Pool
  const projectilePoolRef = useRef<Projectile[]>([]);
  const activeProjectilesRef = useRef<Projectile[]>([]);
  const damageNumbersRef = useRef<DamageNumber[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const gameLoopRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const enemiesDefeatedRef = useRef<number>(0);
  const stageRef = useRef<number>(1);
  const cooldownsRef = useRef<{ [key: string]: number }>({}); // Skill ID -> Cooldown frames
  const scoreRef = useRef<number>(0);
  const rewardsRef = useRef<{ exp: number, gold: number }>({ exp: 0, gold: 0 });

  const gameStateRef = useRef(gameState);
  
  const spawnDamageNumber = (x: number, y: number, value: number, color: string = 'white') => {
      damageNumbersRef.current.push({
          id: crypto.randomUUID(),
          x, y, value, color, life: 60, vy: -2
      });
  };

  const spawnParticles = (x: number, y: number, count: number, color: string, speed: number = 2) => {
      for (let i = 0; i < count; i++) {
          particlesRef.current.push({
              id: crypto.randomUUID(),
              x, y,
              vx: (Math.random() - 0.5) * speed * 2,
              vy: (Math.random() - 0.5) * speed * 2,
              life: 30 + Math.random() * 20,
              color,
              size: 2 + Math.random() * 3
          });
      }
  };

  // Initialize Projectile Pool
  useEffect(() => {
      for(let i=0; i<100; i++) {
          projectilePoolRef.current.push({
              id: `pool-${i}`, x: 0, y: 0, vx: 0, vy: 0, width: 0, height: 0, 
              damage: 0, type: 'slash', life: 0, color: '', fromPlayer: false
          });
      }
  }, []);

  useEffect(() => {
      gameStateRef.current = gameState;
  }, [gameState]);

  const getProjectileFromPool = () => {
      const p = projectilePoolRef.current.pop();
      return p || { id: crypto.randomUUID(), x: 0, y: 0, vx: 0, vy: 0, width: 0, height: 0, damage: 0, type: 'slash', life: 0, color: '', fromPlayer: false };
  };

  const returnProjectileToPool = (p: Projectile) => {
      if (projectilePoolRef.current.length < 100) {
          projectilePoolRef.current.push(p);
      }
  };

  const syncGameState = () => {
      const currentGS = gameStateRef.current;
      const newExp = currentGS.player.exp + rewardsRef.current.exp;
      const newGold = currentGS.player.gold + rewardsRef.current.gold;
      
      onUpdateGameState({
          ...currentGS,
          player: { 
              ...currentGS.player, 
              hp: Math.max(0, playerRef.current.hp),
              mp: Math.max(0, currentGS.player.mp), // MP is updated in castSkill directly? No, we should ref it too.
              exp: newExp,
              gold: newGold
          }
      });
      // Reset rewards after sync
      rewardsRef.current = { exp: 0, gold: 0 };
  };
  
  // Sync on unmount
  useEffect(() => {
      return () => {
          syncGameState();
      };
  }, []);

  // MP Ref to avoid sync issues during loop
  const mpRef = useRef(gameState.player.mp);
  useEffect(() => { mpRef.current = gameState.player.mp; }, [gameState.player.mp]);

  // Asset Generation
  useEffect(() => {
    const loadAssets = async () => {
      setLoading(true);
      setGameOver(false);
      setBossActive(false);
      enemiesDefeatedRef.current = 0;
      stageRef.current = stage;
      
      // Reset Projectiles
      activeProjectilesRef.current.forEach(p => returnProjectileToPool(p));
      activeProjectilesRef.current = [];
      
      // 1. Load or Generate Background
      setLoadingStatus(`正在生成第 ${stage} 關世界: ${gameState.currentLocation.name}...`);
      const bgPrompt = stage === 1 ? gameState.currentLocation.name : `Deep inside ${gameState.currentLocation.name}, level ${stage}, darker, dangerous`;
      const bgUrl = await GeminiService.generateGameAsset(bgPrompt + ", " + gameState.currentLocation.description, 'background');
      const bgImg = new Image();
      bgImg.src = bgUrl;
      
      // 2. Load or Generate Player
      setLoadingStatus("正在像素化您的角色...");
      const playerDesc = `${gameState.player.appearance?.clothingStyle} ${gameState.player.gender} warrior, ${gameState.player.appearance?.hairstyle}`;
      const playerUrl = await GeminiService.generateGameAsset(playerDesc, 'sprite');
      const playerImg = new Image();
      playerImg.src = playerUrl;

      // 3. Load or Generate Enemy
      setLoadingStatus("正在召喚怪物...");
      const enemyPrompt = `Monster inhabiting ${gameState.currentLocation.name}, stage ${stage}`;
      const enemyUrl = await GeminiService.generateGameAsset(enemyPrompt, 'enemy');
      const enemyImg = new Image();
      enemyImg.src = enemyUrl;

      // 4. Load or Generate Boss
      setLoadingStatus("正在喚醒首領...");
      const bossPrompt = `Legendary Boss Monster of ${gameState.currentLocation.name}, stage ${stage}, epic, huge`;
      const bossUrl = await GeminiService.generateGameAsset(bossPrompt, 'boss');
      const bossImg = new Image();
      bossImg.src = bossUrl;

      await Promise.all([
        new Promise(r => bgImg.onload = r),
        new Promise(r => playerImg.onload = r),
        new Promise(r => enemyImg.onload = r),
        new Promise(r => bossImg.onload = r)
      ]);

      setAssets({
        background: bgImg,
        playerSprite: playerImg,
        enemySprite: enemyImg,
        bossSprite: bossImg
      });
      setLoading(false);
    };

    loadAssets();
  }, [gameState.currentLocation.id, stage]); 

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        keysRef.current[e.code] = true;
        audioService.resume(); // Ensure audio context is running on user interaction
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current[e.code] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const castSkill = (skill: SkillNode) => {
      if (!skill || !skill.unlocked) return;
      
      // Check Cooldown
      if ((cooldownsRef.current[skill.id] || 0) > 0) return;

      // Check MP
      const mpCost = skill.manaCost || 10;
      if (mpRef.current < mpCost) return;
      if (playerRef.current.hp <= 0) return; // Dead cannot cast

      // Deduct MP locally
      mpRef.current -= mpCost;

      // Set Cooldown (60 frames = 1 sec approx)
      cooldownsRef.current[skill.id] = (skill.cooldown || 5) * 60;

      const player = playerRef.current;
      const damage = 10 + (skill.level || 1) * 5 + (gameStateRef.current.player.stats.intelligence || 0);
      
      // Projectile Properties based on Damage Type
      let color = '#fff';
      let speed = 10;
      let life = 60;
      let size = 10;
      let type: DamageType = skill.damageType || 'slash';

      switch (type) {
          case 'fire': color = '#f97316'; speed = 12; size = 15; break;
          case 'ice': color = '#06b6d4'; speed = 15; size = 8; break;
          case 'lightning': color = '#eab308'; speed = 20; size = 5; break;
          case 'dark': color = '#7e22ce'; speed = 8; size = 20; life = 100; break;
          case 'holy': color = '#fef08a'; speed = 12; size = 15; break;
          default: color = '#cbd5e1'; speed = 15; size = 10; break; // Slash/Pierce
      }

      const p = getProjectileFromPool();
      p.x = player.x + player.width / 2;
      p.y = player.y + player.height / 2;
      p.vx = speed * player.direction;
      p.vy = 0;
      p.width = size;
      p.height = size;
      p.damage = damage;
      p.type = type;
      p.life = life;
      p.color = color;
      p.fromPlayer = true;
      
      activeProjectilesRef.current.push(p);

      player.state = 'attack';
      audioService.playSkillCast();
  };

  // Game Loop
  useEffect(() => {
    if (loading || !assets.background) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Disable image smoothing for pixel art look
    ctx.imageSmoothingEnabled = false;

    // Reset Game State
    playerRef.current.x = 100;
    playerRef.current.y = 300;
    // Keep HP in sync with main game
    playerRef.current.hp = gameStateRef.current.player.hp;
    playerRef.current.maxHp = gameStateRef.current.player.maxHp;
    mpRef.current = gameStateRef.current.player.mp;
    
    enemiesRef.current = [];
    
    // Spawn initial enemy
    enemiesRef.current.push({
      x: 600, y: 300, width: 64, height: 64, vx: 0, vy: 0, hp: 50 * stage, maxHp: 50 * stage, state: 'idle', direction: -1, frame: 0, element: 'neutral'
    });

    const update = (dt: number) => {
      if (gameOver) return;
      
      // Time scaling factor (target 60fps)
      const timeScale = Math.min(dt / 16.67, 2.0); // Cap at 2x speed to prevent physics explosion on lag

      const player = playerRef.current;
      const gravity = 0.5 * timeScale;
      const friction = Math.pow(0.8, timeScale);
      const groundY = canvas.height - 96; // Floor level

      // Shake Decay
      if (shakeRef.current > 0) shakeRef.current *= 0.9;
      if (shakeRef.current < 0.5) shakeRef.current = 0;

      // Player Movement
      if (player.dashCooldown > 0) player.dashCooldown -= 1 * timeScale;

      if ((keysRef.current['ShiftLeft'] || keysRef.current['ShiftRight']) && player.dashCooldown <= 0 && (player.vx !== 0 || player.vy !== 0)) {
          player.vx = player.direction * 15; // Dash speed
          player.vy = 0; // Dash horizontally
          player.dashCooldown = 60; // 1 sec cooldown
          audioService.playJump(); // Reuse jump sound for dash or add new one
          spawnParticles(player.x + player.width/2, player.y + player.height, 10, '#fff', 3);
      } else if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) {
        player.vx += 1 * timeScale;
        player.direction = 1;
        player.state = 'run';
      } else if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) {
        player.vx -= 1 * timeScale;
        player.direction = -1;
        player.state = 'run';
      } else {
        player.state = 'idle';
      }

      if ((keysRef.current['ArrowUp'] || keysRef.current['Space']) && player.y >= groundY) {
        player.vy = -12;
        player.state = 'jump';
        audioService.playJump();
        spawnParticles(player.x + player.width/2, player.y + player.height, 5, '#ccc', 1);
      }
      
      // Basic Attack
      if (keysRef.current['KeyZ'] || keysRef.current['KeyK']) {
          if (player.state !== 'attack') {
              player.state = 'attack';
              audioService.playAttack();
          }
      }
      
      // Skill Usage (Quick Slots)
      const quickSlots = gameStateRef.current.quickSlots;
      const findSkill = (skillId: string) => {
          let skill = gameStateRef.current.skills.find(s => s.id === skillId);
          if (skill) return skill;
          // Check equipment
          const equipment = gameStateRef.current.player.equipment;
          const inventory = gameStateRef.current.inventory;
          for (const slot of Object.values(equipment)) {
              if (!slot) continue;
              const item = inventory.find(i => i.id === slot);
              if (item && item.exclusiveSkills) {
                  skill = item.exclusiveSkills.find(s => s.id === skillId);
                  if (skill) return skill;
              }
          }
          return null;
      };

      if (keysRef.current['Digit1'] && quickSlots[0]?.type === 'skill') {
          const skill = findSkill(quickSlots[0]!.id);
          if (skill) castSkill(skill);
      }
      if (keysRef.current['Digit2'] && quickSlots[1]?.type === 'skill') {
          const skill = findSkill(quickSlots[1]!.id);
          if (skill) castSkill(skill);
      }
      if (keysRef.current['Digit3'] && quickSlots[2]?.type === 'skill') {
          const skill = findSkill(quickSlots[2]!.id);
          if (skill) castSkill(skill);
      }
      if (keysRef.current['Digit4'] && quickSlots[3]?.type === 'skill') {
          const skill = findSkill(quickSlots[3]!.id);
          if (skill) castSkill(skill);
      }

      // Update Cooldowns
      Object.keys(cooldownsRef.current).forEach(key => {
          if (cooldownsRef.current[key] > 0) cooldownsRef.current[key] -= 1 * timeScale;
      });

      // Physics
      player.vx *= friction;
      player.vy += gravity;
      player.x += player.vx * timeScale;
      player.y += player.vy * timeScale;

      // Floor Collision
      if (player.y > groundY) {
        player.y = groundY;
        player.vy = 0;
      }
      
      // Wall Collision
      if (player.x < 0) player.x = 0;
      if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;

      // Projectiles Logic
      for (let i = activeProjectilesRef.current.length - 1; i >= 0; i--) {
          const p = activeProjectilesRef.current[i];
          p.x += p.vx * timeScale;
          p.y += p.vy * timeScale;
          p.life -= 1 * timeScale;
          
          if (p.life <= 0 || p.x < 0 || p.x > canvas.width) {
              returnProjectileToPool(p);
              activeProjectilesRef.current.splice(i, 1);
              continue;
          }

          // Collision with Enemies
          if (p.fromPlayer) {
              for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
                  const e = enemiesRef.current[j];
                  if (
                      p.x < e.x + e.width &&
                      p.x + p.width > e.x &&
                      p.y < e.y + e.height &&
                      p.y + p.height > e.y
                  ) {
                      // Hit!
                      let dmg = p.damage;
                      // Elemental Weakness (Simplified)
                      if (Math.random() < 0.2) dmg *= 1.5;
                      dmg = Math.floor(dmg);

                      e.hp -= dmg;
                      e.x += p.vx > 0 ? 5 : -5; // Knockback
                      
                      spawnDamageNumber(e.x + e.width/2, e.y, dmg, p.color);
                      shakeRef.current = 5;
                      spawnParticles(e.x + e.width/2, e.y + e.height/2, 5, p.color, 3);

                      // Visual Effect (Flash)
                      e.state = 'hit';
                      audioService.playEnemyHit();

                      returnProjectileToPool(p);
                      activeProjectilesRef.current.splice(i, 1); // Remove projectile
                      
                      if (e.hp <= 0) {
                          enemiesRef.current.splice(j, 1);
                          enemiesDefeatedRef.current += 1;
                          scoreRef.current += (e.width > 64 ? 500 : 100);
                          audioService.playEnemyDeath();
                          spawnParticles(e.x + e.width/2, e.y + e.height/2, 20, '#ff0000', 5);
                          
                          // Accumulate Reward
                          rewardsRef.current.exp += (e.width > 64 ? 100 : 10);
                          rewardsRef.current.gold += (e.width > 64 ? 50 : 5);

                          if (e.width > 64) { // Boss
                              setBossActive(false);
                              syncGameState(); // Sync before stage change
                              audioService.playStageClear();
                              setTimeout(() => {
                                  alert(`第 ${stageRef.current} 關通關！前往下一層...`);
                                  setStage(s => s + 1);
                              }, 1000);
                          }
                      }
                      break; // Projectile hit one enemy
                  }
              }
          }
      }

      // Enemy Logic
      enemiesRef.current.forEach((enemy, idx) => {
          // Simple AI: Move towards player
          const dist = player.x - enemy.x;
          const isBoss = enemy.width > 64;
          const aggroRange = isBoss ? 800 : 300;
          
          if (Math.abs(dist) < aggroRange && Math.abs(dist) > (isBoss ? 100 : 30)) {
              enemy.vx += (dist > 0 ? (isBoss ? 0.1 : 0.2) : (isBoss ? -0.1 : -0.2)) * timeScale;
              enemy.direction = dist > 0 ? 1 : -1;
              enemy.state = 'run';
          } else {
              enemy.state = 'idle';
          }
          
          enemy.vx *= friction;
          enemy.vy += gravity;
          enemy.x += enemy.vx * timeScale;
          enemy.y += enemy.vy * timeScale;
          
          if (enemy.y > groundY - (isBoss ? 32 : 0)) {
              enemy.y = groundY - (isBoss ? 32 : 0);
              enemy.vy = 0;
          }
          
          // Collision with Player (Attack)
          const attackRange = isBoss ? 150 : 80;
          const hitRange = isBoss ? 100 : 40;
          
          if (player.state === 'attack' && Math.abs(player.x - enemy.x) < attackRange && Math.abs(player.y - enemy.y) < 100) {
              // Melee Attack
              if (playerRef.current.frame === 0) { // Only hit once per attack animation start (simplified)
                  const dmg = 1 + Math.floor(gameStateRef.current.player.stats.strength / 2);
                  enemy.hp -= dmg;
                  enemy.x += player.direction * (isBoss ? 2 : 10); // Knockback
                  
                  spawnDamageNumber(enemy.x + enemy.width/2, enemy.y, dmg, 'white');
                  shakeRef.current = 3;
                  spawnParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 5, '#fff', 2);

                  audioService.playEnemyHit();
                  if (enemy.hp <= 0) {
                      enemiesRef.current.splice(idx, 1);
                      enemiesDefeatedRef.current += 1;
                      scoreRef.current += (isBoss ? 500 : 100);
                      audioService.playEnemyDeath();
                      spawnParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 20, '#ff0000', 5);
                      
                      rewardsRef.current.exp += (isBoss ? 100 : 10);
                      rewardsRef.current.gold += (isBoss ? 50 : 5);

                      if (isBoss) {
                          setBossActive(false);
                          syncGameState();
                          audioService.playStageClear();
                          setTimeout(() => {
                                  alert(`第 ${stageRef.current} 關通關！前往下一層...`);
                                  setStage(s => s + 1);
                          }, 1000);
                      }
                  }
              }
          } else if (Math.abs(player.x - enemy.x) < hitRange && Math.abs(player.y - enemy.y) < hitRange) {
              // Enemy hits player
              if (player.state !== 'hit' && player.state !== 'attack') {
                  const dmg = isBoss ? 20 : 5;
                  player.hp -= dmg;
                  player.state = 'hit';
                  player.vx = (player.x - enemy.x) > 0 ? 10 : -10;
                  player.vy = -5;
                  
                  spawnDamageNumber(player.x + player.width/2, player.y, dmg, 'red');
                  shakeRef.current = 10;
                  spawnParticles(player.x + player.width/2, player.y + player.height/2, 10, '#ff0000', 4);

                  audioService.playHit();
                  
                  if (player.hp <= 0) {
                      syncGameState();
                      setGameOver(true);
                      audioService.playGameOver();
                  }
              }
          }
      });
      
      // Reset hit state
      if (player.state === 'hit' && Math.abs(player.vx) < 1 && Math.abs(player.vy) < 1 && player.y >= groundY) {
          player.state = 'idle';
      }
      
      // Update Damage Numbers
      for (let i = damageNumbersRef.current.length - 1; i >= 0; i--) {
          const d = damageNumbersRef.current[i];
          d.y += d.vy * timeScale;
          d.life -= 1 * timeScale;
          if (d.life <= 0) {
              damageNumbersRef.current.splice(i, 1);
          }
      }

      // Update Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.x += p.vx * timeScale;
          p.y += p.vy * timeScale;
          p.life -= 1 * timeScale;
          p.vy += 0.1 * timeScale; // Gravity
          if (p.life <= 0) {
              particlesRef.current.splice(i, 1);
          }
      }

      // Spawn Logic
      if (!bossActive && enemiesRef.current.length < 3 && Math.random() < 0.02 * timeScale) {
           if (enemiesDefeatedRef.current >= 5 * stageRef.current && !bossActive) {
               // Spawn Boss
               setBossActive(true);
               enemiesRef.current.push({
                  x: canvas.width + 100, y: 0, width: 128, height: 128, vx: 0, vy: 0, hp: 500 * stageRef.current, maxHp: 500 * stageRef.current, state: 'idle', direction: -1, frame: 0, element: 'dark'
               });
           } else if (enemiesDefeatedRef.current < 5 * stageRef.current) {
               // Spawn Minion
               enemiesRef.current.push({
                  x: canvas.width + 50, y: 0, width: 64, height: 64, vx: 0, vy: 0, hp: 50 * stageRef.current, maxHp: 50 * stageRef.current, state: 'idle', direction: -1, frame: 0, element: 'neutral'
               });
           }
      }
    };

    const draw = () => {
      const shakeX = (Math.random() - 0.5) * shakeRef.current;
      const shakeY = (Math.random() - 0.5) * shakeRef.current;

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Clear
      ctx.fillStyle = '#000';
      ctx.fillRect(-shakeX, -shakeY, canvas.width, canvas.height);

      // Draw Background
      if (assets.background) {
        ctx.drawImage(assets.background, 0, 0, canvas.width, canvas.height);
      }

      // Draw Projectiles
      activeProjectilesRef.current.forEach(p => {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.width / 2, 0, Math.PI * 2);
          ctx.fill();
          // Trail
          ctx.fillStyle = p.color;
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.arc(p.x - p.vx * 2, p.y - p.vy * 2, p.width / 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
      });

      // Helper to draw sprite
      const drawSprite = (sprite: Sprite, img: HTMLImageElement | null) => {
          if (!img) return;
          ctx.save();
          ctx.translate(sprite.x + sprite.width/2, sprite.y + sprite.height/2);
          ctx.scale(sprite.direction, 1);
          // Simple bobbing for animation
          const bob = sprite.state === 'run' ? Math.sin(Date.now() / 100) * 5 : 0;
          
          // Draw Image
          ctx.drawImage(img, -sprite.width/2, -sprite.height/2 + bob, sprite.width, sprite.height);
          
          // Attack Effect
          if (sprite.state === 'attack') {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
              ctx.beginPath();
              ctx.arc(30, 0, 40, -Math.PI/2, Math.PI/2);
              ctx.fill();
          }
          
          ctx.restore();
          
          // HP Bar
          ctx.fillStyle = 'red';
          ctx.fillRect(sprite.x, sprite.y - 10, sprite.width, 5);
          ctx.fillStyle = 'green';
          ctx.fillRect(sprite.x, sprite.y - 10, sprite.width * (sprite.hp / sprite.maxHp), 5);
          
          // Boss Label
          if (sprite.width > 64) {
              ctx.fillStyle = 'yellow';
              ctx.font = '12px monospace';
              ctx.fillText("首領", sprite.x + 40, sprite.y - 15);
          }
      };

      drawSprite(playerRef.current, assets.playerSprite);
      enemiesRef.current.forEach(e => drawSprite(e, e.width > 64 ? assets.bossSprite : assets.enemySprite));
      
      // Draw Particles
      particlesRef.current.forEach(p => {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life / 30;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
      });

      // Draw Damage Numbers
      damageNumbersRef.current.forEach(d => {
          ctx.fillStyle = d.color;
          ctx.font = 'bold 16px monospace';
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 2;
          ctx.strokeText(d.value.toString(), d.x, d.y);
          ctx.fillText(d.value.toString(), d.x, d.y);
      });

      ctx.restore();
      ctx.fillStyle = 'white';
      ctx.font = '20px monospace';
      ctx.fillText(`關卡: ${stageRef.current}`, 20, 30);
      ctx.fillText(`分數: ${scoreRef.current}`, 20, 60);
      ctx.fillText(`生命: ${Math.floor(playerRef.current.hp)}/${playerRef.current.maxHp}`, 20, 90);
      ctx.fillText(`魔力: ${Math.floor(mpRef.current)}/${gameStateRef.current.player.maxMp}`, 20, 120); // Added MP Display
      
      // Skills UI
      const quickSlots = gameStateRef.current.quickSlots;
      quickSlots.forEach((slot, idx) => {
          if (slot && slot.type === 'skill') {
              const skill = gameStateRef.current.skills.find(s => s.id === slot.id);
              if (skill) {
                  const cd = cooldownsRef.current[skill.id] || 0;
                  const maxCd = (skill.cooldown || 5) * 60;
                  const pct = cd / maxCd;
                  
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                  ctx.fillRect(20 + idx * 50, 140, 40, 40); // Moved down
                  
                  // Icon placeholder (color based on type)
                  ctx.fillStyle = skill.damageType === 'fire' ? '#f97316' : skill.damageType === 'ice' ? '#06b6d4' : '#a855f7';
                  ctx.fillRect(22 + idx * 50, 142, 36, 36);
                  
                  // Cooldown overlay
                  if (cd > 0) {
                      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                      ctx.fillRect(20 + idx * 50, 140 + (40 * (1-pct)), 40, 40 * pct);
                  }
                  
                  ctx.fillStyle = 'white';
                  ctx.font = '10px monospace';
                  ctx.fillText(`${idx+1}`, 22 + idx * 50, 150);
              }
          } else {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
              ctx.strokeRect(20 + idx * 50, 140, 40, 40);
          }
      });

      if (gameOver) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = 'red';
          ctx.font = '40px monospace';
          ctx.fillText("遊戲結束", canvas.width/2 - 100, canvas.height/2);
          ctx.font = '20px monospace';
          ctx.fillStyle = 'white';
          ctx.fillText("按刷新鍵重新開始", canvas.width/2 - 120, canvas.height/2 + 40);
      }
    };

    const loop = (time: number) => {
      const dt = time - lastTimeRef.current;
      lastTimeRef.current = time;
      
      update(dt);
      draw();
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [loading, assets, gameOver]);

  // Touch Handlers
  const handleTouchStart = (action: string) => {
      keysRef.current[action] = true;
  };
  const handleTouchEnd = (action: string) => {
      keysRef.current[action] = false;
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-cyan-400">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-lg animate-pulse">{loadingStatus}</p>
        <p className="text-sm text-slate-500 mt-2">AI 正在編織像素世界...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none touch-none">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={450} 
        className="w-full h-full object-contain pixelated"
        style={{ imageRendering: 'pixelated' }}
      />
      
      {/* Mobile Controls Overlay */}
      <div className="absolute bottom-4 left-4 flex gap-4">
        <button 
            className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center active:bg-white/40 backdrop-blur-sm"
            onTouchStart={() => handleTouchStart('ArrowLeft')}
            onTouchEnd={() => handleTouchEnd('ArrowLeft')}
            onMouseDown={() => handleTouchStart('ArrowLeft')}
            onMouseUp={() => handleTouchEnd('ArrowLeft')}
        >
            <ArrowLeft className="text-white w-8 h-8" />
        </button>
        <button 
            className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center active:bg-white/40 backdrop-blur-sm"
            onTouchStart={() => handleTouchStart('ArrowRight')}
            onTouchEnd={() => handleTouchEnd('ArrowRight')}
            onMouseDown={() => handleTouchStart('ArrowRight')}
            onMouseUp={() => handleTouchEnd('ArrowRight')}
        >
            <ArrowRight className="text-white w-8 h-8" />
        </button>
      </div>

      <div className="absolute bottom-4 right-4 flex gap-4">
        <button 
            className="w-20 h-20 bg-red-500/30 rounded-full flex items-center justify-center active:bg-red-500/50 backdrop-blur-sm border-2 border-red-400/50"
            onTouchStart={() => handleTouchStart('KeyZ')}
            onTouchEnd={() => handleTouchEnd('KeyZ')}
            onMouseDown={() => handleTouchStart('KeyZ')}
            onMouseUp={() => handleTouchEnd('KeyZ')}
        >
            <Sword className="text-white w-10 h-10" />
        </button>
        <button 
            className="w-16 h-16 bg-blue-500/30 rounded-full flex items-center justify-center active:bg-blue-500/50 backdrop-blur-sm border-2 border-blue-400/50 mt-4"
            onTouchStart={() => handleTouchStart('ArrowUp')}
            onTouchEnd={() => handleTouchEnd('ArrowUp')}
            onMouseDown={() => handleTouchStart('ArrowUp')}
            onMouseUp={() => handleTouchEnd('ArrowUp')}
        >
            <ArrowUp className="text-white w-8 h-8" />
        </button>
      </div>
      
      <div className="absolute top-4 left-4 bg-black/50 p-2 rounded text-white text-xs">
          <p>WASD / 方向鍵 移動</p>
          <p>Space / 上鍵 跳躍</p>
          <p>Z / K 攻擊</p>
          <p>1-4 使用技能 (快捷槽)</p>
      </div>

      <button 
          className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-white/20 transition-colors"
          onClick={() => {
              const newState = !soundEnabled;
              setSoundEnabled(newState);
              audioService.toggle(newState);
          }}
      >
          {soundEnabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}
      </button>
    </div>
  );
};
