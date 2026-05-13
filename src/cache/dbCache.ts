import { prisma } from '../db/prisma';
import { AuctionCache, ActiveAuctionSnapshot } from './types';

/**
 * Postgres-backed AuctionCache. Every read hits the DB directly.
 * invalidate() is a no-op — Postgres is always the source of truth here.
 *
 * Replace with redisCache.ts for a caching layer without changing callers.
 */
export const dbCache: AuctionCache = {
  async getSnapshot(roomId: string): Promise<ActiveAuctionSnapshot | null> {
    const auction = await prisma.activeAuction.findUnique({
      where: { roomId },
      include: { player: true },
    });
    if (!auction || auction.status !== 'active') return null;

    return {
      id: auction.id,
      roomId: auction.roomId,
      playerId: auction.playerId,
      player: {
        id: auction.player.id,
        name: auction.player.name,
        position: auction.player.position,
        team: auction.player.team,
        rating: auction.player.rating,
        photoUrl: auction.player.photoUrl,
      },
      nominatedBy: auction.nominatedBy,
      currentBid: Number(auction.currentBid),
      currentBidder: auction.currentBidder,
      currentBidderName: auction.currentBidderName,
      timerEndsAt: Number(auction.timerEndsAt),
      status: auction.status,
    };
  },

  async invalidate(_roomId: string): Promise<void> {
    // No-op: Postgres is authoritative, nothing to evict.
  },
};
