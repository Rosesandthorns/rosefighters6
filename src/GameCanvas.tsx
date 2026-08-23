import rivalThemeUrl from './assets/rival_theme.mp3';
import rivalThemeUrl from './assets/rival_theme.mp3';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Player {
  id: string;
  characterId: string;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
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
  deflectTimer?: number;
  safetyWarpState?: 'none' | 'charging' | 'ready';
  dots?: { damagePerTick: number; ticksLeft: number; nextTick: number }[];
  activeEffects?: { [effectName: string]: number };
  pinedoState?: 'idle' | 'run' | 'attack1' | 'attack2' | 'waiting' | 'attack3start' | 'attack3main';
  pinedoAttack3Center?: { x: number; y: number };
  mirageState?: 'idle' | 'movestart' | 'midflight' | 'movestop' | 'attack1' | 'attack2' | 'attack3' | 'attack3reverse';
  mirageMoving?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  ignoreGravity?: boolean;
}

interface LobbyPlayer {
  id: string;
  characterId: string | null;
  isReady: boolean;
  lastActive: number;
}

interface Projectile {
    id: string;
    type: 'card' | 'boomerang' | 'fireball' | 'plate' | 'thorn' | 'laser' | 'lantern' | 'book' | 'dart' | 'fallingBook' | 'inkBlob' | 'bullet' | 'paintLob' | 'paintTrap';
    x: number;
    y: number;
    vx: number;
    vy: number;
    ownerId: string;
    damage: number;
    life: number;
    state?: string;
}

interface Wall {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    expires: number;
    type?: string;
    ownerId?: string;
}

interface Zone {
    id: string;
    x: number;
    y: number;
    radius: number;
    timer: number;
    ownerId: string;
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
}

const ROSTER = [
  { id: 'mirage', name: 'Mirage', color: '#a855f7', hp: 80, category: 'Mirage Park' },
  { id: 'orbo', name: 'Orbo', color: '#06b6d4', hp: 60, category: 'Mirage Park' },
  { id: 'rica', name: 'Rica', color: '#ef4444', hp: 120, category: 'Mirage Park' },
  { id: 'chester', name: 'Chester', color: '#8b4513', hp: 200, category: 'Mirage Park' },
  { id: 'pinedo', name: 'Pinedo', color: '#ffffff', hp: 100, category: 'Mirage Park' },
  { id: 'morka', name: 'Morka', color: '#6b7280', hp: 120, category: 'Mirage Park' },
  { id: 'wisp', name: 'Wisp', color: '#3b82f6', hp: 50, category: 'Mirage Park' },
  { id: 'cole', name: 'Cole', color: '#4b5563', hp: 150, category: 'Mirage Park' },
  { id: 'oakwell', name: 'Oakwell', color: '#92400e', hp: 150, category: 'Mirage Park' },
  { id: 'pip', name: 'Pip', color: '#991b1b', hp: 30, category: 'Rose Valley' },
  { id: 'nexus', name: 'Nexus', color: '#f97316', hp: 40, category: 'Rose Valley' },
  { id: 'neddy', name: 'Neddy', color: '#eab308', hp: 80, category: 'Project Defence' },
  { id: 'lantern', name: 'The Lantern Setter', color: '#fef08a', hp: 120, category: 'Project Defence' },
  { id: 'wax', name: 'Ink Drawn Shopkeeper', color: '#1e1b2e', hp: 2500, category: 'Project Defence' },
  { id: 'kaelen', name: 'Commander Kaelen', color: '#4d7c0f', hp: 100, category: 'Vantage' },
  { id: 'luma', name: 'Luma Art', color: '#ec4899', hp: 100, category: 'Vantage' }
];

const GRAVITY = 1.2;
const MOVE_SPEED = 7;
const JUMP_FORCE = -21;
const MAX_FALL_SPEED = 18;
const FAST_FALL_SPEED = 30;
const ATTACK_RANGE = 60;
const ATTACK_DURATION = 15; // frames

const PLATFORMS = [
  // Main stage (centered, width 600)
  { x: 212, y: 450, width: 600, height: 40 },
  // Left platform
  { x: 150, y: 300, width: 180, height: 16 },
  // Right platform
  { x: 694, y: 300, width: 180, height: 16 },
  // Top Middle platform
  { x: 422, y: 180, width: 180, height: 16 }
];

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [myId, setMyId] = useState<string>('');
  
  const playersRef = useRef<Record<string, Player>>({});
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const mouseRef = useRef<{ [key: number]: boolean }>({});
  const attackTimerRef = useRef<number>(0);
  const hitCooldownsRef = useRef<Record<string, number>>({}); // prevent multi-hits per attack
  const freezeEndTimeRef = useRef<number>(0);
  const ledgeGrabCooldownRef = useRef<number>(0);
  const stunTimerRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const kaelenMovingRef = useRef<boolean>(false);

  // Pinedo sprite images — loaded once
  const pinedoImgs = useRef<Record<string, HTMLImageElement>>({});
  // Mirage sprite images — loaded once
  const mirageImgs = useRef<Record<string, HTMLImageElement>>({});
  useEffect(() => {
    const pAssets: Record<string, string> = {
      idle:       '/Pinedo/PinedoIdlegif.gif',
      run:        '/Pinedo/PinedoRungif.gif',
      attack1:    '/Pinedo/PinedoAttack1gif.gif',
      attack2:    '/Pinedo/PinedoAttack2gif.gif',
      waiting:    '/Pinedo/PinedoWaiting.png',
      attack3s:   '/Pinedo/PinedoAttack3start.gif',
      attack3m:   '/Pinedo/PinedoAttack3main.gif',
      projectile: '/Pinedo/PinedoProjectile.png',
      icon:       '/Pinedo/PinedoIcon.png',
    };
    Object.entries(pAssets).forEach(([key, src]) => {
      const img = new Image(); img.src = src;
      pinedoImgs.current[key] = img;
    });
    const mAssets: Record<string, string> = {
      idle:         '/Mirage/MirageIdle.gif',
      movestart:    '/Mirage/MirageMoveStart.gif',
      midflight:    '/Mirage/MirageMidFlight.png',
      attack12:     '/Mirage/MirageAttack2.gif',
      attack3:      '/Mirage/MirageAttack3.gif',
      icon:         '/Mirage/MirageIcon.png',
    };
    Object.entries(mAssets).forEach(([key, src]) => {
      const img = new Image(); img.src = src;
      mirageImgs.current[key] = img;
    });
  }, []);

  const spawnSlamParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 30; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 20,
        vy: -Math.random() * 15 - 2,
        life: Math.floor(Math.random() * 20 + 20),
        maxLife: 40,
        color,
        size: Math.random() * 8 + 4
      });
    }
  };

  const [appState, setAppState] = useState<'LOBBY' | 'PLAYING'>('LOBBY');
  const [lobbyPlayers, setLobbyPlayers] = useState<Record<string, LobbyPlayer>>({});
  const [playersList, setPlayersList] = useState<Player[]>([]);
  const entitiesRef = useRef<{ projectiles: Record<string, Projectile>, walls: Record<string, Wall>, zones: Record<string, Zone>, drones: Record<string, Drone> }>({ projectiles: {}, walls: {}, zones: {}, drones: {} });
  const abilityCooldownsRef = useRef<{ [key: number]: number }>({ 1: 0, 2: 0, 3: 0 });
  const safetyWarpReadyRef = useRef<boolean>(false);
  const screenEffectRef = useRef<{ type: string; expiresAt: number } | null>(null);
  const kaelenBombRef = useRef<{ x: number; y: number } | null>(null);
  const [pinedoProjectiles, setPinedoProjectiles] = useState<{id:string,x:number,y:number}[]>([]);
  // Mirage trail: last N positions for silhouette effect
  const mirageTrailRef = useRef<{x:number,y:number,facing:'left'|'right',alpha:number}[]>([]);
  const [mirageOverlay, setMirageOverlay] = useState<{id:string,x:number,y:number,state:string,facing:'left'|'right',trail:{x:number,y:number,facing:'left'|'right',alpha:number}[]}[]>([]);

  useEffect(() => {
    // Connect to same host, forcing websocket transport to avoid Cloud Run load balancing / polling issues
    const newSocket = io({ transports: ['websocket'] });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setMyId(newSocket.id as string);
    });

    newSocket.on('entitiesUpdate', (data) => {
        entitiesRef.current = {
            projectiles: data.projectiles || {},
            walls: data.walls || {},
            zones: data.zones || {},
            drones: data.drones || {}
        };
    });

    newSocket.on('forcePosition', (data: { id: string, x: number, y: number }) => {
        if (playersRef.current[data.id]) {
            playersRef.current[data.id].x = data.x;
            playersRef.current[data.id].y = data.y;
            playersRef.current[data.id].targetX = data.x;
            playersRef.current[data.id].targetY = data.y;
            playersRef.current[data.id].velocity = { x: 0, y: 0 };
        }
    });

    // playerEffect handler is defined above (the unified one that also handles new characters)

    newSocket.on('zoneDetonate', (data: { x: number, y: number, color?: string }) => {
        for (let i = 0; i < 30; i++) {
            particlesRef.current.push({
                x: data.x + (Math.random() - 0.5) * 50,
                y: data.y + (Math.random() - 0.5) * 50,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                life: 1.0,
                maxLife: 20,
                color: '#06b6d4',
                size: Math.random() * 6 + 4
            });
        }
    });

    newSocket.on('lobbyState', (data: { players: Record<string, LobbyPlayer>, state: 'LOBBY' | 'PLAYING' }) => {
      setLobbyPlayers(data.players);
      setAppState(data.state);
    });

    newSocket.on('lobbyUpdate', (players: Record<string, LobbyPlayer>) => {
      setLobbyPlayers(players);
    });

    newSocket.on('gameStart', (serverPlayers: Record<string, Player>) => {
      playersRef.current = serverPlayers;
      setPlayersList(Object.values(serverPlayers));
      setAppState('PLAYING');
    });

    newSocket.on('applyKnockback', (data: { vx: number, vy: number, stunFrames: number }) => {
      const myPlayer = playersRef.current[newSocket.id as string];
      if (myPlayer) {
        myPlayer.velocity.x = data.vx;
        myPlayer.velocity.y = data.vy;
        stunTimerRef.current = data.stunFrames;
        myPlayer.isStunned = true;
        myPlayer.isGrabbingLedge = false;
      }
    });

    newSocket.on('globalFreeze', (data: { endTime: number }) => {
        freezeEndTimeRef.current = data.endTime;
    });

    newSocket.on('clearStun', () => {
        stunTimerRef.current = 0;
        const myPlayer = playersRef.current[newSocket.id as string];
        if (myPlayer) {
            myPlayer.isStunned = false;
            myPlayer.velocity.x = 0;
            myPlayer.velocity.y = 0;
        }
    });

    newSocket.on('screenEffect', (data: { type: string; duration: number }) => {
        screenEffectRef.current = { type: data.type, expiresAt: Date.now() + data.duration };
    });

    newSocket.on('playerEffect', (data: { id: string; effect: string; x?: number; y?: number }) => {
        const p = playersRef.current[data.id];
        if (data.effect === 'kaelenBombPlaced' && data.x !== undefined && data.y !== undefined) {
            if (data.id === newSocket.id) {
                kaelenBombRef.current = { x: data.x, y: data.y };
            }
            // Store on the player so others see the bomb indicator
            if (p) {
                p.activeEffects = p.activeEffects || {};
                p.activeEffects['kaelenBomb'] = 1; // truthy flag
                (p as any).kaelenBombX = data.x;
                (p as any).kaelenBombY = data.y;
            }
            return;
        }
        if (data.effect === 'kaelenDetonate') {
            kaelenBombRef.current = null;
            if (p) {
                p.activeEffects = p.activeEffects || {};
                p.activeEffects['kaelenBomb'] = 0;
            }
            if (data.x !== undefined && data.y !== undefined) {
                spawnSlamParticles(data.x, data.y, '#facc15');
                for (let i = 0; i < 20; i++) {
                    particlesRef.current.push({
                        x: data.x, y: data.y,
                        vx: (Math.random()-0.5)*25, vy: (Math.random()-0.5)*25,
                        life: 30, maxLife: 30, color: '#f97316', size: Math.random()*10+4
                    });
                }
            }
            return;
        }
        if (data.effect === 'kaelenRoll' && p) {
            p.activeEffects = p.activeEffects || {};
            p.activeEffects['kaelenRoll'] = Date.now() + 500;
            return;
        }
        if (data.effect === 'inkSlowed' && p) {
            p.activeEffects = p.activeEffects || {};
            p.activeEffects['inkSlowed'] = Date.now() + 3000;
            return;
        }
        if (data.effect === 'inkSlowEnd' && p) {
            p.activeEffects = p.activeEffects || {};
            p.activeEffects['inkSlowed'] = 0;
            return;
        }
        if (!p) return;
        p.activeEffects = p.activeEffects || {};

        if (data.effect === 'warpChargeStart') {
            p.activeEffects['warpCharge'] = Date.now() + 1000;
        }
        if (data.effect === 'dotStart') {
            p.activeEffects['dot'] = Date.now() + 2000;
        }
        if (data.effect === 'warpReady' && data.id === newSocket.id) {
            safetyWarpReadyRef.current = true;
        }
        if (data.effect === 'warpExecute' && data.id === newSocket.id) {
            safetyWarpReadyRef.current = false;
        }
        if (data.effect === 'deflectStart') {
            p.activeEffects['deflect'] = Date.now() + 2000;
        }
        if (data.effect === 'teleport') {
            spawnSlamParticles(p.x + p.width/2, p.y + p.height/2, p.color);
        }
        if (data.effect === 'deflectSuccess') {
            spawnSlamParticles(p.x + p.width/2, p.y + p.height/2, '#06b6d4');
        }
        if (data.effect === 'ricaChargeStart') {
            p.activeEffects['ricaCharge'] = Date.now() + 1000;
        }
        if (data.effect === 'ricaChargeRun') {
            p.activeEffects['ricaRun'] = Date.now() + 1000;
            p.activeEffects['ricaCharge'] = 0;
        }
        if (data.effect === 'ricaGrab') {
            p.activeEffects['ricaGrabbed'] = Date.now() + 5000;
        }
        if (data.effect === 'ricaSlam') {
            p.activeEffects['ricaGrabbed'] = 0;
            spawnSlamParticles(p.x + p.width/2, p.y + p.height/2, p.color);
        }
        if (data.effect === 'toothDash') {
            p.activeEffects['toothDash'] = Date.now() + 500;
        }
        if (data.effect === 'mimicStart') {
            p.activeEffects['mimic'] = Date.now() + 5000;
        }
        if (data.effect === 'mimicSuccess') {
            p.activeEffects['mimic'] = 0;
            spawnSlamParticles(p.x + p.width/2, p.y + p.height/2, '#8b4513');
        }
        if (data.effect === 'healStart') {
            p.activeEffects['healBuff'] = Date.now() + 5000;
        }
        if (data.effect === 'coleRoll') {
            p.activeEffects['coleRoll'] = Date.now() + 1000;
        }
        if (data.effect === 'brambleImmune') {
            p.activeEffects['brambleImmune'] = Date.now() + 3000;
        }
        if (data.effect === 'stab') {
            spawnSlamParticles(p.x + (p.facing === 'right' ? p.width : 0), p.y + p.height/2, '#dc2626');
        }
        if (data.effect === 'nexusMelee') {
            p.activeEffects['nexusMelee'] = Date.now() + 200;
        }
        if (data.effect === 'chesterHealed') {
            p.activeEffects['healBuff'] = 0;
            for (let i = 0; i < 20; i++) {
                particlesRef.current.push({
                    x: p.x + p.width/2 + (Math.random() - 0.5) * 40,
                    y: p.y + p.height/2 + (Math.random() - 0.5) * 40,
                    vx: 0,
                    vy: -2 - Math.random() * 2,
                    life: 30,
                    maxLife: 30,
                    color: '#22c55e',
                    size: 6
                });
            }
        }
        if (data.effect === 'hit') {
            spawnSlamParticles(p.x + p.width/2, p.y + p.height/2, '#ef4444');
        }
        if (data.effect === 'pinedoStateChange' && (data as any).state) {
            p.pinedoState = (data as any).state;
        }
        if (data.effect === 'pinedoAttack1Start') {
            p.pinedoState = 'attack1';
        }
        if (data.effect === 'pinedoAttack2Start') {
            p.pinedoState = 'attack2';
        }
        if (data.effect === 'pinedoAttack3Start') {
            p.pinedoState = 'attack3start';
        }
        if (data.effect === 'pinedoAttack3Main') {
            p.pinedoState = 'attack3main';
        }
        if (data.effect === 'mirageState' && (data as any).state) {
            p.mirageState = (data as any).state;
        }
    });

    newSocket.on('spawnGroundSlam', (data: { x: number, y: number, color: string }) => {
      spawnSlamParticles(data.x, data.y, data.color);
    });

    newSocket.on('currentPlayers', (serverPlayers: Record<string, Player>) => {
      playersRef.current = serverPlayers;
      setPlayersList(Object.values(serverPlayers));
    });

    newSocket.on('newPlayer', (player: Player) => {
      playersRef.current[player.id] = player;
      setPlayersList(Object.values(playersRef.current));
    });

    newSocket.on('playerDisconnected', (id: string) => {
      delete playersRef.current[id];
      setPlayersList(Object.values(playersRef.current));
    });

    newSocket.on('playerMoved', (player: Player) => {
      if (playersRef.current[player.id]) {
        playersRef.current[player.id].targetX = player.x;
        playersRef.current[player.id].targetY = player.y;
        playersRef.current[player.id].velocity = player.velocity;
        playersRef.current[player.id].facing = player.facing;
        playersRef.current[player.id].isGrounded = player.isGrounded;
        playersRef.current[player.id].isGrabbingLedge = player.isGrabbingLedge;
        playersRef.current[player.id].isStunned = player.isStunned;
      }
    });

    newSocket.on('playerAttacked', (player: Player) => {
       if (playersRef.current[player.id]) {
         playersRef.current[player.id].isAttacking = player.isAttacking;
       }
    });

    newSocket.on('playerHealthChanged', ({ id, health }: { id: string, health: number }) => {
      if (playersRef.current[id]) {
        playersRef.current[id].health = health;
        setPlayersList(Object.values(playersRef.current));
      }
    });

    newSocket.on('playerRespawned', (player: Player) => {
       if (playersRef.current[player.id]) {
         playersRef.current[player.id] = player;
         setPlayersList(Object.values(playersRef.current));
       }
    });

    newSocket.on('scoreUpdated', ({ id, score }: { id: string, score: number }) => {
        if (playersRef.current[id]) {
            playersRef.current[id].score = score;
            setPlayersList(Object.values(playersRef.current));
        }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    const handleMouseDown = (e: MouseEvent) => { mouseRef.current[e.button] = true; };
    const handleMouseUp = (e: MouseEvent) => { mouseRef.current[e.button] = false; };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    let audio: HTMLAudioElement | null = null;
    if (appState === 'PLAYING') {
      audio = new Audio(rivalThemeUrl);
      audio.loop = true;
      audio.volume = 0.15;
      audio.play().catch(e => {
        if (e.name !== 'NotSupportedError' && !e.message.includes('supported source was found')) {
          console.error("Audio play failed:", e);
        } else {
          console.warn("Audio file could not be decoded. The mp3 file may be corrupted.");
        }
      });
    }
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [appState]);

  useEffect(() => {
    if (!socket) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const gameLoop = () => {
      updatePhysics();
      render();
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    const updatePhysics = () => {
      const myPlayer = playersRef.current[myId];
      if (!myPlayer) return;

      const keys = keysRef.current;
      const mouseButtons = mouseRef.current;

      // Handle Stun
      if (stunTimerRef.current > 0 || myPlayer.grabbedByPlayerId) {
          if (stunTimerRef.current > 0) stunTimerRef.current--;
          myPlayer.isStunned = true;
          myPlayer.isAttacking = false;
      } else {
          myPlayer.isStunned = false;
      }

      if (ledgeGrabCooldownRef.current > 0) {
          ledgeGrabCooldownRef.current--;
      }

      // Decrement attack timer and hit cooldowns
      if (attackTimerRef.current > 0) {
          attackTimerRef.current--;
          if (attackTimerRef.current === 0) {
              myPlayer.isAttacking = false;
              hitCooldownsRef.current = {}; // reset cooldowns for next attack
              socket.emit('playerAttack', { isAttacking: false });
          }
      }
      
      // Interpolate remote players
      Object.values(playersRef.current).forEach((p: Player) => {
          if (p.id !== myId && p.targetX !== undefined && p.targetY !== undefined) {
              p.x += (p.targetX - p.x) * 0.3;
              p.y += (p.targetY - p.y) * 0.3;
          }
      });
      
      // Particle update
      particlesRef.current = particlesRef.current.filter(p => {
          p.x += p.vx;
          p.y += p.vy;
          if (!p.ignoreGravity) {
              p.vy += GRAVITY * 0.5;
          }
          p.life--;
          return p.life > 0;
      });

      // Generate inwards particles for zones
      (Object.values(entitiesRef.current.zones) as Zone[]).forEach(zone => {
          for (let i = 0; i < 2; i++) {
              const angle = Math.random() * Math.PI * 2;
              const dist = zone.radius + (Math.random() * 20 - 10);
              particlesRef.current.push({
                  x: zone.x + Math.cos(angle) * dist,
                  y: zone.y + Math.sin(angle) * dist,
                  vx: -Math.cos(angle) * 15,
                  vy: -Math.sin(angle) * 15,
                  life: 20,
                  maxLife: 20,
                  color: '#06b6d4',
                  size: Math.random() * 4 + 2,
                  ignoreGravity: true
              });
          }
      });

      // Generate outwards particles for players with DoT
      (Object.values(playersRef.current) as Player[]).forEach(p => {
          if (p.activeEffects?.['dot'] && p.activeEffects['dot'] > Date.now()) {
              if (Math.random() < 0.8) {
                  for (let i = 0; i < 2; i++) {
                      const angle = Math.random() * Math.PI * 2;
                      particlesRef.current.push({
                          x: p.x + p.width / 2,
                          y: p.y + p.height / 2,
                          vx: Math.cos(angle) * 12,
                          vy: Math.sin(angle) * 12,
                          life: 15,
                          maxLife: 15,
                          color: '#06b6d4',
                          size: Math.random() * 5 + 3,
                          ignoreGravity: true
                      });
                  }
              }
          }
      });

      // Handle Ability Cooldowns
      if (abilityCooldownsRef.current[1] > 0) abilityCooldownsRef.current[1]--;
      if (abilityCooldownsRef.current[2] > 0) abilityCooldownsRef.current[2]--;
      if (abilityCooldownsRef.current[3] > 0) abilityCooldownsRef.current[3]--;

      if (safetyWarpReadyRef.current) {
          myPlayer.velocity.x = 0;
          myPlayer.velocity.y = 0;
          
          if (keys['ArrowLeft'] || keys['KeyA']) socket.emit('executeSafetyWarp', { dir: 'left' });
          else if (keys['ArrowRight'] || keys['KeyD']) socket.emit('executeSafetyWarp', { dir: 'right' });
          else if (keys['ArrowUp'] || keys['KeyW']) socket.emit('executeSafetyWarp', { dir: 'up' });
          else if (keys['ArrowDown'] || keys['KeyS']) socket.emit('executeSafetyWarp', { dir: 'down' });
      } else if (!myPlayer.isStunned) {
          if (myPlayer.isGrabbingLedge) {
              const mainStage = PLATFORMS[0];
              const isLeftLedge = myPlayer.x < mainStage.x + mainStage.width / 2;
              
              if (keys['ArrowUp'] || keys['KeyW'] || keys['Space']) {
                  // Jump off ledge
                  myPlayer.velocity.y = JUMP_FORCE;
                  myPlayer.isGrabbingLedge = false;
                  ledgeGrabCooldownRef.current = 30; // 0.5s cooldown before regrab
              } else if (
                  keys['ArrowDown'] || keys['KeyS'] ||
                  (isLeftLedge && (keys['ArrowLeft'] || keys['KeyA'])) ||
                  (!isLeftLedge && (keys['ArrowRight'] || keys['KeyD']))
              ) {
                  // Drop from ledge
                  myPlayer.isGrabbingLedge = false;
                  ledgeGrabCooldownRef.current = 30;
              } else {
                  // Hang there
                  myPlayer.velocity.x = 0;
                  myPlayer.velocity.y = 0;
              }
          } else {
              // Horizontal movement
              let moveTarget = 0;
              const currentSpeed = MOVE_SPEED * (myPlayer.speedMult || 1.0);
              
              const isColeRollActive = myPlayer.activeEffects?.['coleRoll'] && myPlayer.activeEffects['coleRoll'] > Date.now();
              const isRicaRunActive = myPlayer.activeEffects?.['ricaRun'] && myPlayer.activeEffects['ricaRun'] > Date.now();
              if (isColeRollActive || isRicaRunActive) {
                  if (!myPlayer.isGrounded) {
                      if (isColeRollActive) myPlayer.activeEffects['coleRoll'] = 0;
                      if (isRicaRunActive) myPlayer.activeEffects['ricaRun'] = 0;
                  } else {
                      moveTarget = myPlayer.facing === 'right' ? (isColeRollActive ? MOVE_SPEED * 2 : currentSpeed * 2.5) : (isColeRollActive ? -MOVE_SPEED * 2 : -currentSpeed * 2.5);
                      
                      const nextLeft = myPlayer.x + moveTarget;
                      const nextRight = myPlayer.x + myPlayer.width + moveTarget;
                      const checkX = myPlayer.facing === 'right' ? nextRight : nextLeft;
                      const checkY = myPlayer.y + myPlayer.height + 5;
                      
                      let hasGround = false;
                      for (const plat of PLATFORMS) {
                          if (checkX > plat.x && checkX < plat.x + plat.width && 
                              checkY >= plat.y && checkY <= plat.y + 20) {
                              hasGround = true; 
                              break;
                          }
                      }
                      
                      if (!hasGround) {
                          if (isColeRollActive) myPlayer.activeEffects['coleRoll'] = 0;
                          if (isRicaRunActive) myPlayer.activeEffects['ricaRun'] = 0;
                          myPlayer.activeEffects['edgeBrake'] = Date.now() + 150;
                          moveTarget = 0;
                          myPlayer.velocity.x = 0;
                      }
                  }
              } else if (myPlayer.activeEffects?.['toothDash'] && myPlayer.activeEffects['toothDash'] > Date.now()) {
                  moveTarget = myPlayer.facing === 'right' ? currentSpeed * 3 : -currentSpeed * 3;
              } else if (myPlayer.activeEffects?.['ricaCharge'] && myPlayer.activeEffects['ricaCharge'] > Date.now()) {
                  moveTarget = 0; // frozen while charging
              } else if (myPlayer.activeEffects?.['edgeBrake'] && myPlayer.activeEffects['edgeBrake'] > Date.now()) {
                  moveTarget = 0; // frozen to prevent accidentally walking off edge
              } else {
                  if (keys['ArrowLeft'] || keys['KeyA']) {
                    moveTarget = -currentSpeed;
                    myPlayer.facing = 'left';
                  } else if (keys['ArrowRight'] || keys['KeyD']) {
                    moveTarget = currentSpeed;
                    myPlayer.facing = 'right';
                  }
              }
              
              // Apply movement
              myPlayer.velocity.x = moveTarget;
              kaelenMovingRef.current = moveTarget !== 0;
              // Update Pinedo run/idle state from movement (only when not in an attack)
              if (myPlayer.characterId === 'pinedo') {
                const attackStates = ['attack1','attack2','waiting','attack3start','attack3main'];
                if (!attackStates.includes(myPlayer.pinedoState || '')) {
                  myPlayer.pinedoState = moveTarget !== 0 ? 'run' : 'idle';
                }
              }
              // Update Mirage movement state locally
              if (myPlayer.characterId === 'mirage') {
                const mAttack = ['attack1','attack2','attack3','attack3reverse'];
                if (!mAttack.includes(myPlayer.mirageState || '')) {
                  const wasMoving = myPlayer.mirageMoving;
                  const nowMoving = moveTarget !== 0;
                  if (nowMoving !== wasMoving) {
                    myPlayer.mirageMoving = nowMoving;
                    myPlayer.mirageState = nowMoving ? 'movestart' : 'movestop';
                  } else if (nowMoving && myPlayer.mirageState === 'movestart') {
                    myPlayer.mirageState = 'midflight';
                  } else if (!nowMoving && myPlayer.mirageState === 'movestop') {
                    myPlayer.mirageState = 'idle';
                  }
                }
              }

              // Jump
              if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && myPlayer.isGrounded && !(myPlayer.activeEffects?.['ricaCharge'] > Date.now()) && myPlayer.characterId !== 'wax') {
                myPlayer.velocity.y = JUMP_FORCE;
                myPlayer.isGrounded = false;
              }

              // Apply gravity
              myPlayer.velocity.y += GRAVITY;

              // Fast fall / Terminal Velocity
              if ((keys['ArrowDown'] || keys['KeyS']) && myPlayer.velocity.y > 0 && !myPlayer.isGrounded) {
                  myPlayer.velocity.y = FAST_FALL_SPEED;
                  myPlayer.isFastFalling = true;
              } else if (myPlayer.velocity.y > MAX_FALL_SPEED) {
                  myPlayer.velocity.y = MAX_FALL_SPEED;
              }
          }

          // Abilities
          const isOakwell = myPlayer.characterId === 'oakwell';
          const isNeddy = myPlayer.characterId === 'neddy';
          const isKaelen = myPlayer.characterId === 'kaelen';
          const isLantern = myPlayer.characterId === 'lantern';
          const isWax = myPlayer.characterId === 'wax';

          let ab1CD = isNeddy ? 30 : (isOakwell ? 15 : (isKaelen ? 6 : (isLantern ? 120 : (isWax ? 90 : 60))));
          let ab2CD = isNeddy ? 30 : (isWax ? 90 : (isKaelen ? 15 : 300)); // Kaelen bomb: 15f for both place and detonate; server handles 10s post-detonate lockout
          let ab3CD = isNeddy ? 30 : (isWax ? 90 : (isKaelen ? 150 : 300)); // Kaelen roll 5s cooldown

          if (isKaelen && mouseButtons[0] && abilityCooldownsRef.current[1] === 0 && !myPlayer.isGrabbingLedge && !kaelenMovingRef.current && myPlayer.isGrounded) {
              socket.emit('useAbility', { ability: 1 });
              abilityCooldownsRef.current[1] = ab1CD;
          } else if (!isKaelen && mouseButtons[0] && abilityCooldownsRef.current[1] === 0 && !myPlayer.isGrabbingLedge) {
              socket.emit('useAbility', { ability: 1 });
              abilityCooldownsRef.current[1] = ab1CD;
              hitCooldownsRef.current = {};
          } else if (mouseButtons[1] && abilityCooldownsRef.current[2] === 0 && !myPlayer.isGrabbingLedge) {
              socket.emit('useAbility', { ability: 2 });
              abilityCooldownsRef.current[2] = ab2CD;
              hitCooldownsRef.current = {};
          } else if (mouseButtons[2] && abilityCooldownsRef.current[3] === 0 && !myPlayer.isGrabbingLedge) {
              socket.emit('useAbility', { ability: 3 });
              abilityCooldownsRef.current[3] = ab3CD;
              hitCooldownsRef.current = {};
          }
      } else {
          const isGloballyFrozen = Date.now() < freezeEndTimeRef.current;
          if (isGloballyFrozen) {
              myPlayer.velocity.x = 0;
              myPlayer.velocity.y = 0;
          } else {
              // If stunned in air, apply gravity and terminal velocity but keep fast falling flag if it was set
              if (!myPlayer.isGrounded) {
                  myPlayer.velocity.y += GRAVITY;
                  if (myPlayer.velocity.y > MAX_FALL_SPEED) {
                      myPlayer.velocity.y = MAX_FALL_SPEED;
                  }
              }
              // Air/ground friction
              myPlayer.velocity.x *= 0.95;
          }
      }

      const prevVelocityY = myPlayer.velocity.y;
      
      // Apply velocity
      if (!myPlayer.isGrabbingLedge) {
          myPlayer.x += myPlayer.velocity.x;
          myPlayer.y += myPlayer.velocity.y;
      }

      // Ledge grab detection (falling near main stage edge)
      if (!myPlayer.isGrounded && !myPlayer.isGrabbingLedge && myPlayer.velocity.y > 0 && ledgeGrabCooldownRef.current === 0 && !myPlayer.isStunned) {
          const mainStage = PLATFORMS[0];
          const leftLedgeX = mainStage.x;
          const rightLedgeX = mainStage.x + mainStage.width;
          const ledgeY = mainStage.y;

          // Left Ledge
          if (
              myPlayer.x + myPlayer.width >= leftLedgeX - 10 &&
              myPlayer.x + myPlayer.width <= leftLedgeX + 15 &&
              myPlayer.y >= ledgeY - 40 &&
              myPlayer.y <= ledgeY + 10
          ) {
              myPlayer.isGrabbingLedge = true;
              myPlayer.facing = 'right';
              myPlayer.x = leftLedgeX - myPlayer.width;
              myPlayer.y = ledgeY - 10;
              myPlayer.velocity = {x: 0, y: 0};
          }
          // Right Ledge
          else if (
              myPlayer.x <= rightLedgeX + 10 &&
              myPlayer.x >= rightLedgeX - 15 &&
              myPlayer.y >= ledgeY - 40 &&
              myPlayer.y <= ledgeY + 10
          ) {
              myPlayer.isGrabbingLedge = true;
              myPlayer.facing = 'left';
              myPlayer.x = rightLedgeX;
              myPlayer.y = ledgeY - 10;
              myPlayer.velocity = {x: 0, y: 0};
          }
      }

      let grounded = false;
      const prevBottom = myPlayer.y - prevVelocityY + myPlayer.height;

      // Dynamic Wall horizontal collision
      for (const wall of (Object.values(entitiesRef.current.walls) as Wall[])) {
          if (['fire', 'bramble', 'bloodCloud'].includes(wall.type || '')) continue;
          if (
              myPlayer.y + myPlayer.height > wall.y &&
              myPlayer.y < wall.y + wall.height
          ) {
              // Colliding horizontally
              if (myPlayer.x + myPlayer.width > wall.x && myPlayer.x < wall.x + wall.width) {
                  if (myPlayer.velocity.x > 0) {
                      myPlayer.x = wall.x - myPlayer.width;
                      myPlayer.velocity.x = 0;
                  } else if (myPlayer.velocity.x < 0) {
                      myPlayer.x = wall.x + wall.width;
                      myPlayer.velocity.x = 0;
                  }
              }
          }
      }

      // Special active hitboxes (Rica Run / Chester Dash)
      const isColeRoll = myPlayer.activeEffects?.['coleRoll'] && myPlayer.activeEffects['coleRoll'] > Date.now();
      if ((myPlayer.activeEffects?.['ricaRun'] && myPlayer.activeEffects['ricaRun'] > Date.now()) || 
          (myPlayer.activeEffects?.['toothDash'] && myPlayer.activeEffects['toothDash'] > Date.now()) || isColeRoll) {
          
          const isRica = myPlayer.activeEffects?.['ricaRun'] > Date.now();
          const damage = isColeRoll ? 0 : (isRica ? 30 : 10);
          
          Object.values(playersRef.current).forEach((target: Player) => {
              if (target.id === myId) return;
              if (hitCooldownsRef.current[target.id]) return; // already hit
              
              if (myPlayer.x < target.x + target.width &&
                  myPlayer.x + myPlayer.width > target.x &&
                  myPlayer.y < target.y + target.height &&
                  myPlayer.y + myPlayer.height > target.y) {
                      
                  hitCooldownsRef.current[target.id] = 1;
                  socket.emit('playerHit', { targetId: target.id, damage });

                  const dirX = myPlayer.facing === 'right' ? 1 : -1;
                  
                  if (isColeRoll) {
                      socket.emit('playerKnockback', {
                          targetId: target.id,
                          vx: dirX * 15,
                          vy: -10,
                          stunFrames: 20
                      });
                  } else if (isRica) {
                      socket.emit('playerKnockback', {
                          targetId: target.id,
                          vx: dirX * 18,
                          vy: -15,
                          stunFrames: 25
                      });
                  } else {
                      socket.emit('playerKnockback', {
                          targetId: target.id,
                          vx: dirX * 10,
                          vy: -5,
                          stunFrames: 10
                      });
                  }
              }
          });
      }

      // Platform collision
      for (const plat of PLATFORMS) {
          // Check if falling down and overlapping horizontally
          if (
              prevVelocityY >= 0 && 
              prevBottom <= plat.y && 
              myPlayer.y + myPlayer.height >= plat.y && 
              myPlayer.x + myPlayer.width > plat.x && 
              myPlayer.x < plat.x + plat.width
          ) {
              myPlayer.y = plat.y - myPlayer.height;
              myPlayer.velocity.y = 0;
              grounded = true;
              break;
          }
      }

      const wasGrounded = myPlayer.isGrounded;
      myPlayer.isGrounded = grounded;
      
      // Ground Slam detection
      if (grounded && !wasGrounded) {
          if (myPlayer.isFastFalling && !myPlayer.isStunned) {
              // Trigger Slam!
              myPlayer.isStunned = true;
              myPlayer.isAttacking = false;
              
              const isCole = myPlayer.characterId === 'cole';
              const slamDamage = isCole ? 50 : 20;
              const victimStun = isCole ? 40 : 20;

              const slamX = myPlayer.x + myPlayer.width / 2;
              const slamY = myPlayer.y + myPlayer.height;
              
              spawnSlamParticles(slamX, slamY, myPlayer.color);
              socket.emit('groundSlamEffect', { x: slamX, y: slamY, color: myPlayer.color });
              
              // AoE Hit detection
              let hitSomeone = false;
              Object.values(playersRef.current).forEach((target: Player) => {
                  if (target.id === myId) return;
                  if (!target.isGrounded) return; // Targets MUST be on ground to be hit by slam
                  
                  const targetCenterX = target.x + target.width / 2;
                  const targetCenterY = target.y + target.height / 2;
                  const dist = Math.hypot(targetCenterX - slamX, targetCenterY - slamY);
                  
                  if (dist < 120) { // SLAM_RADIUS reduced to 120
                      socket.emit('playerHit', { targetId: target.id, damage: slamDamage });
                      
                      const dirX = targetCenterX > slamX ? 1 : -1;
                      const knockbackX = dirX * (20 - (dist / 120) * 10);
                      const knockbackY = -15;
                      
                      socket.emit('playerKnockback', { 
                          targetId: target.id, 
                          vx: knockbackX, 
                          vy: knockbackY,
                          stunFrames: victimStun 
                      });
                      hitSomeone = true;
                  }
              });

              Object.values(entitiesRef.current.drones).forEach((drone: Drone) => {
                  const dist = Math.hypot(drone.x - slamX, drone.y - slamY);
                  if (dist < 120) {
                      socket.emit('droneHit', { id: drone.id, damage: 20 });
                  }
              });
              
              if (isCole) {
                  stunTimerRef.current = hitSomeone ? 20 : 40;
              } else {
                  stunTimerRef.current = hitSomeone ? 12 : 24;
              }
          }
          myPlayer.isFastFalling = false;
      }
      
      // Pip Hover mechanics
      if (myPlayer.characterId === 'pip' || myPlayer.characterId === 'nexus') {
          const platformTop = PLATFORMS[0].y;
          const floatOffset = myPlayer.characterId === 'nexus' ? 10 : 0;
          if (myPlayer.y > platformTop - myPlayer.height - floatOffset) {
              myPlayer.y = platformTop - myPlayer.height - floatOffset;
              myPlayer.velocity.y = 0;
              myPlayer.isGrounded = true;
              myPlayer.isFastFalling = false;
          }
      }

      // Side bounds (Blast zones)
      if (myPlayer.characterId === 'wax') {
          if (myPlayer.x < 212) myPlayer.x = 212;
          if (myPlayer.x + myPlayer.width > 812) myPlayer.x = 812 - myPlayer.width;
      } else {
          if (myPlayer.x < -200) myPlayer.x = -200;
          if (myPlayer.x + myPlayer.width > 1224) myPlayer.x = 1224 - myPlayer.width;
      }

      // Send update to server (could optimize to only send on change)
      socket.emit('playerMovement', {
        x: myPlayer.x,
        y: myPlayer.y,
        velocity: myPlayer.velocity,
        facing: myPlayer.facing,
        isGrounded: myPlayer.isGrounded,
        isGrabbingLedge: myPlayer.isGrabbingLedge,
        isStunned: myPlayer.isStunned,
        isFastFalling: myPlayer.isFastFalling
      });

      // Keep playersList in sync every frame so DOM sprite overlay updates position
      setPlayersList(Object.values(playersRef.current));
      // Keep Pinedo projectiles in sync for DOM spinning head overlay
      const pinedoOwners = new Set(
        Object.values(playersRef.current).filter(p => p.characterId === 'pinedo').map(p => p.id)
      );
      const booms = Object.values(entitiesRef.current.projectiles)
        .filter(pr => pr.type === 'boomerang' && pinedoOwners.has(pr.ownerId))
        .map(pr => ({ id: pr.id, x: pr.x, y: pr.y }));
      setPinedoProjectiles(booms);
      // Update Mirage overlay with trail
      const miragePlayers = Object.values(playersRef.current).filter(p => p.characterId === 'mirage');
      if (miragePlayers.length > 0) {
        const mp = miragePlayers[0];
        const isMoving = (mp.mirageState === 'midflight' || mp.mirageState === 'movestart') && Math.abs(mp.velocity?.x || 0) > 0.5;
        if (isMoving) {
          mirageTrailRef.current.push({ x: mp.x, y: mp.y, facing: mp.facing, alpha: 0.6 });
          if (mirageTrailRef.current.length > 3) mirageTrailRef.current.shift();
        } else {
          mirageTrailRef.current = [];
        }
        setMirageOverlay(miragePlayers.map(p => ({
          id: p.id, x: p.x, y: p.y,
          state: p.mirageState || 'idle',
          facing: p.facing,
          trail: [...mirageTrailRef.current]
        })));
      } else {
        setMirageOverlay([]);
      }
    };

    const checkHits = (attacker: Player) => {
        // Define attack hitbox
        const hitBox = {
            x: attacker.facing === 'right' ? attacker.x + attacker.width : attacker.x - ATTACK_RANGE,
            y: attacker.y,
            width: ATTACK_RANGE,
            height: attacker.height
        };

        // Check against all other players
        Object.values(playersRef.current).forEach((target: Player) => {
            if (target.id === attacker.id) return;
            if (hitCooldownsRef.current[target.id]) return; // already hit in this attack
            
            if (hitBox.x < target.x + target.width &&
                hitBox.x + hitBox.width > target.x &&
                hitBox.y < target.y + target.height &&
                hitBox.height + hitBox.y > target.y) {
                    
                    // Hit!
                    hitCooldownsRef.current[target.id] = 1;
                    socket.emit('playerHit', { targetId: target.id, damage: 15 });

                    // Basic knockback
                    const dirX = attacker.facing === 'right' ? 1 : -1;
                    socket.emit('playerKnockback', {
                        targetId: target.id,
                        vx: dirX * 12,
                        vy: -8,
                        stunFrames: 15
                    });
            }
        });

        // Check against drones
        Object.values(entitiesRef.current.drones).forEach((drone: Drone) => {
            if (hitBox.x < drone.x + 10 &&
                hitBox.x + hitBox.width > drone.x - 10 &&
                hitBox.y < drone.y + 10 &&
                hitBox.height + hitBox.y > drone.y - 10) {
                    socket.emit('droneHit', { id: drone.id, damage: 15 });
            }
        });
    };

    const render = () => {
      // Clear canvas for void aesthetic
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw platforms
      PLATFORMS.forEach(plat => {
          // Base
          ctx.fillStyle = '#0a0a0f';
          ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
          
          // Outline
          ctx.strokeStyle = '#4f46e5';
          ctx.lineWidth = 1;
          ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
          
          // Glow effect on top edge
          ctx.fillStyle = 'rgba(129, 140, 248, 0.4)';
          ctx.fillRect(plat.x, plat.y, plat.width, 3);
      });

      // Draw particles
      particlesRef.current.forEach(p => {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
          ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
      });
      ctx.globalAlpha = 1.0;

      // Draw entities
      (Object.values(entitiesRef.current.zones) as Zone[]).forEach(zone => {
          ctx.beginPath();
          ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(6, 182, 212, 0.25)'; // Increased opacity
          ctx.fill();
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 4; // Increased thickness
          ctx.setLineDash([10, 10]); // Bigger dashes
          ctx.stroke();
          ctx.setLineDash([]);
      });

      (Object.values(entitiesRef.current.walls) as Wall[]).forEach(wall => {
          if (wall.type === 'fire') {
              ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
              ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
              ctx.strokeStyle = '#3b82f6';
              ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
          } else if (wall.type === 'bloodCloud') {
              ctx.fillStyle = 'rgba(220, 38, 38, 0.4)';
              ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
              ctx.fillStyle = 'rgba(220, 38, 38, 0.8)';
              for(let i=0; i<wall.width; i+=15) {
                  ctx.fillRect(wall.x + i, wall.y, 4, wall.height * (0.3 + 0.7 * Math.sin(Date.now()/200 + i)));
              }
          } else if (wall.type === 'bramble') {
              ctx.fillStyle = '#166534';
              ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
              ctx.fillStyle = '#22c55e';
              for (let i = 0; i < wall.width; i += 10) {
                  ctx.beginPath();
                  ctx.moveTo(wall.x + i, wall.y);
                  ctx.lineTo(wall.x + i + 5, wall.y - 10);
                  ctx.lineTo(wall.x + i + 10, wall.y);
                  ctx.fill();
              }
          } else {
              ctx.fillStyle = 'rgba(168, 85, 247, 0.6)';
              ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
              ctx.strokeStyle = '#a855f7';
              ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
          }
      });

      (Object.values(entitiesRef.current.projectiles) as Projectile[]).forEach(proj => {
          if (proj.type === 'card') {
              ctx.fillStyle = '#fff';
              ctx.fillRect(proj.x, proj.y - 5, 20, 15);
              ctx.strokeStyle = '#a855f7';
              ctx.strokeRect(proj.x, proj.y - 5, 20, 15);
          } else if (proj.type === 'plate') {
              ctx.fillStyle = '#ccc';
              ctx.beginPath();
              ctx.ellipse(proj.x + 10, proj.y, 15, 5, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#fff';
              ctx.stroke();
          } else if (proj.type === 'fireball') {
              ctx.fillStyle = '#ef4444';
              ctx.beginPath();
              ctx.arc(proj.x + 10, proj.y, 12, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#f97316';
              ctx.beginPath();
              ctx.arc(proj.x + 10, proj.y, 6, 0, Math.PI * 2);
              ctx.fill();
          } else if (proj.type === 'laser') {
              ctx.fillStyle = '#f97316';
              ctx.fillRect(proj.x - 15, proj.y - 3, 30, 6);
          } else if (proj.type === 'thorn') {
              ctx.fillStyle = '#22c55e';
              ctx.beginPath();
              ctx.moveTo(proj.x, proj.y);
              ctx.lineTo(proj.x + (proj.vx > 0 ? 15 : -15), proj.y - 4);
              ctx.lineTo(proj.x + (proj.vx > 0 ? 15 : -15), proj.y + 4);
              ctx.fill();
          } else if (proj.type === 'boomerang') {
              const boomerangOwner = Object.values(playersRef.current).find(p => p.id === proj.ownerId);
              if (boomerangOwner?.characterId === 'pinedo') {
                  // Rendered as DOM element (spinning CSS animation) — skip canvas draw
              } else {
                  ctx.save();
                  ctx.translate(proj.x + 15, proj.y + 15);
                  ctx.rotate(Date.now() / 100);
                  ctx.fillStyle = '#fff';
                  ctx.beginPath();
                  ctx.moveTo(-15, -15);
                  ctx.lineTo(15, 0);
                  ctx.lineTo(-15, 15);
                  ctx.lineTo(-5, 0);
                  ctx.closePath();
                  ctx.fill();
                  ctx.restore();
              }
          } else if (proj.type === 'lantern') {
              // Glowing lantern lob
              ctx.save();
              ctx.shadowBlur = 16;
              ctx.shadowColor = '#fef08a';
              ctx.fillStyle = '#fef08a';
              ctx.beginPath();
              ctx.arc(proj.x, proj.y, 10, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#f59e0b';
              ctx.beginPath();
              ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
          } else if (proj.type === 'book') {
              ctx.fillStyle = '#7c3aed';
              ctx.fillRect(proj.x - 8, proj.y - 6, 16, 12);
              ctx.fillStyle = '#ddd6fe';
              ctx.fillRect(proj.x - 6, proj.y - 4, 12, 2);
              ctx.fillRect(proj.x - 6, proj.y, 12, 2);
          } else if (proj.type === 'dart') {
              ctx.fillStyle = '#1e1b2e';
              ctx.beginPath();
              ctx.ellipse(proj.x, proj.y, 8, 4, Math.atan2(proj.vy, proj.vx), 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#7c3aed';
              ctx.beginPath();
              ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
              ctx.fill();
          } else if (proj.type === 'fallingBook') {
              ctx.fillStyle = '#6d28d9';
              ctx.fillRect(proj.x - 10, proj.y - 8, 20, 16);
              ctx.fillStyle = '#c4b5fd';
              ctx.fillRect(proj.x - 8, proj.y - 5, 16, 2);
              ctx.fillRect(proj.x - 8, proj.y, 16, 2);
          } else if (proj.type === 'inkBlob') {
              ctx.save();
              ctx.shadowBlur = 10;
              ctx.shadowColor = '#1e1b2e';
              ctx.fillStyle = '#312e81';
              ctx.beginPath();
              ctx.arc(proj.x, proj.y, 14, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#4c1d95';
              ctx.beginPath();
              ctx.arc(proj.x - 4, proj.y + 4, 7, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
          } else if (proj.type === 'bullet') {
              ctx.fillStyle = '#facc15';
              ctx.fillRect(proj.x - 8, proj.y - 2, 16, 4);
              ctx.fillStyle = '#f97316';
              ctx.fillRect(proj.x + 4, proj.y - 2, 4, 4);
          } else if (proj.type === 'paintLob') {
              const colors = ['#ec4899','#f472b6','#db2777','#be185d'];
              ctx.fillStyle = colors[Math.floor(Date.now()/100) % colors.length];
              ctx.beginPath();
              ctx.arc(proj.x, proj.y, 10, 0, Math.PI * 2);
              ctx.fill();
          } else if (proj.type === 'paintTrap') {
              // Paint puddle on ground
              ctx.fillStyle = 'rgba(236,72,153,0.7)';
              ctx.beginPath();
              ctx.ellipse(proj.x + 15, proj.y + 5, 28, 10, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#ec4899';
              ctx.lineWidth = 2;
              ctx.stroke();
              ctx.lineWidth = 1;
          }
      });

      (Object.values(entitiesRef.current.drones) as Drone[]).forEach(drone => {
          const isA = drone.type === 'A';
          const isB = drone.type === 'B';
          const isC = drone.type === 'C';
          const radius = isA ? 5 : (isB ? 8 : (isC ? 10 : 10));
          ctx.fillStyle = isA ? '#60a5fa' : (isB ? '#f87171' : (isC ? '#facc15' : '#ef4444'));
          ctx.beginPath();
          ctx.arc(drone.x, drone.y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.stroke();
          if (!isC) {
              ctx.fillStyle = '#000';
              ctx.fillRect(drone.x + (drone.vx > 0 ? 3 : -5), drone.y - 2, 2, 2);
          }
      });

      // Draw players
      Object.values(playersRef.current).forEach((player: Player) => {
        if (player.isStunned) {
            ctx.globalAlpha = 0.5;
        }

        let hideStandardBody = false;
        if (player.activeEffects?.['coleRoll'] && player.activeEffects['coleRoll'] > Date.now()) {
            hideStandardBody = true;
            ctx.save();
            ctx.translate(player.x + player.width/2, player.y + player.height/2);
            ctx.rotate(Date.now() / 50 * (player.facing === 'right' ? 1 : -1));
            ctx.fillStyle = player.color;
            ctx.fillRect(-player.width/2, -player.height/2, player.width, player.height);
            ctx.restore();
        }

        // ── Pinedo: hidden from canvas — rendered as DOM overlay beneath ──────
        if (player.characterId === 'pinedo' || player.characterId === 'mirage') {
            hideStandardBody = true;
        }

        if (!hideStandardBody) {
            // Body
            ctx.fillStyle = player.color;
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }

        // Name tag (if me, show "You", else show ID prefix)
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        const name = player.id === myId ? 'You' : `P-${player.id.substring(0,4)}`;
        ctx.fillText(name, player.x + player.width/2, player.y - 30);
        
        // Score tag
        ctx.fillStyle = '#ffcc00';
        ctx.fillText(`Kills: ${player.score}`, player.x + player.width/2, player.y - 15);

        // Health bar
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(player.x, player.y - 10, player.width, 5);
        ctx.fillStyle = '#00ff00';
        const hpPercent = Math.max(0, player.health / player.maxHealth);
        ctx.fillRect(player.x, player.y - 10, hpPercent * player.width, 5);

        // Draw weapon/attack
        if (player.activeEffects?.['nexusMelee'] && player.activeEffects['nexusMelee'] > Date.now()) {
             ctx.fillStyle = '#f97316';
             const range = 60;
             if (player.facing === 'right') {
                 ctx.fillRect(player.x + player.width, player.y + 10, range, 20);
             } else {
                 ctx.fillRect(player.x - range, player.y + 10, range, 20);
             }
        }
        if (player.isAttacking) {
             ctx.fillStyle = 'white';
             if (player.facing === 'right') {
                 ctx.fillRect(player.x + player.width, player.y + 10, ATTACK_RANGE, 10);
             } else {
                 ctx.fillRect(player.x - ATTACK_RANGE, player.y + 10, ATTACK_RANGE, 10);
             }
        } else if (!hideStandardBody) {
            // Draw eyes to show facing direction
            ctx.fillStyle = 'black';
            if (player.facing === 'right') {
                ctx.fillRect(player.x + player.width - 15, player.y + 10, 5, 5);
            } else {
                ctx.fillRect(player.x + 10, player.y + 10, 5, 5);
            }
        }

        if (player.activeEffects?.['deflect'] && player.activeEffects['deflect'] > Date.now()) {
            ctx.beginPath();
            ctx.arc(player.x + player.width/2, player.y + player.height/2, player.width, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
            ctx.fill();
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.lineWidth = 1;
        }

        if (player.activeEffects?.['warpCharge'] && player.activeEffects['warpCharge'] > Date.now()) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }

        if (player.activeEffects?.['ricaCharge'] && player.activeEffects['ricaCharge'] > Date.now()) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(player.x - 5, player.y - 5, player.width + 10, player.height + 10);
        }

        if (player.activeEffects?.['wombo'] && player.activeEffects['wombo'] > Date.now()) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(player.x + player.width/2, player.y + player.height/2, 80, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (player.activeEffects?.['ricaGrabbed'] && player.activeEffects['ricaGrabbed'] > Date.now()) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.strokeRect(player.x - 2, player.y - 2, player.width + 4, player.height + 4);
            ctx.lineWidth = 1;
        }

        if (player.activeEffects?.['mimic'] && player.activeEffects['mimic'] > Date.now()) {
            ctx.strokeStyle = '#a16207';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(player.x, player.y - 10);
            ctx.lineTo(player.x + player.width, player.y - 10);
            ctx.stroke();
            ctx.lineWidth = 1;
            ctx.fillStyle = 'rgba(139, 69, 19, 0.5)';
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }

        if (player.activeEffects?.['toothDash'] && player.activeEffects['toothDash'] > Date.now()) {
            ctx.fillStyle = 'white';
            ctx.fillRect(player.x + (player.facing === 'right' ? player.width : -10), player.y + player.height / 2, 10, 10);
        }
        
        if (player.activeEffects?.['healBuff'] && player.activeEffects['healBuff'] > Date.now()) {
            ctx.strokeStyle = '#22c55e';
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(player.x - 5, player.y - 5, player.width + 10, player.height + 10);
            ctx.setLineDash([]);
        }

        if (player.activeEffects?.['brambleImmune'] && player.activeEffects['brambleImmune'] > Date.now()) {
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.strokeRect(player.x - 4, player.y - 4, player.width + 8, player.height + 8);
            ctx.lineWidth = 1;
        }

        // Ink slow visual
        if (player.activeEffects?.['inkSlowed'] && player.activeEffects['inkSlowed'] > Date.now()) {
            ctx.fillStyle = 'rgba(124,58,237,0.35)';
            ctx.fillRect(player.x, player.y, player.width, player.height);
            ctx.strokeStyle = '#7c3aed';
            ctx.lineWidth = 2;
            ctx.setLineDash([4,4]);
            ctx.strokeRect(player.x - 3, player.y - 3, player.width + 6, player.height + 6);
            ctx.setLineDash([]);
            ctx.lineWidth = 1;
        }

        // Kaelen tactical roll i-frames flash
        if (player.activeEffects?.['kaelenRoll'] && player.activeEffects['kaelenRoll'] > Date.now()) {
            ctx.fillStyle = 'rgba(74,222,128,0.4)';
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }

        ctx.globalAlpha = 1.0;
      });

      // Draw Kaelen bomb indicator (world space)
      if (kaelenBombRef.current) {
          const bx = kaelenBombRef.current.x;
          const by = kaelenBombRef.current.y;
          ctx.save();
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 3]);
          ctx.beginPath();
          ctx.arc(bx, by, 150, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(bx, by, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(bx, by, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.restore();
      }

      // ── Screen-space overlay effects (drawn last so they cover everything) ──
      const se = screenEffectRef.current;
      if (se && Date.now() < se.expiresAt) {
          const timeLeft = se.expiresAt - Date.now();
          if (se.type === 'blind') {
              // Pitch black — only the local player sprite is visible
              // Draw black over everything first
              ctx.fillStyle = '#000';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              // Redraw only the local player on top
              const me = playersRef.current[myId];
              if (me) {
                  ctx.fillStyle = me.color;
                  ctx.fillRect(me.x, me.y, me.width, me.height);
                  ctx.fillStyle = '#fff';
                  ctx.font = '12px Arial';
                  ctx.textAlign = 'center';
                  ctx.fillText('You', me.x + me.width/2, me.y - 10);
              }
          } else if (se.type === 'paintCover') {
              // Paint blobs sliding off — alpha based on time remaining
              const alpha = Math.min(0.98, timeLeft / 4000);
              const paintColors = ['#ec4899','#f472b6','#db2777','#be185d','#9d174d','#831843'];
              // Seed-based blobs so they don't flicker every frame
              const seed = Math.floor(timeLeft / 200); // changes every 200ms for slide effect
              // First fill the whole canvas with a base paint layer
              ctx.globalAlpha = Math.min(0.85, alpha);
              ctx.fillStyle = '#db2777';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              for (let i = 0; i < 24; i++) {
                  const bx = ((i * 137 + seed * 31) % canvas.width);
                  const by = ((i * 211 + seed * 53) % canvas.height) + (timeLeft < 2000 ? (2000 - timeLeft) / 8 : 0);
                  const br = 60 + (i % 5) * 25;
                  ctx.globalAlpha = alpha * (0.85 + (i % 3) * 0.05);
                  ctx.fillStyle = paintColors[i % paintColors.length];
                  ctx.beginPath();
                  ctx.ellipse(bx, by, br, br * 0.7, (i * 0.4), 0, Math.PI * 2);
                  ctx.fill();
              }
              ctx.globalAlpha = 1.0;
          }
      } else if (se && Date.now() >= se.expiresAt) {
          screenEffectRef.current = null;
      }
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [socket, myId, appState]);

  if (appState === 'LOBBY') {
    const me = lobbyPlayers[myId];
    const isReady = me?.isReady;
    
    return (
      <div className="w-full min-h-screen bg-[#050508] text-white font-sans overflow-hidden relative flex flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_#1a1a2e_0%,_#050508_70%)] opacity-50 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}></div>

        <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col p-8 flex-1">
          <header className="mb-12 text-center">
            <h1 className="text-4xl font-black tracking-tighter italic text-white mb-2">ROSE FIGHTERS</h1>
            <p className="text-indigo-400 text-sm uppercase tracking-widest font-bold">Waiting for players...</p>
          </header>

          <div className="flex flex-col gap-12 mb-12">
            {[...new Set(ROSTER.map(c => c.category))].map(category => (
              <div key={category}>
                <h2 className="text-2xl font-bold italic text-white mb-6 border-b border-white/10 pb-2">{category}</h2>
                <div className="grid grid-cols-4 gap-6">
                  {ROSTER.filter(c => c.category === category).map((char) => {
                     const playersArray = Object.values(lobbyPlayers) as LobbyPlayer[];
               const playerOwner = playersArray.find(p => p.characterId === char.id);
               const isTaken = !!playerOwner;
               const isMe = playerOwner?.id === myId;
               
               let borderClass = 'border-white/10';
               let opacityClass = 'opacity-100';
               let selectionText = '';
               
               if (isTaken) {
                  if (isMe) {
                     borderClass = 'border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.5)]';
                     selectionText = 'YOUR SELECTION';
                  } else {
                     borderClass = 'border-red-500/50';
                     opacityClass = 'opacity-50 grayscale';
                     selectionText = 'TAKEN';
                  }
               }
               
               return (
                 <button 
                   key={char.id}
                   disabled={isTaken && !isMe}
                   onClick={() => socket?.emit('selectCharacter', char.id)}
                   className={`relative flex flex-col items-center justify-center bg-black/60 p-6 rounded-xl border-2 ${borderClass} ${opacityClass} hover:border-indigo-400 transition-all cursor-pointer`}
                 >
                    {char.id === 'pinedo' ? (
                      <img src="/Pinedo/PinedoIcon.png" alt="Pinedo" className="w-16 h-16 object-contain mb-4" style={{ imageRendering: 'pixelated' }} />
                    ) : char.id === 'mirage' ? (
                      <img src="/Mirage/MirageIcon.png" alt="Mirage" className="w-16 h-16 object-contain mb-4" style={{ imageRendering: 'pixelated' }} />
                    ) : (
                      <div className="w-16 h-16 rounded-lg mb-4 rotate-12" style={{ backgroundColor: char.color }}></div>
                    )}
                    <span className="font-bold tracking-tight text-lg mb-1">{char.name}</span>
                    <div className="h-4">
                       {isTaken && <span className={`text-[10px] uppercase tracking-widest ${isMe ? 'text-indigo-400' : 'text-red-400'}`}>{selectionText}</span>}
                    </div>
                 </button>
                 )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-auto">
            <button
              disabled={!me?.characterId}
              onClick={() => socket?.emit('toggleReady')}
              className={`px-12 py-4 rounded-full font-black text-2xl tracking-tighter italic uppercase transition-all
                ${!me?.characterId ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 
                  isReady ? 'bg-green-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.6)]' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}
              `}
            >
              {isReady ? 'READY!' : 'LOCK IN'}
            </button>
          </div>
          
          <div className="mt-8 text-center flex flex-col items-center">
            <div className="text-sm text-gray-500 uppercase tracking-widest font-bold mb-4">
              Players Ready: {(Object.values(lobbyPlayers) as LobbyPlayer[]).filter(p => p.isReady).length} / {Object.keys(lobbyPlayers).length}
            </div>
            
            <div className="bg-indigo-950/30 border border-indigo-500/30 p-4 rounded-lg max-w-md w-full">
              <p className="text-xs text-indigo-300 uppercase tracking-widest font-bold mb-2">Invite Friends</p>
              <p className="text-xs text-gray-400 mb-2">Players must be on this EXACT URL to join the same lobby:</p>
              <div className="bg-black/50 p-2 rounded border border-white/10 text-center select-all cursor-pointer hover:border-indigo-400 transition-colors">
                <code className="text-indigo-400 text-sm">{typeof window !== 'undefined' ? window.location.origin : ''}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-[#050508] text-white font-sans overflow-hidden relative flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_#1a1a2e_0%,_#050508_70%)] opacity-50 pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}></div>

      <header className="relative z-10 flex justify-between items-center px-12 py-8 shrink-0">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.3em] text-indigo-400 font-bold">Multiplayer Session</span>
          <h1 className="text-2xl font-black tracking-tighter italic">ROSE FIGHTERS <span className="text-indigo-500">α</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-gray-500">Controls</span>
            <span className="text-sm font-mono font-bold text-white">WASD Move, Mouse to Attack</span>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-indigo-500 flex items-center justify-center bg-indigo-500/10">
            <div className={`w-2 h-2 rounded-full ${myId ? 'bg-indigo-400 animate-pulse' : 'bg-amber-500 animate-pulse'}`}></div>
          </div>
        </div>
      </header>

      <main className="relative flex-1 flex items-center justify-center overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-48 h-2 bg-indigo-500/30 rounded-full blur-sm pointer-events-none"></div>
        <div className="absolute top-1/4 right-1/4 w-48 h-2 bg-purple-500/30 rounded-full blur-sm pointer-events-none"></div>
        
        <div className="relative z-10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] rounded-xl border-t border-white/10 overflow-hidden bg-black/60">
            <canvas
              ref={canvasRef}
              width={1024}
              height={600}
              className="block"
              style={{ imageRendering: 'pixelated' }}
              onContextMenu={(e) => e.preventDefault()}
            />
            {/* Pinedo DOM sprite overlay — GIFs must be in DOM to animate */}
            <div className="absolute inset-0 pointer-events-none" style={{ width: 1024, height: 600 }}>
              {/* Spinning head projectiles */}
              {pinedoProjectiles.map(proj => (
                <img
                  key={proj.id + '-proj'}
                  src="/Pinedo/PinedoProjectile.png"
                  alt=""
                  className="pinedo-projectile"
                  style={{ left: proj.x - 6.5, top: proj.y - 20 }}
                />
              ))}

              {/* Mirage DOM sprite overlay */}
              {mirageOverlay.map(m => {
                const drawH = 62;
                const drawW = drawH;
                const bottom = m.y + 50 + 4;
                const top = bottom - drawH;
                const left = m.x + 25 - drawW / 2;
                const src =
                  m.state === 'attack1' || m.state === 'attack2' ? '/Mirage/MirageAttack2.gif' :
                  m.state === 'attack3' ? '/Mirage/MirageAttack3.gif' :
                  m.state === 'attack3reverse' ? '/Mirage/MirageAttack3.gif' :
                  m.state === 'movestart' ? '/Mirage/MirageMoveStart.gif' :
                  m.state === 'midflight' ? '/Mirage/MirageMidFlight.png' :
                  m.state === 'movestop' ? '/Mirage/MirageMoveStart.gif' :
                  '/Mirage/MirageIdle.gif';
                const flip = m.facing === 'right';
                const isReverse = m.state === 'attack3reverse' || m.state === 'movestop';
                return (
                  <div key={m.id + '-mirage'} style={{ position: 'absolute', left: 0, top: 0, width: 1024, height: 600, pointerEvents: 'none' }}>
                    {/* Silhouette trail — 3 fading copies when moving */}
                    {m.trail.map((t, i) => (
                      <img key={i} src="/Mirage/MirageMidFlight.png" alt="" style={{
                        position: 'absolute',
                        left: t.x + 25 - drawW / 2,
                        top: t.y + 50 + 4 - drawH,
                        width: drawW, height: drawH,
                        imageRendering: 'pixelated',
                        opacity: (i + 1) / (m.trail.length + 1) * 0.5,
                        transform: t.facing === 'right' ? 'scaleX(-1)' : 'none',
                        transformOrigin: 'center center',
                        filter: 'brightness(0) invert(1)',
                      }} />
                    ))}
                    {/* Main sprite */}
                    <img src={src} alt="" style={{
                      position: 'absolute',
                      left, top, width: drawW, height: drawH,
                      imageRendering: 'pixelated',
                      transform: `${flip ? 'scaleX(-1)' : ''} ${isReverse ? 'scaleY(-1)' : ''}`.trim() || 'none',
                      transformOrigin: 'center center',
                    }} />
                  </div>
                );
              })}
              {playersList.filter(p => p.characterId === 'pinedo').map(p => {
                const state = p.pinedoState || 'idle';
                // Pick src and whether sprite is 160px wide (attack) or 128px
                const isAttack = state === 'attack1' || state === 'attack2';
                const src =
                  state === 'run'         ? '/Pinedo/PinedoRungif.gif'      :
                  state === 'attack1'     ? '/Pinedo/PinedoAttack1gif.gif'  :
                  state === 'attack2'     ? '/Pinedo/PinedoAttack2gif.gif'  :
                  state === 'waiting'     ? '/Pinedo/PinedoWaiting.png'     :
                  state === 'attack3start'? '/Pinedo/PinedoAttack3start.gif':
                  state === 'attack3main' ? '/Pinedo/PinedoAttack3main.gif' :
                                            '/Pinedo/PinedoIdlegif.gif';

                // Render height: scale sprite so it visually covers the 50px collision box
                // 128px sprite → we want it to look ~90px tall on screen for visibility
                const drawH = 62;
                const drawW = isAttack ? drawH * (160 / 128) : drawH;
                const bottom = p.y + p.height + 4;
                const top = bottom - drawH;

                // Horizontal: center body on player center
                // For attack sprites (160px), body is in the left 128px portion (faces left by default).
                // Extension (32px scaled) goes to the right for left-facing, left for right-facing.
                const playerCenterX = p.x + p.width / 2;
                // Always center the sprite on the player center.
                // CSS scaleX(-1) mirrors around the element's own center, so the
                // 32px attack extension naturally flips to the correct (forward) side.
                // No manual offset needed for either facing direction.
                const left = playerCenterX - drawW / 2;

                return (
                  <img
                    key={p.id + '-sprite'}
                    src={src}
                    alt=""
                    style={{
                      position: 'absolute',
                      left,
                      top,
                      width: drawW,
                      height: drawH,
                      imageRendering: 'pixelated',
                      // Sprites face LEFT by default — flip for right-facing
                      transform: p.facing === 'right' ? 'scaleX(-1)' : 'none',
                      transformOrigin: 'center center',
                    }}
                  />
                );
              })}
            </div>
        </div>
      </main>

      <footer className="relative z-10 grid grid-cols-2 gap-8 px-12 pb-12 shrink-0">
        {playersList.slice(0, 2).map((p, idx) => {
          const isMe = p.id === myId;
          const name = isMe ? 'P1 • YOU' : `P${idx + 1} • P-${p.id.substring(0, 4).toUpperCase()}`;
          const colorClass = idx === 0 ? 'indigo' : 'purple';
          const bgGlowClass = idx === 0 ? 'bg-indigo-600/20' : 'bg-purple-600/20';
          const borderClass = idx === 0 ? 'border-indigo-500/50' : 'border-purple-500/50';
          const iconBgClass = idx === 0 ? 'bg-indigo-900/50' : 'bg-purple-900/50';
          const iconBorderClass = idx === 0 ? 'border-indigo-400/30' : 'border-purple-400/30';
          const iconColorClass = idx === 0 ? 'bg-indigo-400' : 'bg-purple-400';
          const textColorClass = idx === 0 ? 'text-indigo-400' : 'text-purple-400';
          const textMutedClass = idx === 0 ? 'text-indigo-300' : 'text-purple-300';
          
          return (
            <div key={p.id} className="relative group">
              <div className={`absolute inset-0 ${bgGlowClass} blur-xl rounded-2xl`}></div>
              <div className={`relative bg-black/60 border ${borderClass} rounded-2xl p-6 flex items-center gap-6`}>
                <div className={`w-20 h-20 ${iconBgClass} rounded-xl border ${iconBorderClass} flex items-center justify-center overflow-hidden`}>
                  {p.characterId === 'pinedo' ? (
                    <img src="/Pinedo/PinedoIcon.png" alt="Pinedo" className="w-14 h-14 object-contain" style={{ imageRendering: 'pixelated' }} />
                  ) : p.characterId === 'mirage' ? (
                    <img src="/Mirage/MirageIcon.png" alt="Mirage" className="w-14 h-14 object-contain" style={{ imageRendering: 'pixelated' }} />
                  ) : (
                    <div className={`w-12 h-12 rounded-lg ${idx === 0 ? 'rotate-12' : '-rotate-12'}`} style={{ backgroundColor: p.color }}></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-end mb-1">
                    <div className="flex flex-col">
                      <span className={`text-[10px] uppercase tracking-widest ${textMutedClass}`}>{name}</span>
                      <span className="text-sm font-bold uppercase tracking-tighter text-white">
                        Playing as {ROSTER.find(c => c.id === p.characterId)?.name || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <span className={`text-[10px] uppercase tracking-widest ${textMutedClass}`}>Kills: {p.score}</span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black italic tracking-tighter text-white">{p.health}</span>
                    <span className={`text-2xl font-bold ${textColorClass}`}>HP</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </footer>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 pointer-events-none z-20">
        <span className="text-[9px] uppercase tracking-widest text-gray-400">Server Status:</span>
        <span className={`text-[9px] font-bold uppercase tracking-widest ${myId ? 'text-green-400' : 'text-amber-400'}`}>
          {myId ? 'Stable' : 'Connecting'}
        </span>
        <div className="w-[1px] h-3 bg-white/20"></div>
        <span className="text-[9px] uppercase tracking-widest text-gray-400">Players: {playersList.length}</span>
      </div>
    </div>
  );
}
