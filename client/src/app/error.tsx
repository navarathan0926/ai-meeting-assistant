'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-bg text-white flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
        <p className="text-white/60 text-sm mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
