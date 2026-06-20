"use client";

export type PlannedActionType = "meal" | "nap" | "walk" | "medicine" | "activity" | "custom";

export type PlannedActionOption = {
  type: Exclude<PlannedActionType, "custom">;
  label: string;
};

export const plannedActionOptions: PlannedActionOption[] = [
  { type: "meal", label: "Meal" },
  { type: "nap", label: "Nap" },
  { type: "walk", label: "Walk" },
  { type: "medicine", label: "Medicine" },
  { type: "activity", label: "Activity" },
];

export function PlannedActionIcon({ type }: { type: PlannedActionType }) {
  if (type === "meal") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="13" cy="12" r="5" />
        <path d="M4.8 5v14" />
        <path d="M7.2 5v14" />
        <path d="M4.8 9h2.4" />
        <path d="M19 6v12" />
      </svg>
    );
  }

  if (type === "nap") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17.8 16.8A7 7 0 0 1 8.2 7.2 7.5 7.5 0 1 0 17.8 16.8Z" />
        <path d="m17.6 5.5.7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2.7-1.5Z" />
      </svg>
    );
  }

  if (type === "walk") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8.3 10.4c1 0 1.8-1.1 1.8-2.4s-.8-2.5-1.8-2.5S6.5 6.6 6.5 8s.8 2.4 1.8 2.4Z" />
        <path d="M15.7 10.4c1 0 1.8-1.1 1.8-2.4s-.8-2.5-1.8-2.5S13.9 6.6 13.9 8s.8 2.4 1.8 2.4Z" />
        <path d="M5.6 14.2c.8 0 1.5-.9 1.5-2s-.7-2-1.5-2-1.5.9-1.5 2 .7 2 1.5 2Z" />
        <path d="M18.4 14.2c.8 0 1.5-.9 1.5-2s-.7-2-1.5-2-1.5.9-1.5 2 .7 2 1.5 2Z" />
        <path d="M8 17.2c0-1.8 1.8-3.2 4-3.2s4 1.4 4 3.2c0 1-.7 1.7-1.7 1.7-.8 0-1.3-.4-2.3-.4s-1.5.4-2.3.4c-1 0-1.7-.7-1.7-1.7Z" />
      </svg>
    );
  }

  if (type === "medicine") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m8.2 15.8 7.6-7.6a3.4 3.4 0 0 1 4.8 4.8L13 20.6a3.4 3.4 0 0 1-4.8-4.8Z" />
        <path d="m12 12 4 4" />
      </svg>
    );
  }

  if (type === "activity") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m12 4 2.2 4.7 5.1.6-3.8 3.5 1 5-4.5-2.5-4.5 2.5 1-5-3.8-3.5 5.1-.6L12 4Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m7 4 .8 2.2L10 7l-2.2.8L7 10l-.8-2.2L4 7l2.2-.8L7 4Z" />
      <path d="m16 7 1.2 3.1L20 11l-2.8.9L16 15l-1.2-3.1L12 11l2.8-.9L16 7Z" />
      <path d="m9.5 14 .9 2.5 2.6 1-2.6 1-.9 2.5-.9-2.5-2.6-1 2.6-1 .9-2.5Z" />
    </svg>
  );
}

export function PlannedActionBadge({
  type,
  label,
  selected = false,
  notes,
}: {
  type: PlannedActionType;
  label: string;
  selected?: boolean;
  notes?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-[18px] border px-3.5 py-2 text-sm font-black transition ${
        selected
          ? "border-violet-200 bg-violet-50 text-[#5B21B6] shadow-sm shadow-violet-100"
          : "border-blue-100 bg-white text-[#0F172A]"
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-[#7C3AED]">
        <PlannedActionIcon type={type} />
      </span>
      <span className="min-w-0">
        <span className="block">{label}</span>
        {notes && <span className="mt-0.5 block text-xs font-semibold leading-5 text-[#64748B]">{notes}</span>}
      </span>
    </span>
  );
}
