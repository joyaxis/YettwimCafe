import { supabase } from "./supabaseClient";

export async function isAdminUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const role = (user.app_metadata as { role?: string } | null)?.role;
  return role === "admin";
}
