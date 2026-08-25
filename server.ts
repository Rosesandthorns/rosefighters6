import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
  transports: ['websocket']
});

// Real-time game state
interface Player {
  id: string;
  characterId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  health: number;
  maxHealth: number;
  facing: 'left' | 'right';
  velocity: { x: number, y: number };
  isAttacking: boolean;
  isGrounded: boolean;
  isGrabbingLedge: boolean;
  isStunned: boolean;
  isFastFalling: boolean;
  score: number;
  speedMult: number;
  staticChargeLastHit?: number;
  hadDronesA?: boolean;
  hadDronesB?: boolean;
  hadDronesC?: boolean;
  droneACooldown?: number;
  droneBCooldown?: number;
  droneCCooldown?: number;
  deflectTimer?: number;
  safetyWarpState?: 'none' | 'charging' | 'ready';
  safetyWarpTimer?: number;
  dots?: { damagePerTick: number; ticksLeft: number; nextTick: number; ownerId?: string }[];
  isInvincible?: boolean;
  activeEffects?: Record<string, number>;
  hp?: number;
  kaelenBombCD?: number;
  kaelenBomb?: { x: number; y: number } | null;
  inkSlowed?: number;
  paintCovered?: number;
  isBoss?: boolean;
  grabbedPlayerId?: string | null;
  grabbedByPlayerId?: string | null;
  grabTimer?: number;
  throwCooldown?: number;
  chargeState?: 'none' | 'charging' | 'running';
  chargeTimer?: number;
  mimicTimer?: number;
  healLastHit?: number;
  healTimer?: number;
  boomerangActive?: boolean;
  womboTimer?: number;
  isSuperArmor?: boolean;
  // Pinedo sprite state
  pinedoState?: 'idle' | 'run' | 'attack1' | 'attack2' | 'waiting' | 'attack3start' | 'attack3main';
  pinedoAttack1End?: number;
  pinedoAttack1DmgStart?: number;
  pinedoAttack1DmgEnd?: number;
  pinedoAttack1Hit?: boolean;
  pinedoAttack3Center?: { x: number; y: number };
  pinedoAttack3End?: number;
  mirageState?: 'idle' | 'movestart' | 'midflight' | 'movestop' | 'attack1' | 'attack2' | 'attack3' | 'attack3reverse';
  mirageMoving?: boolean;
  mirageAttack3TeleportX?: number;
  mirageAttack3TeleportY?: number;
  cocoState?: 'idle' | 'walk' | 'attack13' | 'attack2';
  cocoRageActive?: boolean;
  cocoRageEnd?: number;
  cocoFountainId?: string;
  // Zobo sprite/ability state
  zoboState?: 'idle' | 'walk' | 'attack1start' | 'attack1mid' | 'attack1return' | 'attack2' | 'attack3';
  zoboArm1Active?: boolean;
  zoboArm1ProjId?: string;
  zoboArm1SpawnX?: number;
  zoboArm1SpawnY?: number;
  zoboRegatherEnd?: number;
  zoboRegatherHit?: boolean;
  // Orbo sprite state
  orboState?: 'idle' | 'move' | 'idleDeflect' | 'moveDeflect' | 'attack2' | 'attack2Deflect' | 'attack3';
  lastHitBy?: { id: string, time: number };
  brambleId?: string;
  brambleImmune?: number;
  chaosMode?: boolean;
  isEliminated?: boolean;
  currentRosterIndex?: number;
}

const ROSTER = [
  { id: 'mirage', name: 'Mirage', color: '#a855f7', hp: 80, speedMult: 1.0, category: 'Mirage Park' },
  { id: 'orbo', name: 'Orbo', color: '#06b6d4', hp: 60, speedMult: 1.0, category: 'Mirage Park' },
  { id: 'rica', name: 'Rica', color: '#ef4444', hp: 120, speedMult: 0.8, category: 'Mirage Park' },
  { id: 'chester', name: 'Chester', color: '#8b4513', hp: 200, speedMult: 0.2, category: 'Mirage Park' },
  { id: 'pinedo', name: 'Pinedo', color: '#ffffff', hp: 100, speedMult: 1.0, category: 'Mirage Park' },
  { id: 'morka', name: 'Morka', color: '#6b7280', hp: 120, speedMult: 1.2, category: 'Mirage Park' },
  { id: 'wisp', name: 'Wisp', color: '#3b82f6', hp: 50, speedMult: 1.5, category: 'Mirage Park' },
  { id: 'cole', name: 'Cole', color: '#4b5563', hp: 150, speedMult: 0.5, category: 'Mirage Park' },
  { id: 'oakwell', name: 'Oakwell', color: '#92400e', hp: 150, speedMult: 0.7, category: 'Mirage Park' },
  { id: 'coco', name: 'Coco', color: '#78350f', hp: 200, speedMult: 0.8, category: 'Mirage Park' },
  { id: 'zobo', name: 'Zobo', color: '#e2e8f0', hp: 150, speedMult: 0.2, category: 'Mirage Park' },
  { id: 'pip', name: 'Pip', color: '#991b1b', hp: 30, speedMult: 3.0, category: 'Rose Valley' },
  { id: 'nexus', name: 'Nexus', color: '#f97316', hp: 40, speedMult: 3.0, category: 'Rose Valley' },
  { id: 'neddy', name: 'Neddy', color: '#eab308', hp: 80, speedMult: 1.2, category: 'Project Defence' },
  { id: 'lantern', name: 'The Lantern Setter', color: '#fef08a', hp: 120, speedMult: 0.9, category: 'Project Defence' },
  { id: 'wax', name: 'Ink Drawn Shopkeeper', color: '#1e1b2e', hp: 2500, speedMult: 0.1, category: 'Project Defence' },
  { id: 'kaelen', name: 'Commander Kaelen', color: '#4d7c0f', hp: 100, speedMult: 1.1, category: 'Vantage' },
  { id: 'luma', name: 'Luma Art', color: '#ec4899', hp: 100, speedMult: 1.1, category: 'Vantage' }
];

interface LobbyPlayer {
  id: string;
  characterId: string | null;
  isReady: boolean;
  lastActive: number;
  isSpectator: boolean;
  rosterChoice?: string[];
  currentRosterIndex?: number;
}

interface Lobby {
  id: string;
  name: string;
  code: string;
  isPrivate: boolean;
  adminId: string;
  players: Record<string, LobbyPlayer>;
  gameMode: GameMode;
  gameState: 'LOBBY' | 'PLAYING' | 'ENDED';
  matchSettings: MatchSettings;
  createdAt: number;
  matchStartTime?: number;
  matchEndTime?: number;
}

type GameMode = 'ffa' | 'randomized' | 'roster_choice' | 'chaos_rounds';

interface MatchSettings {
  timeLimit?: number;
  suddenDeathTime?: number;
  speedMultiplier?: number;
  damageMultiplier?: number;
  bossBanEnabled?: boolean;
  rosterSize?: number;
}

interface Projectile {
    id: string;
    type: 'card' | 'boomerang' | 'fireball' | 'plate' | 'thorn' | 'laser' | 'lantern' | 'book' | 'dart' | 'fallingBook' | 'inkBlob' | 'bullet' | 'paintLob' | 'paintTrap' | 'chocolate' | 'spider' | 'web';
    x: number;
    y: number;
    startX?: number;
    startY?: number;
    angle?: number;
    rotationSpeed?: number;
    vx: number;
    vy: number;
    ownerId: string;
    damage: number;
    life: number;
    state?: string;
    lobbyId?: string;
}

interface Wall {
    id: string;
    x: number;
    y: number;
    targetY?: number;
    width: number;
    height: number;
    expires: number;
    type?: string;
    ownerId?: string;
    rising?: boolean;
    riseSpeed?: number;
    lobbyId?: string;
}

interface Zone {
    id: string;
    x: number;
    y: number;
    radius: number;
    timer: number;
    ownerId: string;
    lobbyId?: string;
}

interface Drone {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    ownerId: string;
    hp: number;
    type?: 'A' | 'B' | 'C';
    angle?: number;
    lobbyId?: string;
}

const players: Record<string, Player> = {};
const lobbies: Record<string, Lobby> = {};
const playerLobbyMap: Record<string, string> = {};
const projectiles: Record<string, Projectile> = {};
const walls: Record<string, Wall> = {};
const zones: Record<string, Zone> = {};
const drones: Record<string, Drone> = {};
let entityIdCounter = 0;
let lobbyIdCounter = 0;

// Helper function to get lobby by player ID
function getLobbyByPlayerId(playerId: string): Lobby | null {
  const lobbyId = playerLobbyMap[playerId];
  return lobbyId ? lobbies[lobbyId] : null;
}

// Helper function to broadcast available lobbies to all clients
function broadcastAvailableLobbies() {
  io.emit('availableLobbies', Object.values(lobbies).map(lobby => ({
    id: lobby.id,
    name: lobby.name,
    isPrivate: lobby.isPrivate,
    gameMode: lobby.gameMode,
    playerCount: Object.keys(lobby.players).length,
    gameState: lobby.gameState
  })));
}

// Helper function to end a match in a lobby
function endLobbyMatch(lobby: Lobby, winnerId: string, reason: string) {
  lobby.gameState = 'LOBBY';
  lobby.matchEndTime = Date.now();
  lobby.matchStartTime = undefined;
  for (const playerId of Object.keys(lobby.players)) {
    delete players[playerId];
    lobby.players[playerId].isReady = false;
    lobby.players[playerId].characterId = null;
    if (lobby.gameMode === 'roster_choice') {
      lobby.players[playerId].currentRosterIndex = 0;
    }
  }
  io.to(lobby.id).emit('gameEnd', { winnerId, reason });
  io.to(lobby.id).emit('lobbyUpdate', lobby);
  broadcastAvailableLobbies();
}

// Helper function to check win conditions for a lobby
function checkWinConditions(lobby: Lobby) {
  if (lobby.gameState !== 'PLAYING') return;

  if (lobby.gameMode === 'ffa' || lobby.gameMode === 'chaos_rounds') {
    const lobbyPlayerIds = Object.keys(lobby.players);
    const playerScores = lobbyPlayerIds.map(id => ({ id, score: players[id]?.score || 0 }));
    if (playerScores.length > 1) {
      const sortedScores = playerScores.sort((a, b) => b.score - a.score);
      if (sortedScores[0].score - sortedScores[1].score >= 15) {
        endLobbyMatch(lobby, sortedScores[0].id, 'kill_streak_lead');
        return;
      }
    }
  }

  if (lobby.gameMode === 'roster_choice') {
    const activePlayers = Object.keys(lobby.players)
      .map(id => players[id])
      .filter(p => p && !p.isEliminated);
    if (activePlayers.length === 1) {
      endLobbyMatch(lobby, activePlayers[0].id, 'last_standing');
      return;
    }
  }
}

// Unified Player Death Handler
function handlePlayerDeath(target: Player, killerId?: string, cause?: string) {
  if (!target) return;
  const targetLobby = getLobbyByPlayerId(target.id);
  const targetLobbyId = targetLobby ? targetLobby.id : null;

  let effectiveKillerId = killerId;
  if (!effectiveKillerId && target.lastHitBy && (Date.now() - target.lastHitBy.time < 5000)) {
    effectiveKillerId = target.lastHitBy.id;
  }

  if (effectiveKillerId && players[effectiveKillerId] && effectiveKillerId !== target.id) {
    players[effectiveKillerId].score = (players[effectiveKillerId].score || 0) + 1;
    const killerLobby = getLobbyByPlayerId(effectiveKillerId);
    if (killerLobby) {
      io.to(killerLobby.id).emit('scoreUpdated', { id: effectiveKillerId, score: players[effectiveKillerId].score });
    }
  } else if (cause === 'void' && (!effectiveKillerId || effectiveKillerId === target.id)) {
    target.score = Math.max(0, (target.score || 0) - 1);
    if (targetLobbyId) {
      io.to(targetLobbyId).emit('scoreUpdated', { id: target.id, score: target.score });
    }
  }

  target.lastHitBy = undefined;
  target.dots = [];
  target.isGrabbingLedge = false;
  target.isStunned = false;
  target.velocity = { x: 0, y: 0 };
  target.activeEffects = {};
  target.safetyWarpState = 'none';
  target.deflectTimer = 0;
  target.mimicTimer = 0;
  target.kaelenBombCD = 0;
  target.kaelenBomb = null;
  target.inkSlowed = 0;
  target.paintCovered = 0;
  target.womboTimer = 0;

  if (target.grabbedPlayerId) {
    const g = players[target.grabbedPlayerId];
    if (g) g.grabbedByPlayerId = null;
    target.grabbedPlayerId = null;
  }
  if (target.grabbedByPlayerId) {
    const g = players[target.grabbedByPlayerId];
    if (g) g.grabbedPlayerId = null;
    target.grabbedByPlayerId = null;
  }

  if (!targetLobby) {
    target.health = target.maxHealth;
    target.x = Math.random() * 400 + 312;
    target.y = 50;
    io.emit('playerRespawned', target);
    return;
  }

  if (targetLobby.gameMode === 'randomized') {
    const randomChar = ROSTER[Math.floor(Math.random() * ROSTER.length)];
    const char = ROSTER.find(c => c.id === randomChar.id) || ROSTER[0];
    target.characterId = char.id;
    target.health = char.hp;
    target.maxHealth = char.hp;
    target.speedMult = char.speedMult;
    target.width = charWidth(char.id);
    target.height = charHeight(char.id);
    target.color = char.color;
    target.x = Math.random() * 400 + 312;
    target.y = 50;
    // Reset character-specific state
    target.zoboState = 'idle'; target.zoboArm1Active = false; target.zoboArm1ProjId = undefined;
    target.orboState = 'idle'; target.pinedoState = 'idle'; target.mirageState = 'idle';
    target.cocoState = 'idle'; target.boomerangActive = false;

    io.to(targetLobby.id).emit('playerEffect', { id: target.id, effect: 'characterChange', newCharacterId: target.characterId });
    io.to(targetLobby.id).emit('characterChange', { id: target.id, newCharacterId: target.characterId });
    io.to(targetLobby.id).emit('playerRespawned', target);

    if (effectiveKillerId && players[effectiveKillerId] && effectiveKillerId !== target.id) {
      const killer = players[effectiveKillerId];
      const killerRandomChar = ROSTER[Math.floor(Math.random() * ROSTER.length)];
      const killerChar = ROSTER.find(c => c.id === killerRandomChar.id) || ROSTER[0];
      killer.characterId = killerChar.id;
      killer.health = killerChar.hp;
      killer.maxHealth = killerChar.hp;
      killer.speedMult = killerChar.speedMult;
      killer.width = charWidth(killerChar.id);
      killer.height = charHeight(killerChar.id);
      killer.color = killerChar.color;

      io.to(targetLobby.id).emit('playerEffect', { id: killer.id, effect: 'characterChange', newCharacterId: killer.characterId });
      io.to(targetLobby.id).emit('characterChange', { id: killer.id, newCharacterId: killer.characterId });
      io.to(targetLobby.id).emit('playerRespawned', killer);
    }
  } else if (targetLobby.gameMode === 'roster_choice') {
    const lobbyPlayer = targetLobby.players[target.id];
    const roster = lobbyPlayer?.rosterChoice || [];
    const currentIndex = lobbyPlayer?.currentRosterIndex || 0;
    const nextIndex = currentIndex + 1;

    if (nextIndex < roster.length) {
      const nextCharId = roster[nextIndex];
      const char = ROSTER.find(c => c.id === nextCharId) || ROSTER[0];
      target.characterId = char.id;
      target.health = char.hp;
      target.maxHealth = char.hp;
      target.speedMult = char.speedMult;
      target.width = charWidth(char.id);
      target.height = charHeight(char.id);
      target.color = char.color;
      target.currentRosterIndex = nextIndex;
      if (lobbyPlayer) lobbyPlayer.currentRosterIndex = nextIndex;
      target.x = Math.random() * 400 + 312;
      target.y = 50;

      io.to(targetLobby.id).emit('playerEffect', { id: target.id, effect: 'characterChange', newCharacterId: target.characterId });
      io.to(targetLobby.id).emit('characterChange', { id: target.id, newCharacterId: target.characterId });
      io.to(targetLobby.id).emit('playerRespawned', target);
    } else {
      target.isEliminated = true;
      delete players[target.id];
      io.to(targetLobby.id).emit('playerEliminated', { id: target.id });
    }
  } else {
    target.health = target.maxHealth;
    target.x = Math.random() * 400 + 312;
    target.y = 50;
    io.to(targetLobby.id).emit('playerRespawned', target);
    io.to(targetLobby.id).emit('playerHealthChanged', { id: target.id, health: target.health });
  }

  checkWinConditions(targetLobby);
}

function applyDamage(target: Player, damage: number, attackerId?: string, isExplosion = false) {
    if (target.isInvincible) return;

    // Mimic Counter
    if (target.mimicTimer && target.mimicTimer > Date.now()) {
        if (!isExplosion && attackerId) {
            target.mimicTimer = 0;
            const targetLobby = getLobbyByPlayerId(target.id);
            if (targetLobby) io.to(targetLobby.id).emit('playerEffect', { id: target.id, effect: 'mimicSuccess' });
            const attacker = players[attackerId];
            if (attacker && !attacker.isInvincible) {
                const dmg = Math.min(50, attacker.maxHealth * 0.33);
                attacker.health -= dmg;
                attacker.x = target.x + (target.facing === 'right' ? -50 : 50);
                if (targetLobby) {
                    io.to(targetLobby.id).emit('forcePosition', { id: attacker.id, x: attacker.x, y: attacker.y });
                    io.to(attacker.id).emit('applyKnockback', { vx: 0, vy: 15, stunFrames: 150 });
                }
                if (attacker.health <= 0) {
                    handlePlayerDeath(attacker, target.id, 'mimic');
                } else if (targetLobby) {
                    io.to(targetLobby.id).emit('playerHealthChanged', { id: attacker.id, health: attacker.health });
                }
            }
        }
        return;
    }

    // Deflect Counter
    if (target.deflectTimer && target.deflectTimer > Date.now() && attackerId && !isExplosion) {
        const attacker = players[attackerId];
        if (attacker) {
            if (attacker.isInvincible) attacker.isInvincible = false;
            attacker.health -= damage * 2;
            const targetLobby = getLobbyByPlayerId(target.id);
            if (targetLobby) {
                io.to(targetLobby.id).emit('playerEffect', { id: target.id, effect: 'deflectSuccess' });
                io.to(targetLobby.id).emit('playerEffect', { id: attacker.id, effect: 'hit' });
            }
            if (attacker.health <= 0) {
                handlePlayerDeath(attacker, target.id, 'deflect');
            } else if (targetLobby) {
                io.to(targetLobby.id).emit('playerHealthChanged', { id: attacker.id, health: attacker.health });
            }
        }
        return;
    }

    if (target.characterId === 'chester' && target.healTimer && target.healTimer > Date.now()) {
        target.healTimer = 0;
        const targetLobby = getLobbyByPlayerId(target.id);
        if (targetLobby) io.to(targetLobby.id).emit('playerEffect', { id: target.id, effect: 'healCancel' });
    }

    target.health -= damage;
    if (target.characterId === 'zobo' && target.health > 0) {
        recalcZoboSpeed(target);
        target.zoboRegatherHit = true; // interrupt regather
    }
    if (attackerId) {
        target.lastHitBy = { id: attackerId, time: Date.now() };
    }
    const targetLobby = getLobbyByPlayerId(target.id);
    if (targetLobby) io.to(targetLobby.id).emit('playerEffect', { id: target.id, effect: 'hit' });

    if (target.health <= 0) {
        handlePlayerDeath(target, attackerId, 'damage');
    } else if (targetLobby) {
        io.to(targetLobby.id).emit('playerHealthChanged', { id: target.id, health: target.health });
    }
}

// Periodic cleanup of empty lobbies (every 10 seconds)
setInterval(() => {
  for (const [lobbyId, lobby] of Object.entries(lobbies)) {
    if (Object.keys(lobby.players).length === 0) {
      delete lobbies[lobbyId];
      io.emit('lobbyClosed', { lobbyId: lobby.id });
      broadcastAvailableLobbies();
    }
  }
}, 10000);

// Helper function to generate lobby code
function generateLobbyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper function to get default settings for game mode
function getDefaultSettings(gameMode: GameMode): MatchSettings {
  switch (gameMode) {
    case 'ffa':
      return { timeLimit: 180, suddenDeathTime: 60, bossBanEnabled: true };
    case 'randomized':
      return { timeLimit: 180, suddenDeathTime: 60, bossBanEnabled: false };
    case 'roster_choice':
      return { bossBanEnabled: false, rosterSize: 5 };
    case 'chaos_rounds':
      return { timeLimit: 180, suddenDeathTime: 60, bossBanEnabled: false };
    default:
      return {};
  }
}

function charWidth(id: string | null | undefined): number {
  if (id === 'wax') return 100;
  if (id === 'mirage') return 12;
  if (id === 'coco') return 40;
  if (id === 'orbo') return 17;
  if (id === 'zobo') return 6;
  return 50;
}

function charHeight(id: string | null | undefined): number {
  if (id === 'wax') return 120;
  if (id === 'mirage') return 40;
  if (id === 'coco') return 65;
  if (id === 'orbo') return 44;
  if (id === 'zobo') return 70;
  return 50;
}

// Recalculate Zobo speed based on current HP
function recalcZoboSpeed(player: Player) {
  const hpLost = Math.max(0, 150 - player.health);
  player.speedMult = 0.2 + Math.floor(hpLost / 10) * 0.1;
}

setInterval(() => {
    // Process all active lobbies
    for (const [lobbyId, lobby] of Object.entries(lobbies)) {
        if (lobby.gameState !== 'PLAYING') continue;
        
        const now = Date.now();
        const lobbyPlayerIds = new Set(Object.keys(lobby.players));

        // Process Zones
        for (const [id, zone] of Object.entries(zones)) {
            const zoneLobbyId = zone.lobbyId || playerLobbyMap[zone.ownerId];
            if (zoneLobbyId !== lobbyId) continue;

            if (now >= zone.timer) {
                io.to(lobbyId).emit('zoneDetonate', { x: zone.x, y: zone.y, radius: zone.radius });
                for (const playerId of lobbyPlayerIds) {
                    const player = players[playerId];
                    if (!player) continue;
                    const dist = Math.hypot(player.x + player.width/2 - zone.x, player.y + player.height/2 - zone.y);
                    if (dist <= zone.radius) {
                        player.dots = player.dots || [];
                        player.dots.push({ damagePerTick: 7.5, ticksLeft: 4, nextTick: now + 500, ownerId: zone.ownerId });
                        io.to(lobbyId).emit('playerEffect', { id: player.id, effect: 'dotStart' });
                    }
                }
                for (const [droneId, drone] of Object.entries(drones)) {
                    const droneLobbyId = drone.lobbyId || playerLobbyMap[drone.ownerId];
                    if (droneLobbyId === lobbyId && drone.ownerId !== zone.ownerId) {
                        const dist = Math.hypot(drone.x - zone.x, drone.y - zone.y);
                        if (dist <= zone.radius) {
                            drone.hp -= 15;
                        }
                    }
                }
                delete zones[id];
            }
        }

        // Check win conditions
        checkWinConditions(lobby);
        if (lobby.gameState !== 'PLAYING') continue;

        // Chaos mode events
        if (lobby.gameMode === 'chaos_rounds') {
            if (now % 15000 < 35) {
                const chaosEvents = ['random_gravity', 'speed_boost', 'damage_boost', 'knockback_boost'];
                const event = chaosEvents[Math.floor(Math.random() * chaosEvents.length)];
                
                for (const playerId of lobbyPlayerIds) {
                    const player = players[playerId];
                    if (!player) continue;
                    if (event === 'random_gravity') {
                        player.velocity = player.velocity || { x: 0, y: 0 };
                        player.velocity.y = (Math.random() - 0.5) * 20;
                    } else if (event === 'speed_boost') {
                        player.speedMult = (player.speedMult || 1.0) * 1.5;
                        setTimeout(() => { 
                            if (players[player.id]) {
                                const char = ROSTER.find(c => c.id === player.characterId);
                                players[player.id].speedMult = char ? char.speedMult : 1.0;
                            }
                        }, 5000);
                    } else if (event === 'damage_boost') {
                        player.isSuperArmor = true;
                        setTimeout(() => { 
                            if (players[player.id]) {
                                players[player.id].isSuperArmor = false;
                            }
                        }, 5000);
                    } else if (event === 'knockback_boost') {
                        player.velocity = player.velocity || { x: 0, y: 0 };
                        player.velocity.x = (Math.random() - 0.5) * 30;
                        player.velocity.y = -15;
                    }
                }
                
                io.to(lobby.id).emit('chaosEvent', { event });
            }
        }

        // Check time limit
        if (lobby.matchSettings.timeLimit && lobby.matchStartTime) {
            const elapsed = (now - lobby.matchStartTime) / 1000;
            if (elapsed >= lobby.matchSettings.timeLimit) {
                const playerScores = Array.from(lobbyPlayerIds).map(id => ({ id, score: players[id]?.score || 0 }));
                if (playerScores.length > 0) {
                    const sortedScores = playerScores.sort((a, b) => b.score - a.score);
                    endLobbyMatch(lobby, sortedScores[0].id, 'time_limit');
                    continue;
                }
            }
        }

        // Process DoTs, Safety Warp, and status for players in this lobby
        for (const playerId of lobbyPlayerIds) {
            const player = players[playerId];
            if (!player || player.isEliminated) continue;

            if (player.womboTimer && player.womboTimer > now) {
                if (now % 300 < 35) {
                    for (const targetId of lobbyPlayerIds) {
                        if (targetId === player.id) continue;
                        const target = players[targetId];
                        if (!target) continue;
                        const dist = Math.hypot(target.x - player.x, target.y - player.y);
                        if (dist < 80) {
                            applyDamage(target, 5, player.id);
                        }
                    }
                }
            }

            // Pinedo attack1 damage window
            if (player.characterId === 'pinedo' && player.pinedoState === 'attack1' &&
                !player.pinedoAttack1Hit &&
                player.pinedoAttack1DmgStart && now >= player.pinedoAttack1DmgStart &&
                player.pinedoAttack1DmgEnd && now < player.pinedoAttack1DmgEnd) {
                player.pinedoAttack1Hit = true;
                const hbOffsetX = 18;
                const hbOffsetY = 25;
                const hbW = 30;
                const hbH = 30;
                const hitBox = {
                    x: player.facing === 'left'
                        ? player.x + hbOffsetX
                        : player.x + player.width - hbOffsetX - hbW,
                    y: player.y + hbOffsetY,
                    width: hbW,
                    height: hbH
                };
                for (const targetId of lobbyPlayerIds) {
                    if (targetId === player.id) continue;
                    const target = players[targetId];
                    if (!target) continue;
                    if (target.x < hitBox.x + hitBox.width && target.x + target.width > hitBox.x &&
                        target.y < hitBox.y + hitBox.height && target.y + target.height > hitBox.y) {
                        const dmg = Math.min(30, target.maxHealth * 0.15);
                        applyDamage(target, dmg, player.id);
                        if (target.characterId !== 'wax') {
                            io.to(target.id).emit('applyKnockback', { vx: player.facing === 'left' ? -12 : 12, vy: -10, stunFrames: 25 });
                        }
                    }
                }
            }

            // Pinedo attack3 main
            if (player.characterId === 'pinedo' && player.pinedoState === 'attack3main' &&
                player.pinedoAttack3End && now < player.pinedoAttack3End) {
                const cx = player.x + player.width / 2;
                const cy = player.y + player.height / 2;
                if (now % 150 < 35) {
                    for (const targetId of lobbyPlayerIds) {
                        if (targetId === player.id) continue;
                        const target = players[targetId];
                        if (!target) continue;
                        const td = Math.hypot(target.x + target.width / 2 - cx, target.y + target.height / 2 - cy);
                        if (td < 80) {
                            applyDamage(target, 8, player.id);
                            if (target.characterId !== 'wax') {
                                io.to(target.id).emit('applyKnockback', { vx: (target.x > cx ? 4 : -4), vy: -3, stunFrames: 5 });
                            }
                        }
                    }
                }
            } else if (player.characterId === 'pinedo' && player.pinedoState === 'attack3main' &&
                player.pinedoAttack3End && now >= player.pinedoAttack3End) {
                player.pinedoState = 'idle';
                io.to(lobbyId).emit('playerEffect', { id: player.id, effect: 'pinedoStateChange', state: 'idle' });
            }

            // Fire wall damage
            for (const [wallId, wall] of Object.entries(walls)) {
                const wallLobbyId = wall.lobbyId || (wall.ownerId ? playerLobbyMap[wall.ownerId] : undefined);
                if (wallLobbyId && wallLobbyId !== lobbyId) continue;

                if (wall.type === 'cocoFountain' && wall.ownerId !== player.id) {
                    if (player.x < wall.x + wall.width && player.x + player.width > wall.x &&
                        player.y < wall.y + wall.height && player.y + player.height > wall.y) {
                        if (now % 1000 < 35) applyDamage(player, 10, wall.ownerId);
                        player.velocity = player.velocity || { x: 0, y: 0 };
                        player.velocity.y = -12;
                    }
                }
                if (wall.type === 'fire' && wall.ownerId !== player.id && player.characterId !== 'wisp') {
                    if (player.x < wall.x + wall.width && player.x + player.width > wall.x &&
                        player.y < wall.y + wall.height && player.y + player.height > wall.y) {
                        if (now % 500 < 35) {
                            applyDamage(player, 5, wall.ownerId, true);
                        }
                    }
                } else if (wall.type === 'bramble' && wall.ownerId !== player.id) {
                    if (player.brambleImmune && player.brambleImmune > now) continue;
                    if (player.x < wall.x + wall.width && player.x + player.width > wall.x &&
                        player.y < wall.y + wall.height && player.y + player.height > wall.y) {
                        applyDamage(player, 15, wall.ownerId);
                        io.to(player.id).emit('applyKnockback', { vx: 0, vy: -5, stunFrames: 60 });
                        delete walls[wall.id];
                    }
                } else if (wall.type === 'bloodCloud' && wall.ownerId !== player.id) {
                    if (player.x < wall.x + wall.width && player.x + player.width > wall.x &&
                        player.y < wall.y + wall.height && player.y + player.height > wall.y) {
                        if (now % 500 < 35) {
                            applyDamage(player, 8, wall.ownerId, true);
                        }
                    }
                }
            }

            if (player.dots && player.dots.length > 0) {
                for (let i = player.dots.length - 1; i >= 0; i--) {
                    const dot = player.dots[i];
                    if (now >= dot.nextTick) {
                        applyDamage(player, dot.damagePerTick, dot.ownerId, true);
                        dot.ticksLeft--;
                        dot.nextTick = now + 500;
                        if (player.health <= 0 || !players[player.id]) {
                            if (dot.ticksLeft <= 0 && player.dots) player.dots.splice(i, 1);
                            continue;
                        }
                        if (dot.ticksLeft <= 0) player.dots.splice(i, 1);
                    }
                }
            }

            if (player.safetyWarpState === 'charging' && player.safetyWarpTimer && now >= player.safetyWarpTimer) {
                player.safetyWarpState = 'ready';
                io.to(lobbyId).emit('playerEffect', { id: player.id, effect: 'warpReady' });
            }

            if (player.inkSlowed && now >= player.inkSlowed) {
                player.inkSlowed = 0;
                const char = ROSTER.find(c => c.id === player.characterId);
                player.speedMult = char ? char.speedMult : 1.0;
                io.to(lobbyId).emit('playerEffect', { id: player.id, effect: 'inkSlowEnd' });
            }

            // Rica Grab Timeout
            if (player.grabTimer && player.grabbedPlayerId && now > player.grabTimer) {
                const target = players[player.grabbedPlayerId];
                if (target) {
                    target.health -= target.maxHealth * 0.25;
                    player.grabbedPlayerId = null;
                    target.grabbedByPlayerId = null;
                    player.grabTimer = 0;
                    player.throwCooldown = Date.now() + 5000;
                    io.to(lobbyId).emit('playerEffect', { id: player.id, effect: 'ricaSlam' });
                    io.to(target.id).emit('applyKnockback', { vx: 0, vy: 20, stunFrames: 30 });
                    if (target.health <= 0) {
                        handlePlayerDeath(target, player.id, 'ricaSlam');
                    } else {
                        io.to(lobbyId).emit('playerHealthChanged', { id: target.id, health: target.health });
                    }
                }
            }

            // Rica Charge Timeout
            if (player.chargeState === 'charging' && player.chargeTimer && now >= player.chargeTimer) {
                player.chargeState = 'running';
                io.to(lobbyId).emit('playerEffect', { id: player.id, effect: 'ricaChargeRun' });
            }

            // Chester Heal
            if (player.healTimer && now < player.healTimer) {
                if (now - (player.healLastHit || 0) > 5000) {
                    player.health = Math.min(player.maxHealth, player.health + 20);
                    player.healTimer = 0;
                    io.to(lobbyId).emit('playerHealthChanged', { id: player.id, health: player.health });
                    io.to(lobbyId).emit('playerEffect', { id: player.id, effect: 'chesterHealed' });
                }
            }
        }

        // Process Walls
        for (const [id, wall] of Object.entries(walls)) {
        if (now >= wall.expires) {
            delete walls[id];
        }
        
        // Handle rising walls (Coco Fountain)
        if (wall.rising && wall.targetY !== undefined) {
            if (wall.y > wall.targetY) {
                wall.y -= wall.riseSpeed || 10;
                if (wall.y < wall.targetY) wall.y = wall.targetY;
            } else {
                wall.rising = false;
            }
        }
    }

        // Process Projectiles
        for (const [id, proj] of Object.entries(projectiles)) {
        if (proj.type === 'chocolate') {
            // Boomerang-style: return to origin point after half life
            if (proj.life > 45) {
                // outbound — keep velocity
            } else {
                const tx = proj.startX ?? proj.x;
                const ty = proj.startY ?? proj.y;
                const dx = tx - proj.x;
                const dy = ty - proj.y;
                const len = Math.hypot(dx, dy);
                if (len < 10) { proj.life = -1; } // absorbed
                else { proj.vx = (dx / len) * 10; proj.vy = (dy / len) * 10; }
            }
            // Update rotation
            if (proj.angle !== undefined && proj.rotationSpeed !== undefined) {
                proj.angle += proj.rotationSpeed;
            }
        } else if (proj.type === 'spider') {
            const owner = players[proj.ownerId];
            if (!owner) {
                proj.life = -1;
            } else {
                // Calculate current hand spawn position based on Zobo's facing & position
                const currentHandX = owner.facing === 'right' ? owner.x + 42 : owner.x - 36;
                const currentHandY = owner.y + 10;

                if (proj.life > 15) {
                    // outbound for 15 frames (~300px out)
                } else {
                    // returning — head back to Zobo's current hand position
                    const dx = currentHandX - proj.x;
                    const dy = currentHandY - proj.y;
                    const len = Math.hypot(dx, dy);
                    if (len < 25 || proj.life <= 1) {
                        // Returned or expired — unstun owner
                        owner.zoboArm1Active = false;
                        owner.zoboArm1ProjId = undefined;
                        owner.zoboState = 'idle';
                        const ownerLobby = getLobbyByPlayerId(owner.id);
                        if (ownerLobby) {
                            io.to(owner.id).emit('clearStun');
                            io.to(ownerLobby.id).emit('playerEffect', { id: owner.id, effect: 'zoboStateChange', state: 'idle' });
                            io.to(ownerLobby.id).emit('zoboArmUpdate', { ownerId: owner.id, x1: 0, y1: 0, x2: 0, y2: 0, active: false });
                        }
                        proj.life = -1;
                    } else {
                        proj.vx = (dx / len) * 20;
                        proj.vy = (dy / len) * 20;
                    }
                }
                // Emit arm tether update so client can draw line from current hand to projectile
                if (proj.life > 0) {
                    const ownerLobby = getLobbyByPlayerId(proj.ownerId);
                    if (ownerLobby) {
                        io.to(ownerLobby.id).emit('zoboArmUpdate', {
                            ownerId: proj.ownerId, x1: currentHandX, y1: currentHandY, x2: proj.x, y2: proj.y, active: true
                        });
                    }
                }
            }
        } else if (proj.type === 'web') {
            proj.vy += 0.4; // arc gravity — no other special logic needed
        } else if (proj.type === 'boomerang') {
            if (proj.life > 30) {
                proj.vx -= (proj.vx > 0 ? 0.5 : -0.5);
            } else {
                const owner = players[proj.ownerId];
                if (owner) {
                    const dx = owner.x + owner.width/2 - proj.x;
                    const dy = owner.y + owner.height/2 - proj.y;
                    const len = Math.hypot(dx, dy);
                    if (len < 30) {
                        owner.boomerangActive = false;
                        owner.isSuperArmor = false;
                        owner.pinedoState = 'idle';
                        io.to(owner.id).emit('clearStun');
                        io.emit('playerEffect', { id: owner.id, effect: 'pinedoStateChange', state: 'idle' });
                        proj.life = -1; // force delete
                    } else {
                        proj.vx = (dx / len) * 15;
                        proj.vy = (dy / len) * 15;
                    }
                }
            }
        } else if (proj.type === 'fireball') {
            let nearestTarget = null;
            let minDist = 9999;
            for (const p of Object.values(players)) {
                if (p.characterId === 'wisp') continue;
                const dist = Math.hypot(p.x - proj.x, p.y - proj.y);
                if (dist < minDist) { minDist = dist; nearestTarget = p; }
            }
            if (nearestTarget) {
                const dx = nearestTarget.x + nearestTarget.width / 2 - proj.x;
                const dy = nearestTarget.y + nearestTarget.height / 2 - proj.y;
                const len = Math.hypot(dx, dy);
                if (len > 0) {
                    proj.vx += (dx / len) * 0.5;
                    proj.vy += (dy / len) * 0.5;
                    const speed = Math.hypot(proj.vx, proj.vy);
                    if (speed > 10) { proj.vx = (proj.vx / speed) * 10; proj.vy = (proj.vy / speed) * 10; }
                }
            }
        }

        proj.x += proj.vx;
        proj.y += proj.vy;
        proj.life--;
        
        // Apply gravity to lobbed projectiles
        if (proj.type === 'lantern' || proj.type === 'paintLob') {
            proj.vy += 0.5;
        }
        
        let hit = false;
        for (const player of Object.values(players)) {
            if (player.id !== proj.ownerId) {
                // Swept AABB: check the full path the projectile travelled this tick
                // so fast/narrow projectiles don't tunnel through thin hitboxes
                const prevX = proj.x - proj.vx;
                const prevY = proj.y - proj.vy;
                const minX = Math.min(proj.x, prevX);
                const maxX = Math.max(proj.x, prevX);
                const minY = Math.min(proj.y, prevY);
                const maxY = Math.max(proj.y, prevY);
                const sweptHit = maxX > player.x && minX < player.x + player.width &&
                            maxY > player.y && minY < player.y + player.height;
                if (sweptHit) {
                    const beforeHp = player.health;
                    let actualDamage = proj.damage;
                    if (proj.type === 'laser') {
                        const dist = Math.hypot(proj.x - (proj.startX || 0), proj.y - (proj.startY || 0));
                        actualDamage = Math.min(40, Math.max(10, 10 + (dist / 800) * 30));
                    }
                    applyDamage(player, actualDamage, proj.ownerId);
                    if (player.health < beforeHp) {
                        if (player.characterId !== 'wax') io.to(player.id).emit('applyKnockback', { vx: proj.vx > 0 ? 10 : -10, vy: -5, stunFrames: 10 });
                        // Lantern stun
                        if (proj.type === 'lantern') {
                            io.to(player.id).emit('applyKnockback', { vx: proj.vx > 0 ? 6 : -6, vy: -4, stunFrames: 30 });
                        }
                        // Dart slow
                        if (proj.type === 'dart') {
                            player.inkSlowed = Date.now() + 3000;
                            player.speedMult = (player.speedMult || 1.0) * 0.5;
                            io.emit('playerEffect', { id: player.id, effect: 'inkSlowed' });
                        }
                        // Paint lob — cover screen
                        if (proj.type === 'paintLob') {
                            player.paintCovered = Date.now() + 4000;
                            io.to(player.id).emit('screenEffect', { type: 'paintCover', duration: 4000 });
                        }
                        // Paint trap — cover screen
                        if (proj.type === 'paintTrap') {
                            player.paintCovered = Date.now() + 4000;
                            io.to(player.id).emit('screenEffect', { type: 'paintCover', duration: 4000 });
                        }
                        // Web — stun 90 frames (~3s)
                        if (proj.type === 'web') {
                            io.to(player.id).emit('applyKnockback', { vx: 0, vy: 0, stunFrames: 90 });
                        }
                    }
                    if (proj.type !== 'boomerang' && proj.type !== 'chocolate' && proj.type !== 'spider') {
                        delete projectiles[id];
                        hit = true;
                        break;
                    }
                }
            }
        }

        if (!hit && projectiles[id]) {
            for (const wall of Object.values(walls)) {
                if (['fire', 'bramble', 'bloodCloud'].includes(wall.type || '')) continue;
                if (proj.x > wall.x && proj.x < wall.x + wall.width &&
                    proj.y > wall.y && proj.y < wall.y + wall.height) {
                    if (proj.type !== 'boomerang' && proj.type !== 'chocolate') {
                        delete projectiles[id];
                        hit = true;
                        break;
                    }
                }
            }
        }
        
        if (!hit && projectiles[id]) {
            for (const [droneId, drone] of Object.entries(drones)) {
                if (drone.ownerId !== proj.ownerId) {
                    if (proj.x > drone.x - 10 && proj.x < drone.x + 10 &&
                        proj.y > drone.y - 10 && proj.y < drone.y + 10) {
                        drone.hp -= proj.damage;
                        if (drone.type !== 'A') {
                            delete projectiles[id];
                            hit = true;
                            break;
                        }
                    }
                }
            }
        }

        if (!hit && projectiles[id] && proj.life <= 0) {
            delete projectiles[id];
        }
    }

        // Process Drones
        const currentDrones = { A: new Set(), B: new Set(), C: new Set() };
        for (const drone of Object.values(drones)) {
            if (drone.type && drone.hp > 0) currentDrones[drone.type as 'A'|'B'|'C'].add(drone.ownerId);
        }

        for (const [id, drone] of Object.entries(drones)) {
            if (drone.hp <= 0) {
                delete drones[id];
                continue;
            }
            
            let nearestTarget = null;
            let minDist = 9999;
            for (const player of Object.values(players)) {
                if (player.id === drone.ownerId) continue;
                const dist = Math.hypot(player.x - drone.x, player.y - drone.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearestTarget = player;
                }
            }
            
            if (drone.type === 'C') {
                drone.angle = (drone.angle || 0) + 0.05;
                const owner = players[drone.ownerId];
                if (owner) {
                    drone.x = owner.x + owner.width/2 + Math.cos(drone.angle)*60 - 10;
                    drone.y = owner.y + owner.height/2 + Math.sin(drone.angle)*60 - 10;
                } else {
                    drone.hp = 0; // owner died
                }
            } else if (nearestTarget) {
                const dx = nearestTarget.x + nearestTarget.width / 2 - drone.x;
                const dy = nearestTarget.y + nearestTarget.height / 2 - drone.y;
                const len = Math.hypot(dx, dy);
                if (len > 0) {
                    const speed = drone.type === 'A' ? 1.5 : (drone.type === 'B' ? 12 : 5);
                    drone.vx = (dx / len) * speed;
                    drone.vy = (dy / len) * speed;
                }
            }
            
            if (drone.type !== 'C') {
                drone.x += drone.vx;
                drone.y += drone.vy;
            }
            
            for (const wall of Object.values(walls)) {
                if (['bramble', 'bloodCloud'].includes(wall.type || '')) continue;
                if (drone.x > wall.x && drone.x < wall.x + wall.width &&
                    drone.y > wall.y && drone.y < wall.y + wall.height) {
                    if (wall.type === 'fire') {
                        drone.hp -= 20; // Breaks to fire walls
                    } else {
                        if (drone.type === 'B') {
                            drone.hp = 0;
                        } else if (drone.type !== 'C') {
                            drone.x -= drone.vx; // Stop on Mirage's walls
                            drone.y -= drone.vy;
                        }
                    }
                }
            }
            
            for (const player of Object.values(players)) {
                if (player.id === drone.ownerId) continue;
                if (player.id === drone.ownerId) continue;
                
                const radius = drone.type === 'A' ? 5 : (drone.type === 'B' ? 8 : (drone.type === 'C' ? 10 : 10));
                if (drone.x > player.x - radius && drone.x < player.x + player.width + radius &&
                    drone.y > player.y - radius && drone.y < player.y + player.height + radius) {
                    
                    let dmg = 15;
                    if (drone.type === 'A') dmg = 1;
                    else if (drone.type === 'B') dmg = 10;
                    else if (drone.type === 'C') dmg = 5;

                    const beforeHp = player.health;
                    applyDamage(player, dmg, drone.ownerId, true);
                    if (player.health < beforeHp) {
                        io.to(player.id).emit('applyKnockback', { vx: drone.vx > 0 ? 5 : -5, vy: drone.type === 'C' ? -5 : 15, stunFrames: 15 });
                    }
                    drone.hp = 0;
                    break;
                }
            }
        }
        
        // Process Drone Cooldowns
        for (const player of Object.values(players)) {
            if (player.characterId === 'neddy') {
                if (!currentDrones.A.has(player.id) && player.hadDronesA) {
                    player.droneACooldown = Date.now() + 5000;
                }
                player.hadDronesA = currentDrones.A.has(player.id);
                
                if (!currentDrones.B.has(player.id) && player.hadDronesB) {
                    player.droneBCooldown = Date.now() + 5000;
                }
                player.hadDronesB = currentDrones.B.has(player.id);
                
                if (!currentDrones.C.has(player.id) && player.hadDronesC) {
                    player.droneCCooldown = Date.now() + 10000;
                }
                player.hadDronesC = currentDrones.C.has(player.id);
            }
        }

        const lobbyProjectiles: Record<string, Projectile> = {};
        const lobbyWalls: Record<string, Wall> = {};
        const lobbyZones: Record<string, Zone> = {};
        const lobbyDrones: Record<string, Drone> = {};

        for (const [id, proj] of Object.entries(projectiles)) {
            if (proj.lobbyId === lobbyId || playerLobbyMap[proj.ownerId] === lobbyId) lobbyProjectiles[id] = proj;
        }
        for (const [id, wall] of Object.entries(walls)) {
            if (wall.lobbyId === lobbyId || (wall.ownerId && playerLobbyMap[wall.ownerId] === lobbyId)) lobbyWalls[id] = wall;
        }
        for (const [id, zone] of Object.entries(zones)) {
            if (zone.lobbyId === lobbyId || playerLobbyMap[zone.ownerId] === lobbyId) lobbyZones[id] = zone;
        }
        for (const [id, drone] of Object.entries(drones)) {
            if (drone.lobbyId === lobbyId || playerLobbyMap[drone.ownerId] === lobbyId) lobbyDrones[id] = drone;
        }

        io.to(lobbyId).emit('entitiesUpdate', { 
            projectiles: lobbyProjectiles, 
            walls: lobbyWalls, 
            zones: lobbyZones,
            drones: lobbyDrones
        });
    }
}, 1000 / 30);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Send available lobbies list
  socket.emit('availableLobbies', Object.values(lobbies).map(lobby => ({
    id: lobby.id,
    name: lobby.name,
    isPrivate: lobby.isPrivate,
    gameMode: lobby.gameMode,
    playerCount: Object.keys(lobby.players).length,
    gameState: lobby.gameState
  })));

  socket.on('createLobby', (data: { name: string, isPrivate: boolean, gameMode: GameMode }) => {
    const lobbyId = `lobby_${lobbyIdCounter++}`;
    const code = data.isPrivate ? generateLobbyCode() : '';
    
    const newLobby: Lobby = {
      id: lobbyId,
      name: data.name,
      code: code,
      isPrivate: data.isPrivate,
      adminId: socket.id,
      players: {},
      gameMode: data.gameMode,
      gameState: 'LOBBY',
      matchSettings: getDefaultSettings(data.gameMode),
      createdAt: Date.now()
    };
    
    newLobby.players[socket.id] = {
      id: socket.id,
      characterId: null,
      isReady: false,
      lastActive: Date.now(),
      isSpectator: false,
      currentRosterIndex: 0
    };
    
    lobbies[lobbyId] = newLobby;
    playerLobbyMap[socket.id] = lobbyId;
    
    socket.join(lobbyId);
    socket.emit('lobbyCreated', { lobby: newLobby });
    socket.emit('lobbyJoined', { lobby: newLobby, playerId: socket.id });
    io.emit('availableLobbies', Object.values(lobbies).map(lobby => ({
      id: lobby.id,
      name: lobby.name,
      isPrivate: lobby.isPrivate,
      gameMode: lobby.gameMode,
      playerCount: Object.keys(lobby.players).length,
      gameState: lobby.gameState
    })));
  });

  socket.on('joinLobby', (data: { lobbyId?: string, code?: string }) => {
    let targetLobby: Lobby | null = null;
    
    if (data.lobbyId) {
      targetLobby = lobbies[data.lobbyId];
    } else if (data.code) {
      targetLobby = Object.values(lobbies).find(lobby => lobby.code === data.code) || null;
    }
    
    if (!targetLobby) {
      socket.emit('lobbyJoinError', { message: 'Lobby not found' });
      return;
    }
    
    if (targetLobby.gameState === 'PLAYING') {
      targetLobby.players[socket.id] = {
        id: socket.id,
        characterId: null,
        isReady: false,
        lastActive: Date.now(),
        isSpectator: true,
        currentRosterIndex: 0
      };
    } else {
      targetLobby.players[socket.id] = {
        id: socket.id,
        characterId: null,
        isReady: false,
        lastActive: Date.now(),
        isSpectator: false,
        currentRosterIndex: 0
      };
    }
    
    playerLobbyMap[socket.id] = targetLobby.id;
    socket.join(targetLobby.id);
    socket.emit('lobbyJoined', { lobby: targetLobby, playerId: socket.id });
    io.to(targetLobby.id).emit('lobbyUpdate', targetLobby);
  });

  socket.on('leaveLobby', () => {
    const lobby = getLobbyByPlayerId(socket.id);
    if (lobby) {
      delete lobby.players[socket.id];
      delete playerLobbyMap[socket.id];
      socket.leave(lobby.id);
      
      if (lobby.adminId === socket.id) {
        const remainingPlayers = Object.keys(lobby.players);
        if (remainingPlayers.length > 0) {
          lobby.adminId = remainingPlayers[0];
          io.to(lobby.id).emit('adminChanged', { newAdminId: lobby.adminId });
        } else {
          delete lobbies[lobby.id];
          io.emit('lobbyClosed', { lobbyId: lobby.id });
          io.emit('availableLobbies', Object.values(lobbies).map(lobby => ({
            id: lobby.id,
            name: lobby.name,
            isPrivate: lobby.isPrivate,
            gameMode: lobby.gameMode,
            playerCount: Object.keys(lobby.players).length,
            gameState: lobby.gameState
          })));
          return;
        }
      }
      
      io.to(lobby.id).emit('lobbyUpdate', lobby);
      io.emit('availableLobbies', Object.values(lobbies).map(lobby => ({
        id: lobby.id,
        name: lobby.name,
        isPrivate: lobby.isPrivate,
        gameMode: lobby.gameMode,
        playerCount: Object.keys(lobby.players).length,
        gameState: lobby.gameState
      })));
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const lobby = getLobbyByPlayerId(socket.id);
    if (lobby) {
      delete lobby.players[socket.id];
      delete playerLobbyMap[socket.id];
      
      const remainingCount = Object.keys(lobby.players).length;
      if (remainingCount === 0) {
        delete lobbies[lobby.id];
        io.emit('lobbyClosed', { lobbyId: lobby.id });
        broadcastAvailableLobbies();
      } else {
        if (lobby.adminId === socket.id) {
          lobby.adminId = Object.keys(lobby.players)[0];
          io.to(lobby.id).emit('adminChanged', { newAdminId: lobby.adminId });
        }
        io.to(lobby.id).emit('lobbyUpdate', lobby);
        io.to(lobby.id).emit('playerDisconnected', socket.id);
        broadcastAvailableLobbies();
      }
    }

    if (players[socket.id]) {
      delete players[socket.id];
    }
  });

  socket.on('selectCharacter', (charId) => {
    const lobby = getLobbyByPlayerId(socket.id);
    if (!lobby) return;
    
    const player = lobby.players[socket.id];
    if (!player || player.isSpectator) return;
    
    player.lastActive = Date.now();
    
    const taken = Object.values(lobby.players).some(p => p.characterId === charId && p.id !== socket.id);
    
    if (lobby.gameMode === 'ffa' && lobby.matchSettings.bossBanEnabled && charId === 'wax') {
      socket.emit('characterSelectError', { message: 'Wax is banned in FFA mode' });
      return;
    }
    
    if (!taken || charId === null) {
      player.characterId = charId;
      player.isReady = false;
      io.to(lobby.id).emit('lobbyUpdate', lobby);
    }
  });

  socket.on('setRosterChoice', (roster: string[]) => {
    const lobby = getLobbyByPlayerId(socket.id);
    if (!lobby) return;
    
    const player = lobby.players[socket.id];
    if (!player || player.isSpectator) return;
    
    player.lastActive = Date.now();
    
    // Validate all characters exist
    const validCharacters = roster.every(charId => ROSTER.some(c => c.id === charId));
    if (!validCharacters) {
      socket.emit('rosterError', { message: 'Invalid character in roster' });
      return;
    }
    
    player.rosterChoice = roster;
    if (roster.length > 0) {
      player.characterId = roster[0]; // Set first character as initial
    }
    player.isReady = false; // Reset ready state when roster changes
    io.to(lobby.id).emit('lobbyUpdate', lobby);
  });

  socket.on('setGameMode', (gameMode: GameMode) => {
    const lobby = getLobbyByPlayerId(socket.id);
    if (!lobby || lobby.adminId !== socket.id) return;
    
    if (lobby.gameState !== 'LOBBY') return;
    
    lobby.gameMode = gameMode;
    lobby.matchSettings = getDefaultSettings(gameMode);
    
    if (gameMode === 'ffa' || lobby.matchSettings.bossBanEnabled) {
      Object.values(lobby.players).forEach(player => {
        if (player.characterId === 'wax') {
          player.characterId = null;
          player.isReady = false;
        }
      });
    }
    
    io.to(lobby.id).emit('lobbyUpdate', lobby);
  });

  socket.on('updateSettings', (settings: Partial<MatchSettings>) => {
    const lobby = getLobbyByPlayerId(socket.id);
    if (!lobby || lobby.adminId !== socket.id) return;
    
    if (lobby.gameState !== 'LOBBY') return;
    
    lobby.matchSettings = { ...lobby.matchSettings, ...settings };
    io.to(lobby.id).emit('lobbyUpdate', lobby);
  });

  socket.on('kickPlayer', (playerId: string) => {
    const lobby = getLobbyByPlayerId(socket.id);
    if (!lobby || lobby.adminId !== socket.id) return;
    
    if (playerId === socket.id) return;
    
    const targetPlayer = lobby.players[playerId];
    if (targetPlayer) {
      delete lobby.players[playerId];
      delete playerLobbyMap[playerId];
      
      io.to(playerId).emit('kickedFromLobby');
      io.to(lobby.id).emit('lobbyUpdate', lobby);
      io.emit('availableLobbies', Object.values(lobbies).map(lobby => ({
        id: lobby.id,
        name: lobby.name,
        isPrivate: lobby.isPrivate,
        gameMode: lobby.gameMode,
        playerCount: Object.keys(lobby.players).length,
        gameState: lobby.gameState
      })));
    }
  });

  socket.on('startMatch', () => {
    const lobby = getLobbyByPlayerId(socket.id);
    if (!lobby || lobby.adminId !== socket.id) return;
    
    if (lobby.gameState !== 'LOBBY') return;
    
    // Check ready players based on game mode
    let readyPlayers;
    if (lobby.gameMode === 'randomized') {
      // Randomized: just need to be ready, no character selection
      readyPlayers = Object.values(lobby.players).filter(p => !p.isSpectator && p.isReady);
    } else if (lobby.gameMode === 'roster_choice') {
      // Roster Choice: need roster and be ready
      readyPlayers = Object.values(lobby.players).filter(p => !p.isSpectator && p.rosterChoice && p.rosterChoice.length === 5 && p.isReady);
    } else {
      // FFA and Chaos: need character and be ready
      readyPlayers = Object.values(lobby.players).filter(p => !p.isSpectator && p.characterId && p.isReady);
    }
    
    if (readyPlayers.length < 2) {
      socket.emit('matchStartError', { message: 'Need at least 2 ready players' });
      return;
    }
    
    lobby.gameState = 'PLAYING';
    lobby.matchStartTime = Date.now();
    
    // Handle different game modes
    if (lobby.gameMode === 'randomized') {
      // Randomized: Assign random characters at match start
      readyPlayers.forEach((player, idx) => {
        const randomChar = ROSTER[Math.floor(Math.random() * ROSTER.length)];
        const char = ROSTER.find(c => c.id === randomChar.id);
        const maxHp = char ? char.hp : 100;
        
        players[player.id] = {
          id: player.id,
          characterId: randomChar.id,
          x: 412 + (idx * 60) - (readyPlayers.length * 30),
          y: randomChar.id === 'wax' ? 350 : 50,
          width: charWidth(randomChar.id),
          height: charHeight(randomChar.id),
          color: char ? char.color : '#fff',
          health: maxHp,
          maxHealth: maxHp,
          facing: 'right',
          velocity: { x: 0, y: 0 },
          isAttacking: false,
          isGrounded: false,
          isGrabbingLedge: false,
          isStunned: false,
          isFastFalling: false,
          score: 0,
          speedMult: char ? char.speedMult : 1.0
        };
      });
    } else if (lobby.gameMode === 'roster_choice') {
      // Roster Choice - use first character from roster
      readyPlayers.forEach((player, idx) => {
        const roster = player.rosterChoice || [];
        if (roster.length === 0) {
          const char = ROSTER.find(c => c.id === player.characterId);
          const maxHp = char ? char.hp : 100;
          players[player.id] = {
            id: player.id, characterId: player.characterId,
            x: 412 + (idx * 60) - (readyPlayers.length * 30),
            y: player.characterId === 'wax' ? 350 : 50,
            width: charWidth(player.characterId), height: charHeight(player.characterId),
            color: char ? char.color : '#fff',
            health: maxHp, maxHealth: maxHp,
            facing: 'right', velocity: { x: 0, y: 0 },
            isAttacking: false, isGrounded: false, isGrabbingLedge: false,
            isStunned: false, isFastFalling: false,
            score: 0, speedMult: char ? char.speedMult : 1.0, currentRosterIndex: 0
          };
          player.currentRosterIndex = 0;
        } else {
          const firstCharId = roster[0];
          const char = ROSTER.find(c => c.id === firstCharId);
          const maxHp = char ? char.hp : 100;
          players[player.id] = {
            id: player.id, characterId: firstCharId,
            x: 412 + (idx * 60) - (readyPlayers.length * 30),
            y: firstCharId === 'wax' ? 350 : 50,
            width: charWidth(firstCharId), height: charHeight(firstCharId),
            color: char ? char.color : '#fff',
            health: maxHp, maxHealth: maxHp,
            facing: 'right', velocity: { x: 0, y: 0 },
            isAttacking: false, isGrounded: false, isGrabbingLedge: false,
            isStunned: false, isFastFalling: false,
            score: 0, speedMult: char ? char.speedMult : 1.0, currentRosterIndex: 0
          };
          player.currentRosterIndex = 0;
        }
      });
    } else if (lobby.gameMode === 'chaos_rounds') {
      readyPlayers.forEach((player, idx) => {
        const char = ROSTER.find(c => c.id === player.characterId);
        const maxHp = char ? char.hp : 100;
        players[player.id] = {
          id: player.id, characterId: player.characterId,
          x: 412 + (idx * 60) - (readyPlayers.length * 30),
          y: player.characterId === 'wax' ? 350 : 50,
          width: charWidth(player.characterId), height: charHeight(player.characterId),
          color: char ? char.color : '#fff',
          health: maxHp, maxHealth: maxHp,
          facing: 'right', velocity: { x: 0, y: 0 },
          isAttacking: false, isGrounded: false, isGrabbingLedge: false,
          isStunned: false, isFastFalling: false,
          score: 0, speedMult: char ? char.speedMult : 1.0, chaosMode: true
        };
      });
    } else {
      // FFA - normal mode
      readyPlayers.forEach((player, idx) => {
        const char = ROSTER.find(c => c.id === player.characterId);
        const maxHp = char ? char.hp : 100;
        players[player.id] = {
          id: player.id, characterId: player.characterId,
          x: 412 + (idx * 60) - (readyPlayers.length * 30),
          y: player.characterId === 'wax' ? 350 : 50,
          width: charWidth(player.characterId), height: charHeight(player.characterId),
          color: char ? char.color : '#fff',
          health: maxHp, maxHealth: maxHp,
          facing: 'right', velocity: { x: 0, y: 0 },
          isAttacking: false, isGrounded: false, isGrabbingLedge: false,
          isStunned: false, isFastFalling: false,
          score: 0, speedMult: char ? char.speedMult : 1.0
        };
      });
    }
    
    const lobbyPlayersMap: Record<string, Player> = {};
    for (const pId of Object.keys(lobby.players)) {
      if (players[pId]) lobbyPlayersMap[pId] = players[pId];
    }
    io.to(lobby.id).emit('gameStart', { players: lobbyPlayersMap, lobby });
    io.to(lobby.id).emit('lobbyUpdate', lobby);
    broadcastAvailableLobbies();
  });

  socket.on('toggleReady', () => {
    const lobby = getLobbyByPlayerId(socket.id);
    if (!lobby) return;
    
    const player = lobby.players[socket.id];
    if (!player || player.isSpectator) return;
    
    player.lastActive = Date.now();
    
    // Check if player can be ready based on game mode
    let canBeReady = false;
    if (lobby.gameMode === 'randomized') {
      // Randomized: no character selection needed
      canBeReady = true;
    } else if (lobby.gameMode === 'roster_choice') {
      // Roster Choice: need full roster
      canBeReady = player.rosterChoice && player.rosterChoice.length === 5;
    } else {
      // FFA and Chaos: need character selection
      canBeReady = !!player.characterId;
    }
    
    if (canBeReady) {
      player.isReady = !player.isReady;
      io.to(lobby.id).emit('lobbyUpdate', lobby);
    }
  });

  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      if (players[socket.id].grabbedByPlayerId) return;

      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      players[socket.id].velocity = movementData.velocity;
      players[socket.id].facing = movementData.facing;
      players[socket.id].isGrounded = movementData.isGrounded;
      players[socket.id].isGrabbingLedge = movementData.isGrabbingLedge;
      players[socket.id].isStunned = movementData.isStunned;
      players[socket.id].isFastFalling = movementData.isFastFalling;

      const lobby = getLobbyByPlayerId(socket.id);

      // Sync Mirage movement state for sprite
      if (players[socket.id].characterId === 'mirage' && lobby) {
          const isMoving = Math.abs(movementData.velocity.x) > 0.5;
          const wasMoving = players[socket.id].mirageMoving;
          if (isMoving !== wasMoving) {
              players[socket.id].mirageMoving = isMoving;
              const st = players[socket.id].mirageState;
              const inAttack = st === 'attack1' || st === 'attack2' || st === 'attack3' || st === 'attack3reverse';
              if (!inAttack) {
                  const newState = isMoving ? 'movestart' : 'movestop';
                  players[socket.id].mirageState = newState;
                  io.to(lobby.id).emit('playerEffect', { id: socket.id, effect: 'mirageState', state: newState });
              }
          }
      }
      
      if (players[socket.id].grabbedPlayerId && lobby) {
          const grabbedId = players[socket.id].grabbedPlayerId;
          if (grabbedId && players[grabbedId]) {
              players[grabbedId].x = players[socket.id].x + (players[socket.id].facing === 'right' ? players[socket.id].width : -players[grabbedId].width);
              players[grabbedId].y = players[socket.id].y;
              io.to(lobby.id).emit('forcePosition', { id: grabbedId, x: players[grabbedId].x, y: players[grabbedId].y });
          }
      }
      
      // Void death check
      if (players[socket.id].y > 800) {
        handlePlayerDeath(players[socket.id], undefined, 'void');
      } else if (lobby) {
        socket.to(lobby.id).emit('playerMoved', players[socket.id]);
      }
    }
  });

  socket.on('playerAttack', (attackData) => {
    if (players[socket.id]) {
      players[socket.id].isAttacking = attackData.isAttacking;
      const lobby = getLobbyByPlayerId(socket.id);
      if (lobby) {
        socket.to(lobby.id).emit('playerAttacked', players[socket.id]);
      }
    }
  });
  
  socket.on('playerHit', (data) => {
      const target = players[data.targetId];
      if (target) {
          applyDamage(target, data.damage, socket.id);
      }
  });

  socket.on('droneHit', (data) => {
      if (drones[data.id]) {
          drones[data.id].hp -= data.damage;
      }
  });

  socket.on('useAbility', (data) => {
      const player = players[socket.id];
      const lobby = getLobbyByPlayerId(socket.id);
      if (!player || !lobby || lobby.gameState !== 'PLAYING') return;

      if (player.characterId === 'mirage') {
          const mirageAttacking = player.mirageState === 'attack1' || player.mirageState === 'attack2' || player.mirageState === 'attack3' || player.mirageState === 'attack3reverse';
          if (data.ability === 1) {
              if (mirageAttacking) return;
              player.mirageState = 'attack1';
              io.emit('playerEffect', { id: player.id, effect: 'mirageState', state: 'attack1' });
              // Projectile fires after 195ms (390ms / 2, gif plays 2x speed)
              const castFacing = player.facing;
              const castX = player.x; const castY = player.y;
              setTimeout(() => {
                  if (!players[player.id]) return;
                  const pid = 'proj_' + entityIdCounter++;
                  projectiles[pid] = {
                      id: pid, type: 'card',
                      x: castX + (castFacing === 'right' ? players[player.id].width : -20),
                      y: castY + players[player.id].height / 2,
                      vx: castFacing === 'right' ? 15 : -15, vy: 0,
                      ownerId: player.id, damage: 10, life: 60
                  };
              }, 195);
              // Animation total at 2x = 320ms
              setTimeout(() => {
                  if (!players[player.id]) return;
                  players[player.id].mirageState = 'idle';
                  io.emit('playerEffect', { id: player.id, effect: 'mirageState', state: 'idle' });
              }, 320);
          } else if (data.ability === 2) {
              if (mirageAttacking) return;
              player.mirageState = 'attack2';
              io.emit('playerEffect', { id: player.id, effect: 'mirageState', state: 'attack2' });
              // Projectile fires after 390ms
              const castFacing2 = player.facing;
              const castX2 = player.x; const castY2 = player.y;
              setTimeout(() => {
                  if (!players[player.id]) return;
                  const wid = 'wall_' + entityIdCounter++;
                  walls[wid] = {
                      id: wid,
                      x: castX2 + (castFacing2 === 'right' ? 80 : -80),
                      y: castY2 - 50,
                      width: 20, height: 100,
                      expires: Date.now() + 5000
                  };
              }, 390);
              // Animation total = 640ms
              setTimeout(() => {
                  if (!players[player.id]) return;
                  players[player.id].mirageState = 'idle';
                  io.emit('playerEffect', { id: player.id, effect: 'mirageState', state: 'idle' });
              }, 640);
          } else if (data.ability === 3) {
              if (mirageAttacking) return;
              player.mirageState = 'attack3';
              io.emit('playerEffect', { id: player.id, effect: 'mirageState', state: 'attack3' });
              // Freeze player during attack
              io.to(player.id).emit('applyKnockback', { vx: 0, vy: 0, stunFrames: 9999 });
              // I-frames after 90ms
              setTimeout(() => {
                  if (!players[player.id]) return;
                  players[player.id].isInvincible = true;
              }, 90);
              // After 420ms (gif done), teleport to best position
              setTimeout(() => {
                  if (!players[player.id]) return;
                  let bestX = player.x; let maxDist = -1;
                  for (let x = 220; x <= 750; x += 50) {
                      let minD = 9999;
                      for (const other of Object.values(players)) {
                          if (other.id === player.id) continue;
                          const d = Math.abs(x - other.x);
                          if (d < minD) minD = d;
                      }
                      if (minD > maxDist) { maxDist = minD; bestX = x; }
                  }
                  const bestY = 350;
                  players[player.id].mirageAttack3TeleportX = bestX;
                  players[player.id].mirageAttack3TeleportY = bestY;
                  players[player.id].x = bestX;
                  players[player.id].y = bestY;
                  io.emit('forcePosition', { id: player.id, x: bestX, y: bestY });
                  players[player.id].mirageState = 'attack3reverse';
                  io.emit('playerEffect', { id: player.id, effect: 'mirageState', state: 'attack3reverse' });
              }, 420);
              // After 420+420ms (reverse gif done), restore controls
              setTimeout(() => {
                  if (!players[player.id]) return;
                  players[player.id].isInvincible = false;
                  players[player.id].mirageState = 'idle';
                  io.to(player.id).emit('clearStun');
                  io.emit('playerEffect', { id: player.id, effect: 'mirageState', state: 'idle' });
              }, 840);
          }
      } else if (player.characterId === 'orbo') {
          if (data.ability === 1) {
              let target = null;
              let minDist = 300;
              const myLobbyId = playerLobbyMap[player.id];
              for (const other of Object.values(players)) {
                  if (other.id === player.id) continue;
                  if (myLobbyId && playerLobbyMap[other.id] !== myLobbyId) continue;
                  const distX = other.x - player.x;
                  const distY = other.y - player.y;
                  const dist = Math.hypot(distX, distY);
                  
                  const isFacingRight = player.facing === 'right' && distX > 0;
                  const isFacingLeft = player.facing === 'left' && distX < 0;
                  
                  if (dist < minDist && Math.abs(distY) < 100 && (isFacingRight || isFacingLeft)) {
                      minDist = dist;
                      target = other;
                  }
              }
              if (target) {
                  player.x = target.x + (player.facing === 'right' ? -player.width - 5 : target.width + 5);
                  player.y = target.y + target.height - player.height;
                  player.velocity = { x: 0, y: 0 };
                  player.deflectTimer = Date.now() + 2000;
                  const lobby = getLobbyByPlayerId(player.id);
                  if (lobby) {
                      io.to(lobby.id).emit('forcePosition', { id: player.id, x: player.x, y: player.y });
                      io.to(lobby.id).emit('playerEffect', { id: player.id, effect: 'deflectStart' });
                  }
              }
          } else if (data.ability === 2) {
              const id = 'zone_' + entityIdCounter++;
              zones[id] = {
                  id,
                  x: player.x + player.width / 2,
                  y: player.y + player.height / 2,
                  radius: 300,
                  timer: Date.now() + 5000,
                  ownerId: player.id
              };
          } else if (data.ability === 3) {
              player.safetyWarpState = 'charging';
              player.safetyWarpTimer = Date.now() + 1000;
              io.emit('playerEffect', { id: player.id, effect: 'warpChargeStart' });
          }
      } else if (player.characterId === 'rica') {
          if (data.ability === 1) {
              if (player.throwCooldown && player.throwCooldown > Date.now()) return;
              if (player.grabbedPlayerId) {
                  const target = players[player.grabbedPlayerId];
                  if (target) {
                      const dmg = target.maxHealth * 0.25;
                      const beforeHp = target.health;
                      applyDamage(target, dmg, player.id);
                      player.grabbedPlayerId = null;
                      target.grabbedByPlayerId = null;
                      player.grabTimer = 0;
                      player.throwCooldown = Date.now() + 5000;
                      io.emit('playerEffect', { id: player.id, effect: 'ricaSlam' });
                      if (target.health < beforeHp) {
                          io.to(target.id).emit('applyKnockback', { vx: 0, vy: 20, stunFrames: 30 });
                      }
                  }
                  return;
              }

              let target = null;
              let minDist = 60;
              for (const other of Object.values(players)) {
                  if (other.id === player.id) continue;
                  const distX = other.x - player.x;
                  const distY = other.y - player.y;
                  const dist = Math.hypot(distX, distY);
                  const isFacingRight = player.facing === 'right' && distX > 0 && distX < 60;
                  const isFacingLeft = player.facing === 'left' && distX < 0 && distX > -60;
                  if (Math.abs(distY) < 50 && (isFacingRight || isFacingLeft)) {
                      target = other;
                      break;
                  }
              }
              if (target) {
                  player.grabbedPlayerId = target.id;
                  target.grabbedByPlayerId = player.id;
                  player.grabTimer = Date.now() + 5000;
                  io.emit('playerEffect', { id: player.id, effect: 'ricaGrab' });
              }
          } else if (data.ability === 2) {
              if (player.isGrounded) {
                  player.chargeState = 'charging';
                  player.chargeTimer = Date.now() + 1000;
                  io.emit('playerEffect', { id: player.id, effect: 'ricaChargeStart' });
              }
          } else if (data.ability === 3) {
              for(let i = 0; i < 2; i++) {
                  const id = 'drone_' + entityIdCounter++;
                  drones[id] = {
                      id, x: player.x, y: player.y - 40 - (i * 30),
                      vx: 0, vy: 0,
                      ownerId: player.id,
                      hp: 1
                  };
              }
          }
      } else if (player.characterId === 'chester') {
          if (data.ability === 1) {
              player.isInvincible = true;
              io.emit('playerEffect', { id: player.id, effect: 'toothDash' });
              // I-frames will be removed by client timing or by server timing. Let's let client send movement, but we can clear invincibility.
              setTimeout(() => {
                  if (players[player.id]) players[player.id].isInvincible = false;
              }, 500);
          } else if (data.ability === 2) {
              player.mimicTimer = Date.now() + 5000;
              io.emit('playerEffect', { id: player.id, effect: 'mimicStart' });
          } else if (data.ability === 3) {
              player.healTimer = Date.now() + 5000;
              player.healLastHit = Date.now();
              io.emit('playerEffect', { id: player.id, effect: 'healStart' });
          }
      } else if (player.characterId === 'coco') {
          if (data.ability === 1) {
              // 4 chocolate pieces — 2 left, 2 right — boomerang back to origin with spinning
              const cx = player.x + player.width / 2;
              const cy = player.y + player.height / 2;
              const speeds = [8, 14];
              [-1, 1].forEach(dir => {
                  speeds.forEach(spd => {
                      const pid = 'proj_' + entityIdCounter++;
                      projectiles[pid] = {
                          id: pid, type: 'chocolate',
                          x: cx, y: cy, startX: cx, startY: cy,
                          vx: dir * spd, vy: 0,
                          ownerId: player.id, damage: 15, life: 90,
                          angle: 0, rotationSpeed: dir * 0.3
                      };
                  });
              });
              player.cocoState = 'attack13';
              io.emit('playerEffect', { id: player.id, effect: 'cocoState', state: 'attack13' });
              setTimeout(() => { if (players[player.id]) { players[player.id].cocoState = 'idle'; io.emit('playerEffect', { id: player.id, effect: 'cocoState', state: 'idle' }); } }, 3000);
          } else if (data.ability === 2) {
              // Cocoa Fountain — wall that rises from bottom, spans vertical height
              const wid = 'wall_' + entityIdCounter++;
              const fx = player.x + player.width / 2 - 15;
              // Start from player's y position and rise upward to top of screen
              const startY = player.y + player.height;
              walls[wid] = { 
                  id: wid, 
                  x: fx, 
                  y: startY, 
                  targetY: 0, // Target is top of screen
                  width: 30, 
                  height: 600, 
                  expires: Date.now() + 4000, 
                  type: 'cocoFountain', 
                  ownerId: player.id,
                  rising: true,
                  riseSpeed: 15
              };
              player.cocoFountainId = wid;
              player.cocoState = 'attack2';
              io.emit('playerEffect', { id: player.id, effect: 'cocoState', state: 'attack2' });
              setTimeout(() => { if (players[player.id]) { players[player.id].cocoState = 'idle'; io.emit('playerEffect', { id: player.id, effect: 'cocoState', state: 'idle' }); } }, 800);
          } else if (data.ability === 3) {
              // Lose 20 hp or go to 1 hp, whichever is less damage
              const hpLost = Math.min(20, player.health - 1);
              if (hpLost > 0) player.health -= hpLost;
              io.emit('playerHealthChanged', { id: player.id, health: player.health });
              // Apply rage cloud — 8x speed for Coco only, 20s
              player.cocoRageActive = true;
              player.cocoRageEnd = Date.now() + 20000;
              player.speedMult = 0.8 * 8;
              io.emit('playerEffect', { id: player.id, effect: 'cocoRage', duration: 20000 });
              // Set active effect on player for client rendering
              player.activeEffects = player.activeEffects || {};
              player.activeEffects['cocoRage'] = Date.now() + 20000;
              // Affect nearby players - apply rage cloud effect to everyone in range
              Object.values(players).forEach(p => {
                  const dist = Math.hypot(p.x - player.x, p.y - player.y);
                  if (dist < 200) {
                      p.activeEffects = p.activeEffects || {};
                      p.activeEffects['cocoRageHit'] = Date.now() + 20000;
                      io.emit('playerEffect', { id: p.id, effect: 'cocoRageHit', duration: 20000, isPipNexus: p.characterId === 'pip' || p.characterId === 'nexus' });
                      setTimeout(() => { if (players[p.id]) { delete players[p.id].activeEffects?.['cocoRageHit']; } }, 20000);
                  }
              });
              player.cocoState = 'attack13';
              io.emit('playerEffect', { id: player.id, effect: 'cocoState', state: 'attack13' });
              setTimeout(() => { if (players[player.id]) { players[player.id].cocoState = 'idle'; io.emit('playerEffect', { id: player.id, effect: 'cocoState', state: 'idle' }); } }, 220);
              setTimeout(() => { if (players[player.id]) { players[player.id].cocoRageActive = false; const char = ROSTER.find(c => c.id === 'coco'); players[player.id].speedMult = char ? char.speedMult : 0.8; } }, 20000);
          }
      } else if (player.characterId === 'pinedo') {
          if (data.ability === 1) {
              // Can't use while already in attack1, attack2, or waiting
              if (player.pinedoState === 'attack1' || player.pinedoState === 'attack2' || player.pinedoState === 'waiting') return;
              const now2 = Date.now();
              // Total animation: 670ms windup + 220ms damage + 90ms recovery = 980ms
              player.pinedoState = 'attack1';
              player.pinedoAttack1End = now2 + 980;
              player.pinedoAttack1DmgStart = now2 + 670;
              player.pinedoAttack1DmgEnd = now2 + 890;
              player.pinedoAttack1Hit = false;
              // Freeze player for duration
              io.to(player.id).emit('applyKnockback', { vx: 0, vy: 0, stunFrames: Math.ceil(980 / 33) });
              io.emit('playerEffect', { id: player.id, effect: 'pinedoAttack1Start' });
              // Clear freeze after 980ms
              setTimeout(() => {
                  if (!players[player.id]) return;
                  players[player.id].pinedoState = 'idle';
                  io.to(player.id).emit('clearStun');
                  io.emit('playerEffect', { id: player.id, effect: 'pinedoStateChange', state: 'idle' });
              }, 980);
          } else if (data.ability === 2) {
              if (player.boomerangActive) return;
              if (player.pinedoState === 'attack1' || player.pinedoState === 'attack2' || player.pinedoState === 'waiting') return;
              player.boomerangActive = true;
              player.isSuperArmor = true;
              player.pinedoState = 'attack2';
              // Freeze during throw animation (730ms = attack2 gif duration), then go to waiting
              io.to(player.id).emit('applyKnockback', { vx: 0, vy: 0, stunFrames: 9999 });
              io.emit('playerEffect', { id: player.id, effect: 'pinedoAttack2Start' });
              const castFacing = player.facing;
              const castX = player.x;
              const castY = player.y;
              setTimeout(() => {
                  if (!players[player.id]) return;
                  players[player.id].pinedoState = 'waiting';
                  io.emit('playerEffect', { id: player.id, effect: 'pinedoStateChange', state: 'waiting' });
                  // Fire projectile only after the throw animation finishes
                  const pid = 'proj_' + entityIdCounter++;
                  projectiles[pid] = {
                      id: pid, type: 'boomerang',
                      x: castX + (castFacing === 'right' ? players[player.id].width : -20),
                      y: castY + players[player.id].height / 2,
                      vx: castFacing === 'right' ? 15 : -15,
                      vy: 0,
                      ownerId: player.id,
                      damage: 30,
                      life: 60
                  };
              }, 730);
          } else if (data.ability === 3) {
              if (player.pinedoState === 'attack1' || player.pinedoState === 'attack2' || player.pinedoState === 'waiting') return;
              const now2 = Date.now();
              player.pinedoState = 'attack3start';
              player.pinedoAttack3Center = { x: player.x + player.width / 2, y: player.y + player.height / 2 };
              // Windup gif plays for ~800ms, then main damaging frames for ~600ms
              io.emit('playerEffect', { id: player.id, effect: 'pinedoAttack3Start' });
              setTimeout(() => {
                  if (!players[player.id]) return;
                  players[player.id].pinedoState = 'attack3main';
                  players[player.id].pinedoAttack3End = Date.now() + 600;
                  players[player.id].pinedoAttack3Center = { x: players[player.id].x + players[player.id].width / 2, y: players[player.id].y + players[player.id].height / 2 };
                  io.emit('playerEffect', { id: player.id, effect: 'pinedoAttack3Main' });
              }, 800);
              setTimeout(() => {
                  if (!players[player.id]) return;
                  players[player.id].pinedoState = 'idle';
                  players[player.id].pinedoAttack3End = 0;
                  io.emit('playerEffect', { id: player.id, effect: 'pinedoStateChange', state: 'idle' });
              }, 1400);
          }
      } else if (player.characterId === 'zobo') {
          if (data.ability === 1) {
              // Can't use while arm is already out or in another attack state
              if (player.zoboArm1Active || player.zoboState === 'attack2' || player.zoboState === 'attack3') {
                  socket.emit('abilityCooldown', { ability: 1, frames: 15 }); return;
              }
              const now2 = Date.now();
              player.zoboArm1Active = true;
              player.zoboState = 'attack1start';
              const handX = player.facing === 'right' ? player.x + 42 : player.x - 36;
              const handY = player.y + 10;
              player.zoboArm1SpawnX = handX;
              player.zoboArm1SpawnY = handY;
              // Stun Zobo during attack (cleared when projectile returns or via safety timeout)
              io.to(player.id).emit('applyKnockback', { vx: 0, vy: 0, stunFrames: 9999 });
              const lobby2 = getLobbyByPlayerId(player.id);
              if (lobby2) io.to(lobby2.id).emit('playerEffect', { id: player.id, effect: 'zoboStateChange', state: 'attack1start' });
              // After windup animation (~250ms), fire the spider projectile
              setTimeout(() => {
                  if (!players[player.id] || !players[player.id].zoboArm1Active) return;
                  const pid = 'proj_' + entityIdCounter++;
                  const p = players[player.id];
                  const spX = p.facing === 'right' ? p.x + 42 : p.x - 36;
                  const spY = p.y + 10;
                  projectiles[pid] = {
                      id: pid, type: 'spider',
                      x: spX, y: spY,
                      startX: spX, startY: spY,
                      vx: p.facing === 'right' ? 20 : -20,
                      vy: 0,
                      ownerId: player.id,
                      damage: 20,
                      life: 30 // 15 frames out, 15 frames back
                  };
                  p.zoboArm1ProjId = pid;
                  p.zoboState = 'attack1mid';
                  const l2 = getLobbyByPlayerId(player.id);
                  if (l2) io.to(l2.id).emit('playerEffect', { id: player.id, effect: 'zoboStateChange', state: 'attack1mid' });
              }, 250);

              // Fail-safe timeout: un-stun Zobo after 1.5 seconds if projectile gets stuck or deleted
              setTimeout(() => {
                  if (players[player.id] && players[player.id].zoboArm1Active) {
                      players[player.id].zoboArm1Active = false;
                      players[player.id].zoboState = 'idle';
                      io.to(player.id).emit('clearStun');
                      const l2 = getLobbyByPlayerId(player.id);
                      if (l2) {
                          io.to(l2.id).emit('playerEffect', { id: player.id, effect: 'zoboStateChange', state: 'idle' });
                          io.to(l2.id).emit('zoboArmUpdate', { ownerId: player.id, x1: 0, y1: 0, x2: 0, y2: 0, active: false });
                      }
                  }
              }, 1500);
          } else if (data.ability === 2) {
              if (player.zoboArm1Active || player.zoboState === 'attack3') {
                  socket.emit('abilityCooldown', { ability: 2, frames: 15 }); return;
              }
              player.zoboState = 'attack2';
              const lobby2 = getLobbyByPlayerId(player.id);
              if (lobby2) io.to(lobby2.id).emit('playerEffect', { id: player.id, effect: 'zoboStateChange', state: 'attack2' });
              const castFacing = player.facing;
              const castX = player.x + player.width / 2;
              const castY = player.y;
              // Lob shot — fire after a short animation delay
              setTimeout(() => {
                  if (!players[player.id]) return;
                  const pid = 'proj_' + entityIdCounter++;
                  projectiles[pid] = {
                      id: pid, type: 'web',
                      x: castX, y: castY,
                      vx: castFacing === 'right' ? 8 : -8,
                      vy: -12,
                      ownerId: player.id,
                      damage: 5,
                      life: 120
                  };
                  players[player.id].zoboState = 'idle';
                  const l2 = getLobbyByPlayerId(player.id);
                  if (l2) io.to(l2.id).emit('playerEffect', { id: player.id, effect: 'zoboStateChange', state: 'idle' });
              }, 350);
          } else if (data.ability === 3) {
              if (player.zoboArm1Active || player.zoboState === 'attack3') {
                  socket.emit('abilityCooldown', { ability: 3, frames: 15 }); return;
              }
              player.zoboState = 'attack3';
              player.zoboRegatherEnd = Date.now() + 3000;
              player.zoboRegatherHit = false;
              // Stun self for 3 seconds
              io.to(player.id).emit('applyKnockback', { vx: 0, vy: 0, stunFrames: 90 });
              const lobby2 = getLobbyByPlayerId(player.id);
              if (lobby2) io.to(lobby2.id).emit('playerEffect', { id: player.id, effect: 'zoboStateChange', state: 'attack3' });
              setTimeout(() => {
                  if (!players[player.id]) return;
                  const wasHit = players[player.id].zoboRegatherHit;
                  players[player.id].zoboState = 'idle';
                  players[player.id].zoboRegatherEnd = 0;
                  io.to(player.id).emit('clearStun');
                  const l2 = getLobbyByPlayerId(player.id);
                  if (!wasHit) {
                      // Heal 30 HP, cap at 150
                      players[player.id].health = Math.min(150, players[player.id].health + 30);
                      recalcZoboSpeed(players[player.id]);
                      if (l2) {
                          io.to(l2.id).emit('playerHealthChanged', { id: player.id, health: players[player.id].health });
                          io.to(l2.id).emit('playerEffect', { id: player.id, effect: 'zoboRegatherSuccess' });
                      }
                  }
                  if (l2) io.to(l2.id).emit('playerEffect', { id: player.id, effect: 'zoboStateChange', state: 'idle' });
              }, 3000);
          }
      } else if (player.characterId === 'morka') {
          if (data.ability === 1) {
              const id = 'proj_' + entityIdCounter++;
              projectiles[id] = {
                  id, type: 'plate',
                  x: player.x + (player.facing === 'right' ? player.width : -20),
                  y: player.y + player.height / 2,
                  vx: player.facing === 'right' ? 18 : -18,
                  vy: 0,
                  ownerId: player.id,
                  damage: 5,
                  life: 60
              };
          } else if (data.ability === 2) {
              if (!player.isGrounded) return;
              const hitBox = {
                  x: player.facing === 'right' ? player.x + player.width : player.x - 300,
                  y: player.y,
                  width: 300, height: player.height
              };
              let grabbed = null;
              for (const other of Object.values(players)) {
                  if (other.id === player.id) continue;
                  if (other.x < hitBox.x + hitBox.width && other.x + other.width > hitBox.x &&
                      other.y < hitBox.y + hitBox.height && other.y + other.height > hitBox.y) {
                      grabbed = other; break;
                  }
              }
              if (grabbed) {
                  player.grabbedPlayerId = grabbed.id;
                  grabbed.grabbedByPlayerId = player.id;
                  player.grabTimer = Date.now() + 2000;
                  io.emit('playerEffect', { id: player.id, effect: 'morkaGrab' });
                  setTimeout(() => { if (players[grabbed.id]) applyDamage(grabbed, 10, player.id); }, 500);
                  setTimeout(() => { if (players[grabbed.id]) applyDamage(grabbed, 10, player.id); }, 1000);
                  setTimeout(() => { 
                      if (players[grabbed.id] && players[player.id]) {
                          applyDamage(grabbed, 10, player.id);
                          io.to(grabbed.id).emit('applyKnockback', { vx: 0, vy: -30, stunFrames: 60 });
                          player.grabbedPlayerId = null;
                          grabbed.grabbedByPlayerId = null;
                      }
                  }, 1500);
              }
          } else if (data.ability === 3) {
              player.isInvincible = true;
              setTimeout(() => { if (players[player.id]) players[player.id].isInvincible = false; }, 500);
              io.to(player.id).emit('applyKnockback', { vx: 0, vy: -35, stunFrames: 0 }); 
          }
      } else if (player.characterId === 'wisp') {
          if (data.ability === 1) {
              const id = 'proj_' + entityIdCounter++;
              projectiles[id] = {
                  id, type: 'fireball',
                  x: player.x + (player.facing === 'right' ? player.width : -20),
                  y: player.y + player.height / 2,
                  vx: player.facing === 'right' ? 8 : -8,
                  vy: 0,
                  ownerId: player.id,
                  damage: 15,
                  life: 150
              };
          } else if (data.ability === 2) {
              const id = 'wall_' + entityIdCounter++;
              walls[id] = { 
                  id, x: player.x + (player.facing === 'right' ? 60 : -60), y: player.y - 30, 
                  width: 20, height: 80, expires: Date.now() + 5000, type: 'fire', ownerId: player.id 
              };
          } else if (data.ability === 3) {
              if (!player.isGrounded) return;
              let farthest = null;
              let maxDist = -1;
              for (const other of Object.values(players)) {
                  if (other.id === player.id) continue;
                  const dist = Math.hypot(other.x - player.x, other.y - player.y);
                  if (dist > maxDist) { maxDist = dist; farthest = other; }
              }
              if (farthest) {
                  const tempX = player.x, tempY = player.y;
                  player.x = farthest.x; player.y = farthest.y;
                  farthest.x = tempX; farthest.y = tempY;
                  
                  // Ensure positions are valid (not below ground)
                  const groundLevel = 450;
                  if (player.y > groundLevel) player.y = groundLevel - player.height;
                  if (farthest.y > groundLevel) farthest.y = groundLevel - farthest.height;
                  
                  // Reset velocity to prevent falling through
                  player.velocity = { x: 0, y: 0 };
                  farthest.velocity = { x: 0, y: 0 };
                  player.isGrounded = true;
                  farthest.isGrounded = true;
                  
                  io.emit('forcePosition', { id: player.id, x: player.x, y: player.y });
                  io.emit('forcePosition', { id: farthest.id, x: farthest.x, y: farthest.y });
                  
                  const id1 = 'wall_' + entityIdCounter++;
                  walls[id1] = { id: id1, x: farthest.x - 40, y: farthest.y - 30, width: 20, height: 80, expires: Date.now() + 3000, type: 'fire', ownerId: player.id };
                  const id2 = 'wall_' + entityIdCounter++;
                  walls[id2] = { id: id2, x: farthest.x + farthest.width + 20, y: farthest.y - 30, width: 20, height: 80, expires: Date.now() + 3000, type: 'fire', ownerId: player.id };
              }
          }
      } else if (player.characterId === 'cole') {
          if (data.ability === 1) {
              io.emit('playerEffect', { id: player.id, effect: 'coleRoll' });
          } else if (data.ability === 2) {
              let nearest = null;
              let minDist = 9999;
              for (const p of Object.values(players)) {
                  if (p.id === player.id) continue;
                  const dist = Math.hypot(p.x - player.x, p.y - player.y);
                  if (dist < minDist) { minDist = dist; nearest = p; }
              }
              if (nearest) {
                  player.x = nearest.x;
                  player.y = nearest.y - 150;
                  io.emit('forcePosition', { id: player.id, x: player.x, y: player.y });
                  io.emit('playerEffect', { id: player.id, effect: 'teleport' });
              }
          } else if (data.ability === 3) {
              let crushed = false;
              for (const p of Object.values(players)) {
                  if (p.id === player.id) continue;
                  if (p.x < player.x + player.width && p.x + p.width > player.x && p.y > player.y) {
                      if (p.health <= 30) {
                          applyDamage(p, p.maxHealth, player.id, true);
                          crushed = true;
                      }
                  }
              }
              if (crushed) io.emit('playerEffect', { id: player.id, effect: 'headSmash' });
          }
      } else if (player.characterId === 'oakwell') {
          if (data.ability === 1) {
              const id = 'proj_' + entityIdCounter++;
              projectiles[id] = {
                  id, type: 'thorn' as any,
                  x: player.x + (player.facing === 'right' ? player.width : -20),
                  y: player.y + player.height / 2,
                  vx: player.facing === 'right' ? 25 : -25,
                  vy: 0,
                  ownerId: player.id,
                  damage: 2,
                  life: 45
              };
          } else if (data.ability === 2) {
              if (player.brambleId && walls[player.brambleId]) return;
              const id = 'wall_' + entityIdCounter++;
              walls[id] = {
                  id, x: player.x, y: player.y + player.height - 10,
                  width: player.width, height: 10,
                  expires: Date.now() + 15000,
                  type: 'bramble', ownerId: player.id
              };
              player.brambleId = id;
          } else if (data.ability === 3) {
              if (!player.isGrounded) return;
              const grounded = Object.values(players).filter(p => p.id !== player.id && p.isGrounded);
              if (grounded.length > 0) {
                  const target = grounded[Math.floor(Math.random() * grounded.length)];
                  target.x = player.x;
                  target.y = player.y;
                  io.emit('forcePosition', { id: target.id, x: target.x, y: target.y });
                  if (target.characterId !== 'wax') io.to(target.id).emit('applyKnockback', { vx: 0, vy: 0, stunFrames: 60 });
                  target.brambleImmune = Date.now() + 3000;
                  io.emit('playerEffect', { id: target.id, effect: 'brambleImmune' });
                  io.emit('playerEffect', { id: player.id, effect: 'teleport' });
              }
          }
      } else if (player.characterId === 'pip') {
          if (data.ability === 1) {
              const id = 'wall_' + entityIdCounter++;
              walls[id] = {
                  id, x: player.x - 50, y: player.y - 80,
                  width: 150, height: 150,
                  expires: Date.now() + 6000,
                  type: 'bloodCloud', ownerId: player.id
              };
          } else if (data.ability === 2) {
              let target = null;
              let minDist = 120;
              for (const p of Object.values(players)) {
                  if (p.id === player.id) continue;
                  const dist = Math.hypot(p.x - player.x, p.y - player.y);
                  if (dist < minDist && p.health <= 30) {
                      minDist = dist;
                      target = p;
                  }
              }
              if (target) {
                  player.x = target.x;
                  player.y = target.y;
                  io.emit('forcePosition', { id: player.id, x: player.x, y: player.y });
                  applyDamage(target, target.maxHealth, player.id, true);
                  io.emit('playerEffect', { id: player.id, effect: 'headSmash' });
              }
          } else if (data.ability === 3) {
              const hitBox = {
                  x: player.facing === 'right' ? player.x + player.width : player.x - 40,
                  y: player.y,
                  width: 40, height: player.height
              };
              for (const target of Object.values(players)) {
                  if (target.id === player.id) continue;
                  if (target.x < hitBox.x + hitBox.width && target.x + target.width > hitBox.x &&
                      target.y < hitBox.y + hitBox.height && target.y + target.height > hitBox.y) {
                      applyDamage(target, 15, player.id);
                      io.to(target.id).emit('applyKnockback', { vx: player.facing === 'right' ? 8 : -8, vy: -5, stunFrames: 15 });
                  }
              }
              io.emit('playerEffect', { id: player.id, effect: 'stab' });
          }
      } else if (player.characterId === 'neddy') {
          if (data.ability === 1) {
              if (player.hadDronesA || (player.droneACooldown && Date.now() < player.droneACooldown)) return;
              for (let i = 0; i < 12; i++) {
                  const id = 'drone_' + entityIdCounter++;
                  drones[id] = {
                      id, x: player.x + (Math.random() - 0.5) * 100, y: player.y - 40 + (Math.random() - 0.5) * 100,
                      vx: 0, vy: 0, ownerId: player.id, hp: 1, type: 'A'
                  };
              }
              player.hadDronesA = true;
          } else if (data.ability === 2) {
              if (player.hadDronesB || (player.droneBCooldown && Date.now() < player.droneBCooldown)) return;
              for (let i = 0; i < 3; i++) {
                  const id = 'drone_' + entityIdCounter++;
                  drones[id] = {
                      id, x: player.x + (Math.random() - 0.5) * 50, y: player.y - 40 + (Math.random() - 0.5) * 50,
                      vx: 0, vy: 0, ownerId: player.id, hp: 1, type: 'B'
                  };
              }
              player.hadDronesB = true;
          } else if (data.ability === 3) {
              if (player.hadDronesC || (player.droneCCooldown && Date.now() < player.droneCCooldown)) return;
              for (let i = 0; i < 5; i++) {
                  const id = 'drone_' + entityIdCounter++;
                  drones[id] = {
                      id, x: player.x, y: player.y,
                      vx: 0, vy: 0, ownerId: player.id, hp: 1, type: 'C',
                      angle: (i / 5) * Math.PI * 2
                  };
              }
              player.hadDronesC = true;
          }
      } else if (player.characterId === 'nexus') {
          if (data.ability === 1) {
              let hitSomeone = false;
              if (!player.staticChargeLastHit) player.staticChargeLastHit = Date.now();
              const seconds = Math.floor((Date.now() - player.staticChargeLastHit) / 1000);
              const dmg = Math.min(100, 1 + seconds);

              for (const p of Object.values(players)) {
                  if (p.id === player.id) continue;
                  const isFacingRight = player.facing === 'right';
                  const hitboxX = isFacingRight ? player.x + player.width : player.x - 60;
                  if (p.x < hitboxX + 60 && p.x + p.width > hitboxX && p.y < player.y + player.height && p.y + p.height > player.y) {
                      applyDamage(p, dmg, player.id);
                      io.to(p.id).emit('applyKnockback', { vx: isFacingRight ? 10 : -10, vy: -5, stunFrames: 15 });
                      hitSomeone = true;
                  }
              }
              if (hitSomeone) {
                  player.staticChargeLastHit = Date.now();
              }
              io.emit('playerEffect', { id: player.id, effect: 'nexusMelee' });
          } else if (data.ability === 2) {
              const now = Date.now();
              io.emit('globalFreeze', { endTime: now + 4000 });
              
              for (const p of Object.values(players)) {
                  io.to(p.id).emit('applyKnockback', { vx: 0, vy: 0, stunFrames: 240 }); // Stun on client for 4s
              }

              setTimeout(() => {
                  const playingIds = Object.keys(players);
                  const positions = playingIds.map(id => ({ x: players[id].x, y: players[id].y }));
                  positions.sort(() => Math.random() - 0.5);
                  playingIds.forEach((id, idx) => {
                      if (players[id]) {
                          players[id].x = positions[idx].x;
                          players[id].y = positions[idx].y;
                          io.emit('forcePosition', { id, x: players[id].x, y: players[id].y });
                          io.emit('playerEffect', { id, effect: 'teleport' });
                      }
                  });
              }, 2000);
          } else if (data.ability === 3) {
              const id = 'proj_' + entityIdCounter++;
              projectiles[id] = {
                  id, type: 'laser',
                  x: player.x + (player.facing === 'right' ? player.width : -20),
                  y: player.y + player.height / 2,
                  startX: player.x,
                  startY: player.y,
                  vx: player.facing === 'right' ? 25 : -25,
                  vy: 0,
                  ownerId: player.id,
                  damage: 10,
                  life: 1500
              };
          }
      } else if (player.characterId === 'lantern') {
          if (data.ability === 1) {
              const id = 'proj_' + entityIdCounter++;
              projectiles[id] = {
                  id, type: 'lantern',
                  x: player.x, y: player.y, startX: player.x, startY: player.y,
                  vx: player.facing === 'right' ? 12 : -12, vy: -10,
                  ownerId: player.id, damage: 20, life: 120
              };
          } else if (data.ability === 2) {
              Object.values(players).forEach(p => {
                  if (p.id !== player.id) {
                      p.activeEffects = p.activeEffects || {};
                      p.activeEffects['lanternBlind'] = Date.now() + 3000;
                      io.to(p.id).emit('screenEffect', { type: 'blind', duration: 3000 });
                  }
              });
          } else if (data.ability === 3) {
              let nearestDist = Infinity;
              let nearestP = null;
              Object.values(players).forEach(p => {
                  if (p.id !== player.id && p.hp > 0) {
                      const dist = Math.hypot(p.x - player.x, p.y - player.y);
                      if (dist < nearestDist) { nearestDist = dist; nearestP = p; }
                  }
              });
              const targetX = nearestP ? nearestP.x : player.x + (player.facing === 'right' ? 100 : -100);
              const targetY = nearestP ? nearestP.y : player.y;
              for(let i=0; i<3; i++) {
                  setTimeout(() => {
                      if (!players[player.id]) return;
                      const dx = targetX - player.x;
                      const dy = targetY - player.y;
                      const mag = Math.hypot(dx, dy) || 1;
                      const id = 'proj_' + entityIdCounter++;
                      projectiles[id] = {
                          id, type: 'book',
                          x: player.x, y: player.y, startX: player.x, startY: player.y,
                          vx: (dx / mag) * 15, vy: (dy / mag) * 15,
                          ownerId: player.id, damage: 15, life: 2000
                      };
                  }, i * 200);
              }
          }
      } else if (player.characterId === 'wax') {
          if (data.ability === 1) {
              Object.values(players).forEach(p => {
                  if (p.id !== player.id && p.health > 0) {
                      const dx = p.x - player.x;
                      const dy = p.y - player.y;
                      const mag = Math.hypot(dx, dy) || 1;
                      const id = 'proj_' + entityIdCounter++;
                      projectiles[id] = {
                          id, type: 'dart',
                          x: player.x + player.width/2, y: player.y + player.height/2, startX: player.x, startY: player.y,
                          vx: (dx / mag) * 10, vy: (dy / mag) * 10,
                          ownerId: player.id, damage: 5, life: 4000
                      };
                  }
              });
          } else if (data.ability === 2) {
              for(let i=0; i<15; i++) {
                  const id = 'proj_' + entityIdCounter++;
                  projectiles[id] = {
                      id, type: 'fallingBook',
                      x: -200 + Math.random() * 1400, y: -100, startX: 0, startY: -100,
                      vx: 0, vy: 8 + Math.random() * 4,
                      ownerId: player.id, damage: 15, life: 5000
                  };
              }
          } else if (data.ability === 3) {
              for(let i=0; i<10; i++) {
                  const id1 = 'proj_' + entityIdCounter++;
                  projectiles[id1] = {
                      id: id1, type: 'inkBlob',
                      x: -100, y: Math.random() * 800, startX: -100, startY: 0,
                      vx: 6 + Math.random()*4, vy: 0, ownerId: player.id, damage: 20, life: 6000
                  };
                  const id2 = 'proj_' + entityIdCounter++;
                  projectiles[id2] = {
                      id: id2, type: 'inkBlob',
                      x: 1300, y: Math.random() * 800, startX: 1300, startY: 0,
                      vx: -6 - Math.random()*4, vy: 0, ownerId: player.id, damage: 20, life: 6000
                  };
              }
          }
      } else if (player.characterId === 'kaelen') {
          if (data.ability === 1) {
              const id = 'proj_' + entityIdCounter++;
              projectiles[id] = {
                  id, type: 'bullet',
                  x: player.facing === 'right' ? player.x + player.width : player.x, y: player.y + player.height/2, 
                  startX: player.x, startY: player.y,
                  vx: player.facing === 'right' ? 25 : -25, vy: 0,
                  ownerId: player.id, damage: 3, life: 1500
              };
          } else if (data.ability === 2) {
              if (player.kaelenBombCD && Date.now() < player.kaelenBombCD) return;
              if (player.kaelenBomb) {
                  // Detonate
                  const bombX = player.kaelenBomb.x;
                  const bombY = player.kaelenBomb.y;
                  player.kaelenBombCD = Date.now() + 10000;
                  player.kaelenBomb = null;
                  io.emit('playerEffect', { id: player.id, effect: 'kaelenDetonate', x: bombX, y: bombY });
                  for (const p of Object.values(players)) {
                      const dist = Math.hypot(p.x + p.width/2 - bombX, p.y + p.height/2 - bombY);
                      if (dist < 150) {
                          applyDamage(p, 50, player.id, true);
                          if (p.characterId !== 'wax') io.to(p.id).emit('applyKnockback', { vx: (p.x + p.width/2 > bombX ? 15 : -15), vy: -15, stunFrames: 30 });
                      }
                  }
              } else {
                  // Place bomb
                  player.kaelenBomb = { x: player.x + player.width/2, y: player.y + player.height/2 };
                  io.emit('playerEffect', { id: player.id, effect: 'kaelenBombPlaced', x: player.kaelenBomb.x, y: player.kaelenBomb.y });
              }
          } else if (data.ability === 3) {
              // Tactical roll — grant i-frames server side for 500ms
              player.isInvincible = true;
              player.activeEffects = player.activeEffects || {};
              player.activeEffects['kaelenRoll'] = Date.now() + 500;
              io.emit('playerEffect', { id: player.id, effect: 'kaelenRoll' });
              setTimeout(() => {
                  if (players[player.id]) {
                      players[player.id].isInvincible = false;
                  }
              }, 500);
          }
      } else if (player.characterId === 'luma') {
          if (data.ability === 1) {
              const id = 'proj_' + entityIdCounter++;
              projectiles[id] = {
                  id, type: 'paintLob',
                  x: player.x, y: player.y, startX: player.x, startY: player.y,
                  vx: player.facing === 'right' ? 15 : -15, vy: -5,
                  ownerId: player.id, damage: 5, life: 120
              };
          } else if (data.ability === 2) {
              if (!player.isGrounded) return;
              const id = 'proj_' + entityIdCounter++;
              projectiles[id] = {
                  id, type: 'paintTrap',
                  x: player.x, y: player.y + player.height - 10, startX: player.x, startY: player.y,
                  vx: 0, vy: 0, ownerId: player.id, damage: 15, life: 300
              };
          } else if (data.ability === 3) {
              for(let i=0; i<8; i++) {
                  const angle = (i / 8) * Math.PI * 2;
                  const id = 'proj_' + entityIdCounter++;
                  projectiles[id] = {
                      id, type: 'paintLob',
                      x: player.x, y: player.y, startX: player.x, startY: player.y,
                      vx: Math.cos(angle) * 12, vy: Math.sin(angle) * 12,
                      ownerId: player.id, damage: 5, life: 1500
                  };
              }
          }
      }
  });

  socket.on('executeSafetyWarp', (data) => {
      const player = players[socket.id];
      if (player && player.safetyWarpState === 'ready') {
          player.safetyWarpState = 'none';
          if (data.dir === 'left') { player.x = 220; player.y = 350; }
          else if (data.dir === 'right') { player.x = 762 - player.width; player.y = 350; }
          else if (data.dir === 'up') { player.x = 512 - player.width/2; player.y = 100; }
          else if (data.dir === 'down') { player.x = 512 - player.width/2; player.y = 350; }
          io.emit('forcePosition', { id: player.id, x: player.x, y: player.y });
          io.emit('playerEffect', { id: player.id, effect: 'warpExecute' });
          io.emit('playerEffect', { id: player.id, effect: 'teleport' });
      }
  });

  socket.on('playerKnockback', (data) => {
    socket.to(data.targetId).emit('applyKnockback', data);
  });

  socket.on('groundSlamEffect', (data) => {
    socket.broadcast.emit('spawnGroundSlam', data);
  });
});

const PORT = 3000;

// Integrating Vite in development
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
