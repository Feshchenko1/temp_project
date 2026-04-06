import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tags = [
    "Piano", "Jazz", "Classical", "Advanced", 
    "Theory", "Vocals", "Intermediate", "Beginner",
    "Guitar", "Violin", "Composition", "Technique"
  ];

  console.log("Seeding score tags...");
  
  for (const name of tags) {
    await prisma.scoreTag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
