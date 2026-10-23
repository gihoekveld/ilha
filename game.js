/**
 * Ilha Viva - Jogo de Aventura 2D em HTML5 Canvas
 * 
 * Personagens com Identidade da Fauna Brasileira:
 * - Protagonista: Lia, o Lobo-Guará (pelagem ruiva, crina negra, patas pretas, orelhas pontudas, mochila).
 * - Guarda / Perigo: Onça-Pintada Espectral (corpo felino musculoso, orelhas arredondadas, rosetas escuras, aura de névoa).
 * 
 * Áudio Procedural (Web Audio API - Zero dependências externas):
 * - Três sons curtos e distintos:
 *   1. Coleta: Chime cristalino e alegre (duas notas ascendentes harmônicas).
 *   2. Derrota: Dissipação espectral sombria em tom descendente suave.
 *   3. Conclusão: Fanfarra arpejada triunfal em acorde maior de natureza.
 * - Loop com música de fundo de floresta:
 *   - Ventania suave (ruído filtrado em ressonância com LFO orgânico).
 *   - Pássaros florestais esporádicos (canários cantando em frequências moduladas).
 *   - Melodia harmoniosa pentatônica suave ao fundo.
 * - Ativação após interação do usuário (Iniciar, teclas, clique ou toque).
 * - Botão e atalho de Silenciar (tecla M), preservado ao reiniciar.
 * - Pausa interrompe os sons imediatamente; retomada não reproduz sons acumulados.
 * - Acessibilidade: Todos os sinais visuais mantidos; o jogo é 100% compreensível sem som.
 */

(function () {
  'use strict';

  // Dimensões do Mundo Virtual
  const WORLD_WIDTH = 960;
  const WORLD_HEIGHT = 1400;

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Elementos do DOM
  const seedsCollectedEl = document.getElementById('seedsCollected');
  const seedsTotalEl = document.getElementById('seedsTotal');
  const seedBadge = document.getElementById('seedBadge');
  const seedBadgeIcon = document.getElementById('seedBadgeIcon');
  const seedBadgeLabel = document.getElementById('seedBadgeLabel');
  const scoreValueEl = document.getElementById('scoreValue');
  const pointsBadge = document.getElementById('pointsBadge');
  const shieldBadge = document.getElementById('shieldBadge');
  const shieldBadgeLabel = document.getElementById('shieldBadgeLabel');
  const shieldsAvailableEl = document.getElementById('shieldsAvailable');
  const statusMessage = document.getElementById('statusMessage');
  const statusDot = document.getElementById('statusDot');

  const btnPlant = document.getElementById('btnPlant');
  const btnShield = document.getElementById('btnShield');
  const btnTouchShield = document.getElementById('btnTouchShield');
  const btnMute = document.getElementById('btnMute');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnReset = document.getElementById('btnReset');
  const btnActionPlant = document.getElementById('btnActionPlant');

  const modalOverlay = document.getElementById('modalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalDescription = document.getElementById('modalDescription');
  const modalPlantBtn = document.getElementById('modalPlantBtn');
  const modalPrimaryBtn = document.getElementById('modalPrimaryBtn') || document.getElementById('modalResumeBtn');
  const modalResetBtn = document.getElementById('modalResetBtn');

  const placeToast = document.getElementById('placeToast');
  const toastIcon = document.getElementById('toastIcon');
  const toastTitle = document.getElementById('toastTitle');
  const toastSubtitle = document.getElementById('toastSubtitle');

  const btnUp = document.getElementById('btnUp');
  const btnDown = document.getElementById('btnDown');
  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');

  // Estados do Jogo
  const State = {
    READY: 'READY',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    DEFEATED: 'DEFEATED',
    VICTORY: 'VICTORY',
    PLANTING: 'PLANTING',
    CONCLUDED: 'CONCLUDED'
  };

  let currentState = State.READY;
  let previousStateBeforePause = State.PLAYING;
  let lastTimestamp = 0;
  let globalAnimTimer = 0;
  let toastTimeout = null;

  // Viewport Tela Cheia
  let viewW = window.innerWidth;
  let viewH = window.innerHeight;

  function resizeCanvas() {
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    canvas.width = viewW;
    canvas.height = viewH;
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Posição Inicial de Lia (Lobo-Guará)
  const LIA_START_X = 480;
  const LIA_START_Y = 1240;

  // Câmera 2D Suave
  const camera = {
    x: WORLD_WIDTH / 2 - viewW / 2,
    y: LIA_START_Y - viewH * 0.55,
    targetX: WORLD_WIDTH / 2 - viewW / 2,
    targetY: LIA_START_Y - viewH * 0.55
  };

  // Regiões de Terra Firme e Ponte (Cerrado ao Sul, Ponte Central, Mata ao Norte)
  const TERRAIN_REGIONS = [
    { name: 'Cerrado', type: 'beach', x: 90, y: 840, w: 780, h: 500 },
    { name: 'Ponte Larga', type: 'bridge', x: 300, y: 570, w: 360, h: 300 },
    { name: 'Mata', type: 'forest', x: 80, y: 60, w: 800, h: 540 }
  ];

  // Plaquinhas Interativas
  const SIGNPOSTS = [
    {
      id: 'beach_sign',
      x: 340,
      y: 1220,
      shortLabel: 'Cerrado',
      icon: '🌾',
      fullName: 'Chapada do Cerrado Dourado',
      description: 'Savana brasileira de árvores tortuosas, ipês-amarelos, capim-dourado e solo ocre onde vive o lobo-guará.',
      isHovered: false,
      expandedTimer: 0
    },
    {
      id: 'bridge_sign',
      x: 250,
      y: 740,
      shortLabel: 'Ponte Larga',
      icon: '🌉',
      fullName: 'Ponte Larga das Águas',
      description: 'Ponte de madeira maciça que cruza o rio conectando o Cerrado aberto à Mata densa.',
      isHovered: false,
      expandedTimer: 0
    },
    {
      id: 'forest_sign',
      x: 340,
      y: 200,
      shortLabel: 'Mata',
      icon: '🌳',
      fullName: 'Mata Nativa Profunda',
      description: 'Floresta tropical exuberante com jatobás, samaúmas, cipós, samambaias e bromélias.',
      isHovered: false,
      expandedTimer: 0
    }
  ];

  // Cenografia da Ilha
  const SCENERY_PROPS = [
    // Praia
    { type: 'palm', x: 160, y: 920, scale: 1.15, solidW: 38, solidH: 38 },
    { type: 'palm', x: 790, y: 940, scale: 1.15, solidW: 38, solidH: 38 },
    { type: 'palm', x: 170, y: 1220, scale: 1.2, solidW: 40, solidH: 40 },
    { type: 'palm', x: 780, y: 1240, scale: 1.2, solidW: 40, solidH: 40 },
    { type: 'rock', x: 250, y: 1060, scale: 1.1, solidW: 38, solidH: 26 },
    { type: 'rock', x: 700, y: 1080, scale: 1.1, solidW: 38, solidH: 26 },
    { type: 'shell', x: 380, y: 1260, scale: 1.1, solid: false },
    { type: 'shell', x: 570, y: 1280, scale: 1.0, solid: false },
    { type: 'shell', x: 440, y: 980, scale: 0.9, solid: false },
    { type: 'starfish', x: 480, y: 1290, scale: 1.1, solid: false },
    { type: 'starfish', x: 260, y: 890, scale: 1.0, solid: false },
    { type: 'starfish', x: 700, y: 890, scale: 1.0, solid: false },

    // Bosque
    { type: 'oak', x: 160, y: 160, scale: 1.35, solidW: 50, solidH: 50 },
    { type: 'oak', x: 800, y: 160, scale: 1.35, solidW: 50, solidH: 50 },
    { type: 'oak', x: 480, y: 130, scale: 1.4, solidW: 54, solidH: 54 },
    { type: 'pine', x: 280, y: 130, scale: 1.2, solidW: 42, solidH: 42 },
    { type: 'pine', x: 670, y: 130, scale: 1.2, solidW: 42, solidH: 42 },
    { type: 'oak', x: 190, y: 400, scale: 1.25, solidW: 46, solidH: 46 },
    { type: 'oak', x: 770, y: 400, scale: 1.25, solidW: 46, solidH: 46 },
    { type: 'pine', x: 340, y: 500, scale: 1.1, solidW: 40, solidH: 40 },
    { type: 'pine', x: 620, y: 500, scale: 1.1, solidW: 40, solidH: 40 },
    { type: 'flowerpatch', x: 480, y: 440, scale: 1.2, solid: false },
    { type: 'flowerpatch', x: 640, y: 230, scale: 1.1, solid: false },
    { type: 'shrub', x: 220, y: 550, scale: 1.15, solid: false },
    { type: 'shrub', x: 740, y: 550, scale: 1.15, solid: false }
  ];

  // Guarda de Névoa: Onça-Pintada Espectral
  // Ajustado de 110 para 80 px/s para que tanto a velocidade base (0 a 4 coletas: 80 px/s)
  // quanto o aumento de +10% (5 a 9 coletas: 88 px/s) permaneçam abaixo da velocidade de Lia (105 px/s).
  const GUARD_BASE_SPEED = 80;
  const GUARD_BOOST_MULTIPLIER = 1.1;
  const GUARD_TURN_WARN_SECONDS = 0.6;

  const GUARD_START = {
    x: 320,
    y: 340,
    minX: 280,
    maxX: 680,
    width: 48,
    height: 38,
    speed: GUARD_BASE_SPEED,
    direction: 1
  };

  const fogGuard = {
    x: GUARD_START.x,
    y: GUARD_START.y,
    minX: GUARD_START.minX,
    maxX: GUARD_START.maxX,
    width: GUARD_START.width,
    height: GUARD_START.height,
    speed: GUARD_START.speed,
    direction: GUARD_START.direction,
    boostNotified: false,
    timeToTurn: (GUARD_START.maxX - GUARD_START.x) / GUARD_START.speed,
    isTurningSoon: false,
    nextDirection: -GUARD_START.direction,
    turnWarningProgress: 0
  };

  // Pontuação da missão: Comum = 1 ponto, Rara = 3 pontos
  let currentScore = 0;

  // Sistema de Escudo Protetor (ESCUDO)
  // Três escudos por resgate; cada uso dura 3 segundos protegendo do contato com o guarda
  const MAX_SHIELDS = 3;
  const SHIELD_DURATION = 3.0;
  let shieldsAvailable = MAX_SHIELDS;
  let shieldActive = false;
  let shieldTimeLeft = 0;
  let spaceKeyHeld = false;

  // ==========================================================
  // GERENCIADOR DE RECURSOS VISUAIS (PNGs COM FALLBACK EM CANVAS)
  // Preserva proporções sem deformar e desvincula transparências de colisões.
  // ==========================================================
  const gameAssets = {
    lia: {
      key: 'lia',
      name: 'Lia (Lobo-Guará)',
      paths: ['assets/lia.png', 'assets/lobo_guara.png', 'assets/lia_lobo_guara.png'],
      targetWidth: 44,
      targetHeight: 46,
      img: null,
      loaded: false,
      failed: false
    },
    guarda: {
      key: 'guarda',
      name: 'Guarda (Onça-Pintada Espectral)',
      paths: ['assets/guarda.png', 'assets/onca.png', 'assets/onca_pintada.png'],
      targetWidth: 56,
      targetHeight: 42,
      img: null,
      loaded: false,
      failed: false
    },
    semente: {
      key: 'semente',
      name: 'Semente',
      paths: ['assets/semente.png', 'assets/seed.png', 'assets/semente_comum.png'],
      targetWidth: 30,
      targetHeight: 32,
      img: null,
      loaded: false,
      failed: false
    }
  };

  function loadSingleAsset(asset) {
    if (typeof Image === 'undefined') {
      asset.failed = true;
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      let pathIndex = 0;

      function tryNextPath() {
        if (pathIndex >= asset.paths.length) {
          asset.loaded = false;
          asset.failed = true;
          resolve(false);
          return;
        }

        const currentPath = asset.paths[pathIndex++];
        const img = new Image();
        img.onload = () => {
          asset.img = img;
          asset.loaded = true;
          asset.failed = false;
          asset.activePath = currentPath;
          resolve(true);
        };
        img.onerror = () => {
          tryNextPath();
        };
        img.src = currentPath;
      }

      tryNextPath();
    });
  }

  function loadGameAssets() {
    return Promise.all([
      loadSingleAsset(gameAssets.lia),
      loadSingleAsset(gameAssets.guarda),
      loadSingleAsset(gameAssets.semente)
    ]);
  }

  function drawAssetImage(asset, targetW, targetH, flipX = false) {
    if (!asset || !asset.loaded || !asset.img) return false;
    const img = asset.img;
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;
    if (!naturalW || !naturalH) return false;

    // Preserva a proporção exata sem deformar
    const scale = Math.min(targetW / naturalW, targetH / naturalH);
    const drawW = naturalW * scale;
    const drawH = naturalH * scale;

    ctx.save();
    if (flipX) {
      ctx.scale(-1, 1);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
    return true;
  }

  // 20 Sementes Resgatáveis: 10 comuns fora da patrulha e 10 raras próximas dela
  const SEED_DEFINITIONS = [
    // 10 Sementes Comuns (1 ponto cada, fora da rota de patrulha do guarda)
    { id: 1, type: 'comum', points: 1, region: 'beach', x: 260, y: 1200, name: 'Semente da Brisa Marinha' },
    { id: 2, type: 'comum', points: 1, region: 'beach', x: 710, y: 1190, name: 'Semente da Maré Mansa' },
    { id: 3, type: 'comum', points: 1, region: 'beach', x: 350, y: 950, name: 'Semente das Dunas' },
    { id: 4, type: 'comum', points: 1, region: 'beach', x: 610, y: 960, name: 'Semente do Sol Costeiro' },
    { id: 5, type: 'comum', points: 1, region: 'beach', x: 480, y: 1100, name: 'Semente da Chapada Dourada' },
    { id: 6, type: 'comum', points: 1, region: 'forest', x: 210, y: 510, name: 'Semente do Musgo Verde' },
    { id: 7, type: 'comum', points: 1, region: 'forest', x: 750, y: 500, name: 'Semente do Carvalho' },
    { id: 8, type: 'comum', points: 1, region: 'forest', x: 240, y: 190, name: 'Semente do Broto Silvestre' },
    { id: 9, type: 'comum', points: 1, region: 'forest', x: 720, y: 190, name: 'Semente da Seiva Antiga' },
    { id: 10, type: 'comum', points: 1, region: 'forest', x: 480, y: 200, name: 'Semente do Coração da Ilha' },

    // 10 Sementes Raras (3 pontos cada, dispostas em ciclo ao redor da patrulha)
    { id: 11, type: 'rara', points: 3, region: 'forest', x: 310, y: 310, name: 'Semente Rara da Aurora' },
    { id: 12, type: 'rara', points: 3, region: 'forest', x: 390, y: 300, name: 'Semente Rara da Névoa Alta' },
    { id: 13, type: 'rara', points: 3, region: 'forest', x: 480, y: 295, name: 'Semente Rara do Vórtice' },
    { id: 14, type: 'rara', points: 3, region: 'forest', x: 570, y: 300, name: 'Semente Rara da Luz Filtrada' },
    { id: 15, type: 'rara', points: 3, region: 'forest', x: 650, y: 310, name: 'Semente Rara da Borda Leste' },
    { id: 16, type: 'rara', points: 3, region: 'forest', x: 650, y: 375, name: 'Semente Rara do Crepúsculo' },
    { id: 17, type: 'rara', points: 3, region: 'forest', x: 570, y: 385, name: 'Semente Rara do Cristal' },
    { id: 18, type: 'rara', points: 3, region: 'forest', x: 480, y: 390, name: 'Semente Rara da Sombra' },
    { id: 19, type: 'rara', points: 3, region: 'forest', x: 390, y: 385, name: 'Semente Rara do Eco' },
    { id: 20, type: 'rara', points: 3, region: 'forest', x: 310, y: 375, name: 'Semente Rara da Borda Oeste' }
  ];

  // Rota de Patrulha Cíclica do Segundo Guardião (Risco Extra)
  // Anda de semente rara em semente rara completando o ciclo contínuo com velocidade de Lia (105 px/s)
  const RARE_SEED_WAYPOINTS = SEED_DEFINITIONS.filter(s => s.type === 'rara').map(s => ({ x: s.x, y: s.y }));

  const SECOND_GUARD_START = {
    x: RARE_SEED_WAYPOINTS[0].x,
    y: RARE_SEED_WAYPOINTS[0].y,
    targetIndex: 1,
    width: 44,
    height: 44,
    speed: 105, // Mesma velocidade de Lia (105 px/s)
    direction: 1
  };

  const secondGuard = {
    x: SECOND_GUARD_START.x,
    y: SECOND_GUARD_START.y,
    targetIndex: SECOND_GUARD_START.targetIndex,
    width: SECOND_GUARD_START.width,
    height: SECOND_GUARD_START.height,
    speed: SECOND_GUARD_START.speed,
    direction: SECOND_GUARD_START.direction,
    angle: 0
  };

  let seeds = [];
  let sparkles = [];

  // Canteiros de Plantio
  const CANTEIRO_DEFINITIONS = [
    // Praia (6 canteiros)
    { id: 'c_b1', region: 'beach', x: 220, y: 1150 },
    { id: 'c_b2', region: 'beach', x: 380, y: 1180 },
    { id: 'c_b3', region: 'beach', x: 580, y: 1170 },
    { id: 'c_b4', region: 'beach', x: 740, y: 1140 },
    { id: 'c_b5', region: 'beach', x: 280, y: 940 },
    { id: 'c_b6', region: 'beach', x: 680, y: 950 },

    // Bosque (8 canteiros)
    { id: 'c_f1', region: 'forest', x: 210, y: 460 },
    { id: 'c_f2', region: 'forest', x: 360, y: 460 },
    { id: 'c_f3', region: 'forest', x: 600, y: 460 },
    { id: 'c_f4', region: 'forest', x: 750, y: 450 },
    { id: 'c_f5', region: 'forest', x: 480, y: 360 },
    { id: 'c_f6', region: 'forest', x: 230, y: 220 },
    { id: 'c_f7', region: 'forest', x: 480, y: 170 },
    { id: 'c_f8', region: 'forest', x: 730, y: 220 }
  ];

  let CANTEIROS = [];

  function initCanteiros() {
    CANTEIROS = CANTEIRO_DEFINITIONS.map(def => ({
      ...def,
      planted: false,
      growthAnim: 0
    }));
  }

  let seedsInReserve = 0;
  let plantedCount = 0;
  let plantProgress = 0;

  // Borboletas e Pássaros
  const BUTTERFLIES = [
    { x: 320, y: 350, vx: 28, vy: 14, phase: 0, color: '#f59e0b', scale: 0.9 },
    { x: 520, y: 280, vx: -24, vy: 16, phase: 1.5, color: '#38bdf8', scale: 1.0 },
    { x: 240, y: 450, vx: 22, vy: -12, phase: 2.8, color: '#ec4899', scale: 0.85 },
    { x: 680, y: 380, vx: -25, vy: 15, phase: 4.1, color: '#a855f7', scale: 0.95 },
    { x: 450, y: 180, vx: 20, vy: 18, phase: 0.8, color: '#facc15', scale: 1.05 },
    { x: 740, y: 240, vx: -18, vy: -14, phase: 3.2, color: '#22c55e', scale: 0.9 },
    { x: 360, y: 1050, vx: 22, vy: 12, phase: 5.0, color: '#38bdf8', scale: 0.95 },
    { x: 620, y: 1100, vx: -20, vy: -14, phase: 2.1, color: '#f59e0b', scale: 1.0 },
    { x: 280, y: 1180, vx: 18, vy: 15, phase: 3.7, color: '#f43f5e', scale: 0.85 },
    { x: 700, y: 1200, vx: -22, vy: 10, phase: 1.2, color: '#ec4899', scale: 0.9 }
  ];

  const BIRDS = [
    { x: 120, y: 220, speed: 75, phase: 0, size: 9, color: '#0284c7' },
    { x: 280, y: 160, speed: 85, phase: 1.8, size: 10, color: '#0369a1' },
    { x: 460, y: 300, speed: 70, phase: 3.2, size: 8, color: '#0ea5e9' },
    { x: 650, y: 200, speed: 80, phase: 4.5, size: 9, color: '#0284c7' },
    { x: 350, y: 920, speed: 78, phase: 2.1, size: 9, color: '#0369a1' }
  ];

  const lia = {
    x: LIA_START_X,
    y: LIA_START_Y,
    radius: 17,
    speed: 105,
    facing: 'up',
    isMoving: false,
    walkCycle: 0
  };

  const keys = {
    up: false,
    down: false,
    left: false,
    right: false
  };

  // ==========================================
  // SISTEMA DE ÁUDIO PROCEDURAL (WEB AUDIO API)
  // Sem arquivos externos - Sintetizadores puros
  // ==========================================
  let audioCtx = null;
  let masterGain = null;
  let ambientGain = null;
  let isMuted = false;
  let windSource = null;
  let windFilter = null;
  let birdTimeout = null;
  let musicInterval = null;

  // Carrega escolha salva do usuário
  try {
    const saved = localStorage.getItem('ilha_viva_muted');
    if (saved !== null) {
      isMuted = (saved === 'true');
    }
  } catch (err) {}

  function ensureAudio() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      audioCtx = new AudioCtxClass();

      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : 0.6, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);

      ambientGain = audioCtx.createGain();
      ambientGain.gain.setValueAtTime(0.28, audioCtx.currentTime);
      ambientGain.connect(masterGain);

      updateMuteButtonUI();
      startForestAmbience();
    }

    if (audioCtx.state === 'suspended' && currentState !== State.PAUSED) {
      audioCtx.resume();
    }
  }

  function toggleMute() {
    isMuted = !isMuted;
    try {
      localStorage.setItem('ilha_viva_muted', isMuted ? 'true' : 'false');
    } catch (err) {}

    if (masterGain && audioCtx) {
      const now = audioCtx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(isMuted ? 0 : 0.6, now + 0.05);
    }

    updateMuteButtonUI();
  }

  function updateMuteButtonUI() {
    if (!btnMute) return;
    if (isMuted) {
      btnMute.textContent = '🔇 Mudo';
      btnMute.setAttribute('aria-label', 'Ativar áudio (tecla M)');
      btnMute.classList.add('muted');
    } else {
      btnMute.textContent = '🔊 Som';
      btnMute.setAttribute('aria-label', 'Silenciar áudio (tecla M)');
      btnMute.classList.remove('muted');
    }
  }

  // 1. Som de Coleta de Semente: Chime doce ascendente duplo
  function playSoundCollect() {
    if (!audioCtx || isMuted || audioCtx.state !== 'running' || currentState === State.PAUSED) return;
    try {
      const now = audioCtx.currentTime;
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(659.25, now);
      osc1.frequency.exponentialRampToValueAtTime(987.77, now + 0.12);

      osc2.frequency.setValueAtTime(987.77, now);
      osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.18);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.32, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.28);
      osc2.stop(now + 0.28);
    } catch (e) {}
  }

  // 2. Som de Derrota: Dissipação espectral suave em tom descendente
  function playSoundDefeat() {
    if (!audioCtx || isMuted || audioCtx.state !== 'running' || currentState === State.PAUSED) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.55);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(110, now + 0.55);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.38, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {}
  }

  // 2b. Barulho de Desgosto / Repulsa do Guarda ao bater no escudo protetor
  function playGuardDisgustSound() {
    if (!audioCtx || isMuted || audioCtx.state !== 'running' || currentState === State.PAUSED) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();

      // Tom áspero descendente (rosnado/grunhido felino de desgosto)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(155, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.35);
      filter.Q.setValueAtTime(3.5, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }

  // 3. Som de Conclusão dos Dez Plantios: Fanfarra maior arpejada
  function playSoundConclusion() {
    if (!audioCtx || isMuted || audioCtx.state !== 'running' || currentState === State.PAUSED) return;
    try {
      const now = audioCtx.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.50];
      chord.forEach((freq, idx) => {
        const noteStart = now + idx * 0.12;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = idx === 3 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(0.28, noteStart + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.95);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(noteStart);
        osc.stop(noteStart + 1.0);
      });

      const shimmer = audioCtx.createOscillator();
      const sGain = audioCtx.createGain();
      shimmer.type = 'sine';
      shimmer.frequency.setValueAtTime(1567.98, now + 0.45);
      shimmer.frequency.exponentialRampToValueAtTime(2093.00, now + 1.25);
      sGain.gain.setValueAtTime(0, now + 0.45);
      sGain.gain.linearRampToValueAtTime(0.18, now + 0.5);
      sGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);

      shimmer.connect(sGain);
      sGain.connect(masterGain);
      shimmer.start(now + 0.45);
      shimmer.stop(now + 1.5);
    } catch (e) {}
  }

  // 4. Música de Fundo e Atmosfera de Floresta: Ventania, Pássaros e Harmonia Suave
  function startForestAmbience() {
    if (!audioCtx || windSource) return;

    try {
      // Ventania suave nas folhas (filtro ressonante com LFO lento)
      const bufferSize = audioCtx.sampleRate * 3;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + (0.02 * white)) / 1.02;
        data[i] = lastOut * 3.5;
      }

      windSource = audioCtx.createBufferSource();
      windSource.buffer = noiseBuffer;
      windSource.loop = true;

      windFilter = audioCtx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(320, audioCtx.currentTime);
      windFilter.Q.setValueAtTime(1.8, audioCtx.currentTime);

      const windGain = audioCtx.createGain();
      windGain.gain.setValueAtTime(0.14, audioCtx.currentTime);

      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(ambientGain);

      windSource.start(0);

      const windLFO = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      windLFO.frequency.setValueAtTime(0.18, audioCtx.currentTime);
      lfoGain.gain.setValueAtTime(180, audioCtx.currentTime);
      windLFO.connect(lfoGain);
      lfoGain.connect(windFilter.frequency);
      windLFO.start(0);

      // Canto esporádico de pássaros da floresta
      scheduleNextBird();

      // Música ambiente pentatônica suave
      playForestChordProgression();
      musicInterval = setInterval(() => {
        if (currentState !== State.PAUSED && audioCtx && audioCtx.state === 'running') {
          playForestChordProgression();
        }
      }, 4500);
    } catch (e) {
      console.warn('Erro ao inicializar som ambiente:', e);
    }
  }

  function scheduleNextBird() {
    const delay = 3500 + Math.random() * 4500;
    birdTimeout = setTimeout(() => {
      if (currentState !== State.PAUSED && audioCtx && audioCtx.state === 'running' && !isMuted) {
        playBirdChirp();
      }
      scheduleNextBird();
    }, delay);
  }

  function playBirdChirp() {
    if (!audioCtx || isMuted || audioCtx.state !== 'running') return;
    try {
      const now = audioCtx.currentTime;
      const numChirps = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numChirps; i++) {
        const chirpStart = now + i * 0.11;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        const baseFreq = 2600 + Math.random() * 700;
        osc.frequency.setValueAtTime(baseFreq, chirpStart);
        osc.frequency.exponentialRampToValueAtTime(baseFreq + 600, chirpStart + 0.04);
        osc.frequency.exponentialRampToValueAtTime(baseFreq - 300, chirpStart + 0.08);

        gain.gain.setValueAtTime(0, chirpStart);
        gain.gain.linearRampToValueAtTime(0.08, chirpStart + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, chirpStart + 0.09);

        osc.connect(gain);
        gain.connect(ambientGain);

        osc.start(chirpStart);
        osc.stop(chirpStart + 0.1);
      }
    } catch (e) {}
  }

  function playForestChordProgression() {
    if (!audioCtx || isMuted || audioCtx.state !== 'running') return;
    try {
      const now = audioCtx.currentTime;
      const scale = [293.66, 369.99, 440.00, 493.88, 587.33, 659.25];
      const idx1 = Math.floor(Math.random() * scale.length);
      const idx2 = (idx1 + 2 + Math.floor(Math.random() * 2)) % scale.length;
      const notes = [scale[idx1], scale[idx2]];

      notes.forEach(freq => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

        osc.connect(gain);
        gain.connect(ambientGain);

        osc.start(now);
        osc.stop(now + 4.0);
      });
    } catch (e) {}
  }

  function initSeeds() {
    seeds = SEED_DEFINITIONS.map(def => ({
      id: def.id,
      type: def.type,
      points: def.points,
      name: def.name,
      region: def.region,
      x: def.x,
      y: def.y,
      radius: def.type === 'rara' ? 12 : 10,
      collected: false,
      glowTimer: Math.random() * Math.PI * 2
    }));
    sparkles = [];
  }

  function spawnSparkle(x, y) {
    const particleCount = 14;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 40 + Math.random() * 60;
      sparkles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.65,
        maxLife: 0.65,
        size: 3 + Math.random() * 3,
        color: Math.random() > 0.3 ? '#fbbf24' : '#ffffff'
      });
    }
  }

  function spawnPlantSparkles(x, y) {
    const count = 22;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 35 + Math.random() * 75;
      const palette = ['#4ade80', '#22c55e', '#fef08a', '#38bdf8', '#ffffff'];
      sparkles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: 0.8,
        maxLife: 0.8,
        size: 3.5 + Math.random() * 3.5,
        color: palette[Math.floor(Math.random() * palette.length)]
      });
    }
  }

  function spawnShieldSparkles(x, y) {
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 40 + Math.random() * 65;
      sparkles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7,
        maxLife: 0.7,
        size: 3.5 + Math.random() * 3,
        color: Math.random() > 0.35 ? '#38bdf8' : '#e0f2fe'
      });
    }
  }

  function activateShield() {
    if (currentState !== State.PLAYING) return false;
    if (shieldActive) return false;
    if (shieldsAvailable <= 0) {
      showPlaceDiscovery({
        icon: '⚠️',
        fullName: 'Sem escudos restantes',
        description: 'Você já utilizou os três escudos desta tentativa!'
      });
      return false;
    }

    shieldsAvailable -= 1;
    shieldActive = true;
    shieldTimeLeft = SHIELD_DURATION;

    spawnShieldSparkles(lia.x, lia.y);
    if (shieldBadge) {
      shieldBadge.classList.add('pulse');
      setTimeout(() => shieldBadge.classList.remove('pulse'), 300);
    }

    showPlaceDiscovery({
      icon: '🛡️',
      fullName: 'Escudo Protetor Ativo',
      description: 'Lia está protegida por 3 segundos! Se o guarda tocar no escudo, será repelido.'
    });

    updateHUD();
    return true;
  }

  function isWalkable(x, y, radius) {
    const checkPoints = [
      { x: x - radius, y: y },
      { x: x + radius, y: y },
      { x: x, y: y - radius },
      { x: x, y: y + radius }
    ];

    const allOnLand = checkPoints.every(pt => {
      return TERRAIN_REGIONS.some(reg => {
        return pt.x >= reg.x && pt.x <= reg.x + reg.w &&
               pt.y >= reg.y && pt.y <= reg.y + reg.h;
      });
    });

    if (!allOnLand) return false;

    for (const prop of SCENERY_PROPS) {
      if (prop.solidW && prop.solidH) {
        const ox = prop.x - prop.solidW / 2;
        const oy = prop.y - prop.solidH / 2;
        const closestX = Math.max(ox, Math.min(x, ox + prop.solidW));
        const closestY = Math.max(oy, Math.min(y, oy + prop.solidH));
        const distX = x - closestX;
        const distY = y - closestY;
        if ((distX * distX + distY * distY) < (radius * radius)) {
          return false;
        }
      }
    }

    for (const sign of SIGNPOSTS) {
      const sx = sign.x - 10;
      const sy = sign.y - 10;
      const sw = 20;
      const sh = 20;
      const closestX = Math.max(sx, Math.min(x, sx + sw));
      const closestY = Math.max(sy, Math.min(y, sy + sh));
      const distX = x - closestX;
      const distY = y - closestY;
      if ((distX * distX + distY * distY) < (radius * radius)) {
        return false;
      }
    }

    return true;
  }

  function getCollectedCount() {
    return seeds.filter(s => s.collected).length;
  }

  function updateGuardTurnWarning() {
    const distToTurn = fogGuard.direction === 1
      ? (fogGuard.maxX - fogGuard.x)
      : (fogGuard.x - fogGuard.minX);
    const timeToTurn = fogGuard.speed > 0 ? Math.max(0, distToTurn / fogGuard.speed) : Infinity;

    fogGuard.timeToTurn = timeToTurn;
    fogGuard.isTurningSoon = (timeToTurn <= GUARD_TURN_WARN_SECONDS);
    fogGuard.nextDirection = -fogGuard.direction;
    fogGuard.turnWarningProgress = fogGuard.isTurningSoon
      ? Math.max(0, Math.min(1, 1 - (timeToTurn / GUARD_TURN_WARN_SECONDS)))
      : 0;
  }

  function updateGuardSpeedAndNotice() {
    const count = getCollectedCount();
    if (count >= 5 && count <= 9) {
      fogGuard.speed = Math.round(GUARD_START.speed * GUARD_BOOST_MULTIPLIER * 100) / 100;
      if (!fogGuard.boostNotified) {
        fogGuard.boostNotified = true;
        showPlaceDiscovery({
          icon: '⚡',
          fullName: 'Guarda mais rápido',
          description: 'A atenção da névoa aumentou (+10% de velocidade). Observe a seta e desvie!'
        });
      }
    } else if (count < 5) {
      fogGuard.speed = GUARD_START.speed;
      fogGuard.boostNotified = false;
    }
    updateGuardTurnWarning();
  }

  function parseHex(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  function lerpColor(hexA, hexB, t) {
    const clampedT = Math.max(0, Math.min(1, t));
    const [r1, g1, b1] = parseHex(hexA);
    const [r2, g2, b2] = parseHex(hexB);
    const r = Math.round(r1 + (r2 - r1) * clampedT);
    const g = Math.round(g1 + (g2 - g1) * clampedT);
    const b = Math.round(b1 + (b2 - b1) * clampedT);
    return `rgb(${r},${g},${b})`;
  }

  function updateHUD() {
    const count = getCollectedCount();

    if (scoreValueEl) {
      scoreValueEl.textContent = currentScore;
    }

    // Atualiza badges de Escudo (ESCUDO)
    if (shieldsAvailableEl) {
      shieldsAvailableEl.textContent = shieldsAvailable;
    }
    if (shieldBadge) {
      if (currentState === State.PLANTING || currentState === State.CONCLUDED) {
        shieldBadge.classList.add('hidden');
      } else {
        shieldBadge.classList.remove('hidden');
        if (shieldActive) {
          shieldBadge.classList.add('active');
          if (shieldBadgeLabel) shieldBadgeLabel.textContent = `Ativo (${shieldTimeLeft.toFixed(1)}s):`;
        } else {
          shieldBadge.classList.remove('active');
          if (shieldBadgeLabel) shieldBadgeLabel.textContent = 'Escudos:';
        }
      }
    }
    if (btnShield) {
      if (currentState === State.PLANTING || currentState === State.CONCLUDED) {
        btnShield.classList.add('hidden');
      } else {
        btnShield.classList.remove('hidden');
        btnShield.disabled = (shieldsAvailable <= 0 || shieldActive || currentState !== State.PLAYING);
        if (shieldActive) {
          btnShield.textContent = `🛡️ Ativo (${shieldTimeLeft.toFixed(1)}s)`;
        } else {
          btnShield.textContent = `🛡️ Escudo (${shieldsAvailable}/3)`;
        }
      }
    }
    if (btnTouchShield) {
      if (currentState === State.PLANTING || currentState === State.CONCLUDED) {
        btnTouchShield.classList.add('hidden');
      } else {
        btnTouchShield.classList.remove('hidden');
        btnTouchShield.disabled = (shieldsAvailable <= 0 || shieldActive || currentState !== State.PLAYING);
      }
    }

    if (currentState === State.PLANTING || currentState === State.CONCLUDED) {
      if (seedBadgeIcon) seedBadgeIcon.textContent = '🌿';
      if (seedBadgeLabel) seedBadgeLabel.textContent = 'Reserva:';
      seedsCollectedEl.textContent = seedsInReserve;
      seedsTotalEl.textContent = '10';

      if (currentState === State.CONCLUDED) {
        statusMessage.textContent = 'Sua ilha está voltando à vida! Toda a vegetação renasceu.';
        statusDot.className = 'status-dot';
      } else {
        statusMessage.textContent = `Sua ilha está voltando à vida! Plantados ${plantedCount} de 10 (Aperte E no canteiro)`;
        statusDot.className = 'status-dot';
      }

      btnPause.disabled = false;
      btnPause.textContent = 'Pausar (P)';
      btnStart.disabled = true;
      if (btnPlant) btnPlant.classList.add('hidden');
      return;
    }

    // Fase de Resgate
    if (seedBadgeIcon) seedBadgeIcon.textContent = '🌱';
    if (seedBadgeLabel) seedBadgeLabel.textContent = 'Sementes:';
    seedsCollectedEl.textContent = count;
    seedsTotalEl.textContent = '10';

    if (currentState === State.DEFEATED) {
      statusMessage.textContent = 'A névoa alcançou você. Reinicie para tentar de novo.';
      statusDot.className = 'status-dot danger';
      btnPause.disabled = true;
      btnStart.disabled = true;
      if (btnPlant) btnPlant.classList.add('hidden');
    } else if (currentState === State.VICTORY) {
      if (currentScore >= 20) {
        statusMessage.textContent = `Guardião da ilha (${currentScore} pts)! Clique em Plantar!`;
      } else {
        statusMessage.textContent = `Recuperação básica (${currentScore} pts)! Clique em Plantar!`;
      }
      statusDot.className = 'status-dot gold';
      btnPause.disabled = true;
      btnStart.disabled = true;
      if (btnPlant) btnPlant.classList.remove('hidden');
    } else if (currentState === State.PAUSED) {
      statusMessage.textContent = 'Jogo Pausado';
      btnPause.disabled = false;
      btnPause.textContent = 'Retomar (P)';
      btnStart.disabled = true;
    } else if (currentState === State.READY) {
      statusMessage.textContent = 'Resgate dez sementes para devolver vida à ilha';
      statusDot.className = 'status-dot';
      btnPause.disabled = true;
      btnStart.disabled = false;
      if (btnPlant) btnPlant.classList.add('hidden');
    } else if (currentState === State.PLAYING) {
      if (count >= 5 && count < 10) {
        statusMessage.textContent = `Guarda mais rápido — Coletadas ${count} de 10 sementes (${currentScore} pts)`;
      } else {
        statusMessage.textContent = `Missão: Coletadas ${count} de 10 sementes (${currentScore} pts)`;
      }
      statusDot.className = 'status-dot';
      btnPause.disabled = false;
      btnPause.textContent = 'Pausar (P)';
      btnStart.disabled = true;
      if (btnPlant) btnPlant.classList.add('hidden');
    }
  }

  function handleDefeat(customDesc) {
    currentState = State.DEFEATED;

    lia.isMoving = false;
    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;

    // Reproduz som de derrota uma vez
    playSoundDefeat();

    modalTitle.textContent = 'A névoa alcançou você';
    modalDescription.textContent = customDesc || 'A Onça-Pintada de névoa bloqueou seu avanço. Observe a seta indicativa e use a agilidade do lobo-guará para desviar!';
    if (modalPrimaryBtn) modalPrimaryBtn.style.display = 'none';
    if (modalPlantBtn) modalPlantBtn.classList.add('hidden');
    modalOverlay.classList.remove('hidden');
    modalResetBtn.focus();

    updateHUD();
  }

  function triggerVictory() {
    currentState = State.VICTORY;

    lia.isMoving = false;
    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;

    if (currentScore >= 20) {
      modalTitle.textContent = 'Guardião da ilha';
      modalDescription.textContent = `Vitória com honras! Lia conquistou ${currentScore} pontos resgatando sementes raras e enfrentando os guardiões. A terra devastada está pronta para o plantio. Clique no botão Plantar!`;
    } else {
      modalTitle.textContent = 'Recuperação básica';
      modalDescription.textContent = `Resgate concluído! Lia conquistou ${currentScore} pontos resgatando sementes comuns. A recuperação básica foi alcançada e a terra está pronta para renascer com o plantio!`;
    }
    
    if (modalPrimaryBtn) modalPrimaryBtn.style.display = 'none';
    if (modalPlantBtn) {
      modalPlantBtn.classList.remove('hidden');
      modalPlantBtn.focus();
    }
    if (btnPlant) btnPlant.classList.remove('hidden');

    modalOverlay.classList.remove('hidden');
    updateHUD();
  }

  function startPlantingPhase() {
    if (currentState !== State.VICTORY && currentState !== State.PLAYING) return;
    
    currentState = State.PLANTING;
    seedsInReserve = 10;
    plantedCount = 0;
    plantProgress = 0;
    shieldActive = false;
    shieldTimeLeft = 0;

    initCanteiros();

    modalOverlay.classList.add('hidden');
    if (modalPlantBtn) modalPlantBtn.classList.add('hidden');
    if (btnPlant) btnPlant.classList.add('hidden');
    if (btnActionPlant) btnActionPlant.classList.remove('hidden');

    showPlaceDiscovery({
      icon: '🌿',
      fullName: 'Etapa de Plantio Iniciada',
      description: 'A névoa se dissipou! Distribua as 10 sementes da reserva pelos canteiros (tecla E).'
    });

    lastTimestamp = performance.now();
    updateHUD();
    canvas.focus();
  }

  function tryPlantAtCanteiro(target) {
    if (currentState !== State.PLANTING && currentState !== State.CONCLUDED) return false;
    if (!target) return false;

    if (target.planted) {
      showPlaceDiscovery({
        icon: '🌿',
        fullName: 'Canteiro já cultivado',
        description: 'Um belo broto já está crescendo forte aqui!'
      });
      return false;
    }

    if (seedsInReserve <= 0) {
      showPlaceDiscovery({
        icon: '⚠️',
        fullName: 'Reserva Esgotada',
        description: 'Todas as dez sementes já foram distribuídas pela ilha!'
      });
      return false;
    }

    // Gasta rigorosamente 1 semente por ação
    seedsInReserve -= 1;
    target.planted = true;
    target.growthAnim = 0;
    plantedCount += 1;
    plantProgress = Math.min(1.0, plantedCount / 10);

    spawnPlantSparkles(target.x, target.y);
    seedBadge.classList.add('pulse');
    setTimeout(() => seedBadge.classList.remove('pulse'), 300);

    updateHUD();

    if (plantedCount === 10) {
      triggerIslandRestored();
    }
    return true;
  }

  function tryPlantAtNearbyCanteiro() {
    if (currentState !== State.PLANTING && currentState !== State.CONCLUDED) return false;

    let closest = null;
    let closestDist = Infinity;
    for (const c of CANTEIROS) {
      const d = Math.hypot(lia.x - c.x, lia.y - c.y);
      if (d <= 52 && d < closestDist) {
        closest = c;
        closestDist = d;
      }
    }

    if (!closest) {
      showPlaceDiscovery({
        icon: '🚶',
        fullName: 'Nenhum canteiro próximo',
        description: 'Aproxime-se de um dos canteiros de terra batida para plantar uma semente.'
      });
      return false;
    }

    return tryPlantAtCanteiro(closest);
  }

  function triggerIslandRestored() {
    currentState = State.CONCLUDED;

    // Toca som de conclusão dos 10 plantios uma vez
    playSoundConclusion();

    modalTitle.textContent = 'Sua ilha está voltando à vida';
    modalDescription.textContent = 'Você plantou todas as dez sementes! As árvores recuperaram suas copas verdejantes, as flores desabrocharam e o bosque agora transborda vida com pássaros voando e borboletas. A harmonia da Ilha Viva foi restaurada por Lia!';
    
    if (modalPlantBtn) modalPlantBtn.classList.add('hidden');
    if (modalPrimaryBtn) {
      modalPrimaryBtn.style.display = 'inline-block';
      modalPrimaryBtn.textContent = 'Continuar Explorando';
      modalPrimaryBtn.className = 'ui-btn primary-btn';
      modalPrimaryBtn.focus();
    }
    modalOverlay.classList.remove('hidden');

    updateHUD();
  }

  function showPlaceDiscovery(sign) {
    sign.expandedTimer = 4.0;
    toastIcon.textContent = sign.icon;
    toastTitle.textContent = sign.fullName;
    toastSubtitle.textContent = sign.description;
    placeToast.classList.remove('hidden');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      placeToast.classList.add('hidden');
    }, 4500);
  }

  function startGame() {
    ensureAudio();
    if (currentState === State.READY || currentState === State.PAUSED) {
      currentState = State.PLAYING;
      modalOverlay.classList.add('hidden');
      if (modalPrimaryBtn) modalPrimaryBtn.style.display = 'inline-block';
      lastTimestamp = performance.now();
      updateHUD();
      canvas.focus();
    }
  }

  function pauseGame(reasonText) {
    if (currentState === State.PLAYING || currentState === State.PLANTING || currentState === State.CONCLUDED) {
      previousStateBeforePause = currentState;
      currentState = State.PAUSED;

      // Interrompe o áudio imediatamente ao pausar
      if (audioCtx && audioCtx.state === 'running') {
        audioCtx.suspend();
      }

      modalTitle.textContent = 'Jogo Pausado';
      modalDescription.textContent = reasonText || 'Pressione o botão Retomar ou aperte a tecla P para continuar a missão.';
      if (modalPlantBtn) modalPlantBtn.classList.add('hidden');
      if (modalPrimaryBtn) {
        modalPrimaryBtn.style.display = 'inline-block';
        modalPrimaryBtn.textContent = 'Retomar';
        modalPrimaryBtn.className = 'ui-btn primary-btn';
        modalPrimaryBtn.focus();
      }
      modalOverlay.classList.remove('hidden');
      updateHUD();
    }
  }

  function resumeGame() {
    if (currentState === State.PAUSED) {
      currentState = previousStateBeforePause || State.PLAYING;

      // Retoma o áudio sem tocar sons acumulados
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      modalOverlay.classList.add('hidden');
      lastTimestamp = performance.now();
      updateHUD();
      canvas.focus();
    }
  }

  function togglePause() {
    if (currentState === State.PLAYING || currentState === State.PLANTING || currentState === State.CONCLUDED) {
      pauseGame();
    } else if (currentState === State.PAUSED) {
      resumeGame();
    } else if (currentState === State.READY) {
      startGame();
    }
  }

  function resetGame() {
    lia.x = LIA_START_X;
    lia.y = LIA_START_Y;
    lia.facing = 'up';
    lia.isMoving = false;
    lia.walkCycle = 0;

    fogGuard.x = GUARD_START.x;
    fogGuard.y = GUARD_START.y;
    fogGuard.speed = GUARD_START.speed;
    fogGuard.direction = GUARD_START.direction;
    fogGuard.boostNotified = false;
    updateGuardTurnWarning();

    // Restaura o sistema de escudos e guardiões
    shieldsAvailable = MAX_SHIELDS;
    shieldActive = false;
    shieldTimeLeft = 0;
    spaceKeyHeld = false;
    currentScore = 0;

    secondGuard.x = SECOND_GUARD_START.x;
    secondGuard.y = SECOND_GUARD_START.y;
    secondGuard.targetIndex = SECOND_GUARD_START.targetIndex;
    secondGuard.direction = SECOND_GUARD_START.direction;
    secondGuard.angle = 0;

    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;

    camera.x = WORLD_WIDTH / 2 - viewW / 2;
    camera.y = WORLD_HEIGHT - viewH * 0.8;
    camera.targetX = camera.x;
    camera.targetY = camera.y;

    SIGNPOSTS.forEach(s => {
      s.isHovered = false;
      s.expandedTimer = 0;
    });

    // Limpa os brotos e restaura o resgate inicial devastado
    initCanteiros();
    seedsInReserve = 0;
    plantedCount = 0;
    plantProgress = 0;

    initSeeds();

    currentState = State.PLAYING;
    modalOverlay.classList.add('hidden');
    if (modalPlantBtn) modalPlantBtn.classList.add('hidden');
    if (modalPrimaryBtn) modalPrimaryBtn.style.display = 'inline-block';
    if (btnPlant) btnPlant.classList.add('hidden');
    if (btnActionPlant) btnActionPlant.classList.add('hidden');
    placeToast.classList.add('hidden');
    lastTimestamp = performance.now();

    // Mantém a escolha do Silenciar do usuário
    updateMuteButtonUI();

    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    updateHUD();
    canvas.focus();
  }

  function updateCamera(dt) {
    camera.targetX = lia.x - viewW / 2;
    camera.targetY = lia.y - viewH * 0.55;

    camera.x += (camera.targetX - camera.x) * 4.5 * dt;
    camera.y += (camera.targetY - camera.y) * 4.5 * dt;
  }

  function update(dt) {
    if (currentState === State.PAUSED) return;

    globalAnimTimer += dt;

    updateCamera(dt);

    for (let i = sparkles.length - 1; i >= 0; i--) {
      const sp = sparkles[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.life -= dt;
      if (sp.life <= 0) {
        sparkles.splice(i, 1);
      }
    }

    SIGNPOSTS.forEach(sign => {
      if (sign.expandedTimer > 0) {
        sign.expandedTimer = Math.max(0, sign.expandedTimer - dt);
      }
    });

    // Animação de crescimento dos brotos
    CANTEIROS.forEach(c => {
      if (c.planted && c.growthAnim < 1.0) {
        c.growthAnim = Math.min(1.0, c.growthAnim + dt * 1.5);
      }
    });

    // Animação das borboletas e pássaros
    if (plantedCount > 0) {
      const activeButterflies = Math.min(BUTTERFLIES.length, Math.floor(plantedCount * 1.2));
      for (let i = 0; i < activeButterflies; i++) {
        const b = BUTTERFLIES[i];
        b.phase += dt * 9;
        b.x += b.vx * dt + Math.sin(b.phase * 0.3) * 0.8;
        b.y += b.vy * dt + Math.cos(b.phase * 0.3) * 0.8;
        if (b.x < 100) { b.x = 100; b.vx = Math.abs(b.vx); }
        if (b.x > 860) { b.x = 860; b.vx = -Math.abs(b.vx); }
        if (b.y < 70) { b.y = 70; b.vy = Math.abs(b.vy); }
        if (b.y > 1320) { b.y = 1320; b.vy = -Math.abs(b.vy); }
      }

      const activeBirds = plantedCount >= 2 ? Math.min(BIRDS.length, Math.floor(plantedCount * 0.6)) : 0;
      for (let i = 0; i < activeBirds; i++) {
        const bird = BIRDS[i];
        bird.phase += dt * 8;
        bird.x += bird.speed * dt;
        bird.y += Math.sin(bird.phase * 0.25) * 16 * dt;
        if (bird.x > WORLD_WIDTH + 40) {
          bird.x = -40;
          bird.y = 120 + ((i * 73) % 360);
        }
      }
    }

    if (currentState !== State.PLAYING && currentState !== State.PLANTING && currentState !== State.CONCLUDED) return;

    // 1. Movimentação de Lia
    let moveX = 0;
    let moveY = 0;

    if (keys.up) moveY -= 1;
    if (keys.down) moveY += 1;
    if (keys.left) moveX -= 1;
    if (keys.right) moveX += 1;

    lia.isMoving = (moveX !== 0 || moveY !== 0);

    if (lia.isMoving) {
      lia.walkCycle += dt * 10;

      if (Math.abs(moveY) >= Math.abs(moveX)) {
        lia.facing = moveY < 0 ? 'up' : 'down';
      } else {
        lia.facing = moveX > 0 ? 'right' : 'left';
      }

      if (moveX !== 0 && moveY !== 0) {
        const inv = 1 / Math.SQRT2;
        moveX *= inv;
        moveY *= inv;
      }

      const nextX = lia.x + moveX * lia.speed * dt;
      const nextY = lia.y + moveY * lia.speed * dt;

      if (isWalkable(nextX, lia.y, lia.radius)) {
        lia.x = nextX;
      }
      if (isWalkable(lia.x, nextY, lia.radius)) {
        lia.y = nextY;
      }
    } else {
      lia.walkCycle = 0;
    }

    // 2. Movimento da Onça-Pintada Espectral (Guarda) - apenas no resgate
    if (currentState === State.PLAYING) {
      if (shieldActive) {
        shieldTimeLeft = Math.max(0, shieldTimeLeft - dt);
        if (shieldTimeLeft <= 0) {
          shieldActive = false;
          updateHUD();
        }
      }

      fogGuard.x += fogGuard.direction * fogGuard.speed * dt;
      if (fogGuard.x >= fogGuard.maxX) {
        fogGuard.x = fogGuard.maxX;
        fogGuard.direction = -1;
      } else if (fogGuard.x <= fogGuard.minX) {
        fogGuard.x = fogGuard.minX;
        fogGuard.direction = 1;
      }
      updateGuardTurnWarning();

      // Colisão com a Onça
      const gLeft = fogGuard.x - fogGuard.width / 2;
      const gRight = fogGuard.x + fogGuard.width / 2;
      const gTop = fogGuard.y - fogGuard.height / 2;
      const gBottom = fogGuard.y + fogGuard.height / 2;

      const closestGX = Math.max(gLeft, Math.min(lia.x, gRight));
      const closestGY = Math.max(gTop, Math.min(lia.y, gBottom));
      const distX = lia.x - closestGX;
      const distY = lia.y - closestGY;

      if ((distX * distX + distY * distY) < (lia.radius * lia.radius)) {
        if (shieldActive) {
          // Guarda repelido pelo escudo de volta para onde nasceu!
          fogGuard.x = GUARD_START.x;
          fogGuard.y = GUARD_START.y;
          fogGuard.direction = GUARD_START.direction;
          updateGuardTurnWarning();
          playGuardDisgustSound();
          spawnShieldSparkles(closestGX, closestGY);
          showPlaceDiscovery({
            icon: '💥',
            fullName: 'Guarda Repelido!',
            description: 'A Onça de névoa bateu no escudo e foi repelida para onde nasceu!'
          });
        } else {
          handleDefeat('A Onça-Pintada de névoa bloqueou seu avanço. Observe a seta indicativa e use a agilidade do lobo-guará para desviar!');
          return;
        }
      }

      // 2b. Movimento do Segundo Guardião (Risco Extra: percorre ciclo contínuo das sementes raras com velocidade de Lia)
      const targetWp = RARE_SEED_WAYPOINTS[secondGuard.targetIndex];
      const gdx = targetWp.x - secondGuard.x;
      const gdy = targetWp.y - secondGuard.y;
      const gdist = Math.hypot(gdx, gdy);

      if (gdist <= secondGuard.speed * dt + 2) {
        secondGuard.x = targetWp.x;
        secondGuard.y = targetWp.y;
        secondGuard.targetIndex = (secondGuard.targetIndex + 1) % RARE_SEED_WAYPOINTS.length;
      } else {
        const gux = gdx / gdist;
        const guy = gdy / gdist;
        secondGuard.x += gux * secondGuard.speed * dt;
        secondGuard.y += guy * secondGuard.speed * dt;
        secondGuard.angle = Math.atan2(guy, gux);
        if (Math.abs(gdx) > 2) {
          secondGuard.direction = gdx > 0 ? 1 : -1;
        }
      }

      // Colisão com o Segundo Guardião
      const sgLeft = secondGuard.x - secondGuard.width / 2;
      const sgRight = secondGuard.x + secondGuard.width / 2;
      const sgTop = secondGuard.y - secondGuard.height / 2;
      const sgBottom = secondGuard.y + secondGuard.height / 2;

      const closestSGX = Math.max(sgLeft, Math.min(lia.x, sgRight));
      const closestSGY = Math.max(sgTop, Math.min(lia.y, sgBottom));
      const distSGX = lia.x - closestSGX;
      const distSGY = lia.y - closestSGY;

      if ((distSGX * distSGX + distSGY * distSGY) < (lia.radius * lia.radius)) {
        if (shieldActive) {
          secondGuard.x = SECOND_GUARD_START.x;
          secondGuard.y = SECOND_GUARD_START.y;
          secondGuard.targetIndex = SECOND_GUARD_START.targetIndex;
          secondGuard.direction = SECOND_GUARD_START.direction;
          playGuardDisgustSound();
          spawnShieldSparkles(closestSGX, closestSGY);
          showPlaceDiscovery({
            icon: '💥',
            fullName: 'Guardião Repelido!',
            description: 'O Guardião Celeste bateu no escudo e foi repelido de volta ao ponto de partida!'
          });
        } else {
          handleDefeat('O Guardião Celeste das sementes raras alcançou você. Cuidado ao passar próximo da patrulha!');
          return;
        }
      }
    }

    // 3. Coleta de Sementes na Fase de Resgate (qualquer 10 encerra o resgate)
    if (currentState === State.PLAYING) {
      let newlyCollected = false;
      for (const seed of seeds) {
        if (!seed.collected) {
          const dx = lia.x - seed.x;
          const dy = lia.y - seed.y;
          const hitDistance = lia.radius + seed.radius + 2;

          if ((dx * dx + dy * dy) <= (hitDistance * hitDistance)) {
            seed.collected = true;
            currentScore += (seed.points || (seed.type === 'rara' ? 3 : 1));
            newlyCollected = true;
            spawnSparkle(seed.x, seed.y);
            playSoundCollect(); // Toca som curto de coleta
            seedBadge.classList.add('pulse');
            if (pointsBadge) {
              pointsBadge.classList.add('pulse');
              setTimeout(() => pointsBadge.classList.remove('pulse'), 300);
            }
            setTimeout(() => seedBadge.classList.remove('pulse'), 300);
          }
        }
      }

      if (newlyCollected) {
        updateGuardSpeedAndNotice();
        updateHUD();
        const currentCount = getCollectedCount();
        if (currentCount >= 10) {
          triggerVictory();
          return;
        }
      }
    }
  }

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================

  function render() {
    ctx.save();

    // 1. Águas Fluviais Brasileiras (Rio / Veredas do Cerrado e Mata)
    const seaGrad = ctx.createLinearGradient(0, 0, 0, viewH);
    seaGrad.addColorStop(0, '#032938');
    seaGrad.addColorStop(0.5, '#06465c');
    seaGrad.addColorStop(1, '#085a70');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, 0, viewW, viewH);

    renderWaterWaves();

    // 2. Translação da Câmera
    ctx.save();
    ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

    renderWaterLilies();
    renderIslands();
    renderLargeBridge();

    if (currentState !== State.PLANTING && currentState !== State.CONCLUDED) {
      renderPatrolRoute();
    }

    renderCanteiros();
    renderSceneryProps();
    renderSignposts();

    if (currentState !== State.PLANTING && currentState !== State.CONCLUDED) {
      renderSeeds();
    }

    renderSparkles();
    renderButterflies();
    renderBirds();

    if (currentState !== State.PLANTING && currentState !== State.CONCLUDED) {
      renderJaguarGuard();
      renderSecondGuard();
    }

    renderManedWolfLia();

    ctx.restore();

    // 3. Minimapa e Vinheta
    renderMinimapHUD();
    renderLightingEffects();

    ctx.restore();
  }

  function renderWaterWaves() {
    ctx.save();
    ctx.strokeStyle = 'rgba(165, 243, 252, 0.18)';
    ctx.lineWidth = 2;

    const waveLines = Math.ceil(viewH / 65) + 1;
    for (let i = 0; i < waveLines; i++) {
      const baseY = 20 + i * 65;
      const waveOffset = Math.sin(globalAnimTimer * 1.8 + i) * 6;
      
      ctx.beginPath();
      ctx.moveTo(15, baseY + waveOffset);
      ctx.bezierCurveTo(45, baseY - 5 + waveOffset, 85, baseY + 5 + waveOffset, 125, baseY + waveOffset);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(viewW - 135, baseY - waveOffset);
      ctx.bezierCurveTo(viewW - 95, baseY - 5 - waveOffset, viewW - 55, baseY + 5 - waveOffset, viewW - 15, baseY - waveOffset);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Vitórias-Régias e Aguapés Flutuando nas Águas ao Redor da Ponte e Margens
  function renderWaterLilies() {
    ctx.save();
    const lilies = [
      { x: 210, y: 650, r: 16, hasFlower: true },
      { x: 175, y: 690, r: 12, hasFlower: false },
      { x: 235, y: 780, r: 14, hasFlower: true },
      { x: 740, y: 640, r: 17, hasFlower: true },
      { x: 780, y: 685, r: 13, hasFlower: false },
      { x: 725, y: 770, r: 15, hasFlower: true },
      { x: 190, y: 40, r: 14, hasFlower: false },
      { x: 770, y: 42, r: 15, hasFlower: true }
    ];

    lilies.forEach((lily, idx) => {
      const bobX = Math.sin(globalAnimTimer * 1.4 + idx) * 2.5;
      const bobY = Math.cos(globalAnimTimer * 1.2 + idx) * 2;
      ctx.save();
      ctx.translate(lily.x + bobX, lily.y + bobY);

      // Sombra na água
      ctx.fillStyle = 'rgba(2, 20, 30, 0.35)';
      ctx.beginPath();
      ctx.arc(1, 3, lily.r, 0, Math.PI * 2);
      ctx.fill();

      // Folha circular de Vitória-Régia com fenda lateral
      ctx.fillStyle = lerpColor('#3f4d45', '#15803d', plantProgress);
      ctx.strokeStyle = lerpColor('#27302b', '#4ade80', plantProgress);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, lily.r, 0.25, Math.PI * 2 - 0.25);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Flor de Vitória-Régia (desabrocha com o progresso)
      if (lily.hasFlower && plantProgress > 0.25) {
        const bloom = Math.min(1, (plantProgress - 0.2) * 1.4);
        ctx.fillStyle = '#fbcfe8';
        for (let p = 0; p < 6; p++) {
          const ang = (p * Math.PI) / 3 + globalAnimTimer * 0.2;
          ctx.beginPath();
          ctx.ellipse(Math.cos(ang) * 3 * bloom, Math.sin(ang) * 3 * bloom, 4 * bloom, 2 * bloom, ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(0, 0, 2 * bloom, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    ctx.restore();
  }

  function renderIslands() {
    ctx.save();

    // ====================================================
    // 1. BIOMA SUL: CERRADO BRASILEIRO (Chapada Dourada)
    // Solo ocre/terracota, veredas, capim-dourado e lajedos
    // ====================================================
    // Espuma suave nas margens do rio
    ctx.fillStyle = 'rgba(186, 230, 253, 0.28)';
    roundRect(ctx, 78, 828, 804, 524, 34);
    ctx.fill();

    // Borda de barranco de arenito e laterita vermelha do Cerrado
    const cerradoCliffColor = lerpColor('#3d2c24', '#9a3412', plantProgress);
    ctx.fillStyle = cerradoCliffColor;
    roundRect(ctx, 83, 834, 794, 514, 31);
    ctx.fill();

    const cerradoBorderColor = lerpColor('#544034', '#c2410c', plantProgress);
    ctx.fillStyle = cerradoBorderColor;
    roundRect(ctx, 86, 836, 788, 508, 30);
    ctx.fill();

    // Gradiente do solo do Cerrado: de queimado/cinza-ocre a dourado-terracota vibrante
    const cerradoGrad = ctx.createRadialGradient(480, 1090, 60, 480, 1090, 520);
    cerradoGrad.addColorStop(0, lerpColor('#6b5b52', '#fde68a', plantProgress));
    cerradoGrad.addColorStop(0.45, lerpColor('#52443c', '#eab308', plantProgress));
    cerradoGrad.addColorStop(0.82, lerpColor('#3f332c', '#ca8a04', plantProgress));
    cerradoGrad.addColorStop(1, lerpColor('#2e241f', '#9a3412', plantProgress));
    ctx.fillStyle = cerradoGrad;
    roundRect(ctx, 90, 840, 780, 500, 28);
    ctx.fill();

    // Manchas de gramíneas de savana e solo ocre no Cerrado
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = lerpColor('#785c48', '#d97706', plantProgress);
    const cerradoPatches = [
      { x: 230, y: 960, rx: 95, ry: 55 },
      { x: 710, y: 970, rx: 100, ry: 60 },
      { x: 250, y: 1170, rx: 110, ry: 65 },
      { x: 700, y: 1160, rx: 105, ry: 60 },
      { x: 480, y: 1050, rx: 85, ry: 48 }
    ];
    cerradoPatches.forEach(p => {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // Caminho de Terra Ocre/Avermelhada no Cerrado
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Borda externa suave da trilha de terra
    ctx.strokeStyle = lerpColor('#7c583e', '#b45309', plantProgress);
    ctx.lineWidth = 38;
    ctx.beginPath();
    ctx.moveTo(480, 1270);
    ctx.quadraticCurveTo(480, 1080, 480, 855);
    ctx.moveTo(230, 1160);
    ctx.quadraticCurveTo(480, 1130, 730, 1150);
    ctx.stroke();

    // Leito central de terra batida clara do Cerrado
    ctx.strokeStyle = lerpColor('#9c7051', '#d97706', plantProgress);
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(480, 1270);
    ctx.quadraticCurveTo(480, 1080, 480, 855);
    ctx.moveTo(230, 1160);
    ctx.quadraticCurveTo(480, 1130, 730, 1150);
    ctx.stroke();
    ctx.restore();

    // Tufos de Capim-Dourado e pedrinhas de quartzo espalhados pelo Cerrado
    for (let ax = 125; ax < 835; ax += 46) {
      for (let ay = 865; ay < 1315; ay += 40) {
        const gx = ax + Math.sin(ay * 0.7) * 10;
        const gy = ay + Math.cos(ax * 0.5) * 6;
        const sway = Math.sin(globalAnimTimer * 2.2 + ax * 0.1 + ay * 0.1) * 2.5;

        // Tufos de Capim-Dourado (secos no início, dourados reluzentes na revitalização)
        ctx.strokeStyle = lerpColor('#443830', '#facc15', plantProgress);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx - 3 + sway, gy - 5 - plantProgress * 4);
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + sway * 0.8, gy - 6 - plantProgress * 5);
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + 3 + sway, gy - 4 - plantProgress * 4);
        ctx.stroke();

        // Pontinha reluzente do capim-dourado
        if (plantProgress > 0.3) {
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(gx + sway * 0.8, gy - 6 - plantProgress * 5, 1.3 * plantProgress, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ====================================================
    // 2. BIOMA NORTE: ÁREA DE MATA NATIVA DENSA
    // Floresta tropical exuberante, musgo, raízes e serrapilheira
    // ====================================================
    ctx.fillStyle = 'rgba(186, 230, 253, 0.28)';
    roundRect(ctx, 68, 48, 824, 564, 34);
    ctx.fill();

    // Borda de margem úmida e raízes da Mata
    const mataEdgeDark = lerpColor('#1a1f1c', '#064e3b', plantProgress);
    ctx.fillStyle = mataEdgeDark;
    roundRect(ctx, 73, 53, 814, 554, 31);
    ctx.fill();

    const forestBorderColor = lerpColor('#262b27', '#047857', plantProgress);
    ctx.fillStyle = forestBorderColor;
    roundRect(ctx, 76, 56, 808, 548, 30);
    ctx.fill();

    // Gradiente profundo de Mata Atlântica / Amazônica
    const forestGrad = ctx.createRadialGradient(480, 320, 70, 480, 320, 530);
    forestGrad.addColorStop(0, lerpColor('#363b35', '#10b981', plantProgress));
    forestGrad.addColorStop(0.5, lerpColor('#262b25', '#059669', plantProgress));
    forestGrad.addColorStop(0.85, lerpColor('#1b201a', '#047857', plantProgress));
    forestGrad.addColorStop(1, lerpColor('#121612', '#064e3b', plantProgress));
    ctx.fillStyle = forestGrad;
    roundRect(ctx, 80, 60, 800, 540, 28);
    ctx.fill();

    // Clareiras de musgo e luz filtrada pelas copas da Mata
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = lerpColor('#3d4f43', '#34d399', plantProgress);
    const mataGlades = [
      { x: 480, y: 200, rx: 110, ry: 55 },
      { x: 240, y: 270, rx: 95, ry: 50 },
      { x: 720, y: 270, rx: 95, ry: 50 },
      { x: 480, y: 410, rx: 130, ry: 60 }
    ];
    mataGlades.forEach(g => {
      ctx.beginPath();
      ctx.ellipse(g.x, g.y, g.rx, g.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // Caminho Verde de Musgo e Folhagem Rasteira na Floresta (Mata)
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Borda verde-musgo do caminho da floresta
    ctx.strokeStyle = lerpColor('#3b5243', '#15803d', plantProgress);
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.moveTo(480, 575);
    ctx.quadraticCurveTo(480, 390, 480, 195);
    ctx.moveTo(220, 470);
    ctx.quadraticCurveTo(480, 440, 740, 470);
    ctx.stroke();

    // Leito central verde suave do caminho na floresta
    ctx.strokeStyle = lerpColor('#4e6e58', '#4ade80', plantProgress);
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(480, 575);
    ctx.quadraticCurveTo(480, 390, 480, 195);
    ctx.moveTo(220, 470);
    ctx.quadraticCurveTo(480, 440, 740, 470);
    ctx.stroke();
    ctx.restore();

    // Marcas de queimada quando devastada vs. tufos de samambaias e musgo vivo
    if (plantProgress < 0.6) {
      ctx.fillStyle = `rgba(15, 20, 18, ${0.32 * (1 - plantProgress)})`;
      for (let fx = 120; fx < 840; fx += 50) {
        for (let fy = 90; fy < 560; fy += 45) {
          ctx.beginPath();
          ctx.ellipse(fx + Math.cos(fy) * 8, fy, 7, 3.5, 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Textura de folhagem rasteira, trevos e pequenas flores da Mata
    for (let fx = 115; fx < 845; fx += 40) {
      for (let fy = 85; fy < 575; fy += 34) {
        const mx = fx + Math.cos(fy) * 7;
        const my = fy + Math.sin(fx) * 5;
        if (plantProgress > 0.1) {
          ctx.fillStyle = `rgba(16, 185, 129, ${0.28 * plantProgress})`;
          ctx.beginPath();
          ctx.arc(mx, my, 3 * plantProgress, 0, Math.PI * 2);
          ctx.arc(mx + 3, my + 1, 2.2 * plantProgress, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  function renderLargeBridge() {
    ctx.save();
    const bx = 300;
    const by = 570;
    const bw = 360;
    const bh = 300;

    ctx.fillStyle = 'rgba(2, 25, 45, 0.65)';
    roundRect(ctx, bx - 12, by + 10, bw + 24, bh, 8);
    ctx.fill();

    const pileXCoords = [bx + 20, bx + 130, bx + 230, bx + bw - 20];
    pileXCoords.forEach(px => {
      ctx.fillStyle = '#3e1d08';
      ctx.fillRect(px - 7, by + 40, 14, bh - 80);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.ellipse(px, by + 120, 12, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(px, by + 200, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#58280a';
    ctx.fillRect(bx - 4, by, 10, bh);
    ctx.fillRect(bx + bw - 6, by, 10, bh);

    const plankHeight = 16;
    const gap = 3;
    for (let py = by; py <= by + bh - plankHeight; py += plankHeight + gap) {
      const woodVar = ((py * 13) % 4);
      const woodColors = ['#854d0e', '#78350f', '#92400e', '#a16207'];
      ctx.fillStyle = woodColors[woodVar];
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.5;

      roundRect(ctx, bx, py, bw, plankHeight, 3);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx + 15, py + 5);
      ctx.lineTo(bx + bw - 15, py + 5);
      ctx.moveTo(bx + 40, py + 11);
      ctx.lineTo(bx + bw - 40, py + 11);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(bx + 10, py + plankHeight / 2, 1.8, 0, Math.PI * 2);
      ctx.arc(bx + bw - 10, py + plankHeight / 2, 1.8, 0, Math.PI * 2);
      ctx.arc(bx + bw / 2, py + plankHeight / 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#58280a';
    ctx.strokeStyle = '#381a07';
    ctx.lineWidth = 2;

    for (let py = by + 10; py <= by + bh - 10; py += 45) {
      roundRect(ctx, bx - 6, py - 6, 10, 12, 2);
      ctx.fill();
      ctx.stroke();

      roundRect(ctx, bx + bw - 4, py - 6, 10, 12, 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx - 1, by);
    ctx.lineTo(bx - 1, by + bh);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bx + bw + 1, by);
    ctx.lineTo(bx + bw + 1, by + bh);
    ctx.stroke();

    ctx.fillStyle = '#451a03';
    ctx.fillRect(bx - 8, by - 4, bw + 16, 8);
    ctx.fillRect(bx - 8, by + bh - 4, bw + 16, 8);

    ctx.restore();
  }

  function roundRect(context, x, y, w, h, r) {
    if (typeof r === 'undefined') r = 5;
    if (typeof r === 'number') {
      r = { tl: r, tr: r, br: r, bl: r };
    } else {
      var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
      for (var side in defaultRadius) {
        r[side] = r[side] || defaultRadius[side];
      }
    }
    context.beginPath();
    context.moveTo(x + r.tl, y);
    context.lineTo(x + w - r.tr, y);
    context.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    context.lineTo(x + w, y + h - r.br);
    context.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    context.lineTo(x + r.bl, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    context.lineTo(x, y + r.tl);
    context.quadraticCurveTo(x, y, x + r.tl, y);
    context.closePath();
  }

  function renderCanteiros() {
    CANTEIROS.forEach(c => {
      ctx.save();
      ctx.translate(c.x, c.y);

      ctx.fillStyle = c.planted ? '#2b180d' : '#452b1b';
      ctx.strokeStyle = c.planted ? '#15803d' : '#26140b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = c.planted ? '#1c0f07' : '#5c3a24';
      ctx.beginPath();
      ctx.ellipse(0, -1, 11, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      if (c.planted) {
        const growth = c.growthAnim;
        const sproutH = 14 * growth;
        const sway = Math.sin(globalAnimTimer * 3 + c.x) * 1.5;

        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(sway, -sproutH / 2, sway, -sproutH);
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.ellipse(-5 + sway, -sproutH + 3, 5 * growth, 2.5 * growth, -0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.ellipse(5 + sway, -sproutH + 3, 5 * growth, 2.5 * growth, 0.4, 0, Math.PI * 2);
        ctx.fill();

        if (plantProgress >= 0.5) {
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(sway, -sproutH - 1, 2 * growth, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (currentState === State.PLANTING || currentState === State.CONCLUDED) {
        const dist = Math.hypot(lia.x - c.x, lia.y - c.y);
        const isNearby = dist <= 52;

        if (isNearby && seedsInReserve > 0) {
          const pulse = Math.sin(globalAnimTimer * 6) * 2;
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 0, 20 + pulse, 12 + pulse * 0.6, 0, 0, Math.PI * 2);
          ctx.stroke();

          const bob = Math.sin(globalAnimTimer * 5) * 2;
          ctx.save();
          ctx.translate(0, -22 + bob);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 1;
          roundRect(ctx, -34, -10, 68, 20, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#86efac';
          ctx.font = 'bold 10px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🌱 [E] Plantar', 0, 0);

          ctx.restore();
        }
      }

      ctx.restore();
    });
  }

  function renderSceneryProps() {
    SCENERY_PROPS.forEach(prop => {
      ctx.save();
      ctx.translate(prop.x, prop.y);

      if (prop.solidW) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, prop.solidH / 2 - 2, prop.solidW * 0.65, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      switch (prop.type) {
        case 'palm':
          renderPalmTree(prop.scale);
          break;
        case 'oak':
          renderOakTree(prop.scale);
          break;
        case 'pine':
          renderPineTree(prop.scale);
          break;
        case 'rock':
          renderRock(prop.scale);
          break;
        case 'shell':
          renderShell(prop.scale);
          break;
        case 'starfish':
          renderStarfish(prop.scale);
          break;
        case 'flowerpatch':
          renderFlowers(prop.scale);
          break;
        case 'shrub':
          renderShrub(prop.scale);
          break;
      }
      ctx.restore();
    });
  }

  // ==========================================================
  // CENOGRAFIA DO CERRADO (SUL) E DA MATA NATIVA (NORTE)
  // ==========================================================
  function renderPalmTree(scale) {
    // Árvore Típica do Cerrado: Ipê-Amarelo / Pequizeiro de tronco tortuoso e casca grossa
    ctx.scale(scale, scale);

    // Pétalas douradas caídas ao redor da raiz quando revitalizado
    if (plantProgress > 0.35) {
      ctx.fillStyle = `rgba(250, 204, 21, ${0.45 * plantProgress})`;
      const fallen = [
        { x: -12, y: 8, r: 2 }, { x: -5, y: 11, r: 1.8 },
        { x: 7, y: 9, r: 2.2 }, { x: 14, y: 6, r: 1.6 },
        { x: 2, y: 12, r: 1.5 }
      ];
      fallen.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Tronco tortuoso e cortiçoso característico do Cerrado
    ctx.strokeStyle = lerpColor('#2e1c10', '#5c3419', plantProgress);
    ctx.lineWidth = 7.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.bezierCurveTo(-9, -4, 7, -16, -3, -28);
    ctx.stroke();

    // Casca sulcada (textura suberosa)
    ctx.strokeStyle = lerpColor('#472c1b', '#854d0e', plantProgress);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-1, 5);
    ctx.quadraticCurveTo(-6, -6, 1, -15);
    ctx.stroke();

    // Galhos retorcidos do Cerrado
    ctx.strokeStyle = lerpColor('#29180e', '#4a2912', plantProgress);
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    // Galho esquerdo
    ctx.moveTo(-1, -18);
    ctx.quadraticCurveTo(-14, -22, -18, -32);
    // Galho direito
    ctx.moveTo(1, -20);
    ctx.quadraticCurveTo(14, -24, 17, -33);
    // Galho central
    ctx.moveTo(-3, -26);
    ctx.quadraticCurveTo(-6, -35, 2, -41);
    ctx.stroke();

    // Florada exuberante de Ipê-Amarelo e folhas do Cerrado
    if (plantProgress > 0.04) {
      const growth = plantProgress;
      const sway = Math.sin(globalAnimTimer * 1.6) * 1.5;
      ctx.save();
      ctx.translate(sway, 0);

      // Folhagem verde-oliva de base
      ctx.fillStyle = '#4d7c0f';
      ctx.beginPath();
      ctx.arc(-14, -31, 10 * growth, 0, Math.PI * 2);
      ctx.arc(13, -32, 10 * growth, 0, Math.PI * 2);
      ctx.arc(0, -37, 12 * growth, 0, Math.PI * 2);
      ctx.fill();

      // Cachos dourados vibrantes do Ipê-Amarelo
      const ipeClusters = [
        { x: -17, y: -33, r: 12 * growth, c: '#eab308' },
        { x: 15, y: -34, r: 12 * growth, c: '#eab308' },
        { x: -6, y: -39, r: 14 * growth, c: '#facc15' },
        { x: 7, y: -38, r: 13 * growth, c: '#facc15' },
        { x: 0, y: -43, r: 11 * growth, c: '#fef08a' }
      ];
      ipeClusters.forEach(cl => {
        ctx.fillStyle = cl.c;
        ctx.beginPath();
        ctx.arc(cl.x, cl.y, cl.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Pequenas flores individuais iluminadas
      if (plantProgress >= 0.5) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-12, -36, 1.8 * growth, 0, Math.PI * 2);
        ctx.arc(10, -37, 1.8 * growth, 0, Math.PI * 2);
        ctx.arc(0, -45, 2 * growth, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function renderOakTree(scale) {
    // Grande Árvore da Mata Nativa (Samaúma / Jatobá / Figueira com sapopembas e cipós)
    ctx.scale(scale, scale);

    // Raízes tabulares (sapopembas) largas na base
    ctx.fillStyle = lerpColor('#241710', '#45220d', plantProgress);
    ctx.beginPath();
    ctx.moveTo(-14, 10);
    ctx.quadraticCurveTo(-7, 2, -6, -12);
    ctx.lineTo(6, -12);
    ctx.quadraticCurveTo(7, 2, 14, 10);
    ctx.closePath();
    ctx.fill();

    // Detalhe de luz no tronco
    ctx.fillStyle = lerpColor('#332118', '#693616', plantProgress);
    ctx.beginPath();
    ctx.moveTo(-5, 9);
    ctx.lineTo(-3, -12);
    ctx.lineTo(2, -12);
    ctx.lineTo(4, 9);
    ctx.closePath();
    ctx.fill();

    // Galhos imponentes da árvore da Mata
    ctx.strokeStyle = lerpColor('#1c130d', '#3b1d0b', plantProgress);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-2, -10);
    ctx.lineTo(-16, -24);
    ctx.lineTo(-22, -30);

    ctx.moveTo(2, -10);
    ctx.lineTo(16, -24);
    ctx.lineTo(22, -30);

    ctx.moveTo(0, -10);
    ctx.lineTo(0, -34);
    ctx.lineTo(7, -40);

    ctx.moveTo(-10, -18);
    ctx.lineTo(-6, -28);
    ctx.moveTo(10, -18);
    ctx.lineTo(6, -28);
    ctx.stroke();

    if (plantProgress > 0.04) {
      const growth = plantProgress;
      const sway = Math.sin(globalAnimTimer * 1.4) * 1.2;

      // Cipós verdes pendentes da copa da Mata
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-15, -18);
      ctx.quadraticCurveTo(-17 + sway, -10, -15 + sway, -3 * growth);
      ctx.moveTo(15, -18);
      ctx.quadraticCurveTo(17 + sway, -10, 15 + sway, -4 * growth);
      ctx.stroke();

      // Copa densa tropical em camadas
      const canopyLayers = [
        { x: -15, y: -22, r: 17 * growth, c: '#064e3b' },
        { x: 15, y: -22, r: 17 * growth, c: '#064e3b' },
        { x: 0, y: -28, r: 24 * growth, c: '#047857' },
        { x: -11, y: -25, r: 16 * growth, c: '#059669' },
        { x: 11, y: -25, r: 16 * growth, c: '#059669' },
        { x: 0, y: -33, r: 17 * growth, c: '#10b981' },
        { x: -4, y: -36, r: 10 * growth, c: '#34d399' }
      ];

      canopyLayers.forEach(leaf => {
        ctx.fillStyle = leaf.c;
        ctx.beginPath();
        ctx.arc(leaf.x + sway * 0.4, leaf.y, leaf.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Orquídeas epífitas e frutos silvestres na copa da Mata
      if (plantProgress >= 0.65) {
        // Orquídea roxa/rosa no tronco
        ctx.fillStyle = '#e879f9';
        ctx.beginPath();
        ctx.arc(-4, -8, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Frutos tropicais vermelhos/dourados na copa
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(-9, -27, 2.6, 0, Math.PI * 2);
        ctx.arc(10, -23, 2.6, 0, Math.PI * 2);
        ctx.arc(3, -37, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function renderPineTree(scale) {
    // Araucária / Palmeira Jussara da Mata Atlântica
    ctx.scale(scale, scale);

    // Tronco alto anelado
    ctx.fillStyle = lerpColor('#261509', '#4a250d', plantProgress);
    ctx.fillRect(-4, -18, 8, 26);

    // Anéis do tronco
    ctx.strokeStyle = lerpColor('#170d05', '#2e1607', plantProgress);
    ctx.lineWidth = 1.2;
    for (let ty = -14; ty <= 4; ty += 5) {
      ctx.beginPath();
      ctx.moveTo(-4, ty);
      ctx.lineTo(4, ty);
      ctx.stroke();
    }

    // Galhos em candelabro típicos da Mata
    ctx.strokeStyle = lerpColor('#1f1007', '#3b1d0b', plantProgress);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.quadraticCurveTo(-14, -14, -20, -24);
    ctx.moveTo(0, -16);
    ctx.quadraticCurveTo(14, -14, 20, -24);
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(-10, -24, -14, -32);
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(10, -24, 14, -32);
    ctx.moveTo(0, -18);
    ctx.lineTo(0, -36);
    ctx.stroke();

    if (plantProgress > 0.04) {
      const growth = plantProgress;
      const crowns = [
        { x: -19, y: -25, rx: 11 * growth, ry: 5.5 * growth, c: '#064e3b' },
        { x: 19, y: -25, rx: 11 * growth, ry: 5.5 * growth, c: '#064e3b' },
        { x: -13, y: -33, rx: 12 * growth, ry: 6 * growth, c: '#047857' },
        { x: 13, y: -33, rx: 12 * growth, ry: 6 * growth, c: '#047857' },
        { x: 0, y: -37, rx: 14 * growth, ry: 6.5 * growth, c: '#10b981' }
      ];

      crowns.forEach(cr => {
        ctx.fillStyle = cr.c;
        ctx.beginPath();
        ctx.ellipse(cr.x, cr.y, cr.rx, cr.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  function renderRock(scale) {
    // Afloramento Rochoso de Arenito / Quartzito do Cerrado
    ctx.scale(scale, scale);
    ctx.fillStyle = lerpColor('#57534e', '#9a3412', plantProgress * 0.4);
    ctx.beginPath();
    ctx.moveTo(-17, 8);
    ctx.lineTo(-13, -7);
    ctx.lineTo(-2, -13);
    ctx.lineTo(11, -10);
    ctx.lineTo(18, 4);
    ctx.lineTo(9, 10);
    ctx.closePath();
    ctx.fill();

    // Faceta superior iluminada pelo sol do Cerrado
    ctx.fillStyle = lerpColor('#78716c', '#d97706', plantProgress * 0.5);
    ctx.beginPath();
    ctx.moveTo(-11, -5);
    ctx.lineTo(-2, -11);
    ctx.lineTo(9, -8);
    ctx.lineTo(12, 0);
    ctx.lineTo(-3, 2);
    ctx.closePath();
    ctx.fill();

    // Liquens e bromélia rupestre sobre a rocha
    if (plantProgress > 0.2) {
      ctx.fillStyle = '#65a30d';
      ctx.beginPath();
      ctx.arc(-7, -3, 3.2 * plantProgress, 0, Math.PI * 2);
      ctx.arc(3, -6, 2.8 * plantProgress, 0, Math.PI * 2);
      ctx.fill();

      if (plantProgress > 0.6) {
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(-7, -4, 1.6 * plantProgress, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function renderShell(scale) {
    // Cupinzeiro de Terra Vermelha Típico do Cerrado (com bioluminescência na restauração)
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = lerpColor('#443730', '#9a3412', plantProgress);
    ctx.strokeStyle = lerpColor('#29201b', '#7c2d12', plantProgress);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-7, 4);
    ctx.quadraticCurveTo(-6, -8, -1, -10);
    ctx.quadraticCurveTo(3, -11, 5, -5);
    ctx.quadraticCurveTo(8, -2, 7, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pontos de luz de vagalumes do Cerrado quando revitalizado
    if (plantProgress > 0.4) {
      const glow = 0.5 + Math.sin(globalAnimTimer * 5) * 0.4;
      ctx.fillStyle = `rgba(163, 230, 53, ${glow * plantProgress})`;
      ctx.beginPath();
      ctx.arc(-2, -4, 1.4, 0, Math.PI * 2);
      ctx.arc(2, -1, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function renderStarfish(scale) {
    // Flor Caliandra / Sempre-Viva do Cerrado
    ctx.scale(scale, scale);
    if (plantProgress <= 0.08) {
      // Ramo seco antes do plantio
      ctx.strokeStyle = '#443730';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-4, 3);
      ctx.lineTo(0, -3);
      ctx.lineTo(4, 3);
      ctx.stroke();
      return;
    }

    const growth = plantProgress;
    // Folhas de base
    ctx.fillStyle = '#4d7c0f';
    ctx.beginPath();
    ctx.ellipse(-4, 2, 4 * growth, 2 * growth, -0.4, 0, Math.PI * 2);
    ctx.ellipse(4, 2, 4 * growth, 2 * growth, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Estames vermelhos/rosados abertos em leque (Caliandra do Cerrado)
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 7; i++) {
      const ang = -Math.PI + (i / 6) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.lineTo(Math.cos(ang) * 7 * growth, 1 + Math.sin(ang) * 7 * growth);
      ctx.stroke();
    }
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(0, 1, 2 * growth, 0, Math.PI * 2);
    ctx.fill();
  }

  function renderFlowers(scale) {
    // Canteiro de Bromélias e Helicônias da Mata
    ctx.scale(scale, scale);
    if (plantProgress <= 0.05) {
      ctx.strokeStyle = '#3a342d';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-4, 3); ctx.lineTo(-1, -5);
      ctx.moveTo(3, 3); ctx.lineTo(5, -4);
      ctx.stroke();
      return;
    }
    const growth = plantProgress;
    // Folhas largas tropicais
    ctx.fillStyle = '#047857';
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.ellipse(Math.cos(ang) * 6 * growth, Math.sin(ang) * 4 * growth, 6 * growth, 2.5 * growth, ang, 0, Math.PI * 2);
      ctx.fill();
    }
    // Flores tropicais vibrantes
    const colors = ['#f43f5e', '#f97316', '#a855f7', '#facc15', '#ec4899'];
    for (let i = 0; i < 5; i++) {
      const fx = (i - 2) * 5.5;
      const fy = Math.sin(i * 1.6) * 4;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(fx, fy - 2, 3.2 * growth, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function renderShrub(scale) {
    // Samambaia Imperial & Arbusto da Mata
    ctx.scale(scale, scale);
    if (plantProgress <= 0.05) {
      ctx.strokeStyle = '#2d241e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 4); ctx.lineTo(-7, -4);
      ctx.moveTo(0, 4); ctx.lineTo(7, -4);
      ctx.moveTo(0, 4); ctx.lineTo(0, -7);
      ctx.stroke();
      return;
    }
    const g = plantProgress;
    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    ctx.arc(-7 * g, 0, 7.5 * g, 0, Math.PI * 2);
    ctx.arc(7 * g, 0, 7.5 * g, 0, Math.PI * 2);
    ctx.arc(0, -6 * g, 9 * g, 0, Math.PI * 2);
    ctx.fill();

    // Frondes de samambaia verde-claro
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(-4 * g, -2 * g, 5 * g, 0, Math.PI * 2);
    ctx.arc(4 * g, -2 * g, 5 * g, 0, Math.PI * 2);
    ctx.arc(0, -7 * g, 5.5 * g, 0, Math.PI * 2);
    ctx.fill();
  }

  function renderButterflies() {
    if (plantedCount === 0) return;
    const activeButterflies = Math.min(BUTTERFLIES.length, Math.floor(plantedCount * 1.2));
    for (let i = 0; i < activeButterflies; i++) {
      const b = BUTTERFLIES[i];
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(b.scale, b.scale);

      const flap = Math.max(0.2, Math.abs(Math.cos(b.phase)));

      // Asas superiores e inferiores com borda escura (estilo Morpho / Borboleta do Cerrado)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(-4.5 * flap, -2.5, 5.8 * flap, 7.5, -0.3, 0, Math.PI * 2);
      ctx.ellipse(4.5 * flap, -2.5, 5.8 * flap, 7.5, 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.ellipse(-4 * flap, -2.5, 4.6 * flap, 6.2, -0.3, 0, Math.PI * 2);
      ctx.ellipse(4 * flap, -2.5, 4.6 * flap, 6.2, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Brilho branco nas asas
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(-4.5 * flap, -4, 1.1 * flap, 0, Math.PI * 2);
      ctx.arc(4.5 * flap, -4, 1.1 * flap, 0, Math.PI * 2);
      ctx.fill();

      // Corpo
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.3, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  function renderBirds() {
    if (plantedCount < 2) return;
    const activeBirds = Math.min(BIRDS.length, Math.floor(plantedCount * 0.6));
    const birdPalettes = [
      { wing: '#ef4444', tip: '#2563eb', body: '#facc15' }, // Arara-vermelha / Canindé
      { wing: '#0284c7', tip: '#1e3a8a', body: '#38bdf8' }, // Arara-azul
      { wing: '#16a34a', tip: '#ca8a04', body: '#4ade80' }  // Periquito / Papagaio
    ];
    for (let i = 0; i < activeBirds; i++) {
      const bird = BIRDS[i];
      const pal = birdPalettes[i % birdPalettes.length];
      ctx.save();
      ctx.translate(bird.x, bird.y);

      const flap = Math.sin(bird.phase);

      // Cauda longa de Arara
      ctx.strokeStyle = pal.tip;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(-12, 2 - flap * 1.5);
      ctx.stroke();

      // Asas arqueadas batendo
      ctx.strokeStyle = pal.wing;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(-bird.size * 0.8, flap * 5);
      ctx.quadraticCurveTo(-bird.size * 0.3, -bird.size * 0.7 + flap * 2, 0, 0);
      ctx.quadraticCurveTo(bird.size * 0.3, -bird.size * 0.7 + flap * 2, bird.size * 0.8, flap * 5);
      ctx.stroke();

      // Corpo e cabeça
      ctx.fillStyle = pal.body;
      ctx.beginPath();
      ctx.ellipse(1, 0, 3.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  function renderSeeds() {
    seeds.forEach(seed => {
      if (!seed.collected) {
        ctx.save();
        ctx.translate(seed.x, seed.y);

        const pulse = Math.sin(globalAnimTimer * 4 + seed.glowTimer) * 2;
        const currentR = seed.radius + pulse;
        const isRare = seed.type === 'rara';

        // 1. Sombra suave sob a semente
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 9, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Halo radiante característico (dourado para comum, celeste para rara)
        const haloGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, currentR + 10);
        if (isRare) {
          haloGrad.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
          haloGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.45)');
          haloGrad.addColorStop(1, 'rgba(3, 105, 161, 0)');
        } else {
          haloGrad.addColorStop(0, 'rgba(251, 191, 36, 0.85)');
          haloGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)');
          haloGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
        }
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(0, 0, currentR + 10, 0, Math.PI * 2);
        ctx.fill();

        // 3. Renderização com Imagem PNG ou Fallback Procedural no Canvas
        let drewSeedImage = false;
        if (gameAssets.semente.loaded) {
          drewSeedImage = drawAssetImage(gameAssets.semente, gameAssets.semente.targetWidth, gameAssets.semente.targetHeight);
        }

        if (!drewSeedImage) {
          if (isRare) {
            // Forma de Gema Celeste Lapidada (Rara - 3 pts)
            ctx.save();
            ctx.rotate(Math.sin(globalAnimTimer * 2 + seed.glowTimer) * 0.15);
            ctx.fillStyle = '#0284c7';
            ctx.strokeStyle = '#e0f2fe';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(0, -currentR - 3);
            ctx.lineTo(currentR + 1, 0);
            ctx.lineTo(0, currentR + 3);
            ctx.lineTo(-currentR - 1, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Facetas internas da gema
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(0, -currentR - 1);
            ctx.lineTo(currentR * 0.6, 0);
            ctx.lineTo(0, currentR * 0.6);
            ctx.lineTo(-currentR * 0.6, 0);
            ctx.closePath();
            ctx.fill();

            // Ponto de luz
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-2, -3, 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else {
            // Forma de Semente Oval Dourada (Comum - 1 pt)
            ctx.fillStyle = '#b45309';
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(0, 1, currentR - 1, currentR + 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Broto foliar
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.ellipse(0, -currentR + 1, 3.5, 5, 0.2, 0, Math.PI * 2);
            ctx.fill();

            // Brilho suave
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-2, -3, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 4. Rótulo textual de acessibilidade e pontuação (1pt ou 3pt)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = isRare ? '#38bdf8' : '#fbbf24';
        ctx.lineWidth = 1;
        roundRect(ctx, -12, currentR + 2, 24, 12, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isRare ? '#7dd3fc' : '#fef08a';
        ctx.font = 'bold 8px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isRare ? '3pt' : '1pt', 0, currentR + 8);

        ctx.restore();
      }
    });
  }

  function renderSparkles() {
    ctx.save();
    sparkles.forEach(sp => {
      const alpha = Math.max(0, sp.life / sp.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = sp.color;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function renderSignposts() {
    SIGNPOSTS.forEach(sign => {
      ctx.save();
      ctx.translate(sign.x, sign.y);

      const isExpanded = sign.expandedTimer > 0;
      const isHovered = sign.isHovered;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, 14, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#5c2c0e';
      ctx.strokeStyle = '#381a07';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-4, -6, 8, 20);
      ctx.strokeRect(-4, -6, 8, 20);

      ctx.save();
      if (isHovered || isExpanded) {
        const hoverPulse = Math.sin(globalAnimTimer * 6) * 1.5;
        ctx.translate(0, -2 + hoverPulse);
      }

      const displayText = isExpanded ? sign.fullName : sign.shortLabel;
      ctx.font = 'bold 12px system-ui, sans-serif';
      const textMetrics = ctx.measureText(displayText);
      const boardW = textMetrics.width + 36;
      const boardH = 26;
      const boardX = -boardW / 2;
      const boardY = -28;

      sign.renderedW = boardW;
      sign.renderedH = boardH;
      sign.renderedX = sign.x + boardX;
      sign.renderedY = sign.y + boardY;

      if (isHovered || isExpanded) {
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 5;
      }

      ctx.fillStyle = isExpanded ? '#92400e' : (isHovered ? '#a16207' : '#854d0e');
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      roundRect(ctx, boardX, boardY, boardW, boardH, 5);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(boardX + 6, boardY + 7);
      ctx.lineTo(boardX + boardW - 6, boardY + 7);
      ctx.moveTo(boardX + 10, boardY + 18);
      ctx.lineTo(boardX + boardW - 10, boardY + 18);
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(boardX + 6, boardY + boardH / 2, 1.5, 0, Math.PI * 2);
      ctx.arc(boardX + boardW - 6, boardY + boardH / 2, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef3c7';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(`${sign.icon} ${displayText}`, 0, boardY + boardH / 2);

      if (!isExpanded && isHovered) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.fillText('Clique para abrir', 0, boardY - 8);
      }

      ctx.restore();
      ctx.restore();
    });
  }

  function renderPatrolRoute() {
    ctx.save();
    // 1. Linha de patrulha da Onça-Pintada
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(fogGuard.minX, fogGuard.y);
    ctx.lineTo(fogGuard.maxX, fogGuard.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Rota orbital das sementes raras percorrida pelo Segundo Guardião
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.28)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    RARE_SEED_WAYPOINTS.forEach((wp, idx) => {
      if (idx === 0) ctx.moveTo(wp.x, wp.y);
      else ctx.lineTo(wp.x, wp.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Marcador de antecipação no limite de virada (0,6s antes de inverter)
    if (fogGuard.isTurningSoon) {
      const turnX = fogGuard.direction === 1 ? fogGuard.maxX : fogGuard.minX;
      const p = fogGuard.turnWarningProgress;
      const dSize = 7 + Math.sin(p * Math.PI) * 3;

      ctx.save();
      ctx.translate(turnX, fogGuard.y);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -dSize);
      ctx.lineTo(dSize, 0);
      ctx.lineTo(0, dSize);
      ctx.lineTo(-dSize, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  // ==========================================================
  // GUARDA DE NÉVOA: ONÇA-PINTADA ESPECTRAL (ARTE DETALHADA)
  // Corpo felino musculoso, 4 patas articuladas, rosetas reais,
  // orelhas arredondadas com pinta branca, bigodes e olhos brilhantes
  // ==========================================================
  function renderJaguarGuard() {
    ctx.save();
    ctx.translate(fogGuard.x, fogGuard.y);

    const pulse = Math.sin(globalAnimTimer * 5) * 3;
    const stride = Math.sin(globalAnimTimer * 8.5);
    const isFacingRight = fogGuard.direction === 1;
    const dir = isFacingRight ? 1 : -1;
    const warnActive = fogGuard.isTurningSoon;
    const warnProg = fogGuard.turnWarningProgress || 0;
    const warnPulse = warnActive ? Math.sin(warnProg * Math.PI) : 0;

    // 1. Aura Espectral de Névoa em Camadas e Brilho Intensificado no Aviso (0,6s antes da virada)
    const auraRadius = (warnActive ? 48 + warnPulse * 8 : 44) + pulse;
    const mistGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, auraRadius);
    if (warnActive) {
      mistGrad.addColorStop(0, 'rgba(255, 255, 255, 0.78)');
      mistGrad.addColorStop(0.38, 'rgba(250, 204, 21, 0.62)');
      mistGrad.addColorStop(0.72, 'rgba(56, 189, 248, 0.42)');
      mistGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    } else {
      mistGrad.addColorStop(0, 'rgba(250, 204, 21, 0.65)');
      mistGrad.addColorStop(0.45, 'rgba(56, 189, 248, 0.38)');
      mistGrad.addColorStop(0.75, 'rgba(148, 163, 184, 0.22)');
      mistGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    }
    ctx.fillStyle = mistGrad;
    ctx.beginPath();
    ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    // Mudança de Forma no Aviso de Virada: Moldura em Losango Tracejado de Alto Contraste (não depende só de cor)
    if (warnActive) {
      const diamondW = 34 + warnPulse * 6;
      const diamondH = 24 + warnPulse * 5;
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(0, -diamondH);
      ctx.lineTo(diamondW, 0);
      ctx.lineTo(0, diamondH);
      ctx.lineTo(-diamondW, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Partículas de névoa flutuando ao redor da onça
    ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
    for (let m = 0; m < 4; m++) {
      const mAng = globalAnimTimer * 2 + (m * Math.PI) / 2;
      const mx = Math.cos(mAng) * 26;
      const my = Math.sin(mAng) * 14;
      ctx.beginPath();
      ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Sombra densa no chão da Mata
    ctx.fillStyle = 'rgba(10, 18, 28, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, 15, 25, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    // Breve compressão de forma quando prepara o impulso de virada (0,6s antes)
    const pivotScaleX = warnActive ? (1 - 0.12 * warnPulse) : 1;
    const pivotScaleY = warnActive ? (1 + 0.08 * warnPulse) : 1;
    ctx.scale(dir * pivotScaleX, pivotScaleY); // Espelha perfeitamente conforme a direção da patrulha

    let drewJaguarImage = false;
    if (gameAssets.guarda.loaded) {
      drewJaguarImage = drawAssetImage(gameAssets.guarda, gameAssets.guarda.targetWidth, gameAssets.guarda.targetHeight, false);
    }

    if (!drewJaguarImage) {
      // 3. Cauda Felina Longa, Grossa e Sinuosa com Anéis e Ponta Preta
    const tailSway = Math.sin(globalAnimTimer * 4.5) * 4;
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-17, 0);
    ctx.bezierCurveTo(-26, -3 + tailSway * 0.5, -31, -11 + tailSway, -36, -8 + tailSway);
    ctx.stroke();

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 4.5;
    ctx.stroke();

    // Anéis e ponta negra da cauda da onça
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 4.8;
    ctx.beginPath();
    ctx.moveTo(-32, -10 + tailSway);
    ctx.lineTo(-36, -8 + tailSway);
    ctx.stroke();

    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(-24, -2 + tailSway * 0.4, 2, 0, Math.PI * 2);
    ctx.arc(-28, -6 + tailSway * 0.7, 2, 0, Math.PI * 2);
    ctx.fill();

    // 4. Patas Traseiras e Dianteiras de Fundo (Passada Felina)
    ctx.fillStyle = '#ca8a04';
    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = 1.4;
    // Pata traseira de trás
    ctx.beginPath();
    ctx.ellipse(-11 - stride * 4.5, 9, 4, 6.5, stride * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Pata dianteira de trás
    ctx.beginPath();
    ctx.ellipse(10 + stride * 4.5, 9, 3.8, 6.5, -stride * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 5. Torso Musculoso da Onça-Pintada (Ombros e Quadris Definidos)
    const bodyGrad = ctx.createLinearGradient(0, -12, 0, 13);
    bodyGrad.addColorStop(0, '#f59e0b');
    bodyGrad.addColorStop(0.55, '#eab308');
    bodyGrad.addColorStop(1, '#fef08a'); // Ventre claro típico da onça
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.moveTo(-18, -2);
    ctx.bezierCurveTo(-18, -12, -4, -12, 4, -10);
    ctx.bezierCurveTo(13, -11, 20, -6, 19, 3);
    ctx.bezierCurveTo(18, 11, 6, 12, -4, 10);
    ctx.bezierCurveTo(-14, 11, -19, 6, -18, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 6. Patas do Primeiro Plano com Almofadas
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    // Pata traseira da frente
    ctx.beginPath();
    ctx.ellipse(-12 + stride * 4.5, 10, 4.5, 6.8, -stride * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Pata dianteira da frente
    ctx.beginPath();
    ctx.ellipse(11 - stride * 4.5, 10, 4.2, 6.8, stride * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 7. Rosetas Autênticas da Onça-Pintada (Anel escuro + interior alaranjado + ponto central)
    const rosettes = [
      { x: -11, y: -3, r: 3.6 },
      { x: -3, y: -5, r: 3.8 },
      { x: 5, y: -3, r: 3.5 },
      { x: -6, y: 3, r: 3.4 },
      { x: 2, y: 4, r: 3.2 },
      { x: 10, y: 2, r: 2.8 }
    ];
    rosettes.forEach(ros => {
      // Centro quente da roseta
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(ros.x, ros.y, ros.r, 0, Math.PI * 2);
      ctx.fill();

      // Anel segmentado preto ao redor da roseta
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ros.x, ros.y, ros.r, 0.2, 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ros.x, ros.y, ros.r, 2.3, 4.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ros.x, ros.y, ros.r, 4.5, 6.0);
      ctx.stroke();

      // Pinta preta interna característica da onça-pintada (Panthera onca)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(ros.x, ros.y, 0.9, 0, Math.PI * 2);
      ctx.fill();
    });

    // 8. Cabeça Poderosa da Onça-Pintada
    ctx.translate(15, -6);

    // Orelhas arredondadas (pretas com mancha branca central característica)
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(-5, -9, 4.2, 0, Math.PI * 2);
    ctx.arc(4, -9, 4.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fef9c3';
    ctx.beginPath();
    ctx.arc(-5, -9, 2, 0, Math.PI * 2);
    ctx.arc(4, -9, 2, 0, Math.PI * 2);
    ctx.fill();

    // Crânio largo e mandíbula forte
    const headGrad = ctx.createRadialGradient(0, -1, 2, 0, 0, 12);
    headGrad.addColorStop(0, '#fde047');
    headGrad.addColorStop(1, '#ca8a04');
    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10.5, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pintas na testa da onça
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(-3, -5, 1.3, 0, Math.PI * 2);
    ctx.arc(1, -6, 1.2, 0, Math.PI * 2);
    ctx.arc(-5, -2, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Focinho e almofadas brancas dos bigodes
    ctx.fillStyle = '#fef9c3';
    ctx.beginPath();
    ctx.ellipse(6, 2.5, 5, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nariz felino triangular rosado-escuro/preto
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.moveTo(9.5, 0);
    ctx.lineTo(6.5, -1.5);
    ctx.lineTo(7, 2);
    ctx.closePath();
    ctx.fill();

    // Bigodes brancos espectrais
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(7, 3); ctx.lineTo(13, 2);
    ctx.moveTo(7, 4); ctx.lineTo(12, 5);
    ctx.stroke();

    // Olhos Felinos Espectrais Brilhantes (Ciano luminoso com fenda vertical)
    ctx.save();
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(3.5, -2, 2.6, 2.0, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Pupila vertical de predador
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(4, -2, 0.8, 1.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    }

    ctx.restore(); // Fim do espelhamento horizontal

    // 9. Rótulo de Acessibilidade Textual e Seta Direcional Viva
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ONÇA', 0, 26);

    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (isFacingRight) {
      ctx.moveTo(22, -6);
      ctx.lineTo(32, 0);
      ctx.lineTo(22, 6);
      ctx.closePath();
    } else {
      ctx.moveTo(-22, -6);
      ctx.lineTo(-32, 0);
      ctx.lineTo(-22, 6);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 10. Sinal de Antecipação de Virada (0,6s antes): Seta da Próxima Direção + Emblema Geométrico
    if (warnActive) {
      const nextDir = fogGuard.nextDirection; // -1 (esquerda) ou 1 (direita)
      const shift = warnPulse * 3;

      ctx.save();
      // Seta dupla apontando para a direção da próxima virada
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      if (nextDir === 1) {
        ctx.moveTo(24 + shift, -7);
        ctx.lineTo(35 + shift, 0);
        ctx.lineTo(24 + shift, 7);
        ctx.closePath();
      } else {
        ctx.moveTo(-24 - shift, -7);
        ctx.lineTo(-35 - shift, 0);
        ctx.lineTo(-24 - shift, 7);
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();

      // Etiqueta compacta acessível indicando a próxima virada (não esconde Lia e não depende só de cor)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5;
      roundRect(ctx, -32, -39, 64, 15, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(nextDir === -1 ? '◆ VIRA ◀' : '◆ VIRA ▶', 0, -31.5);
      ctx.restore();
    }

    ctx.restore();
  }

  // ==========================================================
  // SEGUNDO GUARDIÃO: GUARDIÃO CELESTE DAS SEMENTES RARAS (RISCO EXTRA)
  // Anda em ciclo contínuo de semente rara em semente rara
  // com a mesma velocidade de Lia (105 px/s).
  // ==========================================================
  function renderSecondGuard() {
    ctx.save();
    ctx.translate(secondGuard.x, secondGuard.y);

    const pulse = Math.sin(globalAnimTimer * 6) * 3;
    const flap = Math.sin(globalAnimTimer * 10);
    const isFacingRight = secondGuard.direction === 1;
    const dir = isFacingRight ? 1 : -1;

    // 1. Sombra suave no solo
    ctx.fillStyle = 'rgba(10, 18, 28, 0.38)';
    ctx.beginPath();
    ctx.ellipse(0, 14, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Aura Celestial Mística Violeta/Ciano
    const mistGrad = ctx.createRadialGradient(0, 0, 6, 0, 0, 38 + pulse);
    mistGrad.addColorStop(0, 'rgba(236, 72, 153, 0.7)');
    mistGrad.addColorStop(0.45, 'rgba(168, 85, 247, 0.45)');
    mistGrad.addColorStop(0.8, 'rgba(56, 189, 248, 0.25)');
    mistGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = mistGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 38 + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.scale(dir, 1);

    // 3. Asas Espectrais do Guardião Celeste
    ctx.fillStyle = '#7c3aed';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.8;
    // Asa esquerda / de trás
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.quadraticCurveTo(-18, -20 + flap * 4, -28, -8 + flap * 6);
    ctx.quadraticCurveTo(-14, 2, -2, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Asa direita / da frente
    ctx.fillStyle = '#9333ea';
    ctx.beginPath();
    ctx.moveTo(4, -6);
    ctx.quadraticCurveTo(18, -22 + flap * 5, 28, -8 + flap * 6);
    ctx.quadraticCurveTo(14, 2, 2, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Corpo Espectral Astral
    const bodyGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 12);
    bodyGrad.addColorStop(0, '#f472b6');
    bodyGrad.addColorStop(0.6, '#a855f7');
    bodyGrad.addColorStop(1, '#6366f1');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Olhos celestes brilhantes
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(3, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(3.5, -4.5, 1, 0, Math.PI * 2);
    ctx.fill();

    // Bico/Focinho espectral
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(8, -3);
    ctx.lineTo(13, -2);
    ctx.lineTo(8, 1);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // 5. Rótulo de Acessibilidade Textual
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.2;
    roundRect(ctx, -38, 20, 76, 14, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e9d5ff';
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GUARDIÃO 105px/s', 0, 27);

    // Seta direcional do movimento
    ctx.save();
    ctx.rotate(secondGuard.angle || 0);
    ctx.fillStyle = '#a855f7';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(20, -5);
    ctx.lineTo(28, 0);
    ctx.lineTo(20, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // ==========================================================
  // PROTAGONISTA: LIA, O LOBO-GUARÁ (ARTE RICA E DETALHADA)
  // Pelagem dourado-avermelhada, pernas longas pretas articuladas,
  // crina negra eriçada, peitoral branco, orelhas grandes felpudas,
  // cauda de ponta branca e mochila de exploradora detalhada
  // ==========================================================
  function renderManedWolfLia() {
    ctx.save();
    ctx.translate(lia.x, lia.y);

    const bobbing = lia.isMoving ? Math.sin(lia.walkCycle) * 2.2 : Math.sin(globalAnimTimer * 2.5) * 0.6;
    ctx.translate(0, bobbing);

    // 1. Sombra suave no solo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.ellipse(0, lia.radius + 1 - bobbing, lia.radius * 1.05, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    let drewLiaImage = false;
    if (gameAssets.lia.loaded) {
      drewLiaImage = drawAssetImage(gameAssets.lia, gameAssets.lia.targetWidth, gameAssets.lia.targetHeight, lia.facing === 'left');
      if (drewLiaImage) {
        // Tag de Acessibilidade Visual "Lia"
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        roundRect(ctx, -20, -43, 40, 15, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Lia 🐺', 0, -32);
        ctx.restore();
      }
    }

    if (!drewLiaImage) {
      // 2. Cauda Volumosa e Felpuda do Lobo-Guará (Base ruiva + Metade final Branca)
    ctx.save();
    const tailWag = Math.sin(globalAnimTimer * 6.5) * 4.5;
    let tailEndX = tailWag;
    let tailEndY = 25;
    let tailMidX = tailWag * 0.6;
    let tailMidY = 17;

    if (lia.facing === 'down') {
      tailMidX = -7; tailMidY = 13;
      tailEndX = -11 + tailWag * 0.5; tailEndY = 20;
    } else if (lia.facing === 'right') {
      tailMidX = -17; tailMidY = 8 + tailWag * 0.4;
      tailEndX = -25; tailEndY = 14 + tailWag;
    } else if (lia.facing === 'left') {
      tailMidX = 17; tailMidY = 8 + tailWag * 0.4;
      tailEndX = 25; tailEndY = 14 + tailWag;
    }

    // Base ruiva da cauda
    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.quadraticCurveTo(tailMidX, tailMidY, tailEndX, tailEndY);
    ctx.stroke();

    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 6.2;
    ctx.stroke();

    // Ponta branca cremosa felpuda (marca registrada do lobo-guará)
    ctx.strokeStyle = '#fff7ed';
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo((tailMidX + tailEndX) * 0.5, (tailMidY + tailEndY) * 0.5);
    ctx.lineTo(tailEndX, tailEndY);
    ctx.stroke();
    ctx.restore();

    // 3. Pernas Longas e Esguias com "Meias Pretas" Articuladas
    const strideA = lia.isMoving ? Math.sin(lia.walkCycle) * 5 : 0;
    const strideB = lia.isMoving ? -Math.sin(lia.walkCycle) * 5 : 0;

    const drawWolfLeg = (lx, lyOffset) => {
      // Coxa ruiva superior
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.ellipse(lx, lia.radius - 7 + lyOffset * 0.4, 3.2, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Canela longa preta ("meia negra" do lobo-guará)
      ctx.fillStyle = '#0f172a';
      roundRect(ctx, lx - 2.3, lia.radius - 5 + lyOffset * 0.6, 4.6, 10, 2);
      ctx.fill();

      // Patinha com dedos discretos
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(lx, lia.radius + 4.5 + lyOffset * 0.6, 3.2, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    // Desenha 4 patas (2 traseiras e 2 dianteiras)
    drawWolfLeg(-8, strideB * 0.7);
    drawWolfLeg(8, strideA * 0.7);
    drawWolfLeg(-4.5, strideA);
    drawWolfLeg(4.5, strideB);

    // 4. Corpo Esguio de Pelagem Ruivo-Dourada
    const coatGrad = ctx.createRadialGradient(-2, -3, 3, 0, 0, lia.radius + 2);
    coatGrad.addColorStop(0, '#fb923c');
    coatGrad.addColorStop(0.6, '#ea580c');
    coatGrad.addColorStop(1, '#9a3412');
    ctx.fillStyle = coatGrad;
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, -1, lia.radius - 0.5, lia.radius - 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 5. Peitoral Branco ("Babeiro") e Crina Negra Eriçada no Dorso
    if (lia.facing === 'down') {
      // Peitoral branco felpudo visível de frente
      ctx.fillStyle = '#fff7ed';
      ctx.beginPath();
      ctx.ellipse(0, 3, 7, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crina negra característica na nuca e dorso
    ctx.fillStyle = '#0f172a';
    if (lia.facing === 'up') {
      ctx.beginPath();
      ctx.ellipse(0, -6, 4.8, 11.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tufos da crina
      ctx.beginPath();
      ctx.moveTo(-4, -10); ctx.lineTo(0, -16); ctx.lineTo(4, -10);
      ctx.fill();
    } else if (lia.facing === 'right') {
      ctx.beginPath();
      ctx.ellipse(-6.5, -5, 4.5, 9.5, -0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (lia.facing === 'left') {
      ctx.beginPath();
      ctx.ellipse(6.5, -5, 4.5, 9.5, 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Mochila de Exploradora de Lia (com Alças, Fivela Dourada e Bolsinho de Sementes)
    ctx.save();
    // Alças de couro no peito/ombros
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, -5); ctx.lineTo(-4, 5);
    ctx.moveTo(6, -5); ctx.lineTo(4, 5);
    ctx.stroke();

    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#3b1806';
    ctx.lineWidth = 1.5;

    if (lia.facing === 'up') {
      roundRect(ctx, -8.5, -1, 17, 14, 4);
      ctx.fill();
      ctx.stroke();
      // Aba verde de lona da mochila
      ctx.fillStyle = '#15803d';
      roundRect(ctx, -8, -1, 16, 6, 3);
      ctx.fill();
      ctx.stroke();
      // Fivela dourada
      ctx.fillStyle = '#fbbf24';
      roundRect(ctx, -3, 3.5, 6, 4, 1);
      ctx.fill();
    } else if (lia.facing === 'right') {
      roundRect(ctx, -lia.radius - 4, -8, 9, 16, 3.5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#15803d';
      roundRect(ctx, -lia.radius - 4, -8, 9, 6, 3);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-lia.radius - 2, -2, 5, 3.5);
    } else if (lia.facing === 'left') {
      roundRect(ctx, lia.radius - 5, -8, 9, 16, 3.5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#15803d';
      roundRect(ctx, lia.radius - 5, -8, 9, 6, 3);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(lia.radius - 3, -2, 5, 3.5);
    }
    ctx.restore();

    // 7. Cabeça Esculpida do Lobo-Guará
    const headShiftX = lia.facing === 'right' ? 2 : (lia.facing === 'left' ? -2 : 0);
    ctx.save();
    ctx.translate(headShiftX, -10);

    // 8. Grandes Orelhas Pontudas e Largas (Marca Registrada do Lobo-Guará)
    const earTwitch = Math.sin(globalAnimTimer * 4) * 0.04;
    // Orelha Esquerda
    ctx.save();
    ctx.rotate(-earTwitch);
    ctx.fillStyle = '#c2410c';
    ctx.strokeStyle = '#431407';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-9, -1);
    ctx.quadraticCurveTo(-15, -14, -11, -17);
    ctx.quadraticCurveTo(-5, -14, -2, -5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Interior felpudo branco-rosado da orelha esquerda
    ctx.fillStyle = '#ffedd5';
    ctx.beginPath();
    ctx.moveTo(-7.5, -3);
    ctx.quadraticCurveTo(-12, -12, -10, -14.5);
    ctx.quadraticCurveTo(-6, -12, -3.5, -5.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Orelha Direita
    ctx.save();
    ctx.rotate(earTwitch);
    ctx.fillStyle = '#c2410c';
    ctx.strokeStyle = '#431407';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(9, -1);
    ctx.quadraticCurveTo(15, -14, 11, -17);
    ctx.quadraticCurveTo(5, -14, 2, -5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Interior branco-rosado da orelha direita
    ctx.fillStyle = '#ffedd5';
    ctx.beginPath();
    ctx.moveTo(7.5, -3);
    ctx.quadraticCurveTo(12, -12, 10, -14.5);
    ctx.quadraticCurveTo(6, -12, 3.5, -5.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Crânio ruivo-dourado
    const headGrad = ctx.createRadialGradient(0, -2, 2, 0, 0, 10);
    headGrad.addColorStop(0, '#fb923c');
    headGrad.addColorStop(1, '#ea580c');
    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9.5, 8.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bochechas claras e Focinho Alongado de Lobo-Guará (se não estiver de costas)
    if (lia.facing !== 'up') {
      let snoutOffX = 0;
      let snoutOffY = 3.5;
      if (lia.facing === 'right') { snoutOffX = 7.5; snoutOffY = 1.5; }
      else if (lia.facing === 'left') { snoutOffX = -7.5; snoutOffY = 1.5; }

      // Pelagem branca sob o queixo / bochechas
      ctx.fillStyle = '#fff7ed';
      ctx.beginPath();
      if (lia.facing === 'down') {
        ctx.ellipse(-5, 3, 3.8, 2.6, 0.2, 0, Math.PI * 2);
        ctx.ellipse(5, 3, 3.8, 2.6, -0.2, 0, Math.PI * 2);
      } else {
        ctx.ellipse(snoutOffX * 0.7, snoutOffY + 2, 4.5, 2.5, 0, 0, Math.PI * 2);
      }
      ctx.fill();

      // Focinho comprido escuro/ruivo
      ctx.fillStyle = '#c2410c';
      ctx.beginPath();
      ctx.ellipse(snoutOffX * 0.75, snoutOffY, 4.2, 3.0, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ponta preta do focinho e trufa nasal brilhante
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(snoutOffX, snoutOffY, 2.8, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.arc(snoutOffX - 0.6, snoutOffY - 0.6, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Olhos Expressivos Cor de Âmbar com Brilho Especular
      let eyeOffX = 0;
      if (lia.facing === 'right') eyeOffX = 2.5;
      else if (lia.facing === 'left') eyeOffX = -2.5;

      const drawEye = (ex, ey) => {
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(ex, ey, 2.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(ex, ey, 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(ex, ey, 1.0, 0, Math.PI * 2);
        ctx.fill();

        // Brilho vivo no olhar
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - 0.6, ey - 0.6, 0.6, 0, Math.PI * 2);
        ctx.fill();
      };

      drawEye(eyeOffX - 3.6, -1.2);
      drawEye(eyeOffX + 3.6, -1.2);
    } else {
      // Nuca com crina preta quando vista de costas
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, 2, 3.5, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // Fim da cabeça

    // 9. Tag de Acessibilidade Visual "Lia"
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    roundRect(ctx, -20, -43, 40, 15, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Lia 🐺', 0, -32);
    ctx.restore();
    }

    // 10. Barreira Visual do Escudo Protetor Ativo (ESCUDO)
    if (shieldActive) {
      ctx.save();
      const shieldR = lia.radius + 13 + Math.sin(globalAnimTimer * 8) * 2;
      const shieldAlpha = 0.55 + Math.sin(globalAnimTimer * 6) * 0.25;

      // Halo protetor brilhante
      const shieldGrad = ctx.createRadialGradient(0, 0, lia.radius * 0.5, 0, 0, shieldR + 8);
      shieldGrad.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
      shieldGrad.addColorStop(0.7, `rgba(56, 189, 248, ${shieldAlpha * 0.4})`);
      shieldGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
      ctx.fillStyle = shieldGrad;
      ctx.beginPath();
      ctx.arc(0, 0, shieldR + 8, 0, Math.PI * 2);
      ctx.fill();

      // Contorno circular de energia do escudo
      ctx.strokeStyle = `rgba(56, 189, 248, ${shieldAlpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, shieldR, 0, Math.PI * 2);
      ctx.stroke();

      // Hexágono de barreira protetora
      ctx.save();
      ctx.rotate(globalAnimTimer * 1.5);
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.75)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let h = 0; h < 6; h++) {
        const ang = (h * Math.PI) / 3;
        const hx = Math.cos(ang) * (shieldR + 2);
        const hy = Math.sin(ang) * (shieldR + 2);
        if (h === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // Rótulo textual de proteção ativa
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      roundRect(ctx, -44, -shieldR - 22, 88, 16, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🛡️ PROTEÇÃO (${shieldTimeLeft.toFixed(1)}s)`, 0, -shieldR - 14);

      ctx.restore();
    }

    ctx.restore();
  }

  function renderMinimapHUD() {
    ctx.save();
    const mapW = 48;
    const mapH = 96;
    const mapX = viewW - mapW - 18;
    const mapY = 70;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, mapX, mapY, mapW, mapH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = lerpColor('#334155', '#22c55e', plantProgress);
    roundRect(ctx, mapX + 6, mapY + 6, mapW - 12, 30, 4);
    ctx.fill();

    ctx.fillStyle = '#854d0e';
    roundRect(ctx, mapX + 13, mapY + 38, mapW - 26, 20, 2);
    ctx.fill();

    ctx.fillStyle = lerpColor('#64748b', '#fde047', plantProgress);
    roundRect(ctx, mapX + 6, mapY + 60, mapW - 12, 30, 4);
    ctx.fill();

    if (currentState === State.PLANTING || currentState === State.CONCLUDED) {
      CANTEIROS.forEach(c => {
        const syNorm = c.y / WORLD_HEIGHT;
        const sxNorm = (c.x - 90) / 800;
        const smX = mapX + 8 + sxNorm * (mapW - 16);
        const smY = mapY + 6 + syNorm * (mapH - 14);

        ctx.fillStyle = c.planted ? '#4ade80' : '#a16207';
        ctx.beginPath();
        ctx.arc(smX, smY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      seeds.forEach(s => {
        if (!s.collected) {
          const syNorm = s.y / WORLD_HEIGHT;
          const sxNorm = (s.x - 90) / 800;
          const smX = mapX + 8 + sxNorm * (mapW - 16);
          const smY = mapY + 6 + syNorm * (mapH - 14);

          ctx.fillStyle = s.type === 'rara' ? '#f472b6' : '#fbbf24';
          ctx.beginPath();
          ctx.arc(smX, smY, s.type === 'rara' ? 2.2 : 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Guarda 1: Onça de Névoa (ponto vermelho)
      const gyNorm = fogGuard.y / WORLD_HEIGHT;
      const gxNorm = (fogGuard.x - 90) / 800;
      const gmX = mapX + 8 + gxNorm * (mapW - 16);
      const gmY = mapY + 6 + gyNorm * (mapH - 14);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(gmX, gmY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Guarda 2: Guardião Celeste das Sementes Raras (ponto violeta)
      const sgyNorm = secondGuard.y / WORLD_HEIGHT;
      const sgxNorm = (secondGuard.x - 90) / 800;
      const sgmX = mapX + 8 + sgxNorm * (mapW - 16);
      const sgmY = mapY + 6 + sgyNorm * (mapH - 14);
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(sgmX, sgmY, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }

    const normY = lia.y / WORLD_HEIGHT;
    const markerY = mapY + 6 + normY * (mapH - 14);
    const pulse = Math.sin(globalAnimTimer * 5) * 1.5;

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(mapX + mapW / 2, markerY, 3.5 + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▲ N', mapX + mapW / 2, mapY - 4);

    ctx.restore();
  }

  function renderLightingEffects() {
    const vignette = ctx.createRadialGradient(
      viewW / 2, viewH / 2, Math.min(viewW, viewH) * 0.45,
      viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.85
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(5, 15, 25, 0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  function getCanvasWorldCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldX = screenX + camera.x;
    const worldY = screenY + camera.y;

    return { screenX, screenY, worldX, worldY };
  }

  function findSignAt(worldX, worldY) {
    return SIGNPOSTS.find(sign => {
      if (!sign.renderedW) return false;
      return (
        worldX >= sign.renderedX &&
        worldX <= sign.renderedX + sign.renderedW &&
        worldY >= sign.renderedY &&
        worldY <= sign.renderedY + sign.renderedH + 15
      );
    });
  }

  canvas.addEventListener('mousemove', (e) => {
    const { worldX, worldY } = getCanvasWorldCoords(e);
    let anyHovered = false;

    SIGNPOSTS.forEach(sign => {
      const hit = (
        worldX >= sign.renderedX &&
        worldX <= sign.renderedX + sign.renderedW &&
        worldY >= sign.renderedY &&
        worldY <= sign.renderedY + sign.renderedH + 15
      );
      sign.isHovered = hit;
      if (hit) anyHovered = true;
    });

    if (currentState === State.PLANTING || currentState === State.CONCLUDED) {
      const nearCanteiro = CANTEIROS.some(c => Math.hypot(worldX - c.x, worldY - c.y) <= 35);
      if (nearCanteiro) anyHovered = true;
    }

    canvas.style.cursor = anyHovered ? 'pointer' : 'default';
  });

  canvas.addEventListener('click', (e) => {
    ensureAudio();
    const { worldX, worldY } = getCanvasWorldCoords(e);

    if (currentState === State.PLANTING || currentState === State.CONCLUDED) {
      const clickedCanteiro = CANTEIROS.find(c => Math.hypot(worldX - c.x, worldY - c.y) <= 36);
      if (clickedCanteiro) {
        const distToLia = Math.hypot(lia.x - clickedCanteiro.x, lia.y - clickedCanteiro.y);
        if (distToLia <= 60) {
          tryPlantAtCanteiro(clickedCanteiro);
          return;
        } else {
          showPlaceDiscovery({
            icon: '🚶',
            fullName: 'Aproxime-se para plantar',
            description: 'Lia precisa estar junto ao canteiro para cultivar a semente.'
          });
          return;
        }
      }
    }

    const clickedSign = findSignAt(worldX, worldY);
    if (clickedSign) {
      showPlaceDiscovery(clickedSign);
    }
  });

  canvas.addEventListener('touchstart', (e) => {
    ensureAudio();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const { worldX, worldY } = getCanvasWorldCoords(touch);

      if (currentState === State.PLANTING || currentState === State.CONCLUDED) {
        const clickedCanteiro = CANTEIROS.find(c => Math.hypot(worldX - c.x, worldY - c.y) <= 40);
        if (clickedCanteiro) {
          const distToLia = Math.hypot(lia.x - clickedCanteiro.x, lia.y - clickedCanteiro.y);
          if (distToLia <= 65) {
            tryPlantAtCanteiro(clickedCanteiro);
            return;
          }
        }
      }

      const clickedSign = findSignAt(worldX, worldY);
      if (clickedSign) {
        showPlaceDiscovery(clickedSign);
      }
    }
  }, { passive: true });

  function gameLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
    lastTimestamp = timestamp;

    update(dt);
    render();

    requestAnimationFrame(gameLoop);
  }

  function handleKey(e, isPressed) {
    ensureAudio();
    let handled = false;

    if (isPressed && currentState === State.READY &&
        ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      startGame();
    }

    // Tecla E para Ação de Plantio
    if (isPressed && (e.code === 'KeyE' || e.key === 'e' || e.key === 'E')) {
      if (currentState === State.PLANTING || currentState === State.CONCLUDED) {
        tryPlantAtNearbyCanteiro();
        handled = true;
      }
    }

    // Tecla Espaço para Ativação do Escudo Protetor (ESCUDO)
    // Segurar a tecla não gasta vários escudos; bloqueia se ativo ou reserva zerada. Preserve teclado em campos e botões.
    if (e.code === 'Space' || e.key === ' ') {
      const isInteractive = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON' || e.target.tagName === 'A');
      if (!isInteractive) {
        if (isPressed) {
          if (!e.repeat && !spaceKeyHeld) {
            spaceKeyHeld = true;
            if (currentState === State.PLAYING) {
              activateShield();
            }
          }
          handled = true;
        } else {
          spaceKeyHeld = false;
        }
      }
    }

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        keys.up = isPressed;
        handled = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        keys.down = isPressed;
        handled = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        keys.left = isPressed;
        handled = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        keys.right = isPressed;
        handled = true;
        break;
      case 'KeyP':
        if (isPressed) {
          togglePause();
          handled = true;
        }
        break;
      case 'KeyM':
        if (isPressed) {
          toggleMute();
          handled = true;
        }
        break;
    }

    if (handled) {
      e.preventDefault();
    }
  }

  window.addEventListener('keydown', (e) => handleKey(e, true));
  window.addEventListener('keyup', (e) => handleKey(e, false));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (currentState === State.PLAYING || currentState === State.PLANTING || currentState === State.CONCLUDED)) {
      pauseGame('Você mudou de aba. O jogo foi pausado para esperar seu retorno.');
    }
  });

  window.addEventListener('blur', () => {
    if (currentState === State.PLAYING || currentState === State.PLANTING || currentState === State.CONCLUDED) {
      pauseGame('A janela perdeu o foco. O jogo foi pausado.');
    }
  });

  // Listeners de Interação do Usuário para Ativação do Áudio
  window.addEventListener('click', ensureAudio);
  window.addEventListener('keydown', ensureAudio);
  window.addEventListener('touchstart', ensureAudio, { passive: true });

  btnStart.addEventListener('click', () => {
    ensureAudio();
    startGame();
  });
  btnPause.addEventListener('click', () => {
    ensureAudio();
    togglePause();
  });
  btnReset.addEventListener('click', resetGame);
  if (btnShield) btnShield.addEventListener('click', () => {
    ensureAudio();
    activateShield();
  });
  if (btnTouchShield) {
    btnTouchShield.addEventListener('click', () => {
      ensureAudio();
      activateShield();
    });
    btnTouchShield.addEventListener('touchstart', (e) => {
      e.preventDefault();
      ensureAudio();
      activateShield();
    }, { passive: false });
  }
  if (btnMute) btnMute.addEventListener('click', () => {
    ensureAudio();
    toggleMute();
  });
  if (btnPlant) btnPlant.addEventListener('click', () => {
    ensureAudio();
    startPlantingPhase();
  });
  if (btnActionPlant) btnActionPlant.addEventListener('click', () => {
    ensureAudio();
    tryPlantAtNearbyCanteiro();
  });

  if (modalPlantBtn) modalPlantBtn.addEventListener('click', () => {
    ensureAudio();
    startPlantingPhase();
  });
  if (modalPrimaryBtn) {
    modalPrimaryBtn.addEventListener('click', () => {
      ensureAudio();
      if (currentState === State.PAUSED) {
        resumeGame();
      } else if (currentState === State.CONCLUDED) {
        modalOverlay.classList.add('hidden');
        canvas.focus();
      }
    });
  }
  modalResetBtn.addEventListener('click', resetGame);

  function bindTouch(btn, dirKey) {
    const startPress = (e) => {
      e.preventDefault();
      ensureAudio();
      if (currentState === State.READY) startGame();
      keys[dirKey] = true;
      btn.classList.add('active');
    };
    const endPress = (e) => {
      e.preventDefault();
      keys[dirKey] = false;
      btn.classList.remove('active');
    };

    btn.addEventListener('mousedown', startPress);
    btn.addEventListener('mouseup', endPress);
    btn.addEventListener('mouseleave', endPress);

    btn.addEventListener('touchstart', startPress, { passive: false });
    btn.addEventListener('touchend', endPress, { passive: false });
    btn.addEventListener('touchcancel', endPress, { passive: false });
  }

  bindTouch(btnUp, 'up');
  bindTouch(btnDown, 'down');
  bindTouch(btnLeft, 'left');
  bindTouch(btnRight, 'right');

  // Inicializações
  initCanteiros();
  initSeeds();
  updateHUD();
  updateMuteButtonUI();
  loadGameAssets();
  requestAnimationFrame(gameLoop);

  // Interface para Testes Automatizados e Verificação
  window.__ILHA_VIVA__ = {
    getState: () => currentState,
    getLia: () => ({ ...lia }),
    getGuard: () => ({ ...fogGuard }),
    getSecondGuard: () => ({ ...secondGuard }),
    getSeeds: () => seeds.map(s => ({ ...s })),
    getCanteiros: () => CANTEIROS.map(c => ({ ...c })),
    getReserve: () => seedsInReserve,
    getPlantedCount: () => plantedCount,
    getPlantProgress: () => plantProgress,
    getScore: () => currentScore,
    getShieldsAvailable: () => shieldsAvailable,
    isShieldActive: () => shieldActive,
    getShieldTimeLeft: () => shieldTimeLeft,
    activateShield,
    isMuted: () => isMuted,
    toggleMute,
    ensureAudio,
    getAudioContext: () => audioCtx,
    playSoundCollect,
    playSoundDefeat,
    playSoundConclusion,
    playGuardDisgustSound,
    collectSeed: (id) => {
      const s = seeds.find(item => item.id === id);
      if (s && !s.collected) {
        s.collected = true;
        currentScore += (s.points || (s.type === 'rara' ? 3 : 1));
        spawnSparkle(s.x, s.y);
        playSoundCollect();
        updateGuardSpeedAndNotice();
        updateHUD();
        if (getCollectedCount() >= 10) triggerVictory();
      }
    },
    collectTenCommon: () => {
      const commons = seeds.filter(s => s.type === 'comum' && !s.collected).slice(0, 10);
      commons.forEach(s => {
        s.collected = true;
        currentScore += s.points;
      });
      updateGuardSpeedAndNotice();
      updateHUD();
      if (getCollectedCount() >= 10) triggerVictory();
    },
    collectTenRare: () => {
      const rares = seeds.filter(s => s.type === 'rara' && !s.collected).slice(0, 10);
      rares.forEach(s => {
        s.collected = true;
        currentScore += s.points;
      });
      updateGuardSpeedAndNotice();
      updateHUD();
      if (getCollectedCount() >= 10) triggerVictory();
    },
    collectMixSeeds: (commonCount, rareCount) => {
      const commons = seeds.filter(s => s.type === 'comum' && !s.collected).slice(0, commonCount);
      const rares = seeds.filter(s => s.type === 'rara' && !s.collected).slice(0, rareCount);
      commons.concat(rares).forEach(s => {
        s.collected = true;
        currentScore += s.points;
      });
      updateGuardSpeedAndNotice();
      updateHUD();
      if (getCollectedCount() >= 10) triggerVictory();
    },
    collectAllSeeds: () => {
      seeds.slice(0, 10).forEach(s => {
        s.collected = true;
        currentScore += (s.points || 1);
      });
      updateHUD();
      triggerVictory();
    },
    startPlanting: startPlantingPhase,
    plantAtNearby: tryPlantAtNearbyCanteiro,
    plantAt: tryPlantAtCanteiro,
    setLiaPos: (x, y) => { lia.x = x; lia.y = y; },
    resetGame,
    togglePause,
    isWalkable,
    getAssetsStatus: () => ({
      lia: { ...gameAssets.lia },
      guarda: { ...gameAssets.guarda },
      semente: { ...gameAssets.semente }
    }),
    loadGameAssets,
    setMockAsset: (key, img, loaded = true) => {
      if (gameAssets[key]) {
        gameAssets[key].img = img;
        gameAssets[key].loaded = loaded;
        gameAssets[key].failed = !loaded;
      }
    }
  };

})();
