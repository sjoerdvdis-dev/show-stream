'use client';

import { io, Socket } from 'socket.io-client';

/** Connected by `useNotificationToaster`, because the API refuses a socket with no session. */
export const socket: Socket = io({ path: '/socket', autoConnect: false });
