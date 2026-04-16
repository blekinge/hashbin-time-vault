/**
 * API base URL for hashbin.
 * In production (hashbin.net), the Cloudflare Worker proxies /api/* to the edge function.
 * In development/preview, we fall back to the Supabase URL.
 */
const isProduction = window.location.hostname === "hashbin.net";

export const API_BASE = isProduction
  ? "/api"
  : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;
