# # Stage 1: Build the application
# FROM node:20-alpine AS builder
# WORKDIR /app

# # Copy package files first for better layer caching
# COPY package*.json ./
# RUN npm ci

# # Copy source code and build
# COPY . .
# RUN npm run build

# # Remove dev dependencies after building
# RUN npm prune --production

# # Stage 2: Production image
# FROM node:20-alpine AS production
# WORKDIR /app

# # Create a non-root user for security
# RUN addgroup -g 1001 -S appgroup && \
#     adduser -S appuser -u 1001

# # Copy only what we need from the build stage
# COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/package.json ./

# # Set environment variables
# ENV NODE_ENV=production
# ENV PORT=4000

# # Switch to non-root user
# USER appuser

# # Expose the port
# EXPOSE 4000

# # Health check
# HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
#     CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

# # Start the application
# CMD ["node", "dist/main"]


FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 4000

CMD ["npm", "run", "start:dev"]