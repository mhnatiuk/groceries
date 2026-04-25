const path = require('path');
const DATA_DIR = '/app/data';

async function scrape(page, query) {
  // Set OneTrust consent cookie so banner never appears and search results load properly
  await page.context().addCookies([
    { name: 'OptanonAlertBoxClosed', value: new Date().toISOString(), domain: '.carrefour.pl', path: '/' },
    { name: 'OptanonConsent', value: 'isGpcEnabled=0&interactionCount=1&isAnonUser=1&groups=C0001%3A1%2CC0002%3A1%2CC0003%3A1%2CC0004%3A1', domain: '.carrefour.pl', path: '/' },
  ]);

  const url = `https://www.carrefour.pl/szukaj?query=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'load', timeout: 45000 });

  // Carrefour uses MUI — product names are in h3[role="button"], prices split across MuiTypography-h1 + MuiTypography-h3
  try {
    await page.waitForSelector('h3[role="button"]', { timeout: 15000 });
  } catch {
    await page.screenshot({ path: path.join(DATA_DIR, 'debug-carrefour.png'), fullPage: true }).catch(() => {});
    const fs = require('fs'); fs.writeFileSync(path.join(DATA_DIR, 'debug-carrefour.html'), await page.content().catch(() => ''));
    return null;
  }

  return page.evaluate(() => {
    const nameEl = document.querySelector('h3[role="button"]');
    if (!nameEl) return null;
    const name = nameEl.innerText?.trim() ?? null;

    // Price is split: integer part in .MuiTypography-h1, decimal in next .MuiTypography-h3
    const intEl = document.querySelector('.MuiTypography-h1');
    const decEl = intEl?.nextElementSibling;
    if (!intEl) return null;
    const rawPrice = `${intEl.innerText?.trim()}.${decEl?.innerText?.trim() ?? '00'}`;
    const price = parseFloat(rawPrice);
    return { name, price: isNaN(price) ? null : price };
  });
}

module.exports = { scrape };
