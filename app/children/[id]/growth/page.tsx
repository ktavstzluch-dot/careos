"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Child = {
  id: string;
  name: string;
  birth_date: string | null;
  photo_url: string | null;
};

type GrowthRecord = {
  id: string;
  child_id: string;
  measurement_date: string;
  height_cm: number | null;
  weight_kg: number | null;
  notes: string | null;
  created_at: string;
};

export default function GrowthTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;

  const [child, setChild] = useState<Child | null>(null);
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [measurementDate, setMeasurementDate] = useState(new Date().toISOString().slice(0, 10));
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadGrowth() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/sign-in");
        return;
      }

      const { data: childData } = await supabase
        .from("children")
        .select("id, name, birth_date, photo_url")
        .eq("id", childId)
        .single();

      const { data: recordsData } = await supabase
        .from("growth_records")
        .select("id, child_id, measurement_date, height_cm, weight_kg, notes, created_at")
        .eq("child_id", childId)
        .order("measurement_date", { ascending: false })
        .order("created_at", { ascending: false });

      setChild(childData);
      setRecords(recordsData || []);
      setLoading(false);
    }

    loadGrowth();
  }, [childId, router]);

  const sortedOldestFirst = useMemo(() => {
    return [...records].sort((a, b) => new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime());
  }, [records]);

  const latest = records[0] || null;
  const previous = records[1] || null;

  const heightDelta = latest?.height_cm != null && previous?.height_cm != null ? latest.height_cm - previous.height_cm : null;
  const weightDelta = latest?.weight_kg != null && previous?.weight_kg != null ? latest.weight_kg - previous.weight_kg : null;

  const maxHeight = Math.max(...sortedOldestFirst.map((record) => Number(record.height_cm || 0)), 1);
  const maxWeight = Math.max(...sortedOldestFirst.map((record) => Number(record.weight_kg || 0)), 1);

  async function handleAddRecord() {
    setMessage("");
    const parsedHeight = heightCm.trim() ? Number(heightCm) : null;
    const parsedWeight = weightKg.trim() ? Number(weightKg) : null;

    if (parsedHeight === null && parsedWeight === null) {
      setMessage("Please enter height or weight.");
      return;
    }

    if ((parsedHeight !== null && Number.isNaN(parsedHeight)) || (parsedWeight !== null && Number.isNaN(parsedWeight))) {
      setMessage("Please enter valid numbers.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("growth_records")
      .insert({
        child_id: childId,
        measurement_date: measurementDate,
        recorded_at: measurementDate,
        height_cm: parsedHeight,
        weight_kg: parsedWeight,
        notes: notes.trim() || null,
      })
      .select("id, child_id, measurement_date, height_cm, weight_kg, notes, created_at")
      .single();

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setRecords([data, ...records]);
    setHeightCm("");
    setWeightKg("");
    setNotes("");
    setMeasurementDate(new Date().toISOString().slice(0, 10));
    setMessage("Growth record added.");
  }

  async function handleDeleteRecord(recordId: string) {
    const { error } = await supabase.from("growth_records").delete().eq("id", recordId);
    if (error) {
      setMessage(error.message);
      return;
    }
    setRecords(records.filter((record) => record.id !== recordId));
    setMessage("Growth record deleted.");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F9FF]">
        <div className="rounded-[28px] border border-blue-100 bg-white px-8 py-6 shadow-sm shadow-blue-100/60">
          <p className="text-sm font-medium text-slate-500">Loading growth tracking...</p>
        </div>
      </main>
    );
  }

  if (!child) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F9FF]">
        <p className="text-slate-500">Child not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F9FF]">
      <header className="sticky top-0 z-20 border-b border-blue-100/70 bg-white/80 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button onClick={() => router.push(`/children/${childId}`)} className="rounded-2xl border border-blue-100 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-blue-50 hover:text-blue-700">← Child Profile</button>
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-400 text-white">✦</div><div className="text-lg font-semibold text-slate-800">CareOS</div></div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="overflow-hidden rounded-[36px] border border-blue-100 bg-gradient-to-br from-white via-sky-50 to-emerald-50 p-8 shadow-xl shadow-blue-100/40 md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6">
              {child.photo_url ? <img src={child.photo_url} alt={child.name} className="h-28 w-28 rounded-[30px] object-cover ring-4 ring-white shadow-lg" /> : <div className="flex h-28 w-28 items-center justify-center rounded-[30px] bg-white text-5xl shadow-lg">👶</div>}
              <div><div className="inline-flex rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-700">Growth Tracking</div><h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">{child.name}</h1><p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Track height and weight over time with a clean family health history.</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4"><div className="rounded-[28px] border border-blue-100 bg-white/90 p-5 text-center shadow-sm shadow-blue-100/50"><p className="text-xs font-semibold text-slate-400">Latest height</p><p className="mt-2 text-3xl font-semibold text-blue-600">{latest?.height_cm ? `${latest.height_cm}` : "—"}</p><p className="mt-1 text-xs text-slate-400">cm</p></div><div className="rounded-[28px] border border-emerald-100 bg-white/90 p-5 text-center shadow-sm shadow-emerald-100/50"><p className="text-xs font-semibold text-slate-400">Latest weight</p><p className="mt-2 text-3xl font-semibold text-emerald-500">{latest?.weight_kg ? `${latest.weight_kg}` : "—"}</p><p className="mt-1 text-xs text-slate-400">kg</p></div></div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3"><div className="rounded-[28px] border border-blue-100 bg-white p-6 shadow-sm shadow-blue-100/40"><p className="text-sm font-medium text-slate-500">Total records</p><p className="mt-2 text-4xl font-semibold text-blue-600">{records.length}</p></div><div className="rounded-[28px] border border-sky-100 bg-white p-6 shadow-sm shadow-sky-100/40"><p className="text-sm font-medium text-slate-500">Height change</p><p className="mt-2 text-4xl font-semibold text-sky-500">{heightDelta === null ? "—" : `${heightDelta > 0 ? "+" : ""}${heightDelta.toFixed(1)}`}</p><p className="mt-1 text-xs text-slate-400">cm vs previous</p></div><div className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm shadow-emerald-100/40"><p className="text-sm font-medium text-slate-500">Weight change</p><p className="mt-2 text-4xl font-semibold text-emerald-500">{weightDelta === null ? "—" : `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)}`}</p><p className="mt-1 text-xs text-slate-400">kg vs previous</p></div></div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
          <div className="rounded-[32px] border border-blue-100 bg-white p-8 shadow-lg shadow-blue-100/40">
            <div className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-600">New Measurement</div>
            <h2 className="mt-5 text-2xl font-semibold text-slate-900">Add Growth Record</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Add height, weight, or both. Notes are optional.</p>
            <input type="date" className="mt-6 w-full rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white" value={measurementDate} onChange={(event) => setMeasurementDate(event.target.value)} />
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><input type="number" step="0.1" placeholder="Height cm" className="w-full rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} /><input type="number" step="0.1" placeholder="Weight kg" className="w-full rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} /></div>
            <textarea placeholder="Optional notes: appetite, health visit, growth milestone..." className="mt-4 min-h-28 w-full rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white" value={notes} onChange={(event) => setNotes(event.target.value)} />
            <button onClick={handleAddRecord} disabled={saving} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 p-4 text-sm font-medium text-white shadow-lg shadow-blue-200 transition hover:from-blue-700 hover:to-sky-600 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving..." : "Save Growth Record"}</button>
            {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{message}</p>}
          </div>

          <div className="rounded-[32px] border border-blue-100 bg-white p-8 shadow-lg shadow-blue-100/40">
            <div className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-600">Growth Chart</div>
            <h2 className="mt-5 text-2xl font-semibold text-slate-900">Progress</h2>
            <p className="mt-2 text-sm text-slate-500">Simple visual trend from oldest to newest measurement.</p>
            {records.length === 0 ? <div className="mt-8 rounded-[28px] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center"><div className="text-5xl">📈</div><p className="mt-4 text-base font-semibold text-slate-700">No growth records yet.</p><p className="mt-2 text-sm text-slate-500">Add the first measurement to build the chart.</p></div> : <><div className="mt-8 space-y-5">{sortedOldestFirst.map((record) => <div key={record.id} className="rounded-[24px] border border-blue-50 bg-blue-50/30 p-4"><div className="flex items-center justify-between gap-4"><p className="text-sm font-semibold text-slate-700">{record.measurement_date}</p><p className="text-xs font-medium text-slate-400">{record.height_cm ? `${record.height_cm} cm` : "—"} · {record.weight_kg ? `${record.weight_kg} kg` : "—"}</p></div><div className="mt-4 space-y-3">{record.height_cm !== null && <div><div className="mb-1 flex justify-between text-xs font-medium text-slate-400"><span>Height</span><span>{record.height_cm} cm</span></div><div className="h-3 rounded-full bg-white"><div className="h-3 rounded-full bg-blue-500" style={{ width: `${Math.max(8, (Number(record.height_cm) / maxHeight) * 100)}%` }} /></div></div>}{record.weight_kg !== null && <div><div className="mb-1 flex justify-between text-xs font-medium text-slate-400"><span>Weight</span><span>{record.weight_kg} kg</span></div><div className="h-3 rounded-full bg-white"><div className="h-3 rounded-full bg-emerald-500" style={{ width: `${Math.max(8, (Number(record.weight_kg) / maxWeight) * 100)}%` }} /></div></div>}</div></div>)}</div><div className="mt-8 space-y-4">{records.map((record) => <div key={record.id} className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-base font-semibold text-slate-900">{record.measurement_date}</p><p className="mt-1 text-sm text-slate-500">{record.height_cm ? `${record.height_cm} cm` : "No height"} · {record.weight_kg ? `${record.weight_kg} kg` : "No weight"}</p></div><button onClick={() => handleDeleteRecord(record.id)} className="rounded-xl px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-red-50 hover:text-red-500">Delete</button></div>{record.notes && <p className="mt-4 rounded-2xl bg-blue-50/50 p-4 text-sm leading-6 text-slate-600">{record.notes}</p>}</div>)}</div></>}
          </div>
        </div>
      </section>
    </main>
  );
}
