const homeScreen = document.getElementById('home-screen');
const gameScreen = document.getElementById('game-screen');
const modeButtons = document.querySelectorAll('.mode-button');
const backButton = document.getElementById('back-button');
const gameTitle = document.getElementById('game-title');
const roundIndicator = document.getElementById('round-indicator');
const logContainer = document.getElementById('game-log');

const playerTop = document.getElementById('player-top');
const playerBottom = document.getElementById('player-bottom');
const playerTopName = document.getElementById('player-top-name');
const playerBottomName = document.getElementById('player-bottom-name');
const playerTopCard = document.getElementById('player-top-card');
const playerBottomCard = document.getElementById('player-bottom-card');
const playerTopButton = document.getElementById('player-top-button');
const playerBottomButton = document.getElementById('player-bottom-button');
const playerTopScore = document.getElementById('player-top-score');
const playerBottomScore = document.getElementById('player-bottom-score');
const pileTop = document.getElementById('pile-top');
const pileBottom = document.getElementById('pile-bottom');

const suits = ['♠', '♥', '♦', '♣'];
const valueNames = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K'
};

const modeLabels = {
  cvc: 'Computer vs Computer',
  hvc: 'Human vs Computer',
  hvh: 'Human vs Human'
};

const gameState = {
  mode: null,
  round: 1,
  players: [],
  intervalId: null,
  awaitingComputer: false,
  finished: false
};

modeButtons.forEach((button) => {
  button.addEventListener('click', () => startGame(button.dataset.mode));
});

backButton.addEventListener('click', resetGame);

playerTopButton.addEventListener('click', () => handleHumanAction(0));
playerBottomButton.addEventListener('click', () => handleHumanAction(1));

function resetGame() {
  clearInterval(gameState.intervalId);
  gameState.intervalId = null;
  gameState.players = [];
  gameState.round = 1;
  gameState.mode = null;
  gameState.finished = false;
  logContainer.innerHTML = '';
  playerTopCard.innerHTML = '';
  playerBottomCard.innerHTML = '';
  pileTop.textContent = '';
  pileBottom.textContent = '';
  playerTopButton.disabled = false;
  playerBottomButton.disabled = false;
  playerTop.classList.remove('rotated');
  playerTopButton.textContent = 'Play Card';
  playerBottomButton.textContent = 'Play Card';

  gameScreen.classList.add('hidden');
  homeScreen.classList.remove('hidden');
}

function startGame(mode) {
  resetGameView();
  gameState.mode = mode;
  gameState.round = 1;
  gameState.finished = false;
  setupPlayers(mode);
  updateScoreboard();
  updateRoundIndicator();
  logMessage(`Starting ${modeLabels[mode]} game.`);
  if (mode === 'cvc') {
    beginComputerShowdown();
  } else if (mode === 'hvc') {
    prepareHumanVsComputer();
  }
}

function resetGameView() {
  homeScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  gameTitle.textContent = '';
  logContainer.innerHTML = '';
  playerTopCard.innerHTML = '';
  playerBottomCard.innerHTML = '';
  pileTop.textContent = '';
  pileBottom.textContent = '';
}

function setupPlayers(mode) {
  const [deckOne, deckTwo] = dealDecks();
  let players;

  if (mode === 'cvc') {
    players = [
      createPlayer('Computer North', 'computer', deckOne),
      createPlayer('Computer South', 'computer', deckTwo)
    ];
  } else if (mode === 'hvc') {
    players = [
      createPlayer('Computer North', 'computer', deckOne),
      createPlayer('You', 'human', deckTwo)
    ];
  } else {
    players = [
      createPlayer('Player North', 'human', deckOne),
      createPlayer('Player South', 'human', deckTwo)
    ];
    playerTop.classList.add('rotated');
  }

  gameState.players = players;
  playerTopName.textContent = players[0].name;
  playerBottomName.textContent = players[1].name;
  gameTitle.textContent = modeLabels[mode];

  configureButtonsForMode(mode, players);
}

function configureButtonsForMode(mode, players) {
  if (mode === 'cvc') {
    playerTopButton.disabled = true;
    playerTopButton.textContent = 'Automatic';
    playerBottomButton.disabled = true;
    playerBottomButton.textContent = 'Automatic';
  } else if (mode === 'hvc') {
    playerTopButton.disabled = true;
    playerTopButton.textContent = 'Automatic';
    playerBottomButton.disabled = false;
    playerBottomButton.textContent = 'Play Card';
  } else {
    playerTopButton.disabled = false;
    playerTopButton.textContent = 'Play Card';
    playerBottomButton.disabled = false;
    playerBottomButton.textContent = 'Play Card';
  }

  players.forEach((player) => {
    player.currentCard = null;
  });
}

function createPlayer(name, type, deck) {
  return {
    name,
    type,
    deck,
    score: 0,
    currentCard: null
  };
}

function dealDecks() {
  const deck = createDeck();
  const midpoint = Math.floor(deck.length / 2);
  return [deck.slice(0, midpoint), deck.slice(midpoint)];
}

function createDeck() {
  const deck = [];
  for (let value = 1; value <= 13; value += 1) {
    for (const suit of suits) {
      deck.push({ value, suit });
    }
  }
  return shuffle(deck);
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function beginComputerShowdown() {
  logMessage('Both computers are playing automatically. Watch the showdown!');
  gameState.intervalId = setInterval(() => {
    if (gameState.finished) {
      clearInterval(gameState.intervalId);
      return;
    }
    playAutomatedRound();
  }, 1600);
}

function prepareHumanVsComputer() {
  logMessage('Tap the Play Card button to reveal your card. The computer will respond automatically.');
}

function handleHumanAction(index) {
  const player = gameState.players[index];
  if (gameState.finished || player.type !== 'human') {
    return;
  }

  if (player.currentCard) {
    return; // already drew this round
  }

  const card = drawCard(player);
  if (!card) {
    concludeGame();
    return;
  }

  revealCardForPlayer(index, card);
  logMessage(`${player.name} reveals ${cardLabel(card)}.`);

  if (gameState.mode === 'hvc') {
    handleComputerResponse(index === 0 ? 1 : 0);
  } else if (gameState.mode === 'hvh') {
    const allReady = gameState.players.every((p) => p.currentCard);
    if (allReady) {
      resolveRound();
    }
  }
}

function handleComputerResponse(index) {
  const player = gameState.players[index];
  if (player.type !== 'computer' || player.currentCard) {
    return;
  }

  const card = drawCard(player);
  if (!card) {
    concludeGame();
    return;
  }

  revealCardForPlayer(index, card);
  logMessage(`${player.name} responds with ${cardLabel(card)}.`);
  resolveRound();
}

function playAutomatedRound() {
  if (gameState.players.some((player) => player.deck.length === 0)) {
    concludeGame();
    return;
  }

  gameState.players.forEach((player, index) => {
    const card = drawCard(player);
    revealCardForPlayer(index, card);
    logMessage(`${player.name} plays ${cardLabel(card)}.`);
  });

  resolveRound();
}

function drawCard(player) {
  if (!player.deck.length) {
    return null;
  }
  const card = player.deck.shift();
  player.currentCard = card;
  return card;
}

function revealCardForPlayer(index, card) {
  const target = index === 0 ? playerTopCard : playerBottomCard;
  target.innerHTML = '';
  if (card) {
    target.appendChild(createCardElement(card));
  }
}

function createCardElement(card) {
  const cardElement = document.createElement('div');
  cardElement.className = 'card';

  const valueSpan = document.createElement('span');
  valueSpan.className = 'value';
  valueSpan.textContent = valueNames[card.value] || card.value;

  const suitSpan = document.createElement('span');
  suitSpan.className = 'suit';
  suitSpan.textContent = card.suit;

  cardElement.appendChild(valueSpan);
  cardElement.appendChild(suitSpan);
  return cardElement;
}

function resolveRound() {
  const [topPlayer, bottomPlayer] = gameState.players;
  if (!topPlayer.currentCard || !bottomPlayer.currentCard) {
    return;
  }

  const topValue = cardStrength(topPlayer.currentCard);
  const bottomValue = cardStrength(bottomPlayer.currentCard);

  pileTop.textContent = `${topPlayer.name}: ${cardLabel(topPlayer.currentCard)}`;
  pileBottom.textContent = `${bottomPlayer.name}: ${cardLabel(bottomPlayer.currentCard)}`;

  if (topValue > bottomValue) {
    topPlayer.score += 1;
    logMessage(`${topPlayer.name} wins the round!`);
  } else if (bottomValue > topValue) {
    bottomPlayer.score += 1;
    logMessage(`${bottomPlayer.name} wins the round!`);
  } else {
    logMessage(`It's a tie. No points awarded.`);
  }

  topPlayer.currentCard = null;
  bottomPlayer.currentCard = null;
  updateScoreboard();
  advanceRound();
}

function cardStrength(card) {
  return card.value === 1 ? 14 : card.value;
}

function cardLabel(card) {
  const valueText = valueNames[card.value] || card.value;
  return `${valueText}${card.suit}`;
}

function updateScoreboard() {
  const [topPlayer, bottomPlayer] = gameState.players;
  playerTopScore.textContent = `${topPlayer.name}: ${topPlayer.score}`;
  playerBottomScore.textContent = `${bottomPlayer.name}: ${bottomPlayer.score}`;
}

function updateRoundIndicator() {
  roundIndicator.textContent = `Round ${gameState.round}`;
}

function advanceRound() {
  gameState.round += 1;
  updateRoundIndicator();
  if (gameState.players.some((player) => player.deck.length === 0)) {
    concludeGame();
  }
}

function concludeGame() {
  if (gameState.finished) {
    return;
  }
  gameState.finished = true;
  clearInterval(gameState.intervalId);
  gameState.intervalId = null;
  playerTopButton.disabled = true;
  playerBottomButton.disabled = true;

  const [topPlayer, bottomPlayer] = gameState.players;
  const logParts = [`Final Score → ${topPlayer.name}: ${topPlayer.score}`, `${bottomPlayer.name}: ${bottomPlayer.score}`];
  logMessage(logParts.join(' | '));

  if (topPlayer.score > bottomPlayer.score) {
    logMessage(`${topPlayer.name} wins the game!`);
  } else if (bottomPlayer.score > topPlayer.score) {
    logMessage(`${bottomPlayer.name} wins the game!`);
  } else {
    logMessage(`The game ends in a draw.`);
  }
}

function logMessage(message) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  entry.textContent = `[${timestamp}] ${message}`;
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
}
