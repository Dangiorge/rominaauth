// path: lib/rateLimit.js

import { supabaseAdmin } from "./supabase";

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS_PER_IP = 15;

export async function checkIpRateLimit(ip) {
  const windowStart = new Date(
    Date.now() - WINDOW_MINUTES * 60000,
  ).toISOString();

  const { count, error } = await supabaseAdmin
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_address", ip)
    .eq("success", false)
    .gte("created_at", windowStart);

  if (error) return { limited: false };

  if (count >= MAX_ATTEMPTS_PER_IP) {
    return {
      limited: true,
      reason: `Too many login attempts from this network. Please try again in ${WINDOW_MINUTES} minutes.`,
    };
  }
  return { limited: false };
}

export async function recordLoginAttempt(ip, email, success) {
  await supabaseAdmin
    .from("login_attempts")
    .insert({ ip_address: ip, email, success });
}

// Handles both possible shapes NextAuth v4's authorize() may pass as `req`:
// - A Fetch API Request/Headers object (has .get())
// - A plain object with a headers dictionary (some runtimes/versions)
// Falls back to 127.0.0.1 (not 'unknown') so local dev and any edge case never breaks the rate limiter's IN key type.
export function getClientIp(req) {
  if (!req || !req.headers) return "127.0.0.1";

  const headers = req.headers;

  if (typeof headers.get === "function") {
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    const realIp = headers.get("x-real-ip");
    if (realIp) return realIp.trim();
    return "127.0.0.1";
  }

  const forwardedHeader = headers["x-forwarded-for"];
  if (forwardedHeader) {
    const value = Array.isArray(forwardedHeader)
      ? forwardedHeader[0]
      : forwardedHeader;
    return value.split(",")[0].trim();
  }

  const realIpHeader = headers["x-real-ip"];
  if (realIpHeader) {
    return Array.isArray(realIpHeader)
      ? realIpHeader[0].trim()
      : realIpHeader.trim();
  }

  return "127.0.0.1";
}
