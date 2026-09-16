// path: lib/permissions.js

import { prisma } from "./prisma";

export async function getPermissionsForRole(roleId) {
  const rows = await prisma.rolePermission.findMany({
    where: { role_id: roleId },
    include: { path: true },
  });

  return rows.map((row) => ({
    can_view: row.can_view,
    can_create: row.can_create,
    can_edit: row.can_edit,
    can_delete: row.can_delete,
    custom_flags: row.custom_flags,
    path_id: row.path.id,
    path: row.path.path,
    label: row.path.label,
    icon: row.path.icon,
    category: row.path.category,
    parent_id: row.path.parent_id,
    is_sidebar_visible: row.path.is_sidebar_visible,
  }));
}

export function pathIsAllowed(pathname, permissions) {
  return permissions.some((p) => p.can_view && matchPath(pathname, p.path));
}

function matchPath(pathname, registeredPath) {
  if (pathname === registeredPath) return true;
  return pathname.startsWith(registeredPath + "/");
}
