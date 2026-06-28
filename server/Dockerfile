FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --production
COPY --from=builder /app/dist ./dist

EXPOSE 4000
CMD ["sh", "-c", "npx typeorm migration:run -d dist/database/data-source.js && exec node dist/main"]
