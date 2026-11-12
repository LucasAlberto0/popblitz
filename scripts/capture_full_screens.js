const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function capture() {
  const outputDir = path.resolve(__dirname, '../public/images/tutorial');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,800'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });

  // 1. Capture Game Screen
  console.log('Capturing Game Screen with Mock Data...');
  await page.evaluateOnNewDocument(() => {
    sessionStorage.setItem('player', JSON.stringify({
      id: 'p1',
      name: 'Lucas (Você)',
      avatar: 'flame',
      roomCode: 'BLITZ9',
      sessionId: 's1',
      isHost: true,
    }));

    // Intercept Socket.io
    const origIO = window.io;
    window.__mockSnapshot = {
      serverNow: Date.now(),
      room: {
        id: 'r1',
        code: 'BLITZ9',
        status: 'playing',
        host_id: 'p1',
        max_score: 100,
        time_per_round: 20,
      },
      players: [
        { id: 'p1', name: 'Lucas', avatar: 'flame', score: 48, streak: 3, socket_id: 's1', status: 'playing' },
        { id: 'p2', name: 'Mariana', avatar: 'star', score: 38, streak: 1, socket_id: 's2', status: 'playing' },
        { id: 'p3', name: 'Gabriel', avatar: 'game', score: 26, streak: 0, socket_id: 's3', status: 'playing' },
      ],
      currentRound: {
        id: 'round-1',
        round_number: 4,
        type: 'text',
        question: 'Qual o nome do bruxo com uma cicatriz em forma de raio na testa?',
        answer: 'Harry Potter',
        status: 'active',
        started_at: new Date().toISOString(),
      },
      answers: [],
      chatHistory: [],
    };
  });

  await page.goto('http://localhost:3000/game/BLITZ9', { waitUntil: 'domcontentloaded' });

  // Feed the mock snapshot into the page socket
  await page.evaluate(() => {
    const socket = window.__socketInstance || (window as any)?.getGameSocket?.();
    // In case socket is attached or we dispatch socket event
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('mock:sync', { detail: (window as any).__mockSnapshot }));
    }, 500);
  }).catch(() => { });

  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(outputDir, 'step3-game.png') });

  // 2. Capture Results Screen
  console.log('Capturing Results Screen...');
  await page.goto('http://localhost:3000/results/BLITZ9', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(outputDir, 'step5-results.png') });

  await browser.close();
  console.log('Capture finished!');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});

