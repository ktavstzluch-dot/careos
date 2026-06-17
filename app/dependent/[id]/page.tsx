"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
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
  { label: "Home", icon: "\u2302", href: "/dashboard" },
  { label: "Schedule", icon: "\u25A3", href: "/schedule" },
  { label: "Care Log", icon: "\u25A1", href: "/care-log" },
  { label: "Messages", icon: "\u25CD", href: "/messages" },
  { label: "Profile", icon: "\u2659", href: "/profile" },
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

const PROFILE_PHOTO_BUCKET = "child-photos";

function splitProfileName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return { firstName: parts[0] || "", lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function getDateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

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
    avatar: "bg-blue-50 text-[#2563EB]",
    chip: "bg-blue-50 text-[#2563EB]",
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
    avatar: "bg-emerald-50 text-[#22C55E]",
    chip: "bg-emerald-50 text-[#22C55E]",
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [profileBirthDate, setProfileBirthDate] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

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

  useEffect(() => {
    return () => {
      if (profilePhotoPreview) {
        URL.revokeObjectURL(profilePhotoPreview);
      }
    };
  }, [profilePhotoPreview]);

  const displayName = useMemo(() => getDisplayName(email), [email]);
  const initials = displayName.slice(0, 1).toUpperCase();

  const config = dependent ? typeConfig[dependent.type] : null;
  const canEditProfile = dependent?.type === "child" || dependent?.type === "pet";
  const profilePhotoSrc = profilePhotoPreview || dependent?.photo_url || "";

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

  function resetProfileForm(nextDependent = dependent) {
    if (!nextDependent) return;

    const { firstName, lastName } = splitProfileName(nextDependent.name);
    setProfileFirstName(firstName);
    setProfileLastName(lastName);
    setProfileBirthDate(getDateInputValue(nextDependent.date_of_birth));
    setProfilePhotoFile(null);
    setProfilePhotoPreview("");
    setProfileMessage("");
  }

  function handleStartProfileEdit() {
    resetProfileForm();
    setIsEditingProfile(true);
  }

  function handleCancelProfileEdit() {
    resetProfileForm();
    setIsEditingProfile(false);
  }

  function handleProfilePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileMessage("Please choose an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileMessage("Please choose an image under 5 MB.");
      event.target.value = "";
      return;
    }

    if (profilePhotoPreview) {
      URL.revokeObjectURL(profilePhotoPreview);
    }

    setProfilePhotoFile(file);
    setProfilePhotoPreview(URL.createObjectURL(file));
    setProfileMessage("");
    event.target.value = "";
  }

  async function handleSaveProfile() {
    setProfileMessage("");

    if (!dependent || !canEditProfile) return;

    const firstName = profileFirstName.trim();
    const lastName = profileLastName.trim();

    if (!firstName) {
      setProfileMessage("Please add a first name.");
      return;
    }

    setSavingProfile(true);

    let nextPhotoUrl = dependent.photo_url;

    if (profilePhotoFile) {
      const safeName = profilePhotoFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `${dependent.family_id}/${dependent.id}/profile-${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(PROFILE_PHOTO_BUCKET)
        .upload(storagePath, profilePhotoFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setSavingProfile(false);
        setProfileMessage(uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(storagePath);
      nextPhotoUrl = publicUrlData.publicUrl;
    }

    const nextName = [firstName, lastName].filter(Boolean).join(" ");

    const { data, error } = await supabase
      .from("dependents")
      .update({
        name: nextName,
        date_of_birth: profileBirthDate || null,
        photo_url: nextPhotoUrl,
      })
      .eq("id", dependent.id)
      .select("id, family_id, type, name, photo_url, date_of_birth, gender, notes, created_at, legacy_child_id")
      .single();

    setSavingProfile(false);

    if (error) {
      setProfileMessage(error.message);
      return;
    }

    const updatedDependent = data as Dependent;
    setDependent(updatedDependent);
    setIsEditingProfile(false);
    setProfilePhotoFile(null);
    setProfilePhotoPreview("");
    setProfileMessage("Profile updated.");
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
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-[#64748B]">Loading profile...</p>
        </div>
      </main>
    );
  }

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
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#22C55E] text-sm font-bold text-white">
                {initials}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-[#0F172A]">{displayName}</p>
                <p className="max-w-[190px] truncate text-xs text-[#64748B]">{email}</p>
              </div>
              <span className="text-xs text-[#64748B]">⌄</span>
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
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#0F172A] shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50 hover:text-[#2563EB]"
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${config.chip}`}>
                        {config.label}
                      </span>
                      {canEditProfile && !isEditingProfile && (
                        <button
                          onClick={handleStartProfileEdit}
                          className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#2563EB] shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50"
                        >
                          Edit profile
                        </button>
                      )}
                    </div>
                    <h1 className="mt-3 truncate text-4xl font-black tracking-tight text-[#0F172A]">{dependent.name}</h1>
                    <p className="mt-2 text-sm font-semibold text-[#64748B]">{config.headline}</p>
                  </div>
                </div>

                <p className="mt-6 text-base leading-7 text-[#64748B]">{config.summary}</p>

                {canEditProfile && isEditingProfile && (
                  <div className="mt-6 rounded-[28px] bg-white/90 p-5 shadow-sm ring-1 ring-blue-100">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                      <div className="shrink-0">
                        <div className="overflow-hidden rounded-[26px] bg-[#F8FAFC] ring-1 ring-blue-100">
                          {profilePhotoSrc ? (
                            <img src={profilePhotoSrc} alt={dependent.name} className="h-28 w-28 object-cover" />
                          ) : (
                            <div className={`flex h-28 w-28 items-center justify-center text-5xl ${config.avatar}`}>
                              {config.icon}
                            </div>
                          )}
                        </div>
                        <label className="mt-3 block cursor-pointer rounded-full bg-blue-50 px-4 py-2 text-center text-xs font-bold text-[#2563EB] transition hover:bg-blue-100">
                          Change photo
                          <input type="file" accept="image/*" onChange={handleProfilePhotoChange} className="hidden" />
                        </label>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-[#0F172A]">Profile details</p>
                        <p className="mt-1 text-xs leading-5 text-[#64748B]">
                          Keep this care profile familiar and up to date for your family.
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <label className="text-xs font-bold text-[#64748B]">
                            First name
                            <input
                              value={profileFirstName}
                              onChange={(event) => setProfileFirstName(event.target.value)}
                              className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                              placeholder="Emma"
                            />
                          </label>
                          <label className="text-xs font-bold text-[#64748B]">
                            Last name
                            <input
                              value={profileLastName}
                              onChange={(event) => setProfileLastName(event.target.value)}
                              className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                              placeholder="Hakobyan"
                            />
                          </label>
                          <label className="text-xs font-bold text-[#64748B] sm:col-span-2">
                            Date of birth
                            <input
                              type="date"
                              value={profileBirthDate}
                              onChange={(event) => setProfileBirthDate(event.target.value)}
                              className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                            />
                          </label>
                        </div>

                        {profileMessage && (
                          <p className="mt-3 text-xs font-semibold text-[#64748B]">{profileMessage}</p>
                        )}

                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                          <button
                            onClick={handleSaveProfile}
                            disabled={savingProfile}
                            className="rounded-full bg-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingProfile ? "Saving..." : "Save changes"}
                          </button>
                          <button
                            onClick={handleCancelProfileEdit}
                            disabled={savingProfile}
                            className="rounded-full bg-white px-5 py-3 text-sm font-bold text-[#64748B] ring-1 ring-blue-100 transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {canEditProfile && !isEditingProfile && profileMessage && (
                  <p className="mt-4 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-[#22C55E]">
                    {profileMessage}
                  </p>
                )}

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="rounded-[24px] bg-white/90 p-4 shadow-sm ring-1 ring-blue-100">
                    <p className="text-xs font-semibold text-[#64748B]">Age</p>
                    <p className="mt-1 text-2xl font-black text-[#0F172A]">{age === null ? "—" : age}</p>
                  </div>
                  <div className="rounded-[24px] bg-white/90 p-4 shadow-sm ring-1 ring-blue-100">
                    <p className="text-xs font-semibold text-[#64748B]">Logs</p>
                    <p className="mt-1 text-2xl font-black text-[#2563EB]">{careLogs.length}</p>
                  </div>
                  <div className="rounded-[24px] bg-white/90 p-4 shadow-sm ring-1 ring-blue-100">
                    <p className="text-xs font-semibold text-[#64748B]">Status</p>
                    <p className="mt-1 text-sm font-black text-[#22C55E]">All good</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-lg shadow-blue-100/40">
              <p className="text-sm font-semibold text-[#64748B]">Quick actions</p>
              <h2 className="mt-1 text-2xl font-black text-[#0F172A]">Care tools</h2>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button onClick={() => router.push("/schedule")} className="rounded-[24px] bg-[#2563EB] p-5 text-left text-white shadow-lg shadow-blue-200">
                  <div className="text-3xl">📅</div>
                  <p className="mt-4 text-sm font-bold">Schedule</p>
                  <p className="mt-1 text-xs text-white/80">Book care</p>
                </button>
                <button onClick={() => router.push("/care-log")} className="rounded-[24px] bg-[#22C55E] p-5 text-left text-white shadow-lg shadow-emerald-100">
                  <div className="text-3xl">📝</div>
                  <p className="mt-4 text-sm font-bold">Care Log</p>
                  <p className="mt-1 text-xs text-white/80">Add update</p>
                </button>
                <button className="rounded-[24px] border border-blue-100 bg-[#FFFFFF] p-5 text-left">
                  <div className="text-3xl">📷</div>
                  <p className="mt-4 text-sm font-bold text-[#0F172A]">Photos</p>
                  <p className="mt-1 text-xs text-[#64748B]">Coming soon</p>
                </button>
                <button className="rounded-[24px] border border-red-100 bg-red-50 p-5 text-left">
                  <div className="text-3xl">🚨</div>
                  <p className="mt-4 text-sm font-bold text-[#EF4444]">Emergency</p>
                  <p className="mt-1 text-xs text-[#64748B]">Contacts</p>
                </button>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">Care Plan</p>
                  <h2 className="mt-1 text-3xl font-black text-[#0F172A]">Important details</h2>
                </div>
                <span className="rounded-full bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#64748B]">
                  {family?.name || "Family"}
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {config.fields.map((field) => (
                  <div key={field.label} className="rounded-[26px] bg-[#F8FAFC] p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                      {field.icon}
                    </div>
                    <p className="mt-4 text-sm font-black text-[#0F172A]">{field.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[#64748B]">{field.value}</p>
                  </div>
                ))}
              </div>

              {dependent.notes && (
                <div className="mt-5 rounded-[26px] border border-blue-100 bg-blue-50/40 p-5">
                  <p className="text-sm font-black text-[#0F172A]">Notes</p>
                  <p className="mt-2 text-sm leading-6 text-[#64748B]">{dependent.notes}</p>
                </div>
              )}
            </section>

            <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-lg shadow-blue-100/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">Today</p>
                  <h2 className="mt-1 text-3xl font-black text-[#0F172A]">Care timeline</h2>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#22C55E]">
                  AI summary ready soon
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {recentLogs.map((log) => (
                  <article key={log.id} className="rounded-[26px] border border-blue-100 bg-[#FFFFFF] p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl">
                        {getLogIcon(log.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-[#0F172A]">{getLogTitle(log)}</p>
                          <p className="text-xs font-semibold text-[#64748B]">{formatTime(log.created_at)}</p>
                        </div>
                        {log.note && <p className="mt-2 text-sm leading-6 text-[#64748B]">{log.note}</p>}
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
                  <p className="text-sm font-semibold text-[#64748B]">AI Summary</p>
                  <h2 className="mt-1 text-2xl font-black text-[#0F172A]">{dependent.name}&apos;s daily summary</h2>
                  <p className="mt-3 text-sm leading-6 text-[#64748B]">
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
