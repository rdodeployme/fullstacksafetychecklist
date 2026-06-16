import { defaultChecklistTemplates, getFallbackGroups } from "../data/defaultChecklistTemplates";
import type {
  ChecklistAnswerInput,
  ChecklistFieldInput,
  ChecklistTemplate,
  IssuePriority,
  IssueRecord,
  Profile,
  SafetyTileGroup,
} from "../types";
import { isSupabaseConfigured, supabase } from "./supabase";

type ChecklistTemplateRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  group_id: string;
  group_title: string;
  group_description: string;
  group_icon: string;
  group_variant: string;
  icon: string;
  variant: string;
  display_order: number;
  creates_issue: boolean;
  checklist_sections?: Array<{
    id: string;
    title: string;
    display_order: number;
    checklist_items?: Array<{
      id: string;
      prompt: string;
      display_order: number;
      requires_issue_on_fail: boolean;
    }>;
  }>;
};

const STANDARD_REPORT_RECIPIENT = "reports@recycle.net.au";
const FAULT_REPORT_RECIPIENT = "repairs@recycle.net.au";

export async function loadChecklistTemplates() {
  if (!isSupabaseConfigured || !supabase) {
    return defaultChecklistTemplates;
  }

  const { data, error } = await supabase
    .from("checklist_templates")
    .select(
      "*, checklist_sections(*, checklist_items(*))",
    )
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error || !data?.length) {
    return defaultChecklistTemplates;
  }

  return (data as ChecklistTemplateRow[])
    .map(mapTemplateRow)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function deriveGroups(templates: ChecklistTemplate[]): SafetyTileGroup[] {
  if (!templates.length) {
    return getFallbackGroups();
  }

  const groups = new Map<string, SafetyTileGroup>();

  for (const template of templates) {
    if (!groups.has(template.groupId)) {
      groups.set(template.groupId, {
        id: template.groupId,
        heading: template.groupTitle,
        description: template.groupDescription,
        icon: template.groupIcon,
        variant: template.groupVariant,
      });
    }
  }

  return Array.from(groups.values());
}

export async function loadChecklistTemplate(slug: string) {
  const templates = await loadChecklistTemplates();

  return templates.find((template) => template.slug === slug) ?? null;
}

export async function submitChecklist({
  template,
  profile,
  answers,
  fields = [],
  generalNotes,
  faultDescription = "",
  faultPhoto = null,
  faultPhotoUnavailableReason = "",
  submissionTimestamp = new Date().toISOString(),
}: {
  template: ChecklistTemplate;
  profile: Profile;
  answers: ChecklistAnswerInput[];
  fields?: ChecklistFieldInput[];
  generalNotes: string;
  faultDescription?: string;
  faultPhoto?: File | null;
  faultPhotoUnavailableReason?: string;
  submissionTimestamp?: string;
}) {
  const failedAnswers = answers.filter((answer) => answer.response === "fail");
  const createsIssue = template.createsIssue || failedAnswers.length > 0 || Boolean(faultDescription.trim());
  const status = createsIssue ? "needs_follow_up" : "submitted";
  const recipients = createsIssue
    ? [STANDARD_REPORT_RECIPIENT, FAULT_REPORT_RECIPIENT]
    : [STANDARD_REPORT_RECIPIENT];
  const notesWithRouting = buildSubmissionNotes({
    fields,
    generalNotes,
    faultDescription,
    faultPhoto,
    faultPhotoUnavailableReason,
    submissionTimestamp,
    recipients,
    faultFound: createsIssue,
  });
  const structuredSubmissionFields = buildStructuredSubmissionFields({
    fields,
    faultDescription,
    faultPhotoUnavailableReason,
    faultFound: createsIssue,
  });

  if (!isSupabaseConfigured || !supabase || isLocalDemoProfile(profile)) {
    return {
      submissionId: `local-${Date.now()}`,
      issuesCreated: createsIssue ? Math.max(1, failedAnswers.length) : 0,
      recipients,
    };
  }

  const submissionRow = {
    template_id: isUuid(template.id) ? template.id : null,
    template_slug: template.slug,
    template_title: template.title,
    user_id: profile.id,
    operator_name: profile.fullName,
    status,
    notes: notesWithRouting,
  };
  let { data: submission, error: submissionError } = await supabase
    .from("checklist_submissions")
    .insert({
      ...submissionRow,
      ...structuredSubmissionFields,
    })
    .select("id")
    .single();

  if (submissionError && isMissingStructuredSubmissionColumnError(submissionError)) {
    const fallbackResult = await supabase
      .from("checklist_submissions")
      .insert(submissionRow)
      .select("id")
      .single();

    submission = fallbackResult.data;
    submissionError = fallbackResult.error;
  }

  if (submissionError) {
    throw submissionError;
  }

  if (!submission) {
    throw new Error("Checklist submission was not created.");
  }

  const submissionId = submission.id as string;

  const answerRows = answers.map((answer) => ({
    submission_id: submissionId,
    item_id: isUuid(answer.itemId) ? answer.itemId : null,
    prompt: answer.prompt,
    response: answer.response,
    notes: answer.notes,
    creates_issue: answer.response === "fail" && answer.requiresIssueOnFail,
  }));

  if (answerRows.length) {
    const { error: answersError } = await supabase
      .from("checklist_answers")
      .insert(answerRows);

    if (answersError) {
      throw answersError;
    }
  }

  let issuesCreated = 0;

  if (createsIssue) {
    const issueRows =
      failedAnswers.length > 0
        ? failedAnswers.map((answer) => ({
            title: `${template.title}: ${answer.prompt}`,
            description: answer.notes || faultDescription || generalNotes || null,
            priority: issuePriorityForTemplate(template.slug),
            status: "open",
            source_submission_id: submissionId,
            source_template_slug: template.slug,
            created_by: profile.id,
            created_by_name: profile.fullName,
          }))
        : [
            {
              title: `${template.title} from ${profile.fullName}`,
              description: faultDescription || generalNotes || "Operator reported a fault or follow-up item.",
              priority: issuePriorityForTemplate(template.slug),
              status: "open",
              source_submission_id: submissionId,
              source_template_slug: template.slug,
              created_by: profile.id,
              created_by_name: profile.fullName,
            },
          ];

    const { data: issues, error: issueError } = await supabase
      .from("issues")
      .insert(issueRows)
      .select("id");

    if (issueError) {
      throw issueError;
    }

    issuesCreated = issues?.length ?? 0;

    await supabase.from("notification_events").insert(
      (issues ?? []).map((issue) => ({
        event_type: "issue_created",
        issue_id: issue.id,
        status: "queued",
      })),
    );

    for (const issue of issues ?? []) {
      await supabase.functions.invoke("send-notification", {
        body: { eventType: "issue_created", issueId: issue.id },
      });
    }
  }

  return { submissionId, issuesCreated, recipients };
}

export async function loadIssues(profile: Profile) {
  if (!isSupabaseConfigured || !supabase) {
    return [] as IssueRecord[];
  }

  let query = supabase
    .from("issues")
    .select(
      "id,title,description,status,priority,created_at,created_by_name,assigned_to_name,source_template_slug",
    )
    .order("created_at", { ascending: false });

  if (profile.role === "operator") {
    query = query.eq("created_by", profile.id);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((issue) => ({
    id: issue.id,
    title: issue.title,
    description: issue.description,
    status: issue.status,
    priority: issue.priority,
    createdAt: issue.created_at,
    createdByName: issue.created_by_name,
    assignedToName: issue.assigned_to_name,
    sourceTemplateSlug: issue.source_template_slug,
  })) as IssueRecord[];
}

export async function updateIssueStatus(issueId: string, status: string, profile: Profile) {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  const { error } = await supabase
    .from("issues")
    .update({
      status,
      resolved_at: status === "resolved" || status === "closed" ? new Date().toISOString() : null,
    })
    .eq("id", issueId);

  if (error) {
    throw error;
  }

  await supabase.from("issue_updates").insert({
    issue_id: issueId,
    user_id: profile.id,
    user_name: profile.fullName,
    note: `Status changed to ${status.replace("_", " ")}.`,
  });
}

export async function loadAdminRecords() {
  if (!isSupabaseConfigured || !supabase) {
    return { templates: [], submissions: [], issues: [] };
  }

  const [templates, submissions, issues] = await Promise.all([
    supabase
      .from("checklist_templates")
      .select("id,title,slug,is_active,display_order")
      .order("display_order"),
    supabase
      .from("checklist_submissions")
      .select("id,template_title,operator_name,status,submitted_at,notes")
      .order("submitted_at", { ascending: false })
      .limit(25),
    supabase
      .from("issues")
      .select("id,title,status,priority,created_at")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  if (templates.error) throw templates.error;
  if (submissions.error) throw submissions.error;
  if (issues.error) throw issues.error;

  return {
    templates: templates.data ?? [],
    submissions: submissions.data ?? [],
    issues: issues.data ?? [],
  };
}

function mapTemplateRow(row: ChecklistTemplateRow): ChecklistTemplate {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    groupId: row.group_id,
    groupTitle: row.group_title,
    groupDescription: row.group_description,
    groupIcon: row.group_icon as ChecklistTemplate["groupIcon"],
    groupVariant: row.group_variant as ChecklistTemplate["groupVariant"],
    icon: row.icon as ChecklistTemplate["icon"],
    variant: row.variant as ChecklistTemplate["variant"],
    displayOrder: row.display_order,
    createsIssue: row.creates_issue,
    sections: (row.checklist_sections ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((section) => ({
        id: section.id,
        title: section.title,
        displayOrder: section.display_order,
        items: (section.checklist_items ?? [])
          .sort((a, b) => a.display_order - b.display_order)
          .map((item) => ({
            id: item.id,
            prompt: item.prompt,
            displayOrder: item.display_order,
            requiresIssueOnFail: item.requires_issue_on_fail,
          })),
      })),
  };
}

function issuePriorityForTemplate(slug: string): IssuePriority {
  if (
    slug === "high-risk-area-check" ||
    slug === "report-fault" ||
    slug === "hot-works-permit" ||
    slug === "spray-painting-panel-beating-check"
  ) {
    return "high";
  }

  return "medium";
}

function buildSubmissionNotes({
  fields,
  generalNotes,
  faultDescription,
  faultPhoto,
  faultPhotoUnavailableReason,
  submissionTimestamp,
  recipients,
  faultFound,
}: {
  fields: ChecklistFieldInput[];
  generalNotes: string;
  faultDescription: string;
  faultPhoto: File | null;
  faultPhotoUnavailableReason: string;
  submissionTimestamp: string;
  recipients: string[];
  faultFound: boolean;
}) {
  const fieldLines = fields.map((field) => {
    let value = "";

    if (field.value instanceof File) {
      value = `File selected: ${field.value.name}`;
    } else if (typeof field.value === "boolean") {
      value = field.value ? "Confirmed" : "Not confirmed";
    } else {
      value = String(field.value ?? "").trim() || "Not provided";
    }

    return `${field.label}: ${value}`;
  });

  return [
    `Submission timestamp: ${submissionTimestamp}`,
    `Route to: ${recipients.join(", ")}`,
    faultFound ? "Submission flag: FAULT FOUND" : "Submission flag: No fault found",
    ...fieldLines,
    faultDescription.trim() ? `Fault description: ${faultDescription.trim()}` : "",
    faultPhoto ? `Fault photo: ${faultPhoto.name}` : "",
    faultPhotoUnavailableReason.trim()
      ? `Fault photo unavailable reason: ${faultPhotoUnavailableReason.trim()}`
      : "",
    generalNotes.trim() ? `General notes: ${generalNotes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildStructuredSubmissionFields({
  fields,
  faultDescription,
  faultPhotoUnavailableReason,
  faultFound,
}: {
  fields: ChecklistFieldInput[];
  faultDescription: string;
  faultPhotoUnavailableReason: string;
  faultFound: boolean;
}) {
  const meterReading = getMeterReading(fields);

  return {
    asset_category: getFieldString(fields, "assetCategory") || null,
    asset_identifier: getFieldString(fields, "assetId") || null,
    staff_signature: getFieldString(fields, "staffSignature") || null,
    supervisor_signature: getFieldString(fields, "supervisorSignature") || null,
    fault_found: faultFound,
    fault_description: faultDescription.trim() || null,
    fault_photo_unavailable_reason: faultPhotoUnavailableReason.trim() || null,
    previous_meter_reading: meterReading.previous,
    current_meter_reading: meterReading.current,
    meter_unit: meterReading.unit,
    meter_reading_at: getFieldDateTimeIso(fields, "meterReadingTimestamp"),
    meter_override_reason: getFieldString(fields, "meterOverrideReason") || null,
  };
}

function getMeterReading(fields: ChecklistFieldInput[]) {
  const previousOdometer = getFieldNumber(fields, "previousOdometerKm");
  const currentOdometer = getFieldNumber(fields, "currentOdometerKm");

  if (previousOdometer !== null || currentOdometer !== null) {
    return {
      previous: previousOdometer,
      current: currentOdometer,
      unit: "kilometres",
    };
  }

  const previousHours = getFieldNumber(fields, "previousHourMeter");
  const currentHours = getFieldNumber(fields, "currentHourMeter");

  if (previousHours !== null || currentHours !== null) {
    return {
      previous: previousHours,
      current: currentHours,
      unit: "hours",
    };
  }

  return {
    previous: null,
    current: null,
    unit: null,
  };
}

function getFieldString(fields: ChecklistFieldInput[], fieldId: string) {
  const value = fields.find((field) => field.fieldId === fieldId)?.value;

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getFieldNumber(fields: ChecklistFieldInput[], fieldId: string) {
  const value = getFieldString(fields, fieldId);

  if (!value) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function getFieldDateTimeIso(fields: ChecklistFieldInput[], fieldId: string) {
  const value = getFieldString(fields, fieldId);

  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isMissingStructuredSubmissionColumnError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const { code, message } = error as { code?: string; message?: string };

  return (
    code === "PGRST204" ||
    code === "42703" ||
    structuredSubmissionColumnNames.some((columnName) => message?.includes(columnName))
  );
}

const structuredSubmissionColumnNames = [
  "asset_category",
  "asset_identifier",
  "staff_signature",
  "supervisor_signature",
  "fault_found",
  "fault_description",
  "fault_photo_unavailable_reason",
  "previous_meter_reading",
  "current_meter_reading",
  "meter_unit",
  "meter_reading_at",
  "meter_override_reason",
];

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isLocalDemoProfile(profile: Profile) {
  return profile.id.startsWith("local-") || profile.id.startsWith("public-");
}
