import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hashFile, formatFileSize } from "@/lib/hash";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function VerifyPage() {
  const [mode, setMode] = useState<"file" | "hash">("file");
  const [file, setFile] = useState<File | null>(null);
  const [hashInput, setHashInput] = useState("");
  const [hashing, setHashing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const search = async (hash: string) => {
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("timestamps_public" as any)
        .select("*")
        .eq("hash", hash)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setResults(data || []);
      if (!data?.length) toast.info("No timestamps found for this hash");
    } catch (err: any) {
      toast.error(err.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const onFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResults(null);
    setHashing(true);
    try {
      const h = await hashFile(f);
      setHashInput(h);
      await search(h);
    } catch {
      toast.error("Failed to hash file");
    } finally {
      setHashing(false);
    }
  }, []);

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Verify a timestamp</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Look up when a file was first timestamped.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant={mode === "file" ? "default" : "outline"} size="sm" onClick={() => setMode("file")}>
            Upload file
          </Button>
          <Button variant={mode === "hash" ? "default" : "outline"} size="sm" onClick={() => setMode("hash")}>
            Paste hash
          </Button>
        </div>

        {mode === "file" ? (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border px-6 py-12 transition-colors hover:border-muted-foreground/50">
            <span className="text-sm text-muted-foreground">
              {file ? file.name : "Click to select a file"}
            </span>
            <input type="file" className="hidden" onChange={onFile} />
          </label>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Enter SHA-256 hash…"
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              className="font-mono text-sm"
            />
            <Button
              onClick={() => search(hashInput)}
              disabled={!hashInput || searching}
            >
              {searching ? "Searching…" : "Search"}
            </Button>
          </div>
        )}

        {results !== null && (
          <div className="space-y-3">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">No timestamps found.</p>
            ) : (
              results.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-4 text-sm space-y-1">
                  <p><span className="text-muted-foreground">Recorded at:</span> {new Date(r.created_at).toLocaleString()}</p>
                  <p><span className="text-muted-foreground">File size:</span> {formatFileSize(r.file_size)}</p>
                  {r.file_name && <p><span className="text-muted-foreground">File name:</span> {r.file_name}</p>}
                  <p><span className="text-muted-foreground">Signature:</span> <span className="break-all font-mono text-xs">{r.server_signature}</span></p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
