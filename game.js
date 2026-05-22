// --- CONFIGURACIÓN Y CONSTANTES DEL TABLERO ---
const trackLength = 68; // Longitud total de la pista circular común
const homeLaneLength = 8; // Número de casillas en el pasillo de meta (carril de color)
// Índices de las casillas seguras del tablero circular (donde no se puede capturar)
const safeTrackIndices = new Set([5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63, 68]);

// Elementos del DOM para la configuración de la velocidad del dado
const diceDurationSlider = document.getElementById('diceDurationSlider');
const diceDurationValue = document.getElementById('diceDurationValue');

/**
 * Determina si una casilla de la pista común es segura.
 * @param {number} position - Índice de la casilla en la pista común.
 * @returns {boolean} True si la casilla es segura, false en caso contrario.
 */
function isSafeSquare(position) {
  return safeTrackIndices.has(position);
}

// --- DEFINICIÓN DE LOS JUGADORES ---
const players = [
  {
    name: 'ROJO',
    color: 'red',
    inputId: 'imageRed',
    homeId: 'homeRed',
    image: null,
    startIndex: 39,       // Casilla de salida al tablero común
    entranceIndex: 34,     // Última casilla antes de desviarse al carril de meta rojo
    pieces: [],
    consecutiveSixes: 0,
    pendingCaptureBonus: false,
    pendingFinishBonus: false,
  },
  {
    name: 'VERDE',
    color: 'green',
    inputId: 'imageGreen',
    homeId: 'homeGreen',
    image: null,
    startIndex: 56,       // Casilla de salida al tablero común
    entranceIndex: 51,     // Última casilla antes de desviarse al carril de meta verde
    pieces: [],
    consecutiveSixes: 0,
    pendingCaptureBonus: false,
    pendingFinishBonus: false,
  },
  {
    name: 'AMARILLO',
    color: 'yellow',
    inputId: 'imageYellow',
    homeId: 'homeYellow',
    image: null,
    startIndex: 5,        // Casilla de salida al tablero común
    entranceIndex: 68,     // Última casilla antes de desviarse al carril de meta amarillo
    pieces: [],
    consecutiveSixes: 0,
    pendingCaptureBonus: false,
    pendingFinishBonus: false,
  },
  {
    name: 'AZUL',
    color: 'blue',
    inputId: 'imageBlue',
    homeId: 'homeBlue',
    image: null,
    startIndex: 22,       // Casilla de salida al tablero común
    entranceIndex: 17,     // Última casilla antes de desviarse al carril de meta azul
    pieces: [],
    consecutiveSixes: 0,
    pendingCaptureBonus: false,
    pendingFinishBonus: false,
  },
];

// --- VARIABLES DE CONTROL DEL ESTADO DEL JUEGO ---
let currentPlayerIndex = 0;
let diceTimer = null;
let countdownTimer = null;
let moveDelayTimer = null;
let resultDelayTimer = null;
let pendingMoveOptions = [];
let pendingMoveCallback = null;
let currentRoll = null;
let rollDuration = 3000; // Duración por defecto de la animación del dado en ms
let contatiradas = 0;    // 🟢 NUEVA: Contador de tiradas para el primer jugador

// --- VARIABLES PARA EL DEBUG DE TIRADAS (Cargadas desde archivo externo) ---
let debugDiceSequence = []; // Lista de números predefinidos
let debugDiceIndex = 0;     // Índice del número actual de la secuencia

// --- REFERENCIAS A ELEMENTOS DEL DOM ---
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

/**
 * Lee un archivo de imagen seleccionado por el usuario y lo convierte a Base64.
 * @param {File} file - El archivo de imagen.
 * @returns {Promise<string>} Promesa con la URL en formato DataURL.
 */
function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });
}

/**
 * Limpia el temporizador de la animación visual del dado.
 */
function clearDiceTimer() {
  if (diceTimer) {
    clearInterval(diceTimer);
    diceTimer = null;
  }
}

/**
 * Muestra el panel superpuesto del dado en primer plano.
 */
function showDiceOverlay() {
  diceOverlay.classList.remove('hidden');
  diceOverlay.style.display = 'grid';
  diceOverlay.style.zIndex = '10000';
}

/**
 * Oculta el panel superpuesto del dado y limpia los temporizadores asociados.
 */
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

/**
 * Cambia la visibilidad del overlay según el parámetro lógico.
 * @param {boolean} visible 
 */
function setDiceOverlayVisibility(visible) {
  if (visible) {
    showDiceOverlay();
    return;
  }
  diceOverlay.classList.add('hidden');
  diceOverlay.style.display = 'none';
}

/**
 * Actualiza el modal/diálogo del dado con un mensaje específico y opciones interactivas.
 * @param {string} message - Texto informativo a mostrar (admite marcado HTML estilizado).
 * @param {Array} buttons - Colección de botones de acción con texto y callback.
 * @param {boolean} showRoll - Flag para habilitar o deshabilitar el botón de tirar.
 */
function renderDiceDialog(message, buttons = [], showRoll = false) {
  // 1. Configuramos el texto informativo con formato de colores
  diceResult.innerHTML = formatColorNames(message) || '';
  diceResult.classList.toggle('hidden', !message);
  
  // 2. Limpiamos cualquier botón de opción previa
  diceOptionGroup.innerHTML = '';

  // 3. Generamos e inyectamos los nuevos botones de opciones
  buttons.forEach((buttonData) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action-button';
    button.textContent = buttonData.label;
    button.addEventListener('click', buttonData.onClick);
    diceOptionGroup.appendChild(button);
  });

  // 4. Controlamos la visibilidad y posicionamiento del botón de lanzar dado
  rollDiceButton.classList.toggle('hidden', !showRoll);
  
  const dialogBox = diceOverlay.querySelector('.dice-dialog');
  if (dialogBox && showRoll) {
    dialogBox.appendChild(rollDiceButton);
  }

  // 5. Ajustamos el comportamiento visual según haya elecciones de ficha pendientes
  diceOverlay.classList.toggle('selection-mode', pendingMoveOptions.length > 0);
  if (pendingMoveOptions.length === 0) {
    showDiceOverlay();
  } else {
    setDiceOverlayVisibility(false);
  }
}

/**
 * Establece un conjunto de opciones de fichas que el jugador actual puede mover.
 * @param {Array} options - Las opciones disponibles.
 * @param {Function} callback - El método que procesará la opción seleccionada.
 * @param {string} message - El mensaje que acompaña la elección.
 */
function setPendingMoveOptions(options, callback, message) {
  pendingMoveOptions = options;
  pendingMoveCallback = callback;
  rollDiceButton.disabled = true;
  renderDiceDialog(message, [], false);
  statusPanel.textContent = '';
  renderAll();
}

/**
 * Limpia la cola de selección de movimiento pendiente.
 */
function clearPendingMoveSelection() {
  const hadPendingOptions = pendingMoveOptions.length > 0;
  pendingMoveOptions = [];
  pendingMoveCallback = null;
  if (hadPendingOptions && currentScreen === 'game') {
    renderAll();
  }
}

/**
 * Retorna la opción de movimiento vinculada a una ficha en concreto.
 * @param {Object} piece - Ficha a evaluar.
 */
function getPendingOptionForPiece(piece) {
  return pendingMoveOptions.find((option) => option.piece === piece) || null;
}

/**
 * Selecciona e inicia el desplazamiento de una ficha.
 * @param {Object} piece - Ficha que recibe la acción del jugador.
 */
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

/**
 * Dibuja los puntos sobre la cara visual del dado en 2D.
 * @param {number|null} face - Número del 1 al 6 o null para vaciar la cara.
 */
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

/**
 * Inicializa la estructura interna de las 4 fichas por jugador.
 */
function buildPlayers() {
  players.forEach((player) => {
    player.pieces = Array.from({ length: 4 }, (_, index) => ({
      id: index + 1,
      status: 'home',      // Estados válidos: 'home', 'track', 'lane', 'finished'
      position: null,      // Posición numérica en pista común
      lanePosition: 0,     // Posición numérica en pasillo de meta
    }));
    player.consecutiveSixes = 0;
    player.pendingCaptureBonus = false;
    player.pendingFinishBonus = false;
  });
}

// Inicialización de la partida de prueba
buildPlayers();

// --- MAPAS DE COORDENADAS PARA LA RENDERIZACIÓN VISUAL ---
// Coordenadas absolutas en % del tablero para el circuito general de 68 casillas
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

// Coordenadas absolutas para las 4 fichas retenidas en cada nido o casa original
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

// Coordenadas para los 7 escalones de entrada de color antes de la meta definitiva
const lanePositions = {
  red: [
    { left: '92.40%', top: '50%' },
    { left: '87.50%', top: '50%' },
    { left: '83.00%', top: '50%' },
    { left: '77.78%', top: '50%' },
    { left: '73.22%', top: '50%' },
    { left: '68.67%', top: '50%' },
    { left: '63.60%', top: '50%' },
  ],
  green: [
    { left: '50%', top: '7.56%' },
    { left: '50%', top: '12.50%' },
    { left: '50%', top: '17.30%' },
    { left: '50%', top: '22.22%' },
    { left: '50%', top: '26.60%' },
    { left: '50%', top: '31.80%' },
    { left: '50%', top: '36.60%' },
  ],
  yellow: [
    { left: '7.56%', top: '50%' },
    { left: '12.11%', top: '50%' },
    { left: '17.00%', top: '50%' },
    { left: '22.22%', top: '50%' },
    { left: '26.78%', top: '50%' },
    { left: '32.00%', top: '50%' },
    { left: '36.60%', top: '50%' },
  ],
  blue: [
    { left: '50%', top: '92.60%' },
    { left: '50%', top: '87.89%' },
    { left: '50%', top: '83.00%' },
    { left: '50%', top: '77.78%' },
    { left: '50%', top: '73.90%' },
    { left: '50%', top: '69.00%' },
    { left: '50%', top: '63.90%' },
  ],
};

// Coordenadas del triángulo de meta de cada color en el centro
const finishPositions = {
  red:    { left: '58%', top: '50%' },
  green:  { left: '50%', top: '42%' },
  yellow: { left: '42%', top: '50%' },
  blue:   { left: '50%', top: '58%' },
};

/**
 * Reemplaza nombres de jugadores en cadenas de texto por contenedores HTML coloreados.
 * @param {string} text - Texto a formatear.
 * @returns {string} Código HTML resultante con estilos en línea o clases.
 */
function formatColorNames(text) {
  if (!text) return '';
  return text
    .replace(/\bRojo\b/g, '<span class="text-color-red">Rojo</span>')
    .replace(/\bVerde\b/g, '<span class="text-color-green">Verde</span>')
    .replace(/\bAmarillo\b/g, '<span class="text-color-yellow">Amarillo</span>')
    .replace(/\bAzul\b/g, '<span class="text-color-blue">Azul</span>')
    .replace(/\bROJO\b/g, '<span class="text-color-red">ROJO</span>')
    .replace(/\bVERDE\b/g, '<span class="text-color-green">VERDE</span>')
    .replace(/\bAMARILLO\b/g, '<span class="text-color-yellow">AMARILLO</span>')
    .replace(/\bAZUL\b/g, '<span class="text-color-blue">AZUL</span>');
}

/**
 * Obtiene el par de coordenadas (top, left) asignado a la posición actual de una ficha.
 * @param {Object} piece - Ficha a evaluar.
 * @param {Object} player - Propietario de la ficha.
 * @returns {Object} {left, top} en valor porcentual.
 */
function getPieceCoordinates(piece, player) {
  if (piece.status === 'home') {
    return homePositions[player.color][piece.id - 1];
  }
  if (piece.status === 'track') {
    return trackPositions[piece.position-1] || null; // 🟢 CONTROL DE SEGURIDAD: Retorna null si la posición es inválida para evitar errores de renderizado
  }
  if (piece.status === 'lane') {
    return lanePositions[player.color][piece.lanePosition - 1] || null; // 🟢 CONTROL DE SEGURIDAD: Retorna null si la posición es inválida para evitar errores de renderizado
  }
  return finishPositions[player.color];
}

/**
 * Pinta los marcadores de la zona del centro en el Canvas del tablero.
 */
function renderBoardMarkers() {
  boardStage.innerHTML = '';
  Object.entries(finishPositions).forEach(([color, coords], index) => {
    const marker = document.createElement('div');
    marker.className = `board-marker finish finish-${index + 1}`;
    marker.style.left = coords.left;
    marker.style.top = coords.top;
    boardStage.appendChild(marker);
  });
}

/**
 * Modifica o dibuja los nidos (casas de salida) con las imágenes de perfil asignadas por los jugadores.
 */
function renderHomeAreas() {
  const prev = boardStage.querySelectorAll('.home-area');
  prev.forEach((el) => el.remove());

  players.forEach((player) => {
    let left, top, width, height;
    if (player.color === 'yellow') {
      left = '1%'; top = '67%'; width = '32%'; height = '32%';
    } else if (player.color === 'blue') {
      left = '67%'; top = '67%'; width = '32%'; height = '32%';
    } else if (player.color === 'red') {
      left = '67%'; top = '1%'; width = '32%'; height = '32%';
    } else { // green
      left = '1%'; top = '1%'; width = '32%'; height = '32%';
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

/**
 * Dibuja todas las fichas activas en pantalla aplicando lógica de separación para las que cohabitan.
 */
function renderBoardPieces() {
  const positionCounters = {};

  // 1. Agrupar las fichas por su ubicación en el tablero para detectar colisiones
  players.forEach((player) => {
    player.pieces.forEach((piece) => {
      let key = '';
      if (piece.status === 'home') {
        key = `home-${player.color}-${piece.id}`;
      } else if (piece.status === 'track') {
        key = `track-${piece.position}`;
      } else if (piece.status === 'lane') {
        key = `lane-${player.color}-${piece.lanePosition}`;
      } else if (piece.status === 'finished') {
        key = `finish-${player.color}`;
      }

      if (!positionCounters[key]) {
        positionCounters[key] = [];
      }
      positionCounters[key].push({ player, piece });
    });
  });

  // 2. Renderizar cada ficha con un desplazamiento progresivo en caso de compartir casilla
  players.forEach((player) => {
    player.pieces.forEach((piece) => {
      const coords = getPieceCoordinates(piece, player);
      
      // 🟢 CONTROL DE SEGURIDAD INTERNO: Si la coordenada no existe, saltamos la ficha para que no rompa el juego
      if (!coords) {
        console.warn(`⚠️ Posición inválida para la ficha ${piece.id} del jugador ${player.name}. Saltando renderizado.`);
        return; 
      }

      let key = '';
      if (piece.status === 'home') key = `home-${player.color}-${piece.id}`;
      else if (piece.status === 'track') key = `track-${piece.position}`;
      else if (piece.status === 'lane') key = `lane-${player.color}-${piece.lanePosition}`;
      else if (piece.status === 'finished') key = `finish-${player.color}`;

      const occupants = positionCounters[key] || [];
      const myIndex = occupants.findIndex(o => o.piece === piece);

      let offsetX = 0;
      let offsetY = 0;

      // Si cohabitan 2 o más fichas en pista o carril, aplicamos offsets para que no se oculten totalmente
      if (occupants.length > 1 && (piece.status === 'track' || piece.status === 'lane' || piece.status === 'finished')) {
        if (occupants.length === 2) {
          offsetX = myIndex === 0 ? -6 : 6;
          offsetY = myIndex === 0 ? -2 : 2;
        } else {
          // Soporte hasta para un máximo de 4 fichas apiladas (ej: en meta o barreras seguras)
          const angle = (myIndex * (360 / occupants.length) * Math.PI) / 180;
          offsetX = Math.round(Math.cos(angle) * 8);
          offsetY = Math.round(Math.sin(angle) * 8);
        }
      }

      const token = document.createElement('div');
      token.className = `piece-token ${player.color}`;
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

/**
 * Vincula la carga de imágenes personalizadas por el usuario para su uso como fichas.
 */
function setupInputHandlers() {
  players.forEach((player) => {
    const input = document.getElementById(player.inputId);
    if (input) {
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
          console.error('Error cargando la imagen de ' + player.name, error);
          player.image = null;
        }
      });
    }
  });
}

/**
 * Actualiza visualmente el estado del cargador de imágenes.
 * @param {Object} player - El objeto del jugador.
 */
function updatePlayerPreview(player) {
  const input = document.getElementById(player.inputId);
  if (!input) return;
  const label = input.previousElementSibling;
  if (player.image) {
    label.textContent = `${player.name} (imagen cargada)`;
  } else {
    label.textContent = player.name === 'Rojo' ? 'Jugador Rojo' :
      player.name === 'Verde' ? 'Jugador Verde' :
      player.name === 'Amarillo' ? 'Jugador Amarillo' : 'Jugador Azul';
  }
}

/**
 * Comprueba si al menos un jugador ha subido una foto personalizada.
 */
function getAllImagesLoaded() {
  return players.some((player) => player.image);
}

/**
 * Transición limpia entre las diferentes pantallas de la SPA.
 * @param {string} screen - 'welcome', 'selection' o 'game'.
 */
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

/**
 * Limpia y detiene la cuenta atrás del panel.
 */
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

/**
 * Resetea y libera todas las variables de control y animaciones del ciclo de juego.
 */
function resetGameState() {
  clearDiceTimer();
  clearCountdown();
  clearMoveDelayTimer();
  clearResultDelayTimer();
  clearPendingMoveSelection();
  currentRoll = null;
  hideDiceOverlay();
}

/**
 * Inicia una cuenta atrás animada con indicador circular antes del lanzamiento del turno.
 * @param {number} seconds - Duración del temporizador.
 * @param {string} initialMessage - Mensaje a plasmar en pantalla.
 */
function startCountdown(seconds, initialMessage) {
  clearCountdown();
  let remaining = seconds;
  rollDiceButton.disabled = true;
  renderDiceFace(null);
  
  const loadingHTML = `
    <div>${formatColorNames(initialMessage)}</div>
    <div class="loader-container">
      <div class="loading-spinner"></div>
    </div>
  `;
  
  renderDiceDialog(loadingHTML);
  showDiceOverlay();

  countdownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining > 0) {
      renderDiceDialog(loadingHTML);
      return;
    }
    clearCountdown();
    renderDiceDialog('', [], true);
    rollDiceButton.disabled = false;
  }, 1000);
}

/**
 * Cierra la ventana del navegador (si está autorizado por las directivas de la pestaña).
 */
function closeApp() {
  window.close();
}

function openSelectionScreen() {
  showScreen('selection');
}

function returnToWelcomeScreen() {
  showScreen('welcome');
}

/**
 * Configura los datos básicos e inicializa la partida de juego.
 */
function startGame() {
  if (currentScreen !== 'selection') {
    return;
  }

  buildPlayers();
  // Elige un jugador inicial de forma aleatoria
  currentPlayerIndex = Math.floor(Math.random() * players.length);
  const current = players[currentPlayerIndex];

  resetGameState();
  showScreen('game');
  const welcomeMsg = `EMPIEZA EL JUGADOR  ${current.name}...`;
  startCountdown(5, welcomeMsg);
  renderAll();
}

// Configuración de la escucha para ajustar el tiempo del dado dinámicamente
if (diceDurationSlider && diceDurationValue) {
  diceDurationSlider.addEventListener('input', (e) => {
    const seconds = e.target.value;
    diceDurationValue.textContent = seconds;
    rollDuration = seconds * 1000;
  });
}

/**
 * Dibuja de manera integral todos los componentes visuales del tablero.
 */
function renderAll() {
  renderBoardMarkers();
  renderHomeAreas();
  renderBoardPieces();
}

/**
 * Crea un mapa con la cantidad de fichas situadas sobre la pista exterior común.
 * @returns {Map} Un mapa estructurado [casilla => [{player, piece}]].
 */
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

/**
 * Calcula el destino de una ficha al avanzar por la pista circular.
 * @param {number} position - Posición de origen de la ficha.
 * @param {number} dice - Pasos a avanzar según el dado.
 * @param {Object} player - Jugador propietario.
 * @returns {Object|null} Devuelve el nuevo estado/posición de la ficha o null si el movimiento es inviable.
 */
/**
 * Calcula el destino de una ficha al avanzar paso a paso por el tablero.
 */
function getTrackTarget(position, dice, player) {
  let currentPos = position;
  let currentStatus = 'track';
  let lanePosition = 0;

  for (let i = 1; i <= dice; i++) {
    if (currentStatus === 'track') {
      if (currentPos === player.entranceIndex) {
        currentStatus = 'lane';
        lanePosition = 1;
      } else {
        // Avanza de 1 en 1. Si supera 68, vuelve a la casilla 1
        currentPos = currentPos + 1;
        if (currentPos > trackLength) {
          currentPos = 1;
        }
      }
    } else if (currentStatus === 'lane') {
      lanePosition++;
      if (lanePosition > homeLaneLength + 1) {
        return null; // Se pasa de la meta
      }
    }
  }

  if (currentStatus === 'lane') {
    if (lanePosition === homeLaneLength) {
      return { status: 'finished', lanePosition: lanePosition };
    }
    return { status: 'lane', lanePosition: lanePosition };
  }

  return { status: 'track', position: currentPos };
}

/**
 * Obtiene el destino en el carril final.
 * @param {Object} piece - Ficha a evaluar.
 * @param {number} dice - Pasos del dado.
 */
function getLaneTarget(piece, dice) {
  const targetLane = piece.lanePosition + dice;
  if (targetLane === homeLaneLength) {
    return { status: 'finished', lanePosition: targetLane };
  }
  if (targetLane > homeLaneLength) {
    return null;
  }
  return {
    status: 'lane',
    lanePosition: targetLane,
  };
}

/**
 * Comprueba si el destino está bloqueado por barreras formadas por el propio jugador.
 */
function isOwnBlockingTarget(player, target, piece) {
  if (target.status === 'track') {
    const occupants = getTrackOccupants().get(target.position) || [];
    
    if (target.position === player.startIndex) {
      return occupants.length >= 2;
    }
    
    if (isSafeSquare(target.position)) {
      return occupants.length >= 2;
    }
    
    const myOccupantsCount = occupants.filter((entry) => entry.player === player).length;
    return myOccupantsCount >= 2;
  }

  if (target.status === 'lane') {
    // MODIFICADO: Eliminamos el bloqueo automático si hay fichas propias.
    // El carril de llegada es privado y libre para acumular fichas del mismo jugador.
    return false;
  }

  return false;
}

/**
 * Comprueba si el camino intermedio de una ficha está obstruido por una barrera (2 fichas en la misma casilla).
 */
function isPathBlocked(fromPosition, steps, player, isLane = false) {
  if (isLane) {/*
    for (let i = 1; i < steps; i++) {
      const checkLanePos = fromPosition + i;
      const laneOccupants = player.pieces.filter(
        (p) => p.status === 'lane' && p.lanePosition === checkLanePos
      ).length;
      
      if (laneOccupants >= 1) {
        return true;
      }
    }*/
    return false;
  }

  let currentPos = fromPosition;
  for (let i = 1; i <= steps; i++) {
    // Avanzar de forma circular en base 1-68
    currentPos = currentPos + 1;
    if (currentPos > trackLength) {
      currentPos = 1;
    }

    if (i === steps) break;

    if (currentPos === player.entranceIndex) {
      const remainingSteps = steps - i;
      return isPathBlocked(0, remainingSteps, player, true);
    }

    const occupants = getTrackOccupants().get(currentPos) || [];
    if (occupants.length >= 2) {
      return true; // Hay un puente/barrera en el camino intermedio
    }
  }

  return false;
}

/**
 * Construye la lista de movimientos legales para el jugador dado su tirada de dado.
 */
function getAvailableMoves(player, dice) {
  const moves = [];
  const homePieces = player.pieces.filter((piece) => piece.status === 'home');

  // Regla del Parchís: Si sacas un 5 y tienes fichas en casa, estás obligado a sacar ficha si tu salida está libre
  if (dice === 5 && homePieces.length > 0) {
    homePieces.forEach((piece) => {
      const target = { status: 'track', position: player.startIndex };
      if (!isOwnBlockingTarget(player, target, piece)) {
        const isExitSquare = target.position === player.startIndex;
        const capture = (!isSafeSquare(target.position) || isExitSquare) && Boolean(hasOpponentOnTrack(target.position, player));
        moves.push({ type: 'exit', piece, to: target, capture });
      }
    });
  }

  player.pieces.forEach((piece) => {
    if (piece.status === 'track') {
      if (!isPathBlocked(piece.position, dice, player, false)) {
        const target = getTrackTarget(piece.position, dice, player);
        if (target && !isOwnBlockingTarget(player, target, piece)) {
          const capture = target.status === 'track' && !isSafeSquare(target.position) && Boolean(hasOpponentOnTrack(target.position, player));
          moves.push({ type: 'move', piece, to: target, capture });
        }
      }
    }

    if (piece.status === 'lane') {
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
  rollDiceButton.disabled = true; //
  renderDiceFace(null); // Limpiamos la cara visual del dado

  // Muestra el mensaje de victoria dentro del diálogo flotante unificado
  renderDiceDialog(
    `🏆 ¡Victoria para ${winner.name}! La partida ha terminado.`,
    [
      {
        label: 'Nueva partida',
        onClick: () => {
          resetFullGame(); // Ejecuta el reinicio completo
        }
      }
    ],
    false
  );
  
  // Forzamos a que el overlay se abra en primer plano
  showDiceOverlay();
}

/**
 * Limpia el estado de la partida actual y regresa al menú de Bienvenida.
 */
function resetFullGame() {
  hideDiceOverlay();

  // 1. Restablecer variables globales de control de juego
  currentPlayerIndex = 0;
  currentRoll = null;
  contatiradas = 0; // Reseteamos tu contador de tiradas

  // 2. Devolver todas las fichas a sus nidos ('home') y limpiar bonus
  players.forEach((player) => {
    player.consecutiveSixes = 0;
    player.pendingCaptureBonus = false;
    player.pendingFinishBonus = false;
    
    player.pieces.forEach((piece) => {
      piece.status = 'home';
      piece.position = null;
      piece.lanePosition = 0;
    });
  });

  // 3. Limpiar cualquier texto residual del panel de estado
  statusPanel.textContent = '';

  // 4. Renderizar el tablero vacío
  renderAll();

  // 5. Utilizar tu función nativa de SPA para regresar a la pantalla de bienvenida
  showScreen('welcome');
}

function getBonusMoves(player, steps) {
  const moves = [];

  player.pieces.forEach((piece) => {
    if (piece.status === 'track') {
      const target = getTrackTarget(piece.position, steps, player);
      // 🟢 CORRECCIÓN: Validamos que target exista antes de comprobar bloqueos
      if (target && !isOwnBlockingTarget(player, target, piece)) {
        const capture = !isSafeSquare(target.position) && Boolean(hasOpponentOnTrack(target.position, player));
        moves.push({ type: 'bonus', piece, to: target, capture });
      }
    }

    if (piece.status === 'lane') {
      const target = getLaneTarget(piece, steps);
      // 🟢 CORRECCIÓN: Validamos que target exista (que no devuelva null por pasarse)
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

/**
 * Procesa la captura de una ficha enemiga, devolviéndola al nido del color correspondiente.
 */
function captureAtTarget(target, player) {
  if (isSafeSquare(target.position)) {
    return false;
  }
  const occupant = hasOpponentOnTrack(target.position, player);
  if (!occupant) {
    return false;
  }

  const capturedColor = occupant.player.color;
  const capturedId = occupant.piece.id;

  // 1. Actualizamos el estado lógico en memoria
  occupant.piece.status = 'home';
  occupant.piece.position = null;
  occupant.piece.lanePosition = 0;

  // 2. Buscamos el token en el DOM y le aplicamos la animación deslizante pura
  const pieceElements = document.querySelectorAll('.piece-token');
  pieceElements.forEach((el) => {
    if (el.dataset.pieceId == capturedId && el.classList.contains(capturedColor)) {
      const homeCoords = homePositions[capturedColor][capturedId - 1];
      if (homeCoords) {
        // Aseguramos que se sitúe por encima de las demás fichas durante el viaje
        el.style.zIndex = '9999';
        el.style.transition = 'left 5s ease-out, top 5s ease-out';
        
        // El uso de requestAnimationFrame obliga al navegador a procesar el deslizamiento visual de 5s
        requestAnimationFrame(() => {
          el.style.left = homeCoords.left;
          el.style.top = homeCoords.top;
        });
      }
    }
  });

  return true;
}

/**
 * Aplica el cambio lógico de estado y posición de una ficha en el juego.
 */
function applyMove(option) {
  const player = players[currentPlayerIndex];
  const piece = option.piece;
  const destination = option.to;

  piece.status = destination.status;
  piece.position = destination.status === 'track' ? destination.position : null;
  piece.lanePosition = destination.status === 'lane' || destination.status === 'finished' ? destination.lanePosition : 0;

  // 🟢 NUEVO: Si la ficha ha llegado a la casilla final de meta, activamos el bonus de +10
  if (destination.status === 'finished') {
    player.pendingFinishBonus = true;
    console.log(`🎉 ¡Ficha en meta! Se activa el bonus de +10 pasos para el jugador ${player.name}`);
  }
  
  const captured = destination.status === 'track' && option.capture && captureAtTarget(destination, player);

  if (captured) {
    player.pendingCaptureBonus = true;
    // Detenemos cualquier renderizado automático durante 5.2 segundos para no romper la transición CSS
    setTimeout(() => {
      renderAll();
    }, 5200);
  } else {
    renderAll();
  }
}

/**
 * Concluye el turno del jugador activo y avanza de forma cíclica al siguiente.
 */
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
  
  showDiceOverlay(); 
  renderDiceDialog(`Turno de ${next.name}`, [], true);
  
  rollDiceButton.disabled = false;
  statusPanel.textContent = '';
  renderAll();
}

/**
 * Gestiona los bonus extraordinarios tras un movimiento (captura = +20, meta = +10, repetir por 6).
 */
function handlePostMove() {
  const current = players[currentPlayerIndex];

  if (current.pendingCaptureBonus) {
    const bonusMoves = getBonusMoves(current, 20);
    if (bonusMoves.length > 0) {
      // 1. Mostramos el diálogo de forma persistente en el overlay con un botón para avanzar
      renderDiceDialog(
        '¡Has capturado una ficha! Cuentate 20.', 
        [
          { 
            label: 'Elegir Ficha +20', 
            onClick: () => {
              // 2. Al hacer clic, activamos las fichas parpadeantes en el tablero
              setPendingMoveOptions(
                bonusMoves, 
                (option) => {
                  current.pendingCaptureBonus = false;
                  applyMove(option);
                  setTimeout(() => {
                  handlePostMove();
                  }, 1000);
                }, 
                'Elige una ficha para avanzar 20 casillas:'
              );
              // Forzamos el cierre del overlay para ir al tablero
              setDiceOverlayVisibility(false);
            } 
          }
        ], 
        false
      );
      showDiceOverlay();
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
    // 1. Calculamos las opciones teóricas de mover 10 pasos con las fichas restantes
    const bonusMoves = getBonusMoves(current, 10);
    
    // 🟢 CORRECCIÓN: Filtramos usando getAvailableMoves pasándole el número 10, no el array.
    // Esto validará correctamente si el jugador tiene movimientos legales de 10 pasos sin pasarse.
    const validOptions = getAvailableMoves(current, 10).filter(move => move.type === 'move');

    if (validOptions.length > 0) {
      renderDiceDialog(
        '¡Has llegado a la meta! Cuentate 10.',
        [
          {
            label: 'Elegir Ficha +10',
            onClick: () => {
              setPendingMoveOptions(
                validOptions, // Usamos las opciones validadas que no devuelven null
                (option) => {
                  current.pendingFinishBonus = false;
                  applyMove(option);
                  setTimeout(() => {
                    handlePostMove();
                  }, 1000);
                },
                'Has llegado a la meta. Elige otra ficha y cuenta 10 casillas:'
              );
              setDiceOverlayVisibility(false);
            }
          }
        ],
        false
      );
      showDiceOverlay();
      return;
    }
    
    // 🟢 SI NO HAY MOVIMIENTOS VÁLIDOS (porque las fichas se pasan de largo de la meta o están bloqueadas):
    console.log(`⚠️ ${current.name} tiene un bonus de +10, pero ninguna ficha puede moverlo sin pasarse. Se pierde el bonus.`);
    current.pendingFinishBonus = false; // Limpiamos el bonus de forma segura para evitar bucles
    
    renderDiceDialog(`${current.name} ha llegado a la meta, pero no tiene ninguna ficha que pueda avanzar 10 casillas sin pasarse.`, [
      { 
        label: 'Continuar', 
        onClick: () => { 
          hideDiceOverlay(); 
          finishTurn(); // Pasa el turno al siguiente jugador de forma totalmente limpia
        } 
      }
    ], false);
    showDiceOverlay();
    return;
  }

  // Regla del Parchís: Si se saca un 6, el jugador repite tirada
  if (currentRoll === 6 && current.consecutiveSixes < 3) {
    rollDiceButton.disabled = false;
    renderDiceFace(currentRoll);
    renderDiceDialog(`Turno de ${current.name}. Puedes tirar otra vez con 6.`, [], true);
    return;
  }

  hideDiceOverlay();
  finishTurn();
}

/**
 * Ejecuta el movimiento seleccionado de la ficha en el tablero.
 */
function performMove(option) {
  if (currentScreen !== 'game') {
    return;
  }

  const current = players[currentPlayerIndex];

  // Si proviene de un bonus de captura previo (+20)
  if (current.pendingCaptureBonus) {
    clearPendingMoveSelection();
    hideDiceOverlay();
    
    const tokens = document.querySelectorAll('.piece-token');
    tokens.forEach(t => t.classList.remove('clickable'));

    setTimeout(() => {
      executeMoveSteps(option);
    }, 3000);
  } else {
    // EVALUAMOS SI ESTE MOVIMIENTO PROVOCARÁ UNA CAPTURA
    const willCapture = option.to && option.to.status === 'track' && option.capture;

    if (willCapture) {
      // 1. Limpiamos las fichas parpadeantes para que el usuario no pueda hacer clicks raros
      clearPendingMoveSelection();
      
      // 2. Bloqueamos la interfaz abriendo el overlay del dado con un mensaje limpio
      //renderDiceDialog('¡Captura! La ficha regresa a su casa...', [], false);
      //showDiceOverlay();

      // 3. Ejecutamos el movimiento que dispara el deslizamiento de 5 segundos
      applyMove(option);

      // 4. Pausamos el flujo del juego 5.5 segundos antes de dar el bonus de 20 casillas
      clearMoveDelayTimer();
      moveDelayTimer = setTimeout(() => {
        moveDelayTimer = null;
        handlePostMove();
      }, 5500);
    } else {
      // Movimiento normal libre de capturas
      clearPendingMoveSelection();
      hideDiceOverlay();
      executeMoveSteps(option);
    }
  }
}

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

/**
 * Devuelve la ficha seleccionada a casa cuando el jugador saca tres 6 consecutivos de forma instantánea.
 */
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

/**
 * Simula el rodaje del dado en un intervalo de tiempo rápido y aplica el resultado de la tirada.
 */
function rollDice() {
  if (currentScreen !== 'game' || rollDiceButton.disabled) {
    return;
  }

  // 🟢 SI ES EL PRIMER JUGADOR, INCREMENTAMOS EL CONTADOR
  if (currentPlayerIndex === 0) {
    contatiradas++;
    console.log(`🎲 [CONTADOR] El primer jugador inicia su tirada. Ronda/Tirada número: ${contatiradas}`);
  }

  rollDiceButton.disabled = true;
  renderDiceFace(null);

  
      // SOLUCIÓN: Dejamos el diálogo sin texto para que no muestre "Resultado:", pero mantenemos el dado visible
      renderDiceDialog('', [], false); 
      diceResult.classList.add('hidden'); // Ocultamos explícitamente el contenedor del texto

  const start = Date.now();
  
  diceTimer = setInterval(() => {
    const randomVisualFace = Math.floor(Math.random() * 6) + 1;
    renderDiceFace(randomVisualFace);
    
    if (Date.now() - start >= rollDuration) {
      clearInterval(diceTimer);
      diceTimer = null;
      
      let finalFace;
      
      if (debugDiceSequence && debugDiceSequence.length > 0) {
        finalFace = debugDiceSequence[debugDiceIndex];
        console.log(`[DEBUG] Leyendo índice [${debugDiceIndex}] de tiradas.txt: ${finalFace}`);
        debugDiceIndex = (debugDiceIndex + 1) % debugDiceSequence.length;
      } else {
        finalFace = Math.floor(Math.random() * 6) + 1;
        console.log(`[JUEGO] Dado aleatorio: ${finalFace}`);
      }

      finalFace = parseInt(finalFace, 10);
      if (isNaN(finalFace) || finalFace < 1 || finalFace > 6) {
        finalFace = 1;
        console.error("[ERROR] El número extraído no es del 1 al 6. Forzando a 1.");
      }
      
      currentRoll = finalFace;
      renderDiceFace(finalFace);

      // SOLUCIÓN: Dejamos el diálogo sin texto para que no muestre "Resultado:", pero mantenemos el dado visible
      renderDiceDialog('', [], false); 
      diceResult.classList.add('hidden'); // Ocultamos explícitamente el contenedor del texto

      clearResultDelayTimer();
      resultDelayTimer = setTimeout(() => {
        resultDelayTimer = null;
        processDiceResult(finalFace);
      }, 1000);
    }
  }, 180); // Valor en ms del tiempo que se muestra cada cara del dado en la animación.
}

/**
 * Gestiona la tirada final del dado y determina las penalizaciones, bloqueos u opciones disponibles de movimiento.
 * @param {number} face - El valor de la tirada del dado.
 */
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

 // Regla de los tres seises consecutivos: la ficha activa más avanzada vuelve a casa
  if (current.consecutiveSixes === 3) {
    // 1. Aseguramos que el dado pinte visualmente el tercer 6
    renderDiceFace(6);
    
    // 2. Pintamos tu mensaje original en el diálogo y forzamos a que el overlay sea visible
    renderDiceDialog('Demasiada suerte, has sacado tres 6s. Elige una ficha para devolverla a casa:', [], false);
    showDiceOverlay();

    // 3. Congelamos la pantalla 1 segundo antes de pasar al modo selección en el tablero
    setTimeout(() => {
      const options = getReturnHomeOptions(current);
      if (options.length > 0) {
        // Al llamarse aquí, ahora sí pasará limpiamente al tablero ocultando el dado
        setPendingMoveOptions(
          options.map((piece) => ({ type: 'return', piece, to: null })), 
          (option) => {
            chooseReturnHome(option.piece);
          }, 
          'Has sacado tres 6s. Elige una ficha para devolverla a casa:'
        );
      } else {
        // Copia de seguridad por si el jugador no tuviera fichas fuera de casa
        statusPanel.textContent = `${current.name} ha sacado tres 6s pero no hay fichas en el tablero para devolver. Fin del turno.`;
        hideDiceOverlay();
        finishTurn();
      }
    }, 3000); // 1000 milisegundos de espera
    
    return;
  }

  const moves = getAvailableMoves(current, face);
  if (moves.length === 0) {
    if (face === 6) {
      renderDiceDialog(`${current.name} no tiene movimientos posibles, pero puede tirar otra vez.`, [], true);
      rollDiceButton.disabled = false;
      return;
    }
    if (face === 5 && current.pieces.some((piece) => piece.status === 'home')) {
      renderDiceDialog(`${current.name} no puede sacar ficha de casa; la casilla inicial está bloqueada.`, [
        { label: 'Pasar Turno', onClick: () => { hideDiceOverlay(); finishTurn(); } }
      ], false);
      showDiceOverlay();
      return;
    }
    renderDiceDialog(`${current.name} no tiene movimientos posibles`, [
      { label: 'Pasar Turno', onClick: () => { hideDiceOverlay(); finishTurn(); } }
    ], false);
    showDiceOverlay();
    return;
  }

  setPendingMoveOptions(
    moves, 
    performMove, 
    `Turno de ${current.name}. Selecciona una de tus fichas parpadeantes en el tablero para moverla con el número ${face}:`
  );
}

/**
 * Carga el archivo de tiradas preestablecidas para testing (tiradas.txt).
 */
async function loadDebugTiradas() {
  try {
    const response = await fetch('tiradas.txt?v=' + Math.random());
    if (!response.ok) throw new Error(`Estado HTTP: ${response.status}`);
    
    const text = await response.text();
    console.log("📄 Contenido crudo leído de tiradas.txt:", text);

    debugDiceSequence = text.split(',')
                            .map(num => num.trim())
                            .filter(num => num !== "")
                            .map(num => parseInt(num, 10))
                            .filter(num => !isNaN(num) && num >= 1 && num <= 6);
    
    if (debugDiceSequence.length === 0) {
      console.warn("⚠️ El archivo tiradas.txt se leyó, pero no se encontraron números válidos del 1 al 6.");
    } else {
      console.log('🎲 SECUENCIA DEBUG CARGADA CON ÉXITO:', debugDiceSequence);
    }
  } catch (error) {
    console.warn('⚠️ No se ha encontrado el archivo tiradas.txt o no ha sido posible leerlo. Se utilizará el modo de dado aleatorio estándar.', error);
  }
}

// Carga inicial de datos de depuración
loadDebugTiradas();

// --- VINCULACIÓN DE EVENTOS EN LA INTERFAZ ---
continueButton.addEventListener('click', openSelectionScreen);
closeButton.addEventListener('click', closeApp);
backButton.addEventListener('click', returnToWelcomeScreen);
startButton.addEventListener('click', startGame);
rollDiceButton.addEventListener('click', rollDice);

setupInputHandlers();
showScreen('welcome');