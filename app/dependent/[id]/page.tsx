"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DependentType = "child" | "pet" | "elder";

type Dependent = {
  id: string;
  family_id: string;
  type: DependentType;
  name: string;
  photo_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  notes: string | null;
  created_at: string;
  legacy_child_id: string | null;
};

type CareLog = {
  id: string;
  family_id: string | null;
  dependent_id: string | null;
  child_id: string | null;
  type: string;
  title: string | null;
  note: string | null;
  value: string | null;
  created_at: string | null;
};

type Family = {
  id: string;
  name: string;
};

const navItems = [
  { label: "Home", icon: "⌂", href: "/dashboard" },
  { label: "Schedule", icon: "▣", href: "/schedule" },
  { label: "Care Log", icon: "□", href: "/care-log" },
  { label: "Messages", icon: "◌", href: "/messages" },
  { label: "Profile", icon: "♙", href: "/profile" },
];

const logTypes = [
  { type: "meal", label: "Meal", icon: "🍽️" },
  { type: "sleep", label: "Sleep", icon: "🌙" },
  { type: "walk", label: "Walk", icon: "🐕" },
  { type: "medicine", label: "Medicine", icon: "💊" },
  { type: "activity", label: "Activity", icon: "🌳" },
  { type: "mood", label: "Mood", icon: "😊" },
  { type: "photo", label: "Photo", icon: "📷" },
  { type: "note", label: "Note", icon: "📝" },
];

const typeConfig: Record<
  DependentType,
  {
    label: string;
    plural: string;
    icon: string;
    avatar: string;
    chip: string;
    headline: string;
    summary: string;
    primaryCare: string;
    fields: Array<{ label: string; value: string; icon: string }>;
  }
> = {
  child: {
    label: "Child",
    plural: "Kids",
    icon: "👶",
    avatar: "bg-blue-50 text-[#1E5BFF]",
    chip: "bg-blue-50 text-[#1E5BFF]",
    headline: "Child care profile",
    summary: "Meals, naps, activities, medicine, photos and caregiver notes.",
    primaryCare: "Nanny visit",
    fields: [
      { label: "Allergies", value: "No allergies added", icon: "⚕️" },
      { label: "Routine", value: "Meals, nap and playtime", icon: "🧸" },
      { label: "Emergency", value: "Emergency instructions pending", icon: "🚨" },
    ],
  },
  pet: {
    label: "Pet",
    plural: "Pets",
    icon: "🐾",
    avatar: "bg-emerald-50 text-[#22A06B]",
    chip: "bg-emerald-50 text-[#22A06B]",
    headline: "Pet care profile",
    summary: "Walks, feeding, water, medicine, vet notes and photo reports.",
    primaryCare: "Dog walk",
    fields: [
      { label: "Feeding", value: "Feeding instructions pending", icon: "🥣" },
      { label: "Walking", value: "Walk instructions pending", icon: "🐕" },
      { label: "Vet", value: "Vet contact pending", icon: "🏥" },
    ],
  },
  elder: {
    label: "Elder",
    plural: "Elders",
    icon: "🧓",
    avatar: "bg-violet-50 text-violet-700",
    chip: "bg-violet-50 text-violet-700",
    headline: "Elder care profile",
    summary: "Medication, care visits, health notes, reminders and daily support.",
    primaryCare: "Care visit",
    fields: [
      { label: "Medicine", value: "Medication plan pending", icon: "💊" },
      { label: "Health Notes", value: "Health notes pending", icon: "🩺" },
      { label: "Care Plan", value: "Care plan pending", icon: "📋" },
    ],
  },
};

function CareOSLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#1E5BFF] to-[#35B779] text-[34px] font-black leading-none text-white shadow-lg shadow-blue-100">
        ∞
      </div>
      <div>
        <div className="text-xl font-black tracking-tight text-[#102033]">CareOS</div>
        <div className="hidden text-xs font-medium text-[#6B7A90] sm:block">
          Connected care for your family
        </div>
      </div>
    </div>
  );
}

function getDisplayName(email?: string) {
  if (!email) return "Tigran";
  if (email.toLowerCase().includes("tigerkazaryan")) return "Tigran";
  const first = email.split("@")[0];
  if (first.toLowerCase() === "mail") return "Tigran";
  return first.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getAge(dateOfBirth: string | null) {
  if (!dateOfBirth) return null;

  const birth = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

function formatTime(value: string | null) {
  if (!value) return "Today";
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getLogIcon(type: string) {
  return logTypes.find((item) => item.type === type)?.icon || "📝";
}

function getLogTitle(log: CareLog) {
  return log.title || logTypes.find((item) => item.type === log.type)?.label || "Care note";
}

export default function DependentProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const dependentId = params?.id;

  const [email, setEmail] = useState<string | undefined>("");
  const [family, setFamily] = useState<Family | null>(null);
  const [dependent, setDependent] = useState<Dependent | null>(null);
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [quickType, setQuickType] = useState("note");
  const [quickNote, setQuickNote] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  async function loadProfile() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/sign-in");
      return;
    }

    setEmail(userData.user.email);

    if (!dependentId) {
      router.push("/dashboard");
      return;
    }

    const { data: dependentData, error: dependentError } = await supabase
      .from("dependents")
      .select("id, family_id, type, name, photo_url, date_of_birth, gender, notes, created_at, legacy_child_id")
      .eq("id", dependentId)
      .maybeSingle();

    if (dependentError || !dependentData) {
      router.push("/dashboard");
      return;
    }

    const loadedDependent = dependentData as Dependent;
    setDependent(loadedDependent);

    const { data: familyData } = await supabase
      .from("families")
      .select("id, name")
      .eq("id", loadedDependent.family_id)
      .maybeSingle();

    setFamily(familyData || null);

    const { data: logsData } = await supabase
      .from("care_logs")
      .select("id, family_id, dependent_id, child_id, type, title, note, value, created_at")
      .eq("dependent_id", loadedDependent.id)
      .order("created_at", { ascending: false })
      .limit(12);

    setCareLogs((logsData || []) as CareLog[]);
    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependentId]);

  const displayName = useMemo(() => getDisplayName(email), [email]);
  const initials = displayName.slice(0, 1).toUpperCase();

  const config = dependent ? typeConfig[dependent.type] : null;

  const age = useMemo(() => {
    if (!dependent) return null;
    return getAge(dependent.date_of_birth);
  }, [dependent]);

  const recentLogs = useMemo(() => {
    if (careLogs.length > 0) return careLogs;

    if (!dependent) return [];

    if (dependent.type === "pet") {
      return [
        {
          id: "sample-walk",
          family_id: dependent.family_id,
          dependent_id: dependent.id,
          child_id: null,
          type: "walk",
          title: "Walk completed",
          note: "Walked for 35 minutes. Pee and poop completed.",
          value: null,
          created_at: null,
        },
        {
          id: "sample-meal",
          family_id: dependent.family_id,
          dependent_id: dependent.id,
          child_id: null,
          type: "meal",
          title: "Food & water",
          note: "Ate dinner and drank water.",
          value: null,
          created_at: null,
        },
      ];
    }

    if (dependent.type === "elder") {
      return [
        {
          id: "sample-medicine",
          family_id: dependent.family_id,
          dependent_id: dependent.id,
          child_id: null,
          type: "medicine",
          title: "Medication check",
          note: "Evening medication confirmed.",
          value: null,
          created_at: null,
        },
        {
          id: "sample-note",
          family_id: dependent.family_id,
          dependent_id: dependent.id,
          child_id: null,
          type: "note",
          title: "Care note",
          note: "Caregiver visit completed. Everything looks good.",
          value: null,
          created_at: null,
        },
      ];
    }

    return [
      {
        id: "sample-meal",
        family_id: dependent.family_id,
        dependent_id: dependent.id,
        child_id: dependent.id,
        type: "meal",
        title: "Lunch",
        note: "Ate everything.",
        value: null,
        created_at: null,
      },
      {
        id: "sample-activity",
        family_id: dependent.family_id,
        dependent_id: dependent.id,
        child_id: dependent.id,
        type: "activity",
        title: "Outdoor Play",
        note: "Played outside and was in a happy mood.",
        value: null,
        created_at: null,
      },
    ];
  }, [careLogs, dependent]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  async function handleAddQuickLog() {
    setMessage("");

    if (!dependent) {
      setMessage("Dependent not found.");
      return;
    }

    if (!quickNote.trim()) {
      setMessage("Please write a short note.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("care_logs")
      .insert({
        family_id: dependent.family_id,
        dependent_id: dependent.id,
        child_id: dependent.type === "child" ? dependent.id : null,
        type: quickType,
        title: logTypes.find((item) => item.type === quickType)?.label || "Care note",
        note: quickNote.trim(),
        created_by: userData.user?.id || null,
      })
      .select("id, family_id, dependent_id, child_id, type, title, note, value, created_at")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setCareLogs([data as CareLog, ...careLogs]);
    setQuickNote("");
    setMessage("Care log added.");
  }

  if (loading || !dependent || !config) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-[#6B7A90]">Loading profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7FAFC] pb-28 text-[#102033]">
      <header className="sticky top-0 z-30 border-b border-blue-100/70 bg-white/95 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-left">
            <CareOSLogo />
          </button>

          <div className="hidden items-center gap-2 rounded-full bg-[#F7FAFC] p-1 md:flex">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className="rounded-full px-4 py-2 text-xs font-semibold text-[#6B7A90] transition hover:bg-white hover:text-[#1E5BFF]"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="flex items-center gap-3 rounded-[22px] bg-white px-3 py-2 pr-4 shadow-sm ring-1 ring-blue-100"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E5BFF] to-[#35B779] text-sm font-bold text-white">
                {initials}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-[#102033]">{displayName}</p>
                <p className="max-w-[190px] truncate text-xs text-[#6B7A90]">{email}</p>
              </div>
              <span className="text-xs text-[#6B7A90]">⌄</span>
            </button>

            {accountMenuOpen && (
              <div className="absolute right-0 mt-3 w-64 rounded-[24px] bg-white p-2 shadow-2xl shadow-blue-100/70 ring-1 ring-blue-100">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-[#E5484D] transition hover:bg-red-50"
                >
                  Sign Out
                  <span>↗</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-7 md:py-9">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#102033] shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50 hover:text-[#1E5BFF]"
        >
          ←
        </button>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[36px] border border-blue-100 bg-white shadow-xl shadow-blue-100/45">
              <div className="bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-7">
                <div className="flex items-start gap-5">
                  {dependent.photo_url ? (
                    <img src={dependent.photo_url} alt={dependent.name} className="h-24 w-24 rounded-[30px] object-cover ring-4 ring-white" />
                  ) : (
                    <div className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-[30px] text-5xl ring-4 ring-white ${config.avatar}`}>
                      {config.icon}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${config.chip}`}>
                      {config.label}
                    </span>
                    <h1 className="mt-3 truncate text-4xl font-black tracking-tight text-[#102033]">{dependent.name}</h1>
                    <p className="mt-2 text-sm font-semibold text-[#6B7A90]">{config.headline}</p>
                  </div>
                </div>

                <p className="mt-6 text-base leading-7 text-[#6B7A90]">{config.summary}</p>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="rounded-[24px] bg-white/90 p-4 shadow-sm ring-1 ring-blue-100">
                    <p className="text-xs font-semibold text-[#6B7A90]">Age</p>
                    <p className="mt-1 text-2xl font-black text-[#102033]">{age === null ? "—" : age}</p>
                  </div>
                  <div className="rounded-[24px] bg-white/90 p-4 shadow-sm ring-1 ring-blue-100">
                    <p className="text-xs font-semibold text-[#6B7A90]">Logs</p>
                    <p className="mt-1 text-2xl font-black text-[#1E5BFF]">{careLogs.length}</p>
                  </div>
                  <div className="rounded-[24px] bg-white/90 p-4 shadow-sm ring-1 ring-blue-100">
                    <p className="text-xs font-semibold text-[#6B7A90]">Status</p>
                    <p className="mt-1 text-sm font-black text-[#22A06B]">All good</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-lg shadow-blue-100/40">
              <p className="text-sm font-semibold text-[#6B7A90]">Quick actions</p>
              <h2 className="mt-1 text-2xl font-black text-[#102033]">Care tools</h2>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button onClick={() => router.push("/schedule")} className="rounded-[24px] bg-[#1E5BFF] p-5 text-left text-white shadow-lg shadow-blue-200">
                  <div className="text-3xl">📅</div>
                  <p className="mt-4 text-sm font-bold">Schedule</p>
                  <p className="mt-1 text-xs text-white/80">Book care</p>
                </button>
                <button onClick={() => router.push("/care-log")} className="rounded-[24px] bg-[#35B779] p-5 text-left text-white shadow-lg shadow-emerald-100">
                  <div className="text-3xl">📝</div>
                  <p className="mt-4 text-sm font-bold">Care Log</p>
                  <p className="mt-1 text-xs text-white/80">Add update</p>
                </button>
                <button className="rounded-[24px] border border-blue-100 bg-[#FBFDFF] p-5 text-left">
                  <div className="text-3xl">📷</div>
                  <p className="mt-4 text-sm font-bold text-[#102033]">Photos</p>
                  <p className="mt-1 text-xs text-[#6B7A90]">Coming soon</p>
                </button>
                <button className="rounded-[24px] border border-red-100 bg-red-50 p-5 text-left">
                  <div className="text-3xl">🚨</div>
                  <p className="mt-4 text-sm font-bold text-[#E5484D]">Emergency</p>
                  <p className="mt-1 text-xs text-[#6B7A90]">Contacts</p>
                </button>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#6B7A90]">Care Plan</p>
                  <h2 className="mt-1 text-3xl font-black text-[#102033]">Important details</h2>
                </div>
                <span className="rounded-full bg-[#F7FAFC] px-4 py-2 text-xs font-semibold text-[#6B7A90]">
                  {family?.name || "Family"}
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {config.fields.map((field) => (
                  <div key={field.label} className="rounded-[26px] bg-[#F7FAFC] p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                      {field.icon}
                    </div>
                    <p className="mt-4 text-sm font-black text-[#102033]">{field.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[#6B7A90]">{field.value}</p>
                  </div>
                ))}
              </div>

              {dependent.notes && (
                <div className="mt-5 rounded-[26px] border border-blue-100 bg-blue-50/40 p-5">
                  <p className="text-sm font-black text-[#102033]">Notes</p>
                  <p className="mt-2 text-sm leading-6 text-[#6B7A90]">{dependent.notes}</p>
                </div>
              )}
            </section>

            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-lg shadow-blue-100/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#6B7A90]">Today</p>
                  <h2 className="mt-1 text-3xl font-black text-[#102033]">Care timeline</h2>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#22A06B]">
                  AI summary ready soon
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {recentLogs.map((log) => (
                  <article key={log.id} className="rounded-[26px] border border-blue-100 bg-[#FBFDFF] p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl">
                        {getLogIcon(log.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-[#102033]">{getLogTitle(log)}</p>
                          <p className="text-xs font-semibold text-[#6B7A90]">{formatTime(log.created_at)}</p>
                        </div>
                        {log.note && <p className="mt-2 text-sm leading-6 text-[#6B7A90]">{log.note}</p>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[36px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-6 shadow-lg shadow-blue-100/40">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-2xl shadow-sm">🤖</div>
                <div>
                  <p className="text-sm font-semibold text-[#6B7A90]">AI Summary</p>
                  <h2 className="mt-1 text-2xl font-black text-[#102033]">{dependent.name}&apos;s daily summary</h2>
                  <p className="mt-3 text-sm leading-6 text-[#6B7A90]">
                    CareOS will summarize care logs, photos, notes and caregiver updates here.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-blue-100 bg-white/95 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className="rounded-2xl px-2 py-2 text-center text-[11px] font-semibold text-[#6B7A90]"
            >
              <div className="text-lg leading-5">{item.icon}</div>
              <div className="mt-1">{item.label}</div>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
