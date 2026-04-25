const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'prices.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS prices (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name   TEXT    NOT NULL,
    store       TEXT    NOT NULL,
    price       REAL,               -- NULL means "not found / error"
    found_name  TEXT,               -- the actual product name the store returned
    status      TEXT    NOT NULL,   -- 'found' | 'notfound' | 'error'
    scraped_at  DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_item_store_time
    ON prices(item_name, store, scraped_at DESC);
`);

const stmts = {
  insert: db.prepare(`
    INSERT INTO prices (item_name, store, price, found_name, status)
    VALUES (@item_name, @store, @price, @found_name, @status)
  `),

  // Latest price per store for a given item
  latest: db.prepare(`
    SELECT store, price, found_name, status, scraped_at
    FROM prices
    WHERE item_name = ?
    GROUP BY store
    HAVING scraped_at = MAX(scraped_at)
    ORDER BY store
  `),

  // Full history for one item+store pair (newest first)
  history: db.prepare(`
    SELECT price, found_name, status, scraped_at
    FROM prices
    WHERE item_name = ? AND store = ?
    ORDER BY scraped_at DESC
    LIMIT 30
  `),

  // All distinct item names ever searched
  allItems: db.prepare(`
    SELECT DISTINCT item_name FROM prices ORDER BY item_name
  `),
};

// Save a full scrape result for one item (all stores at once)
// results: { leclerc: { price, foundName, status }, ... }
function saveResults(itemName, results) {
  const insert = db.transaction(entries => {
    for (const [store, r] of entries) {
      stmts.insert.run({
        item_name:  itemName,
        store,
        price:      r.price ?? null,
        found_name: r.foundName ?? null,
        status:     r.status,
      });
    }
  });
  insert(Object.entries(results));
}

// Get the latest known price for each store for a given item
// Returns: { leclerc: { price, foundName, status, scrapedAt }, ... } or {}
function getLatest(itemName) {
  const rows = stmts.latest.all(itemName);
  return Object.fromEntries(
    rows.map(r => [r.store, {
      price:      r.price,
      foundName:  r.found_name,
      status:     r.status,
      scrapedAt:  r.scraped_at,
    }])
  );
}

// Price history for one item+store pair
function getHistory(itemName, store) {
  return stmts.history.all(itemName, store);
}

// All item names ever searched
function getAllItems() {
  return stmts.allItems.all().map(r => r.item_name);
}

module.exports = { saveResults, getLatest, getHistory, getAllItems };
