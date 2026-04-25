// eleclerc.pl — Warsaw store, search via /pl/search

async function scrape(page, query) {
  const url = `https://www.eleclerc.pl/pl/search?q=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

  // Accept cookies
  try {
    await page.click('button:has-text("Akceptuję"), button:has-text("Zaakceptuj"), [id*="accept-all"]', { timeout: 3000 });
  } catch {}

  try {
    await page.waitForSelector('[class*="product"], [data-testid*="product"]', { timeout: 10000 });
  } catch {
    return null;
  }

  const result = await page.evaluate(() => {
    // Try to find a product tile — Leclerc uses various class patterns
    const selectors = [
      '[class*="product-card"]',
      '[class*="ProductCard"]',
      '[class*="product-tile"]',
      '[class*="product-item"]'
    ];
    let tile = null;
    for (const sel of selectors) {
      tile = document.querySelector(sel);
      if (tile) break;
    }
    if (!tile) return null;

    const nameEl = tile.querySelector('[class*="name"], [class*="title"], h3, h2');
    const priceEl = tile.querySelector('[class*="price"]:not([class*="old"]):not([class*="before"])');

    const name = nameEl?.innerText?.trim() ?? null;
    const rawPrice = priceEl?.innerText?.trim() ?? null;
    if (!rawPrice) return null;

    const price = parseFloat(rawPrice.replace(/[^\d,]/g, '').replace(',', '.'));
    return { name, price: isNaN(price) ? null : price };
  });

  return result;
}

module.exports = { scrape };
