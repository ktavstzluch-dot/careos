"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
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
  gender: string | null;
  notes: string | null;
  created_at: string;
};

type MemberForm = {
  name: string;
  type: DependentType;
  gender: string;
  dateOfBirth: string;
  photoUrl: string;
};

const PROFILE_PHOTO_BUCKETS = ["child-photos", "care-photos"];

const emptyMemberForm: MemberForm = {
  name: "",
  type: "child",
  gender: "",
  dateOfBirth: "",
  photoUrl: "",
};

const navItems = [
  { label: "Home", icon: "\u2302", href: "/dashboard" },
  { label: "Schedule", icon: "\u25A3", href: "/schedule" },
  { label: "Care Log", icon: "\u25A1", href: "/care-log" },
  { label: "Messages", icon: "\u25CD", href: "/messages" },
  { label: "Profile", icon: "\u2659", href: "/profile" },
];

const typeConfig: Record<DependentType, { label: string; icon: string; avatar: string; chip: string }> = {
  child: {
    label: "Child",
    icon: "C",
    avatar: "bg-blue-50 text-[#2563EB]",
    chip: "bg-blue-50 text-[#2563EB]",
  },
  pet: {
    label: "Pet",
    icon: "P",
    avatar: "bg-emerald-50 text-[#22C55E]",
    chip: "bg-emerald-50 text-[#22C55E]",
  },
  elder: {
    label: "Elder",
    icon: "E",
    avatar: "bg-violet-50 text-violet-700",
    chip: "bg-violet-50 text-violet-700",
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

function getDateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function isMissingBucketError(error: { message?: string }) {
  const message = error.message?.toLowerCase() || "";
  return message.includes("bucket not found") || message.includes("bucket") && message.includes("not found");
}

async function uploadDependentPhoto(file: File, storagePath: string) {
  let lastError: { message?: string } | null = null;

  for (const bucket of PROFILE_PHOTO_BUCKETS) {
    const { error } = await supabase.storage.from(bucket).upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (!error) {
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      return publicUrlData.publicUrl;
    }

    lastError = error;

    if (!isMissingBucketError(error)) {
      throw error;
    }
  }

  throw new Error(lastError?.message || "Dependent photo bucket was not found.");
}

export default function ManageFamilyPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | undefined>("");
  const [displayName, setDisplayName] = useState("");
  const [family, setFamily] = useState<Family | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState<MemberForm>(emptyMemberForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");

  async function loadFamily() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/sign-in");
      return;
    }

    const metadata = userData.user.user_metadata || {};
    const metadataName =
      (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
      (typeof metadata.display_name === "string" && metadata.display_name.trim()) ||
      getDisplayName(userData.user.email);

    setEmail(userData.user.email);
    setDisplayName(metadataName);

    const { data: familyData } = await supabase
      .from("families")
      .select("id, name")
      .eq("owner_id", userData.user.id)
      .maybeSingle();

    if (!familyData) {
      router.push("/dashboard");
      return;
    }

    setFamily(familyData as Family);

    const { data: dependentsData } = await supabase
      .from("dependents")
      .select("id, family_id, type, name, photo_url, date_of_birth, gender, notes, created_at")
      .eq("family_id", familyData.id)
      .in("type", ["child", "pet", "elder"])
      .order("created_at", { ascending: false });

    setDependents(((dependentsData || []) as Dependent[]).filter((item) => ["child", "pet", "elder"].includes(item.type)));
    setLoading(false);
  }

  useEffect(() => {
    loadFamily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!photoFile) return;

    const nextPreview = URL.createObjectURL(photoFile);
    setPhotoPreview(nextPreview);

    return () => URL.revokeObjectURL(nextPreview);
  }, [photoFile]);

  const initials = useMemo(() => displayName.slice(0, 1).toUpperCase(), [displayName]);
  const activeConfig = typeConfig[memberForm.type];
  const photoSrc = photoPreview || memberForm.photoUrl;

  function resetForm() {
    setEditingId(null);
    setMemberForm(emptyMemberForm);
    setPhotoFile(null);
    setPhotoPreview("");
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setMessage("");
  }

  function handleEditDependent(dependent: Dependent) {
    setMessage("");
    setEditingId(dependent.id);
    setMemberForm({
      name: dependent.name,
      type: dependent.type,
      gender: dependent.gender || "",
      dateOfBirth: getDateInputValue(dependent.date_of_birth),
      photoUrl: dependent.photo_url || "",
    });
    setPhotoFile(null);
    setPhotoPreview("");
  }

  async function getUploadedPhotoUrl(dependentId: string) {
    if (!photoFile || !family) return memberForm.photoUrl || null;

    const safeName = photoFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${family.id}/dependents/${dependentId}/profile-${Date.now()}-${safeName}`;

    return uploadDependentPhoto(photoFile, storagePath);
  }

  async function handleSaveDependent() {
    setMessage("");

    if (!family) {
      setMessage("Family workspace was not found.");
      return;
    }

    const nextName = memberForm.name.trim();

    if (!nextName) {
      setMessage("Please add a name.");
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        const nextPhotoUrl = await getUploadedPhotoUrl(editingId);
        const { error } = await supabase
          .from("dependents")
          .update({
            name: nextName,
            type: memberForm.type,
            gender: memberForm.gender || null,
            date_of_birth: memberForm.dateOfBirth || null,
            photo_url: nextPhotoUrl,
          })
          .eq("id", editingId)
          .eq("family_id", family.id)
          .select("id")
          .single();

        if (error) throw error;
        setMessage("Family member updated.");
      } else {
        const { data, error } = await supabase
          .from("dependents")
          .insert({
            family_id: family.id,
            type: memberForm.type,
            name: nextName,
            gender: memberForm.gender || null,
            date_of_birth: memberForm.dateOfBirth || null,
            photo_url: null,
            notes: null,
          })
          .select("id")
          .single();

        if (error) throw error;

        const nextPhotoUrl = await getUploadedPhotoUrl(data.id);

        if (nextPhotoUrl) {
          const { error: photoError } = await supabase
            .from("dependents")
            .update({ photo_url: nextPhotoUrl })
            .eq("id", data.id)
            .eq("family_id", family.id)
            .select("id")
            .single();

          if (photoError) throw photoError;
        }

        setMessage("Family member added.");
      }

      setSaving(false);
      resetForm();
      await loadFamily();
    } catch (error) {
      setSaving(false);
      setMessage(error instanceof Error ? error.message : "Could not save this family member.");
    }
  }

  async function handleDeleteDependent(dependent: Dependent) {
    setMessage("");

    const confirmed = window.confirm(`Remove ${dependent.name} from your family workspace?`);
    if (!confirmed) return;

    setDeletingId(dependent.id);

    const { error } = await supabase
      .from("dependents")
      .delete()
      .eq("id", dependent.id)
      .eq("family_id", dependent.family_id);

    setDeletingId("");

    if (error) {
      setMessage(error.message);
      return;
    }

    if (editingId === dependent.id) resetForm();
    setMessage("Family member removed.");
    await loadFamily();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-[#64748B]">Loading Family...</p>
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
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  item.label === "Profile"
                    ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
                    : "text-[#64748B] hover:bg-white hover:text-[#2563EB]"
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
          onClick={() => router.push("/profile")}
          className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#0F172A] shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50 hover:text-[#2563EB]"
        >
          ←
        </button>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            <p className="text-sm font-semibold text-[#64748B]">My Family</p>
            <h1 className="mt-1 text-3xl font-black text-[#0F172A]">Manage Family</h1>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Add or update the care profiles your family follows in CareOS.
            </p>

            <div className="mt-6 rounded-[28px] bg-[#F8FAFC] p-5 ring-1 ring-blue-100">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="shrink-0">
                  <div className="overflow-hidden rounded-[26px] bg-white ring-1 ring-blue-100">
                    {photoSrc ? (
                      <img src={photoSrc} alt={memberForm.name || "Family member"} className="h-28 w-28 object-cover" />
                    ) : (
                      <div className={`flex h-28 w-28 items-center justify-center text-5xl ${activeConfig.avatar}`}>
                        {activeConfig.icon}
                      </div>
                    )}
                  </div>
                  <label className="mt-3 block cursor-pointer rounded-full bg-blue-50 px-4 py-2 text-center text-xs font-bold text-[#2563EB] transition hover:bg-blue-100">
                    Change photo
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[#0F172A]">
                    {editingId ? "Edit family member" : "Add family member"}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-bold text-[#64748B]">
                      Name
                      <input
                        value={memberForm.name}
                        onChange={(event) => setMemberForm((form) => ({ ...form, name: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                        placeholder="Emma"
                      />
                    </label>
                    <label className="text-xs font-bold text-[#64748B]">
                      Type
                      <select
                        value={memberForm.type}
                        onChange={(event) => setMemberForm((form) => ({ ...form, type: event.target.value as DependentType }))}
                        className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      >
                        <option value="child">Child</option>
                        <option value="pet">Pet</option>
                        <option value="elder">Elder</option>
                      </select>
                    </label>
                    <label className="text-xs font-bold text-[#64748B]">
                      Gender
                      <select
                        value={memberForm.gender}
                        onChange={(event) => setMemberForm((form) => ({ ...form, gender: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      >
                        <option value="">Not added</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="non_binary">Non-binary</option>
                      </select>
                    </label>
                    <label className="text-xs font-bold text-[#64748B]">
                      Date of birth
                      <input
                        type="date"
                        value={memberForm.dateOfBirth}
                        onChange={(event) => setMemberForm((form) => ({ ...form, dateOfBirth: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                      />
                    </label>
                  </div>

                  {message && <p className="mt-4 text-sm font-semibold text-[#64748B]">{message}</p>}

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={handleSaveDependent}
                      disabled={saving}
                      className="rounded-full bg-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Saving..." : editingId ? "Save changes" : "Add member"}
                    </button>
                    <button
                      onClick={resetForm}
                      disabled={saving}
                      className="rounded-full bg-white px-5 py-3 text-sm font-bold text-[#64748B] ring-1 ring-blue-100 transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#64748B]">{family?.name || "Family"}</p>
                <h2 className="mt-1 text-3xl font-black text-[#0F172A]">Family cards</h2>
              </div>
              <span className="rounded-full bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#64748B]">
                {dependents.length} profiles
              </span>
            </div>

            {dependents.length === 0 ? (
              <div className="mt-7 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-10 text-center">
                <div className="text-4xl font-black text-[#2563EB]">CareOS</div>
                <p className="mt-4 font-semibold text-[#0F172A]">No family profiles yet.</p>
                <p className="mt-2 text-sm text-[#64748B]">Add a child, pet or elder to get started.</p>
              </div>
            ) : (
              <div className="mt-7 grid gap-4 md:grid-cols-2">
                {dependents.map((dependent) => {
                  const config = typeConfig[dependent.type];
                  const age = getAge(dependent.date_of_birth);

                  return (
                    <article key={dependent.id} className="rounded-[30px] border border-blue-100 bg-[#FFFFFF] p-5">
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

                      <h3 className="mt-5 text-xl font-black text-[#0F172A]">{dependent.name}</h3>
                      <p className="mt-1 text-sm text-[#64748B]">
                        {age === null ? `${config.label} care profile` : `${age} years old`}
                      </p>
                      {dependent.gender && <p className="mt-1 text-xs font-semibold text-[#64748B]">{dependent.gender}</p>}

                      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                        <button
                          onClick={() => handleEditDependent(dependent)}
                          className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-[#2563EB] transition hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDependent(dependent)}
                          disabled={deletingId === dependent.id}
                          className="rounded-full bg-red-50 px-4 py-2 text-xs font-bold text-[#EF4444] transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === dependent.id ? "Removing..." : "Delete"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
