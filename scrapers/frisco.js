// frisco.pl — searches via their /shop/query URL
// Prices are JS-rendered; Playwright waits for the product grid to appear.

async function scrape(page, query) {
  const url = `https://www.frisco.pl/shop/query,${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Accept cookies if banner appears
  try {
    await page.click('[id*="accept"], [class*="accept-cookies"], button:has-text("Akceptuję")', { timeout: 3000 });
  } catch {}

  // Wait for product tiles
  try {
    await page.waitForSelector('[class*="product-tile"], [class*="ProductTile"], [data-testid*="product"]', { timeout: 10000 });
  } catch {
    return null; // no results
  }

  // Grab first result: name + price
  const result = await page.evaluate(() => {
    // Frisco renders prices as e.g. "12,99 zł" inside .price or [class*="price"]
    const tile = document.querySelector('[class*="product-tile"], [class*="ProductTile"]');
    if (!tile) return null;

    const nameEl = tile.querySelector('[class*="product-name"], [class*="ProductName"], h3, h2');
    const priceEl = tile.querySelector('[class*="price"]:not([class*="old"]):not([class*="before"])');

    const name = nameEl?.innerText?.trim() ?? null;
    const rawPrice = priceEl?.innerText?.trim() ?? null;

    if (!rawPrice) return null;

    // Parse "12,99 zł" → 12.99
    const price = parseFloat(rawPrice.replace(/[^\d,]/g, '').replace(',', '.'));
    return { name, price: isNaN(price) ? null : price };
  });

  return result;
}

module.exports = { scrape };
