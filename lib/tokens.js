// path: lib/tokens.js

import crypto from "crypto";
import { prisma } from "./prisma";

export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createAuthToken(userId, type, expiresInMinutes = 60) {
  const token = generateToken();
  const expires_at = new Date(Date.now() + expiresInMinutes * 60000);

  await prisma.authToken.create({
    data: { user_id: userId, token, type, expires_at },
  });
  return token;
}

export async function consumeAuthToken(token, expectedType) {
  const record = await prisma.authToken.findUnique({ where: { token } });

  if (!record || record.type !== expectedType)
    throw new Error("Invalid or unrecognized token.");
  if (record.used_at) throw new Error("This link has already been used.");
  if (record.expires_at < new Date())
    throw new Error("This link has expired. Please request a new one.");

  await prisma.authToken.update({
    where: { id: record.id },
    data: { used_at: new Date() },
  });
  return record.user_id;
}
