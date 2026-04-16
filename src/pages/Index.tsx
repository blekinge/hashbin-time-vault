import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hashFile, formatFileSize } from "@/lib/hash";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

export default function StampPage() {
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [hashing, setHashing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [includeFileName, setIncludeFileName] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const onDrop = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setHashing(true);
    try {
      const h = await hashFile(f);
      setHash(h);
    } catch {
      toast.error("Failed to hash file");
    } finally {
      setHashing(false);
    }
  }, []);

  const submit = async () => {
    if (!hash || !file) return;
    setSubmitting(true);
    try {
      const body: any = {
        hash,
        file_size: file.size,
      };
      if (includeFileName) body.file_name = file.name;
      if (user) body.user_id = user.id;

      const { data, error } = await supabase.functions.invoke("sign-timestamp", {
        body,
      });

      if (error) throw error;
      setResult(data);
      toast.success("Timestamp created!");
    } catch (err: any) {
      toast.error(err.message || "Failed to create timestamp");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timestamp a file</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hash your file locally, then store a signed timestamp proving it existed at this moment.
          </p>
        </div>

        {!result ? (
          <div className="space-y-6">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border px-6 py-12 transition-colors hover:border-muted-foreground/50">
              <span className="text-sm text-muted-foreground">
                {file ? file.name : "Click to select a file"}
              </span>
              <input type="file" className="hidden" onChange={onDrop} />
            </label>

            {hash && file && (
              <div className="space-y-4 rounded-lg border border-border p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">SHA-256 Hash</p>
                  <p className="mt-1 break-all font-mono text-sm">{hash}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">File Size</p>
                  <p className="mt-1 text-sm">{formatFileSize(file.size)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="include-name"
                    checked={includeFileName}
                    onCheckedChange={setIncludeFileName}
                  />
                  <Label htmlFor="include-name" className="text-sm">
                    Include file name in timestamp record
                  </Label>
                </div>
                <Button onClick={submit} disabled={submitting || hashing} className="w-full">
                  {submitting ? "Creating timestamp…" : "Create Timestamp"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 rounded-lg border border-border p-4">
            <h2 className="font-medium">Timestamp created ✓</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Hash:</span> <span className="break-all font-mono">{result.hash}</span></p>
              <p><span className="text-muted-foreground">Recorded at:</span> {new Date(result.created_at).toLocaleString()}</p>
              <p><span className="text-muted-foreground">File size:</span> {formatFileSize(result.file_size)}</p>
              {result.file_name && <p><span className="text-muted-foreground">File name:</span> {result.file_name}</p>}
              <p><span className="text-muted-foreground">Signature:</span> <span className="break-all font-mono text-xs">{result.server_signature}</span></p>
            </div>
            <Button variant="outline" onClick={() => { setFile(null); setHash(null); setResult(null); }}>
              Timestamp another file
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
