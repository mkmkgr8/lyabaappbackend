import { AuctionCache } from './types';
import { dbCache } from './dbCache';

// Swap dbCache → redisCache here when adding Redis.
// Every caller imports from this file so nothing else changes.
export const auctionCache: AuctionCache = dbCache;
