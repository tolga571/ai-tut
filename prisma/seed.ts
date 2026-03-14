import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("Test123!", 10);

  const testUser = await prisma.user.upsert({
    where: { email: "test@aitut.com" },
    update: { password: hashedPassword, name: "Test User", planStatus: "active" },
    create: {
      email: "test@aitut.com",
      name: "Test User",
      password: hashedPassword,
      nativeLang: "en",
      targetLang: "es",
      planStatus: "active",
    },
  });

  console.log("✅ Test user created/updated:", testUser.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
