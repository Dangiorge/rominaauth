// path: app/api/auth/verify-email/route.js

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { consumeAuthToken } from "@/lib/tokens";

export async function POST(req) {
  const { token } = await req.json();
  if (!token)
    return NextResponse.json({ error: "Token is required." }, { status: 400 });

  let userId;
  try {
    userId = await consumeAuthToken(token, "email_verify");
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ email_verified_at: new Date().toISOString() })
    .eq("id", userId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
