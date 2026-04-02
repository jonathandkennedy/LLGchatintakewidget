/**
 * Select a welcome video based on matter type, time of day, or other conditions.
 * Configured per client via the `client_branding` table's `video_rules` JSON field.
 *
 * Example video_rules:
 * [
 *   { "matterType": "truck_accident", "videoUrl": "/videos/truck.mp4" },
 *   { "matterType": "wrongful_death", "videoUrl": "/videos/wrongful-death.mp4" },
 *   { "timeRange": "evening", "videoUrl": "/videos/evening-welcome.mp4" },
 *   { "default": true, "videoUrl": "/videos/default.mp4" }
 * ]
 */

type VideoRule = {
  matterType?: string;
  timeRange?: "morning" | "afternoon" | "evening";
  default?: boolean;
  videoUrl: string;
};

function getTimeRange(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

/**
 * Get the appropriate video URL based on conditions.
 */
export function selectVideo(
  rules: VideoRule[] | null | undefined,
  context: { matterType?: string | null },
): string | null {
  if (!rules || rules.length === 0) return null;

  // Check matter type match first
  if (context.matterType) {
    const matterMatch = rules.find((r) => r.matterType === context.matterType);
    if (matterMatch) return matterMatch.videoUrl;
  }

  // Check time range
  const currentTime = getTimeRange();
  const timeMatch = rules.find((r) => r.timeRange === currentTime);
  if (timeMatch) return timeMatch.videoUrl;

  // Fall back to default
  const defaultRule = rules.find((r) => r.default);
  return defaultRule?.videoUrl ?? null;
}
