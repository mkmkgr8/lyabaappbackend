import { IncomingMessage } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { Server } from 'http';
import { config } from '../config';
import { prisma } from '../db/prisma';
import { registerSocket, removeSocket } from './broadcaster';
import { handleMessage } from './wsHandlers';
import { getActiveAuctionDto } from '../services/auctionService';
import { JwtPayload } from '../types';

function getQueryParam(url: string | undefined, key: string): string | null {
  if (!url) return null;
  const u = new URL(url, 'http://localhost');
  return u.searchParams.get(key);
}

export function initWsServer(server: Server): void {
  const wss = new WebSocketServer({ server });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const token = getQueryParam(req.url, 'token');
    const roomId = getQueryParam(req.url, 'roomId');

    // Validate token
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token ?? '', config.JWT_SECRET) as JwtPayload;
    } catch {
      ws.close(4001, 'Invalid token');
      return;
    }

    if (!roomId) {
      ws.close(4003, 'Missing roomId');
      return;
    }

    // Verify participant
    const participant = await prisma.roomParticipant.findUnique({
      where: { roomId_userId: { roomId, userId: payload.sub } },
      include: { user: true, room: true },
    });
    if (!participant) {
      ws.close(4003, 'Not a participant in this room');
      return;
    }

    const userId = payload.sub;
    const displayName = payload.displayName;

    registerSocket(roomId, userId, ws);

    // Gather current room participants for room_joined
    const participants = await prisma.roomParticipant.findMany({
      where: { roomId },
      include: { user: true },
    });

    const currentState = await getActiveAuctionDto(roomId);

    ws.send(JSON.stringify({
      type: 'room_joined',
      data: {
        users: participants.map((p) => ({
          id: p.userId,
          displayName: p.user.displayName,
          budget: Number(p.budget),
          roomId,
        })),
        currentState,
      },
    }));

    ws.on('message', (data) => {
      handleMessage(ws, data, roomId, userId, displayName);
    });

    ws.on('close', () => {
      removeSocket(roomId, userId);
    });

    ws.on('error', (err) => {
      console.error(`WS error for ${userId} in room ${roomId}:`, err.message);
      removeSocket(roomId, userId);
    });
  });
}
