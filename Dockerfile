FROM node:22-alpine AS base
RUN corepack enable pnpm
RUN apk add --no-cache python3 make g++

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_PATH=/tmp/build.db
ARG ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
ARG BETTER_AUTH_SECRET=build-time-placeholder-secret-minimum-32chars
ENV ENCRYPTION_KEY=$ENCRYPTION_KEY
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
RUN pnpm build
RUN rm -f /tmp/build.db

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_PATH=/data/curyloop.db
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN mkdir -p /data && chown nextjs:nodejs /data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle

USER nextjs
EXPOSE 3000
VOLUME ["/data"]

CMD ["node", "server.js"]
