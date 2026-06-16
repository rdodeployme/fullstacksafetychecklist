import { Link } from "react-router-dom";

export function HelpPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-charcoal">
      <main className="mx-auto w-full max-w-[900px] px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <Link className="nav-link mb-6 inline-flex" to="/">
          Back
        </Link>
        <section className="form-panel">
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
            Help
          </h1>
          <p className="mt-4 text-xl font-semibold text-slate-700">
            If you are unsure which check to complete, ask your supervisor before
            continuing.
          </p>
          <div className="mt-6 space-y-4 text-lg font-semibold text-slate-700">
            <p>Use People and vehicles for driver, jockey and hook truck checks.</p>
            <p>Use Machinery and equipment for forklifts, excavators and plant.</p>
            <p>Use Site checks and follow-up for area checks, faults and repairs.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
