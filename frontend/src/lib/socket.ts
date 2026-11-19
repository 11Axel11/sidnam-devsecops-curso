import { io } from 'socket.io-client';

import { SOCKET_ORIGIN } from '@/api/environment';

export const socket = io(SOCKET_ORIGIN, {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket"],
  reconnection: true,
});
