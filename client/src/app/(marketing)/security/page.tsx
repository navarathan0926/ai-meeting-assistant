export default function SecurityPage() {
  const sections = [
    {
      title: 'Authentication',
      body: 'Email/password and Google OAuth sign-in with JWT-based API access.',
    },
    {
      title: 'Data isolation',
      body: 'Meetings and extracted items are scoped to your user account. API endpoints enforce ownership checks.',
    },
    {
      title: 'Secure storage',
      body: 'Recordings are stored in cloud blob storage with time-limited access URLs for playback.',
    },
    {
      title: 'Jira credentials',
      body: 'Jira API tokens and project configuration are stored server-side and never exposed to the client.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-3xl md:text-4xl font-bold mb-4">Security</h1>
      <p className="text-white/60 mb-12 leading-relaxed">
        We treat your meeting data and integrations with care. Here is how the
        platform protects your information.
      </p>
      <div className="grid gap-6">
        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <h2 className="font-semibold text-lg mb-2">{section.title}</h2>
            <p className="text-sm text-white/60 leading-relaxed">{section.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
