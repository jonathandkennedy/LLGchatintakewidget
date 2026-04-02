type TimelineEvent = {
  id: string;
  type: "created" | "answer" | "call" | "sms" | "status" | "assigned" | "note";
  title: string;
  detail?: string;
  timestamp: string;
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

const TYPE_COLORS: Record<string, string> = {
  created: "warm",
  answer: "cool",
  call: "medium",
  sms: "medium",
  status: "warm",
  assigned: "cool",
  note: "cold",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LeadTimeline({ lead, answers, calls, sms }: { lead: Record<string, any>; answers: any[]; calls: any[]; sms: any[] }) {
  const events: TimelineEvent[] = [];

  // Lead created
  events.push({
    id: "created",
    type: "created",
    title: "Lead created",
    detail: lead.matter_type ?? undefined,
    timestamp: lead.created_at,
  });

  // Answers
  for (const a of answers) {
    events.push({
      id: `answer-${a.id}`,
      type: "answer",
      title: `Answered: ${a.field_key}`,
      detail: a.value_text ?? JSON.stringify(a.value_json),
      timestamp: a.created_at,
    });
  }

  // Calls
  for (const c of calls) {
    events.push({
      id: `call-${c.id}`,
      type: "call",
      title: `Call ${c.status}`,
      detail: c.destination_number_e164,
      timestamp: c.started_at,
    });
  }

  // SMS
  for (const s of sms) {
    events.push({
      id: `sms-${s.id}`,
      type: "sms",
      title: `SMS ${s.direction}: ${s.status}`,
      detail: s.message_body?.slice(0, 60),
      timestamp: s.created_at,
    });
  }

  // Assignment
  if (lead.assigned_at) {
    events.push({
      id: "assigned",
      type: "assigned",
      title: `Assigned to ${lead.assigned_to_name ?? "team member"}`,
      timestamp: lead.assigned_at,
    });
  }

  // Sort chronologically
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="timeline">
      {events.map((event, idx) => (
        <div key={event.id} className="timeline-item">
          <div className="timeline-line-col">
            <div className={`timeline-dot score-${TYPE_COLORS[event.type] ?? "cold"}`} />
            {idx < events.length - 1 && <div className="timeline-line" />}
          </div>
          <div className="timeline-content">
            <div className="timeline-title">{event.title}</div>
            {event.detail && <div className="timeline-detail">{event.detail}</div>}
            <div className="timeline-time">{timeAgo(event.timestamp)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
