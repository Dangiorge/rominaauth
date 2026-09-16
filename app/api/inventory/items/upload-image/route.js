// path: app/api/inventory/items/upload-image/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.roleName !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const itemId = formData.get("itemId");

  if (!file || !itemId)
    return NextResponse.json(
      { error: "File and itemId are required." },
      { status: 400 },
    );
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json(
      { error: "Only PNG, JPEG, or WEBP images are allowed." },
      { status: 400 },
    );
  if (file.size > MAX_SIZE_BYTES)
    return NextResponse.json(
      { error: "Image must be under 2MB." },
      { status: 400 },
    );

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop();
  const path = `${itemId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("item-images")
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: publicUrlData } = supabaseAdmin.storage
    .from("item-images")
    .getPublicUrl(path);
  const imageUrl = publicUrlData.publicUrl;

  const { error: dbError } = await supabaseAdmin
    .from("master_items")
    .update({ image_url: imageUrl })
    .eq("id", itemId);
  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ imageUrl });
}
