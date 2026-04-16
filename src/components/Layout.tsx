import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const nav = [
    { to: "/", label: "Stamp" },
    { to: "/verify", label: "Verify" },
  ];

  if (user) {
    nav.push({ to: "/my-timestamps", label: "My Timestamps" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            hashbin<span className="text-muted-foreground">.net</span>
          </Link>
          <nav className="flex items-center gap-4">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`text-sm transition-colors hover:text-foreground ${
                  location.pathname === n.to
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {n.label}
              </Link>
            ))}
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => supabase.auth.signOut()}
              >
                Sign out
              </Button>
            ) : (
              <Link to="/auth">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12">{children}</main>
    </div>
  );
}
