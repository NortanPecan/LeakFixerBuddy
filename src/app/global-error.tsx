"use client";

/**
 * Next.js global error boundary — catches errors in the root layout.
 * Must include <html> and <body> tags since it replaces the root layout.
 * https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs
 */

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ru">
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: "16px",
            padding: "32px",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ fontSize: "48px" }}>💥</div>
          <h1 style={{ fontSize: "20px", fontWeight: 600 }}>Критическая ошибка</h1>
          <p style={{ maxWidth: "400px", fontSize: "14px", color: "#666" }}>
            Приложение столкнулось с непредвиденной ошибкой. Мы уже в курсе и разбираемся.
          </p>
          {process.env.NODE_ENV === "development" && (
            <pre
              style={{
                maxWidth: "480px",
                overflow: "auto",
                background: "#f1f5f9",
                padding: "12px",
                borderRadius: "6px",
                fontSize: "12px",
                textAlign: "left",
              }}
            >
              {error.message}
            </pre>
          )}
          <button
            onClick={reset}
            style={{
              padding: "8px 20px",
              background: "#18181b",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Перезапустить
          </button>
        </div>
      </body>
    </html>
  );
}
