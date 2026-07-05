import Link from 'next/link';

export default function SupportPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-3xl md:text-4xl font-bold mb-4">Support</h1>
      <p className="text-white/60 mb-8 leading-relaxed">
        Need help getting started or troubleshooting an integration? We are here
        to assist.
      </p>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
        <div>
          <h2 className="font-semibold mb-2">Getting started</h2>
          <p className="text-sm text-white/60 leading-relaxed">
            Create an account, upload a meeting recording from the dashboard, and
            wait for processing to complete. Review extracted Jira drafts before
            sending them to your project.
          </p>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Jira setup</h2>
          <p className="text-sm text-white/60 leading-relaxed">
            Configure Jira Cloud credentials on the server (API token, project
            key, and cloud ID). See the project README and Jira setup guide for
            step-by-step instructions.
          </p>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Account access</h2>
          <p className="text-sm text-white/60 leading-relaxed">
            Already have an account?{' '}
            <Link href="/login" className="text-[#39FF14] hover:underline">
              Sign in
            </Link>{' '}
            to open your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
