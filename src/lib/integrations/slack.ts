/**
 * Slack notification integration.
 * Posts new lead alerts to a configured Slack webhook URL.
 * Set SLACK_WEBHOOK_URL env var to enable.
 */

type SlackLeadData = {
  name: string;
  phone: string | null;
  email: string | null;
  matterType: string | null;
  score: number | null;
  scoreTier: string | null;
  leadUrl: string;
};

const MATTER_LABELS: Record<string, string> = {
  car_accident: "Car Accident",
  truck_accident: "Truck Accident",
  motorcycle_accident: "Motorcycle Accident",
  slip_fall: "Slip & Fall",
  wrongful_death: "Wrongful Death",
  other_injury: "Other Injury",
};

const TIER_EMOJIS: Record<string, string> = {
  hot: ":fire:",
  warm: ":large_orange_circle:",
  medium: ":large_yellow_circle:",
  cool: ":large_blue_circle:",
  cold: ":white_circle:",
};

export async function sendSlackLeadNotification(data: SlackLeadData): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const matter = MATTER_LABELS[data.matterType ?? ""] ?? data.matterType ?? "Unknown";
  const tierEmoji = TIER_EMOJIS[data.scoreTier ?? ""] ?? ":question:";
  const scoreText = data.score != null ? `${tierEmoji} Score: *${data.score}* (${data.scoreTier})` : "";

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `:incoming_envelope: New Lead: ${data.name}` },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Matter:*\n${matter}` },
        { type: "mrkdwn", text: `*Phone:*\n${data.phone ?? "N/A"}` },
        { type: "mrkdwn", text: `*Email:*\n${data.email ?? "N/A"}` },
        { type: "mrkdwn", text: scoreText || "*Score:*\nN/A" },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View Lead" },
          url: data.leadUrl,
          style: "primary",
        },
      ],
    },
  ];

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });
  } catch (err) {
    console.error("[slack] Failed to send notification:", err);
  }
}
