"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PlannedActionBadge, PlannedActionIcon, plannedActionOptions, type PlannedActionType } from "@/lib/plannedActions";

type DependentType = "child" | "pet" | "elder";
type SessionStatus = "scheduled" | "active" | "completed" | "cancelled";
type CareEventSource = "planned" | "added";
type CareEventType = PlannedActionType | "note" | "photo";

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

type CareEvent = {
  id: string;
  family_id: string;
  session_id: string;
  dependent_id: string;
  source: CareEventSource;
  planned_action_id: string | null;
  event_type: CareEventType;
  label: string;
  notes: string | null;
  photo_url: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type AddedActionForm = {
  event_type: PlannedActionType;
  label: string;
  notes: string;
};

const sessionSelect =
  "id, family_id, dependent_id, title, care_type, caregiver_name, status, starts_at, ends_at, planned_actions, notes, instructions, created_at";

const eventSelect =
  "id, family_id, session_id, dependent_id, source, planned_action_id, event_type, label, notes, photo_url, completed_at, created_at, updated_at";

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

function formatCompletedTime(value: string | null) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getDefaultAddedLabel(type: PlannedActionType) {
  if (type === "custom") return "Custom care action";

  return plannedActionOptions.find((option) => option.type === type)?.label || "Care action";
}

function toPlannedActionIconType(type: CareEventType): PlannedActionType {
  if (type === "note" || type === "photo") return "custom";
  return type;
}

export default function SessionCareLogPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();

  const sessionId = params.sessionId;
  const [family, setFamily] = useState<Family | null>(null);
  const [session, setSession] = useState<CareSession | null>(null);
  const [dependent, setDependent] = useState<Dependent | null>(null);
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingActionId, setSavingActionId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [addedForm, setAddedForm] = useState<AddedActionForm>({
    event_type: "meal",
    label: "Meal",
    notes: "",
  });

  async function loadCareLog() {
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
      setEvents([]);
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
      setEvents([]);
      setLoading(false);
      return;
    }

    const loadedSession = sessionData as CareSession;
    loadedSession.planned_actions = Array.isArray(loadedSession.planned_actions)
      ? loadedSession.planned_actions
      : [];
    setSession(loadedSession);

    const { data: dependentData } = await supabase
      .from("dependents")
      .select("id, family_id, type, name, photo_url")
      .eq("id", loadedSession.dependent_id)
      .eq("family_id", familyData.id)
      .maybeSingle();

    setDependent((dependentData || null) as Dependent | null);

    const { data: eventsData } = await supabase
      .from("care_events")
      .select(eventSelect)
      .eq("session_id", loadedSession.id)
      .eq("family_id", familyData.id)
      .order("created_at", { ascending: true });

    setEvents((eventsData || []) as CareEvent[]);
    setLoading(false);
  }

  useEffect(() => {
    loadCareLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const plannedActions = Array.isArray(session?.planned_actions) ? session.planned_actions : [];
  const plannedEventsByActionId = useMemo(() => {
    return events.reduce<Record<string, CareEvent>>((acc, event) => {
      if (event.source === "planned" && event.planned_action_id) {
        acc[event.planned_action_id] = event;
      }
      return acc;
    }, {});
  }, [events]);
  const addedEvents = useMemo(() => events.filter((event) => event.source === "added"), [events]);
  const completedPlannedCount = plannedActions.filter((action) => plannedEventsByActionId[action.id]?.completed_at).length;
  const completedAddedCount = addedEvents.filter((event) => event.completed_at).length;
  const totalCareActions = plannedActions.length + addedEvents.length;
  const completedCareActions = completedPlannedCount + completedAddedCount;

  async function completePlannedAction(action: PlannedAction) {
    if (!family || !session || !dependent) return;

    const existingEvent = plannedEventsByActionId[action.id];
    const now = new Date().toISOString();
    setSavingActionId(`planned-${action.id}`);
    setMessage(null);
    setMessageType(null);

    const result = existingEvent
      ? await supabase
          .from("care_events")
          .update({ completed_at: now, updated_at: now })
          .eq("id", existingEvent.id)
          .eq("family_id", family.id)
      : await supabase.from("care_events").insert({
          family_id: family.id,
          session_id: session.id,
          dependent_id: dependent.id,
          source: "planned",
          planned_action_id: action.id,
          event_type: action.type,
          label: action.label,
          notes: action.notes || null,
          completed_at: now,
        });

    setSavingActionId(null);

    if (result.error) {
      setMessage(result.error.message || "Care action could not be completed.");
      setMessageType("error");
      return;
    }

    setMessage(`${action.label} completed.`);
    setMessageType("success");
    await loadCareLog();
  }

  async function completeAddedEvent(event: CareEvent) {
    if (!family) return;

    const now = new Date().toISOString();
    setSavingActionId(`added-${event.id}`);
    setMessage(null);
    setMessageType(null);

    const { error } = await supabase
      .from("care_events")
      .update({ completed_at: now, updated_at: now })
      .eq("id", event.id)
      .eq("family_id", family.id);

    setSavingActionId(null);

    if (error) {
      setMessage(error.message || "Care action could not be completed.");
      setMessageType("error");
      return;
    }

    setMessage(`${event.label} completed.`);
    setMessageType("success");
    await loadCareLog();
  }

  function changeAddedType(type: PlannedActionType) {
    setAddedForm({
      event_type: type,
      label: getDefaultAddedLabel(type),
      notes: "",
    });
  }

  async function addCareAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!family || !session || !dependent) return;

    const label = addedForm.label.trim();
    const notes = addedForm.notes.trim();

    if (!label) {
      setMessage("Please name the care action before adding it.");
      setMessageType("error");
      return;
    }

    setSavingActionId("add-care-action");
    setMessage(null);
    setMessageType(null);

    const { error } = await supabase.from("care_events").insert({
      family_id: family.id,
      session_id: session.id,
      dependent_id: dependent.id,
      source: "added",
      planned_action_id: null,
      event_type: addedForm.event_type,
      label,
      notes: notes || null,
      completed_at: null,
    });

    setSavingActionId(null);

    if (error) {
      setMessage(error.message || "Care action could not be added.");
      setMessageType("error");
      return;
    }

    setMessage(`${label} added to Care Log.`);
    setMessageType("success");
    setAddedForm({ event_type: "meal", label: "Meal", notes: "" });
    setShowAddForm(false);
    await loadCareLog();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-[#64748B]">Loading Care Log...</p>
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
            className="mx-auto mb-6 rounded-2xl bg-[#F8FAFC] px-5 py-3 text-sm font-black text-[#0F172A] transition hover:bg-blue-50 hover:text-[#2563EB]"
          >
            Back to Schedule
          </button>
          <h1 className="text-3xl font-black tracking-tight text-[#0F172A]">Care Log not found</h1>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">
            This care session may have been removed or is no longer available.
          </p>
        </section>
      </main>
    );
  }

  const typeStyle = typeConfig[dependent.type];
  const statusStyle = statusConfig[session.status] || statusConfig.scheduled;
  const initial = dependent.name.slice(0, 1).toUpperCase();

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-16 text-[#0F172A]">
      <section className="mx-auto max-w-6xl px-5 py-7 md:py-10">
        <button
          onClick={() => router.push("/schedule")}
          className="mb-5 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#0F172A] shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50 hover:text-[#2563EB]"
        >
          Back to Schedule
        </button>

        <div className="mb-6">
          <p className="text-sm font-semibold text-[#64748B]">Care Log</p>
          <h1 className="mt-1 text-4xl font-black tracking-tight text-[#0F172A]">Care Log</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#64748B]">
            Track what actually happens during this care session.
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Care time</p>
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

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.72fr]">
          <div className="space-y-6">
            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">Planned Care</p>
                  <h2 className="mt-1 text-3xl font-black text-[#0F172A]">Today&apos;s Plan</h2>
                </div>
              </div>

              {plannedActions.length === 0 ? (
                <div className="mt-6 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                  <p className="font-semibold text-[#0F172A]">No planned care actions</p>
                  <p className="mt-2 text-sm text-[#64748B]">You can still add care actions during care.</p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {plannedActions.map((action) => {
                    const event = plannedEventsByActionId[action.id];
                    const completed = Boolean(event?.completed_at);
                    const saving = savingActionId === `planned-${action.id}`;

                    return (
                      <article key={action.id} className="rounded-[28px] border border-blue-100 bg-[#F8FAFC] p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <PlannedActionBadge type={action.type} label={action.label} notes={action.notes} selected={completed} />
                          <div className="flex flex-wrap items-center gap-3">
                            {completed ? (
                              <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-[#16A34A]">
                                Completed {formatCompletedTime(event?.completed_at || null)}
                              </span>
                            ) : (
                              <button
                                onClick={() => completePlannedAction(action)}
                                disabled={Boolean(savingActionId)}
                                className="rounded-[20px] bg-[#2563EB] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                              >
                                {saving ? "Completing..." : "Complete"}
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">Care Event</p>
                  <h2 className="mt-1 text-3xl font-black text-[#0F172A]">Added During Care</h2>
                </div>
                <button
                  onClick={() => setShowAddForm((open) => !open)}
                  className="rounded-[20px] bg-blue-50 px-5 py-3 text-sm font-black text-[#2563EB] transition hover:bg-[#2563EB] hover:text-white"
                >
                  {showAddForm ? "Cancel" : "Add Care Action"}
                </button>
              </div>

              {showAddForm && (
                <form onSubmit={addCareAction} className="mt-6 rounded-[30px] border border-blue-100 bg-[#F8FAFC] p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Action type</span>
                      <select
                        value={addedForm.event_type}
                        onChange={(event) => changeAddedType(event.target.value as PlannedActionType)}
                        className="mt-2 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      >
                        {[...plannedActionOptions, { type: "custom" as const, label: "Custom" }].map((option) => (
                          <option key={option.type} value={option.type}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Label</span>
                      <input
                        value={addedForm.label}
                        onChange={(event) => setAddedForm((current) => ({ ...current, label: event.target.value }))}
                        className="mt-2 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                        required
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Notes optional</span>
                      <textarea
                        value={addedForm.notes}
                        onChange={(event) => setAddedForm((current) => ({ ...current, notes: event.target.value }))}
                        className="mt-2 min-h-24 w-full rounded-[20px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                        placeholder="What changed during care?"
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={Boolean(savingActionId)}
                    className="mt-5 rounded-[22px] bg-[#2563EB] px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  >
                    {savingActionId === "add-care-action" ? "Adding..." : "Add Care Action"}
                  </button>
                </form>
              )}

              {addedEvents.length === 0 ? (
                <div className="mt-6 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                  <p className="font-semibold text-[#0F172A]">No extra care actions added yet</p>
                  <p className="mt-2 text-sm text-[#64748B]">Add one if care changes during the session.</p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {addedEvents.map((event) => {
                    const completed = Boolean(event.completed_at);
                    const saving = savingActionId === `added-${event.id}`;

                    return (
                      <article key={event.id} className="rounded-[28px] border border-blue-100 bg-[#F8FAFC] p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="inline-flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-[#7C3AED]">
                              <PlannedActionIcon type={toPlannedActionIconType(event.event_type)} />
                            </span>
                            <span>
                              <span className="block text-sm font-black text-[#0F172A]">{event.label}</span>
                              {event.notes && <span className="mt-1 block text-sm leading-6 text-[#64748B]">{event.notes}</span>}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            {completed ? (
                              <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-[#16A34A]">
                                Completed {formatCompletedTime(event.completed_at)}
                              </span>
                            ) : (
                              <button
                                onClick={() => completeAddedEvent(event)}
                                disabled={Boolean(savingActionId)}
                                className="rounded-[20px] bg-[#2563EB] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                              >
                                {saving ? "Completing..." : "Complete"}
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            <p className="text-sm font-semibold text-[#64748B]">Care Story</p>
            <h2 className="mt-1 text-3xl font-black text-[#0F172A]">Care Summary</h2>
            <div className="mt-6 rounded-[30px] bg-gradient-to-br from-emerald-50 to-blue-50 p-6">
              <p className="text-4xl font-black text-[#0F172A]">
                {completedCareActions} of {totalCareActions}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#64748B]">care actions completed</p>
            </div>
            <div className="mt-5 rounded-[28px] bg-[#F8FAFC] p-5">
              <p className="text-sm font-black text-[#0F172A]">What actually happened</p>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">
                Completed care actions will become the foundation for the family&apos;s Care Story.
              </p>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
