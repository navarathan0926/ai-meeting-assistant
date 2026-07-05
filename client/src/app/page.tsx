import Link from 'next/link';
import { MarketingFooter, MarketingNav } from '@/components/marketing/MarketingShell';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090f] text-white flex flex-col">
      <MarketingNav />

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <p className="text-[#39FF14] text-sm font-semibold uppercase tracking-widest mb-4">
              AI-powered meeting intelligence
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
              Turn meetings into Jira-ready work items
            </h1>
            <p className="text-lg text-white/60 leading-relaxed mb-10">
              Upload recordings, get transcripts and summaries, then review and
              approve structured Jira drafts before they land in your backlog.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/register"
                className="bg-[#39FF14] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#32e612] transition-colors"
              >
                Start free
              </Link>
              <Link
                href="/features"
                className="border border-white/15 text-white px-6 py-3 rounded-lg hover:bg-white/5 transition-colors"
              >
                See features
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-white/8 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Transcribe & summarize',
                body: 'Automatic transcription and AI summaries with key points and action items.',
              },
              {
                title: 'Extract Jira drafts',
                body: 'Headings, bullet lists, and tables formatted natively for Jira Cloud.',
              },
              {
                title: 'Review before send',
                body: 'Edit drafts, approve with one click, and create issues in your project.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <h2 className="font-semibold text-lg mb-2">{item.title}</h2>
                <p className="text-sm text-white/55 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
