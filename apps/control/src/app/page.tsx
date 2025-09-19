export default function ControlHomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 py-16 text-slate-100">
      <section className="w-full max-w-xl rounded-2xl bg-slate-900/70 p-10 shadow-xl">
        <h1 className="text-center text-3xl font-bold md:text-4xl">Control Center</h1>
        <p className="mt-4 text-center text-base leading-relaxed text-slate-200/80">
          Moderation queues, incident dashboards, and live ops tooling will land here as part of the
          Milestone M1 roadmap. Subscribe to updates to preview prototypes.
        </p>
      </section>
    </main>
  );
}
