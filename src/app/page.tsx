import { VouchApp } from "@/components/VouchApp";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-6 sm:py-10">
      <div className="mb-5 max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--vouch-blue)]">
          Ethics class prototype
        </p>
        <p className="mt-2 text-sm text-[var(--vouch-muted)]">
          Fully offline scoring · two local models · ready to host on Vercel
        </p>
      </div>
      <VouchApp />
      <p className="mt-6 max-w-sm text-center text-xs leading-relaxed text-[var(--vouch-muted)]">
        Demo only. Heuristic detectors are not a guarantee of safety. Do not submit real passwords or
        sensitive personal data.
      </p>
    </main>
  );
}
