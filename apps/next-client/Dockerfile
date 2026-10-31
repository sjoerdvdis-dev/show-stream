FROM node:22.15-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN pnpm add -g turbo
COPY . .
RUN turbo prune next-client --docker

FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=builder /app/out/json .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install
RUN pnpm install

COPY --from=builder /app/out/full .

RUN pnpm turbo build

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nextjs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=installer --chown=nextjs:nextjs /app/apps/next-client/.next/standalone /app
COPY --from=installer --chown=nextjs:nextjs /app/apps/next-client/.next/static /app/apps/next-client/.next/static
COPY --from=installer --chown=nextjs:nextjs /app/apps/next-client/public /app/next-client/public

CMD ["sh", "-c", "cd apps/next-client && pnpm run start"]