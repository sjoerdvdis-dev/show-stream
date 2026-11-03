# The `caddy` service: Caddy with apps/web's static build and the Caddyfile inside it. Node only
# builds the app, and the image that runs has none.
FROM node:26.13-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@12.16.1

FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo@2.11.10
COPY . .
RUN turbo prune web --docker

FROM base AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=builder /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
# The build checks its inline script against the policy in this file.
COPY infra/caddy/Caddyfile infra/caddy/Caddyfile

RUN pnpm turbo build --filter=web

# The only Caddy tag in the repository, which Renovate updates.
FROM caddy:2.11.7-alpine
COPY infra/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=installer /app/apps/web/dist /srv
