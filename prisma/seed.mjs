// Seeds the Service catalog. Safe to re-run: it upserts.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SERVICES = [
  { id: "chatgpt", name: "ChatGPT", planLabel: "ChatGPT Plus", priceUsdCents: 2000, cashbackBps: 500 },
  { id: "claude", name: "Claude", planLabel: "Claude Pro", priceUsdCents: 2000, cashbackBps: 500 },
  { id: "grok", name: "Grok", planLabel: "SuperGrok", priceUsdCents: 3000, cashbackBps: 500 },
];

for (const service of SERVICES) {
  await prisma.service.upsert({
    where: { id: service.id },
    update: service,
    create: service,
  });
  console.log(`seeded ${service.id}`);
}

await prisma.$disconnect();
