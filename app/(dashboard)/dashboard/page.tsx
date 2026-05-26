import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, CheckCircle, Clock, Fingerprint, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Document } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: documents }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const docs = (documents ?? []) as Document[];
  const pending = docs.filter((d) => d.status === "pending").length;
  const signed = docs.filter((d) => d.status === "signed").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-slate-400 mt-1">Here&apos;s your biometric signing overview</p>
        </div>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white">
          <Link href="/documents/new">
            <Plus size={16} className="mr-2" /> New document
          </Link>
        </Button>
      </div>

      {/* Biometric status banner */}
      {!profile?.liveness_verified && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-amber-400 font-medium">Biometric setup incomplete</p>
            <p className="text-amber-400/70 text-sm mt-0.5">
              Enroll your face and fingerprint to start signing documents
            </p>
          </div>
          <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-400 text-black font-medium">
            <Link href="/onboarding">Complete setup</Link>
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stat card with glow */}
        {[
          { icon: FileText, label: "Total documents", value: docs.length, color: "indigo" },
          { icon: Clock, label: "Pending signatures", value: pending, color: "amber" },
          { icon: CheckCircle, label: "Signed", value: signed, color: "green" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="relative rounded-xl p-px overflow-hidden group"
            style={{
              background: `linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.15), transparent)`,
            }}
          >
            <div className="bg-slate-900/80 backdrop-blur rounded-[calc(0.75rem-1px)] p-5 h-full">
              <div className={`inline-flex items-center gap-1.5 text-xs font-medium mb-3 ${
                color === "green" ? "text-green-400" : color === "amber" ? "text-amber-400" : "text-indigo-400"
              }`}>
                <Icon size={13} /> {label}
              </div>
              <p
                className="text-4xl font-extrabold text-white tabular-nums"
                style={{
                  background: color === "green"
                    ? "linear-gradient(135deg, #4ade80, #22d3ee)"
                    : color === "amber"
                    ? "linear-gradient(135deg, #fbbf24, #f97316)"
                    : "linear-gradient(135deg, #818cf8, #a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Biometric status */}
      <Card className="bg-white/5 border-white/10 text-white">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Biometric status</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              profile?.liveness_verified ? "bg-green-500/20" : "bg-white/5"
            }`}>
              <svg className={`w-5 h-5 ${profile?.liveness_verified ? "text-green-400" : "text-slate-500"}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-sm">Face biometric</p>
              <p className={`text-xs mt-0.5 ${profile?.liveness_verified ? "text-green-400" : "text-slate-500"}`}>
                {profile?.liveness_verified ? "Enrolled & verified" : "Not enrolled"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              profile?.webauthn_credential_id ? "bg-green-500/20" : "bg-white/5"
            }`}>
              <Fingerprint className={`w-5 h-5 ${
                profile?.webauthn_credential_id ? "text-green-400" : "text-slate-500"
              }`} />
            </div>
            <div>
              <p className="font-medium text-sm">Fingerprint / Face ID</p>
              <p className={`text-xs mt-0.5 ${
                profile?.webauthn_credential_id ? "text-green-400" : "text-slate-500"
              }`}>
                {profile?.webauthn_credential_id ? "Enrolled" : "Not enrolled"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent documents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent documents</h2>
          <Link href="/documents" className="text-sm text-indigo-400 hover:text-indigo-300">
            View all
          </Link>
        </div>

        {docs.length === 0 ? (
          <div className="bg-white/5 border border-white/10 border-dashed rounded-xl p-12 text-center">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No documents yet</p>
            <Button asChild size="sm" className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white">
              <Link href="/documents/new">Create your first document</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
                  <div>
                    <p className="text-white font-medium text-sm">{doc.title}</p>
                    <p className="text-slate-500 text-xs">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge
                  className={doc.status === "signed"
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  }
                >
                  {doc.status === "signed" ? "Signed" : "Pending"}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
