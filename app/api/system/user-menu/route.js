// path: app/api/system/user-menu/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ paths: [] }, { status: 401 });

  if (session.user.roleName === "super_admin") {
    const { data, error } = await supabaseAdmin
      .from("registered_paths")
      .select("*")
      .eq("is_sidebar_visible", true)
      .order("category", { ascending: true })
      .order("label", { ascending: true });

    if (error) return NextResponse.json({ paths: [] }, { status: 500 });
    return NextResponse.json({ paths: data });
  }

  const paths = (session.user.permissions || [])
    .filter((p) => p.can_view && p.is_sidebar_visible)
    .map((p) => ({
      path: p.path,
      label: p.label,
      icon: p.icon,
      category: p.category,
    }));

  return NextResponse.json({ paths });
}
