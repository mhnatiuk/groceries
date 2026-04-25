const path = require('path');
const DATA_DIR = '/app/data';

async function scrape(page, query) {
  const url = `https://megasam24.pl/?s=${encodeURIComponent(query)}&post_type=product`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

  try {
    await page.click('#onetrust-accept-btn-handler, button:has-text("Akceptuję")', { timeout: 4000 });
  } catch {}

  try {
    await page.waitForSelector('.product.center.row, .product.row.center', { timeout: 12000 });
  } catch {
    await page.screenshot({ path: path.join(DATA_DIR, 'debug-megasam24.png'), fullPage: true }).catch(() => {});
    const fs = require('fs'); fs.writeFileSync(path.join(DATA_DIR, 'debug-megasam24.html'), await page.content().catch(() => ''));
    return null;
  }

  return page.evaluate(() => {
    const product = document.querySelector('.product.center.row, .product.row.center');
    if (!product) return null;

    const nameEl = product.querySelector('.productname');
    const priceEl = product.querySelector('.price_extended em');

    const name = nameEl?.innerText?.trim() ?? null;
    const rawPrice = priceEl?.innerText?.trim() ?? null;
    if (!rawPrice) return null;

    const price = parseFloat(rawPrice.replace(/[^\d,]/g, '').replace(',', '.'));
    return { name, price: isNaN(price) ? null : price };
  });
}

module.exports = { scrape };
