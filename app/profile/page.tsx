"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
  date_of_birth: string | null;
  notes: string | null;
  created_at: string;
};

type CareLog = {
  id: string;
  dependent_id: string | null;
};

type Photo = {
  id: string;
  dependent_id: string | null;
};

const navItems = [
  { label: "Home", icon: "⌂", href: "/dashboard" },
  { label: "Schedule", icon: "▣", href: "/schedule" },
  { label: "Care Log", icon: "□", href: "/care-log" },
  { label: "Photos", icon: "◍", href: "/photos" },
  { label: "Profile", icon: "♙", href: "/profile" },
];

const typeConfig: Record<
  DependentType,
  { label: string; icon: string; avatar: string; chip: string }
> = {
  child: {
    label: "Child",
    icon: "👶",
    avatar: "bg-blue-50 text-[#1E5BFF]",
    chip: "bg-blue-50 text-[#1E5BFF]",
  },
  pet: {
    label: "Pet",
    icon: "🐾",
    avatar: "bg-emerald-50 text-[#22A06B]",
    chip: "bg-emerald-50 text-[#22A06B]",
  },
  elder: {
    label: "Elder",
    icon: "🧓",
    avatar: "bg-violet-50 text-violet-700",
    chip: "bg-violet-50 text-violet-700",
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

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | undefined>("");
  const [family, setFamily] = useState<Family | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [careLogs, setCareLogs] = useState<CareLog[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  async function loadProfile() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/sign-in");
      return;
    }

    setEmail(userData.user.email);

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
      .select("id, family_id, type, name, photo_url, date_of_birth, notes, created_at")
      .eq("family_id", familyData.id)
      .in("type", ["child", "pet", "elder"])
      .order("created_at", { ascending: false });

    const loadedDependents = ((dependentsData || []) as Dependent[]).filter((item) =>
      ["child", "pet", "elder"].includes(item.type)
    );

    setDependents(loadedDependents);

    const dependentIds = loadedDependents.map((item) => item.id);

    if (dependentIds.length > 0) {
      const { data: logsData } = await supabase
        .from("care_logs")
        .select("id, dependent_id")
        .in("dependent_id", dependentIds)
        .limit(200);

      setCareLogs((logsData || []) as CareLog[]);
    }

    const { data: photosData } = await supabase
      .from("photos")
      .select("id, dependent_id")
      .eq("family_id", familyData.id)
      .limit(200);

    setPhotos((photosData || []) as Photo[]);
    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName = useMemo(() => getDisplayName(email), [email]);
  const initials = displayName.slice(0, 1).toUpperCase();

  const counts = useMemo(() => {
    return dependents.reduce(
      (acc, item) => {
        acc[item.type] += 1;
        return acc;
      },
      { child: 0, pet: 0, elder: 0 } as Record<DependentType, number>
    );
  }, [dependents]);

  function getDependentStats(dependentId: string) {
    return {
      logs: careLogs.filter((log) => log.dependent_id === dependentId).length,
      photos: photos.filter((photo) => photo.dependent_id === dependentId).length,
    };
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FAFC]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-[#6B7A90]">Loading Profile...</p>
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
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  item.label === "Profile"
                    ? "bg-[#1E5BFF] text-white shadow-sm shadow-blue-200"
                    : "text-[#6B7A90] hover:bg-white hover:text-[#1E5BFF]"
                }`}
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
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6">
            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
              <div className="flex items-start gap-5">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[30px] bg-gradient-to-br from-[#1E5BFF] to-[#35B779] text-4xl font-black text-white shadow-lg shadow-blue-100">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#6B7A90]">Owner account</p>
                  <h1 className="mt-1 truncate text-4xl font-black tracking-tight text-[#102033]">{displayName}</h1>
                  <p className="mt-2 truncate text-sm text-[#6B7A90]">{email}</p>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-3 gap-3">
                <div className="rounded-[24px] bg-blue-50 p-4 text-center">
                  <p className="text-3xl font-black text-[#1E5BFF]">{counts.child}</p>
                  <p className="mt-1 text-xs font-semibold text-[#6B7A90]">Kids</p>
                </div>
                <div className="rounded-[24px] bg-emerald-50 p-4 text-center">
                  <p className="text-3xl font-black text-[#22A06B]">{counts.pet}</p>
                  <p className="mt-1 text-xs font-semibold text-[#6B7A90]">Pets</p>
                </div>
                <div className="rounded-[24px] bg-violet-50 p-4 text-center">
                  <p className="text-3xl font-black text-violet-700">{counts.elder}</p>
                  <p className="mt-1 text-xs font-semibold text-[#6B7A90]">Elders</p>
                </div>
              </div>
            </section>

            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-lg shadow-blue-100/40">
              <p className="text-sm font-semibold text-[#6B7A90]">CareOS Health</p>
              <h2 className="mt-1 text-2xl font-black text-[#102033]">Workspace status</h2>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-[24px] bg-[#F7FAFC] p-4">
                  <p className="text-3xl font-black text-[#102033]">{dependents.length}</p>
                  <p className="mt-1 text-xs font-semibold text-[#6B7A90]">Dependents</p>
                </div>
                <div className="rounded-[24px] bg-[#F7FAFC] p-4">
                  <p className="text-3xl font-black text-[#102033]">{careLogs.length}</p>
                  <p className="mt-1 text-xs font-semibold text-[#6B7A90]">Care logs</p>
                </div>
                <div className="rounded-[24px] bg-[#F7FAFC] p-4">
                  <p className="text-3xl font-black text-[#102033]">{photos.length}</p>
                  <p className="mt-1 text-xs font-semibold text-[#6B7A90]">Photos</p>
                </div>
                <div className="rounded-[24px] bg-emerald-50 p-4">
                  <p className="text-xl font-black text-[#22A06B]">Healthy</p>
                  <p className="mt-1 text-xs font-semibold text-[#6B7A90]">Status</p>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#6B7A90]">My Family</p>
                  <h2 className="mt-1 text-3xl font-black text-[#102033]">Dependents</h2>
                </div>
                <span className="rounded-full bg-[#F7FAFC] px-4 py-2 text-xs font-semibold text-[#6B7A90]">
                  {family?.name || "Family"}
                </span>
              </div>

              {dependents.length === 0 ? (
                <div className="mt-7 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-10 text-center">
                  <div className="text-5xl">💙</div>
                  <p className="mt-4 font-semibold text-[#102033]">No dependents yet.</p>
                  <p className="mt-2 text-sm text-[#6B7A90]">Add kids, pets or elders to your CareOS workspace.</p>
                </div>
              ) : (
                <div className="mt-7 grid gap-4 md:grid-cols-2">
                  {dependents.map((dependent) => {
                    const config = typeConfig[dependent.type];
                    const stats = getDependentStats(dependent.id);
                    const age = getAge(dependent.date_of_birth);

                    return (
                      <button
                        key={dependent.id}
                        onClick={() => router.push(`/dependent/${dependent.id}`)}
                        className="group rounded-[30px] border border-blue-100 bg-[#FBFDFF] p-5 text-left transition hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-blue-100/50"
                      >
                        <div className="flex items-center justify-between gap-4">
                          {dependent.photo_url ? (
                            <img src={dependent.photo_url} alt={dependent.name} className="h-16 w-16 rounded-[22px] object-cover" />
                          ) : (
                            <div className={`flex h-16 w-16 items-center justify-center rounded-[22px] text-3xl ${config.avatar}`}>
                              {config.icon}
                            </div>
                          )}
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${config.chip}`}>
                            {config.label}
                          </span>
                        </div>

                        <h3 className="mt-5 text-xl font-black text-[#102033]">{dependent.name}</h3>
                        <p className="mt-1 text-sm text-[#6B7A90]">
                          {age === null ? `${config.label} care profile` : `${age} years old`}
                        </p>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-white p-3">
                            <p className="text-lg font-black text-[#1E5BFF]">{stats.logs}</p>
                            <p className="text-xs text-[#6B7A90]">Logs</p>
                          </div>
                          <div className="rounded-2xl bg-white p-3">
                            <p className="text-lg font-black text-[#22A06B]">{stats.photos}</p>
                            <p className="text-xs text-[#6B7A90]">Photos</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-lg shadow-blue-100/40">
              <p className="text-sm font-semibold text-[#6B7A90]">Quick Access</p>
              <h2 className="mt-1 text-2xl font-black text-[#102033]">Family tools</h2>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <button onClick={() => router.push("/schedule")} className="rounded-[24px] bg-[#1E5BFF] p-5 text-left text-white shadow-lg shadow-blue-200">
                  <div className="text-3xl">📅</div>
                  <p className="mt-4 text-sm font-bold">Schedule</p>
                  <p className="mt-1 text-xs text-white/80">Visits and bookings</p>
                </button>
                <button onClick={() => router.push("/care-log")} className="rounded-[24px] bg-[#35B779] p-5 text-left text-white shadow-lg shadow-emerald-100">
                  <div className="text-3xl">📝</div>
                  <p className="mt-4 text-sm font-bold">Care Logs</p>
                  <p className="mt-1 text-xs text-white/80">Daily updates</p>
                </button>
                <button onClick={() => router.push("/photos")} className="rounded-[24px] border border-blue-100 bg-[#FBFDFF] p-5 text-left transition hover:bg-white">
                  <div className="text-3xl">📷</div>
                  <p className="mt-4 text-sm font-bold text-[#102033]">Photos</p>
                  <p className="mt-1 text-xs text-[#6B7A90]">Photo reports</p>
                </button>
                <button className="rounded-[24px] border border-blue-100 bg-[#FBFDFF] p-5 text-left transition hover:bg-white">
                  <div className="text-3xl">🤖</div>
                  <p className="mt-4 text-sm font-bold text-[#102033]">AI Summary</p>
                  <p className="mt-1 text-xs text-[#6B7A90]">Coming next</p>
                </button>
              </div>
            </section>

            <section className="rounded-[36px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-6 shadow-lg shadow-blue-100/40">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-2xl shadow-sm">🔐</div>
                <div>
                  <p className="text-sm font-semibold text-[#6B7A90]">Security</p>
                  <h2 className="mt-1 text-2xl font-black text-[#102033]">Trusted care workspace</h2>
                  <p className="mt-3 text-sm leading-6 text-[#6B7A90]">
                    Emergency contacts, caregiver permissions, documents and payment methods will live here in the next MVP phase.
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
              className={`rounded-2xl px-2 py-2 text-center text-[11px] font-semibold ${
                item.label === "Profile" ? "bg-blue-50 text-[#1E5BFF]" : "text-[#6B7A90]"
              }`}
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
