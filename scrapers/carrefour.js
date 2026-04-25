const path = require('path');
const DATA_DIR = '/app/data';

async function scrape(page, query) {
  const url = `https://www.carrefour.pl/szukaj?query=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

  // Accept OneTrust cookie consent
  try {
    await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 6000 });
    await page.click('#onetrust-accept-btn-handler');
    // Wait for products to re-render after consent
    await page.waitForTimeout(3000);
  } catch {}

  // Carrefour uses Next.js — try to extract from window.__NEXT_DATA__ first
  const fromJson = await page.evaluate(() => {
    try {
      const raw = document.getElementById('__NEXT_DATA__')?.textContent;
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Walk the props tree looking for product arrays
      function find(obj, depth = 0) {
        if (depth > 10 || !obj || typeof obj !== 'object') return null;
        if (Array.isArray(obj)) {
          const hit = obj.find(i => i && typeof i === 'object' && ('name' in i || 'productName' in i) && ('price' in i || 'priceValue' in i || 'regularPrice' in i));
          if (hit) return hit;
          for (const item of obj) { const r = find(item, depth + 1); if (r) return r; }
        } else {
          for (const v of Object.values(obj)) { const r = find(v, depth + 1); if (r) return r; }
        }
        return null;
      }
      const product = find(data);
      if (!product) return null;
      const name = product.name || product.productName || null;
      const price = product.price ?? product.priceValue ?? product.regularPrice ?? null;
      return name && price != null ? { name: String(name), price: parseFloat(String(price)) } : null;
    } catch { return null; }
  });

  if (fromJson?.price) return fromJson;

  // Fallback: DOM selectors (post-consent render)
  try {
    await page.waitForSelector('[data-testid*="product"], [class*="product-card"], article', { timeout: 10000 });
  } catch {
    await page.screenshot({ path: path.join(DATA_DIR, 'debug-carrefour.png'), fullPage: true }).catch(() => {});
    const fs = require('fs'); fs.writeFileSync(path.join(DATA_DIR, 'debug-carrefour.html'), await page.content().catch(() => ''));
    return null;
  }

  return page.evaluate(() => {
    const card = document.querySelector('[data-testid*="product"], [class*="product-card"], article');
    if (!card) return null;
    const nameEl = card.querySelector('h3, h2, [class*="name"], [class*="title"]');
    const priceEl = card.querySelector('[class*="price"]:not([class*="old"]):not([class*="regular"])');
    const name = nameEl?.innerText?.trim() ?? null;
    const rawPrice = priceEl?.innerText?.trim() ?? null;
    if (!rawPrice) return null;
    const price = parseFloat(rawPrice.replace(/[^\d,]/g, '').replace(',', '.'));
    return { name, price: isNaN(price) ? null : price };
  });
}

module.exports = { scrape };
