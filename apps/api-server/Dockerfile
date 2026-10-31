FROM node:22.15-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN pnpm add -g turbo
COPY . .
RUN turbo prune api-server --docker

FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=builder /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm install

COPY --from=builder /app/out/full/ .

RUN pnpm turbo build
RUN chown -R expressjs:nodejs /app/apps/api-server

FROM base AS runner
WORKDIR /app

RUN apk add --no-cache ffmpeg

USER expressjs
COPY --from=installer /app .

CMD ["sh", "-c", "cd apps/api-server && pnpm run start"]