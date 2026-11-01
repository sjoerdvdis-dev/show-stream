#!/bin/bash
set -e

docker network inspect show_stream_network >/dev/null 2>&1 || docker network create show_stream_network
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up -d
