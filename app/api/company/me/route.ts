import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType } from "@prisma/client";

// GET /api/company/me - Fetch the logged-in user's company
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      include: {
        addresses: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/company/me - Update the logged-in user's company
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, type, logoUrl, phone, country, state, city, email, pocName, pocPosition } = body;

    // Only allow updating specific fields
    const updateData: {
      name?: string;
      type?: CompanyType;
      logoUrl?: string | null;
      phone?: string | null;
      email?: string | null;
      pocName?: string | null;
      pocPosition?: string | null;
      country?: string | null;
      state?: string | null;
      city?: string | null;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (type !== undefined) {
      // Validate company type
      const validTypes: CompanyType[] = ["BUYER", "SELLER"];
      if (validTypes.includes(type as CompanyType)) {
        updateData.type = type as CompanyType;
      }
    }
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (email !== undefined) updateData.email = email || null;
    if (pocName !== undefined) updateData.pocName = pocName || null;
    if (pocPosition !== undefined) updateData.pocPosition = pocPosition || null;
    if (country !== undefined) updateData.country = country || null;
    if (state !== undefined) updateData.state = state || null;
    if (city !== undefined) updateData.city = city || null;

    const company = await prisma.company.update({
      where: { id: session.user.companyId },
      data: updateData,
      include: {
        addresses: true,
      },
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error updating company:", error);
    
    // Handle Prisma not found error
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

