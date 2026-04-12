"use client";

/**
 * Next.js App Router error boundary — catches errors in the route segment.
 * Shown when a Server Component or Client Component throws during rendering.
 * https://nextjs.org/docs/app/api-reference/file-conventions/error
 */

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Report to Sentry (only if configured)
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-xl font-semibold">Что-то пошло не так</h2>
      <p className="text-muted-foreground max-w-sm text-sm">
        Произошла неожиданная ошибка. Попробуй ещё раз или обнови страницу.
      </p>
      {process.env.NODE_ENV === "development" && (
        <pre className="bg-muted max-w-md overflow-auto rounded p-3 text-left text-xs">
          {error.message}
          {error.digest && `\nDigest: ${error.digest}`}
        </pre>
      )}
      <button
        onClick={reset}
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm"
      >
        Попробовать снова
      </button>
    </div>
  );
}
