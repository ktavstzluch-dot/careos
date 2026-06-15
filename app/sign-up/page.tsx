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
        <div className="text-xs font-medium text-[#64748B]">Trusted care for kids, pets and home</div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignUp() {
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Account created. Check your email for confirmation.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 text-[#0F172A]">
      <div className="w-full max-w-md rounded-[32px] border border-blue-100 bg-white p-8 shadow-xl shadow-blue-100/45">
        <CareOSLogo />
        <h1 className="mt-8 text-3xl font-black tracking-tight text-[#0F172A]">
          Create Account
        </h1>

        <p className="mt-2 text-[#64748B]">
          Create your CareOS account.
        </p>

        <input
          type="email"
          placeholder="Email"
          className="mt-6 w-full rounded-2xl border border-blue-100 bg-[#F8FAFC] p-4 text-sm font-medium outline-none transition focus:border-[#2563EB] focus:bg-white"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="mt-4 w-full rounded-2xl border border-blue-100 bg-[#F8FAFC] p-4 text-sm font-medium outline-none transition focus:border-[#2563EB] focus:bg-white"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <button
          onClick={handleSignUp}
          className="mt-6 w-full rounded-2xl bg-[#2563EB] p-4 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#1D4ED8]"
        >
          Create Account
        </button>

        {message && (
          <p className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-medium text-[#64748B]">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
