export default function PlaytestPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-[color:var(--color-background)] px-6 py-16 text-[color:var(--color-text)]">
      <section className="w-full max-w-2xl rounded-3xl bg-[color:var(--color-surface)] p-10 text-center shadow-panel">
        <h1 className="text-4xl font-bold md:text-5xl">Join the Playtest Waitlist</h1>
        <p className="mt-4 text-lg leading-relaxed text-white/80">
          We&apos;re polishing the first multiplayer build. Drop your details so we can invite you when
          private lobbies open up. A proper signup flow is coming soon—until then, reach out to
          <a className="ml-1 text-white underline" href="mailto:hello@skribble-play.com">
            hello@skribble-play.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
