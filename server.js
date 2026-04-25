const express = require('express');
const { chromium } = require('playwright');
const path = require('path');
const db = require('./db');

const scrapers = {
  leclerc:   require('./scrapers/leclerc'),
  megasam24: require('./scrapers/megasam24'),
  frisco:    require('./scrapers/frisco'),
  carrefour: require('./scrapers/carrefour'),
  auchan:    require('./scrapers/auchan'),
};

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Browser pool ──────────────────────────────────────────────────────────────

let browser = null;
async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
  }
  return browser;
}

async function newPage() {
  const b = await getBrowser();
  const ctx = await b.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw',
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  return { page, ctx };
}

// ─── Scrape one store ──────────────────────────────────────────────────────────

async function scrapeStore(storeKey, query) {
  const { page, ctx } = await newPage();
  try {
    const raw = await scrapers[storeKey].scrape(page, query);
    if (raw && raw.price !== null) {
      return { price: raw.price, foundName: raw.name, status: 'found' };
    }
    return { price: null, foundName: null, status: 'notfound' };
  } catch (err) {
    console.error(`[${storeKey}] "${query}": ${err.message}`);
    try {
      await page.screenshot({ path: path.join(__dirname, `debug-${storeKey}.png`) });
    } catch {}
    return { price: null, foundName: null, status: 'error' };
  } finally {
    await ctx.close();
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/search  { query: "jajka" }
// Scrapes all stores live, saves to DB, returns fresh results + scrapedAt
app.post('/api/search', async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing query' });
  }

  console.log(`Scraping: "${query}"`);

  const entries = await Promise.all(
    Object.keys(scrapers).map(key =>
      scrapeStore(key, query).then(r => [key, r])
    )
  );
  const results = Object.fromEntries(entries);

  // Persist to DB
  db.saveResults(query, results);
  console.log(`Saved results for "${query}"`);

  // Add a timestamp so the frontend knows when these were fetched
  const scrapedAt = new Date().toISOString();
  const response = Object.fromEntries(
    Object.entries(results).map(([k, v]) => [k, { ...v, scrapedAt }])
  );

  res.json(response);
});

// GET /api/cached?item=jajka
// Returns the latest DB row per store for this item (no live scrape)
app.get('/api/cached', (req, res) => {
  const { item } = req.query;
  if (!item) return res.status(400).json({ error: 'Missing item' });
  res.json(db.getLatest(item));
});

// GET /api/history?item=jajka&store=frisco
// Returns up to 30 historical price records for one item+store
app.get('/api/history', (req, res) => {
  const { item, store } = req.query;
  if (!item || !store) return res.status(400).json({ error: 'Missing item or store' });
  res.json(db.getHistory(item, store));
});

// GET /api/items
// All item names that have ever been scraped (for restoring the list on reload)
app.get('/api/items', (_req, res) => {
  res.json(db.getAllItems());
});

// ─── Startup ──────────────────────────────────────────────────────────────────

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  if (browser) await browser.close();
  process.exit(0);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n🛒  Grocery Compare running at http://localhost:${PORT}`);
  console.log(`💾  Database: ${path.join(__dirname, 'prices.db')}\n`);
});
