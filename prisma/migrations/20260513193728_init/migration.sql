-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('waiting', 'live', 'completed');

-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('GK', 'DEF', 'MID', 'FWD');

-- CreateEnum
CREATE TYPE "AuctionPlayerStatus" AS ENUM ('available', 'active', 'sold', 'unsold');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('active', 'sold');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "code" CHAR(6) NOT NULL,
    "created_by" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'waiting',
    "timer_duration" INTEGER NOT NULL DEFAULT 10,
    "starting_budget" BIGINT NOT NULL DEFAULT 100000000,
    "min_increment" BIGINT NOT NULL DEFAULT 1000000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_participants" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "budget" BIGINT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" "PlayerPosition" NOT NULL,
    "team" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "photo_url" TEXT,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_players" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "status" "AuctionPlayerStatus" NOT NULL DEFAULT 'available',
    "owned_by" TEXT,
    "sold_amount" BIGINT,

    CONSTRAINT "auction_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "active_auctions" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "nominated_by" TEXT NOT NULL,
    "current_bid" BIGINT NOT NULL,
    "current_bidder" TEXT,
    "current_bidder_name" TEXT,
    "timer_ends_at" BIGINT NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "active_auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bid_history" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "auction_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "placed_at" BIGINT NOT NULL,

    CONSTRAINT "bid_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_code_key" ON "rooms"("code");

-- CreateIndex
CREATE UNIQUE INDEX "room_participants_room_id_user_id_key" ON "room_participants"("room_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auction_players_room_id_player_id_key" ON "auction_players"("room_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "active_auctions_room_id_key" ON "active_auctions"("room_id");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_participants" ADD CONSTRAINT "room_participants_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_participants" ADD CONSTRAINT "room_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_players" ADD CONSTRAINT "auction_players_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_players" ADD CONSTRAINT "auction_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_players" ADD CONSTRAINT "auction_players_owned_by_fkey" FOREIGN KEY ("owned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_auctions" ADD CONSTRAINT "active_auctions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_auctions" ADD CONSTRAINT "active_auctions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_auctions" ADD CONSTRAINT "active_auctions_nominated_by_fkey" FOREIGN KEY ("nominated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_auctions" ADD CONSTRAINT "active_auctions_current_bidder_fkey" FOREIGN KEY ("current_bidder") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_history" ADD CONSTRAINT "bid_history_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_history" ADD CONSTRAINT "bid_history_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "active_auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_history" ADD CONSTRAINT "bid_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
