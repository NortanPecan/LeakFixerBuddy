/**
 * Sentry server-side configuration.
 * This file is loaded in Node.js (API routes, Server Components, etc.)
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,

    // Capture all server-side transactions in development, 10% in production
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    debug: process.env.NODE_ENV === "development",

    enabled: process.env.NODE_ENV === "production" || !!process.env.SENTRY_FORCE_ENABLE,

    // Avoid capturing health check noise
    ignoreErrors: [
      // These are expected and not actionable
      "ECONNRESET",
      "ECONNREFUSED",
    ],

    beforeSend(event) {
      // Strip sensitive data from request bodies
      if (event.request?.data) {
        const data = event.request.data as Record<string, unknown>;
        const sensitiveKeys = ["password", "token", "secret", "key", "auth"] as const;
        for (const key of sensitiveKeys) {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            // false-positive: key is from a hardcoded const array, not user input

            data[key] = "[Filtered]";
          }
        }
      }
      return event;
    },
  });
}
