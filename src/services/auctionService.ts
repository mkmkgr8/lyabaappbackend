import { prisma } from '../db/prisma';
import { broadcast, sendToUser } from '../ws/broadcaster';
import { auctionCache } from '../cache';
import { ActiveAuctionSnapshot } from '../cache/types';
import { ActiveAuctionDto, PlayerDto } from '../types';

// roomId → timer handle
const timers = new Map<string, NodeJS.Timeout>();

function setRoomTimer(roomId: string, ms: number, callback: () => void): void {
  clearRoomTimer(roomId);
  timers.set(roomId, setTimeout(callback, ms));
}

function clearRoomTimer(roomId: string): void {
  const handle = timers.get(roomId);
  if (handle) clearTimeout(handle);
  timers.delete(roomId);
}

// Prevents double-fire when a bid races the timer expiry
const closingRooms = new Set<string>();

function snapshotToDto(snap: ActiveAuctionSnapshot): ActiveAuctionDto {
  const player: PlayerDto = {
    id: snap.player.id,
    name: snap.player.name,
    position: snap.player.position,
    team: snap.player.team,
    rating: snap.player.rating,
    photoUrl: snap.player.photoUrl,
    status: 'active',
    ownedBy: null,
  };
  return {
    playerId: snap.playerId,
    player,
    nominatedBy: snap.nominatedBy,
    currentBid: snap.currentBid,
    currentBidder: snap.currentBidder ?? '',
    currentBidderName: snap.currentBidderName ?? '',
    timerEndsAt: snap.timerEndsAt,
    status: snap.status,
  };
}

export async function getActiveAuctionDto(roomId: string): Promise<ActiveAuctionDto | null> {
  const snap = await auctionCache.getSnapshot(roomId);
  return snap ? snapshotToDto(snap) : null;
}

export async function handleNominate(
  roomId: string,
  userId: string,
  playerId: string,
  baseBid: number,
): Promise<void> {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) { sendToUser(roomId, userId, { type: 'error', data: { message: 'Room not found' } }); return; }
  if (room.status !== 'live') { sendToUser(roomId, userId, { type: 'error', data: { message: 'Room is not live' } }); return; }

  const existingAuction = await prisma.activeAuction.findUnique({ where: { roomId } });
  if (existingAuction) { sendToUser(roomId, userId, { type: 'error', data: { message: 'An auction is already in progress' } }); return; }

  if (baseBid < Number(room.minIncrement)) {
    sendToUser(roomId, userId, { type: 'error', data: { message: `Base bid must be at least ${room.minIncrement}` } });
    return;
  }

  // Lazily create the auction_players row if this player hasn't been seen in
  // this room before. update:{} means existing rows are returned unchanged.
  const ap = await prisma.auctionPlayer.upsert({
    where: { roomId_playerId: { roomId, playerId } },
    create: { roomId, playerId, status: 'available' },
    update: {},
    include: { player: true },
  });

  if (ap.status !== 'available') {
    sendToUser(roomId, userId, { type: 'error', data: { message: 'Player is not available for nomination' } });
    return;
  }

  const timerEndsAt = BigInt(Date.now() + room.timerDuration * 1000);

  await prisma.$transaction([
    prisma.activeAuction.create({
      data: { roomId, playerId, nominatedBy: userId, currentBid: baseBid, timerEndsAt, status: 'active' },
    }),
    prisma.auctionPlayer.update({
      where: { roomId_playerId: { roomId, playerId } },
      data: { status: 'active' },
    }),
  ]);

  await auctionCache.invalidate(roomId);

  broadcast(roomId, {
    type: 'auction_started',
    data: {
      playerId,
      player: {
        id: ap.player.id, name: ap.player.name, position: ap.player.position,
        team: ap.player.team, rating: ap.player.rating, photoUrl: ap.player.photoUrl,
        status: 'active', ownedBy: null,
      },
      nominatedBy: userId,
      currentBid: baseBid,
      currentBidder: '',
      currentBidderName: '',
      timerEndsAt: Number(timerEndsAt),
      status: 'active',
    },
  });

  setRoomTimer(roomId, room.timerDuration * 1000, () => onTimerExpired(roomId));
}

export async function handleBid(
  roomId: string,
  userId: string,
  displayName: string,
  amount: number,
): Promise<void> {
  if (closingRooms.has(roomId)) {
    sendToUser(roomId, userId, { type: 'bid_rejected', data: { reason: 'No active auction' } });
    return;
  }

  const auction = await prisma.activeAuction.findUnique({ where: { roomId } });
  if (!auction || auction.status !== 'active') {
    sendToUser(roomId, userId, { type: 'bid_rejected', data: { reason: 'No active auction' } });
    return;
  }

  const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });

  if (amount < Number(auction.currentBid) + Number(room.minIncrement)) {
    sendToUser(roomId, userId, {
      type: 'bid_rejected',
      data: { reason: `Bid must be at least £${Number(room.minIncrement) / 1_000_000}m more than current bid` },
    });
    return;
  }

  if (auction.currentBidder === userId) {
    sendToUser(roomId, userId, { type: 'bid_rejected', data: { reason: 'You are already the highest bidder' } });
    return;
  }

  const participant = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!participant || Number(participant.budget) < amount) {
    sendToUser(roomId, userId, { type: 'bid_rejected', data: { reason: 'Insufficient budget' } });
    return;
  }

  const timerEndsAt = BigInt(Date.now() + room.timerDuration * 1000);

  await prisma.$transaction([
    prisma.activeAuction.update({
      where: { roomId },
      data: { currentBid: amount, currentBidder: userId, currentBidderName: displayName, timerEndsAt },
    }),
    prisma.bidHistory.create({
      data: { roomId, auctionId: auction.id, userId, displayName, amount, placedAt: BigInt(Date.now()) },
    }),
  ]);

  await auctionCache.invalidate(roomId);

  broadcast(roomId, {
    type: 'new_bid',
    data: { userId, displayName, amount, timerEndsAt: Number(timerEndsAt) },
  });

  setRoomTimer(roomId, room.timerDuration * 1000, () => onTimerExpired(roomId));
}

async function onTimerExpired(roomId: string): Promise<void> {
  if (closingRooms.has(roomId)) return;
  closingRooms.add(roomId);

  try {
    const auction = await prisma.activeAuction.findUnique({ where: { roomId } });
    if (!auction || auction.status !== 'active') return;

    if (!auction.currentBidder) {
      await prisma.$transaction([
        prisma.auctionPlayer.update({
          where: { roomId_playerId: { roomId, playerId: auction.playerId } },
          data: { status: 'unsold' },
        }),
        prisma.activeAuction.update({
          where: { roomId },
          data: { status: 'sold', endedAt: new Date() },
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.auctionPlayer.update({
          where: { roomId_playerId: { roomId, playerId: auction.playerId } },
          data: { status: 'sold', ownedBy: auction.currentBidder, soldAmount: auction.currentBid },
        }),
        prisma.activeAuction.update({
          where: { roomId },
          data: { status: 'sold', endedAt: new Date() },
        }),
        prisma.roomParticipant.updateMany({
          where: { roomId, userId: auction.currentBidder },
          data: { budget: { decrement: auction.currentBid } },
        }),
      ]);

      broadcast(roomId, {
        type: 'player_sold',
        data: {
          playerId: auction.playerId,
          winner: auction.currentBidder,
          winnerName: auction.currentBidderName,
          amount: Number(auction.currentBid),
        },
      });

      const winner = await prisma.roomParticipant.findUnique({
        where: { roomId_userId: { roomId, userId: auction.currentBidder } },
      });
      broadcast(roomId, {
        type: 'budget_updated',
        data: { userId: auction.currentBidder, newBudget: Number(winner?.budget ?? 0) },
      });
    }

    await prisma.activeAuction.delete({ where: { roomId } });
    await auctionCache.invalidate(roomId);

    const remaining = await prisma.auctionPlayer.count({ where: { roomId, status: 'available' } });

    if (remaining > 0) {
      broadcast(roomId, { type: 'nomination_open' });
    } else {
      await prisma.room.update({ where: { id: roomId }, data: { status: 'completed' } });

      const participants = await prisma.roomParticipant.findMany({
        where: { roomId },
        include: { user: true },
        orderBy: { budget: 'desc' },
      });
      const results = await Promise.all(
        participants.map(async (p) => {
          const wonPlayers = await prisma.auctionPlayer.findMany({
            where: { roomId, ownedBy: p.userId },
            include: { player: true },
          });
          return {
            userId: p.userId,
            displayName: p.user.displayName,
            budget: Number(p.budget),
            players: wonPlayers.map((ap) => ({
              id: ap.player.id, name: ap.player.name, position: ap.player.position,
              team: ap.player.team, rating: ap.player.rating, photoUrl: ap.player.photoUrl,
              status: ap.status, ownedBy: ap.ownedBy,
            })),
          };
        }),
      );
      broadcast(roomId, { type: 'auction_complete', data: { results } });
    }
  } finally {
    closingRooms.delete(roomId);
  }
}
