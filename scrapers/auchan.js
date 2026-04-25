const path = require('path');
const DATA_DIR = '/app/data';

async function scrape(page, query) {
  // Set OneTrust consent cookie so banner never appears and Vue SPA loads search results
  await page.context().addCookies([
    { name: 'OptanonAlertBoxClosed', value: new Date().toISOString(), domain: '.auchan.pl', path: '/' },
    { name: 'OptanonConsent', value: 'isGpcEnabled=0&interactionCount=1&isAnonUser=1&groups=C0001%3A1%2CC0002%3A1%2CC0003%3A1%2CC0004%3A1', domain: '.auchan.pl', path: '/' },
  ]);

  const url = `https://www.auchan.pl/szukaj?q=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'load', timeout: 45000 });

  try {
    await page.waitForSelector('[class*="product-tile"], [class*="product-card"], [class*="ProductTile"]', { timeout: 15000 });
  } catch {
    await page.screenshot({ path: path.join(DATA_DIR, 'debug-auchan.png'), fullPage: true }).catch(() => {});
    const fs = require('fs'); fs.writeFileSync(path.join(DATA_DIR, 'debug-auchan.html'), await page.content().catch(() => ''));
    return null;
  }

  return page.evaluate(() => {
    const tile = document.querySelector('[class*="product-tile"], [class*="product-card"], [class*="ProductTile"]');
    if (!tile) return null;
    const nameEl = tile.querySelector('[class*="name"], [class*="title"], h3, h2');
    const priceEl = tile.querySelector('[class*="price"]:not([class*="old"]):not([class*="before"]):not([class*="regular"])');
    const name = nameEl?.innerText?.trim() ?? null;
    const rawPrice = priceEl?.innerText?.trim() ?? null;
    if (!rawPrice) return null;
    const price = parseFloat(rawPrice.replace(/[^\d,]/g, '').replace(',', '.'));
    return { name, price: isNaN(price) ? null : price };
  });
}

module.exports = { scrape };
