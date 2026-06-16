import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

loadLocalEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const key = serviceRoleKey || anonKey;

if (!supabaseUrl || !key) {
  fail("Missing NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY.");
}

if (supabaseUrl.includes("/rest/v1")) {
  fail("NEXT_PUBLIC_SUPABASE_URL must be the project URL, not the /rest/v1 endpoint.");
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
  fail(`Supabase reached ${url.host}, but the profiles table check failed: ${error.message}`);
}

console.log(`Supabase connection OK: ${url.host}`);
console.log(`Server-side key mode: ${serviceRoleKey ? "service role" : "anon"}`);

function loadLocalEnvFile(filename) {
  const path = resolve(filename);

  if (!existsSync(path)) {
    return;
  }

  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const name = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");

    if (!process.env[name]) {
      process.env[name] = value;
    }
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
