export default function FeaturesPage() {
  const features = [
    {
      title: 'Meeting upload & processing',
      description:
        'Upload audio recordings and track processing status until transcription and summarization complete.',
    },
    {
      title: 'Structured Jira extraction',
      description:
        'AI extracts bugs, stories, tasks, and features with headings, bullet lists, and tables in Jira ADF format.',
    },
    {
      title: 'Human-in-the-loop review',
      description:
        'Edit titles, priorities, and document blocks before approving items to your Jira project.',
    },
    {
      title: 'Meeting history',
      description:
        'Browse past meetings, revisit transcripts, and manage extracted items from a single dashboard.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-3xl md:text-4xl font-bold mb-4">Features</h1>
      <p className="text-white/60 mb-12 leading-relaxed">
        Everything you need to go from meeting recording to actionable Jira issues.
      </p>
      <div className="grid gap-6">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <h2 className="font-semibold text-lg mb-2">{feature.title}</h2>
            <p className="text-sm text-white/60 leading-relaxed">
              {feature.description}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
