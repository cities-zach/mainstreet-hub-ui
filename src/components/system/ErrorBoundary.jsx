import React from "react";
import { sendClientErrorReport } from "@/api";

const BOT_UA_PATTERN =
  /bot|crawl|spider|slurp|bingpreview|duckassist|facebookexternalhit|embedly|quora|pinterest|headless|lighthouse|preview|scanner/i;

function isLikelyBot() {
  if (typeof navigator === "undefined") return false;
  return BOT_UA_PATTERN.test(navigator.userAgent || "");
}

/**
 * Catches render-time crashes anywhere in its child tree and shows a friendly
 * recovery screen instead of a blank white page.
 *
 * - Auto-sends a report to the backend on catch (so we hear about it even if
 *   the user closes the tab).
 * - Lets the user add a note and resend, reload, or copy the technical details.
 * - When `resetKey` changes (e.g. the route path), the boundary resets so
 *   navigating away recovers automatically.
 *
 * Note: error boundaries only catch errors thrown during render/lifecycle.
 * Errors inside event handlers or async callbacks are not caught here and
 * should still be handled with try/catch + toasts.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      componentStack: "",
      reportStatus: "idle", // idle | sending | sent | failed
      reportId: null,
      note: "",
      copied: false,
      prevResetKey: props.resetKey,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.prevResetKey) {
      return {
        prevResetKey: props.resetKey,
        hasError: false,
        error: null,
        componentStack: "",
        reportStatus: "idle",
        reportId: null,
        note: "",
        copied: false,
      };
    }
    return null;
  }

  componentDidCatch(error, info) {
    const componentStack = info?.componentStack || "";
    this.setState({ componentStack });
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] caught an error:", error, info);
    // Fire-and-forget automatic report so we always get notified.
    this.submitReport({ silent: true });
  }

  buildPayload() {
    const { error, componentStack, note } = this.state;
    return {
      message: error?.message || String(error || "Unknown error"),
      stack: error?.stack || "",
      componentStack,
      url: typeof window !== "undefined" ? window.location.href : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      appVersion: import.meta.env?.VITE_APP_VERSION || "",
      userNote: note || "",
    };
  }

  submitReport = async ({ silent = false } = {}) => {
    // Crawlers (which only ever trigger the automatic report) generate noise
    // and often fail on things like WebGL; skip auto-reports from bots.
    if (silent && isLikelyBot()) return;
    if (!silent) this.setState({ reportStatus: "sending" });
    try {
      const res = await sendClientErrorReport(this.buildPayload());
      if (!silent) {
        this.setState({ reportStatus: "sent", reportId: res?.id || null });
      }
    } catch {
      if (!silent) this.setState({ reportStatus: "failed" });
    }
  };

  handleCopy = async () => {
    const { error, componentStack } = this.state;
    const details = [
      `Message: ${error?.message || String(error || "Unknown error")}`,
      `Page: ${typeof window !== "undefined" ? window.location.href : ""}`,
      `Time: ${new Date().toISOString()}`,
      "",
      "Stack:",
      error?.stack || "(none)",
      "",
      "Component stack:",
      componentStack || "(none)",
    ].join("\n");
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(details);
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2500);
      }
    } catch {
      // ignore clipboard failures
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, reportStatus, note, copied } = this.state;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Something went wrong on this page
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Sorry about that — the rest of the app is still fine. This error was
            reported automatically. If you can, add a quick note about what you
            were doing so it&apos;s easier to fix.
          </p>

          <textarea
            className="mt-4 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#835879] focus:outline-none focus:ring-1 focus:ring-[#835879] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            rows={3}
            placeholder="What were you doing when this happened? (optional)"
            value={note}
            onChange={(e) => this.setState({ note: e.target.value })}
            disabled={reportStatus === "sending"}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => this.submitReport({ silent: false })}
              disabled={reportStatus === "sending"}
              className="rounded-lg bg-[#835879] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6f4a66] disabled:opacity-60"
            >
              {reportStatus === "sending"
                ? "Sending…"
                : reportStatus === "sent"
                  ? "Report sent — send again"
                  : "Send report"}
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={this.handleCopy}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {copied ? "Copied!" : "Copy error details"}
            </button>
          </div>

          {reportStatus === "sent" && (
            <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
              Thanks! Your report was sent. You can keep using the app.
            </p>
          )}
          {reportStatus === "failed" && (
            <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
              We couldn&apos;t send the report automatically. Please use “Copy
              error details” and send it over manually.
            </p>
          )}

          {error?.message && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-slate-400">
                Technical details
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                {error.message}
                {error.stack ? `\n\n${error.stack}` : ""}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
