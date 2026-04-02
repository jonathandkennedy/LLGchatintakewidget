/**
 * Proactive widget triggers.
 * Auto-opens the widget based on visitor behavior.
 *
 * Configure via data attributes on the embed script:
 *   data-trigger-delay="10"        (open after 10 seconds)
 *   data-trigger-scroll="50"       (open at 50% scroll)
 *   data-trigger-exit="true"       (open on exit intent)
 *   data-trigger-pages="3"         (open after 3 page views)
 */

type TriggerConfig = {
  delaySeconds: number | null;
  scrollPercent: number | null;
  exitIntent: boolean;
  pageViews: number | null;
};

const TRIGGERED_KEY = "intakellg_triggered";
const PAGEVIEW_KEY = "intakellg_pageviews";

function hasTriggered(): boolean {
  try { return sessionStorage.getItem(TRIGGERED_KEY) === "1"; } catch { return false; }
}

function markTriggered(): void {
  try { sessionStorage.setItem(TRIGGERED_KEY, "1"); } catch { /* ignore */ }
}

function getPageViews(): number {
  try {
    const count = parseInt(localStorage.getItem(PAGEVIEW_KEY) ?? "0", 10);
    const next = count + 1;
    localStorage.setItem(PAGEVIEW_KEY, String(next));
    return next;
  } catch { return 1; }
}

export function setupProactiveTriggers(config: TriggerConfig, openWidget: () => void): () => void {
  if (hasTriggered()) return () => {};

  const cleanups: Array<() => void> = [];

  function trigger() {
    if (hasTriggered()) return;
    markTriggered();
    openWidget();
  }

  // Time delay trigger
  if (config.delaySeconds != null && config.delaySeconds > 0) {
    const timer = setTimeout(trigger, config.delaySeconds * 1000);
    cleanups.push(() => clearTimeout(timer));
  }

  // Scroll depth trigger
  if (config.scrollPercent != null && config.scrollPercent > 0) {
    function onScroll() {
      const scrolled = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      if (scrolled >= config.scrollPercent!) trigger();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    cleanups.push(() => window.removeEventListener("scroll", onScroll));
  }

  // Exit intent trigger (mouse leaves viewport at top)
  if (config.exitIntent) {
    function onMouseLeave(e: MouseEvent) {
      if (e.clientY <= 0) trigger();
    }
    document.addEventListener("mouseleave", onMouseLeave);
    cleanups.push(() => document.removeEventListener("mouseleave", onMouseLeave));
  }

  // Page view count trigger
  if (config.pageViews != null && config.pageViews > 0) {
    const views = getPageViews();
    if (views >= config.pageViews) trigger();
  }

  return () => cleanups.forEach((fn) => fn());
}

export function parseTriggerConfig(script: HTMLScriptElement | null): TriggerConfig {
  return {
    delaySeconds: script?.getAttribute("data-trigger-delay") ? parseInt(script.getAttribute("data-trigger-delay")!, 10) : null,
    scrollPercent: script?.getAttribute("data-trigger-scroll") ? parseInt(script.getAttribute("data-trigger-scroll")!, 10) : null,
    exitIntent: script?.getAttribute("data-trigger-exit") === "true",
    pageViews: script?.getAttribute("data-trigger-pages") ? parseInt(script.getAttribute("data-trigger-pages")!, 10) : null,
  };
}
