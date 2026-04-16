import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { hashFileAll, formatFileSize } from "@/lib/hash";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function detectAlgorithm(hash: string): string | null {
  if (/^[a-f0-9]{32}$/.test(hash)) return "MD5";
  if (/^[a-f0-9]{40}$/.test(hash)) return "SHA-1";
  if (/^[a-f0-9]{64}$/.test(hash)) return "SHA-256";
  if (/^[a-f0-9]{128}$/.test(hash)) return "SHA-512";
  return null;
}

export default function VerifyPage() {
  const [searchParams] = useSearchParams();
  const initialHash = searchParams.get("hash") || "";
  const [mode, setMode] = useState<"file" | "hash">(initialHash ? "hash" : "file");
  const [file, setFile] = useState<File | null>(null);
  const [hashInput, setHashInput] = useState(initialHash);
  const [hashing, setHashing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const search = useCallback(async (hash: string) => {
    if (!hash) return;
    setSearching(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api/verify?hash=${encodeURIComponent(hash.toLowerCase())}`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data || []);
      if (!data?.length) toast.info("No timestamps found for this hash");
    } catch (err: any) {
      toast.error(err.message || "Search failed");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (initialHash && detectAlgorithm(initialHash.toLowerCase())) {
      search(initialHash);
    }
  }, [initialHash]);

  const onFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResults(null);
    setHashing(true);
    try {
      const hashes = await hashFileAll(f);
      // Search by SHA-256 (primary)
      setHashInput(hashes.sha256);
      await search(hashes.sha256);
    } catch {
      toast.error("Failed to hash file");
    } finally {
      setHashing(false);
    }
  }, []);

  const detectedAlg = hashInput ? detectAlgorithm(hashInput.toLowerCase().trim()) : null;

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Verify a timestamp</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Look up when a file was first timestamped. Supports MD5, SHA-1, SHA-256, and SHA-512.
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
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Paste any hash (MD5, SHA-1, SHA-256, SHA-512)…"
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                onClick={() => search(hashInput.trim())}
                disabled={!hashInput.trim() || searching || !detectedAlg}
              >
                {searching ? "Searching…" : "Search"}
              </Button>
            </div>
            {hashInput.trim() && (
              <p className="text-xs text-muted-foreground">
                {detectedAlg
                  ? `Detected: ${detectedAlg}`
                  : "Unrecognized hash format"}
              </p>
            )}
          </div>
        )}

        {results !== null && (
          <div className="space-y-3">
            {results.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = `${window.location.origin}/verify?hash=${hashInput.toLowerCase().trim()}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Verification link copied!");
                }}
              >
                Copy shareable link
              </Button>
            )}
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">No timestamps found.</p>
            ) : (
              results.map((r: any) => (
                <div key={r.id} className="rounded-lg border border-border p-4 text-sm space-y-2">
                  <p><span className="text-muted-foreground">Recorded at:</span> {new Date(r.created_at).toLocaleString()}</p>
                  <p><span className="text-muted-foreground">File size:</span> {formatFileSize(r.file_size)}</p>
                  <div className="space-y-1 mt-2">
                    {r.hash && (
                      <p className="text-xs">
                        <span className="text-muted-foreground font-medium">SHA-256</span>{" "}
                        <span className="break-all font-mono">{r.hash}</span>
                      </p>
                    )}
                    {r.hash_sha512 && (
                      <p className="text-xs">
                        <span className="text-muted-foreground font-medium">SHA-512</span>{" "}
                        <span className="break-all font-mono">{r.hash_sha512}</span>
                      </p>
                    )}
                    {r.hash_sha1 && (
                      <p className="text-xs">
                        <span className="text-muted-foreground font-medium">SHA-1</span>{" "}
                        <span className="break-all font-mono">{r.hash_sha1}</span>
                      </p>
                    )}
                    {r.hash_md5 && (
                      <p className="text-xs">
                        <span className="text-muted-foreground font-medium">MD5</span>{" "}
                        <span className="break-all font-mono">{r.hash_md5}</span>
                      </p>
                    )}
                  </div>
                  <p className="text-xs"><span className="text-muted-foreground">Signature:</span> <span className="break-all font-mono">{r.server_signature}</span></p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
