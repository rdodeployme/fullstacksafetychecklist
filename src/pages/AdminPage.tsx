import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadAdminRecords } from "../lib/checklists";

type AdminRecords = Awaited<ReturnType<typeof loadAdminRecords>>;

export function AdminPage() {
  const [records, setRecords] = useState<AdminRecords>({
    templates: [],
    submissions: [],
    issues: [],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    loadAdminRecords()
      .then(setRecords)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Could not load records."),
      );
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 text-charcoal">
      <main className="mx-auto w-full max-w-[1200px] px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <Link className="nav-link mb-6 inline-flex" to="/">
          Back
        </Link>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
          Admin Records
        </h1>
        <p className="mt-4 text-xl font-semibold text-slate-700">
          Checklist templates, submissions and issue records.
        </p>

        {error ? <p className="error-note mt-6">{error}</p> : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <AdminList
            title="Templates"
            emptyText="No templates found."
            rows={records.templates.map((template) => ({
              id: template.id,
              title: template.title,
              meta: template.slug,
            }))}
          />
          <AdminList
            title="Recent Submissions"
            emptyText="No submissions found."
            rows={records.submissions.map((submission) => ({
              id: submission.id,
              title: submission.template_title,
              meta: [
                submission.operator_name,
                submission.status,
                getSubmissionNoteValue(submission.notes, "Ownership type"),
                getSubmissionNoteValue(submission.notes, "Asset ID / Asset Number"),
              ]
                .filter(Boolean)
                .join(" - "),
            }))}
          />
          <AdminList
            title="Recent Issues"
            emptyText="No issues found."
            rows={records.issues.map((issue) => ({
              id: issue.id,
              title: issue.title,
              meta: `${issue.priority} - ${issue.status}`,
            }))}
          />
        </div>
      </main>
    </div>
  );
}

function getSubmissionNoteValue(notes: string | null, label: string) {
  return (
    notes
      ?.split("\n")
      .find((line) => line.startsWith(`${label}: `))
      ?.replace(`${label}: `, "")
      .trim() ?? ""
  );
}

function AdminList({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: Array<{ id: string; title: string; meta: string }>;
  emptyText: string;
}) {
  return (
    <section className="form-panel">
      <h2 className="mb-4 text-2xl font-extrabold">{title}</h2>
      <div className="space-y-3">
        {rows.length ? (
          rows.map((row) => (
            <article className="rounded-md border border-slate-200 bg-slate-50 p-4" key={row.id}>
              <h3 className="text-lg font-extrabold">{row.title}</h3>
              <p className="mt-1 text-base font-semibold text-slate-600">{row.meta}</p>
            </article>
          ))
        ) : (
          <p className="status-note">{emptyText}</p>
        )}
      </div>
    </section>
  );
}
