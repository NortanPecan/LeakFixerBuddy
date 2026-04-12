/**
 * Sentry client-side configuration.
 * This file is loaded in the browser.
 *
 * Set NEXT_PUBLIC_SENTRY_DSN in your environment to enable Sentry.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,

    // Capture 10% of transactions for performance monitoring in production
    // Increase to 1.0 during initial setup to see all data
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Replay 1% of sessions, 100% of sessions with errors
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,

    // Log Sentry internals to console in development
    debug: process.env.NODE_ENV === "development",

    integrations: [
      Sentry.replayIntegration({
        // Mask all user input by default for privacy
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],

    // Don't send events in development unless explicitly opted in
    enabled: process.env.NODE_ENV === "production" || !!process.env.SENTRY_FORCE_ENABLE,
  });
}
