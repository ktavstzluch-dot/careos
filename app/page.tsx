"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

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
        <div className="hidden text-xs font-medium text-[#64748B] sm:block">Trusted care for kids, pets and home</div>
      </div>
    </div>
  );
}

const features = [
  {
    title: "Live care status",
    description: "See when a nanny, dog walker, elder caregiver or house sitter starts and ends care.",
    icon: "🟢",
  },
  {
    title: "Care Log",
    description: "Meals, walks, naps, medicine, photos and notes — everything saved in one timeline.",
    icon: "📝",
  },
  {
    title: "Built-in messages",
    description: "Keep communication inside the care session instead of losing details in WhatsApp.",
    icon: "💬",
  },
  {
    title: "AI summaries",
    description: "Turn photos, notes and updates into a clean daily summary for the family.",
    icon: "✨",
  },
];

export default function Home() {
    const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  async function handleWaitlistSubmit() {
    setStatus("");

    if (!email || !email.includes("@")) {
      setStatus("Please enter a valid email.");
      return;
    }

    const { error } = await supabase.from("waitlist").insert({
      email,
    });

    if (error) {
      if (error.code === "23505") {
        setStatus("You are already on the waitlist.");
      } else {
        setStatus("Something went wrong. Please try again.");
      }
      return;
    }

    setEmail("");
    setStatus("You're on the waitlist!");
  }
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <header className="border-b border-blue-100/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <CareOSLogo />

          <nav className="hidden items-center gap-2 rounded-full bg-[#F8FAFC] p-1 text-sm font-semibold text-[#64748B] md:flex">
            <a href="#features" className="rounded-full px-4 py-2 hover:bg-white hover:text-[#2563EB]">Features</a>
            <a href="#carelog" className="rounded-full px-4 py-2 hover:bg-white hover:text-[#2563EB]">Care Log</a>
            <a href="#waitlist" className="rounded-full px-4 py-2 hover:bg-white hover:text-[#2563EB]">Waitlist</a>
          </nav>

          <button className="rounded-full bg-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-sm shadow-blue-200 hover:bg-[#1D4ED8]">
            Join Waitlist
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
        <div>
          <div className="mb-6 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-[#2563EB]">
            Trusted care for kids, pets, elders & home
          </div>

          <h1 className="text-5xl font-black tracking-tight text-[#0F172A] md:text-7xl">
            Know everything is okay while you are away.
          </h1>

          <p className="mt-6 max-w-xl text-xl leading-8 text-[#64748B]">
            CareOS helps families manage caregivers, schedules, care logs,
            messages, photos and AI summaries in one calm, trusted place.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <button className="rounded-2xl bg-[#2563EB] px-8 py-4 font-bold text-white shadow-lg shadow-blue-200 hover:bg-[#1D4ED8]">
              Join Waitlist
            </button>

            <button className="rounded-2xl border border-blue-100 bg-white px-8 py-4 font-bold text-[#0F172A] hover:bg-[#F8FAFC]">
              See how it works
            </button>
          </div>
        </div>

        <div className="rounded-[32px] border border-blue-100 bg-white p-6 shadow-2xl shadow-blue-100/60">
          <div className="rounded-[24px] bg-[#F8FAFC] p-5">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B]">Today</p>
                <h2 className="text-2xl font-black">Care Status</h2>
              </div>
              <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-[#22C55E]">
                All good
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">Emma</p>
                    <p className="text-sm text-slate-500">Nanny visit · 3:00 PM - 7:00 PM</p>
                  </div>
                  <span className="text-2xl">👶</span>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">Max</p>
                    <p className="text-sm text-slate-500">Dog walk · Completed</p>
                  </div>
                  <span className="text-2xl">🐶</span>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <p className="text-sm font-semibold text-[#2563EB]">AI Summary</p>
                <p className="mt-2 text-[#64748B]">
                  Emma had lunch, took a 1-hour nap and played outside.
                  Max walked 1.4 miles and had water after the walk.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-4xl font-black">One platform. Every care moment.</h2>
          <p className="mt-4 text-lg text-[#64748B]">
            Designed for families who want peace of mind and caregivers who need a simple workflow.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-[28px] border border-blue-100 bg-white p-6 shadow-sm shadow-blue-100/50">
              <div className="text-3xl">{feature.icon}</div>
              <h3 className="mt-5 text-lg font-black">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#64748B]">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="carelog" className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-[32px] border border-blue-100 bg-white p-8 shadow-xl shadow-blue-100/45 md:p-12">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-[#2563EB]">Care Log</p>
              <h2 className="mt-3 text-4xl font-black text-[#0F172A]">Every update becomes a clear care story.</h2>
              <p className="mt-5 text-lg leading-8 text-[#64748B]">
                Caregivers can log meals, walks, medicine, activities, photos and notes.
                Parents see everything in one place.
              </p>
            </div>

            <div className="rounded-[28px] bg-[#F8FAFC] p-6 text-[#0F172A]">
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-slate-500">3:04 PM</p>
                  <p className="font-semibold">Anna checked in</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">4:15 PM</p>
                  <p className="font-semibold">Snack completed</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">5:20 PM</p>
                  <p className="font-semibold">Outdoor play · 3 photos uploaded</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 text-[#22C55E]">
                  AI summary ready for review
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="waitlist" className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-4xl font-black">Join the CareOS waitlist</h2>
        <p className="mt-4 text-lg text-[#64748B]">
          Be first to test the private beta for families and trusted caregivers.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="flex-1 rounded-2xl border border-blue-100 bg-white px-5 py-4 outline-none focus:border-[#2563EB]"
          />
         <button
         onClick={handleWaitlistSubmit}
         className="rounded-2xl bg-[#2563EB] px-8 py-4 font-bold text-white shadow-lg shadow-blue-200 hover:bg-[#1D4ED8]"
         >
         Request Access
         </button>
         {status && (
         <p className="mt-4 text-sm font-medium text-[#64748B]">
         {status}
         </p>
         )}
        </div>
      </section>
    </main>
  );
}
