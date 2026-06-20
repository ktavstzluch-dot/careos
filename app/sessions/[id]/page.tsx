"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DependentType = "child" | "pet" | "elder";
type SessionStatus = "scheduled" | "active" | "completed" | "cancelled";

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
  created_at: string;
};

type CareMoment = {
  id: string;
  family_id: string;
  session_id: string;
  dependent_id: string;
  note: string | null;
  photo_url: string | null;
  created_at: string;
};

const typeConfig: Record<
  DependentType,
  {
    label: string;
    avatarClass: string;
    badgeClass: string;
  }
> = {
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

const statusConfig: Record<
  SessionStatus,
  {
    label: string;
    dotClass: string;
    badgeClass: string;
  }
> = {
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
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatter.format(new Date(startValue))} - ${formatter.format(new Date(endValue))}`;
}

function formatMomentTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function LiveSessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const sessionId = params.id;
  const [family, setFamily] = useState<Family | null>(null);
  const [session, setSession] = useState<CareSession | null>(null);
  const [dependent, setDependent] = useState<Dependent | null>(null);
  const [moments, setMoments] = useState<CareMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sharingMoment, setSharingMoment] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [momentNote, setMomentNote] = useState("");
  const [momentPhotoUrl, setMomentPhotoUrl] = useState("");

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
      setMoments([]);
      setLoading(false);
      return;
    }

    setFamily(familyData as Family);

    const { data: sessionData } = await supabase
      .from("care_sessions")
      .select("id, family_id, dependent_id, title, care_type, caregiver_name, status, starts_at, ends_at, created_at")
      .eq("id", sessionId)
      .eq("family_id", familyData.id)
      .maybeSingle();

    if (!sessionData) {
      setSession(null);
      setDependent(null);
      setMoments([]);
      setLoading(false);
      return;
    }

    const loadedSession = sessionData as CareSession;
    setSession(loadedSession);

    const { data: dependentData } = await supabase
      .from("dependents")
      .select("id, family_id, type, name, photo_url")
      .eq("id", loadedSession.dependent_id)
      .eq("family_id", familyData.id)
      .maybeSingle();

    setDependent((dependentData || null) as Dependent | null);

    const { data: momentsData } = await supabase
      .from("care_moments")
      .select("id, family_id, session_id, dependent_id, note, photo_url, created_at")
      .eq("family_id", familyData.id)
      .eq("session_id", loadedSession.id)
      .order("created_at", { ascending: false });

    setMoments((momentsData || []) as CareMoment[]);
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

  async function updateSessionStatus(nextStatus: SessionStatus) {
    if (!session || !family) return;

    setActionLoading(true);
    setMessage(null);
    setMessageType(null);

    const { data, error } = await supabase
      .from("care_sessions")
      .update({ status: nextStatus })
      .eq("id", session.id)
      .eq("family_id", family.id)
      .select("id, family_id, dependent_id, title, care_type, caregiver_name, status, starts_at, ends_at, created_at")
      .maybeSingle();

    setActionLoading(false);

    if (error || !data) {
      setMessage(error?.message || "Session could not be updated.");
      setMessageType("error");
      return;
    }

    setSession(data as CareSession);
    setMessage(nextStatus === "active" ? "Session started." : "Session completed.");
    setMessageType("success");
  }

  async function handleShareMoment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session || !family || !dependent) return;

    const note = momentNote.trim();
    const photoUrl = momentPhotoUrl.trim();

    if (!note && !photoUrl) {
      setMessage("Add a note or photo URL before sharing a Moment.");
      setMessageType("error");
      return;
    }

    setSharingMoment(true);
    setMessage(null);
    setMessageType(null);

    const { error } = await supabase.from("care_moments").insert({
      family_id: family.id,
      session_id: session.id,
      dependent_id: dependent.id,
      note: note || null,
      photo_url: photoUrl || null,
    });

    setSharingMoment(false);

    if (error) {
      setMessage(error.message || "Moment could not be shared.");
      setMessageType("error");
      return;
    }

    setMomentNote("");
    setMomentPhotoUrl("");
    setMessage("Moment shared with the family.");
    setMessageType("success");
    await loadSession();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-[#64748B]">Loading Session...</p>
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
          <h1 className="text-3xl font-black tracking-tight text-[#0F172A]">Session not found</h1>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">
            This care session may have been removed or is no longer available.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-16 text-[#0F172A]">
      <section className="mx-auto max-w-5xl px-5 py-7 md:py-10">
        <button
          onClick={() => router.push("/schedule")}
          className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#0F172A] shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50 hover:text-[#2563EB]"
        >
          ←
        </button>

        <div className="mb-6">
          <p className="text-sm font-semibold text-[#64748B]">Session</p>
          <h1 className="mt-1 text-4xl font-black tracking-tight text-[#0F172A]">Live Session</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#64748B]">
            Keep the family connected with calm, real-time care updates.
          </p>
        </div>

        <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
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

        <section className="mt-6 rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
          {session.status === "scheduled" && (
            <div>
              <h2 className="text-2xl font-black text-[#0F172A]">Ready to begin</h2>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">
                Start the session when care begins so the family can follow along.
              </p>
              <button
                onClick={() => updateSessionStatus("active")}
                disabled={actionLoading}
                className="mt-5 rounded-[22px] bg-[#22C55E] px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-[#16A34A] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {actionLoading ? "Starting..." : "Start Session"}
              </button>
            </div>
          )}

          {session.status === "active" && (
            <div className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
              <form onSubmit={handleShareMoment} className="rounded-[30px] bg-[#F8FAFC] p-5">
                <h2 className="text-2xl font-black text-[#0F172A]">Share Moment</h2>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">
                  Share a small care update so the family feels connected.
                </p>
                <label className="mt-5 block">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Care Update</span>
                  <textarea
                    value={momentNote}
                    onChange={(event) => setMomentNote(event.target.value)}
                    placeholder="What is happening right now?"
                    className="mt-2 min-h-28 w-full rounded-[22px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                  />
                </label>
                <label className="mt-4 block">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">Optional photo URL</span>
                  <input
                    value={momentPhotoUrl}
                    onChange={(event) => setMomentPhotoUrl(event.target.value)}
                    placeholder="https://..."
                    className="mt-2 w-full rounded-[22px] border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                  />
                </label>
                <button
                  type="submit"
                  disabled={sharingMoment}
                  className="mt-5 rounded-[22px] bg-[#2563EB] px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {sharingMoment ? "Sharing..." : "Share Moment"}
                </button>
              </form>

              <div className="rounded-[30px] bg-gradient-to-br from-emerald-50 to-blue-50 p-5">
                <h2 className="text-2xl font-black text-[#0F172A]">Complete Session</h2>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">
                  When care is finished, complete the session and keep the Moments visible for review.
                </p>
                <button
                  onClick={() => updateSessionStatus("completed")}
                  disabled={actionLoading}
                  className="mt-5 rounded-[22px] bg-[#EF4444] px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-100 transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {actionLoading ? "Completing..." : "Complete Session"}
                </button>
              </div>
            </div>
          )}

          {session.status === "completed" && (
            <div className="rounded-[30px] bg-emerald-50 p-5">
              <h2 className="text-2xl font-black text-[#0F172A]">Session completed</h2>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">Your Care Story is ready to review.</p>
            </div>
          )}

          {session.status === "cancelled" && (
            <div className="rounded-[30px] bg-slate-50 p-5">
              <h2 className="text-2xl font-black text-[#0F172A]">Session cancelled</h2>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">This care session is no longer active.</p>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#64748B]">Care Story</p>
              <h2 className="mt-1 text-3xl font-black text-[#0F172A]">Moments</h2>
            </div>
            <span className="rounded-full bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#64748B]">
              {moments.length} shared
            </span>
          </div>

          {moments.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
              <p className="font-semibold text-[#0F172A]">No moments shared yet</p>
              <p className="mt-2 text-sm text-[#64748B]">Start by sharing a small update from this care session.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {moments.map((moment) => (
                <article key={moment.id} className="rounded-[28px] border border-blue-100 bg-[#F8FAFC] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-[#0F172A]">Moment</p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#64748B]">
                      {formatMomentTime(moment.created_at)}
                    </span>
                  </div>
                  {moment.photo_url && (
                    <img
                      src={moment.photo_url}
                      alt={moment.note || "Shared Moment"}
                      className="mt-4 max-h-80 w-full rounded-[24px] object-cover"
                    />
                  )}
                  {moment.note && <p className="mt-4 text-sm leading-6 text-[#0F172A]">{moment.note}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
