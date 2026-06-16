import { createClient } from "@supabase/supabase-js";

type HealthResponse = {
  ok: boolean;
  configured: boolean;
  usingServiceRole: boolean;
  urlHost?: string;
  tableCheck?: "ok" | "failed" | "skipped";
  error?: string;
};

export default async function handler(_request: unknown, response: {
  status: (code: number) => { json: (body: HealthResponse) => void };
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = serviceRoleKey || anonKey;

  if (!supabaseUrl || !key) {
    response.status(500).json({
      ok: false,
      configured: false,
      usingServiceRole: Boolean(serviceRoleKey),
      tableCheck: "skipped",
      error: "Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key.",
    });
    return;
  }

  if (supabaseUrl.includes("/rest/v1")) {
    response.status(500).json({
      ok: false,
      configured: true,
      usingServiceRole: Boolean(serviceRoleKey),
      tableCheck: "skipped",
      error: "NEXT_PUBLIC_SUPABASE_URL must be the project URL, not the /rest/v1 endpoint.",
    });
    return;
  }

  const url = new URL(supabaseUrl);
  const supabase = createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (error) {
    response.status(500).json({
      ok: false,
      configured: true,
      usingServiceRole: Boolean(serviceRoleKey),
      urlHost: url.host,
      tableCheck: "failed",
      error: error.message,
    });
    return;
  }

  response.status(200).json({
    ok: true,
    configured: true,
    usingServiceRole: Boolean(serviceRoleKey),
    urlHost: url.host,
    tableCheck: "ok",
  });
}
