const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { io: Client } = require('socket.io-client');

function emitAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout on ${event}`)), 10000);
    socket.emit(event, payload, (res) => {
      clearTimeout(t);
      resolve(res);
    });
  });
}

async function run() {
  const outputDir = path.resolve(__dirname, '../public/images/tutorial');
  const serverUrl = 'http://localhost:4000';

  const hostSocket = Client(serverUrl);
  await new Promise((resolve) => hostSocket.on('connect', resolve));

  const createRes = await emitAck(hostSocket, 'room:create', {
    hostName: 'Lucas (Campeão)',
    hostAvatar: 'flame',
  });
  const roomCode = createRes.room.code;
  const hostPlayer = createRes.player;

  // Player 2
  const p2Socket = Client(serverUrl);
  await new Promise((resolve) => p2Socket.on('connect', resolve));
  await emitAck(p2Socket, 'room:join', {
    roomCode,
    playerName: 'Mariana',
    playerAvatar: 'star',
  });

  // Player 3
  const p3Socket = Client(serverUrl);
  await new Promise((resolve) => p3Socket.on('connect', resolve));
  await emitAck(p3Socket, 'room:join', {
    roomCode,
    playerName: 'Gabriel',
    playerAvatar: 'game',
  });

  // Start with target 10 points
  await emitAck(hostSocket, 'room:start', {
    roomCode,
    sessionId: hostPlayer.sessionId,
    maxScore: 10,
    difficulty: 'all',
    timePerRound: 20,
    intervalTime: 5,
  });

  // Wait for round to become active
  let activeRound = null;
  hostSocket.on('round:active', (round) => {
    activeRound = round;
  });

  // Wait a few seconds for first round to start
  await new Promise((resolve) => {
    const check = setInterval(() => {
      if (activeRound) {
        clearInterval(check);
        resolve();
      }
    }, 500);
  });

  console.log('Active round:', activeRound.round_number, 'answer:', activeRound.answer);
  // Submit correct answer to win
  await emitAck(hostSocket, 'round:submit', {
    roomCode,
    roundId: activeRound.id,
    playerId: hostPlayer.id,
    playerSessionId: hostPlayer.sessionId,
    answer: activeRound.answer,
    timeMs: 2000,
  });

  console.log('Answer submitted, waiting for game to finish...');
  await new Promise(r => setTimeout(r, 6000)); // wait for round finish and game finish

  // Launch Puppeteer to capture results
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,820'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 2 });

  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.evaluate((hp, rc) => {
    sessionStorage.setItem('player', JSON.stringify({
      id: hp.id,
      name: hp.name,
      avatar: hp.avatar,
      roomCode: rc,
      sessionId: hp.sessionId,
      isHost: true,
    }));
  }, hostPlayer, roomCode);

  console.log('Visiting Results page:', `http://localhost:3000/results/${roomCode}`);
  await page.goto(`http://localhost:3000/results/${roomCode}`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500)); // wait for podium animations + confetti

  await page.screenshot({ path: path.join(outputDir, 'step5-results.png') });
  console.log('Results page captured successfully!');

  hostSocket.disconnect();
  p2Socket.disconnect();
  p3Socket.disconnect();
  await browser.close();
}

run().catch(err => {
  console.error('Error during podium capture:', err);
  process.exit(1);
});

