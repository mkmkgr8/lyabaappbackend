import { PrismaClient, PlayerPosition } from '@prisma/client';

const prisma = new PrismaClient();

const players: { name: string; position: PlayerPosition; team: string; rating: number }[] = [
  { name: 'Mohamed Salah',         position: 'FWD', team: 'Liverpool',     rating: 89 },
  { name: 'Erling Haaland',        position: 'FWD', team: 'Man City',      rating: 91 },
  { name: 'Kevin De Bruyne',       position: 'MID', team: 'Man City',      rating: 91 },
  { name: 'Alisson',               position: 'GK',  team: 'Liverpool',     rating: 88 },
  { name: 'Virgil van Dijk',       position: 'DEF', team: 'Liverpool',     rating: 88 },
  { name: 'Vinicius Jr',           position: 'FWD', team: 'Real Madrid',   rating: 91 },
  { name: 'Jude Bellingham',       position: 'MID', team: 'Real Madrid',   rating: 89 },
  { name: 'Trent Alexander-Arnold',position: 'DEF', team: 'Real Madrid',   rating: 87 },
  { name: 'Bukayo Saka',           position: 'FWD', team: 'Arsenal',       rating: 87 },
  { name: 'Martin Odegaard',       position: 'MID', team: 'Arsenal',       rating: 87 },
  { name: 'Declan Rice',           position: 'MID', team: 'Arsenal',       rating: 86 },
  { name: 'David Raya',            position: 'GK',  team: 'Arsenal',       rating: 85 },
  { name: 'William Saliba',        position: 'DEF', team: 'Arsenal',       rating: 86 },
  { name: 'Cole Palmer',           position: 'MID', team: 'Chelsea',       rating: 86 },
  { name: 'Robert Sanchez',        position: 'GK',  team: 'Chelsea',       rating: 80 },
  { name: 'Lautaro Martinez',      position: 'FWD', team: 'Inter Milan',   rating: 87 },
  { name: 'Rodri',                 position: 'MID', team: 'Man City',      rating: 91 },
  { name: 'Phil Foden',            position: 'MID', team: 'Man City',      rating: 88 },
  { name: 'Ruben Dias',            position: 'DEF', team: 'Man City',      rating: 88 },
  { name: 'Ederson',               position: 'GK',  team: 'Man City',      rating: 88 },
  { name: 'Marcus Rashford',       position: 'FWD', team: 'Aston Villa',   rating: 82 },
  { name: 'Ollie Watkins',         position: 'FWD', team: 'Aston Villa',   rating: 85 },
  { name: 'Emiliano Martinez',     position: 'GK',  team: 'Aston Villa',   rating: 85 },
  { name: 'Lamine Yamal',          position: 'FWD', team: 'Barcelona',     rating: 86 },
  { name: 'Pedri',                 position: 'MID', team: 'Barcelona',     rating: 87 },
  { name: 'Marc-Andre ter Stegen', position: 'GK',  team: 'Barcelona',     rating: 85 },
  { name: 'Kylian Mbappe',         position: 'FWD', team: 'Real Madrid',   rating: 91 },
  { name: 'Aurelien Tchouameni',   position: 'MID', team: 'Real Madrid',   rating: 84 },
  { name: 'Antonio Rudiger',       position: 'DEF', team: 'Real Madrid',   rating: 84 },
  { name: 'Thibaut Courtois',      position: 'GK',  team: 'Real Madrid',   rating: 90 },
  { name: 'Harry Kane',            position: 'FWD', team: 'Bayern Munich', rating: 89 },
  { name: 'Jamal Musiala',         position: 'MID', team: 'Bayern Munich', rating: 87 },
  { name: 'Manuel Neuer',          position: 'GK',  team: 'Bayern Munich', rating: 84 },
  { name: 'Leroy Sane',            position: 'FWD', team: 'Bayern Munich', rating: 84 },
  { name: 'Alexander Isak',        position: 'FWD', team: 'Newcastle',     rating: 84 },
];

async function main() {
  console.log('Seeding players...');
  // Clear existing and re-seed so the script is idempotent
  await prisma.player.deleteMany({});
  await prisma.player.createMany({ data: players });
  console.log(`Seeded ${players.length} players.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
