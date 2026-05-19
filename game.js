const trackLength = 68;
const homeLaneLength = 8;
const safeTrackIndices = new Set([4, 11, 16, 21, 28, 33, 38, 45, 50, 55, 62, 67]);

function isSafeSquare(position) {
  return safeTrackIndices.has(position);
}

const players = [
  {
    name: 'Rojo',
    color: 'red',
    inputId: 'imageRed',
    homeId: 'homeRed',
    image: null,
    startIndex: 38,
    entranceIndex: 33,
    pieces: [],
    consecutiveSixes: 0,
    pendingCaptureBonus: false,
    pendingFinishBonus: false,
  },
  {
    name: 'Verde',
    color: 'green',
    inputId: 'imageGreen',
    homeId: 'homeGreen',
    image: null,
    startIndex: 55,
    entranceIndex: 50,
    pieces: [],
    consecutiveSixes: 0,
    pendingCaptureBonus: false,
    pendingFinishBonus: false,
  },
  {
    name: 'Amarillo',
    color: 'yellow',
    inputId: 'imageYellow',
    homeId: 'homeYellow',
    image: null,
    startIndex: 4,
    entranceIndex: 67,
    pieces: [],
    consecutiveSixes: 0,
    pendingCaptureBonus: false,
    pendingFinishBonus: false,
  },
  {
    name: 'Azul',
    color: 'blue',
    inputId: 'imageBlue',
    homeId: 'homeBlue',
    image: null,
    startIndex: 21,
    entranceIndex: 16,
    pieces: [],
    consecutiveSixes: 0,
    pendingCaptureBonus: false,
    pendingFinishBonus: false,
  },
];

let currentPlayerIndex = 0;
let diceTimer = null;
let countdownTimer = null;
let moveDelayTimer = null;
let resultDelayTimer = null;
let pendingMoveOptions = [];
let pendingMoveCallback = null;
let currentRoll = null;
const rollDuration = 3000;

const statusPanel = document.getElementById('statusPanel');
const rollDiceButton = document.getElementById('rollDiceButton');
const diceFace = document.getElementById('diceFace');
const diceResult = document.getElementById('diceResult');
const boardPanel = document.getElementById('boardPanel');
const boardStage = document.getElementById('boardStage');
const startButton = document.getElementById('startButton');
const welcomePanel = document.getElementById('welcomePanel');
const selectionPanel = document.getElementById('selectionPanel');
const continueButton = document.getElementById('continueButton');
const closeButton = document.getElementById('closeButton');
const backButton = document.getElementById('backButton');
const selectionStatus = document.getElementById('selectionStatus');
const diceOverlay = document.getElementById('diceOverlay');
const diceOptionGroup = document.getElementById('diceOptionGroup');
let currentScreen = 'welcome';

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });
}

function clearDiceTimer() {
  if (diceTimer) {
    clearInterval(diceTimer);
    diceTimer = null;
  }
}

function showDiceOverlay() {
  diceOverlay.classList.remove('hidden');
  diceOverlay.style.display = 'grid';
  diceOverlay.style.zIndex = '10000';
}

function hideDiceOverlay() {
  clearDiceTimer();
  diceOverlay.classList.add('hidden');
  diceOverlay.style.display = 'none';
  diceOptionGroup.innerHTML = '';
  diceResult.classList.add('hidden');
  diceFace.classList.add('hidden');
  clearCountdown();
  clearPendingMoveSelection();
}

function setDiceOverlayVisibility(visible) {
  if (visible) {
    showDiceOverlay();
    return;
  }
  diceOverlay.classList.add('hidden');
  diceOverlay.style.display = 'none';
}

function renderDiceDialog(message, buttons = [], showRoll = false) {
  // 1. Configuramos el texto del mensaje principal
  diceResult.textContent = message || '';
  diceResult.classList.toggle('hidden', !message);
  
  // 2. Limpiamos las opciones dinámicas
  diceOptionGroup.innerHTML = '';

  // 3. Generamos los botones de opciones (si los hay)
  buttons.forEach((buttonData) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action-button';
    button.textContent = buttonData.label;
    button.addEventListener('click', buttonData.onClick);
    diceOptionGroup.appendChild(button);
  });

  // 4. Configuramos la visibilidad del botón de lanzar dado
  rollDiceButton.classList.toggle('hidden', !showRoll);
  
  // --- CORRECCIÓN AQUÍ ---
  // Buscamos la caja del diálogo real (.dice-dialog) que está dentro del overlay
  const dialogBox = diceOverlay.querySelector('.dice-dialog');
  
  // Si encontramos la caja y el botón debe mostrarse, lo movemos al final de ESTA caja
  if (dialogBox && showRoll) {
    dialogBox.appendChild(rollDiceButton);
  }

  // 5. Ajustamos el modo de selección
  diceOverlay.classList.toggle('selection-mode', pendingMoveOptions.length > 0);
  if (pendingMoveOptions.length === 0) {
    showDiceOverlay();
  } else {
    setDiceOverlayVisibility(false);
  }
}

function setPendingMoveOptions(options, callback, message) {
  pendingMoveOptions = options;
  pendingMoveCallback = callback;
  rollDiceButton.disabled = true;
  renderDiceDialog(message, [], false);
  statusPanel.textContent = '';
  renderAll();
}

function clearPendingMoveSelection() {
  const hadPendingOptions = pendingMoveOptions.length > 0;
  pendingMoveOptions = [];
  pendingMoveCallback = null;
  if (hadPendingOptions && currentScreen === 'game') {
    renderAll();
  }
}

function getPendingOptionForPiece(piece) {
  return pendingMoveOptions.find((option) => option.piece === piece) || null;
}

function selectPiece(piece) {
  if (currentScreen !== 'game') {
    return;
  }
  const option = getPendingOptionForPiece(piece);
  if (!option) {
    return;
  }
  const callback = pendingMoveCallback;
  clearPendingMoveSelection();
  hideDiceOverlay();
  callback?.(option);
}

function renderDiceFace(face) {
  diceFace.innerHTML = '';
  if (!face) {
    diceFace.classList.add('hidden');
    return;
  }

  diceFace.classList.remove('hidden');
  const spots = {
    1: [{ x: 50, y: 50 }],
    2: [{ x: 25, y: 25 }, { x: 75, y: 75 }],
    3: [{ x: 25, y: 25 }, { x: 50, y: 50 }, { x: 75, y: 75 }],
    4: [{ x: 25, y: 25 }, { x: 25, y: 75 }, { x: 75, y: 25 }, { x: 75, y: 75 }],
    5: [{ x: 25, y: 25 }, { x: 25, y: 75 }, { x: 50, y: 50 }, { x: 75, y: 25 }, { x: 75, y: 75 }],
    6: [{ x: 25, y: 20 }, { x: 25, y: 50 }, { x: 25, y: 80 }, { x: 75, y: 20 }, { x: 75, y: 50 }, { x: 75, y: 80 }],
  };

  spots[face].forEach((spot) => {
    const dot = document.createElement('span');
    dot.className = 'dice-dot';
    dot.style.left = `${spot.x}%`;
    dot.style.top = `${spot.y}%`;
    diceFace.appendChild(dot);
  });
}

function buildPlayers() {
  players.forEach((player) => {
    player.pieces = Array.from({ length: 4 }, (_, index) => ({
      id: index + 1,
      status: 'home',
      position: null,
      lanePosition: 0,
    }));
    player.consecutiveSixes = 0;
    player.pendingCaptureBonus = false;
    player.pendingFinishBonus = false;
  });
}

buildPlayers();

const trackPositions = [
  { left: '3%', top: '60.56%' },
  { left: '7.56%', top: '60.56%' },
  { left: '12.11%', top: '60.56%' },
  { left: '17.00%', top: '60.56%' },
  { left: '22.22%', top: '60.56%' },
  { left: '26.78%', top: '60.56%' },
  { left: '32.00%', top: '60.56%' },
  { left: '36.60%', top: '60.56%' },
  { left: '39.44%', top: '63.90%' },
  { left: '39.44%', top: '69.00%' },
  { left: '39.44%', top: '73.90%' },
  { left: '39.44%', top: '77.78%' },
  { left: '39.44%', top: '83.00%' },
  { left: '39.44%', top: '87.89%' },
  { left: '39.44%', top: '92.60%' },
  { left: '39.44%', top: '97%' },
  { left: '50%', top: '97%' },
  { left: '60.56%', top: '97%' },
  { left: '60.56%', top: '92.60%' },
  { left: '60.56%', top: '87.89%' },
  { left: '60.56%', top: '83.00%' },
  { left: '60.56%', top: '77.78%' },
  { left: '60.56%', top: '73.90%' },
  { left: '60.56%', top: '69.00%' },
  { left: '60.56%', top: '63.90%' },
  { left: '63.60%', top: '60.56%' },
  { left: '68.67%', top: '60.56%' },
  { left: '73.22%', top: '60.56%' },
  { left: '77.78%', top: '60.56%' },
  { left: '83.00%', top: '60.56%' },
  { left: '87.50%', top: '60.56%' },
  { left: '92.40%', top: '60.56%' },
  { left: '97%', top: '60.56%' },
  { left: '97%', top: '50%' },
  { left: '97%', top: '39.44%' },
  { left: '92.40%', top: '39.44%' },
  { left: '87.50%', top: '39.44%' },
  { left: '83.00%', top: '39.44%' },
  { left: '77.78%', top: '39.44%' },
  { left: '73.22%', top: '39.44%' },
  { left: '68.67%', top: '39.44%' },
  { left: '63.60%', top: '39.44%' },
  { left: '60.56%', top: '36.60%' },
  { left: '60.56%', top: '31.80%' },
  { left: '60.56%', top: '26.60%' },
  { left: '60.56%', top: '22.22%' },
  { left: '60.56%', top: '17.30%' },
  { left: '60.56%', top: '12.50%' },
  { left: '60.56%', top: '7.56%' },
  { left: '60.56%', top: '3%' },
  { left: '50%', top: '3%' },
  { left: '39.44%', top: '3%' },
  { left: '39.44%', top: '7.56%' },
  { left: '39.44%', top: '12.50%' },
  { left: '39.44%', top: '17.30%' },
  { left: '39.44%', top: '22.22%' },
  { left: '39.44%', top: '26.60%' },
  { left: '39.44%', top: '31.80%' },
  { left: '39.44%', top: '36.60%' },
  { left: '36.60%', top: '39.44%' },
  { left: '32.00%', top: '39.44%' },
  { left: '26.78%', top: '39.44%' },
  { left: '22.22%', top: '39.44%' },
  { left: '17.00%', top: '39.44%' },
  { left: '12.11%', top: '39.44%' },
  { left: '7.56%', top: '39.44%' },
  { left: '3%', top: '39.44%' },
  { left: '3%', top: '50%' },
];

const homePositions = {
  red: [
    { left: '72%', top: '08%' },
    { left: '92%', top: '08%' },
    { left: '72%', top: '28%' },
    { left: '92%', top: '28%' },
  ],
  green: [
    { left: '08%', top: '08%' },
    { left: '28%', top: '08%' },
    { left: '08%', top: '28%' },
    { left: '28%', top: '28%' },
  ],
  yellow: [
    { left: '08%', top: '72%' },
    { left: '28%', top: '72%' },
    { left: '08%', top: '92%' },
    { left: '28%', top: '92%' },
  ],
  blue: [
    { left: '72%', top: '72%' },
    { left: '92%', top: '72%' },
    { left: '72%', top: '92%' },
    { left: '92%', top: '92%' },
  ],
};

const lanePositions = {
  red: [
    { left: '92.40%', top: '50%' },
    { left: '87.50%', top: '50%' },
    { left: '83.00%', top: '50%' },
    { left: '77.78%', top: '50%' },
    { left: '73.22%', top: '50%' },
    { left: '68.67%', top: '50%' },
    { left: '63.60%', top: '50%' },
    //{ left: '58%', top: '50%' },
  ],
  green: [
    { left: '50%', top: '7.56%' },
    { left: '50%', top: '12.50%' },
    { left: '50%', top: '17.30%' },
    { left: '50%', top: '22.22%' },
    { left: '50%', top: '26.60%' },
    { left: '50%', top: '31.80%' },
    { left: '50%', top: '36.60%' },
    //{ left: '50%', top: '42%' },
  ],
  yellow: [
    { left: '7.56%', top: '50%' },
    { left: '12.11%', top: '50%' },
    { left: '17.00%', top: '50%' },
    { left: '22.22%', top: '50%' },
    { left: '26.78%', top: '50%' },
    { left: '32.00%', top: '50%' },
    { left: '36.60%', top: '50%' },
    //{ left: '42.00%', top: '50%' },
  ],
  blue: [
    { left: '50%', top: '92.60%' },
    { left: '50%', top: '87.89%' },
    { left: '50%', top: '83.00%' },
    { left: '50%', top: '77.78%' },
    { left: '50%', top: '73.90%' },
    { left: '50%', top: '69.00%' },
    { left: '50%', top: '63.90%' },
    //{ left: '50%', top: '58%' },
  ],
};

const finishPositions = {
  red:    { left: '58%', top: '50%' },
  green:  { left: '50%', top: '42%' },
  yellow: { left: '42%', top: '50%' },
  blue:   { left: '50%', top: '58%' },
};

function getPieceCoordinates(piece, player) {
  if (piece.status === 'home') {
    return homePositions[player.color][piece.id - 1];
  }
  if (piece.status === 'track') {
    return trackPositions[piece.position];
  }
  if (piece.status === 'lane') {
    return lanePositions[player.color][piece.lanePosition - 1];
  }
  return finishPositions[player.color]; // <--- Cambiado de piece.id - 1 a player.color
}

function renderBoardMarkers() {
  boardStage.innerHTML = '';

  trackPositions.forEach((coords, index) => {
    const marker = document.createElement('div');
    marker.className = `board-marker${isSafeSquare(index) ? ' safe' : ''}`;
    marker.style.left = coords.left;
    marker.style.top = coords.top;
    marker.setAttribute('aria-hidden', 'true');

    if (isSafeSquare(index)) {
      const label = document.createElement('span');
      label.className = 'board-marker-label';
      label.textContent = (index + 1).toString();
      marker.appendChild(label);
    }

    boardStage.appendChild(marker);
  });

  Object.values(lanePositions).flat().forEach((coords) => {
    const marker = document.createElement('div');
    marker.className = 'board-marker lane';
    marker.style.left = coords.left;
    marker.style.top = coords.top;
    boardStage.appendChild(marker);
  });

  Object.entries(finishPositions).forEach(([color, coords], index) => {
    const marker = document.createElement('div');
    marker.className = `board-marker finish finish-${index + 1}`;
    marker.style.left = coords.left;
    marker.style.top = coords.top;
    boardStage.appendChild(marker);
  });
}

function renderHomeAreas() {
  // remove previous home areas
  const prev = boardStage.querySelectorAll('.home-area');
  prev.forEach((el) => el.remove());

  // Inner corner index for each color in `homePositions` arrays
  const innerIndex = {
    red: 1,    // top-right
    blue: 3,   // bottom-right
    yellow: 2, // bottom-left
    green: 0,  // top-left
  };

  players.forEach((player) => {
    const homes = homePositions[player.color];
    const idx = innerIndex[player.color] ?? 0;
    const inner = homes[idx];
    const innerLeft = parseFloat(inner.left);
    const innerTop = parseFloat(inner.top);

    // Build container anchored so that the inner corner remains at the exact home coord
    let left, top, width, height;
    if (player.color === 'yellow') {
      // inner at top-right -> container from left:0 to innerLeft, top:innerTop to bottom
      left = `1%`;
      top = `67%`;
      width = `32%`;
      height = `32%`;
      //width = `${innerLeft}%`;
      //height = `${100 - innerTop}%`;
    } else if (player.color === 'blue') {
      // inner at top-left -> container from innerLeft to right, top:innerTop to bottom
      left = `67%`;
      top = `67%`;
      width = `32%`;
      height = `32%`;
      //width = `${100 - innerLeft}%`;
      //height = `${100 - innerTop}%`;
    } else if (player.color === 'red') {
      // inner at bottom-left -> container from innerLeft to right, top:0 to innerTop
      left = `67%`;
      top = `1%`;
      width = `32%`;
      height = `32%`;
      //width = `${100 - innerLeft}%`;
      //height = `${innerTop}%`;
    } else { // green
      // inner at top-left (green specified as top-left earlier) but expansion to top-left
      // inner at top-left -> container from left:0 top:0 to inner
      left = `1%`;
      top = `1%`;
      width = `32%`;
      height = `32%`;
      //width = `${innerLeft}%`;
      //height = `${innerTop}%`;
    }

    const container = document.createElement('div');
    container.className = 'home-area';
    container.style.left = left;
    container.style.top = top;
    container.style.width = width;
    container.style.height = height;
    container.setAttribute('aria-hidden', 'true');

    if (player.image) {
      const img = document.createElement('img');
      img.src = player.image;
      img.alt = `${player.name} casa`;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      container.appendChild(img);
    } else {
      container.classList.add(player.color);
    }

    boardStage.appendChild(container);
  });
}

function renderBoardPieces() {
  // 1. Primero, creamos un mapa para contar cuántas fichas hay en cada posición del tablero
  const positionCounters = {};

  players.forEach((player) => {
    player.pieces.forEach((piece) => {
      // Creamos una clave única según el estado de la ficha
      let key = '';
      if (piece.status === 'home') {
        key = `home-${player.color}-${piece.id}`;
      } else if (piece.status === 'track') {
        key = `track-${piece.position}`;
      } else if (piece.status === 'lane') {
        key = `lane-${player.color}-${piece.lanePosition}`;
      } else if (piece.status === 'finished') {
        key = `finish-${piece.id}`;
      }

      // Inicializamos o incrementamos el contador para esta posición exacta
      if (!positionCounters[key]) {
        positionCounters[key] = [];
      }
      positionCounters[key].push({ player, piece });
    });
  });

  // 2. Ahora dibujamos las fichas aplicando el desplazamiento si comparten casilla
  players.forEach((player) => {
    player.pieces.forEach((piece) => {
      const coords = getPieceCoordinates(piece, player);
      
      // Reconstruimos la clave para buscar en nuestro mapa de posiciones
      let key = '';
      if (piece.status === 'home') key = `home-${player.color}-${piece.id}`;
      else if (piece.status === 'track') key = `track-${piece.position}`;
      else if (piece.status === 'lane') key = `lane-${player.color}-${piece.lanePosition}`;
      else if (piece.status === 'finished') key = `finish-${piece.id}`;

      const occupants = positionCounters[key] || [];
      
      // Encontrarnos a nosotros mismos dentro de los ocupantes de esta casilla
      const myIndex = occupants.findIndex(o => o.piece === piece);

      // Calculamos los offsets por defecto (sin desplazamiento)
      let offsetX = 0;
      let offsetY = 0;

      // Si hay 2 fichas en la misma casilla de la pista (track) o carril (lane)
      if (occupants.length > 1 && (piece.status === 'track' || piece.status === 'lane')) {
        // Si somos la primera ficha, la movemos un poco a la izquierda (-8px)
        // Si somos la segunda ficha, la movemos un poco a la derecha (+8px)
        offsetX = myIndex === 0 ? -8 : 8;
        
        // Opcional: puedes añadir un pequeño desplazamiento vertical si el tablero lo requiere,
        // pero habitualmente con separarlas en horizontal (X) ya es suficiente para el parchís.
        offsetY = myIndex === 0 ? -2 : 2; 
      }

      const token = document.createElement('div');
      token.className = `piece-token ${player.color}`;
      
      // Convertimos las coordenadas base a float para poder sumar los píxeles del offset de forma limpia usando calc()
      token.style.left = `calc(${coords.left} + ${offsetX}px)`;
      token.style.top = `calc(${coords.top} + ${offsetY}px)`;
      
      token.style.backgroundColor = player.image ? 'transparent' : player.color;
      token.dataset.player = player.color;
      token.dataset.pieceId = piece.id;

      const selectableOption = getPendingOptionForPiece(piece);
      if (selectableOption) {
        token.classList.add('clickable');
        token.title = 'Haz clic para mover esta ficha';
        token.addEventListener('click', () => selectPiece(piece));
      }

      if (player.image) {
        const img = document.createElement('img');
        img.src = player.image;
        img.alt = `${player.name} ficha ${piece.id}`;
        token.appendChild(img);
      }

      boardStage.appendChild(token);
    });
  });
}

function setupInputHandlers() {
  players.forEach((player) => {
    const input = document.getElementById(player.inputId);
    input.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) {
        player.image = null;
        updatePlayerPreview(player);
        return;
      }
      try {
        player.image = await readImageFile(file);
        updatePlayerPreview(player);
      } catch (error) {
        alert('Error cargando la imagen de ' + player.name);
        player.image = null;
      }
    });
  });
}

function updatePlayerPreview(player) {
  const input = document.getElementById(player.inputId);
  const label = input.previousElementSibling;
  if (player.image) {
    label.textContent = `${player.name} (imagen cargada)`;
  } else {
    label.textContent = player.name === 'Rojo' ? 'Jugador Rojo' :
      player.name === 'Verde' ? 'Jugador Verde' :
      player.name === 'Amarillo' ? 'Jugador Amarillo' : 'Jugador Azul';
  }
}

function getAllImagesLoaded() {
  return players.some((player) => player.image);
}

function showScreen(screen) {
  currentScreen = screen;
  welcomePanel.classList.toggle('hidden', screen !== 'welcome');
  selectionPanel.classList.toggle('hidden', screen !== 'selection');
  boardPanel.classList.toggle('hidden', screen !== 'game');
  resetGameState();
  selectionStatus.classList.add('hidden');
  rollDiceButton.disabled = screen !== 'game';
  if (screen === 'game') {
    statusPanel.classList.remove('hidden');
    renderAll();
  } else {
    statusPanel.classList.add('hidden');
  }
}

function clearCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function clearMoveDelayTimer() {
  if (moveDelayTimer) {
    clearTimeout(moveDelayTimer);
    moveDelayTimer = null;
  }
}

function clearResultDelayTimer() {
  if (resultDelayTimer) {
    clearTimeout(resultDelayTimer);
    resultDelayTimer = null;
  }
}

function resetGameState() {
  clearDiceTimer();
  clearCountdown();
  clearMoveDelayTimer();
  clearResultDelayTimer();
  clearPendingMoveSelection();
  currentRoll = null;
  hideDiceOverlay();
}

function startCountdown(seconds, initialMessage) {
  clearCountdown();
  let remaining = seconds;
  rollDiceButton.disabled = true;
  renderDiceFace(null);
  
  // Usamos el mensaje inicial recibido
  renderDiceDialog(`${initialMessage} ${remaining}`);
  showDiceOverlay();

  countdownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining > 0) {
      renderDiceDialog(`${initialMessage} ${remaining}`);
      return;
    }
    clearCountdown();
    renderDiceDialog(`Ya puedes tirar el dado`, [], true);
    rollDiceButton.disabled = false;
  }, 1000);
}

function closeApp() {
  window.close();
}

function openSelectionScreen() {
  showScreen('selection');
}

function returnToWelcomeScreen() {
  showScreen('welcome');
}

function startGame() {
  if (currentScreen !== 'selection') {
    return;
  }

  buildPlayers();
  currentPlayerIndex = Math.floor(Math.random() * players.length);
  const current = players[currentPlayerIndex];

  resetGameState();
  showScreen('game');
  const welcomeMsg = `Empieza ${current.name}. Preparando primera tirada...`;
  statusPanel.textContent = welcomeMsg;
  startCountdown(3, welcomeMsg); // Pasamos el mensaje al countdown
  renderAll();
}

function renderAll() {
  renderBoardMarkers();
  renderHomeAreas();
  renderBoardPieces();
}

function getTrackOccupants() {
  const map = new Map();
  players.forEach((player) => {
    player.pieces.forEach((piece) => {
      if (piece.status === 'track') {
        const pos = piece.position;
        const list = map.get(pos) || [];
        list.push({ player, piece });
        map.set(pos, list);
      }
    });
  });
  return map;
}

function hasOwnPieceOnTrack(position, player) {
  const occupants = getTrackOccupants().get(position) || [];
  return occupants.some((entry) => entry.player === player);
}

function hasOpponentOnTrack(position, player) {
  const occupants = getTrackOccupants().get(position) || [];
  return occupants.find((entry) => entry.player !== player) || null;
}

function getTrackTarget(position, dice, player) {
  // 1. Calculamos cuántos pasos le quedan a la ficha desde su 'position' actual
  // hasta alcanzar su casilla de entrada ('player.entranceIndex').
  let distanceToEntrance = 0;
  
  if (position <= player.entranceIndex) {
    // Caso simple: la ficha aún no ha cruzado el índice 0 del tablero
    distanceToEntrance = player.entranceIndex - position;
  } else {
    // Caso de vuelta completa: la ficha ya pasó el índice de su entrada en la vuelta anterior
    // y está completando el circuito (por ejemplo, posición 65 y entrada en 3)
    distanceToEntrance = (trackLength - position) + player.entranceIndex;
  }

  // 2. Si el dado saca exactamente lo necesario para pisar la entrada + 1 paso más,
  // la ficha entra en la primera casilla del carril de meta (lanePosition = 1).
  if (dice === distanceToEntrance + 1) {
    return { status: 'lane', lanePosition: 1 };
  }

  // 3. Si el dado saca más pasos de los necesarios para llegar a la entrada + 1,
  // significa que se adentra aún más en el carril de color (por ejemplo, carril 2, 3, etc.)
  if (dice > distanceToEntrance + 1) {
    const stepsIntoLane = dice - (distanceToEntrance + 1);
    
    // Validamos que no se pase del tamaño del carril (homeLaneLength es 8)
    // Si llega a 9 (homeLaneLength + 1), significa que entra directo a 'finished'
    if (stepsIntoLane === homeLaneLength + 1) {
      return { status: 'finished', lanePosition: stepsIntoLane };
    }
    if (stepsIntoLane > homeLaneLength + 1) {
      return null; // Movimiento inválido, se pasa de la meta
    }
    
    return { status: 'lane', lanePosition: stepsIntoLane };
  }

  // 4. Si el dado es menor o igual a la distancia hasta la entrada,
  // la ficha simplemente avanza de forma normal por la pista general.
  return { status: 'track', position: (position + dice) % trackLength };
}

function getLaneTarget(piece, dice) {
  const targetLane = piece.lanePosition + dice;
  if (targetLane === homeLaneLength + 1) {
    return { status: 'finished', lanePosition: targetLane };
  }
  if (targetLane > homeLaneLength + 1) {
    return null;
  }
  return {
    status: 'lane',
    lanePosition: targetLane,
  };
}

function isOwnBlockingTarget(player, target, piece) {
  if (target.status === 'track') {
    const occupants = getTrackOccupants().get(target.position) || [];
    
    // 1. Si la casilla destino es tu propia salida
    if (target.position === player.startIndex) {
      return occupants.length >= 2;
    }
    
    // 2. Si es una casilla segura (pero no tu salida)
    if (isSafeSquare(target.position)) {
      // En casillas seguras pueden cooperar dos fichas cualesquiera.
      // Bloquea solo si ya está al máximo de su capacidad (2 fichas).
      return occupants.length >= 2;
    }
    
    // 3. Casillas normales (no seguras)
    // Cuentas cuántas fichas tuyas ya hay en esa casilla.
    const myOccupantsCount = occupants.filter((entry) => entry.player === player).length;
    
    // Bloquea si YA tienes 2 fichas allí (el puente ya está completo).
    // Si tienes 1, te dejará mover la segunda para formar el puente.
    return myOccupantsCount >= 2;
  }

  if (target.status === 'lane') {
    return player.pieces.some((otherPiece) =>
      otherPiece !== piece && otherPiece.status === target.status && otherPiece.lanePosition === target.lanePosition
    );
  }

  if (target.status === 'finished') {
    return false;
  }

  return false;
}

function isPathBlocked(fromPosition, steps, player, isLane = false) {
  // Si nos movemos por el carril final (lane)
  if (isLane) {
    // Revisamos las casillas intermedias del carril
    for (let i = 1; i < steps; i++) {
      const checkLanePos = fromPosition + i;
      const laneOccupants = player.pieces.filter(
        (p) => p.status === 'lane' && p.lanePosition === checkLanePos
      ).length;
      
      // En el carril, si hay otra ficha propia en una posición intermedia, ¿bloquea?
      // Nota: Según reglas oficiales, en el carril de meta no se suelen permitir puentes,
      // pero si en tu lógica se pueden juntar, lo ideal es comprobar si ya hay una ficha estorbando.
      if (laneOccupants >= 1) {
        return true; // Camino bloqueado en el carril
      }
    }
    return false;
  }

  // Si nos movemos por la pista principal (track)
  let currentPos = fromPosition;
  for (let i = 1; i <= steps; i++) {
    // Avanzamos una casilla
    currentPos = (currentPos + 1) % trackLength;

    // Si es la última casilla (el destino final), no la evaluamos aquí como "bloqueo de camino".
    // Eso ya lo controla la función isOwnBlockingTarget que modificamos antes.
    if (i === steps) break;

    // Si en el siguiente paso la ficha tendría que meterse al carril de color
    if (currentPos === player.entranceIndex) {
      // Calculamos cuántos pasos le quedan por dar, restando los que ya dio en la pista
      const remainingSteps = steps - i;
      // Si le quedaban pasos, el siguiente paso (remainingSteps) ya es entrar al carril (posición 0 del carril)
      return isPathBlocked(0, remainingSteps, player, true);
    }

    // Comprobamos cuántas fichas totales hay en esta casilla intermedia de la pista
    const occupants = getTrackOccupants().get(currentPos) || [];
    if (occupants.length >= 2) {
      return true; // ¡HAY UN PUENTE! El camino está bloqueado.
    }
  }

  return false;
}

function getAvailableMoves(player, dice) {
  const moves = [];
  const homePieces = player.pieces.filter((piece) => piece.status === 'home');

  if (dice === 5 && homePieces.length > 0) {
    homePieces.forEach((piece) => {
      const target = { status: 'track', position: player.startIndex };
      if (!isOwnBlockingTarget(player, target, piece)) {
        // Al salir de casa no hay casillas intermedias, así que no requiere verificar camino saltado
        const isExitSquare = target.position === player.startIndex;
        const capture = (!isSafeSquare(target.position) || isExitSquare) && Boolean(hasOpponentOnTrack(target.position, player));
        moves.push({ type: 'exit', piece, to: target, capture });
      }
    });
  }

  player.pieces.forEach((piece) => {
    if (piece.status === 'track') {
      // 1. Verificamos primero si hay un puente en el camino intermedio
      if (!isPathBlocked(piece.position, dice, player, false)) {
        const target = getTrackTarget(piece.position, dice, player);
        if (target && !isOwnBlockingTarget(player, target, piece)) {
          const capture = target.status === 'track' && !isSafeSquare(target.position) && Boolean(hasOpponentOnTrack(target.position, player));
          moves.push({ type: 'move', piece, to: target, capture });
        }
      }
    }

    if (piece.status === 'lane') {
      // 2. Verificamos si hay bloqueos intermedios en el carril
      if (!isPathBlocked(piece.lanePosition, dice, player, true)) {
        const target = getLaneTarget(piece, dice);
        if (target && !isOwnBlockingTarget(player, target, piece)) {
          moves.push({ type: 'move', piece, to: target, capture: false });
        }
      }
    }
  });

  return moves;
}

function getReturnHomeOptions(player) {
  return player.pieces.filter((piece) => piece.status === 'track' || piece.status === 'lane');
}

function getGameWinner() {
  return players.find((player) => player.pieces.every((piece) => piece.status === 'finished')) || null;
}

function endGame(winner) {
  rollDiceButton.disabled = true;
  hideDiceOverlay();
  statusPanel.textContent = `¡Victoria para ${winner.name}! La partida ha terminado.`;
}

function getBonusMoves(player, steps) {
  const moves = [];

  player.pieces.forEach((piece) => {
    if (piece.status === 'track') {
      const target = getTrackTarget(piece.position, steps, player);
      if (target && !isOwnBlockingTarget(player, target, piece)) {
        const capture = !isSafeSquare(target.position) && Boolean(hasOpponentOnTrack(target.position, player));
        moves.push({ type: 'bonus', piece, to: target, capture });
      }
    }

    if (piece.status === 'lane') {
      const target = getLaneTarget(piece, steps);
      if (target && !isOwnBlockingTarget(player, target, piece)) {
        moves.push({ type: 'bonus', piece, to: target, capture: false });
      }
    }
  });

  return moves;
}

function formatActionLabel(option) {
  const pieceLabel = `Ficha ${option.piece.id}`;
  const dest = option.to;
  if (option.type === 'return') {
    return `${pieceLabel} volver a casa`;
  }
  if (dest.status === 'track') {
    return `${pieceLabel} a casilla ${dest.position + 1}`;
  }
  if (dest.status === 'lane') {
    return `${pieceLabel} a carril ${dest.lanePosition}`;
  }
  return `${pieceLabel} a FINAL`;
}

function renderDiceOptions(options, message, callback) {
  const buttons = options.map((option) => ({
    label: formatActionLabel(option),
    onClick: () => callback(option),
  }));
  renderDiceDialog(message, buttons, false);
}

function captureAtTarget(target, player) {
  if (isSafeSquare(target.position)) {
    return false;
  }
  const occupant = hasOpponentOnTrack(target.position, player);
  if (!occupant) {
    return false;
  }

  // 1. Guardamos el color y el ID antes de reiniciar su estado en la lógica
  const capturedColor = occupant.player.color;
  const capturedId = occupant.piece.id;

  occupant.piece.status = 'home';
  occupant.piece.position = null;
  occupant.piece.lanePosition = 0;

  // 2. Buscamos el elemento HTML de la ficha afectada para moverlo progresivamente
  const pieceElements = document.querySelectorAll('.piece-token');
  pieceElements.forEach((el) => {
    if (el.dataset.pieceId == capturedId && el.classList.contains(capturedColor)) {
      const homeCoords = homePositions[capturedColor][capturedId - 1];
      if (homeCoords) {
        // Le aplicamos las coordenadas de casa directamente al estilo inline
        el.style.left = homeCoords.left;
        el.style.top = homeCoords.top;
      }
    }
  });

  return true;
}

function applyMove(option) {
  const player = players[currentPlayerIndex];
  const piece = option.piece;
  const destination = option.to;

  piece.status = destination.status;
  piece.position = destination.status === 'track' ? destination.position : null;
  piece.lanePosition = destination.status === 'lane' || destination.status === 'finished' ? destination.lanePosition : 0;

  const captured = destination.status === 'track' && option.capture && captureAtTarget(destination, player);

  if (captured) {
    player.pendingCaptureBonus = true;
  }

  if (destination.status === 'finished') {
    player.pendingFinishBonus = true;
  }

  if (captured) {
    setTimeout(() => {
      renderAll();
    }, 800);
  } else {
    renderAll();
  }
}

function finishTurn() {
  const winner = getGameWinner();
  if (winner) {
    endGame(winner);
    return;
  }

  const current = players[currentPlayerIndex];
  current.consecutiveSixes = 0;
  current.pendingCaptureBonus = false;
  current.pendingFinishBonus = false;
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  const next = players[currentPlayerIndex];
  currentRoll = null;
  
  // CAMBIO AQUÍ: Forzamos la visualización del overlay al cambiar de turno
  showDiceOverlay(); 
  renderDiceDialog(`Turno de ${next.name}. Pulsa "Lanzar dado" para tirar.`, [], true);
  
  rollDiceButton.disabled = false;
  statusPanel.textContent = '';
  renderAll();
}

function handlePostMove() {
  const current = players[currentPlayerIndex];

  if (current.pendingCaptureBonus) {
    const bonusMoves = getBonusMoves(current, 20);
    if (bonusMoves.length > 0) {
      setPendingMoveOptions(bonusMoves, (option) => {
        current.pendingCaptureBonus = false;
        applyMove(option);
        handlePostMove();
      }, 'Has capturado una ficha. Elige otra ficha para avanzar 20 casillas:');
      return;
    }
    current.pendingCaptureBonus = false;
    renderDiceDialog(`${current.name} ha capturado una ficha, pero no tiene otra ficha válida para avanzar 20 casillas.`, [
      { label: 'Continuar', onClick: () => { hideDiceOverlay(); finishTurn(); } }
    ], false);
    showDiceOverlay();
    return; 
  }

  if (current.pendingFinishBonus) {
    const bonusMoves = getBonusMoves(current, 10);
    if (bonusMoves.length > 0) {
      setPendingMoveOptions(bonusMoves, (option) => {
        current.pendingFinishBonus = false;
        applyMove(option);
        handlePostMove();
      }, 'Has llegado a la meta. Elige otra ficha para avanzar 10 casillas:');
      return;
    }
    current.pendingFinishBonus = false;
    renderDiceDialog(`${current.name} ha llegado a la meta, pero no hay otra ficha válida para avanzar 10 casillas.`, [
      { label: 'Continuar', onClick: () => { hideDiceOverlay(); finishTurn(); } }
    ], false);
    showDiceOverlay();
    return;
  }

  if (currentRoll === 6 && current.consecutiveSixes < 3) {
    statusPanel.textContent = `${current.name} sacó un 6 y puede tirar otra vez.`;
    rollDiceButton.disabled = false;
    renderDiceFace(currentRoll);
    renderDiceDialog(`Turno de ${current.name}. Puedes tirar otra vez con 6.`, [], true);
    return;
  }

  hideDiceOverlay();
  finishTurn();
}

function performMove(option) {
  if (currentScreen !== 'game') {
    return;
  }

  const current = players[currentPlayerIndex];

  // Comprobamos si el movimiento que se va a realizar proviene de un bonus de captura activo
  if (current.pendingCaptureBonus) {
    // Desactivamos el overlay y quitamos la interacción para que no se pulse nada más
    clearPendingMoveSelection();
    hideDiceOverlay();
    
    // Quitamos los estilos de parpadeo/clicables temporalmente de las fichas del tablero
    const tokens = document.querySelectorAll('.piece-token');
    tokens.forEach(t => t.classList.remove('clickable'));

    statusPanel.textContent = `Ficha seleccionada. Contando las 20 casillas en 3 segundos...`;

    // Añadimos el retraso de 3000 milisegundos (3 segundos)
    setTimeout(() => {
      executeMoveSteps(option);
    }, 3000);
  } else {
    // Si es un movimiento normal (por dado o bonus de 10), se ejecuta al instante como antes
    clearPendingMoveSelection();
    hideDiceOverlay();
    executeMoveSteps(option);
  }
}

// Creamos esta función auxiliar para albergar el resto de la lógica original de tu performMove
function executeMoveSteps(option) {
  applyMove(option);
  renderAll();

  const winner = getGameWinner();
  if (winner) {
    endGame(winner);
    return;
  }

  clearMoveDelayTimer();
  moveDelayTimer = setTimeout(() => {
    moveDelayTimer = null;
    handlePostMove();
  }, 2000);
}

function chooseReturnHome(piece) {
  if (currentScreen !== 'game') {
    return;
  }
  piece.status = 'home';
  piece.position = null;
  piece.lanePosition = 0;
  const current = players[currentPlayerIndex];
  current.consecutiveSixes = 0;
  current.pendingCaptureBonus = false;
  current.pendingFinishBonus = false;
  statusPanel.textContent = `${current.name} devuelve una ficha a casa. Fin del turno.`;
  finishTurn();
}

function rollDice() {
  if (currentScreen !== 'game' || rollDiceButton.disabled) {
    return;
  }

  rollDiceButton.disabled = true;
  renderDiceFace(null);
  renderDiceDialog('Lanzando...', [], false);

  const start = Date.now();
  diceTimer = setInterval(() => {
    const face = Math.floor(Math.random() * 6) + 1;
    renderDiceFace(face);
    //diceResult.textContent = `Resultado: ${face}`;
    //diceResult.classList.remove('hidden');
    if (Date.now() - start >= rollDuration) {
      clearInterval(diceTimer);
      diceTimer = null;
      currentRoll = face;
      renderDiceFace(face);
      diceResult.textContent = `Resultado: ${face}`;
      diceResult.classList.remove('hidden');
      clearResultDelayTimer();
      resultDelayTimer = setTimeout(() => {
        resultDelayTimer = null;
        processDiceResult(face);
      }, 1000);
    }
  }, 120);
}

function processDiceResult(face) {
  if (currentScreen !== 'game') {
    return;
  }

  const current = players[currentPlayerIndex];
  if (face === 6) {
    current.consecutiveSixes += 1;
  } else {
    current.consecutiveSixes = 0;
  }

  if (current.consecutiveSixes === 3) {
    const options = getReturnHomeOptions(current);
    if (options.length > 0) {
      setPendingMoveOptions(options.map((piece) => ({ type: 'return', piece, to: null })), (option) => {
        chooseReturnHome(option.piece);
      }, 'Has sacado tres 6s. Elige una ficha para devolverla a casa:');
      return;
    }
    statusPanel.textContent = `${current.name} ha sacado tres 6s pero no hay fichas para devolver. Fin del turno.`;
    hideDiceOverlay();
    finishTurn();
    return;
  }

  const moves = getAvailableMoves(current, face);
  if (moves.length === 0) {
    if (face === 6) {
      renderDiceDialog(`${current.name} no tiene movimientos con 6, pero puede tirar otra vez.`, [], true);
      statusPanel.textContent = `${current.name} sigue con 6.`;
      rollDiceButton.disabled = false;
      return;
    }
    if (face === 5 && current.pieces.some((piece) => piece.status === 'home')) {
      renderDiceDialog(`${current.name} no puede sacar ficha de casa; la casilla inicial está bloqueada.`, [
        { label: 'Pasar Turno', onClick: () => { hideDiceOverlay(); finishTurn(); } }
      ], false);
      showDiceOverlay();
      finishTurn();
      return;
    }
      renderDiceDialog(`${current.name} no tiene movimientos posibles con el número ${face}.`, [
      { label: 'Pasar Turno', onClick: () => { hideDiceOverlay(); finishTurn(); } }
      ], false);
    showDiceOverlay();
    finishTurn();
    return;
  }

  setPendingMoveOptions(
    moves, 
    performMove, 
    `Turno de ${current.name}. Selecciona una de tus fichas parpadeantes en el tablero para moverla con el número ${face}:`
  );
}

continueButton.addEventListener('click', openSelectionScreen);
closeButton.addEventListener('click', closeApp);
backButton.addEventListener('click', returnToWelcomeScreen);
startButton.addEventListener('click', startGame);
rollDiceButton.addEventListener('click', rollDice);
setupInputHandlers();
showScreen('welcome');
