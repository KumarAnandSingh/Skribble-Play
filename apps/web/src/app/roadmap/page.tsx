const milestones = [
  {
    title: "M0 — Core Lobby",
    description: "Room creation, presence, and scoring scaffold."
  },
  {
    title: "M1 — Drawing Battles",
    description: "Realtime canvas, prompt rotation, and guess validation."
  },
  {
    title: "M2 — Social Layer",
    description: "Voice chat, reactions, and session moderation tools."
  }
];

export default function RoadmapPage() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-10 bg-[color:var(--color-background)] px-6 py-16 text-[color:var(--color-text)]">
      <section className="w-full max-w-3xl rounded-3xl bg-[color:var(--color-surface)] p-10 shadow-panel">
        <h1 className="text-center text-4xl font-bold md:text-5xl">Product Roadmap</h1>
        <p className="mt-4 text-center text-lg leading-relaxed text-white/80">
          Skribble Play is rolling out in focused milestones. Follow along as we bring the drawing
          battles and live ops stack online.
        </p>
        <ol className="mt-8 space-y-6">
          {milestones.map((item) => (
            <li key={item.title} className="rounded-2xl border border-white/10 bg-black/30 p-6">
              <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-white/70">{item.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
