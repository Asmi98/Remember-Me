import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/types/supabase";
type Category = Database["public"]["Tables"]["categories"]["Row"];

/**
 * Ensures there is an 'Uncategorized' category for the current user.
 * Returns the category row.
 */
export async function ensureUncategorizedCategory(): Promise<Category | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;
  const userId = userData.user.id;

  // Try to find existing uncategorized category
  const { data: existing, error: findError } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', 'Uncategorized')
    .maybeSingle();
  if (findError) return null;
  if (existing) return existing;

  // Create if not exists
  const { data: created, error: createError } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: 'Uncategorized',
      icon_url: null,
    })
    .select()
    .single();
  if (createError) return null;
  return created;
}

/**
 * Migrates all passwords with null category_id to the user's 'Uncategorized' category.
 */
export async function migratePasswordsToUncategorized() {
  const uncategorized = await ensureUncategorizedCategory();
  if (!uncategorized) return;
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return;
  const userId = userData.user.id;

  await supabase
    .from('passwords')
    .update({ category_id: uncategorized.id })
    .eq('user_id', userId)
    .is('category_id', null);
}
