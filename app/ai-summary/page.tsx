"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfileFromUser } from "@/lib/profile";

type DependentType = "child" | "pet" | "elder";

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

type CareLog = {
  id: string;
  dependent_id: string | null;
  type: string;
  title: string | null;
  note: string | null;
  created_at: string | null;
};

type Photo = {
  id: string;
  dependent_id: string | null;
};

const navItems = [
  { label: "Home", icon: "\u2302", href: "/dashboard" },
  { label: "Schedule", icon: "\u25A3", href: "/schedule" },
  { label: "Care Log", icon: "\u25A1", href: "/care-log" },
  { label: "Messages", icon: "\u25CD", href: "/messages" },
  { label: "Profile", icon: "\u2659", href: "/profile" },
];

const typeConfig: Record<
  DependentType,
  {
    label: string;
    icon: string;
    avatar: string;
    chip: string;
    summary: string;
    checklist: string[];
  }
> = {
  child: {
    label: "Child",
    icon: "👶",
    avatar: "bg-blue-50 text-[#2563EB]",
    chip: "bg-blue-50 text-[#2563EB]",
    summary:
      "CareOS gathered today's care moments. Meals, rest, activities and caregiver notes are ready to become a warm family story.",
    checklist: ["Meals reviewed", "Nap / rest checked", "Activities reviewed", "Mood notes ready"],
  },
  pet: {
    label: "Pet",
    icon: "🐾",
    avatar: "bg-emerald-50 text-[#22C55E]",
    chip: "bg-emerald-50 text-[#22C55E]",
    summary:
      "CareOS gathered today's pet care moments. Walks, feeding, water, medicine and shared moments are ready for a family-friendly Daily Story.",
    checklist: ["Walk status reviewed", "Food and water checked", "Medicine reviewed", "Photo updates ready"],
  },
  elder: {
    label: "Elder",
    icon: "🧓",
    avatar: "bg-violet-50 text-violet-700",
    chip: "bg-violet-50 text-violet-700",
    summary:
      "CareOS gathered today's elder care moments. Medication, care visits, notes and family updates are ready for a calm Daily Story.",
    checklist: ["Medication reviewed", "Care visit checked", "Health notes reviewed", "Family update ready"],
  },
};

function CareOSLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-12 w-12 items-center justify-center rounded-[18px] border-[4px] border-[#2563EB] bg-white shadow-lg shadow-blue-100">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#22C55E] text-white">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
            <path d="M12 20.2 5.9 14.7C2.5 11.6 2.3 7.1 5.4 4.8 7.2 3.5 9.8 3.8 12 6c2.2-2.2 4.8-2.5 6.6-1.2 3.1 2.3 2.9 6.8-.5 9.9L12 20.2Z" />
          </svg>
        </div>
      </div>
      <div>
        <div className="text-2xl font-black tracking-tight text-[#0F172A]">CareOS</div>
        <div className="hidden text-xs font-medium text-[#64748B] sm:block">
          Trusted care for kids, pets and home
        </div>
      </div>
    </div>
  );
}

function formatTime(value: string | null) {
  if (!value) return "Today";
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AISummaryPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | undefined>("");
  const [displayName, setDisplayName] = useState("CareOS Family");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [family, setFamily] = useState<Family | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedDependentId, setSelectedDependentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  async function loadSummary() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/sign-in");
      return;
    }

    const profile = getProfileFromUser(userData.user);
    setEmail(profile.email);
    setDisplayName(profile.displayName);
    setAvatarUrl(profile.avatarUrl);

    const { data: familyData } = await supabase
      .from("families")
      .select("id, name")
      .eq("owner_id", userData.user.id)
      .maybeSingle();

    if (!familyData) {
      router.push("/dashboard");
      return;
    }

    setFamily(familyData);

    const { data: dependentsData } = await supabase
      .from("dependents")
      .select("id, family_id, type, name, photo_url")
      .eq("family_id", familyData.id)
      .in("type", ["child", "pet", "elder"])
      .order("created_at", { ascending: false });

    const loadedDependents = ((dependentsData || []) as Dependent[]).filter((item) =>
      ["child", "pet", "elder"].includes(item.type)
    );

    setDependents(loadedDependents);

    if (loadedDependents.length > 0) {
      setSelectedDependentId((current) => current || loadedDependents[0].id);

      const ids = loadedDependents.map((item) => item.id);

      const { data: logsData } = await supabase
        .from("care_logs")
        .select("id, dependent_id, type, title, note, created_at")
        .in("dependent_id", ids)
        .order("created_at", { ascending: false })
        .limit(80);

      setCareLogs((logsData || []) as CareLog[]);
    }

    const { data: photosData } = await supabase
      .from("photos")
      .select("id, dependent_id")
      .eq("family_id", familyData.id)
      .limit(120);

    setPhotos((photosData || []) as Photo[]);
    setLoading(false);
  }

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initials = displayName.slice(0, 1).toUpperCase();

  const selectedDependent = useMemo(() => {
    return dependents.find((item) => item.id === selectedDependentId) || dependents[0] || null;
  }, [dependents, selectedDependentId]);

  const selectedLogs = useMemo(() => {
    if (!selectedDependent) return [];
    return careLogs.filter((log) => log.dependent_id === selectedDependent.id);
  }, [careLogs, selectedDependent]);

  const selectedPhotos = useMemo(() => {
    if (!selectedDependent) return [];
    return photos.filter((photo) => photo.dependent_id === selectedDependent.id);
  }, [photos, selectedDependent]);

  const generatedSummary = useMemo(() => {
    if (!selectedDependent) return "Select a dependent to create an AI Daily Story.";

    const config = typeConfig[selectedDependent.type];
    const logCount = selectedLogs.length;
    const photoCount = selectedPhotos.length;

    if (logCount === 0 && photoCount === 0) {
      return `${selectedDependent.name} has no detailed updates yet today. Once care updates and moments are added, CareOS will turn them into a clear Daily Story for the family.`;
    }

    const latestNote = selectedLogs.find((log) => log.note)?.note;

    return `${selectedDependent.name}'s day is ready for the family. CareOS found ${logCount} care update${logCount === 1 ? "" : "s"} and ${photoCount} moment${photoCount === 1 ? "" : "s"}. ${latestNote ? `Latest update: ${latestNote}` : config.summary}`;
  }, [selectedDependent, selectedLogs, selectedPhotos]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-[#64748B]">Loading AI Daily Story...</p>
        </div>
      </main>
    );
  }

  const selectedConfig = selectedDependent ? typeConfig[selectedDependent.type] : null;

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-28 text-[#0F172A]">
      <header className="sticky top-0 z-30 border-b border-blue-100/70 bg-white/95 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-left">
            <CareOSLogo />
          </button>

          <div className="hidden items-center gap-2 rounded-full bg-[#F8FAFC] p-1 md:flex">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className="rounded-full px-4 py-2 text-xs font-semibold text-[#64748B] transition hover:bg-white hover:text-[#2563EB]"
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
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-10 w-10 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#22C55E] text-sm font-bold text-white">
                  {initials}
                </div>
              )}
              <div className="hidden text-left sm:block">
                <p className="max-w-[180px] truncate text-sm font-semibold text-[#0F172A]">{displayName}</p>
              </div>
            </button>

            {accountMenuOpen && (
              <div className="absolute right-0 mt-3 w-64 rounded-[24px] bg-white p-2 shadow-2xl shadow-blue-100/70 ring-1 ring-blue-100">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-[#EF4444] transition hover:bg-red-50"
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
        <div className="grid gap-6 lg:grid-cols-[0.84fr_1.16fr]">
          <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            <button
              onClick={() => router.push("/dashboard")}
              className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#0F172A] transition hover:bg-blue-50 hover:text-[#2563EB]"
            >
              ←
            </button>

            <p className="text-sm font-semibold text-[#64748B]">AI Daily Story</p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-[#0F172A]">AI Daily Story</h1>
            <p className="mt-3 text-base leading-7 text-[#64748B]">
              CareOS turns care updates, moments and schedule details into a calm story for the family.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {dependents.map((dependent) => {
                const config = typeConfig[dependent.type];

                return (
                  <button
                    key={dependent.id}
                    onClick={() => setSelectedDependentId(dependent.id)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      selectedDependentId === dependent.id
                        ? "bg-[#2563EB] text-white shadow-lg shadow-blue-200"
                        : "bg-[#F8FAFC] text-[#64748B] hover:bg-white"
                    }`}
                  >
                    <span>{config.icon}</span>
                    {dependent.name}
                  </button>
                );
              })}
            </div>

            <div className="mt-7 grid grid-cols-3 gap-3">
              <div className="rounded-[24px] bg-blue-50 p-4">
                <p className="text-3xl font-black text-[#2563EB]">{selectedLogs.length}</p>
                <p className="mt-1 text-xs font-semibold text-[#64748B]">Care updates</p>
              </div>
              <div className="rounded-[24px] bg-emerald-50 p-4">
                <p className="text-3xl font-black text-[#22C55E]">{selectedPhotos.length}</p>
                <p className="mt-1 text-xs font-semibold text-[#64748B]">Moments</p>
              </div>
              <div className="rounded-[24px] bg-violet-50 p-4">
                <p className="text-xl font-black text-violet-700">Ready</p>
                <p className="mt-1 text-xs font-semibold text-[#64748B]">Status</p>
              </div>
            </div>

            <div className="mt-7 rounded-[30px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-2xl shadow-sm">🤖</div>
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">CareOS AI</p>
                  <h2 className="mt-1 text-2xl font-black text-[#0F172A]">AI Daily Story</h2>
                  <p className="mt-3 text-sm leading-6 text-[#64748B]">
                    Today it creates a warm story preview from the care your family shared.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            {selectedDependent && selectedConfig ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {selectedDependent.photo_url ? (
                      <img src={selectedDependent.photo_url} alt={selectedDependent.name} className="h-16 w-16 rounded-[22px] object-cover" />
                    ) : (
                      <div className={`flex h-16 w-16 items-center justify-center rounded-[22px] text-3xl ${selectedConfig.avatar}`}>
                        {selectedConfig.icon}
                      </div>
                    )}
                    <div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${selectedConfig.chip}`}>
                        {selectedConfig.label}
                      </span>
                      <h2 className="mt-2 text-3xl font-black text-[#0F172A]">{selectedDependent.name}</h2>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/dependent/${selectedDependent.id}`)}
                    className="rounded-full bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#64748B] transition hover:bg-blue-50 hover:text-[#2563EB]"
                  >
                    Open profile
                  </button>
                </div>

                <div className="mt-7 rounded-[32px] bg-[#F8FAFC] p-6">
                  <p className="text-sm font-semibold text-[#64748B]">Today&apos;s story draft</p>
                  <h3 className="mt-1 text-2xl font-black text-[#0F172A]">
                    {selectedDependent.name}&apos;s Daily Story
                  </h3>
                  <p className="mt-4 text-base leading-8 text-[#0F172A]">{generatedSummary}</p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {selectedConfig.checklist.map((item) => (
                    <div key={item} className="rounded-[24px] border border-blue-100 bg-[#FFFFFF] p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-[#22C55E]">✓</div>
                        <p className="text-sm font-bold text-[#0F172A]">{item}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#64748B]">Care shared today</p>
                      <h3 className="mt-1 text-2xl font-black text-[#0F172A]">Recent updates</h3>
                    </div>
                    <button
                      onClick={() => router.push("/care-log")}
                      className="rounded-full bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-100"
                    >
                      Add update
                    </button>
                  </div>

                  {selectedLogs.length === 0 ? (
                    <div className="mt-5 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
                      <div className="text-4xl">📝</div>
                      <p className="mt-3 text-sm font-semibold text-[#0F172A]">No care updates yet.</p>
                      <p className="mt-2 text-sm text-[#64748B]">Add updates and moments to shape the AI Daily Story.</p>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {selectedLogs.slice(0, 5).map((log) => (
                        <article key={log.id} className="rounded-[24px] border border-blue-100 bg-[#FFFFFF] p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-black text-[#0F172A]">{log.title || log.type}</p>
                              {log.note && <p className="mt-2 text-sm leading-6 text-[#64748B]">{log.note}</p>}
                            </div>
                            <p className="shrink-0 text-xs font-semibold text-[#64748B]">{formatTime(log.created_at)}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-10 text-center">
                <div className="text-5xl">🤖</div>
                <p className="mt-4 font-semibold text-[#0F172A]">No dependent selected.</p>
              </div>
            )}
          </section>
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-blue-100 bg-white/95 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className="rounded-2xl px-2 py-2 text-center text-[11px] font-semibold text-[#64748B]"
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
