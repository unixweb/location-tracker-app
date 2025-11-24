# Dockerfile für Location Tracker App mit MQTT Integration

FROM node:20-alpine AS base

# Installiere docker-cli für Mosquitto Container Management
RUN apk add --no-cache docker-cli

# Dependencies Stage
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Builder Stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js App
RUN npm run build

# Initialisiere Datenbanken
RUN npm run db:init && \
    node scripts/add-mqtt-tables.js

# Runner Stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Kopiere nur Production Dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Kopiere Build Artifacts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/data ./data

# Kopiere App Code (benötigt für instrumentation.ts, lib/, etc.)
COPY --from=builder /app/instrumentation.ts ./
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/middleware.ts ./

# Exponiere Port
EXPOSE 3000

# Start App
CMD ["npm", "start"]
