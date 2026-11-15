#!/bin/sh
# The playwright service's command, in compose.yml. Arguments go to `playwright test`.
#
# The desktop app, like a real desktop, has no way to ignore a certificate, so Caddy's CA is trusted
# here as docs/guides/self-hosting.md tells a user to: in the NSS database Chromium and Electron
# read on Linux. Electron also needs a display, which Xvfb gives it. xvfb-run is not used, because
# it waits for a signal Xvfb does not send to it in this container.
set -eu

nssdb="$HOME/.pki/nssdb"
mkdir -p "$nssdb"
certutil -d "sql:$nssdb" -N --empty-password
certutil -d "sql:$nssdb" -A -t 'C,,' -n 'Caddy Local Authority' -i /caddy-ca/root.crt

Xvfb :99 -screen 0 1920x1080x24 -nolisten tcp >/dev/null 2>&1 &
export DISPLAY=:99
for attempt in $(seq 50); do [ -S /tmp/.X11-unix/X99 ] && break; sleep 0.1; done

./node_modules/.bin/playwright test "$@"
