import type {
  AnswerValue,
  ChecklistField,
  ChecklistFieldValue,
  ChecklistTemplate,
} from "../types";

export type AnswerState = Record<string, { response: AnswerValue | ""; notes: string }>;
export type FieldState = Record<string, ChecklistFieldValue>;

export function buildInitialAnswers(template: ChecklistTemplate | null): AnswerState {
  if (!template) {
    return {};
  }

  return Object.fromEntries(
    template.sections.flatMap((section) =>
      section.items.map((item) => [item.id, { response: "", notes: "" }]),
    ),
  );
}

export function buildInitialFieldValues(
  template: ChecklistTemplate | null,
  fleetNumber: string | null,
): FieldState {
  const fields = getTemplateFields(template);

  if (!fields.length) {
    return {};
  }

  return Object.fromEntries(
    fields.map((field) => {
      if (field.id === "assetCategory" && template) {
        return [field.id, inferAssetCategory(template)];
      }

      if (field.id === "assetOwnership") {
        return [field.id, "Company-owned asset"];
      }

      if (field.id === "assetId" && fleetNumber) {
        return [field.id, fleetNumber.toUpperCase()];
      }

      return [field.id, defaultFieldValue(field)];
    }),
  );
}

export function getTemplateFields(template: ChecklistTemplate | null): ChecklistField[] {
  if (!template) {
    return [];
  }

  const standardFields: ChecklistField[] = [
    {
      id: "assetCategory",
      label: "Asset category",
      type: "select",
      required: true,
      options: assetCategoryOptions,
    },
    {
      id: "assetOwnership",
      label: "Ownership type",
      type: "select",
      required: true,
      options: assetOwnershipOptions,
      helpText: "Choose franchisee-owned if this asset is owned by a franchisee.",
    },
    {
      id: "assetId",
      label: "Asset ID / Asset Number",
      type: "text",
      required: true,
      placeholder: "Asset number, area name, or permit reference",
    },
    {
      id: "checkDateTime",
      label: "Date and time",
      type: "datetime-local",
      required: true,
    },
    {
      id: "drugFree",
      label: "Drug free confirmed",
      type: "checkbox",
      required: true,
    },
    {
      id: "alcoholFree",
      label: "Alcohol free confirmed",
      type: "checkbox",
      required: true,
    },
    {
      id: "notMedicationImpaired",
      label: "Not impaired by medication confirmed",
      type: "checkbox",
      required: true,
    },
    {
      id: "fitForWork",
      label: "Fit for work confirmed",
      type: "checkbox",
      required: true,
    },
    {
      id: "currentLicence",
      label: "Correct licence / permit held where required",
      type: "checkbox",
      required: true,
    },
    {
      id: "appropriateClothingConfirmed",
      label: "Appropriate clothing worn",
      type: "checkbox",
      required: true,
    },
    {
      id: "ppeSafetyVestConfirmed",
      label: "PPE / safety vest worn where required",
      type: "checkbox",
      required: true,
    },
    {
      id: "staffSignature",
      label: "Staff signature",
      type: "text",
      required: true,
      placeholder: "Type your full name as your signature",
      helpText: "This records who completed the check.",
    },
  ];

  const supervisorSignatureField: ChecklistField = {
    id: "supervisorSignature",
    label: "Supervisor signature, if applicable",
    type: "text",
    required: false,
    placeholder: "Supervisor can type their name if approval is needed",
  };

  const fields = supervisorSignatureSlugs.has(template.slug)
    ? [...standardFields, supervisorSignatureField, ...(template.fields ?? [])]
    : [...standardFields, ...(template.fields ?? [])];

  const uniqueFields = new Map<string, ChecklistField>();

  for (const field of fields) {
    if (!uniqueFields.has(field.id)) {
      uniqueFields.set(field.id, field);
    }
  }

  return Array.from(uniqueFields.values());
}

export function defaultFieldValue(field: ChecklistField): ChecklistFieldValue {
  if (field.type === "checkbox") {
    return false;
  }

  if (field.type === "file") {
    return null;
  }

  if (field.type === "datetime-local") {
    return currentDateTimeValue();
  }

  return "";
}

export function getMissingRequiredFields(fields: ChecklistField[], values: FieldState) {
  return fields.filter((field) => {
    if (!field.required) {
      return false;
    }

    const value = values[field.id];

    if (field.type === "checkbox") {
      return value !== true;
    }

    if (field.type === "file") {
      return !(value instanceof File);
    }

    return !String(value ?? "").trim();
  });
}

export function getMeterValidationError(values: FieldState) {
  const overrideReason = String(values.meterOverrideReason ?? "").trim();
  const odometerError = validateMeterPair({
    previous: values.previousOdometerKm,
    current: values.currentOdometerKm,
    abnormalIncrease: 1000,
    label: "odometer kilometres",
    overrideReason,
  });

  if (odometerError) {
    return odometerError;
  }

  return validateMeterPair({
    previous: values.previousHourMeter,
    current: values.currentHourMeter,
    abnormalIncrease: 24,
    label: "hour meter",
    overrideReason,
  });
}

export function getMeterReadingFlag(values: FieldState) {
  return (
    getMeterPairFlag({
      previous: values.previousOdometerKm,
      current: values.currentOdometerKm,
      abnormalIncrease: 1000,
      label: "Odometer",
    }) ||
    getMeterPairFlag({
      previous: values.previousHourMeter,
      current: values.currentHourMeter,
      abnormalIncrease: 24,
      label: "Hour meter",
    })
  );
}

function currentDateTimeValue() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function getMeterPairFlag({
  previous,
  current,
  abnormalIncrease,
  label,
}: {
  previous: ChecklistFieldValue | undefined;
  current: ChecklistFieldValue | undefined;
  abnormalIncrease: number;
  label: string;
}) {
  if (previous === undefined || current === undefined || previous === "" || current === "") {
    return "";
  }

  const previousNumber = Number(previous);
  const currentNumber = Number(current);

  if (Number.isNaN(previousNumber) || Number.isNaN(currentNumber)) {
    return "";
  }

  if (currentNumber < previousNumber) {
    return `${label} decreased from ${previousNumber} to ${currentNumber}. Authorised override reason supplied.`;
  }

  if (currentNumber - previousNumber > abnormalIncrease) {
    return `${label} increased by ${currentNumber - previousNumber}, which is above the normal threshold. Authorised override reason supplied.`;
  }

  return "";
}

function validateMeterPair({
  previous,
  current,
  abnormalIncrease,
  label,
  overrideReason,
}: {
  previous: ChecklistFieldValue | undefined;
  current: ChecklistFieldValue | undefined;
  abnormalIncrease: number;
  label: string;
  overrideReason: string;
}) {
  if (previous === undefined || current === undefined || previous === "" || current === "") {
    return "";
  }

  const previousNumber = Number(previous);
  const currentNumber = Number(current);

  if (Number.isNaN(previousNumber) || Number.isNaN(currentNumber)) {
    return "";
  }

  if (currentNumber < previousNumber && !overrideReason) {
    return `The current ${label} cannot be lower than the previous reading unless an authorised override reason is entered.`;
  }

  if (currentNumber - previousNumber > abnormalIncrease && !overrideReason) {
    return `The ${label} increase looks unusually high. Enter an authorised override reason before submitting.`;
  }

  return "";
}

const supervisorSignatureSlugs = new Set([
  "hot-works-permit",
  "spray-painting-panel-beating-check",
  "truck-service-bay-check",
  "service-repair",
  "manager-follow-up",
]);

const assetCategoryOptions = [
  "Truck",
  "Hook Truck",
  "Forklift",
  "Excavator",
  "Skid Steer",
  "Shredder",
  "Baler",
  "EPS / Polystyrene Machine",
  "Scissor Lift",
  "Floor Scrubber",
  "Extraction Ducting",
  "Dumpmaster",
  "Screen",
  "Crusher",
  "Conveyor",
  "Roller",
  "Service Bay",
  "Hot Works",
  "Spray Painting / Panel Beating",
  "Area",
  "Other",
];

const assetOwnershipOptions = [
  "Company-owned asset",
  "Franchisee-owned asset",
];

function inferAssetCategory(template: ChecklistTemplate) {
  const title = template.title.toLowerCase();

  if (title.includes("hook truck")) return "Hook Truck";
  if (title.includes("truck")) return "Truck";
  if (title.includes("forklift")) return "Forklift";
  if (title.includes("excavator")) return "Excavator";
  if (title.includes("skid steer")) return "Skid Steer";
  if (title.includes("shredder")) return "Shredder";
  if (title.includes("baler")) return "Baler";
  if (title.includes("eps") || title.includes("polystyrene")) return "EPS / Polystyrene Machine";
  if (title.includes("scissor")) return "Scissor Lift";
  if (title.includes("floor scrubber")) return "Floor Scrubber";
  if (title.includes("ducting")) return "Extraction Ducting";
  if (title.includes("dumpmaster")) return "Dumpmaster";
  if (title.includes("screen")) return "Screen";
  if (title.includes("crusher")) return "Crusher";
  if (title.includes("conveyor")) return "Conveyor";
  if (title.includes("roller")) return "Roller";
  if (title.includes("service bay")) return "Service Bay";
  if (title.includes("hot works")) return "Hot Works";
  if (title.includes("spray") || title.includes("panel beating")) {
    return "Spray Painting / Panel Beating";
  }
  if (title.includes("area")) return "Area";

  return "Other";
}
