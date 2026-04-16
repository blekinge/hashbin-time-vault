import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Terminal, Download, FolderOpen } from "lucide-react";

const REPO_RAW = "https://raw.githubusercontent.com/blekinge/hashbin-time-vault/main/cli";

const codeBlocks = {
  install: `# Download and install
curl -sL ${REPO_RAW}/hashbin -o ~/.local/bin/hashbin
chmod +x ~/.local/bin/hashbin`,
  stamp: `# Stamp a file
hashbin stamp myfile.pdf

# Stamp multiple files, include file names
hashbin stamp *.jpg --include-name`,
  verify: `# Verify a file
hashbin verify myfile.pdf

# Verify a raw hash
hashbin verify e3b0c44298fc1c14...`,
  completionBash: `# Bash — load for current session
source <(curl -sL ${REPO_RAW}/hashbin-completion.bash)

# Or install permanently
sudo curl -sL ${REPO_RAW}/hashbin-completion.bash \\
  -o /etc/bash_completion.d/hashbin`,
  completionZsh: `# Zsh — install completion function
mkdir -p ~/.zsh/completions
curl -sL ${REPO_RAW}/_hashbin -o ~/.zsh/completions/_hashbin

# Add to ~/.zshrc (if not already):
# fpath=(~/.zsh/completions $fpath)
# autoload -Uz compinit; compinit`,
  nautilus: `# Install Nautilus right-click integration
mkdir -p ~/.local/share/nautilus/scripts
curl -sL ${REPO_RAW}/hashbin-nautilus-stamp.sh \\
  -o ~/.local/share/nautilus/scripts/"Hashbin Stamp"
chmod +x ~/.local/share/nautilus/scripts/"Hashbin Stamp"`,
  desktop: `# Install .desktop file (optional)
curl -sL ${REPO_RAW}/hashbin.desktop \\
  -o ~/.local/share/applications/hashbin.desktop
update-desktop-database ~/.local/share/applications/`,
};

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="relative">
      {label && (
        <span className="absolute -top-2.5 left-3 bg-muted px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      )}
      <pre className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function CLIPage() {
  return (
    <Layout>
      <div className="space-y-10">
        <div>
          <div className="flex items-center gap-3">
            <Terminal className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Linux CLI
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            A standalone command-line tool for hashbin.net. Zero dependencies
            beyond Python 3.8+.
          </p>
        </div>

        {/* Quick install */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Quick install
          </h2>
          <CodeBlock code={codeBlocks.install} />
          <p className="text-xs text-muted-foreground">
            Make sure <code className="text-foreground">~/.local/bin</code> is
            in your <code className="text-foreground">PATH</code>.
          </p>
        </section>

        {/* Usage */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Usage</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Stamp files</h3>
              <CodeBlock code={codeBlocks.stamp} />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Verify files</h3>
              <CodeBlock code={codeBlocks.verify} />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="rounded-lg border border-border bg-muted/30 p-6 space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">How it works</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">1. Local hashing</p>
              <p className="text-xs text-muted-foreground">
                Files are hashed on your machine using MD5, SHA-1, SHA-256, and
                SHA-512. Nothing leaves your computer except the hashes.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">2. Server timestamp</p>
              <p className="text-xs text-muted-foreground">
                The hashes and file size are sent to hashbin.net, which returns
                an HMAC-signed timestamp proving the file existed at that
                moment.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">3. Verify anytime</p>
              <p className="text-xs text-muted-foreground">
                Use <code>hashbin verify</code> to look up any file or hash and
                confirm when it was first timestamped.
              </p>
            </div>
          </div>
        </section>

        {/* GNOME integration */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight">
              GNOME integration
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Right-click any file in Nautilus to stamp it. Requires{" "}
            <code className="text-foreground">zenity</code> (installed by
            default on GNOME).
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Nautilus right-click script
              </h3>
              <CodeBlock code={codeBlocks.nautilus} />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Desktop file (optional)
              </h3>
              <CodeBlock code={codeBlocks.desktop} />
            </div>
          </div>
        </section>

        {/* Links */}
        <section className="flex flex-wrap gap-3">
          <a
            href="https://github.com/blekinge/hashbin-time-vault/tree/main/cli"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              View on GitHub
            </Button>
          </a>
          <a href={`${REPO_RAW}/hashbin`} download="hashbin">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download hashbin
            </Button>
          </a>
        </section>
      </div>
    </Layout>
  );
}
