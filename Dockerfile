# Use the official Playwright image — Chromium and all system deps are pre-installed
FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

# Install Node dependencies first (layer cached unless package.json changes)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Data directory for SQLite — will be bind-mounted from the host
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server.js"]
