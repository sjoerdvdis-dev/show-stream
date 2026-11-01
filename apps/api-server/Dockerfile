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
RUN chown -R node:node /app/apps/api-server

FROM base AS runner
WORKDIR /app

RUN apk add --no-cache ffmpeg

# node is UID 1000, which must be able to write the bind-mounted ./media
USER node
COPY --from=installer /app .

ENV NODE_ENV=production
WORKDIR /app/apps/api-server
CMD ["node", "dist/index.js"]