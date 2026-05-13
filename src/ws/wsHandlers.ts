import WebSocket from 'ws';
import { handleBid, handleNominate } from '../services/auctionService';
import { sendToUser } from './broadcaster';
import { WsMessage } from '../types';

export function handleMessage(
  ws: WebSocket,
  rawData: WebSocket.RawData,
  roomId: string,
  userId: string,
  displayName: string,
): void {
  let msg: WsMessage;
  try {
    msg = JSON.parse(rawData.toString()) as WsMessage;
  } catch {
    sendToUser(roomId, userId, { type: 'error', data: { message: 'Invalid JSON' } });
    return;
  }

  switch (msg.type) {
    case 'bid': {
      const amount = Number((msg.data as { amount?: unknown })?.amount);
      if (!amount || isNaN(amount) || amount <= 0) {
        sendToUser(roomId, userId, { type: 'bid_rejected', data: { reason: 'Invalid bid amount' } });
        return;
      }
      handleBid(roomId, userId, displayName, amount).catch(console.error);
      break;
    }
    case 'nominate': {
      const data = msg.data as { playerId?: unknown; baseBid?: unknown };
      const playerId = String(data?.playerId ?? '');
      const baseBid = Number(data?.baseBid);
      if (!playerId || !baseBid || isNaN(baseBid) || baseBid <= 0) {
        sendToUser(roomId, userId, { type: 'error', data: { message: 'Invalid nominate payload' } });
        return;
      }
      handleNominate(roomId, userId, playerId, baseBid).catch(console.error);
      break;
    }
    default:
      sendToUser(roomId, userId, { type: 'error', data: { message: `Unknown message type: ${msg.type}` } });
  }
}
