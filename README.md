# Lyaba App — Backend Service

REST API backend for the Lyaba marketplace platform,
supporting auction and trading workflows across mobile clients.

## Tech Stack

| Layer    | Technology          |
|----------|---------------------|
| Runtime  | Node.js + TypeScript|
| ORM      | Prisma              |
| Database | PostgreSQL          |
| API      | REST (Express)      |

## Features

- User authentication and session management
- Real-time auction state management
- Bid placement and validation
- Transaction history and ledger

## Project Structure
src/
controllers/   — request handlers
services/      — business logic
routes/        — API route definitions
middleware/    — auth, validation
prisma/
schema.prisma  — database schema

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```
