#!/bin/sh
# Starts the API and the worker. Started as root, it gives the folders in OWNED_FOLDERS to
# PUID:PGID, then runs the app as that user. The library in /media is never changed: only
# what the app writes is taken.
#
# Anything printed here reaches `docker compose logs`, so it is JSON like the app's own logs.
set -eu

log() {
	printf '{"level":"%s","message":"%s","timestamp":"%s"}\n' "$1" "$2" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}

# A `user` set in Compose cannot change owners, and needs nothing changed.
if [ "$(id -u)" -ne 0 ]; then
	exec "$@"
fi

uid=${PUID:-1000}
gid=${PGID:-1000}

for id in "$uid" "$gid"; do
	case "$id" in
		'' | *[!0-9]*)
			log error 'PUID and PGID must be whole numbers'
			exit 1
			;;
	esac
done

if [ "$uid" -eq 0 ]; then
	log error 'PUID must not be 0, because the app does not run as root'
	exit 1
fi

for folder in ${OWNED_FOLDERS:-}; do
	# Only what differs, so that a normal start writes nothing, and an interrupted change finishes.
	if ! {
		mkdir -p "$folder" &&
			find "$folder" \( ! -user "$uid" -o ! -group "$gid" \) -exec chown -h "$uid:$gid" {} +
	} 2>/dev/null; then
		# A read-only folder or an NFS share can refuse. The app may still be able to write there.
		log warn "Could not give $folder to $uid:$gid, so writing there may fail"
	fi
done

exec su-exec "$uid:$gid" "$@"
