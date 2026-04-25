# Warsaw Grocery Compare

A local tool that scrapes live prices from 5 Warsaw online grocery stores and
compares your basket cost including delivery fees.

**Stores covered:** Leclerc Warszawa · Megasam24 · Frisco.pl · Carrefour · Auchan

---

## Setup (one time)

```bash
# 1. Install Node dependencies
npm install

# 2. Install Playwright's Chromium browser
npm run install-browsers
```

## Run

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

---

## How it works

- The frontend sends each item name to `POST /api/search`
- The server opens a headless Chromium browser and searches each store simultaneously
- Each scraper navigates to the store's search page, waits for JS to render, and extracts the first result's price
- Delivery fees are applied automatically and the cheapest store is highlighted

## Notes & Troubleshooting

**Scrapers may need selector tuning.** Polish grocery sites update their HTML structure periodically. If a store always returns "—":

1. Check the debug screenshot saved at `debug-<storename>.png` in the project folder — this is captured automatically on errors
2. Open the store's search URL in your browser (search URLs are at the top of each file in `scrapers/`)
3. Use DevTools to find the correct CSS selector for product tiles and prices
4. Update the selector strings in the relevant `scrapers/*.js` file

**Anti-bot detection.** The server uses a realistic User-Agent and Polish locale. If a store blocks requests, try adding a delay in `server.js`:
```js
await page.waitForTimeout(1500); // add before scraping
```

**Performance.** All 5 stores are scraped in parallel. A full basket of 7 items takes roughly 15–40 seconds depending on your internet connection and site response times.

## Delivery fee thresholds (as of Nov 2025)

| Store | Min order | Free delivery from | Fee below threshold |
|---|---|---|---|
| Leclerc | none | PLN 300 | PLN 19.99 |
| Megasam24 | PLN 120 | PLN 180 | PLN 9.99 |
| Frisco | PLN 100 | PLN 270 | PLN 15 (100–200), PLN 10 (200–270) |
| Carrefour | none | PLN 299 | PLN 19.99 |
| Auchan | PLN 100 | PLN 200 | PLN 19.90 |
