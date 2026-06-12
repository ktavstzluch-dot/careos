"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Child = {
  id: string;
  name: string;
  birth_date: string | null;
  photo_url: string | null;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

function AssistantLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FBFF]">
      <div className="rounded-[28px] bg-white px-8 py-6 shadow-sm shadow-blue-100/60">
        <p className="text-sm font-medium text-slate-500">Loading CareOS Assistant...</p>
      </div>
    </main>
  );
}

function AssistantPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferredChildId = searchParams.get("childId");

  const [conversationId, setConversationId] = useState("");
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState(preferredChildId || "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAssistant() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/sign-in");
        return;
      }

      const { data: family } = await supabase
        .from("families")
        .select("id")
        .eq("owner_id", userData.user.id)
        .maybeSingle();

      if (family) {
        const { data: childrenData } = await supabase
          .from("children")
          .select("id, name, birth_date, photo_url")
          .eq("family_id", family.id)
          .order("created_at", { ascending: false });

        const loadedChildren = childrenData || [];
        setChildren(loadedChildren);

        const childId = preferredChildId || loadedChildren[0]?.id || "";
        setSelectedChildId(childId);

        const { data: existingConversation } = await supabase
          .from("ai_conversations")
          .select("id")
          .eq("user_id", userData.user.id)
          .eq("child_id", childId || null)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let activeConversationId = existingConversation?.id;

        if (!activeConversationId) {
          const { data: newConversation, error } = await supabase
            .from("ai_conversations")
            .insert({
              user_id: userData.user.id,
              child_id: childId || null,
              title: "Care Assistant",
            })
            .select("id")
            .single();

          if (!error) {
            activeConversationId = newConversation.id;
          }
        }

        if (activeConversationId) {
          setConversationId(activeConversationId);

          const { data: messagesData } = await supabase
            .from("ai_messages")
            .select("id, role, content, created_at")
            .eq("conversation_id", activeConversationId)
            .order("created_at", { ascending: true });

          setMessages((messagesData as Message[]) || []);
        }
      }

      setLoading(false);
    }

    loadAssistant();
  }, [preferredChildId, router]);

  const selectedChild = useMemo(() => {
    return children.find((child) => child.id === selectedChildId) || null;
  }, [children, selectedChildId]);

  function buildAssistantReply(userText: string) {
    const childName = selectedChild?.name || "your child";
    const lower = userText.toLowerCase();

    if (lower.includes("fever") || lower.includes("temperature") || lower.includes("темпера")) {
      return `For ${childName}, I would focus on comfort, hydration, and tracking symptoms. Offer small amounts of fluids often, keep notes on temperature and behavior, and contact a pediatrician if fever is high, lasts more than expected, or you notice trouble breathing, dehydration, unusual sleepiness, or worsening symptoms. This is not medical diagnosis.`;
    }

    if (lower.includes("eat") || lower.includes("food") || lower.includes("meal") || lower.includes("ест")) {
      return `For ${childName}, try to keep meals calm and simple. Offer familiar foods, small portions, and water. If appetite suddenly changes or continues to be very low, it is worth logging meals in CareOS and checking with a pediatrician if you are worried.`;
    }

    if (lower.includes("sleep") || lower.includes("nap") || lower.includes("сон")) {
      return `For ${childName}, a predictable routine usually helps: quiet time, dim lights, less screen time before sleep, and a consistent bedtime. You can log naps in CareOS so patterns become easier to see over time.`;
    }

    return `I can help you think through care routines for ${childName}. Based on what you wrote, I would log the situation, watch for patterns, and keep the next step simple. For medical symptoms or urgent concerns, contact a pediatrician or emergency services.`;
  }

  async function handleSend() {
    setMessage("");

    if (!input.trim()) {
      setMessage("Please enter a question.");
      return;
    }

    if (!conversationId) {
      setMessage("Assistant is still loading. Please try again.");
      return;
    }

    setSending(true);

    const userText = input.trim();
    setInput("");

    const { data: userMessage, error: userError } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: userText,
      })
      .select("id, role, content, created_at")
      .single();

    if (userError) {
      setMessage(userError.message);
      setSending(false);
      return;
    }

    const assistantText = buildAssistantReply(userText);

    const { data: assistantMessage, error: assistantError } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: assistantText,
      })
      .select("id, role, content, created_at")
      .single();

    await supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    if (assistantError) {
      setMessage(assistantError.message);
      setSending(false);
      return;
    }

    setMessages([
      ...messages,
      userMessage as Message,
      assistantMessage as Message,
    ]);
    setSending(false);
  }

  if (loading) {
    return <AssistantLoading />;
  }

  return (
    <main className="min-h-screen bg-[#F8FBFF] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-blue-100/60 bg-white/85 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-2xl bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm shadow-blue-100/50 ring-1 ring-blue-100 transition hover:bg-blue-50 hover:text-blue-700"
          >
            ← Dashboard
          </button>

          <div className="flex items-center gap-3">
            <img src="/careos-logo.svg" alt="CareOS" className="h-10 w-10" />
            <div className="text-lg font-medium text-slate-900">CareOS Assistant</div>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="rounded-[38px] bg-gradient-to-br from-white via-blue-50/70 to-teal-50 p-8 shadow-xl shadow-blue-100/50">
          <div className="inline-flex rounded-full bg-white/80 px-4 py-2 text-xs font-medium text-blue-700 shadow-sm shadow-blue-100/50 ring-1 ring-blue-100">
            AI care support
          </div>

          <h1 className="mt-6 text-4xl font-medium tracking-tight text-slate-950">
            Ask CareOS anything.
          </h1>

          <p className="mt-4 text-base leading-7 text-slate-600">
            A calm assistant for routines, logs, growth, vaccines and everyday care questions.
          </p>

          {children.length > 0 && (
            <div className="mt-8">
              <label className="text-sm font-medium text-slate-500">Focus child</label>
              <select
                value={selectedChildId}
                onChange={(event) => setSelectedChildId(event.target.value)}
                className="mt-3 w-full rounded-2xl border border-blue-100 bg-white/80 p-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400"
              >
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-8 rounded-[28px] bg-white/85 p-5 shadow-sm shadow-blue-100/50 ring-1 ring-blue-100">
            <p className="text-sm font-medium text-slate-900">Safety note</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              CareOS can help organize thoughts and routines, but it does not replace a pediatrician. For urgent symptoms, contact medical help.
            </p>
          </div>
        </aside>

        <div className="flex min-h-[680px] flex-col rounded-[38px] bg-white p-6 shadow-xl shadow-blue-100/40 ring-1 ring-blue-50">
          <div className="border-b border-blue-50 pb-5">
            <p className="text-sm font-medium text-slate-500">Conversation</p>
            <h2 className="mt-1 text-2xl font-medium text-slate-950">
              {selectedChild ? `${selectedChild.name}'s care assistant` : "Family care assistant"}
            </h2>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto py-6">
            {messages.length === 0 ? (
              <div className="rounded-[30px] bg-[#F8FBFF] p-8 text-center ring-1 ring-blue-50">
                <div className="text-5xl">💬</div>
                <p className="mt-4 text-lg font-medium text-slate-900">Start with a simple question.</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Try: “Emma has a fever and does not want to eat.”
                </p>
              </div>
            ) : (
              messages.map((item) => (
                <div
                  key={item.id}
                  className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-[26px] px-5 py-4 text-sm leading-6 shadow-sm ${
                      item.role === "user"
                        ? "bg-blue-600 text-white shadow-blue-100"
                        : "bg-[#F8FBFF] text-slate-700 shadow-blue-50 ring-1 ring-blue-50"
                    }`}
                  >
                    {item.content}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-blue-50 pt-5">
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about fever, sleep, food, routines or care logs..."
                className="min-h-16 flex-1 resize-none rounded-[24px] border border-blue-100 bg-blue-50/40 p-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
              />

              <button
                onClick={handleSend}
                disabled={sending}
                className="rounded-[24px] bg-gradient-to-br from-blue-600 to-teal-500 px-6 text-sm font-medium text-white shadow-lg shadow-blue-200 transition hover:from-blue-700 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "..." : "Send"}
              </button>
            </div>

            {message && (
              <p className="mt-3 rounded-2xl bg-teal-50 p-3 text-sm font-medium text-teal-700">
                {message}
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<AssistantLoading />}>
      <AssistantPageContent />
    </Suspense>
  );
}
