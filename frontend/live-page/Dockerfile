# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

ENV NEXT_TELEMETRY_DISABLED=1
ENV TZ=Europe/Madrid

WORKDIR /app

RUN apk add --no-cache libc6-compat \
    && corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
# Required: there is no safe default for the backend URL.
ARG NEXT_PUBLIC_API_BASE_URL
ARG API_INTERNAL_BASE_URL
ARG NEXT_PUBLIC_TWITCH_PARENT="local"
# Optional: empty event id resolves the current HackEPS edition at runtime.
ARG NEXT_PUBLIC_EVENT_ID=""
ARG NEXT_PUBLIC_ADMIN_URL=""
ARG NEXT_PUBLIC_DEVPOST_URL=""
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV API_INTERNAL_BASE_URL=${API_INTERNAL_BASE_URL}
ENV NEXT_PUBLIC_TWITCH_PARENT=${NEXT_PUBLIC_TWITCH_PARENT}
ENV NEXT_PUBLIC_EVENT_ID=${NEXT_PUBLIC_EVENT_ID}
ENV NEXT_PUBLIC_ADMIN_URL=${NEXT_PUBLIC_ADMIN_URL}
ENV NEXT_PUBLIC_DEVPOST_URL=${NEXT_PUBLIC_DEVPOST_URL}

COPY . .
RUN test -n "$NEXT_PUBLIC_API_BASE_URL" \
    || (echo "NEXT_PUBLIC_API_BASE_URL build arg is required" >&2 && exit 1)
RUN pnpm run build

FROM base AS runner

ARG NEXT_PUBLIC_API_BASE_URL
ARG API_INTERNAL_BASE_URL
ARG NEXT_PUBLIC_TWITCH_PARENT="local"

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV API_INTERNAL_BASE_URL=${API_INTERNAL_BASE_URL}
ENV NEXT_PUBLIC_TWITCH_PARENT=${NEXT_PUBLIC_TWITCH_PARENT}

RUN addgroup -g 1001 nodejs \
    && adduser -S -G nodejs -u 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
