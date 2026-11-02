FROM node:26.13-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@12.16.1

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo@2.11.10
COPY . .
RUN turbo prune api --docker

FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=builder /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm install

COPY --from=builder /app/out/full/ .

RUN pnpm turbo build
RUN chown -R node:node /app/apps/api

FROM base AS runner
WORKDIR /app

RUN apk add --no-cache su-exec

# A new named volume takes this folder's owner, so the database is writable on first start.
RUN mkdir /data && chown node:node /data

COPY --from=installer /app .

# The container starts as root, and this drops to PUID:PGID before the app runs.
COPY --chmod=755 infra/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
ENV OWNED_FOLDERS=/data

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/app.db
WORKDIR /app/apps/api
ENTRYPOINT ["entrypoint.sh"]
CMD ["node", "dist/index.js"]
