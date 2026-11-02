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
RUN turbo prune worker --docker

FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=builder /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm install

COPY --from=builder /app/out/full/ .

RUN pnpm turbo build
RUN chown -R node:node /app/apps/worker

FROM base AS runner
WORKDIR /app

# The only image with ffmpeg. See the rules in AGENTS.md.
RUN apk add --no-cache ffmpeg su-exec

# New named volumes take these folders' owner, so that UID 1000 can write them on first start.
RUN mkdir -p /data /media /backups && chown node:node /data /media /backups

COPY --from=installer /app .

# The container starts as root, and this drops to PUID:PGID before the app runs. Of the library,
# the worker writes only to cache.
COPY --chmod=755 infra/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
ENV OWNED_FOLDERS="/data /backups /media/cache"

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/app.db
ENV MEDIA_FOLDER=/media
ENV BACKUP_FOLDER=/backups
ENV HEARTBEAT_FILE=/tmp/worker-heartbeat
WORKDIR /app/apps/worker
ENTRYPOINT ["entrypoint.sh"]
CMD ["node", "dist/index.js"]
