const path = require('path');
const DATA_DIR = '/app/data';

async function scrape(page, query) {
  // Set OneTrust consent cookie so banner never appears
  await page.context().addCookies([
    { name: 'OptanonAlertBoxClosed', value: new Date().toISOString(), domain: '.frisco.pl', path: '/' },
    { name: 'OptanonConsent', value: 'isGpcEnabled=0&interactionCount=1&isAnonUser=1&groups=C0001%3A1%2CC0002%3A1%2CC0003%3A1%2CC0004%3A1', domain: '.frisco.pl', path: '/' },
  ]);

  const url = `https://www.frisco.pl/shop/query,${encodeURIComponent(query)}`;
  // 'load' waits for all JS to execute — needed for React to inject product tiles
  await page.goto(url, { waitUntil: 'load', timeout: 45000 });

  try {
    await page.waitForSelector('.mini-product-box', { timeout: 15000 });
  } catch {
    await page.screenshot({ path: path.join(DATA_DIR, 'debug-frisco.png'), fullPage: true }).catch(() => {});
    const fs = require('fs'); fs.writeFileSync(path.join(DATA_DIR, 'debug-frisco.html'), await page.content().catch(() => ''));
    return null;
  }

  return page.evaluate(() => {
    const box = document.querySelector('.mini-product-box');
    if (!box) return null;
    const nameEl = box.querySelector('.f-hpc__product-name');
    const priceEl = box.querySelector('.f-hpc__price-amount--plain');
    const name = nameEl?.innerText?.trim() ?? null;
    const rawPrice = priceEl?.innerText?.trim() ?? null;
    if (!rawPrice) return null;
    const price = parseFloat(rawPrice.replace(',', '.'));
    return { name, price: isNaN(price) ? null : price };
  });
}

module.exports = { scrape };
