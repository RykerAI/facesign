import { redirect } from "next/navigation";
import { Fingerprint, ScanFace, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account and biometric credentials</p>
      </div>

      {/* Account */}
      <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-400" /> Account
        </h2>
        <div className="grid gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Email</span>
            <span className="text-white">{user.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Full name</span>
            <span className="text-white">{profile?.full_name || "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Member since</span>
            <span className="text-white">{new Date(user.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </section>

      {/* Biometrics */}
      <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <ScanFace size={16} className="text-indigo-400" /> Biometric credentials
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div className="flex items-center gap-3">
              <ScanFace size={20} className={profile?.liveness_verified ? "text-green-400" : "text-slate-500"} />
              <div>
                <p className="text-white text-sm font-medium">Face biometric</p>
                <p className={`text-xs mt-0.5 ${profile?.liveness_verified ? "text-green-400" : "text-slate-500"}`}>
                  {profile?.liveness_verified ? "Enrolled — liveness verified" : "Not enrolled"}
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="border-white/20 text-slate-300 hover:bg-white/10">
              <Link href="/onboarding">
                {profile?.liveness_verified ? "Re-enroll" : "Enroll"}
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Fingerprint size={20} className={profile?.webauthn_credential_id ? "text-green-400" : "text-slate-500"} />
              <div>
                <p className="text-white text-sm font-medium">Fingerprint / Face ID</p>
                <p className={`text-xs mt-0.5 ${profile?.webauthn_credential_id ? "text-green-400" : "text-slate-500"}`}>
                  {profile?.webauthn_credential_id ? "Enrolled" : "Not enrolled"}
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="border-white/20 text-slate-300 hover:bg-white/10">
              <Link href="/onboarding">
                {profile?.webauthn_credential_id ? "Re-enroll" : "Enroll"}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
