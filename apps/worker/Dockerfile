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
RUN apk add --no-cache ffmpeg

# New named volumes take these folders' owner, so that UID 1000 can write them on first start.
RUN mkdir /data /media && chown node:node /data /media

# node is UID 1000, which must be able to write the bind-mounted ./media
USER node
COPY --from=installer /app .

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/app.db
ENV MEDIA_FOLDER=/media
WORKDIR /app/apps/worker
CMD ["node", "dist/index.js"]
