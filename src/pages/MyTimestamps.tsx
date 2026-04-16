import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatFileSize } from "@/lib/hash";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

export default function MyTimestampsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        navigate("/auth");
        return;
      }
      setUser(data.user);
      fetch(
        `${API_BASE}/my-timestamps`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ""}`,
          },
        }
      )
        .then((r) => r.json())
        .then((rows) => {
          setRecords(Array.isArray(rows) ? rows : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [navigate]);

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Timestamps</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Files you've timestamped while signed in.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timestamps yet.</p>
        ) : (
          <div className="space-y-3">
            {records.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-4 text-sm space-y-1">
                <p className="break-all font-mono text-xs">{r.hash_sha256}</p>
                <p><span className="text-muted-foreground">Recorded:</span> {new Date(r.created_at).toLocaleString()}</p>
                <p><span className="text-muted-foreground">File size:</span> {formatFileSize(r.file_size)}</p>
                {r.file_name && <p><span className="text-muted-foreground">File name:</span> {r.file_name}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
