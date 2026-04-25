const path = require('path');
const DATA_DIR = '/app/data';

async function scrape(page, query) {
  const url = `https://www.auchan.pl/szukaj?q=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

  // Accept OneTrust via SDK API (most reliable) or DOM click fallback
  try {
    await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 6000 });
    await page.evaluate(() => {
      if (window.OneTrust?.AllowAll) { window.OneTrust.AllowAll(); return; }
      if (window.Optanon?.AllowAll) { window.Optanon.AllowAll(); return; }
      document.getElementById('onetrust-accept-btn-handler')?.click();
    });
    // Auchan is Vue SPA — needs time after consent to render products
    await page.waitForTimeout(6000);
  } catch {}

  try {
    await page.waitForSelector('[class*="product-tile"], [class*="product-card"], [class*="ProductTile"]', { timeout: 12000 });
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
