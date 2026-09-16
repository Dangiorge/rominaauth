// path: app/api/system/active-theme/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const DEFAULT_THEME = {
  name: "Romina PLC",
  logo_url: null,
  primary_color: "#0f172a",
  secondary_color: "#94a3b8",
  accent_color: "#3b82f6",
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activeBrandId = session.user.activeBrandId;

  if (!activeBrandId || activeBrandId === "ALL") {
    const companyId = session.user.scopes?.companyIds?.[0];
    if (companyId) {
      const { data: company } = await supabaseAdmin
        .from("companies")
        .select("name, logo_url, primary_color, secondary_color, accent_color")
        .eq("id", companyId)
        .single();
      if (company) return NextResponse.json({ theme: company });
    }
    return NextResponse.json({ theme: DEFAULT_THEME });
  }

  const { data: brand } = await supabaseAdmin
    .from("brands")
    .select(
      "name, logo_url, uses_custom_theme, primary_color, secondary_color, accent_color, companies ( logo_url, primary_color, secondary_color, accent_color )",
    )
    .eq("id", activeBrandId)
    .single();

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
      accent_color: brand.companies?.accent_color || DEFAULT_THEME.accent_color,
    },
  });
}
