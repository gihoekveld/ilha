/**
 * Ilha Viva - Personagens com Nova Identidade da Fauna Brasileira:
 * - Protagonista Lia: Um majestoso Lobo-Guará (pelagem avermelhada/ruiva, crina negra no dorso,
 *   focinho esguio, orelhas pontudas alertas com interior claro, patas longas pretas e sua inseparável mochila marrom).
 * - Guarda / Perigo: Uma imponente Onça-Pintada Espectral (corpo felino robusto, orelhas arredondadas,
 *   pelagem dourada fantasmagórica com rosetas/pintas escuras características, olhos brilhantes e aura de névoa).
 * - Preservadas integralmente: física, colisões, patrulha com seta indicativa, coleta das 10 sementes,
 *   ponte larga, vitória, controles, tela cheia, pausa e reinício.
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
  const statusMessage = document.getElementById('statusMessage');
  const statusDot = document.getElementById('statusDot');

  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnReset = document.getElementById('btnReset');

  const modalOverlay = document.getElementById('modalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalDescription = document.getElementById('modalDescription');
  const modalResumeBtn = document.getElementById('modalResumeBtn');
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
    VICTORY: 'VICTORY'
  };

  let currentState = State.READY;
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

  // Câmera 2D Suave
  const camera = {
    x: 0,
    y: WORLD_HEIGHT - viewH,
    targetX: 0,
    targetY: WORLD_HEIGHT - viewH
  };

  // Regiões de Terra Firme e Ponte:
  const TERRAIN_REGIONS = [
    { name: 'Praia', type: 'beach', x: 90, y: 840, w: 780, h: 500 },
    { name: 'Ponte Larga', type: 'bridge', x: 300, y: 570, w: 360, h: 300 },
    { name: 'Bosque', type: 'forest', x: 80, y: 60, w: 800, h: 540 }
  ];

  // Plaquinhas Interativas
  const SIGNPOSTS = [
    {
      id: 'beach_sign',
      x: 340,
      y: 1220,
      shortLabel: 'Praia',
      icon: '🏖️',
      fullName: 'Praia Dourada',
      description: 'Ponto de partida da expedição de Lia, com areia limpa e conchas marinhas.',
      isHovered: false,
      expandedTimer: 0
    },
    {
      id: 'bridge_sign',
      x: 250,
      y: 740,
      shortLabel: 'Ponte Larga',
      icon: '🌉',
      fullName: 'Ponte Larga dos Navegantes',
      description: 'Ponte de madeira maciça que cruza o canal marítimo conectando a praia ao bosque.',
      isHovered: false,
      expandedTimer: 0
    },
    {
      id: 'forest_sign',
      x: 340,
      y: 200,
      shortLabel: 'Bosque',
      icon: '🌲',
      fullName: 'Bosque Verdejante da Ilha',
      description: 'Área com rica vegetação nativa, árvores centenárias e solo fértil.',
      isHovered: false,
      expandedTimer: 0
    }
  ];

  // Cenografia Limpa
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

  // ==========================================
  // GUARDA: ONÇA-PINTADA ESPECTRAL (NÉVOA)
  // Patrulha em linha horizontal no bosque: Y = 340, X entre 280 e 680.
  // ==========================================
  const GUARD_START = {
    x: 320,
    y: 340,
    minX: 280,
    maxX: 680,
    width: 48,
    height: 38,
    speed: 110,
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
    direction: GUARD_START.direction
  };

  // 10 Sementes Alcançáveis
  const SEED_DEFINITIONS = [
    { id: 1, region: 'beach', x: 260, y: 1200, name: 'Semente da Brisa Marinha' },
    { id: 2, region: 'beach', x: 710, y: 1190, name: 'Semente da Maré Mansa' },
    { id: 3, region: 'beach', x: 350, y: 950, name: 'Semente das Dunas' },
    { id: 4, region: 'beach', x: 610, y: 960, name: 'Semente do Sol Costeiro' },

    { id: 5, region: 'forest', x: 210, y: 500, name: 'Semente do Musgo Verde' },
    { id: 6, region: 'forest', x: 750, y: 490, name: 'Semente do Carvalho' },
    { id: 7, region: 'forest', x: 480, y: 420, name: 'Semente da Clareira' },
    { id: 8, region: 'forest', x: 240, y: 280, name: 'Semente do Broto Silvestre' },
    { id: 9, region: 'forest', x: 720, y: 280, name: 'Semente da Seiva Antiga' },
    { id: 10, region: 'forest', x: 480, y: 200, name: 'Semente do Coração da Ilha' }
  ];

  let seeds = [];
  let sparkles = [];

  // Posição Inicial de Lia (Lobo-Guará)
  const LIA_START_X = 480;
  const LIA_START_Y = 1240;

  const lia = {
    x: LIA_START_X,
    y: LIA_START_Y,
    radius: 17,
    speed: 210,
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

  function initSeeds() {
    seeds = SEED_DEFINITIONS.map(def => ({
      id: def.id,
      x: def.x,
      y: def.y,
      radius: 10,
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

  function updateHUD() {
    const count = getCollectedCount();
    seedsCollectedEl.textContent = count;
    seedsTotalEl.textContent = seeds.length;

    if (currentState === State.DEFEATED) {
      statusMessage.textContent = 'A névoa alcançou você. Reinicie para tentar de novo.';
      statusDot.className = 'status-dot danger';
      btnPause.disabled = true;
      btnStart.disabled = true;
    } else if (currentState === State.VICTORY) {
      statusMessage.textContent = 'Resgate concluído! Dez sementes recuperadas.';
      statusDot.className = 'status-dot gold';
      btnPause.disabled = true;
      btnStart.disabled = true;
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
    } else if (currentState === State.PLAYING) {
      statusMessage.textContent = `Missão: Coletadas ${count} de 10 sementes`;
      statusDot.className = 'status-dot';
      btnPause.disabled = false;
      btnPause.textContent = 'Pausar (P)';
      btnStart.disabled = true;
    }
  }

  function handleDefeat() {
    currentState = State.DEFEATED;

    lia.isMoving = false;
    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;

    modalTitle.textContent = 'A névoa alcançou você';
    modalDescription.textContent = 'A Onça-Pintada de névoa bloqueou seu avanço. Observe a seta indicativa e use a agilidade do lobo-guará para desviar!';
    modalResumeBtn.style.display = 'none';
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

    modalTitle.textContent = 'Resgate concluído';
    modalDescription.textContent = 'Lia resgatou todas as dez sementes da ilha! A terra está pronta para renascer com o futuro plantio.';
    modalResumeBtn.style.display = 'none';
    modalOverlay.classList.remove('hidden');
    modalResetBtn.focus();

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
    if (currentState === State.READY || currentState === State.PAUSED) {
      currentState = State.PLAYING;
      modalOverlay.classList.add('hidden');
      modalResumeBtn.style.display = 'inline-block';
      lastTimestamp = performance.now();
      updateHUD();
      canvas.focus();
    }
  }

  function pauseGame(reasonText) {
    if (currentState === State.PLAYING) {
      currentState = State.PAUSED;
      modalTitle.textContent = 'Jogo Pausado';
      modalDescription.textContent = reasonText || 'Pressione o botão Retomar ou aperte a tecla P para continuar a missão.';
      modalResumeBtn.style.display = 'inline-block';
      modalOverlay.classList.remove('hidden');
      modalResumeBtn.focus();
      updateHUD();
    }
  }

  function resumeGame() {
    if (currentState === State.PAUSED) {
      currentState = State.PLAYING;
      modalOverlay.classList.add('hidden');
      lastTimestamp = performance.now();
      updateHUD();
      canvas.focus();
    }
  }

  function togglePause() {
    if (currentState === State.PLAYING) {
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
    fogGuard.direction = GUARD_START.direction;

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

    initSeeds();

    currentState = State.PLAYING;
    modalOverlay.classList.add('hidden');
    modalResumeBtn.style.display = 'inline-block';
    placeToast.classList.add('hidden');
    lastTimestamp = performance.now();

    updateHUD();
    canvas.focus();
  }

  function update(dt) {
    globalAnimTimer += dt;

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

    if (currentState !== State.PLAYING) return;

    // 1. Movimentação de Lia (Lobo-Guará)
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

    // 2. Movimento da Onça-Pintada Espectral (Guarda)
    fogGuard.x += fogGuard.direction * fogGuard.speed * dt;
    if (fogGuard.x >= fogGuard.maxX) {
      fogGuard.x = fogGuard.maxX;
      fogGuard.direction = -1;
    } else if (fogGuard.x <= fogGuard.minX) {
      fogGuard.x = fogGuard.minX;
      fogGuard.direction = 1;
    }

    // 3. Colisão com a Onça
    const gLeft = fogGuard.x - fogGuard.width / 2;
    const gRight = fogGuard.x + fogGuard.width / 2;
    const gTop = fogGuard.y - fogGuard.height / 2;
    const gBottom = fogGuard.y + fogGuard.height / 2;

    const closestGX = Math.max(gLeft, Math.min(lia.x, gRight));
    const closestGY = Math.max(gTop, Math.min(lia.y, gBottom));
    const distX = lia.x - closestGX;
    const distY = lia.y - closestGY;

    if ((distX * distX + distY * distY) < (lia.radius * lia.radius)) {
      handleDefeat();
      return;
    }

    // 4. Coleta de Sementes
    let newlyCollected = false;
    for (const seed of seeds) {
      if (!seed.collected) {
        const dx = lia.x - seed.x;
        const dy = lia.y - seed.y;
        const hitDistance = lia.radius + seed.radius + 2;

        if ((dx * dx + dy * dy) <= (hitDistance * hitDistance)) {
          seed.collected = true;
          newlyCollected = true;
          spawnSparkle(seed.x, seed.y);
          seedBadge.classList.add('pulse');
          setTimeout(() => seedBadge.classList.remove('pulse'), 300);
        }
      }
    }

    if (newlyCollected) {
      updateHUD();
      const currentCount = getCollectedCount();
      if (currentCount === seeds.length) {
        triggerVictory();
        return;
      }
    }

    camera.targetX = lia.x - viewW / 2;
    camera.targetY = lia.y - viewH * 0.55;

    camera.x += (camera.targetX - camera.x) * 4.5 * dt;
    camera.y += (camera.targetY - camera.y) * 4.5 * dt;
  }

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================

  function render() {
    ctx.save();

    // 1. Oceano
    const seaGrad = ctx.createLinearGradient(0, 0, 0, viewH);
    seaGrad.addColorStop(0, '#042d47');
    seaGrad.addColorStop(0.5, '#06496d');
    seaGrad.addColorStop(1, '#095e8a');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, 0, viewW, viewH);

    renderWaterWaves();

    // 2. Translação da Câmera
    ctx.save();
    ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

    // Ilhas e Ponte
    renderIslands();
    renderLargeBridge();
    renderPatrolRoute();

    // Cenografia
    renderSceneryProps();
    renderSignposts();
    renderSeeds();
    renderSparkles();

    // Guarda: Onça-Pintada Espectral
    renderJaguarGuard();

    // Protagonista: Lobo-Guará Lia
    renderManedWolfLia();

    ctx.restore();

    // 3. Minimapa e Vinheta
    renderMinimapHUD();
    renderLightingEffects();

    ctx.restore();
  }

  function renderWaterWaves() {
    ctx.save();
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.22)';
    ctx.lineWidth = 2.5;

    const waveLines = Math.ceil(viewH / 70) + 1;
    for (let i = 0; i < waveLines; i++) {
      const baseY = 20 + i * 70;
      const waveOffset = Math.sin(globalAnimTimer * 2 + i) * 6;
      
      ctx.beginPath();
      ctx.moveTo(15, baseY + waveOffset);
      ctx.bezierCurveTo(45, baseY - 5 + waveOffset, 85, baseY + 5 + waveOffset, 120, baseY + waveOffset);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(viewW - 130, baseY - waveOffset);
      ctx.bezierCurveTo(viewW - 95, baseY - 5 - waveOffset, viewW - 55, baseY + 5 - waveOffset, viewW - 15, baseY - waveOffset);
      ctx.stroke();
    }
    ctx.restore();
  }

  function renderIslands() {
    ctx.save();

    // Praia
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    roundRect(ctx, 80, 830, 800, 520, 32);
    ctx.fill();

    ctx.fillStyle = '#ca8a04';
    roundRect(ctx, 85, 835, 790, 510, 30);
    ctx.fill();

    const beachGrad = ctx.createRadialGradient(480, 1100, 80, 480, 1100, 500);
    beachGrad.addColorStop(0, '#fef08a');
    beachGrad.addColorStop(0.7, '#fde047');
    beachGrad.addColorStop(1, '#eab308');
    ctx.fillStyle = beachGrad;
    roundRect(ctx, 90, 840, 780, 500, 28);
    ctx.fill();

    ctx.fillStyle = 'rgba(202, 138, 4, 0.12)';
    for (let ax = 120; ax < 840; ax += 42) {
      for (let ay = 860; ay < 1320; ay += 35) {
        ctx.beginPath();
        ctx.arc(ax + Math.sin(ay) * 8, ay, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Bosque
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    roundRect(ctx, 70, 50, 820, 560, 32);
    ctx.fill();

    ctx.fillStyle = '#16a34a';
    roundRect(ctx, 75, 55, 810, 550, 30);
    ctx.fill();

    const forestGrad = ctx.createRadialGradient(480, 320, 80, 480, 320, 520);
    forestGrad.addColorStop(0, '#22c55e');
    forestGrad.addColorStop(0.7, '#16a34a');
    forestGrad.addColorStop(1, '#15803d');
    ctx.fillStyle = forestGrad;
    roundRect(ctx, 80, 60, 800, 540, 28);
    ctx.fill();

    ctx.fillStyle = 'rgba(21, 128, 61, 0.22)';
    for (let fx = 110; fx < 850; fx += 38) {
      for (let fy = 80; fy < 580; fy += 30) {
        ctx.beginPath();
        ctx.arc(fx + Math.cos(fy) * 6, fy, 3, 0, Math.PI * 2);
        ctx.fill();
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

  function renderPatrolRoute() {
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(fogGuard.minX, fogGuard.y);
    ctx.lineTo(fogGuard.maxX, fogGuard.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // =========================================================================
  // NOVO DESIGN DO GUARDA: ONÇA-PINTADA ESPECTRAL (FANTASMA DA NÉVOA)
  // Felino musculoso, orelhas arredondadas, pelagem dourada/espectral com rosetas
  // =========================================================================
  function renderJaguarGuard() {
    ctx.save();
    ctx.translate(fogGuard.x, fogGuard.y);

    const pulse = Math.sin(globalAnimTimer * 5) * 3;
    const isFacingRight = fogGuard.direction === 1;

    // 1. Aura Espectral de Névoa Densa
    const mistGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 38 + pulse);
    mistGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)'); // brilho dourado espectral
    mistGrad.addColorStop(0.4, 'rgba(148, 163, 184, 0.6)'); // névoa azulada
    mistGrad.addColorStop(1, 'rgba(51, 65, 85, 0)');
    ctx.fillStyle = mistGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 38 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // 2. Sombra fantasmagórica
    ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 14, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Cauda Longa Felina com Ponta Escura (balanço sinuoso)
    ctx.save();
    const tailSway = Math.sin(globalAnimTimer * 4) * 4;
    const tailBaseX = isFacingRight ? -16 : 16;
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailBaseX, 2);
    ctx.quadraticCurveTo(tailBaseX - (isFacingRight ? 12 : -12), -6 + tailSway, tailBaseX - (isFacingRight ? 18 : -18), -12 + tailSway);
    ctx.stroke();

    // Ponta preta da cauda
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(tailBaseX - (isFacingRight ? 14 : -14), -9 + tailSway);
    ctx.lineTo(tailBaseX - (isFacingRight ? 18 : -18), -12 + tailSway);
    ctx.stroke();
    ctx.restore();

    // 4. Patas Robustas da Onça
    ctx.fillStyle = '#b45309';
    const pawOff = Math.sin(globalAnimTimer * 8) * 3;
    ctx.beginPath();
    ctx.ellipse(-11 + pawOff, 11, 4.5, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(11 - pawOff, 11, 4.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Corpo Robusto Felino (Dourado Espectral)
    ctx.fillStyle = '#eab308';
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 2, 19, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 6. Rosetas e Pintas Típicas da Onça-Pintada
    ctx.fillStyle = '#451a03';
    const spots = [
      { x: -8, y: -2, r: 2.2 },
      { x: 0, y: 3, r: 2.5 },
      { x: 8, y: -1, r: 2.0 },
      { x: -4, y: 7, r: 1.8 },
      { x: 6, y: 6, r: 1.8 }
    ];
    spots.forEach(sp => {
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
      ctx.fill();
      // Centro dourado da roseta
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#451a03';
    });

    // 7. Cabeça da Onça (arredondada e poderosa)
    const headX = isFacingRight ? 12 : -12;
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(headX, -6, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Orelhas Arredondadas da Onça
    ctx.fillStyle = '#713f12';
    ctx.beginPath();
    ctx.arc(headX - 6, -15, 3.5, 0, Math.PI * 2);
    ctx.arc(headX + 6, -15, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Interior claro da orelha
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(headX - 6, -15, 1.8, 0, Math.PI * 2);
    ctx.arc(headX + 6, -15, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Focinho da onça
    ctx.fillStyle = '#fef9c3';
    ctx.beginPath();
    const snoutX = isFacingRight ? headX + 5 : headX - 5;
    ctx.arc(snoutX, -4, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Nariz preto
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(isFacingRight ? snoutX + 2 : snoutX - 2, -5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Olhos Espectrais Felinos Cintilantes (Ciano / Azul Névoa)
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    const eyeLook = isFacingRight ? 2 : -2;
    ctx.beginPath();
    ctx.arc(headX - 2 + eyeLook, -7, 1.8, 0, Math.PI * 2);
    ctx.arc(headX + 3 + eyeLook, -7, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 8. Rótulo de Acessibilidade Textual
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ONÇA', 0, 24);

    // 9. Seta Direcional Vermelha Viva de Alerta
    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (isFacingRight) {
      ctx.moveTo(18, -6);
      ctx.lineTo(28, 0);
      ctx.lineTo(18, 6);
      ctx.closePath();
    } else {
      ctx.moveTo(-18, -6);
      ctx.lineTo(-28, 0);
      ctx.lineTo(-18, 6);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // =========================================================================
  // NOVO DESIGN DA PROTAGONISTA: LIA, O LOBO-GUARÁ
  // Pelagem avermelhada/ruiva, crina negra no dorso, patas longas pretas,
  // orelhas grandes alertas pontudas, cauda espessa e mochila de explorador
  // =========================================================================
  function renderManedWolfLia() {
    ctx.save();
    ctx.translate(lia.x, lia.y);

    const bobbing = lia.isMoving ? Math.sin(lia.walkCycle) * 2.5 : 0;
    ctx.translate(0, bobbing);

    // 1. Sombra suave sob as patas longas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, lia.radius - 1 - bobbing, lia.radius * 0.95, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Cauda Espessa do Lobo-Guará (Ponta Branca Característica)
    ctx.save();
    const tailWag = Math.sin(globalAnimTimer * 6) * 4;
    ctx.strokeStyle = '#ea580c'; // Ruivo
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();

    if (lia.facing === 'up') {
      ctx.moveTo(0, 8);
      ctx.quadraticCurveTo(tailWag * 1.5, 18, tailWag, 24);
    } else if (lia.facing === 'down') {
      ctx.moveTo(0, 6);
      ctx.quadraticCurveTo(-6, 14, -8, 20);
    } else if (lia.facing === 'right') {
      ctx.moveTo(-10, 4);
      ctx.quadraticCurveTo(-18, 10 + tailWag, -22, 16 + tailWag);
    } else { // left
      ctx.moveTo(10, 4);
      ctx.quadraticCurveTo(18, 10 + tailWag, 22, 16 + tailWag);
    }
    ctx.stroke();

    // Ponta branca da cauda (marca registrada do lobo-guará)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    if (lia.facing === 'up') {
      ctx.moveTo(tailWag * 0.8, 20);
      ctx.lineTo(tailWag, 24);
    } else if (lia.facing === 'right') {
      ctx.moveTo(-18, 13 + tailWag);
      ctx.lineTo(-22, 16 + tailWag);
    } else if (lia.facing === 'left') {
      ctx.moveTo(18, 13 + tailWag);
      ctx.lineTo(22, 16 + tailWag);
    } else {
      ctx.moveTo(-7, 16);
      ctx.lineTo(-8, 20);
    }
    ctx.stroke();
    ctx.restore();

    // 3. Patas Longas Pretas ("Meias Negras" do Lobo-Guará)
    ctx.fillStyle = '#0f172a'; // Preto das patas
    const stepL = lia.isMoving ? Math.sin(lia.walkCycle) * 4.5 : 0;
    const stepR = lia.isMoving ? -Math.sin(lia.walkCycle) * 4.5 : 0;
    ctx.fillRect(-7 + stepL, lia.radius - 3, 4, 8);
    ctx.fillRect(3 + stepR, lia.radius - 3, 4, 8);

    // 4. Corpo do Lobo-Guará (Pelagem Ruiva / Dourada-Avermelhada)
    ctx.fillStyle = '#ea580c';
    ctx.strokeStyle = '#9a3412';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, lia.radius - 1, lia.radius, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 5. Crina Negra no Dorso (Marca Registrada do Lobo-Guará)
    ctx.fillStyle = '#1e293b';
    if (lia.facing === 'up') {
      // Visão de trás: crina central vertical
      ctx.beginPath();
      ctx.ellipse(0, -5, 4, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (lia.facing === 'right') {
      ctx.beginPath();
      ctx.ellipse(-7, -4, 4, 9, -0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (lia.facing === 'left') {
      ctx.beginPath();
      ctx.ellipse(7, -4, 4, 9, 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else { // down (peito claro)
      ctx.fillStyle = '#ffedd5'; // Peitoral branco do lobo
      ctx.beginPath();
      ctx.ellipse(0, 3, 6, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Mochila de Aventura de Lia
    ctx.save();
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.5;

    if (lia.facing === 'up') {
      roundRect(ctx, -7, 0, 14, 13, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-3, 5, 6, 3);
    } else if (lia.facing === 'right') {
      roundRect(ctx, -lia.radius - 4, -8, 8, 16, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-lia.radius - 3, -3, 5, 4);
    } else if (lia.facing === 'left') {
      roundRect(ctx, lia.radius - 4, -8, 8, 16, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(lia.radius - 2, -3, 5, 4);
    }
    ctx.restore();

    // 7. Cabeça Esguia do Lobo-Guará
    ctx.fillStyle = '#f97316';
    ctx.strokeStyle = '#9a3412';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -9, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 8. Grandes Orelhas Pontudas Alertas (Interior Branco/Claro)
    // Orelha Esquerda
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(-8, -12);
    ctx.lineTo(-12, -24);
    ctx.lineTo(-3, -16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffedd5'; // Interior branco
    ctx.beginPath();
    ctx.moveTo(-7, -13);
    ctx.lineTo(-10.5, -21);
    ctx.lineTo(-4, -16);
    ctx.closePath();
    ctx.fill();

    // Orelha Direita
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(8, -12);
    ctx.lineTo(12, -24);
    ctx.lineTo(3, -16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffedd5';
    ctx.beginPath();
    ctx.moveTo(7, -13);
    ctx.lineTo(10.5, -21);
    ctx.lineTo(4, -16);
    ctx.closePath();
    ctx.fill();

    // Focinho Alongado do Lobo (se não estiver de costas)
    if (lia.facing !== 'up') {
      ctx.fillStyle = '#1e293b'; // Focinho preto
      let snoutOffX = 0;
      let snoutOffY = -7;
      if (lia.facing === 'right') snoutOffX = 7;
      else if (lia.facing === 'left') snoutOffX = -7;
      else if (lia.facing === 'down') snoutOffY = -4;

      // Focinho
      ctx.beginPath();
      ctx.ellipse(snoutOffX, snoutOffY, 3.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Olhos Vivos Cor de Âmbar
      ctx.fillStyle = '#fbbf24';
      let eyeOffX = 0;
      if (lia.facing === 'right') eyeOffX = 2;
      else if (lia.facing === 'left') eyeOffX = -2;

      ctx.beginPath();
      ctx.arc(eyeOffX - 3, -10, 1.6, 0, Math.PI * 2);
      ctx.arc(eyeOffX + 3, -10, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Pupilas
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(eyeOffX - 3, -10, 0.8, 0, Math.PI * 2);
      ctx.arc(eyeOffX + 3, -10, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 9. Tag "Lia"
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    roundRect(ctx, -20, -40, 40, 15, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Lia 🐺', 0, -29);
    ctx.restore();

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

    // Bosque
    ctx.fillStyle = '#22c55e';
    roundRect(ctx, mapX + 6, mapY + 6, mapW - 12, 30, 4);
    ctx.fill();

    // Ponte
    ctx.fillStyle = '#854d0e';
    roundRect(ctx, mapX + 13, mapY + 38, mapW - 26, 20, 2);
    ctx.fill();

    // Praia
    ctx.fillStyle = '#fde047';
    roundRect(ctx, mapX + 6, mapY + 60, mapW - 12, 30, 4);
    ctx.fill();

    // Sementes
    seeds.forEach(s => {
      if (!s.collected) {
        const syNorm = s.y / WORLD_HEIGHT;
        const sxNorm = (s.x - 90) / 800;
        const smX = mapX + 8 + sxNorm * (mapW - 16);
        const smY = mapY + 6 + syNorm * (mapH - 14);

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(smX, smY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Onça-Pintada no minimapa (ponto vermelho)
    const gyNorm = fogGuard.y / WORLD_HEIGHT;
    const gxNorm = (fogGuard.x - 90) / 800;
    const gmX = mapX + 8 + gxNorm * (mapW - 16);
    const gmY = mapY + 6 + gyNorm * (mapH - 14);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(gmX, gmY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Lobo-Guará Lia no minimapa (ponto pulsante ciano)
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

    canvas.style.cursor = anyHovered ? 'pointer' : 'default';
  });

  canvas.addEventListener('click', (e) => {
    const { worldX, worldY } = getCanvasWorldCoords(e);
    const clickedSign = findSignAt(worldX, worldY);

    if (clickedSign) {
      showPlaceDiscovery(clickedSign);
    }
  });

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const { worldX, worldY } = getCanvasWorldCoords(touch);
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
    let handled = false;

    if (isPressed && currentState === State.READY &&
        ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      startGame();
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
    }

    if (handled) {
      e.preventDefault();
    }
  }

  window.addEventListener('keydown', (e) => handleKey(e, true));
  window.addEventListener('keyup', (e) => handleKey(e, false));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && currentState === State.PLAYING) {
      pauseGame('Você mudou de aba. O jogo foi pausado para esperar seu retorno.');
    }
  });

  window.addEventListener('blur', () => {
    if (currentState === State.PLAYING) {
      pauseGame('A janela perdeu o foco. O jogo foi pausado.');
    }
  });

  btnStart.addEventListener('click', startGame);
  btnPause.addEventListener('click', togglePause);
  btnReset.addEventListener('click', resetGame);
  modalResumeBtn.addEventListener('click', resumeGame);
  modalResetBtn.addEventListener('click', resetGame);

  function bindTouch(btn, dirKey) {
    const startPress = (e) => {
      e.preventDefault();
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

  initSeeds();
  updateHUD();
  requestAnimationFrame(gameLoop);

  window.__ILHA_VIVA__ = {
    getState: () => currentState,
    getLia: () => ({ ...lia }),
    getGuard: () => ({ ...fogGuard }),
    getSeeds: () => seeds.map(s => ({ ...s })),
    collectSeed: (id) => {
      const s = seeds.find(item => item.id === id);
      if (s && !s.collected) {
        s.collected = true;
        spawnSparkle(s.x, s.y);
        updateHUD();
        if (getCollectedCount() === seeds.length) triggerVictory();
      }
    },
    resetGame,
    togglePause,
    isWalkable
  };

})();
