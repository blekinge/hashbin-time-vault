import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatFileSize } from "@/lib/hash";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const PAGE_SIZE = 20;

export default function ExplorePage() {
  const [timestamps, setTimestamps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    load();
  }, [page]);

  async function load() {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE;

    const { data, error } = await supabase
      .from("timestamps_public")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error && data) {
      setHasMore(data.length > PAGE_SIZE);
      setTimestamps(data.slice(0, PAGE_SIZE));
    }
    setLoading(false);
  }

  const filtered = search
    ? timestamps.filter((t) => {
        const s = search.toLowerCase();
        return (
          t.hash?.startsWith(s) ||
          t.hash_md5?.startsWith(s) ||
          t.hash_sha1?.startsWith(s) ||
          t.hash_sha512?.startsWith(s)
        );
      })
    : timestamps;

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Explore timestamps</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse recent public timestamps. All records are anonymized.
          </p>
        </div>

        <Input
          placeholder="Filter by hash prefix…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="font-mono text-sm"
        />

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timestamps found.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <Link
                key={t.id}
                to={`/verify?hash=${t.hash}`}
                className="block rounded-lg border border-border p-4 text-sm space-y-1 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="break-all font-mono text-xs truncate flex-1">{t.hash}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatFileSize(t.file_size ?? 0)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleString()}
                </p>
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Previous
          </Button>
          <span className="text-xs text-muted-foreground">Page {page + 1}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </Button>
        </div>
      </div>
    </Layout>
  );
}
