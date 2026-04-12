import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const securityHeaders = [
  // Prevents clickjacking attacks
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Prevents MIME type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Controls referrer information sent with requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Blocks XSS attacks in legacy browsers
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Enable DNS prefetching for performance
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Restrict access to browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

// Only wrap with Sentry when DSN is configured — keeps local dev clean
const sentryDsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

export default sentryDsn
  ? withSentryConfig(nextConfig, {
      // Sentry organisation/project — set via SENTRY_ORG / SENTRY_PROJECT env vars
      // or fill in here if you prefer
      silent: true, // suppress Sentry build output clutter
      widenClientFileUpload: true, // upload larger source maps

      // Automatically tree-shake Sentry logger statements in production
      disableLogger: true,

      // Tunnels error reports through your domain (bypasses ad-blockers)
      // tunnelRoute: "/monitoring-tunnel",
    })
  : nextConfig;
