import WebSocket from 'ws';

// roomId → Map<userId, WebSocket>
export const roomSockets = new Map<string, Map<string, WebSocket>>();

export function broadcast(roomId: string, message: object, excludeUserId?: string): void {
  const room = roomSockets.get(roomId);
  if (!room) return;
  const text = JSON.stringify(message);
  for (const [userId, ws] of room) {
    if (userId !== excludeUserId && ws.readyState === WebSocket.OPEN) {
      ws.send(text);
    }
  }
}

export function sendToUser(roomId: string, userId: string, message: object): void {
  const ws = roomSockets.get(roomId)?.get(userId);
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export function registerSocket(roomId: string, userId: string, ws: WebSocket): void {
  if (!roomSockets.has(roomId)) roomSockets.set(roomId, new Map());
  roomSockets.get(roomId)!.set(userId, ws);
}

export function removeSocket(roomId: string, userId: string): void {
  const room = roomSockets.get(roomId);
  if (!room) return;
  room.delete(userId);
  if (room.size === 0) roomSockets.delete(roomId);
}
