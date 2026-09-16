// path: lib/rateLimit.js

import { prisma } from "./prisma";

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS_PER_IP = 15;

export async function checkIpRateLimit(ip) {
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60000);

  try {
    const count = await prisma.loginAttempt.count({
      where: {
        ip_address: ip,
        success: false,
        created_at: { gte: windowStart },
      },
    });

    if (count >= MAX_ATTEMPTS_PER_IP) {
      return {
        limited: true,
        reason: `Too many login attempts from this network. Please try again in ${WINDOW_MINUTES} minutes.`,
      };
    }
    return { limited: false };
  } catch (err) {
    return { limited: false }; // fail open on infra errors rather than locking everyone out
  }
}

export async function recordLoginAttempt(ip, email, success) {
  await prisma.loginAttempt.create({
    data: { ip_address: ip, email, success },
  });
}

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
  if (realIpHeader)
    return Array.isArray(realIpHeader)
      ? realIpHeader[0].trim()
      : realIpHeader.trim();

  return "127.0.0.1";
}
