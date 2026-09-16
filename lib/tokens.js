// path: lib/tokens.js

import crypto from "crypto";
import { supabaseAdmin } from "./supabase";

export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createAuthToken(userId, type, expiresInMinutes = 60) {
  const token = generateToken();
  const expires_at = new Date(
    Date.now() + expiresInMinutes * 60000,
  ).toISOString();

  const { error } = await supabaseAdmin
    .from("auth_tokens")
    .insert({ user_id: userId, token, type, expires_at });

  if (error) throw error;
  return token;
}

// Validates a token, marks it used, and returns the associated user_id. Throws a descriptive error otherwise.
export async function consumeAuthToken(token, expectedType) {
  const { data: record, error } = await supabaseAdmin
    .from("auth_tokens")
    .select("*")
    .eq("token", token)
    .eq("type", expectedType)
    .single();

  if (error || !record) throw new Error("Invalid or unrecognized token.");
  if (record.used_at) throw new Error("This link has already been used.");
  if (new Date(record.expires_at) < new Date())
    throw new Error("This link has expired. Please request a new one.");

  await supabaseAdmin
    .from("auth_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", record.id);

  return record.user_id;
}
