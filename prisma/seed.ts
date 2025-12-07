import { PrismaClient, UserRole, CompanyType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10);

  // Create a buyer company (e.g., Nescafe)
  const buyerCompany = await prisma.company.upsert({
    where: { id: "buyer-company-seed" },
    update: {},
    create: {
      id: "buyer-company-seed",
      name: "Nescafe",
      type: CompanyType.BUYER,
    },
  });

  // Create a seller company (e.g., Mysore Coffee Farms)
  const sellerCompany = await prisma.company.upsert({
    where: { id: "seller-company-seed" },
    update: {},
    create: {
      id: "seller-company-seed",
      name: "Mysore Coffee Farms",
      type: CompanyType.SELLER,
    },
  });

  // Create a buyer user (belongs to buyer company)
  const buyer = await prisma.user.upsert({
    where: { email: "buyer@example.com" },
    update: {
      companyId: buyerCompany.id,
      role: UserRole.OWNER,
    },
    create: {
      email: "buyer@example.com",
      passwordHash: hashedPassword,
      name: "Test Buyer",
      role: UserRole.OWNER,
      companyId: buyerCompany.id,
    },
  });

  // Create a seller user (belongs to seller company)
  const seller = await prisma.user.upsert({
    where: { email: "seller@example.com" },
    update: {
      companyId: sellerCompany.id,
      role: UserRole.OWNER,
    },
    create: {
      email: "seller@example.com",
      passwordHash: hashedPassword,
      name: "Test Seller",
      role: UserRole.OWNER,
      companyId: sellerCompany.id,
    },
  });

  console.log("Created companies and users:", { 
    buyerCompany, 
    sellerCompany, 
    buyer, 
    seller 
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
