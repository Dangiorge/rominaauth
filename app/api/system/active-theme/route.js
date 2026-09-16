import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_THEME = {
  name: "Romina PLC",
  logo_url: null,
  primary_color: "#0f172a",
  secondary_color: "#94a3b8",
  accent_color: "#3b82f6",
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const activeBrandId = session.user.activeBrandId;

    if (!activeBrandId || activeBrandId === "ALL") {
      const companyId = session.user.scopes?.companyIds?.[0];
      if (companyId) {
        const company = await prisma.companies.findUnique({
          where: { id: companyId },
          select: {
            name: true,
            logo_url: true,
            primary_color: true,
            secondary_color: true,
            accent_color: true,
          },
        });
        if (company) return NextResponse.json({ theme: company });
      }
      return NextResponse.json({ theme: DEFAULT_THEME });
    }

    const brand = await prisma.brands.findUnique({
      where: { id: activeBrandId },
      select: {
        name: true,
        logo_url: true,
        uses_custom_theme: true,
        primary_color: true,
        secondary_color: true,
        accent_color: true,
        companies: {
          select: {
            logo_url: true,
            primary_color: true,
            secondary_color: true,
            accent_color: true,
          },
        },
      },
    });

    if (!brand) return NextResponse.json({ theme: DEFAULT_THEME });

    if (brand.uses_custom_theme) {
      return NextResponse.json({
        theme: {
          name: brand.name,
          logo_url: brand.logo_url || brand.companies?.logo_url,
          primary_color: brand.primary_color,
          secondary_color: brand.secondary_color,
          accent_color: brand.accent_color,
        },
      });
    }

    return NextResponse.json({
      theme: {
        name: brand.name,
        logo_url: brand.logo_url || brand.companies?.logo_url,
        primary_color:
          brand.companies?.primary_color || DEFAULT_THEME.primary_color,
        secondary_color:
          brand.companies?.secondary_color || DEFAULT_THEME.secondary_color,
        accent_color:
          brand.companies?.accent_color || DEFAULT_THEME.accent_color,
      },
    });
  } catch (error) {
    console.error("Failed to load active theme:", error);
    return NextResponse.json({ theme: DEFAULT_THEME }, { status: 500 });
  }
}
