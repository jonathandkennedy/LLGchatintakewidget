import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminAuth } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth();
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  let builder = supabaseAdmin
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (status) builder = builder.eq("status", status);
  if (q) builder = builder.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone_e164.ilike.%${q}%`);

  const { data, error } = await builder;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const filename = `leads-export-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(data ?? [], null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
