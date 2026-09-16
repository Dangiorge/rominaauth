// path: lib/auth.js

import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "./supabase";
import { getPermissionsForRole } from "./permissions";
import { getUserScopes } from "./scopes";
import { checkIpRateLimit, recordLoginAttempt, getClientIp } from "./rateLimit";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function isGlobalFromScopes(roleName, scopes) {
  if (roleName === "super_admin") return true;
  return (
    (!scopes.companyIds || scopes.companyIds.length === 0) &&
    (!scopes.brandIds || scopes.brandIds.length === 0) &&
    (!scopes.branchIds || scopes.branchIds.length === 0)
  );
}

export const authOptions = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const ip = getClientIp(req);

        const ipCheck = await checkIpRateLimit(ip);
        if (ipCheck.limited) throw new Error(ipCheck.reason);

        const { data: user, error } = await supabaseAdmin
          .from("users")
          .select(
            "id, email, password_hash, full_name, is_active, role_id, failed_login_attempts, locked_until, must_change_password, roles ( id, name )",
          )
          .eq("email", credentials.email)
          .is("deleted_at", null)
          .single();

        if (error || !user) {
          await recordLoginAttempt(ip, credentials.email, false);
          throw new Error("Invalid email or password.");
        }
        if (!user.is_active) {
          await recordLoginAttempt(ip, credentials.email, false);
          throw new Error(
            "This account has been suspended. Contact an administrator.",
          );
        }
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
          await recordLoginAttempt(ip, credentials.email, false);
          const minutesLeft = Math.ceil(
            (new Date(user.locked_until) - new Date()) / 60000,
          );
          throw new Error(
            `Account temporarily locked. Try again in ${minutesLeft} minute(s).`,
          );
        }

        const valid = await bcrypt.compare(
          credentials.password,
          user.password_hash,
        );
        if (!valid) {
          await recordLoginAttempt(ip, credentials.email, false);
          const newAttempts = (user.failed_login_attempts || 0) + 1;
          const updates = { failed_login_attempts: newAttempts };
          if (newAttempts >= MAX_FAILED_ATTEMPTS) {
            updates.locked_until = new Date(
              Date.now() + LOCKOUT_MINUTES * 60000,
            ).toISOString();
          }
          await supabaseAdmin.from("users").update(updates).eq("id", user.id);
          if (newAttempts >= MAX_FAILED_ATTEMPTS) {
            throw new Error(
              `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
            );
          }
          throw new Error(
            `Invalid email or password. ${MAX_FAILED_ATTEMPTS - newAttempts} attempt(s) remaining.`,
          );
        }

        await recordLoginAttempt(ip, credentials.email, true);
        await supabaseAdmin
          .from("users")
          .update({
            failed_login_attempts: 0,
            locked_until: null,
            last_login_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        const permissions = await getPermissionsForRole(user.role_id);
        const scopes = await getUserScopes(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
          roleId: user.role_id,
          roleName: user.roles.name,
          mustChangePassword: user.must_change_password,
          permissions,
          scopes,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // First sign-in: populate the token and set a sane default active scope
      if (user) {
        token.id = user.id;
        token.roleId = user.roleId;
        token.roleName = user.roleName;
        token.permissions = user.permissions;
        token.scopes = user.scopes;
        token.mustChangePassword = user.mustChangePassword;

        const global = isGlobalFromScopes(user.roleName, user.scopes || {});
        token.activeBranchId = global
          ? "ALL"
          : (user.scopes?.primaryBranchId ??
            user.scopes?.branchIds?.[0] ??
            "ALL");
        token.activeBrandId = global
          ? "ALL"
          : (user.scopes?.brandIds?.[0] ?? "ALL");
      }

      // Client called useSession().update({...}) — validate before trusting the new value
      if (trigger === "update" && session) {
        const scopes = token.scopes || {};
        const global = isGlobalFromScopes(token.roleName, scopes);

        if ("activeBrandId" in session) {
          const requested = session.activeBrandId;
          const isValid =
            global ||
            requested === "ALL" ||
            (scopes.brandIds || []).includes(Number(requested));
          if (isValid) token.activeBrandId = requested;
        }
        if ("activeBranchId" in session) {
          const requested = session.activeBranchId;
          const isValid =
            global ||
            requested === "ALL" ||
            (scopes.branchIds || []).includes(Number(requested));
          if (isValid) token.activeBranchId = requested;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.roleId = token.roleId;
      session.user.roleName = token.roleName;
      session.user.permissions = token.permissions;
      session.user.scopes = token.scopes;
      session.user.mustChangePassword = token.mustChangePassword;
      session.user.activeBrandId = token.activeBrandId;
      session.user.activeBranchId = token.activeBranchId;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
