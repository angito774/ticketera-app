# syntax=docker/dockerfile:1

# Imagen de producción de Ticketera (Next.js 16, salida standalone).
# Targets: `runner` (la app, por defecto) y `migrate` (aplica las migraciones de Drizzle y termina).

ARG NODE_VERSION=22

# ---------- deps: todas las dependencias (build y migraciones) ----------
FROM node:${NODE_VERSION}-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- builder ----------
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Las NEXT_PUBLIC_* se incrustan en el bundle del cliente: deben existir al construir.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL \
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL \
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL \
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL \
    NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=postgresql://build:build@localhost:5432/build
# DATABASE_URL de arriba es solo un valor ficticio para que `next build` importe el módulo de la base;
# el build no abre conexiones. La real se inyecta en ejecución.
RUN npm run build

# ---------- certificados de RDS ----------
FROM node:${NODE_VERSION}-alpine AS rds-ca
RUN wget -qO /rds-global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# ---------- migrate: aplica drizzle/*.sql y termina ----------
FROM node:${NODE_VERSION}-alpine AS migrate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=rds-ca /rds-global-bundle.pem /certs/rds-global-bundle.pem
ENV NODE_EXTRA_CA_CERTS=/certs/rds-global-bundle.pem
COPY --from=deps /app/node_modules ./node_modules
COPY package.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/db ./src/db
CMD ["npx", "drizzle-kit", "migrate"]

# ---------- runner: la app ----------
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=rds-ca /rds-global-bundle.pem /certs/rds-global-bundle.pem
ENV NODE_EXTRA_CA_CERTS=/certs/rds-global-bundle.pem

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
