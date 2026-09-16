// path: components/auth/PermissionGuard.jsx

"use client";

import { useSession } from "next-auth/react";

export default function PermissionGuard({
  path,
  action = "view",
  customFlag,
  children,
}) {
  const { data: session } = useSession();

  if (!session) return null;
  if (session.user.roleName === "super_admin") return children;

  const permissions = session.user.permissions || [];
  const perm = permissions.find((p) => p.path === path);
  if (!perm) return null;

  if (customFlag) {
    return perm.custom_flags?.[customFlag] ? children : null;
  }

  const flagMap = {
    view: "can_view",
    create: "can_create",
    edit: "can_edit",
    delete: "can_delete",
  };

  return perm[flagMap[action]] ? children : null;
}
