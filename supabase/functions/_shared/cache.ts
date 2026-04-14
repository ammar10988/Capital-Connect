import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function createCacheClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role environment variables are not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getClient(client?: SupabaseClient) {
  return client ?? createCacheClient();
}

export async function get<T>(key: string, client?: SupabaseClient): Promise<T | null> {
  const serviceClient = getClient(client);
  const { data, error } = await serviceClient
    .from("cache_entries")
    .select("value, expires_at")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    await serviceClient.from("cache_entries").delete().eq("key", key);
    return null;
  }

  return data.value as T;
}

export async function set(
  key: string,
  value: unknown,
  ttlSeconds: number,
  client?: SupabaseClient,
) {
  const serviceClient = getClient(client);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const { error } = await serviceClient.from("cache_entries").upsert({
    key,
    value,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function invalidate(key: string, client?: SupabaseClient) {
  const serviceClient = getClient(client);
  const { error } = await serviceClient.from("cache_entries").delete().eq("key", key);

  if (error) {
    throw new Error(error.message);
  }
}

export async function cleanup(client?: SupabaseClient) {
  const serviceClient = getClient(client);
  const { error } = await serviceClient
    .from("cache_entries")
    .delete()
    .lt("expires_at", new Date().toISOString());

  if (error) {
    throw new Error(error.message);
  }
}
