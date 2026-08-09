const RULES = [
  {
    title: '18+ only',
    body: 'All members and all profile content must belong to individuals who are 18 years of age or older. Profiles suspected of featuring anyone under 18 are removed immediately and reported.',
  },
  {
    title: 'You own what you post',
    body: 'Only upload images you have the right to publish. Do not impersonate another person or post someone else\u2019s photo without consent.',
  },
  {
    title: 'Respect other members',
    body: 'Harassment, hate speech, threats, or targeted abuse toward other members is not allowed.',
  },
  {
    title: 'No spam or scams',
    body: 'Do not use profiles to advertise unrelated services, links, or solicit payments.',
  },
  {
    title: 'Reporting',
    body: 'Use the Report button on any profile to flag content that violates these rules. Our moderation team reviews every report.',
  },
  {
    title: 'Enforcement',
    body: 'Violations may result in profile removal, account suspension, or a permanent ban, at moderators\u2019 discretion.',
  },
];

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-2xl py-14">
      <h1 className="text-3xl font-bold">Community Rules</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Please read carefully before creating a profile or interacting with the community.
      </p>

      <div className="mt-8 space-y-6">
        {RULES.map((rule) => (
          <div key={rule.title} className="rounded-xl2 border border-white/5 bg-bg-card p-5">
            <h2 className="text-base font-semibold text-white">{rule.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{rule.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
