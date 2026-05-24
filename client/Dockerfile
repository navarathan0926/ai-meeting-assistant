# # ─── Dependency Stage ───────────────────────────────────────────────────
# FROM node:20-alpine AS deps
# RUN apk add --no-cache libc6-compat
# WORKDIR /usr/src/app

# # Copy package files for dependency installation
# COPY package*.json ./
# RUN npm ci

# # ─── Builder Stage ──────────────────────────────────────────────────────
# FROM node:20-alpine AS builder
# WORKDIR /usr/src/app

# # Copy dependencies and source code
# COPY --from=deps /usr/src/app/node_modules ./node_modules
# COPY . .

# # Set environment variables for production build
# ENV NEXT_TELEMETRY_DISABLED=1
# ENV NODE_ENV=production

# # Run Next.js build
# RUN npm run build

# # ─── Production Runner Stage ────────────────────────────────────────────
# FROM node:20-alpine AS runner
# WORKDIR /usr/src/app

# ENV NODE_ENV=production
# ENV NEXT_TELEMETRY_DISABLED=1

# # Create non-privileged user and group
# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nextjs

# # Set up standard ports
# EXPOSE 3000
# ENV PORT=3000
# ENV HOSTNAME="0.0.0.0"

# # Copy built public files and standalone bundle
# COPY --from=builder /usr/src/app/public ./public
# COPY --from=builder --chown=nextjs:nodejs /usr/src/app/.next/standalone ./
# COPY --from=builder --chown=nextjs:nodejs /usr/src/app/.next/static ./.next/static

# # Run Next.js as non-privileged user
# USER nextjs

# # Start Next.js server using the standalone build node script
# CMD ["node", "server.js"]

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]