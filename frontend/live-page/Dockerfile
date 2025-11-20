# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

RUN apk add --no-cache libc6-compat \
    && corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
ARG NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"
ARG API_INTERNAL_BASE_URL="http://localhost:8000"
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV API_INTERNAL_BASE_URL=${API_INTERNAL_BASE_URL}

COPY . .
RUN pnpm run build

FROM base AS runner

ARG NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"
ARG API_INTERNAL_BASE_URL="http://localhost:8000"

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV API_INTERNAL_BASE_URL=${API_INTERNAL_BASE_URL}

RUN addgroup -g 1001 nodejs \
    && adduser -S -G nodejs -u 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
