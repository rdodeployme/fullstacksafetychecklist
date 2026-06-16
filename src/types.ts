import type { LucideIcon } from "lucide-react";

export type UserRole = "operator" | "supervisor" | "admin";

export type TileVariant = "standard" | "warning" | "danger";

export type IconKey =
  | "alert"
  | "boxes"
  | "check"
  | "clipboard"
  | "cog"
  | "door"
  | "factory"
  | "forklift"
  | "help"
  | "home"
  | "map-pin"
  | "package-check"
  | "rotate"
  | "scissors"
  | "shield-alert"
  | "tractor"
  | "truck"
  | "user-check"
  | "users"
  | "wind"
  | "wrench";

export type SafetyTileGroup = {
  id: string;
  heading: string;
  description: string;
  icon: IconKey;
  variant: TileVariant;
};

export type ChecklistItem = {
  id: string;
  prompt: string;
  displayOrder: number;
  requiresIssueOnFail?: boolean;
};

export type ChecklistFieldType =
  | "text"
  | "number"
  | "date"
  | "datetime-local"
  | "file"
  | "checkbox"
  | "select";

export type ChecklistField = {
  id: string;
  label: string;
  type: ChecklistFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
};

export type ChecklistSection = {
  id: string;
  title: string;
  displayOrder: number;
  items: ChecklistItem[];
};

export type ChecklistTemplate = {
  id: string;
  slug: string;
  title: string;
  description: string;
  groupId: string;
  groupTitle: string;
  groupDescription: string;
  groupIcon: IconKey;
  groupVariant: TileVariant;
  icon: IconKey;
  variant: TileVariant;
  displayOrder: number;
  createsIssue?: boolean;
  fields?: ChecklistField[];
  sections: ChecklistSection[];
};

export type SafetyTileItem = {
  title: string;
  description: string;
  href: string;
  icon: IconKey;
  variant: TileVariant;
};

export type IconComponentMap = Record<IconKey, LucideIcon>;

export type Profile = {
  id: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  email?: string;
};

export type AnswerValue = "pass" | "fail" | "na";

export type ChecklistAnswerInput = {
  itemId: string;
  prompt: string;
  response: AnswerValue;
  notes: string;
  requiresIssueOnFail?: boolean;
};

export type ChecklistFieldValue = string | boolean | File | null;

export type ChecklistFieldInput = {
  fieldId: string;
  label: string;
  type: ChecklistFieldType;
  value: ChecklistFieldValue;
};

export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

export type IssuePriority = "low" | "medium" | "high" | "critical";

export type IssueRecord = {
  id: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  createdAt: string;
  createdByName?: string | null;
  assignedToName?: string | null;
  sourceTemplateSlug?: string | null;
};
