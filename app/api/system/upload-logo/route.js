// path: app/api/system/upload-logo/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB cap per logo — keeps the free tier's 1GB going a long way
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const scope = formData.get("scope"); // 'company' | 'brand'
  const entityId = formData.get("entityId");

  if (!file || !scope || !entityId) {
    return NextResponse.json(
      { error: "File, scope, and entityId are required." },
      { status: 400 },
    );
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPEG, WEBP, or SVG images are allowed." },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Logo must be under 2MB." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop();
  const path = `${scope}/${entityId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("org-logos")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: publicUrlData } = supabaseAdmin.storage
    .from("org-logos")
    .getPublicUrl(path);
  const logoUrl = publicUrlData.publicUrl;

  const table = scope === "company" ? "companies" : "brands";
  const { error: dbError } = await supabaseAdmin
    .from(table)
    .update({ logo_url: logoUrl })
    .eq("id", entityId);
  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ logoUrl });
}
