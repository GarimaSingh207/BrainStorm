import { io } from 'socket.io-client';
let socketInstance = null;
export function getSocket(token) {
  if (socketInstance && socketInstance.connected) return socketInstance;
  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
  socketInstance = io(socketUrl, { auth: { token }, transports: ['websocket', 'polling'], reconnectionAttempts: 5 });
  socketInstance.on('connect', () => { console.log('[Socket] Connected:', socketInstance.id); });
  socketInstance.on('connect_error', (error) => { console.error('[Socket] Connection failed:', error.message); });
  return socketInstance;
}
export function disconnectSocket() {
  if (socketInstance) { socketInstance.disconnect(); socketInstance = null; }
}
