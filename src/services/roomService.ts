import { prisma } from '../db/prisma';
import { RoomDto } from '../types';

function toRoomDto(room: {
  id: string; code: string; createdBy: string; status: string;
  timerDuration: number; startingBudget: bigint; minIncrement: bigint;
}): RoomDto {
  return {
    id: room.id,
    code: room.code,
    createdBy: room.createdBy,
    status: room.status,
    timerDuration: room.timerDuration,
    startingBudget: Number(room.startingBudget),
    minIncrement: Number(room.minIncrement),
  };
}

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createRoom(
  userId: string,
  startingBudget: number,
  minIncrement: number,
  timerDuration: number,
): Promise<RoomDto> {
  if (minIncrement < 1) throw Object.assign(new Error('minIncrement must be at least 1'), { status: 422 });

  let code = '';
  let attempts = 0;
  while (attempts < 5) {
    code = generateCode();
    const existing = await prisma.room.findUnique({ where: { code } });
    if (!existing) break;
    attempts++;
    if (attempts === 5) throw Object.assign(new Error('Could not generate unique room code'), { status: 500 });
  }

  const room = await prisma.room.create({
    data: {
      code,
      createdBy: userId,
      startingBudget,
      minIncrement,
      timerDuration,
      participants: {
        create: { userId, budget: startingBudget },
      },
    },
  });

  return toRoomDto(room);
}

export async function joinRoom(userId: string, code: string): Promise<RoomDto> {
  const room = await prisma.room.findUnique({ where: { code } });
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
  if (room.status !== 'waiting') throw Object.assign(new Error('Room is not in waiting status'), { status: 400 });

  const existing = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId: room.id, userId } },
  });
  if (existing) throw Object.assign(new Error('Already joined this room'), { status: 409 });

  await prisma.roomParticipant.create({
    data: { roomId: room.id, userId, budget: room.startingBudget },
  });

  return toRoomDto(room);
}

export async function getRoom(roomId: string): Promise<RoomDto> {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
  return toRoomDto(room);
}

export async function startRoom(userId: string, roomId: string): Promise<void> {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
  if (room.createdBy !== userId) throw Object.assign(new Error('Only the creator can start the room'), { status: 403 });
  if (room.status !== 'waiting') throw Object.assign(new Error('Room is not in waiting status'), { status: 400 });

  const count = await prisma.roomParticipant.count({ where: { roomId } });
  if (count < 2) throw Object.assign(new Error('Need at least 2 participants to start'), { status: 400 });

  await prisma.room.update({ where: { id: roomId }, data: { status: 'live' } });
}

export async function getRoomResults(roomId: string) {
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
          id: ap.player.id,
          name: ap.player.name,
          position: ap.player.position,
          team: ap.player.team,
          rating: ap.player.rating,
          photoUrl: ap.player.photoUrl,
          status: ap.status,
          ownedBy: ap.ownedBy,
        })),
      };
    }),
  );

  return results;
}
