"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfileFromUser } from "@/lib/profile";

type DependentType = "child" | "pet" | "elder";

type CareDetails = Record<string, Record<string, string>>;

type Dependent = {
  id: string;
  family_id: string;
  type: DependentType;
  name: string;
  photo_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  notes: string | null;
  care_details: CareDetails | null;
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

type DetailField = {
  id: string;
  label: string;
  placeholder: string;
};

type DetailSection = {
  id: string;
  label: string;
  emptyText: string;
  iconLabel: string;
  fields: DetailField[];
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

const PROFILE_PHOTO_BUCKETS = ["child-photos", "care-photos"];

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

function isMissingBucketError(error: { message?: string }) {
  const message = error.message?.toLowerCase() || "";
  return message.includes("bucket not found") || (message.includes("bucket") && message.includes("not found"));
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
    sections: DetailSection[];
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
    sections: [
      {
        id: "routine",
        label: "Routine",
        emptyText: "Instructions pending",
        iconLabel: "Routine",
        fields: [
          { id: "routine_instructions", label: "Routine instructions", placeholder: "Nap, play, school pickup, bedtime routine..." },
          { id: "daily_schedule", label: "Daily schedule", placeholder: "Breakfast at 8, nap at 1, outdoor play after snack..." },
        ],
      },
      {
        id: "child_health_notes",
        label: "Health Notes",
        emptyText: "Health notes pending",
        iconLabel: "Health Notes",
        fields: [
          { id: "allergies", label: "Allergies", placeholder: "Food, medicine, seasonal allergies..." },
          { id: "restrictions", label: "Restrictions", placeholder: "Activities, foods, screen time, safety notes..." },
          { id: "health_notes", label: "Health notes", placeholder: "Anything caregivers should know today..." },
        ],
      },
      {
        id: "child_care_plan",
        label: "Care Plan",
        emptyText: "Instructions pending",
        iconLabel: "Care Plan",
        fields: [
          { id: "caregiver_instructions", label: "Caregiver instructions", placeholder: "How to comfort, support, and care for them..." },
          { id: "daily_care_guidance", label: "Daily care guidance", placeholder: "Preferred activities, routines, family guidance..." },
        ],
      },
    ],
  },
  pet: {
    label: "Pet",
    plural: "Pets",
    icon: "🐾",
    avatar: "bg-emerald-50 text-[#22C55E]",
    chip: "bg-emerald-50 text-[#22C55E]",
    headline: "Pet care profile",
    summary: "Walks, feeding, water, medicine, vet notes and shared Moments.",
    primaryCare: "Dog walk",
    sections: [
      {
        id: "feeding",
        label: "Feeding",
        emptyText: "Instructions pending",
        iconLabel: "Feeding",
        fields: [
          { id: "feeding_instructions", label: "Feeding instructions", placeholder: "Food type, portions, water, treats..." },
          { id: "food_schedule", label: "Food schedule", placeholder: "Morning meal, evening meal, treat timing..." },
        ],
      },
      {
        id: "walking",
        label: "Walking",
        emptyText: "Instructions pending",
        iconLabel: "Walking",
        fields: [
          { id: "walking_instructions", label: "Walking instructions", placeholder: "Leash, route, park, behavior notes..." },
          { id: "walk_schedule", label: "Walk schedule", placeholder: "Morning walk, afternoon walk, evening potty break..." },
        ],
      },
      {
        id: "vet",
        label: "Vet",
        emptyText: "Not added yet",
        iconLabel: "Vet",
        fields: [
          { id: "veterinarian_notes", label: "Veterinarian notes", placeholder: "Vet name, clinic, contact, appointments..." },
          { id: "medical_notes", label: "Medical notes", placeholder: "Medication, restrictions, health observations..." },
        ],
      },
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
    sections: [
      {
        id: "medication",
        label: "Medication",
        emptyText: "Instructions pending",
        iconLabel: "Medication",
        fields: [
          { id: "medication_instructions", label: "Medication instructions", placeholder: "Medication names, dosage, how to give..." },
          { id: "medication_schedule", label: "Medication schedule", placeholder: "Morning, afternoon, evening timing..." },
          { id: "medication_notes", label: "Medication notes", placeholder: "Side effects, reminders, family notes..." },
        ],
      },
      {
        id: "elder_health_notes",
        label: "Health Notes",
        emptyText: "Health notes pending",
        iconLabel: "Health Notes",
        fields: [
          { id: "health_conditions", label: "Health conditions", placeholder: "Known conditions caregivers should know..." },
          { id: "allergies", label: "Allergies", placeholder: "Medication, food, seasonal allergies..." },
          { id: "restrictions", label: "Restrictions", placeholder: "Mobility, diet, activity restrictions..." },
          { id: "health_notes", label: "Health notes", placeholder: "Daily comfort, symptoms, observation notes..." },
        ],
      },
      {
        id: "elder_care_plan",
        label: "Care Plan",
        emptyText: "Instructions pending",
        iconLabel: "Care Plan",
        fields: [
          { id: "daily_care_plan", label: "Daily care plan", placeholder: "Meals, support, rest, reminders..." },
          { id: "routines", label: "Routines", placeholder: "Morning routine, evening routine, preferred flow..." },
          { id: "caregiver_instructions", label: "Caregiver instructions", placeholder: "Family guidance for comfort and trust..." },
        ],
      },
    ],
  },
};

function getSectionValues(careDetails: CareDetails | null | undefined, sectionId: string) {
  const values = careDetails?.[sectionId];
  return values && typeof values === "object" && !Array.isArray(values) ? values : {};
}

function getFilledSectionFields(section: DetailSection, careDetails: CareDetails | null | undefined) {
  const values = getSectionValues(careDetails, section.id);

  return section.fields
    .map((field) => ({
      ...field,
      value: typeof values[field.id] === "string" ? values[field.id].trim() : "",
    }))
    .filter((field) => field.value);
}

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

function DependentTypeIcon({ type }: { type: DependentType }) {
  if (type === "pet") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
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
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.5 20c1.4-3.2 4-5 7.5-5s6.1 1.8 7.5 5" />
        <path d="M17.5 14.5 19 20" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M5 20c1.2-3.5 3.5-5.2 7-5.2s5.8 1.7 7 5.2" />
      <path d="M8 12.5c.9 1 2.2 1.5 4 1.5s3.1-.5 4-1.5" />
    </svg>
  );
}

function CareDetailIcon({ label }: { label: string }) {
  if (label.toLowerCase().includes("routine") || label.toLowerCase().includes("walking")) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 18c2-3 4-4.5 6-4.5S16 15 18 18" />
        <path d="M9 10a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" />
      </svg>
    );
  }

  if (
    label.toLowerCase().includes("medicine") ||
    label.toLowerCase().includes("medication") ||
    label.toLowerCase().includes("vet") ||
    label.toLowerCase().includes("health")
  ) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m8.2 15.8 7.6-7.6a3.4 3.4 0 0 1 4.8 4.8L13 20.6a3.4 3.4 0 0 1-4.8-4.8Z" />
        <path d="m12 12 4 4" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 4.5 19 8v5.5c0 3.4-2.7 5.8-7 7-4.3-1.2-7-3.6-7-7V8l7-3.5Z" />
      <path d="m9 12 2 2 4-5" />
    </svg>
  );
}

function CareLogTypeIcon({ type }: { type: string }) {
  if (type === "meal") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="13" cy="12" r="5" />
        <path d="M5 5v14" />
        <path d="M8 5v14" />
      </svg>
    );
  }

  if (type === "walk") {
    return <DependentTypeIcon type="pet" />;
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6h10" />
      <path d="M8 12h10" />
      <path d="M8 18h7" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </svg>
  );
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

export default function DependentProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const dependentId = params?.id;

  const [email, setEmail] = useState<string | undefined>("");
  const [displayName, setDisplayName] = useState("CareOS Family");
  const [avatarUrl, setAvatarUrl] = useState("");
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
  const [profileType, setProfileType] = useState<DependentType>("child");
  const [profileGender, setProfileGender] = useState("");
  const [profileBirthDate, setProfileBirthDate] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [editingDetailId, setEditingDetailId] = useState<string | null>(null);
  const [detailDraft, setDetailDraft] = useState<Record<string, string>>({});
  const [savingDetail, setSavingDetail] = useState(false);
  const [detailMessage, setDetailMessage] = useState("");

  async function loadProfile() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/sign-in");
      return;
    }

    const profile = getProfileFromUser(userData.user);
    setEmail(profile.email);
    setDisplayName(profile.displayName);
    setAvatarUrl(profile.avatarUrl);

    if (!dependentId) {
      router.push("/dashboard");
      return;
    }

    const { data: dependentData, error: dependentError } = await supabase
      .from("dependents")
      .select("id, family_id, type, name, photo_url, date_of_birth, gender, notes, care_details, created_at, legacy_child_id")
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

  const initials = displayName.slice(0, 1).toUpperCase();

  const config = dependent ? typeConfig[dependent.type] : null;
  const editConfig = typeConfig[profileType];
  const importantDetailSections = config?.sections || [];
  const canEditProfile = Boolean(dependent);
  const profilePhotoSrc = profilePhotoPreview || dependent?.photo_url || "";

  const age = useMemo(() => {
    if (!dependent) return null;
    return getAge(dependent.date_of_birth);
  }, [dependent]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  function resetProfileForm(nextDependent = dependent) {
    if (!nextDependent) return;

    const { firstName, lastName } = splitProfileName(nextDependent.name);
    setProfileFirstName(firstName);
    setProfileLastName(lastName);
    setProfileType(nextDependent.type);
    setProfileGender(nextDependent.gender || "");
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

      try {
        nextPhotoUrl = await uploadDependentPhoto(profilePhotoFile, storagePath);
      } catch (uploadError) {
        setSavingProfile(false);
        setProfileMessage(uploadError instanceof Error ? uploadError.message : "Photo could not be uploaded.");
        return;
      }
    }

    const nextName = [firstName, lastName].filter(Boolean).join(" ");
    const { data, error } = await supabase
      .from("dependents")
      .update({
        name: nextName,
        type: profileType,
        gender: profileGender || null,
        date_of_birth: profileBirthDate || null,
        photo_url: nextPhotoUrl,
      })
      .eq("id", dependent.id)
      .select("id, family_id, type, name, photo_url, date_of_birth, gender, notes, care_details, created_at, legacy_child_id")
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

  function handleStartDetailEdit(section: DetailSection) {
    if (!dependent) return;

    const values = getSectionValues(dependent.care_details, section.id);
    setEditingDetailId(section.id);
    setDetailDraft(
      section.fields.reduce<Record<string, string>>((draft, field) => {
        draft[field.id] = typeof values[field.id] === "string" ? values[field.id] : "";
        return draft;
      }, {}),
    );
    setDetailMessage("");
  }

  function handleCancelDetailEdit() {
    setEditingDetailId(null);
    setDetailDraft({});
    setDetailMessage("");
  }

  async function handleSaveDetailSection(section: DetailSection) {
    setDetailMessage("");

    if (!dependent) return;

    setSavingDetail(true);

    const sectionValues = section.fields.reduce<Record<string, string>>((values, field) => {
      const nextValue = detailDraft[field.id]?.trim() || "";

      if (nextValue) {
        values[field.id] = nextValue;
      }

      return values;
    }, {});

    const nextCareDetails: CareDetails = {
      ...(dependent.care_details || {}),
      [section.id]: sectionValues,
    };

    const { data, error } = await supabase
      .from("dependents")
      .update({ care_details: nextCareDetails })
      .eq("id", dependent.id)
      .eq("family_id", dependent.family_id)
      .select("id, family_id, type, name, photo_url, date_of_birth, gender, notes, care_details, created_at, legacy_child_id")
      .single();

    setSavingDetail(false);

    if (error) {
      setDetailMessage(error.message);
      return;
    }

    setDependent(data as Dependent);
    setEditingDetailId(null);
    setDetailDraft({});
    setDetailMessage(`${section.label} updated.`);
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
        <button
          onClick={() => router.push("/profile")}
          className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#0F172A] shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50 hover:text-[#2563EB]"
        >
          ←
        </button>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="contents">
            <section className="order-1 overflow-hidden rounded-[36px] border border-blue-100 bg-white shadow-xl shadow-blue-100/45 lg:col-start-1 lg:row-start-1">
              <div className="bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-7">
                <div className="flex items-start gap-5">
                  {dependent.photo_url ? (
                    <img src={dependent.photo_url} alt={dependent.name} className="h-24 w-24 rounded-[30px] object-cover ring-4 ring-white" />
                  ) : (
                    <div className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-[30px] ring-4 ring-white ${config.avatar}`}>
                      <DependentTypeIcon type={dependent.type} />
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
                            <div className={`flex h-28 w-28 items-center justify-center ${editConfig.avatar}`}>
                              <DependentTypeIcon type={profileType} />
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
                          <label className="text-xs font-bold text-[#64748B]">
                            Type
                            <select
                              value={profileType}
                              onChange={(event) => setProfileType(event.target.value as DependentType)}
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
                              value={profileGender}
                              onChange={(event) => setProfileGender(event.target.value)}
                              className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB]"
                            >
                              <option value="">Not added</option>
                              <option value="female">Female</option>
                              <option value="male">Male</option>
                              <option value="non_binary">Non-binary</option>
                            </select>
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

            <section className="order-3 rounded-[36px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/45 lg:col-span-2 lg:row-start-2">
              <h2 className="text-2xl font-black text-[#0F172A]">Care Tools</h2>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  onClick={() => router.push("/schedule")}
                  className="group rounded-[26px] border border-blue-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/60"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] transition group-hover:bg-[#2563EB] group-hover:text-white">
                    <CareLogTypeIcon type="activity" />
                  </div>
                  <p className="mt-4 text-sm font-black text-[#0F172A]">Schedule</p>
                  <p className="mt-1 text-xs leading-5 text-[#64748B]">Plan future care</p>
                </button>
                <button
                  onClick={() => router.push("/care-log")}
                  className="group rounded-[26px] border border-emerald-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-100/60"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#22C55E] transition group-hover:bg-[#22C55E] group-hover:text-white">
                    <CareLogTypeIcon type="note" />
                  </div>
                  <p className="mt-4 text-sm font-black text-[#0F172A]">Care Log</p>
                  <p className="mt-1 text-xs leading-5 text-[#64748B]">Track care activity</p>
                </button>
                <button className="group rounded-[26px] border border-violet-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/60">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 transition group-hover:bg-violet-600 group-hover:text-white">
                    <CareLogTypeIcon type="photo" />
                  </div>
                  <p className="mt-4 text-sm font-black text-[#0F172A]">Photos</p>
                  <p className="mt-1 text-xs leading-5 text-[#64748B]">View memories</p>
                </button>
                <button className="group rounded-[26px] border border-red-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-xl hover:shadow-red-100/60">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#EF4444] transition group-hover:bg-[#EF4444] group-hover:text-white">
                    <CareDetailIcon label="Emergency" />
                  </div>
                  <p className="mt-4 text-sm font-black text-[#0F172A]">Emergency</p>
                  <p className="mt-1 text-xs leading-5 text-[#64748B]">Important contacts</p>
                </button>
              </div>
            </section>
          </div>

          <div className="contents">
            <section className="order-2 rounded-[36px] border border-blue-100 bg-white p-7 shadow-xl shadow-blue-100/45 lg:col-start-2 lg:row-start-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#64748B]">Care Plan</p>
                  <h2 className="mt-1 text-3xl font-black text-[#0F172A]">Important Details</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#64748B]">
                    {family?.name || "Family"}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {importantDetailSections.map((section) => {
                  const filledFields = getFilledSectionFields(section, dependent.care_details);
                  const isEditing = editingDetailId === section.id;

                  return (
                    <div
                      key={section.id}
                      className={`rounded-[26px] bg-[#F8FAFC] p-6 transition ${
                        isEditing ? "ring-2 ring-[#2563EB]/30" : "hover:bg-blue-50/50"
                      }`}
                    >
                      <button type="button" onClick={() => handleStartDetailEdit(section)} className="block w-full text-left">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm">
                            <CareDetailIcon label={section.iconLabel} />
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#2563EB] ring-1 ring-blue-100">
                            Edit
                          </span>
                        </div>
                        <p className="mt-4 text-sm font-black text-[#0F172A]">{section.label}</p>
                        <div className="mt-2 space-y-2">
                          {filledFields.length === 0 ? (
                            <p className="text-xs leading-5 text-[#64748B]">{section.emptyText}</p>
                          ) : (
                            filledFields.slice(0, 2).map((field) => (
                              <div key={field.id}>
                                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#94A3B8]">{field.label}</p>
                                <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[#64748B]">{field.value}</p>
                              </div>
                            ))
                          )}
                          {filledFields.length > 2 && (
                            <p className="text-[11px] font-bold text-[#2563EB]">+{filledFields.length - 2} more details</p>
                          )}
                        </div>
                      </button>

                      {isEditing && (
                        <div className="mt-5 rounded-[22px] border border-blue-100 bg-white p-4">
                          <div className="space-y-3">
                            {section.fields.map((field) => (
                              <label key={field.id} className="block text-xs font-bold text-[#64748B]">
                                {field.label}
                                <textarea
                                  value={detailDraft[field.id] || ""}
                                  onChange={(event) =>
                                    setDetailDraft((draft) => ({
                                      ...draft,
                                      [field.id]: event.target.value,
                                    }))
                                  }
                                  className="mt-2 min-h-24 w-full rounded-2xl border border-blue-100 bg-[#F8FAFC] px-4 py-3 text-sm font-semibold leading-6 text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:bg-white"
                                  placeholder={field.placeholder}
                                />
                              </label>
                            ))}
                          </div>

                          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => handleSaveDetailSection(section)}
                              disabled={savingDetail}
                              className="rounded-full bg-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingDetail ? "Saving..." : "Save section"}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelDetailEdit}
                              disabled={savingDetail}
                              className="rounded-full bg-white px-5 py-3 text-sm font-bold text-[#64748B] ring-1 ring-blue-100 transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {detailMessage && (
                <p className="mt-4 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-[#22C55E]">
                  {detailMessage}
                </p>
              )}
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
