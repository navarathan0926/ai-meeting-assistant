import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg text-white flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <p className="text-white/60 text-sm mb-6">
          The page you are looking for does not exist or was moved.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
