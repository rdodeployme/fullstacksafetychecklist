import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { deriveGroups, loadChecklistTemplates } from "../lib/checklists";
import { icons } from "../lib/icons";
import type { ChecklistTemplate, SafetyTileGroup, SafetyTileItem } from "../types";

const steps = [
  {
    label: "Choose your check",
    icon: "clipboard" as const,
  },
  {
    label: "Complete the form",
    icon: "check" as const,
  },
  {
    label: "Submit",
    icon: "check" as const,
  },
];

export function SafetyHubPage() {
  const { profile, signOut } = useAuth();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  useEffect(() => {
    let isMounted = true;

    loadChecklistTemplates()
      .then((loadedTemplates) => {
        if (isMounted) {
          setTemplates(loadedTemplates);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingTemplates(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const groups = useMemo(() => deriveGroups(templates), [templates]);

  return (
    <div className="min-h-screen bg-stone-50 text-charcoal">
      <Header
        operatorName={profile?.fullName}
        role={profile?.role}
        onChangeUser={signOut}
      />
      <main className="mx-auto w-full max-w-[1200px] px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        {profile ? <SignedInNotice operatorName={profile.fullName} /> : null}
        <section aria-labelledby="page-heading" className="mb-7">
          <p className="mb-2 text-lg font-bold text-recycle-800">
            Recycle Group Safety Hub
          </p>
          <h1
            id="page-heading"
            className="max-w-3xl text-3xl font-extrabold leading-tight text-charcoal sm:text-5xl"
          >
            Choose the check you need
          </h1>
          <p className="mt-4 text-xl font-semibold text-slate-700 sm:text-2xl">
            Tap the matching tile below to start.
          </p>
          <p className="mt-3 max-w-2xl border-l-4 border-recycle-600 pl-4 text-lg font-medium text-slate-700">
            If you are unsure, ask your supervisor before continuing.
          </p>
        </section>

        <StepStrip />
        <FleetNumberLookup />
        {isLoadingTemplates ? (
          <div className="status-note mb-8">Loading checklist tiles...</div>
        ) : (
          <TileGrid groups={groups} templates={templates} />
        )}
      </main>
    </div>
  );
}

function FleetNumberLookup() {
  const navigate = useNavigate();
  const [fleetNumber, setFleetNumber] = useState("");
  const [error, setError] = useState("");
  const Search = icons["truck"];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedFleetNumber = fleetNumber.trim().toUpperCase().replace(/\s+/g, "");
    if (!normalizedFleetNumber) {
      setError("Type the fleet number before starting.");
      return;
    }

    setError("");
    navigate(`/forms/driver-check?fleetNumber=${encodeURIComponent(normalizedFleetNumber)}`);
  }

  return (
    <section
      aria-labelledby="fleet-lookup-heading"
      className="mb-8 rounded-lg border-2 border-recycle-100 bg-white p-5 shadow-tile sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
        <div className="flex-1">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-recycle-50 text-recycle-800">
              <Search aria-hidden="true" className="h-8 w-8" />
            </div>
            <div>
              <h2 id="fleet-lookup-heading" className="text-2xl font-extrabold text-charcoal">
                Type fleet number
              </h2>
              <p className="mt-1 text-lg font-semibold text-slate-700">
                Enter any fleet number to start a Driver Check.
              </p>
            </div>
          </div>

          <form className="grid gap-4 md:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="fleetNumber">
              Fleet number
            </label>
            <input
              id="fleetNumber"
              className="field-input uppercase"
              type="text"
              inputMode="text"
              autoComplete="off"
              value={fleetNumber}
              onChange={(event) => setFleetNumber(event.target.value)}
              placeholder="Example: TRUCK-1"
            />
            <button className="primary-action md:w-auto" type="submit">
              Start check
            </button>
          </form>

          {error ? <p className="error-note mt-4">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}

function Header({
  operatorName,
  role,
  onChangeUser,
}: {
  operatorName?: string;
  role?: string;
  onChangeUser: () => void;
}) {
  const UserCheck = icons["user-check"];
  const Home = icons.home;
  const HelpCircle = icons.help;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link
          to="/"
          className="text-xl font-extrabold leading-tight text-charcoal focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-recycle-600 sm:text-2xl"
          aria-label="Recycle Group Safety Hub home"
        >
          Recycle Group Safety Hub
        </Link>
        <div className="flex flex-col gap-3 sm:items-end">
          {operatorName ? (
            <p className="text-base font-bold text-slate-700">
              Signed in as <span className="text-charcoal">{operatorName}</span>
            </p>
          ) : null}
          <nav aria-label="Main navigation" className="flex flex-wrap gap-3">
            <Link className="nav-link" to="/">
              <Home aria-hidden="true" className="h-5 w-5" />
              Home
            </Link>
            {(role === "supervisor" || role === "admin") && (
              <Link className="nav-link" to="/issues">
                <UserCheck aria-hidden="true" className="h-5 w-5" />
                Issues
              </Link>
            )}
            {role === "admin" && (
              <Link className="nav-link" to="/admin">
                <UserCheck aria-hidden="true" className="h-5 w-5" />
                Admin
              </Link>
            )}
            <Link className="nav-link" to="/help">
              <HelpCircle aria-hidden="true" className="h-5 w-5" />
              Help
            </Link>
            {operatorName ? (
              <button className="nav-link" type="button" onClick={onChangeUser}>
                <UserCheck aria-hidden="true" className="h-5 w-5" />
                Change user
              </button>
            ) : (
              <Link className="nav-link" to="/login">
                <UserCheck aria-hidden="true" className="h-5 w-5" />
                Admin login
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

function SignedInNotice({ operatorName }: { operatorName: string }) {
  return (
    <section
      aria-label="Current signed in operator"
      className="mb-6 rounded-lg border border-recycle-100 bg-recycle-50 px-5 py-4 text-lg font-bold text-recycle-800"
    >
      Forms will be started for {operatorName}.
    </section>
  );
}

function StepStrip() {
  return (
    <section
      aria-label="How to use the Safety Hub"
      className="mb-8 grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-3"
    >
      {steps.map((step, index) => {
        const Icon = icons[step.icon];

        return (
          <div
            className="flex min-h-16 items-center gap-3 rounded-md bg-slate-50 px-4 py-3"
            key={step.label}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-recycle-100 text-recycle-800">
              <Icon aria-hidden="true" className="h-6 w-6" />
            </div>
            <p className="text-base font-bold text-slate-800">
              <span className="mr-2 text-recycle-800">{index + 1}.</span>
              {step.label}
            </p>
          </div>
        );
      })}
    </section>
  );
}

function TileGrid({
  groups,
  templates,
}: {
  groups: SafetyTileGroup[];
  templates: ChecklistTemplate[];
}) {
  return (
    <section aria-label="Safety checks" className="space-y-8">
      {groups.map((group) => (
        <div id={group.id} key={group.heading} className="scroll-mt-6">
          <h2 className="mb-4 text-2xl font-extrabold text-charcoal" tabIndex={-1}>
            {group.heading}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {templates
              .filter((template) => template.groupId === group.id)
              .map((template) => (
                <SafetyTile
                  key={template.slug}
                  tile={{
                    title: template.title,
                    description: template.description,
                    href: `/forms/${template.slug}`,
                    icon: template.icon,
                    variant: template.variant,
                  }}
                />
              ))}
          </div>
        </div>
      ))}
      <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-lg font-semibold text-slate-700">
        Use the tile that best matches the check. If a machine or area is not
        listed, ask your supervisor before continuing.
      </div>
    </section>
  );
}

function SafetyTile({ tile }: { tile: SafetyTileItem }) {
  const Icon = icons[tile.icon];
  const variantClass = {
    standard: "tile-standard",
    warning: "tile-warning",
    danger: "tile-danger",
  }[tile.variant];
  const className = `safety-tile ${variantClass}`;
  const children = (
    <>
      <span className="tile-icon" aria-hidden="true">
        <Icon className="h-12 w-12" strokeWidth={2.2} />
      </span>
      <span className="block text-2xl font-extrabold leading-tight text-charcoal">
        {tile.title}
      </span>
      <span className="mt-3 block text-lg font-medium leading-snug text-slate-700">
        {tile.description}
      </span>
    </>
  );

  if (tile.href.startsWith("#")) {
    return (
      <a href={tile.href} className={className} aria-label={`${tile.title}: ${tile.description}`}>
        {children}
      </a>
    );
  }

  return (
    <Link to={tile.href} className={className} aria-label={`${tile.title}: ${tile.description}`}>
      {children}
    </Link>
  );
}
