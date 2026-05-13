import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { config } from '../config';
import { UserDto } from '../types';

function signToken(userId: string, displayName: string): string {
  return jwt.sign({ sub: userId, displayName }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

async function buildUserDto(userId: string): Promise<UserDto> {
  const participant = await prisma.roomParticipant.findFirst({
    where: {
      userId,
      room: { status: { in: ['waiting', 'live'] } },
    },
    orderBy: { joinedAt: 'desc' },
    select: { budget: true, roomId: true },
  });
  return {
    id: userId,
    displayName: '',
    budget: participant ? Number(participant.budget) : 0,
    roomId: participant?.roomId ?? null,
  };
}

export async function register(email: string, password: string, displayName: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw Object.assign(new Error('Email already in use'), { status: 400 });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash, displayName } });

  const token = signToken(user.id, user.displayName);
  const dto = await buildUserDto(user.id);
  dto.displayName = user.displayName;
  dto.id = user.id;
  return { token, user: dto };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const token = signToken(user.id, user.displayName);
  const dto = await buildUserDto(user.id);
  dto.displayName = user.displayName;
  dto.id = user.id;
  return { token, user: dto };
}

export async function getMe(userId: string): Promise<UserDto> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const dto = await buildUserDto(userId);
  dto.displayName = user.displayName;
  dto.id = user.id;
  return dto;
}
