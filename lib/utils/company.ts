/**
 * Company data fetching utilities
 */
import { prisma } from "@/lib/prisma";

export async function getCompanyBasic(companyId: string) {
  return prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      logoUrl: true,
    },
  });
}

export async function getCompanyWithAddresses(companyId: string) {
  return prisma.company.findUnique({
    where: { id: companyId },
    include: {
      addresses: true,
    },
  });
}

