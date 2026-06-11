import { supabase } from "@/lib/supabase";

export default async function TestPage() {
  const { data, error } = await supabase
    .from("waitlist")
    .select("*");

  return (
    <main className="p-10">
      <h1>Supabase Test</h1>

      <pre>
        {JSON.stringify({ data, error }, null, 2)}
      </pre>
    </main>
  );
}