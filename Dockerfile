FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

# better-sqlite3 is a native addon — needs build tools to compile from source
RUN apt-get update && apt-get install -y build-essential python3 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server.js"]
