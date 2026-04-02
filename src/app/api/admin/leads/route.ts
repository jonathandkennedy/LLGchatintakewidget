import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminAuth } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth();
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get("clientId");
  const status = searchParams.get("status");
  const matterType = searchParams.get("matterType");
  const query = searchParams.get("q");

  let builder = supabaseAdmin
    .from("leads")
    .select("id, created_at, status, matter_type, first_name, last_name, phone_e164, incident_state, incident_city, session_id", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);

  if (clientId) builder = builder.eq("client_id", clientId);
  if (status) builder = builder.eq("status", status);
  if (matterType) builder = builder.eq("matter_type", matterType);
  if (query) builder = builder.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone_e164.ilike.%${query}%`);

  const { data, count, error } = await builder;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [], total: count ?? 0 });
}
