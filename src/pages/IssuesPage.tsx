import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { loadIssues, updateIssueStatus } from "../lib/checklists";
import type { IssueRecord, IssueStatus } from "../types";

const filters: Array<"all" | IssueStatus> = ["all", "open", "in_progress", "resolved"];

export function IssuesPage() {
  const { profile } = useAuth();
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("open");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) {
      return;
    }

    loadIssues(profile)
      .then(setIssues)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Could not load issues."),
      );
  }, [profile]);

  const visibleIssues = useMemo(() => {
    if (activeFilter === "all") {
      return issues;
    }

    return issues.filter((issue) => issue.status === activeFilter);
  }, [activeFilter, issues]);

  async function handleStatusChange(issueId: string, status: IssueStatus) {
    if (!profile) {
      return;
    }

    await updateIssueStatus(issueId, status, profile);
    setIssues((current) =>
      current.map((issue) => (issue.id === issueId ? { ...issue, status } : issue)),
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-charcoal">
      <main className="mx-auto w-full max-w-[1200px] px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <Link className="nav-link mb-6 inline-flex" to="/">
          Back
        </Link>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
          Supervisor Issues
        </h1>
        <p className="mt-4 text-xl font-semibold text-slate-700">
          Open faults, failed checks and follow-up actions.
        </p>

        {error ? <p className="error-note mt-6">{error}</p> : null}

        <div className="my-7 flex flex-wrap gap-3">
          {filters.map((filter) => (
            <button
              className={`segmented-button ${activeFilter === filter ? "segmented-button-active" : ""}`}
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
            >
              {filter.replace("_", " ")}
            </button>
          ))}
        </div>

        <section className="grid gap-4">
          {visibleIssues.length ? (
            visibleIssues.map((issue) => (
              <article className="record-card" key={issue.id}>
                <div>
                  <p className="text-sm font-extrabold uppercase text-recycle-800">
                    {issue.priority} priority
                  </p>
                  <h2 className="mt-1 text-2xl font-extrabold">{issue.title}</h2>
                  {issue.description ? (
                    <p className="mt-2 text-lg font-medium text-slate-700">
                      {issue.description}
                    </p>
                  ) : null}
                  <p className="mt-3 text-base font-bold text-slate-600">
                    Created by {issue.createdByName ?? "Unknown"} on{" "}
                    {new Date(issue.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(["open", "in_progress", "resolved"] as const).map((status) => (
                    <button
                      className={`segmented-button ${issue.status === status ? "segmented-button-active" : ""}`}
                      type="button"
                      key={status}
                      onClick={() => handleStatusChange(issue.id, status)}
                    >
                      {status.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <div className="status-note">No issues in this view.</div>
          )}
        </section>
      </main>
    </div>
  );
}
