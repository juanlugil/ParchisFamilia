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
    entranceIndex: 37,
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
    entranceIndex: 54,
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
    entranceIndex: 3,
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
    entranceIndex: 20,
    pieces: [],
    consecutiveSixes: 0,
    pendingCaptureBonus: false,
    pendingFinishBonus: false,
  },
];

let currentPlayerIndex = 0;
let diceTimer = null;
let currentRoll = null;
const rollDuration = 3000;

const statusPanel = document.getElementById('statusPanel');
const rollDiceButton = document.getElementById('rollDiceButton');
const diceFace = document.getElementById('diceFace');
const diceResult = document.getElementById('diceResult');
const boardPanel = document.getElementById('boardPanel');
const boardStage = document.getElementById('boardStage');
const actionPanel = document.getElementById('actionPanel');
const gameStatePanel = document.getElementById('gameStatePanel');
const startButton = document.getElementById('startButton');

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });
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
  { left: '0%', top: '55.56%' },
  { left: '5.56%', top: '55.56%' },
  { left: '11.11%', top: '55.56%' },
  { left: '16.67%', top: '55.56%' },
  { left: '22.22%', top: '55.56%' },
  { left: '27.78%', top: '55.56%' },
  { left: '33.33%', top: '55.56%' },
  { left: '38.89%', top: '55.56%' },
  { left: '44.44%', top: '61.11%' },
  { left: '44.44%', top: '66.67%' },
  { left: '44.44%', top: '72.22%' },
  { left: '44.44%', top: '77.78%' },
  { left: '44.44%', top: '83.33%' },
  { left: '44.44%', top: '88.89%' },
  { left: '44.44%', top: '94.44%' },
  { left: '44.44%', top: '100%' },
  { left: '50%', top: '100%' },
  { left: '55.56%', top: '100%' },
  { left: '55.56%', top: '94.44%' },
  { left: '55.56%', top: '88.89%' },
  { left: '55.56%', top: '83.33%' },
  { left: '55.56%', top: '77.78%' },
  { left: '55.56%', top: '72.22%' },
  { left: '55.56%', top: '66.67%' },
  { left: '55.56%', top: '61.11%' },
  { left: '61.11%', top: '55.56%' },
  { left: '66.67%', top: '55.56%' },
  { left: '72.22%', top: '55.56%' },
  { left: '77.78%', top: '55.56%' },
  { left: '83.33%', top: '55.56%' },
  { left: '88.89%', top: '55.56%' },
  { left: '94.44%', top: '55.56%' },
  { left: '100%', top: '55.56%' },
  { left: '100%', top: '50%' },
  { left: '100%', top: '44.44%' },
  { left: '94.44%', top: '44.44%' },
  { left: '88.89%', top: '44.44%' },
  { left: '83.33%', top: '44.44%' },
  { left: '77.78%', top: '44.44%' },
  { left: '72.22%', top: '44.44%' },
  { left: '66.67%', top: '44.44%' },
  { left: '61.11%', top: '44.44%' },
  { left: '55.56%', top: '38.89%' },
  { left: '55.56%', top: '33.33%' },
  { left: '55.56%', top: '27.78%' },
  { left: '55.56%', top: '22.22%' },
  { left: '55.56%', top: '16.67%' },
  { left: '55.56%', top: '11.11%' },
  { left: '55.56%', top: '5.56%' },
  { left: '55.56%', top: '0%' },
  { left: '50%', top: '0%' },
  { left: '44.44%', top: '0%' },
  { left: '44.44%', top: '5.56%' },
  { left: '44.44%', top: '11.11%' },
  { left: '44.44%', top: '16.67%' },
  { left: '44.44%', top: '22.22%' },
  { left: '44.44%', top: '27.78%' },
  { left: '44.44%', top: '33.33%' },
  { left: '44.44%', top: '38.89%' },
  { left: '38.89%', top: '44.44%' },
  { left: '33.33%', top: '44.44%' },
  { left: '27.78%', top: '44.44%' },
  { left: '22.22%', top: '44.44%' },
  { left: '16.67%', top: '44.44%' },
  { left: '11.11%', top: '44.44%' },
  { left: '5.56%', top: '44.44%' },
  { left: '0%', top: '44.44%' },
  { left: '0%', top: '50%' },
];

const homePositions = {
  red: [
    { left: '72%', top: '18%' },
    { left: '82%', top: '18%' },
    { left: '72%', top: '28%' },
    { left: '82%', top: '28%' },
  ],
  green: [
    { left: '18%', top: '18%' },
    { left: '28%', top: '18%' },
    { left: '18%', top: '28%' },
    { left: '28%', top: '28%' },
  ],
  yellow: [
    { left: '18%', top: '72%' },
    { left: '28%', top: '72%' },
    { left: '18%', top: '82%' },
    { left: '28%', top: '82%' },
  ],
  blue: [
    { left: '72%', top: '72%' },
    { left: '82%', top: '72%' },
    { left: '72%', top: '82%' },
    { left: '82%', top: '82%' },
  ],
};

const lanePositions = {
  red: [
    { left: '55.56%', top: '44.44%' },
    { left: '54.72%', top: '44.44%' },
    { left: '53.89%', top: '44.44%' },
    { left: '53.06%', top: '44.44%' },
    { left: '52.22%', top: '44.44%' },
    { left: '51.39%', top: '44.44%' },
    { left: '50.56%', top: '44.44%' },
    { left: '50%', top: '44.44%' },
  ],
  green: [
    { left: '44.44%', top: '22.22%' },
    { left: '44.44%', top: '26.31%' },
    { left: '44.44%', top: '30.39%' },
    { left: '44.44%', top: '34.47%' },
    { left: '44.44%', top: '38.56%' },
    { left: '44.44%', top: '42.64%' },
    { left: '44.44%', top: '46.72%' },
    { left: '44.44%', top: '50%' },
  ],
  yellow: [
    { left: '44.44%', top: '55.56%' },
    { left: '45.28%', top: '55.56%' },
    { left: '46.11%', top: '55.56%' },
    { left: '46.94%', top: '55.56%' },
    { left: '47.78%', top: '55.56%' },
    { left: '48.61%', top: '55.56%' },
    { left: '49.44%', top: '55.56%' },
    { left: '50%', top: '55.56%' },
  ],
  blue: [
    { left: '55.56%', top: '44.44%' },
    { left: '55.56%', top: '45.28%' },
    { left: '55.56%', top: '46.11%' },
    { left: '55.56%', top: '46.94%' },
    { left: '55.56%', top: '47.78%' },
    { left: '55.56%', top: '48.61%' },
    { left: '55.56%', top: '49.44%' },
    { left: '55.56%', top: '50%' },
  ],
};

const finishPositions = [
  { left: '46%', top: '46%' },
  { left: '54%', top: '46%' },
  { left: '46%', top: '54%' },
  { left: '54%', top: '54%' },
];

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
  return finishPositions[piece.id - 1];
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

  finishPositions.forEach((coords, index) => {
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
      left = 0;
      top = `${innerTop}%`;
      width = `${innerLeft}%`;
      height = `${100 - innerTop}%`;
    } else if (player.color === 'blue') {
      // inner at top-left -> container from innerLeft to right, top:innerTop to bottom
      left = `${innerLeft}%`;
      top = `${innerTop}%`;
      width = `${100 - innerLeft}%`;
      height = `${100 - innerTop}%`;
    } else if (player.color === 'red') {
      // inner at bottom-left -> container from innerLeft to right, top:0 to innerTop
      left = `${innerLeft}%`;
      top = `0%`;
      width = `${100 - innerLeft}%`;
      height = `${innerTop}%`;
    } else { // green
      // inner at top-left (green specified as top-left earlier) but expansion to top-left
      // inner at top-left -> container from left:0 top:0 to inner
      left = `0%`;
      top = `0%`;
      width = `${innerLeft}%`;
      height = `${innerTop}%`;
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
  players.forEach((player) => {
    player.pieces.forEach((piece) => {
      const coords = getPieceCoordinates(piece, player);
      const token = document.createElement('div');
      token.className = `piece-token ${player.color}`;
      token.style.left = coords.left;
      token.style.top = coords.top;
      token.style.backgroundColor = player.image ? 'transparent' : player.color;

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

function startGame() {

  buildPlayers();
  currentPlayerIndex = Math.floor(Math.random() * players.length);
  const current = players[currentPlayerIndex];

  boardPanel.classList.remove('hidden');
  statusPanel.classList.remove('hidden');
  statusPanel.textContent = `Empieza ${current.name}. ¡Presiona "Lanzar dado" para jugar!`;
  rollDiceButton.classList.remove('hidden');
  diceResult.classList.add('hidden');
  actionPanel.classList.add('hidden');
  renderAll();
  rollDiceButton.disabled = false;
}

function renderGameState() {
  gameStatePanel.innerHTML = '';

  players.forEach((player) => {
    const container = document.createElement('div');
    container.className = 'player-status';

    const title = document.createElement('h3');
    title.className = `player-status-title ${player.color}`;
    title.textContent = `${player.name}`;
    container.appendChild(title);

    const list = document.createElement('ul');
    list.className = 'player-status-list';

    player.pieces.forEach((piece) => {
      const item = document.createElement('li');
      let label = `Ficha ${piece.id}: `;
      if (piece.status === 'home') {
        label += 'Casa';
      } else if (piece.status === 'track') {
        label += `Casilla ${piece.position + 1}`;
      } else if (piece.status === 'lane') {
        label += `Carril final ${piece.lanePosition}`;
      } else {
        label += 'Finalizada';
      }
      item.textContent = label;
      list.appendChild(item);
    });

    container.appendChild(list);
    gameStatePanel.appendChild(container);
  });
}

function renderAll() {
  renderBoardMarkers();
  renderHomeAreas();
  renderBoardPieces();
  renderGameState();
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
  const distanceToEntrance = position <= player.entranceIndex
    ? player.entranceIndex - position
    : trackLength - position + player.entranceIndex;

  if (dice === distanceToEntrance + 1) {
    return { status: 'lane', lanePosition: 1 };
  }

  if (dice > distanceToEntrance + 1) {
    return null;
  }

  return { status: 'track', position: (position + dice) % trackLength };
}

function getLaneTarget(piece, dice) {
  const targetLane = piece.lanePosition + dice;
  if (targetLane > homeLaneLength) {
    return null;
  }
  return {
    status: 'lane',
    lanePosition: targetLane,
  };
}

function isOwnBlockingTarget(player, target, piece) {
  if (target.status === 'track') {
    if (isSafeSquare(target.position)) {
      return false;
    }
    return hasOwnPieceOnTrack(target.position, player);
  }

  if (target.status === 'lane' || target.status === 'finished') {
    return player.pieces.some((otherPiece) =>
      otherPiece !== piece && otherPiece.status === target.status && otherPiece.lanePosition === target.lanePosition
    );
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
        const capture = !isSafeSquare(target.position) && Boolean(hasOpponentOnTrack(target.position, player));
        moves.push({ type: 'exit', piece, to: target, capture });
      }
    });
    return moves;
  }

  player.pieces.forEach((piece) => {
    if (piece.status === 'track') {
      const target = getTrackTarget(piece.position, dice, player);
      if (target && !isOwnBlockingTarget(player, target, piece)) {
        const capture = !isSafeSquare(target.position) && Boolean(hasOpponentOnTrack(target.position, player));
        moves.push({ type: 'move', piece, to: target, capture });
      }
    }

    if (piece.status === 'lane') {
      const target = getLaneTarget(piece, dice);
      if (target && !isOwnBlockingTarget(player, target, piece)) {
        moves.push({ type: 'move', piece, to: target, capture: false });
      }
    }
  });

  return moves;
}

function getReturnHomeOptions(player) {
  return player.pieces.filter((piece) => piece.status === 'track' || piece.status === 'lane');
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

function renderActionPanel(options, message, callback) {
  actionPanel.classList.remove('hidden');
  actionPanel.innerHTML = `<p>${message}</p><div class="action-button-group"></div>`;
  const group = actionPanel.querySelector('.action-button-group');

  options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action-button';
    button.textContent = formatActionLabel(option);
    button.addEventListener('click', () => {
      callback(option);
      actionPanel.classList.add('hidden');
    });
    group.appendChild(button);
  });
}

function clearActionPanel() {
  actionPanel.classList.add('hidden');
  actionPanel.innerHTML = '';
}

function captureAtTarget(target, player) {
  if (isSafeSquare(target.position)) {
    return false;
  }
  const occupant = hasOpponentOnTrack(target.position, player);
  if (!occupant) {
    return false;
  }

  occupant.piece.status = 'home';
  occupant.piece.position = null;
  occupant.piece.lanePosition = 0;
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

  renderAll();
}

function finishTurn() {
  const current = players[currentPlayerIndex];
  current.consecutiveSixes = 0;
  current.pendingCaptureBonus = false;
  current.pendingFinishBonus = false;
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  const next = players[currentPlayerIndex];
  statusPanel.textContent = `Turno de ${next.name}. Pulsa "Lanzar dado" para tirar.`;
  rollDiceButton.disabled = false;
  currentRoll = null;
  clearActionPanel();
  renderAll();
}

function handlePostMove() {
  const current = players[currentPlayerIndex];

  if (current.pendingCaptureBonus) {
    const bonusMoves = getBonusMoves(current, 20);
    if (bonusMoves.length > 0) {
      renderActionPanel(bonusMoves, 'Has capturado una ficha. Elige otra ficha para avanzar 20 casillas:', (option) => {
        current.pendingCaptureBonus = false;
        applyMove(option);
        handlePostMove();
      });
      return;
    }
    current.pendingCaptureBonus = false;
  }

  if (current.pendingFinishBonus) {
    const bonusMoves = getBonusMoves(current, 10);
    if (bonusMoves.length > 0) {
      renderActionPanel(bonusMoves, 'Has llegado a la meta. Elige otra ficha para avanzar 10 casillas:', (option) => {
        current.pendingFinishBonus = false;
        applyMove(option);
        handlePostMove();
      });
      return;
    }
    current.pendingFinishBonus = false;
  }

  if (currentRoll === 6 && current.consecutiveSixes < 3) {
    statusPanel.textContent = `${current.name} sacó un 6 y puede tirar otra vez.`;
    rollDiceButton.disabled = false;
    return;
  }

  finishTurn();
}

function performMove(option) {
  clearActionPanel();
  applyMove(option);
  renderAll();
  handlePostMove();
}

function chooseReturnHome(piece) {
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
  rollDiceButton.disabled = true;
  clearActionPanel();
  diceResult.classList.remove('hidden');
  diceResult.textContent = 'Lanzando...';
  renderDiceFace(null);

  const start = Date.now();
  diceTimer = setInterval(() => {
    const face = Math.floor(Math.random() * 6) + 1;
    renderDiceFace(face);
    diceResult.textContent = `Resultado: ${face}`;
    if (Date.now() - start >= rollDuration) {
      clearInterval(diceTimer);
      diceTimer = null;
      currentRoll = face;
      diceResult.textContent = `Resultado final: ${face}`;
      processDiceResult(face);
    }
  }, 120);
}

function processDiceResult(face) {
  const current = players[currentPlayerIndex];
  if (face === 6) {
    current.consecutiveSixes += 1;
  } else {
    current.consecutiveSixes = 0;
  }

  if (current.consecutiveSixes === 3) {
    const options = getReturnHomeOptions(current);
    if (options.length > 0) {
      renderActionPanel(options.map((piece) => ({ type: 'return', piece, to: null })), 'Has sacado tres 6s. Elige una ficha para devolverla a casa:', (option) => {
        chooseReturnHome(option.piece);
      });
      return;
    }
    statusPanel.textContent = `${current.name} ha sacado tres 6s pero no hay fichas para devolver. Fin del turno.`;
    finishTurn();
    return;
  }

  const moves = getAvailableMoves(current, face);
  if (moves.length === 0) {
    if (face === 6) {
      statusPanel.textContent = `${current.name} no tiene movimientos con 6, pero puede tirar otra vez.`;
      rollDiceButton.disabled = false;
      return;
    }
    if (face === 5 && current.pieces.some((piece) => piece.status === 'home')) {
      statusPanel.textContent = `${current.name} no puede sacar ficha de casa; la casilla inicial está bloqueada. Fin del turno.`;
      finishTurn();
      return;
    }
    statusPanel.textContent = `${current.name} no tiene movimientos posibles. Fin del turno.`;
    finishTurn();
    return;
  }

  if (moves.length === 1) {
    performMove(moves[0]);
    return;
  }

  renderActionPanel(moves, `Turno de ${current.name}. Elige una ficha para mover con ${face}:`, performMove);
}

startButton.addEventListener('click', startGame);
rollDiceButton.addEventListener('click', rollDice);
setupInputHandlers();
