/**
 * Lightweight client-side helper for submitting opt-in error reports to
 * /api/errors/report. Always best-effort: never throws, never blocks UI.
 */

type ErrorType = "user_report" | "client_crash" | "api_error" | "other";

interface ReportInput {
  errorType?: ErrorType;
  page?: string;
  messageClean?: string;
  stackTop?: string;
  userNote?: string;
}

const APP_VERSION = "1.0.0";

function currentPage(): string {
  try {
    return window.location.pathname || "";
  } catch {
    return "";
  }
}

export async function reportError(input: ReportInput): Promise<boolean> {
  try {
    const token = (() => {
      try {
        return localStorage.getItem("sticker_token");
      } catch {
        return null;
      }
    })();

    const body = {
      errorType: input.errorType ?? "user_report",
      page: input.page ?? currentPage(),
      messageClean: (input.messageClean ?? "").slice(0, 1500),
      stackTop: (input.stackTop ?? "").slice(0, 1500),
      userNote: (input.userNote ?? "").slice(0, 500),
      appVersion: APP_VERSION,
    };

    const res = await fetch("/api/errors/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      // Don't keep blocking on network — fire-and-forget feel.
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}
