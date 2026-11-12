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
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const serverUrl = 'http://localhost:4000';
  console.log('1. Connecting Host socket to', serverUrl);
  const hostSocket = Client(serverUrl);
  await new Promise((resolve) => hostSocket.on('connect', resolve));

  const createRes = await emitAck(hostSocket, 'room:create', {
    hostName: 'Lucas (Você)',
    hostAvatar: 'flame',
  });
  const roomCode = createRes.room.code;
  const hostPlayer = createRes.player;
  console.log('Room created:', roomCode);

  // Player 2
  const p2Socket = Client(serverUrl);
  await new Promise((resolve) => p2Socket.on('connect', resolve));
  const p2Res = await emitAck(p2Socket, 'room:join', {
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

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,820'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 2 });

  // Set Host Session in browser
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

  // 1. Capture Full Lobby with 3 players
  console.log('2. Visiting Lobby...');
  await page.goto(`http://localhost:3000/lobby/${roomCode}`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(outputDir, 'step2-lobby.png') });
  console.log('Lobby captured!');

  // 2. Start Game
  console.log('3. Starting Game...');
  await emitAck(hostSocket, 'room:start', {
    roomCode,
    sessionId: hostPlayer.sessionId,
    maxScore: 30, // short so we can also finish!
    difficulty: 'all',
    timePerRound: 25,
    intervalTime: 5,
    includeAudio: false,
    includeSurprise: true,
  });

  // 3. Visit Game Page
  console.log('4. Visiting Game...');
  await page.goto(`http://localhost:3000/game/${roomCode}`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 7000)); // wait for countdown 5s + round start
  await page.screenshot({ path: path.join(outputDir, 'step3-game.png') });
  console.log('Game round captured!');

  // 4. Host answers correctly
  console.log('5. Host answers correctly...');
  await page.type('input[placeholder*="Sua resposta"]', 'Resposta');
  await page.screenshot({ path: path.join(outputDir, 'step4-answering.png') });

  // Clean up
  hostSocket.disconnect();
  p2Socket.disconnect();
  p3Socket.disconnect();
  await browser.close();
  console.log('All captures complete!');
}

run().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});

