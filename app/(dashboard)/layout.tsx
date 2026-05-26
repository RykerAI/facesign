import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { FloatingOrbs } from "@/components/ui/FloatingOrbs";
import { ParticleNetwork } from "@/components/ui/ParticleNetwork";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, face_image_url, liveness_verified")
    .eq("id", user.id)
    .single();

  return (
    <div className="relative min-h-screen bg-slate-950 overflow-x-hidden">
      {/* Subtle animated background */}
      <FloatingOrbs subtle />
      <ParticleNetwork count={50} maxDist={110} />

      {/* Subtle dot grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(99,102,241,0.9) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          animation: "grid-drift 18s linear infinite",
        }}
      />

      {/* Top nav */}
      <header className="relative z-20 border-b border-white/5 sticky top-0">
        {/* Nav glass */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" />

        {/* Animated top border line */}
        <div
          className="absolute top-0 inset-x-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(99,102,241,0.6), rgba(139,92,246,0.6), rgba(59,130,246,0.6), transparent)",
            backgroundSize: "200% auto",
            animation: "shimmer 4s linear infinite",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/40 transition-shadow"
              style={{ animation: "glow-pulse 4s ease-in-out infinite" }}
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            </div>
            <span
              className="font-bold text-white"
              style={{
                background: "linear-gradient(90deg, #fff, #a78bfa, #fff)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "shimmer 6s linear infinite",
              }}
            >
              FaceSign
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            {[
              { href: "/dashboard", label: "Dashboard" },
              { href: "/documents", label: "Documents" },
              { href: "/settings", label: "Settings" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {!profile?.liveness_verified && (
              <Link
                href="/onboarding"
                className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-full hover:bg-amber-500/20 transition-colors"
              >
                Complete biometric setup
              </Link>
            )}
            <span className="text-slate-400 text-sm hidden sm:block">
              {profile?.full_name || user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
