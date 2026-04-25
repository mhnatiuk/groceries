// megasam24.pl — local Warsaw player, WooCommerce-based store

async function scrape(page, query) {
  // Megasam24 runs on WooCommerce; search endpoint is /?s=query&post_type=product
  const url = `https://megasam24.pl/?s=${encodeURIComponent(query)}&post_type=product`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

  // Accept cookies (WooCommerce sites often use simple banners)
  try {
    await page.click('button:has-text("Akceptuję"), button:has-text("OK"), [class*="accept"]', { timeout: 3000 });
  } catch {}

  try {
    // WooCommerce standard selectors
    await page.waitForSelector('.products .product, ul.products li.product', { timeout: 10000 });
  } catch {
    return null;
  }

  const result = await page.evaluate(() => {
    // WooCommerce standard markup
    const product = document.querySelector('.products .product, ul.products li.product');
    if (!product) return null;

    const nameEl = product.querySelector('.woocommerce-loop-product__title, h2');
    const priceEl = product.querySelector('.price ins .amount, .price .amount');

    const name = nameEl?.innerText?.trim() ?? null;
    const rawPrice = priceEl?.innerText?.trim() ?? null;
    if (!rawPrice) return null;

    // WooCommerce prices: "12,99 zł" or "12.99 zł"
    const price = parseFloat(rawPrice.replace(/[^\d,.]/g, '').replace(',', '.'));
    return { name, price: isNaN(price) ? null : price };
  });

  return result;
}

module.exports = { scrape };
