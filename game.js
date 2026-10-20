/**
 * Ilha Viva - Jogo em Tela Cheia com Guarda de Névoa no Bosque
 * - Guarda de névoa: patrulha uma linha horizontal fixa em área aberta do bosque (Y: 340, X entre 320 e 640).
 * - Distância segura: Longe do início de Lia na praia (Y: 1240) e da saída da ponte (Y: 570).
 * - Não persegue Lia nem cruza a ponte/passagem.
 * - Velocidade constante (110 px/s) e menor que a de Lia (210 px/s).
 * - Seta direcional visível (◀ ou ▶) e indicação textual de acessibilidade "NÉVOA".
 * - Folga total para desvio (acima, abaixo, esquerda e direita), permitindo alcançar todas as 10 sementes.
 * - Contato com o guarda aciona derrota com o título "A névoa alcançou você".
 * - Reiniciar restaura Lia, guarda, 10 sementes, contador 0/10 e câmera.
 * - Pausa com P ou troca de aba congela o guarda e Lia sem salto temporal na retomada.
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
  // - Praia (Sul): x [90, 870], y [840, 1340]
  // - Ponte Larga (Centro): x [300, 660], y [570, 870] (360px de largura sobre o mar)
  // - Bosque (Norte): x [80, 880], y [60, 600]
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

    // Bosque (posicionados para deixar aberta a rota de patrulha do guarda em Y: 340)
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
  // GUARDA DE NÉVOA
  // Patrulha uma linha horizontal fixa numa área aberta do bosque:
  // Y = 340 (a 230px de distância da saída da ponte Y: 570 e a 900px do início de Lia Y: 1240)
  // X varia entre minX: 300 e maxX: 660.
  // Não persegue Lia nem cruza a ponte/passagem.
  // Velocidade: 110 px/s (constante e menor que a de Lia, que tem 210 px/s).
  // ==========================================
  const GUARD_START = {
    x: 320,
    y: 340,
    minX: 280,
    maxX: 680,
    width: 44,
    height: 38,
    speed: 110,
    direction: 1 // 1 para direita, -1 para esquerda
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

  // 10 Sementes Alcançáveis com Espaço de Sobra para Desviar do Guarda:
  // 4 na praia (Sul) e 6 no bosque (Norte)
  const SEED_DEFINITIONS = [
    // 4 na Praia
    { id: 1, region: 'beach', x: 260, y: 1200, name: 'Semente da Brisa Marinha' },
    { id: 2, region: 'beach', x: 710, y: 1190, name: 'Semente da Maré Mansa' },
    { id: 3, region: 'beach', x: 350, y: 950, name: 'Semente das Dunas' },
    { id: 4, region: 'beach', x: 610, y: 960, name: 'Semente do Sol Costeiro' },

    // 6 no Bosque (posicionadas antes, além e ao redor da patrulha sem bloqueio)
    { id: 5, region: 'forest', x: 210, y: 500, name: 'Semente do Musgo Verde' }, // antes do guarda
    { id: 6, region: 'forest', x: 750, y: 490, name: 'Semente do Carvalho' }, // antes do guarda
    { id: 7, region: 'forest', x: 480, y: 420, name: 'Semente da Clareira' }, // ao sul da linha do guarda
    { id: 8, region: 'forest', x: 240, y: 280, name: 'Semente do Broto Silvestre' }, // flanco esquerdo livre
    { id: 9, region: 'forest', x: 720, y: 280, name: 'Semente da Seiva Antiga' }, // flanco direito livre
    { id: 10, region: 'forest', x: 480, y: 200, name: 'Semente do Coração da Ilha' } // ao norte da linha do guarda
  ];

  let seeds = [];
  let sparkles = [];

  // Posição Inicial de Lia
  const LIA_START_X = 480;
  const LIA_START_Y = 1240;

  const lia = {
    x: LIA_START_X,
    y: LIA_START_Y,
    radius: 16,
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

  // Verificação de Limites: Todo o corpo circular de Lia em terra firme ou sobre a ponte
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

    // Obstáculos sólidos da cenografia
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

    // Estacas das plaquinhas
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

  // Derrota pelo Guarda de Névoa
  function handleDefeat() {
    currentState = State.DEFEATED;

    lia.isMoving = false;
    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;

    modalTitle.textContent = 'A névoa alcançou você';
    modalDescription.textContent = 'O Guarda de Névoa bloqueou seu avanço no bosque. Observe a seta de direção e desvie pela clareira para resgatar as sementes.';
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
    modalDescription.textContent = 'Você resgatou todas as dez sementes da ilha! A terra está pronta para renascer com o futuro plantio.';
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
      lastTimestamp = performance.now(); // Previne salto de posição do guarda e de Lia
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

  // Reiniciar Restaura Lia, Guarda, Dez Sementes, Contador 0/10 e Câmera
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

    // 2. Movimento do Guarda de Névoa (Patrulha em Linha Fixa Horizontal no Bosque)
    fogGuard.x += fogGuard.direction * fogGuard.speed * dt;
    if (fogGuard.x >= fogGuard.maxX) {
      fogGuard.x = fogGuard.maxX;
      fogGuard.direction = -1; // Vira para esquerda
    } else if (fogGuard.x <= fogGuard.minX) {
      fogGuard.x = fogGuard.minX;
      fogGuard.direction = 1; // Vira para direita
    }

    // 3. Colisão com o Guarda de Névoa (Círculo vs Caixa Delimitadora)
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

    // Câmera adaptativa suave
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

    // Ilhas
    renderIslands();

    // Ponte Larga
    renderLargeBridge();

    // Rota de Patrulha Indicativa Suave do Guarda
    renderPatrolRoute();

    // Cenografia
    renderSceneryProps();

    // Plaquinhas
    renderSignposts();

    // Sementes
    renderSeeds();

    // Partículas
    renderSparkles();

    // Guarda de Névoa
    renderFogGuard();

    // Lia
    renderLia();

    ctx.restore();

    // 3. Minimapa (com radar de Lia, sementes e guarda)
    renderMinimapHUD();

    // 4. Atmosfera
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

    // Sombra
    ctx.fillStyle = 'rgba(2, 25, 45, 0.65)';
    roundRect(ctx, bx - 12, by + 10, bw + 24, bh, 8);
    ctx.fill();

    // Pilares
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

    // Vigas
    ctx.fillStyle = '#58280a';
    ctx.fillRect(bx - 4, by, 10, bh);
    ctx.fillRect(bx + bw - 6, by, 10, bh);

    // Pranchas
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

    // Guarda-corpos
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

  // Linha tracejada suave indicando a rota de patrulha no bosque
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

  // ==========================================
  // RENDERIZAÇÃO DO GUARDA DE NÉVOA
  // Com seta direcional clara, aura espectral e acessibilidade
  // ==========================================
  function renderFogGuard() {
    ctx.save();
    ctx.translate(fogGuard.x, fogGuard.y);

    const pulse = Math.sin(globalAnimTimer * 5) * 3;

    // 1. Sombra e aura de névoa densa
    const mistGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 36 + pulse);
    mistGrad.addColorStop(0, 'rgba(241, 245, 249, 0.95)');
    mistGrad.addColorStop(0.5, 'rgba(148, 163, 184, 0.6)');
    mistGrad.addColorStop(1, 'rgba(51, 65, 85, 0)');
    ctx.fillStyle = mistGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 36 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // 2. Corpo espectral do guarda
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    roundRect(ctx, -fogGuard.width / 2, -fogGuard.height / 2, fogGuard.width, fogGuard.height, 10);
    ctx.fill();
    ctx.stroke();

    // 3. Olhos brilhantes da névoa
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    const eyeLook = fogGuard.direction === 1 ? 3 : -3;
    ctx.beginPath();
    ctx.arc(-8 + eyeLook, -6, 3, 0, Math.PI * 2);
    ctx.arc(6 + eyeLook, -6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 4. Rótulo de Acessibilidade Textual "NÉVOA"
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NÉVOA', 0, 9);

    // 5. SETA DIRECIONAL VISÍVEL (Indica se está indo para direita ou esquerda)
    ctx.save();
    ctx.fillStyle = '#ef4444'; // Vermelho vivo de perigo
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (fogGuard.direction === 1) {
      // Seta apontando para a direita ▶
      ctx.moveTo(14, -6);
      ctx.lineTo(24, 0);
      ctx.lineTo(14, 6);
      ctx.closePath();
    } else {
      // Seta apontando para a esquerda ◀
      ctx.moveTo(-14, -6);
      ctx.lineTo(-24, 0);
      ctx.lineTo(-14, 6);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  function roundRect(context, x, y, w, h, r) {
    context.beginPath();
    roundRectPath(context, x, y, w, h, r);
  }

  function roundRectPath(context, x, y, w, h, r) {
    context.roundRect(x, y, w, h, r);
  }

  function renderSeeds() {
    seeds.forEach(seed => {
      if (!seed.collected) {
        ctx.save();
        ctx.translate(seed.x, seed.y);

        const pulse = Math.sin(globalAnimTimer * 4 + seed.glowTimer) * 2;
        const currentR = seed.radius + pulse;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 9, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        const haloGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, currentR + 10);
        haloGrad.addColorStop(0, 'rgba(251, 191, 36, 0.85)');
        haloGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)');
        haloGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(0, 0, currentR + 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#b45309';
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 1, currentR - 1, currentR + 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.ellipse(0, -currentR + 1, 3.5, 5, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-2, -3, 1.8, 0, Math.PI * 2);
        ctx.fill();

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

  function renderPalmTree(scale) {
    ctx.scale(scale, scale);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(-10, -18, -4, -36);
    ctx.stroke();

    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-2 - i * 1.5, 4 - i * 10, 4, 0, Math.PI);
      ctx.stroke();
    }

    const sway = Math.sin(globalAnimTimer * 1.5) * 0.08;
    ctx.translate(-4, -36);
    ctx.rotate(sway);

    const leaves = [0, 0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6];
    leaves.forEach(angle => {
      ctx.save();
      ctx.rotate(angle);
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(14, 0, 18, 5, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(3, 3, 3, 0, Math.PI * 2);
    ctx.arc(-2, 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function renderOakTree(scale) {
    ctx.scale(scale, scale);
    ctx.fillStyle = '#582c0f';
    ctx.fillRect(-6, -10, 12, 18);

    const canopyColors = ['#14532d', '#16a34a', '#22c55e'];
    const offsets = [
      { x: 0, y: -26, r: 24, c: canopyColors[0] },
      { x: -12, y: -20, r: 18, c: canopyColors[1] },
      { x: 12, y: -20, r: 18, c: canopyColors[1] },
      { x: 0, y: -30, r: 16, c: canopyColors[2] }
    ];

    offsets.forEach(leaf => {
      ctx.fillStyle = leaf.c;
      ctx.beginPath();
      ctx.arc(leaf.x, leaf.y, leaf.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-6, -26, 2.5, 0, Math.PI * 2);
    ctx.arc(8, -22, 2.5, 0, Math.PI * 2);
    ctx.arc(2, -36, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function renderPineTree(scale) {
    ctx.scale(scale, scale);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-4, -6, 8, 14);

    const levels = [
      { y: -8, w: 28, h: 14, c: '#064e3b' },
      { y: -18, w: 22, h: 12, c: '#047857' },
      { y: -26, w: 14, h: 10, c: '#059669' }
    ];

    levels.forEach(lvl => {
      ctx.fillStyle = lvl.c;
      ctx.beginPath();
      ctx.moveTo(0, lvl.y - lvl.h);
      ctx.lineTo(-lvl.w / 2, lvl.y);
      ctx.lineTo(lvl.w / 2, lvl.y);
      ctx.closePath();
      ctx.fill();
    });
  }

  function renderRock(scale) {
    ctx.scale(scale, scale);
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(-16, 8);
    ctx.lineTo(-12, -8);
    ctx.lineTo(8, -12);
    ctx.lineTo(18, 4);
    ctx.lineTo(8, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(6, -10);
    ctx.lineTo(12, 0);
    ctx.lineTo(-2, 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(-8, -4, 3, 0, Math.PI * 2);
    ctx.arc(2, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function renderShell(scale) {
    ctx.scale(scale, scale);
    ctx.fillStyle = '#fed7aa';
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function renderStarfish(scale) {
    ctx.scale(scale, scale);
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const x = Math.cos(angle) * 7;
      const y = Math.sin(angle) * 7;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  function renderFlowers(scale) {
    ctx.scale(scale, scale);
    const colors = ['#f43f5e', '#a855f7', '#38bdf8', '#facc15'];
    for (let i = 0; i < 5; i++) {
      const fx = (i - 2) * 6;
      const fy = Math.sin(i * 1.5) * 5;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(fx, fy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function renderShrub(scale) {
    ctx.scale(scale, scale);
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(-6, 0, 7, 0, Math.PI * 2);
    ctx.arc(6, 0, 7, 0, Math.PI * 2);
    ctx.arc(0, -5, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  function renderLia() {
    ctx.save();
    ctx.translate(lia.x, lia.y);

    const bobbing = lia.isMoving ? Math.sin(lia.walkCycle) * 2 : 0;
    ctx.translate(0, bobbing);

    // Sombra
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, lia.radius - 2 - bobbing, lia.radius * 0.95, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mochila
    ctx.save();
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.5;

    if (lia.facing === 'up') {
      roundRect(ctx, -7, 0, 14, 14, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-3, 6, 6, 3);
    } else if (lia.facing === 'right') {
      roundRect(ctx, -lia.radius - 6, -10, 9, 18, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-lia.radius - 4, -4, 5, 4);
    } else if (lia.facing === 'left') {
      roundRect(ctx, lia.radius - 3, -10, 9, 18, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(lia.radius - 1, -4, 5, 4);
    }
    ctx.restore();

    // Pernas
    ctx.fillStyle = '#334155';
    const stepL = lia.isMoving ? Math.sin(lia.walkCycle) * 4 : 0;
    const stepR = lia.isMoving ? -Math.sin(lia.walkCycle) * 4 : 0;
    ctx.fillRect(-6 + stepL, lia.radius - 4, 5, 6);
    ctx.fillRect(2 + stepR, lia.radius - 4, 5, 6);

    // Casaco
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, lia.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (lia.facing !== 'up') {
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cabeça e Chapéu Safari
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(0, -7, 9, 0, Math.PI * 2);
    ctx.fill();

    if (lia.facing !== 'up') {
      ctx.fillStyle = '#1e293b';
      let eyeOffX = 0;
      if (lia.facing === 'right') eyeOffX = 2;
      else if (lia.facing === 'left') eyeOffX = -2;

      ctx.beginPath();
      ctx.arc(eyeOffX - 2, -7, 1.3, 0, Math.PI * 2);
      ctx.arc(eyeOffX + 3, -7, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#d97706';
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -11, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#b45309';
    roundRect(ctx, -7, -19, 14, 9, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#16a34a';
    ctx.fillRect(-7, -13, 14, 2.5);

    // Tag Lia
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    roundRect(ctx, -20, -38, 40, 16, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Lia', 0, -26);
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

    // Sementes no Minimapa
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

    // Guarda de Névoa no Minimapa (ponto vermelho de perigo)
    const gyNorm = fogGuard.y / WORLD_HEIGHT;
    const gxNorm = (fogGuard.x - 90) / 800;
    const gmX = mapX + 8 + gxNorm * (mapW - 16);
    const gmY = mapY + 6 + gyNorm * (mapH - 14);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(gmX, gmY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Posição de Lia (ponto pulsante ciano)
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

  // Inicialização
  initSeeds();
  updateHUD();
  requestAnimationFrame(gameLoop);

  // Expõe no escopo de testes
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
