type Answer = {
  id: string;
  step_key: string;
  field_key: string;
  value_text: string | null;
  value_json: unknown;
  created_at: string;
  updated_at: string;
};

type Props = {
  answers: Answer[];
  sessionStarted: string;
};

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

const STEP_LABELS: Record<string, string> = {
  matter_type: "Matter Type",
  incident_summary: "Incident Summary",
  injury_status: "Injury Status",
  injury_areas: "Injury Areas",
  medical_treatment_status: "Medical Treatment",
  incident_state: "State",
  incident_city: "City",
  incident_date_range: "When",
  full_name: "Name",
  first_name: "First Name",
  last_name: "Last Name",
  phone: "Phone",
  email: "Email",
  additional_notes: "Notes",
  file_upload: "File Upload",
  appointment: "Appointment",
};

export function SessionReplay({ answers, sessionStarted }: Props) {
  if (answers.length === 0) return <p className="muted text-sm">No session data available.</p>;

  const startTime = new Date(sessionStarted).getTime();

  return (
    <div className="replay-container">
      <div className="replay-header">
        <span className="muted text-sm">Session started: {new Date(sessionStarted).toLocaleString()}</span>
        <span className="muted text-sm">
          Total time: {formatDuration(new Date(answers[answers.length - 1].created_at).getTime() - startTime)}
        </span>
      </div>

      <div className="replay-steps">
        {answers.map((answer, idx) => {
          const elapsed = new Date(answer.created_at).getTime() - startTime;
          const prevTime = idx > 0 ? new Date(answers[idx - 1].created_at).getTime() : startTime;
          const stepDuration = new Date(answer.created_at).getTime() - prevTime;

          const value = answer.value_json
            ? (Array.isArray(answer.value_json) ? (answer.value_json as string[]).join(", ") : JSON.stringify(answer.value_json))
            : answer.value_text ?? "";

          return (
            <div key={answer.id} className="replay-step">
              <div className="replay-step-time">
                <span className="replay-elapsed">{formatDuration(elapsed)}</span>
                {stepDuration > 0 && idx > 0 && (
                  <span className={`replay-duration ${stepDuration > 30000 ? "slow" : ""}`}>
                    +{formatDuration(stepDuration)}
                  </span>
                )}
              </div>
              <div className="replay-step-dot" />
              <div className="replay-step-content">
                <div className="replay-step-label">{STEP_LABELS[answer.field_key] ?? answer.step_key}</div>
                <div className="replay-step-value">{value || "\u2014"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
