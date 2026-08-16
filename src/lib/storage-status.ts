/**
 * Reports which durable storage stores are configured (and optionally tests
 * live connectivity). Never exposes tokens — only booleans.
 */
import { kvConfigured, kvGet } from './kv-persist';
import { supabaseConfigured, supabaseGet } from './supabase-persist';

export interface StoreStatus {
  configured: boolean;
  connected: boolean | null; // null = not tested
}

export interface StorageStatus {
  durable: boolean;
  redis: StoreStatus & { env: 'upstash' | 'vercel-kv' | null };
  supabase: StoreStatus;
}

function redisEnv(): 'upstash' | 'vercel-kv' | null {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) return 'upstash';
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) return 'vercel-kv';
  return null;
}

/** test=true performs a live read against each configured store. */
export async function getStorageStatus(test = false): Promise<StorageStatus> {
  const redis: StoreStatus & { env: 'upstash' | 'vercel-kv' | null } = {
    configured: kvConfigured(),
    connected: null,
    env: redisEnv(),
  };
  const supabase: StoreStatus = { configured: supabaseConfigured(), connected: null };

  if (test) {
    if (redis.configured) {
      try { await kvGet(); redis.connected = true; }
      catch { redis.connected = false; }
    }
    if (supabase.configured) {
      try { await supabaseGet(); supabase.connected = true; }
      catch { supabase.connected = false; }
    }
  }

  return {
    durable: redis.configured || supabase.configured,
    redis,
    supabase,
  };
}
