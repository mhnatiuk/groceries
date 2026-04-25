const path = require('path');
const DATA_DIR = '/app/data';

async function scrape(page, query) {
  const url = `https://www.frisco.pl/shop/query,${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

  try {
    await page.click('#onetrust-accept-btn-handler', { timeout: 4000 });
  } catch {}

  try {
    await page.waitForSelector('.mini-product-box', { timeout: 12000 });
  } catch {
    await page.screenshot({ path: path.join(DATA_DIR, 'debug-frisco.png'), fullPage: true }).catch(() => {});
    const fs = require('fs'); fs.writeFileSync(path.join(DATA_DIR, 'debug-frisco.html'), await page.content().catch(() => ''));
    return null;
  }

  return page.evaluate(() => {
    const box = document.querySelector('.mini-product-box');
    if (!box) return null;

    const nameEl = box.querySelector('.f-hpc__product-name');
    const priceEl = box.querySelector('.f-hpc__price-amount--plain');

    const name = nameEl?.innerText?.trim() ?? null;
    const rawPrice = priceEl?.innerText?.trim() ?? null;
    if (!rawPrice) return null;

    const price = parseFloat(rawPrice.replace(',', '.'));
    return { name, price: isNaN(price) ? null : price };
  });
}

module.exports = { scrape };
