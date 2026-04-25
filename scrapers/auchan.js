// auchan.pl — search via /szukaj?q=

async function scrape(page, query) {
  const url = `https://www.auchan.pl/szukaj?q=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Accept cookies
  try {
    await page.click('button:has-text("Akceptuję"), button:has-text("Zaakceptuj wszystkie"), [id*="accept"]', { timeout: 3000 });
  } catch {}

  try {
    await page.waitForSelector('[class*="product-tile"], [class*="ProductTile"], [class*="product-item"]', { timeout: 10000 });
  } catch {
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
