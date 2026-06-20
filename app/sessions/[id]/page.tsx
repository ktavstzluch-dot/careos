"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DependentType = "child" | "pet" | "elder";
type SessionStatus = "scheduled" | "active" | "completed" | "cancelled";
type PlannedActionType = "meal" | "nap" | "walk" | "medicine" | "activity" | "custom";

type Family = {
  id: string;
  name: string;
};

type Dependent = {
  id: string;
  family_id: string;
  type: DependentType;
  name: string;
  photo_url: string | null;
};

type PlannedAction = {
  id: string;
  type: PlannedActionType;
  label: string;
  notes?: string;
};

type CareSession = {
  id: string;
  family_id: string;
  dependent_id: string;
  title: string | null;
  care_type: string | null;
  caregiver_name: string | null;
  status: SessionStatus;
  starts_at: string | null;
  ends_at: string | null;
  planned_actions: PlannedAction[];
  notes: string | null;
  instructions: string | null;
  created_at: string;
};

type SessionForm = {
  title: string;
  caregiver_name: string;
  starts_at: string;
  ends_at: string;
  notes: string;
  planned_action_types: PlannedActionType[];
  custom_instruction: string;
};

const sessionSelect =
  "id, family_id, dependent_id, title, care_type, caregiver_name, status, starts_at, ends_at, planned_actions, notes, instructions, created_at";

const plannedActionOptions: Array<{ type: Exclude<PlannedActionType, "custom">; label: string }> = [
  { type: "meal", label: "Meal" },
  { type: "nap", label: "Nap" },
  { type: "walk", label: "Walk" },
  { type: "medicine", label: "Medicine" },
  { type: "activity", label: "Activity" },
];

const typeConfig: Record<DependentType, { label: string; avatarClass: string; badgeClass: string }> = {
  child: {
    label: "Child",
    avatarClass: "bg-violet-50 text-violet-700",
    badgeClass: "bg-violet-50 text-violet-700",
  },
  pet: {
    label: "Pet",
    avatarClass: "bg-emerald-50 text-[#22C55E]",
    badgeClass: "bg-emerald-50 text-[#22C55E]",
  },
  elder: {
    label: "Elder",
    avatarClass: "bg-blue-50 text-[#2563EB]",
    badgeClass: "bg-blue-50 text-[#2563EB]",
  },
};

const statusConfig: Record<SessionStatus, { label: string; dotClass: string; badgeClass: string }> = {
  scheduled: {
    label: "Confirmed",
    dotClass: "bg-[#22C55E]",
    badgeClass: "bg-emerald-50 text-[#16A34A]",
  },
  active: {
    label: "Active",
    dotClass: "bg-[#22C55E]",
    badgeClass: "bg-emerald-50 text-[#16A34A]",
  },
  completed: {
    label: "Completed",
    dotClass: "bg-slate-300",
    badgeClass: "bg-slate-50 text-[#64748B]",
  },
  cancelled: {
    label: "Cancelled",
    dotClass: "bg-slate-300",
    badgeClass: "bg-slate-50 text-[#64748B]",
  },
};

function DependentTypeIcon({ type }: { type: DependentType }) {
  if (type === "pet") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8.5 10.5c1.1 0 2-1.2 2-2.7s-.9-2.8-2-2.8-2 1.2-2 2.8.9 2.7 2 2.7Z" />
        <path d="M15.5 10.5c1.1 0 2-1.2 2-2.7S16.6 5 15.5 5s-2 1.2-2 2.8.9 2.7 2 2.7Z" />
        <path d="M5.8 14.5c.9 0 1.7-1 1.7-2.2S6.7 10 5.8 10s-1.7 1-1.7 2.3.8 2.2 1.7 2.2Z" />
        <path d="M18.2 14.5c.9 0 1.7-1 1.7-2.2s-.8-2.3-1.7-2.3-1.7 1-1.7 2.3.8 2.2 1.7 2.2Z" />
        <path d="M7.8 17.5c0-2.1 1.9-3.7 4.2-3.7s4.2 1.6 4.2 3.7c0 1.2-.8 2-1.9 2-.9 0-1.4-.5-2.3-.5s-1.4.5-2.3.5c-1.1 0-1.9-.8-1.9-2Z" />
      </svg>
    );
  }

  if (type === "elder") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.5 20c1.4-3.2 4-5 7.5-5s6.1 1.8 7.5 5" />
        <path d="M17.5 14.5 19 20" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M5 20c1.2-3.5 3.5-5.2 7-5.2s5.8 1.7 7 5.2" />
      <path d="M8 12.5c.9 1 2.2 1.5 4 1.5s3.1-.5 4-1.5" />
    </svg>
  );
}

function formatTimeRange(startValue: string | null, endValue: string | null) {
  if (!startValue || !endValue) return "Time to be confirmed";

  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatter.format(new Date(startValue))} - ${formatter.format(new Date(endValue))}`;
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function buildPlannedActions(actionTypes: PlannedActionType[], customInstruction: string): PlannedAction[] {
  const actions: PlannedAction[] = actionTypes
    .filter((type): type is Exclude<PlannedActionType, "custom"> => type !== "custom")
    .map((type) => {
      const option = plannedActionOptions.find((item) => item.type === type);
      return {
        id: type,
        type,
        label: option?.label || type,
      };
    });

  const trimmedCustomInstruction = customInstruction.trim();
  if (trimmedCustomInstruction) {
    actions.push({
      id: `custom-${Date.now()}`,
      type: "custom",
      label: "Custom care instruction",
      notes: trimmedCustomInstruction,
    });
  }

  return actions;
}

function getFormFromSession(session: CareSession): SessionForm {
  const plannedActions = Array.isArray(session.planned_actions) ? session.planned_actions : [];
  const plannedActionTypes = plannedActions
    .filter((action) => action.type !== "custom")
    .map((action) => action.type);
  const customInstruction = plannedActions.find((action) => action.type === "custom")?.notes || "";

  return {
    title: session.title || "",
    caregiver_name: session.caregiver_name || "",
    starts_at: toDateTimeLocalValue(session.starts_at),
    ends_at: toDateTimeLocalValue(session.ends_at),
    notes: session.notes || session.instructions || "",
    planned_action_types: plannedActionTypes,
    custom_instruction: customInstruction,
  };
}

export default function SessionPlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const sessionId = params.id;
  const [family, setFamily] = useState<Family | null>(null);
  const [session, setSession] = useState<CareSession | null>(null);
  const [dependent, setDependent] = useState<Dependent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SessionForm>({
    title: "",
    caregiver_name: "",
    starts_at: "",
    ends_at: "",
    notes: "",
    planned_action_types: [],
    custom_instruction: "",
  });

  async function loadSession() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/sign-in");
      return;
    }

    const { data: familyData } = await supabase
      .from("families")
      .select("id, name")
      .eq("owner_id", userData.user.id)
      .maybeSingle();

    if (!familyData) {
      setFamily(null);
      setSession(null);
      setDependent(null);
      setLoading(false);
      return;
    }

    setFamily(familyData as Family);

    const { data: sessionData } = await supabase
      .from("care_sessions")
      .select(sessionSelect)
      .eq("id", sessionId)
      .eq("family_id", familyData.id)
      .maybeSingle();

    if (!sessionData) {
      setSession(null);
      setDependent(null);
      setLoading(false);
      return;
    }

    const loadedSession = sessionData as CareSession;
    loadedSession.planned_actions = Array.isArray(loadedSession.planned_actions)
      ? loadedSession.planned_actions
      : [];
    setSession(loadedSession);
    setForm(getFormFromSession(loadedSession));

    const { data: dependentData } = await supabase
      .from("dependents")
      .select("id, family_id, type, name, photo_url")
      .eq("id", loadedSession.dependent_id)
      .eq("family_id", familyData.id)
      .maybeSingle();

    setDependent((dependentData || null) as Dependent | null);
    setLoading(false);
  }

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const type = dependent?.type || "child";
  const typeStyle = typeConfig[type];
  const statusStyle = session ? statusConfig[session.status] : statusConfig.scheduled;
  const initial = useMemo(() => dependent?.name.slice(0, 1).toUpperCase() || "C", [dependent]);
  const instructions = session?.notes || session?.instructions || "";
  const plannedActions = Array.isArray(session?.planned_actions) ? session.planned_actions : [];

  function updateForm(field: keyof SessionForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function togglePlannedAction(type: PlannedActionType) {
    setForm((current) => {
      const isSelected = current.planned_action_types.includes(type);
      return {
        ...current,
        planned_action_types: isSelected
          ? current.planned_action_types.filter((item) => item !== type)
          : [...current.planned_action_types, type],
      };
    });
  }

  function startEditing() {
    if (!session || session.status === "cancelled") return;
    setForm(getFormFromSession(session));
    setEditing(true);
    setMessage(null);
    setMessageType(null);
  }

  async function saveSessionPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session || !family) return;

    const title = form.title.trim();
    const caregiverName = form.caregiver_name.trim();
    const notes = form.notes.trim();
    const startsAt = form.starts_at ? new Date(form.starts_at) : null;
    const endsAt = form.ends_at ? new Date(form.ends_at) : null;

    if (!title || !caregiverName || !startsAt || !endsAt) {
      setMessage("Please complete the session plan before saving.");
      setMessageType("error");
      return;
    }

    if (endsAt <= startsAt) {
      setMessage("End time must be after start time.");
      setMessageType("error");
      return;
    }

    setSaving(true);
    setMessage(null);
    setMessageType(null);

    const { data, error } = await supabase
      .from("care_sessions")
      .update({
        title,
        care_type: title,
        caregiver_name: caregiverName,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        notes: notes || null,
        instructions: notes || null,
        planned_actions: buildPlannedActions(form.planned_action_types, form.custom_instruction),
      })
      .eq("id", session.id)
      .eq("family_id", family.id)
      .select(sessionSelect)
      .maybeSingle();

    setSaving(false);

    if (error || !data) {
      setMessage(error?.message || "Session plan could not be saved.");
      setMessageType("error");
      return;
    }

    const updatedSession = data as CareSession;
    updatedSession.planned_actions = Array.isArray(updatedSession.planned_actions)
      ? updatedSession.planned_actions
      : [];
    setSession(updatedSession);
    setForm(getFormFromSession(updatedSession));
    setEditing(false);
    setMessage("Session plan saved.");
    setMessageType("success");
  }

  async function cancelSession() {
    if (!session || !family) return;

    setSaving(true);
    setMessage(null);
    setMessageType(null);

    const { data, error } = await supabase
      .from("care_sessions")
      .update({ status: "cancelled" })
      .eq("id", session.id)
      .eq("family_id", family.id)
      .select(sessionSelect)
      .maybeSingle();

    setSaving(false);

    if (error || !data) {
      setMessage(error?.message || "Session could not be cancelled.");
      setMessageType("error");
      return;
    }

    const updatedSession = data as CareSession;
    updatedSession.planned_actions = Array.isArray(updatedSession.planned_actions)
      ? updatedSession.planned_actions
      : [];
    setSession(updatedSession);
    setEditing(false);
    setMessage("Session cancelled.");
    setMessageType("success");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-[#64748B]">Loading Care Session...</p>
        </div>
      </main>
    );
  }

  if (!session || !dependent) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] px-5 py-12 text-[#0F172A]">
        <section className="mx-auto max-w-2xl rounded-[36px] border border-blue-100 bg-white p-8 text-center shadow-xl shadow-blue-100/45">
          <button
            onClick={() => router.push("/schedule")}
            className="mx-auto mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#0F172A] transition hover:bg-blue-50 hover:text-[#2563EB]"
          >
            ←
          </button>
          <h1 className="text-3xl font-black tracking-tight text-[#0F172A]">Care Session not found</h1>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">
            This care session may have been removed or is no longer available.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-16 text-[#0F172A]">
      <section className="mx-auto max-w-6xl px-5 py-7 md:py-10">
        <button
          onClick={() => router.push("/schedule")}
          className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#0F172A] shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50 hover:text-[#2563EB]"
        >
          ←
        </button>

        <div className="mb-6">
          <p className="text-sm font-semibold text-[#64748B]">Session Plan</p>
          <h1 className="mt-1 text-4xl font-black tracking-tight text-[#0F172A]">Care Session</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#64748B]">
            Review the plan before care begins.
          </p>
        </div>

        <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            {dependent.photo_url ? (
              <img src={dependent.photo_url} alt={dependent.name} className="h-20 w-20 rounded-[26px] object-cover" />
            ) : (
              <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-[26px] text-2xl font-black ${typeStyle.avatarClass}`}>
                {initial}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black text-[#0F172A]">{dependent.name}</h2>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${typeStyle.badgeClass}`}>
                      <DependentTypeIcon type={dependent.type} />
                      {typeStyle.label}
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-black text-[#0F172A]">{session.title || "Care Session"}</p>
                </div>

                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusStyle.badgeClass}`}>
                  <span className={`h-2 w-2 rounded-full ${statusStyle.dotClass}`} />
                  {statusStyle.label}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] bg-[#F8FAFC] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Caregiver</p>
                  <p className="mt-1 text-sm font-black text-[#0F172A]">{session.caregiver_name || "Caregiver"}</p>
                </div>
                <div className="rounded-[22px] bg-[#F8FAFC] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Planned care time</p>
                  <p className="mt-1 text-sm font-black text-[#0F172A]">{formatTimeRange(session.starts_at, session.ends_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div
            className={`mt-5 rounded-[24px] px-5 py-4 text-sm font-semibold ${
              messageType === "error" ? "bg-red-50 text-[#EF4444]" : "bg-emerald-50 text-[#16A34A]"
            }`}
          >
            {message}
          </div>
        )}

        {session.status === "cancelled" && (
          <section className="mt-6 rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            <div className="rounded-[30px] bg-slate-50 p-5">
              <h2 className="text-2xl font-black text-[#0F172A]">This care session has been cancelled.</h2>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">The plan is still visible for reference.</p>
            </div>
          </section>
        )}

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.72fr]">
          <div className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#64748B]">Planned Care</p>
                <h2 className="mt-1 text-3xl font-black text-[#0F172A]">Session Plan</h2>
              </div>
              {session.status !== "cancelled" && (
                <button
                  onClick={editing ? () => setEditing(false) : startEditing}
                  className="rounded-[20px] bg-blue-50 px-5 py-3 text-sm font-black text-[#2563EB] transition hover:bg-[#2563EB] hover:text-white"
                >
                  {editing ? "Cancel" : "Edit Session"}
                </button>
              )}
            </div>

            {plannedActions.length === 0 ? (
              <div className="mt-6 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                <p className="font-semibold text-[#0F172A]">No planned care actions yet</p>
              </div>
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {plannedActions.map((action) => (
                  <div key={action.id} className="rounded-[24px] bg-[#F8FAFC] p-4">
                    <p className="text-sm font-black text-[#0F172A]">{action.label}</p>
                    {action.notes && <p className="mt-2 text-sm leading-6 text-[#64748B]">{action.notes}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 rounded-[28px] bg-[#F8FAFC] p-5">
              <p className="text-sm font-semibold text-[#64748B]">Care Instructions</p>
              <p className="mt-2 text-sm leading-6 text-[#0F172A]">
                {instructions.trim() || "No extra instructions added."}
              </p>
            </div>

            <div className="mt-6 rounded-[28px] bg-gradient-to-br from-emerald-50 to-blue-50 p-5">
              <h3 className="text-lg font-black text-[#0F172A]">Open Care Log</h3>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">
                Care Log will use this plan when care begins.
              </p>
              <button
                onClick={() => router.push("/care-log")}
                className="mt-4 rounded-[20px] bg-[#2563EB] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8]"
              >
                Open Care Log
              </button>
            </div>
          </div>

          <div className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            {editing ? (
              <form onSubmit={saveSessionPlan}>
                <h2 className="text-2xl font-black text-[#0F172A]">Edit Session</h2>
                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Title</span>
                    <input
                      value={form.title}
                      onChange={(event) => updateForm("title", event.target.value)}
                      className="mt-2 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Caregiver name</span>
                    <input
                      value={form.caregiver_name}
                      onChange={(event) => updateForm("caregiver_name", event.target.value)}
                      className="mt-2 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Start date/time</span>
                    <input
                      type="datetime-local"
                      value={form.starts_at}
                      onChange={(event) => updateForm("starts_at", event.target.value)}
                      className="mt-2 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">End date/time</span>
                    <input
                      type="datetime-local"
                      value={form.ends_at}
                      onChange={(event) => updateForm("ends_at", event.target.value)}
                      className="mt-2 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      required
                    />
                  </label>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Planned Care</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {plannedActionOptions.map((option) => {
                        const selected = form.planned_action_types.includes(option.type);

                        return (
                          <button
                            key={option.type}
                            type="button"
                            onClick={() => togglePlannedAction(option.type)}
                            className={`rounded-[20px] border px-4 py-3 text-left text-sm font-black transition ${
                              selected
                                ? "border-blue-200 bg-blue-50 text-[#2563EB]"
                                : "border-blue-100 bg-white text-[#0F172A] hover:bg-blue-50"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Custom instruction optional</span>
                    <input
                      value={form.custom_instruction}
                      onChange={(event) => updateForm("custom_instruction", event.target.value)}
                      className="mt-2 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Care Instructions</span>
                    <textarea
                      value={form.notes}
                      onChange={(event) => updateForm("notes", event.target.value)}
                      className="mt-2 min-h-28 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="mt-5 w-full rounded-[22px] bg-[#2563EB] px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {saving ? "Saving..." : "Save Session Plan"}
                </button>
              </form>
            ) : (
              <div>
                <h2 className="text-2xl font-black text-[#0F172A]">Plan actions</h2>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">
                  Adjust the planned care before it begins, or cancel the care session if plans change.
                </p>
                {session.status !== "cancelled" && (
                  <button
                    onClick={cancelSession}
                    disabled={saving}
                    className="mt-6 w-full rounded-[22px] border border-red-100 bg-red-50 px-6 py-3 text-sm font-black text-[#EF4444] transition hover:bg-[#EF4444] hover:text-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {saving ? "Cancelling..." : "Cancel Session"}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
