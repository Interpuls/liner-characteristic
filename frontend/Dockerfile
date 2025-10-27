# Multi-stage Dockerfile for Next.js frontend (production)
# Build args allow injecting public API URL at build time

ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
# Install all deps for build (ci ensures clean, reproducible)
RUN npm ci

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Allow overriding public API URL at build-time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy Next.js standalone server and static files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
USER nextjs
CMD ["node", "server.js"]

