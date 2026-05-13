import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  displayName: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user: JwtPayload;
}

export interface WsMessage {
  type: string;
  data?: Record<string, unknown>;
}

export interface PlayerDto {
  id: string;
  name: string;
  position: string;
  team: string;
  rating: number;
  photoUrl: string | null;
  status: string;
  ownedBy: string | null;
}

export interface RoomDto {
  id: string;
  code: string;
  createdBy: string;
  status: string;
  timerDuration: number;
  startingBudget: bigint | number;
  minIncrement: bigint | number;
}

export interface UserDto {
  id: string;
  displayName: string;
  budget: number;
  roomId: string | null;
}

export interface ActiveAuctionDto {
  playerId: string;
  player: PlayerDto;
  nominatedBy: string;
  currentBid: number;
  currentBidder: string;
  currentBidderName: string;
  timerEndsAt: number;
  status: string;
}
