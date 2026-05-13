export interface AuctionPlayerSnapshot {
  id: string;
  name: string;
  position: string;
  team: string;
  rating: number;
  photoUrl: string | null;
}

export interface ActiveAuctionSnapshot {
  id: string;
  roomId: string;
  playerId: string;
  player: AuctionPlayerSnapshot;
  nominatedBy: string;
  currentBid: number;
  currentBidder: string | null;
  currentBidderName: string | null;
  timerEndsAt: number;
  status: string;
}

/**
 * Read-through cache for live auction state.
 *
 * Current implementation: dbCache (Postgres-backed, no-op invalidate).
 * To add Redis: implement this interface in redisCache.ts and swap the
 * export in src/cache/index.ts. No other files need to change.
 */
export interface AuctionCache {
  /**
   * Return the active auction snapshot for a room, or null if none.
   * Used by the reconnect path (room_joined.currentState).
   */
  getSnapshot(roomId: string): Promise<ActiveAuctionSnapshot | null>;

  /**
   * Invalidate any cached state for a room.
   * Call after every mutation: nominate, bid, timer expiry.
   */
  invalidate(roomId: string): Promise<void>;
}
