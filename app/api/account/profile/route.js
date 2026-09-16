// path: app/api/account/profile/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("users")
    .select(
      "id, email, full_name, phone, address, city, country, date_of_birth, gender, job_title, department_id, email_verified_at, departments ( name )",
    )
    .eq("id", session.user.id)
    .single();

  if (error || !data)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ profile: data });
}

export async function PUT(req) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Self-service users can only edit personal fields — NOT role, email, or scopes
  const updatePayload = {
    ...("full_name" in body && { full_name: body.full_name }),
    ...("phone" in body && { phone: body.phone }),
    ...("address" in body && { address: body.address }),
    ...("city" in body && { city: body.city }),
    ...("country" in body && { country: body.country }),
    ...("date_of_birth" in body && { date_of_birth: body.date_of_birth }),
    ...("gender" in body && { gender: body.gender }),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from("users")
    .update(updatePayload)
    .eq("id", session.user.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
