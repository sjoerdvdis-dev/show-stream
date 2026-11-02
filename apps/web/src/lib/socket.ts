import { io, type Socket } from 'socket.io-client';

/** Not a call to the API: this is the path Caddy routes to Socket.IO. The API refuses a socket with no session. */
export const openSocket = (): Socket => io({ path: '/socket' });
