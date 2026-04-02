import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminAuth } from "@/lib/auth/api-auth";

const CSV_COLUMNS = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "phone_e164", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "matter_type", label: "Matter Type" },
  { key: "status", label: "Status" },
  { key: "incident_state", label: "State" },
  { key: "incident_city", label: "City" },
  { key: "incident_summary", label: "Incident Summary" },
  { key: "injury_status", label: "Injury Status" },
  { key: "injury_areas", label: "Injury Areas" },
  { key: "medical_treatment_status", label: "Medical Treatment" },
  { key: "incident_date_range", label: "Incident Date" },
  { key: "additional_notes", label: "Notes" },
  { key: "created_at", label: "Created" },
] as const;

type ColumnKey = typeof CSV_COLUMNS[number]["key"];

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = String(value);
  if (Array.isArray(value)) str = value.join(", ");
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth();
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get("clientId");
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  let builder = supabaseAdmin
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (clientId) builder = builder.eq("client_id", clientId);
  if (status) builder = builder.eq("status", status);
  if (q) builder = builder.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone_e164.ilike.%${q}%`);

  const { data, error } = await builder;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as Array<Record<string, any>>;

  // Build CSV
  const header = CSV_COLUMNS.map((c) => c.label).join(",");
  const body = rows.map((row) =>
    CSV_COLUMNS.map((col) => escapeCsv(row[col.key])).join(",")
  ).join("\n");

  const csv = header + "\n" + body;
  const filename = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
