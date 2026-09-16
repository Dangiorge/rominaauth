// path: lib/permissions.js

import { supabaseAdmin } from "./supabase";

export async function getPermissionsForRole(roleId) {
  const { data, error } = await supabaseAdmin
    .from("role_permissions")
    .select(
      `can_view, can_create, can_edit, can_delete, custom_flags,
       registered_paths ( id, path, label, icon, category, parent_id, is_sidebar_visible )`,
    )
    .eq("role_id", roleId);

  if (error) throw error;

  // Flatten nested registered_paths into the same shape the old SQL join produced
  return data.map((row) => ({
    can_view: row.can_view,
    can_create: row.can_create,
    can_edit: row.can_edit,
    can_delete: row.can_delete,
    custom_flags: row.custom_flags,
    path_id: row.registered_paths.id,
    path: row.registered_paths.path,
    label: row.registered_paths.label,
    icon: row.registered_paths.icon,
    category: row.registered_paths.category,
    parent_id: row.registered_paths.parent_id,
    is_sidebar_visible: row.registered_paths.is_sidebar_visible,
  }));
}

export function pathIsAllowed(pathname, permissions) {
  return permissions.some((p) => p.can_view && matchPath(pathname, p.path));
}

function matchPath(pathname, registeredPath) {
  if (pathname === registeredPath) return true;
  return pathname.startsWith(registeredPath + "/");
}
