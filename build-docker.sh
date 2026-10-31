#!/bin/bash

docker network create show_stream_network
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose --progress=plain -f docker-compose.yml build
docker-compose -f docker-compose.yml up -d