import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  buildInitialAnswers,
  buildInitialFieldValues,
  defaultFieldValue,
  getMeterReadingFlag,
  getMeterValidationError,
  getMissingRequiredFields,
  getTemplateFields,
  type AnswerState,
  type FieldState,
} from "../lib/checklistFormHelpers";
import { loadChecklistTemplate, submitChecklist } from "../lib/checklists";
import { icons } from "../lib/icons";
import type {
  AnswerValue,
  ChecklistAnswerInput,
  ChecklistField,
  ChecklistFieldValue,
  ChecklistTemplate,
} from "../types";

type SubmissionResult = {
  submissionId: string;
  issuesCreated: number;
  recipients: string[];
};

export function ChecklistFormPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [operatorName, setOperatorName] = useState(profile?.fullName ?? "");
  const [fieldValues, setFieldValues] = useState<FieldState>({});
  const [answers, setAnswers] = useState<AnswerState>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [faultDescription, setFaultDescription] = useState("");
  const [faultPhoto, setFaultPhoto] = useState<File | null>(null);
  const [faultPhotoUnavailableReason, setFaultPhotoUnavailableReason] = useState("");
  const [error, setError] = useState("");
  const [missingFieldIds, setMissingFieldIds] = useState<string[]>([]);
  const [showMissingAnswers, setShowMissingAnswers] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionTimestamp = useMemo(() => new Date().toISOString(), []);

  useEffect(() => {
    let isMounted = true;

    if (!slug) {
      return;
    }

    loadChecklistTemplate(slug)
      .then((loadedTemplate) => {
        if (isMounted) {
          setTemplate(loadedTemplate);
          setAnswers(buildInitialAnswers(loadedTemplate));
          setFieldValues(buildInitialFieldValues(loadedTemplate, searchParams.get("fleetNumber")));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [searchParams, slug]);

  useEffect(() => {
    if (profile?.fullName) {
      setOperatorName(profile.fullName);
    }
  }, [profile?.fullName]);

  const flattenedItems = useMemo(
    () => template?.sections.flatMap((section) => section.items) ?? [],
    [template],
  );
  const templateFields = useMemo(() => getTemplateFields(template), [template]);
  const hasFault = useMemo(
    () => Object.values(answers).some((answer) => answer.response === "fail"),
    [answers],
  );
  const requiresFaultDetails = Boolean(template?.createsIssue || hasFault);

  if (isLoading) {
    return <div className="min-h-screen bg-stone-50" />;
  }

  if (!template) {
    return (
      <SimplePage title="Checklist not found">
        <p className="text-xl font-semibold text-slate-700">
          This checklist is not active or has not been added yet.
        </p>
        <Link className="primary-action mt-6" to="/">
          Back to Safety Hub
        </Link>
      </SimplePage>
    );
  }

  if (result) {
    return (
      <SimplePage title="Checklist submitted">
        <p className="text-xl font-semibold text-slate-700">
          Recorded for {operatorName}.
        </p>
        {result.issuesCreated > 0 ? (
          <p className="error-note mt-5">
            {result.issuesCreated} issue{result.issuesCreated === 1 ? "" : "s"} created for
            supervisor follow-up.
          </p>
        ) : (
          <p className="status-note mt-5">No supervisor follow-up was created.</p>
        )}
        <p className="status-note mt-5">
          Report routed to {result.recipients.join(" and ")}.
        </p>
        <Link className="primary-action mt-6" to="/">
          Back to Safety Hub
        </Link>
      </SimplePage>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!template) {
      return;
    }

    const trimmedOperatorName = operatorName.trim();

    if (!trimmedOperatorName) {
      setError("Please type your name before submitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const missingFieldLabels = getMissingRequiredFields(templateFields, fieldValues);

    if (missingFieldLabels.length) {
      setMissingFieldIds(missingFieldLabels.map((field) => field.id));
      setError(`Please complete: ${missingFieldLabels.map((field) => field.label).join(", ")}.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const meterValidationError = getMeterValidationError(fieldValues);

    if (meterValidationError) {
      setMissingFieldIds(["meterOverrideReason"]);
      setError(meterValidationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const missing = flattenedItems.filter((item) => !answers[item.id]?.response);

    if (missing.length) {
      setShowMissingAnswers(true);
      setError("Please choose Pass, Fail or N/A for every item before submitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (requiresFaultDetails && !faultDescription.trim()) {
      setError("Please describe the fault or issue before submitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (requiresFaultDetails && !faultPhoto && !faultPhotoUnavailableReason.trim()) {
      setError("Please upload a fault photo, or explain why a photo is not available.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setError("");
    setMissingFieldIds([]);
    setShowMissingAnswers(false);
    setIsSubmitting(true);

    const payload: ChecklistAnswerInput[] = flattenedItems.map((item) => ({
      itemId: item.id,
      prompt: item.prompt,
      response: answers[item.id].response as AnswerValue,
      notes: answers[item.id].notes,
      requiresIssueOnFail: item.requiresIssueOnFail,
    }));
    const meterReadingFlag = getMeterReadingFlag(fieldValues);

    try {
      const submitResult = await submitChecklist({
        template,
        profile:
          profile ?? {
            id: `public-worker-${Date.now()}`,
            fullName: trimmedOperatorName,
            role: "operator",
            isActive: true,
          },
        answers: payload,
        fields: [
          {
            fieldId: "staffMemberName",
            label: "Staff member name",
            type: "text" as const,
            value: trimmedOperatorName,
          },
          ...templateFields.map((field) => ({
            fieldId: field.id,
            label: field.label,
            type: field.type,
            value: fieldValues[field.id] ?? null,
          })),
          ...(meterReadingFlag
            ? [
                {
                  fieldId: "meterReadingFlag",
                  label: "Meter reading flag",
                  type: "text" as const,
                  value: meterReadingFlag,
                },
              ]
            : []),
        ],
        generalNotes,
        faultDescription,
        faultPhoto,
        faultPhotoUnavailableReason,
        submissionTimestamp,
      });

      setResult(submitResult);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit this checklist.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-charcoal">
      <main className="mx-auto w-full max-w-[960px] px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <Link className="nav-link mb-6 inline-flex" to="/">
          Back
        </Link>
        <section className="mb-7">
          <p className="mb-2 text-lg font-bold text-recycle-800">
            {template.groupTitle}
          </p>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
            {template.title}
          </h1>
          <p className="mt-4 text-xl font-semibold text-slate-700">
            Type your name, complete the check, then submit.
          </p>
        </section>

        {error ? <p className="error-note mb-6">{error}</p> : null}

        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <section className="form-panel">
            <label htmlFor="operatorName" className="field-label">
              Staff member name
            </label>
            <input
              id="operatorName"
              className="field-input"
              type="text"
              autoComplete="name"
              value={operatorName}
              onChange={(event) => setOperatorName(event.target.value)}
              placeholder="Type your full name"
              required
            />
          </section>

          <section className="form-panel">
            <h2 className="mb-5 text-2xl font-extrabold">Check details</h2>
            <div className="mb-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-base font-bold text-slate-600">Asset / check type</p>
              <p className="mt-1 text-2xl font-extrabold text-charcoal">{template.title}</p>
            </div>
            <div className="mb-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-base font-bold text-slate-600">Automatic submission timestamp</p>
              <p className="mt-1 text-xl font-extrabold text-charcoal">
                {new Date(submissionTimestamp).toLocaleString()}
              </p>
            </div>
            <div className="grid gap-5">
              {templateFields.map((field) => (
                <ChecklistFieldControl
                  key={field.id}
                  field={field}
                  value={fieldValues[field.id] ?? defaultFieldValue(field)}
                  isMissing={missingFieldIds.includes(field.id)}
                  onChange={(value) =>
                    setFieldValues((current) => ({
                      ...current,
                      [field.id]: value,
                    }))
                  }
                />
              ))}
            </div>
          </section>

          {template.sections.map((section) => (
            <section className="form-panel" key={section.id}>
              <h2 className="mb-5 text-2xl font-extrabold">{section.title}</h2>
              <div className="space-y-5">
                {section.items.map((item) => (
                  <ChecklistItemField
                    key={item.id}
                    prompt={item.prompt}
                    value={answers[item.id]?.response ?? ""}
                    notes={answers[item.id]?.notes ?? ""}
                    showMissing={showMissingAnswers && !answers[item.id]?.response}
                    onChange={(response) =>
                      setAnswers((current) => ({
                        ...current,
                        [item.id]: { ...current[item.id], response },
                      }))
                    }
                    onNotesChange={(notes) =>
                      setAnswers((current) => ({
                        ...current,
                        [item.id]: { ...current[item.id], notes },
                      }))
                    }
                  />
                ))}
              </div>
            </section>
          ))}

          {requiresFaultDetails ? (
            <section className="form-panel border-red-200">
              <h2 className="mb-3 text-2xl font-extrabold text-safety-red">
                Fault found
              </h2>
              <p className="mb-5 text-lg font-semibold text-slate-700">
                Describe the issue clearly. Upload a photo, or explain why no photo is available.
              </p>
              <label htmlFor="faultDescription" className="field-label">
                Fault description
              </label>
              <textarea
                id="faultDescription"
                className="field-input min-h-32 py-3"
                value={faultDescription}
                onChange={(event) => setFaultDescription(event.target.value)}
                placeholder="Describe what is failed, damaged, unsafe, not working or requires attention"
                required
              />
              <label htmlFor="faultPhoto" className="field-label mt-5">
                Fault photo upload
              </label>
              <input
                id="faultPhoto"
                className="field-input py-4 text-lg"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => setFaultPhoto(event.target.files?.[0] ?? null)}
              />
              {faultPhoto ? (
                <p className="mt-3 text-base font-bold text-slate-700">
                  Photo selected: {faultPhoto.name}
                </p>
              ) : null}
              <label htmlFor="faultPhotoUnavailableReason" className="field-label mt-5">
                If no photo, explain why
              </label>
              <textarea
                id="faultPhotoUnavailableReason"
                className="field-input min-h-24 py-3"
                value={faultPhotoUnavailableReason}
                onChange={(event) => setFaultPhotoUnavailableReason(event.target.value)}
                placeholder="Example: Camera unavailable, unsafe to take photo, photo already supplied"
              />
            </section>
          ) : null}

          <section className="form-panel">
            <label htmlFor="generalNotes" className="field-label">
              General notes
            </label>
            <textarea
              id="generalNotes"
              className="field-input min-h-32 py-3"
              value={generalNotes}
              onChange={(event) => setGeneralNotes(event.target.value)}
              placeholder="Add anything else your supervisor should know"
            />
          </section>

          <section className="form-panel">
            {error ? <p className="error-note mb-5">{error}</p> : null}
            <button className="primary-action" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </section>
        </form>
      </main>
    </div>
  );
}

function ChecklistItemField({
  prompt,
  value,
  notes,
  showMissing,
  onChange,
  onNotesChange,
}: {
  prompt: string;
  value: AnswerValue | "";
  notes: string;
  showMissing: boolean;
  onChange: (value: AnswerValue) => void;
  onNotesChange: (value: string) => void;
}) {
  return (
    <div
      className={`rounded-lg border bg-white p-4 ${
        showMissing ? "border-red-400 ring-4 ring-red-100" : "border-slate-200"
      }`}
    >
      <p className="text-xl font-extrabold text-charcoal">{prompt}</p>
      {showMissing ? (
        <p className="mt-2 text-lg font-bold text-safety-red">Choose one answer.</p>
      ) : null}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {(["pass", "fail", "na"] as const).map((option) => (
          <button
            className={`answer-button ${value === option ? `answer-button-${option}` : ""}`}
            type="button"
            key={option}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {value === option ? "Selected: " : ""}
            {option === "na" ? "N/A" : option === "fail" ? "Fail / Fault" : "Pass"}
          </button>
        ))}
      </div>
      <textarea
        className="field-input mt-4 min-h-24 py-3 text-lg"
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder="Notes if needed"
      />
    </div>
  );
}

function ChecklistFieldControl({
  field,
  value,
  isMissing,
  onChange,
}: {
  field: ChecklistField;
  value: ChecklistFieldValue;
  isMissing: boolean;
  onChange: (value: ChecklistFieldValue) => void;
}) {
  const id = `field-${field.id}`;
  const wrapperClass = isMissing ? "rounded-lg border border-red-300 bg-red-50 p-3" : "";

  if (field.type === "checkbox") {
    return (
      <div className={wrapperClass}>
        <label className="flex min-h-16 items-center gap-4 rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-xl font-extrabold text-charcoal">
          <input
            className="h-7 w-7 accent-recycle-700"
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
            required={field.required}
          />
          {field.label}
        </label>
        {field.helpText ? <p className="mt-2 text-base font-semibold text-slate-600">{field.helpText}</p> : null}
        {isMissing ? <p className="mt-2 text-base font-bold text-safety-red">Required.</p> : null}
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <label htmlFor={id} className="field-label">
        {field.label}
      </label>
      {field.type === "select" ? (
        <select
          id={id}
          className="field-input"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
        >
          <option value="">Choose one</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          className="field-input py-4"
          type={field.type}
          accept={field.type === "file" ? "image/*" : undefined}
          capture={field.type === "file" ? "environment" : undefined}
          value={field.type === "file" ? undefined : typeof value === "string" ? value : ""}
          onChange={(event) =>
            onChange(
              field.type === "file"
                ? event.target.files?.[0] ?? null
                : event.target.value,
            )
          }
          placeholder={field.placeholder}
          required={field.required}
        />
      )}
      {field.helpText ? <p className="mt-2 text-base font-semibold text-slate-600">{field.helpText}</p> : null}
      {value instanceof File ? (
        <p className="mt-2 text-base font-bold text-slate-700">File selected: {value.name}</p>
      ) : null}
      {isMissing ? <p className="mt-2 text-base font-bold text-safety-red">Required.</p> : null}
    </div>
  );
}

function SimplePage({ title, children }: { title: string; children: React.ReactNode }) {
  const Check = icons.check;

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-8 text-charcoal">
      <section className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-tile sm:p-8">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-lg bg-recycle-50 text-recycle-800">
          <Check className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{title}</h1>
        {children}
      </section>
    </main>
  );
}
