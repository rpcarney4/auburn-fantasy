// Assigns a random 6-digit predictionCode to any User who doesn't have one
// yet. Safe to re-run — only fills gaps, never touches an existing code.
// Codes are printed here for manual distribution; they're never shown
// anywhere in the app itself. Run with: npx tsx scripts/generate-prediction-codes.ts

process.loadEnvFile(".env");
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function randomCode(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

async function main() {
  const users = await prisma.user.findMany({ orderBy: { displayName: "asc" } });
  const existingCodes = new Set(
    users.map((u) => u.predictionCode).filter((c): c is string => c != null)
  );

  const results: { displayName: string; code: string }[] = [];
  for (const user of users) {
    if (user.predictionCode) continue;
    let code = randomCode();
    while (existingCodes.has(code)) code = randomCode();
    existingCodes.add(code);

    await prisma.user.update({
      where: { id: user.id },
      data: { predictionCode: code },
    });
    results.push({ displayName: user.displayName, code });
  }

  if (results.length === 0) {
    console.log("Every user already has a prediction code.");
  } else {
    console.log("Generated codes (distribute these manually, then discard):");
    for (const r of results) console.log(`  ${r.displayName}: ${r.code}`);
  }
}

main().finally(() => prisma.$disconnect());
