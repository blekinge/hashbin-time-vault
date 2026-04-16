import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hashFileAll, formatFileSize } from "@/lib/hash";
import type { FileHashes } from "@/lib/hash";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface FileEntry {
  file: File;
  hashes: FileHashes | null;
  hashing: boolean;
  submitting: boolean;
  result: any | null;
  error: string | null;
}

export default function StampPage() {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [includeFileName, setIncludeFileName] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [dragging, setDragging] = useState(false);
  const dropRef = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const addFiles = useCallback(async (files: File[]) => {
    const newEntries: FileEntry[] = files.map((f) => ({
      file: f,
      hashes: null,
      hashing: true,
      submitting: false,
      result: null,
      error: null,
    }));

    setEntries((prev) => [...prev, ...newEntries]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const h = await hashFileAll(file);
        setEntries((prev) =>
          prev.map((e) =>
            e.file === file ? { ...e, hashes: h, hashing: false } : e
          )
        );
      } catch {
        setEntries((prev) =>
          prev.map((e) =>
            e.file === file
              ? { ...e, hashing: false, error: "Failed to hash" }
              : e
          )
        );
      }
    }
  }, []);

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length) addFiles(files);
      e.target.value = "";
    },
    [addFiles]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length) addFiles(files);
    },
    [addFiles]
  );

  const stampOne = async (entry: FileEntry) => {
    if (!entry.hashes) return;
    setEntries((prev) =>
      prev.map((e) => (e.file === entry.file ? { ...e, submitting: true } : e))
    );
    try {
      const body: any = {
        hash_sha256: entry.hashes.sha256,
        hash_md5: entry.hashes.md5,
        hash_sha1: entry.hashes.sha1,
        hash_sha512: entry.hashes.sha512,
        file_size: entry.file.size,
      };
      if (includeFileName) body.file_name = entry.file.name;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api/stamp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setEntries((prev) =>
        prev.map((e) =>
          e.file === entry.file
            ? { ...e, submitting: false, result: data }
            : e
        )
      );
    } catch (err: any) {
      setEntries((prev) =>
        prev.map((e) =>
          e.file === entry.file
            ? { ...e, submitting: false, error: err.message }
            : e
        )
      );
    }
  };

  const stampAll = async () => {
    const pending = entries.filter((e) => e.hashes && !e.result && !e.error);
    for (const entry of pending) {
      await stampOne(entry);
    }
    toast.success(`Timestamped ${pending.length} file${pending.length !== 1 ? "s" : ""}`);
  };

  const pendingEntries = entries.filter((e) => e.hashes && !e.result && !e.error);
  const allDone = entries.length > 0 && entries.every((e) => e.result || e.error);

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timestamp files</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hash your files locally (MD5, SHA-1, SHA-256, SHA-512), then store signed timestamps.
          </p>
        </div>

        <label
          ref={dropRef}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/50"
          }`}
        >
          <span className="text-sm text-muted-foreground">
            {dragging
              ? "Drop files here"
              : "Drag & drop files here, or click to select"}
          </span>
          <input
            type="file"
            className="hidden"
            multiple
            onChange={onFileInput}
          />
        </label>

        {entries.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  id="include-name"
                  checked={includeFileName}
                  onCheckedChange={setIncludeFileName}
                />
                <Label htmlFor="include-name" className="text-sm">
                  Include file names
                </Label>
              </div>
              {pendingEntries.length > 1 && (
                <Button onClick={stampAll} size="sm">
                  Stamp all ({pendingEntries.length})
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {entries.map((entry, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border p-4 text-sm space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium truncate">{entry.file.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatFileSize(entry.file.size)}
                    </span>
                  </div>

                  {entry.hashing && (
                    <p className="text-xs text-muted-foreground">Hashing…</p>
                  )}

                  {entry.hashes && !entry.result && !entry.error && (
                    <>
                      <div className="space-y-1">
                        {(["sha256", "sha512", "sha1", "md5"] as const).map((alg) => (
                          <p key={alg} className="text-xs">
                            <span className="text-muted-foreground uppercase font-medium w-14 inline-block">
                              {alg === "sha256" ? "SHA-256" : alg === "sha512" ? "SHA-512" : alg === "sha1" ? "SHA-1" : "MD5"}
                            </span>{" "}
                            <span className="break-all font-mono text-muted-foreground">
                              {entry.hashes![alg]}
                            </span>
                          </p>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => stampOne(entry)}
                        disabled={entry.submitting}
                        className="w-full"
                      >
                        {entry.submitting ? "Creating…" : "Create Timestamp"}
                      </Button>
                    </>
                  )}

                  {entry.result && (
                    <div className="space-y-1 text-xs">
                      <p className="font-medium text-primary">
                        ✓ Timestamped at{" "}
                        {new Date(entry.result.created_at).toLocaleString()}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Signature:</span>{" "}
                        <span className="break-all font-mono">
                          {entry.result.server_signature}
                        </span>
                      </p>
                    </div>
                  )}

                  {entry.error && (
                    <p className="text-xs text-destructive">{entry.error}</p>
                  )}
                </div>
              ))}
            </div>

            {allDone && (
              <Button
                variant="outline"
                onClick={() => setEntries([])}
                className="w-full"
              >
                Timestamp more files
              </Button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
