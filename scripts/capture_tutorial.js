const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function capture() {
  const outputDir = path.resolve(__dirname, '../public/images/tutorial');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1200,800'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });

  console.log('1. Capturing Setup (Creating room)...');
  await page.goto('http://localhost:3000/setup?mode=create', { waitUntil: 'networkidle2' });
  await page.type('input[placeholder*="Digite seu nome"]', 'Lucas Blitz');
  await page.screenshot({ path: path.join(outputDir, 'step1-create.png') });

  console.log('2. Clicking Criar Sala...');
  const createButton = await page.$('button.btn-neon');
  if (createButton) {
    await createButton.click();
    console.log('Waiting for Lobby...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2500));
    console.log('3. In Lobby, capturing...');
    await page.screenshot({ path: path.join(outputDir, 'step2-lobby.png') });
  }

  await browser.close();
  console.log('Done captures!');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
