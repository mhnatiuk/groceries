// auchan.pl — search via /szukaj?q=
const path = require('path');
const DATA_DIR = '/app/data';

async function scrape(page, query) {
  const url = `https://www.auchan.pl/szukaj?q=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

  // Accept cookies
  try {
    await page.click('button:has-text("Akceptuję"), button:has-text("Zaakceptuj wszystkie"), [id*="accept"]', { timeout: 3000 });
  } catch {}

  try {
    await page.waitForSelector('[class*="product-tile"], [class*="ProductTile"], [class*="product-item"]', { timeout: 10000 });
  } catch {
    await page.screenshot({ path: path.join(DATA_DIR, 'debug-auchan.png'), fullPage: true }).catch(() => {});
    const fs = require('fs'); fs.writeFileSync(path.join(DATA_DIR, 'debug-auchan.html'), await page.content().catch(() => ''));
    return null;
  }

  const result = await page.evaluate(() => {
    const tile = document.querySelector('[class*="product-tile"], [class*="ProductTile"], [class*="product-item"]');
    if (!tile) return null;

    const nameEl = tile.querySelector('[class*="name"], [class*="title"], h3, h2');
    const priceEl = tile.querySelector('[class*="price"]:not([class*="old"]):not([class*="before"]):not([class*="regular"])');

    const name = nameEl?.innerText?.trim() ?? null;
    const rawPrice = priceEl?.innerText?.trim() ?? null;
    if (!rawPrice) return null;

    const price = parseFloat(rawPrice.replace(/[^\d,]/g, '').replace(',', '.'));
    return { name, price: isNaN(price) ? null : price };
  });

  return result;
}

module.exports = { scrape };
