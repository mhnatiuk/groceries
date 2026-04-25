// carrefour.pl — uses their /szukaj?query= search endpoint

async function scrape(page, query) {
  const url = `https://www.carrefour.pl/szukaj?query=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

  // Accept cookies
  try {
    await page.click('[id*="accept"], button:has-text("Zaakceptuj"), button:has-text("Akceptuj")', { timeout: 3000 });
  } catch {}

  try {
    await page.waitForSelector('[class*="product-card"], [class*="ProductCard"], [data-testid*="product-card"]', { timeout: 10000 });
  } catch {
    return null;
  }

  const result = await page.evaluate(() => {
    const card = document.querySelector('[class*="product-card"], [class*="ProductCard"]');
    if (!card) return null;

    const nameEl = card.querySelector('[class*="product-name"], [class*="title"], h3, h2');
    // Carrefour shows integer and decimal parts separately, e.g. <span>12</span><span>,99</span>
    const priceContainer = card.querySelector('[class*="price"]:not([class*="old"]):not([class*="regular"])');

    const name = nameEl?.innerText?.trim() ?? null;
    const rawPrice = priceContainer?.innerText?.trim() ?? null;
    if (!rawPrice) return null;

    const price = parseFloat(rawPrice.replace(/[^\d,]/g, '').replace(',', '.'));
    return { name, price: isNaN(price) ? null : price };
  });

  return result;
}

module.exports = { scrape };
