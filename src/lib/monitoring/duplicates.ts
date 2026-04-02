import { supabaseAdmin } from "@/lib/supabase/admin";

type DuplicateCheck = {
  phone?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

type DuplicateResult = {
  isDuplicate: boolean;
  matchedLeadId: string | null;
  matchType: "phone" | "email" | "name" | null;
  previousCreatedAt: string | null;
};

/**
 * Check if a lead is a duplicate based on phone, email, or full name.
 * Looks for leads created within the last 30 days.
 */
export async function checkDuplicate(data: DuplicateCheck): Promise<DuplicateResult> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Check by phone (strongest signal)
  if (data.phone) {
    const { data: phoneMatch } = await supabaseAdmin
      .from("leads")
      .select("id, created_at")
      .eq("phone_e164", data.phone)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (phoneMatch) {
      return { isDuplicate: true, matchedLeadId: phoneMatch.id, matchType: "phone", previousCreatedAt: phoneMatch.created_at };
    }
  }

  // Check by email
  if (data.email) {
    const { data: emailMatch } = await supabaseAdmin
      .from("leads")
      .select("id, created_at")
      .eq("email", data.email.toLowerCase())
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (emailMatch) {
      return { isDuplicate: true, matchedLeadId: emailMatch.id, matchType: "email", previousCreatedAt: emailMatch.created_at };
    }
  }

  // Check by full name (weaker signal)
  if (data.firstName && data.lastName) {
    const { data: nameMatch } = await supabaseAdmin
      .from("leads")
      .select("id, created_at")
      .ilike("first_name", data.firstName)
      .ilike("last_name", data.lastName)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (nameMatch) {
      return { isDuplicate: true, matchedLeadId: nameMatch.id, matchType: "name", previousCreatedAt: nameMatch.created_at };
    }
  }

  return { isDuplicate: false, matchedLeadId: null, matchType: null, previousCreatedAt: null };
}

/**
 * Flag a lead as a duplicate in the database.
 */
export async function flagDuplicate(leadId: string, matchedLeadId: string, matchType: string): Promise<void> {
  await supabaseAdmin.from("leads").update({
    is_duplicate: true,
    duplicate_of: matchedLeadId,
    duplicate_match_type: matchType,
  }).eq("id", leadId);
}
