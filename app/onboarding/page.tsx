"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Fingerprint, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import LivenessCapture, { LivenessResult } from "@/components/camera/LivenessCapture";
import { createClient } from "@/lib/supabase/client";
import { FloatingOrbs } from "@/components/ui/FloatingOrbs";
import { ParticleNetwork } from "@/components/ui/ParticleNetwork";
import { BiometricConsent } from "@/components/camera/BiometricConsent";

type Step = "intro" | "consent" | "face" | "fingerprint" | "done";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>("intro");
  const [saving, setSaving] = useState(false);
  const [fingerprintLoading, setFingerprintLoading] = useState(false);
  const [fingerprintDone, setFingerprintDone] = useState(false);

  async function handleLivenessSuccess(result: LivenessResult) {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Convert dataURL to blob
      const res = await fetch(result.imageDataUrl);
      const blob = await res.blob();
      const filePath = `${user.id}/face.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("faces")
        .upload(filePath, blob, { upsert: true, contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("faces")
        .getPublicUrl(filePath);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          face_image_url: urlData.publicUrl,
          face_descriptor: result.descriptor,
          liveness_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (profileError) throw profileError;

      toast.success("Face biometric enrolled successfully!");
      setStep("fingerprint");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save face data");
    } finally {
      setSaving(false);
    }
  }

  async function enrollFingerprint() {
    setFingerprintLoading(true);
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");

      const optRes = await fetch("/api/webauthn/register-options", { method: "POST" });
      if (!optRes.ok) throw new Error("Could not get registration options");
      const options = await optRes.json();

      const credential = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch("/api/webauthn/verify-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential),
      });
      const result = await verifyRes.json();
      if (!result.verified) throw new Error("Fingerprint registration failed");

      setFingerprintDone(true);
      toast.success("Fingerprint / Face ID enrolled!");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        toast.info("Fingerprint enrollment skipped");
      } else {
        toast.error(err instanceof Error ? err.message : "Fingerprint enrollment failed");
      }
    } finally {
      setFingerprintLoading(false);
    }
  }

  function finish() {
    router.push("/dashboard");
  }

  return (
    <div className="relative min-h-screen bg-slate-950 overflow-hidden flex items-center justify-center p-4">
      <FloatingOrbs />
      <ParticleNetwork count={70} />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.8) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          animation: "grid-drift 14s linear infinite",
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(2,6,23,0.7)_100%)]" />
      <div className="relative z-10 w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {(["intro", "consent", "face", "fingerprint", "done"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s
                    ? "bg-white text-black"
                    : ["consent", "face", "fingerprint", "done"].indexOf(step) > i
                    ? "bg-green-500 text-white"
                    : "bg-white/10 text-slate-400"
                }`}
              >
                {["consent", "face", "fingerprint", "done"].indexOf(step) > i ? (
                  <CheckCircle size={16} />
                ) : (
                  i + 1
                )}
              </div>
              {i < 4 && <div className="flex-1 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        <div
          className="relative rounded-2xl p-px"
          style={{
            background: "conic-gradient(from var(--angle), rgba(99,102,241,0.5), rgba(139,92,246,0.5), rgba(59,130,246,0.5), rgba(99,102,241,0.5))",
            animation: "rotate-border 6s linear infinite",
          }}
        >
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-[calc(1rem-1px)] p-8">
          {/* INTRO */}
          {step === "intro" && (
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-2">
                <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Set up your biometrics</h1>
                <p className="text-slate-400 mt-2">
                  FaceSign uses your face and fingerprint to authenticate document signatures.
                  Your biometric data is encrypted and stored securely.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="text-indigo-400 mb-2">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                    </svg>
                  </div>
                  <p className="text-white font-medium text-sm">Face Biometric</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Liveness check ensures you are a real person, not a photo
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <Fingerprint className="text-indigo-400 w-6 h-6 mb-2" />
                  <p className="text-white font-medium text-sm">Fingerprint / Face ID</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Device biometric for fast, secure authentication
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setStep("consent")}
                className="w-full bg-white text-black hover:bg-white/90 font-semibold"
              >
                Get started <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          )}

          {/* BIOMETRIC CONSENT */}
          {step === "consent" && (
            <BiometricConsent
              onAccept={() => setStep("face")}
              onDecline={() => setStep("intro")}
            />
          )}

          {/* FACE CAPTURE */}
          {step === "face" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">Enroll your face</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Complete the liveness challenges to verify you are a real person
                </p>
              </div>
              {saving ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin text-indigo-400 w-10 h-10" />
                  <span className="ml-3 text-slate-300">Saving biometric data…</span>
                </div>
              ) : (
                <LivenessCapture
                  onSuccess={handleLivenessSuccess}
                  onError={(msg) => toast.error(msg)}
                />
              )}
            </div>
          )}

          {/* FINGERPRINT */}
          {step === "fingerprint" && (
            <div className="space-y-6 text-center">
              <div>
                <h2 className="text-xl font-bold text-white">Add fingerprint / Face ID</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Register your device biometric for faster sign-in and document signing
                </p>
              </div>

              <div className="flex items-center justify-center py-8">
                <div
                  className={`w-28 h-28 rounded-full flex items-center justify-center border-4 transition-colors ${
                    fingerprintDone ? "border-green-500 bg-green-500/10" : "border-indigo-500/40 bg-indigo-500/5"
                  }`}
                >
                  {fingerprintDone ? (
                    <CheckCircle className="w-12 h-12 text-green-400" />
                  ) : (
                    <Fingerprint className="w-12 h-12 text-indigo-400" />
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {!fingerprintDone && (
                  <Button
                    onClick={enrollFingerprint}
                    disabled={fingerprintLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    {fingerprintLoading ? (
                      <Loader2 className="animate-spin mr-2" size={16} />
                    ) : (
                      <Fingerprint size={16} className="mr-2" />
                    )}
                    Enroll fingerprint / Face ID
                  </Button>
                )}
                <Button
                  onClick={finish}
                  variant={fingerprintDone ? "default" : "ghost"}
                  className={fingerprintDone
                    ? "w-full bg-green-600 hover:bg-green-500 text-white"
                    : "w-full text-slate-400 hover:text-white"}
                >
                  {fingerprintDone ? (
                    <>Continue to dashboard <ArrowRight size={16} className="ml-2" /></>
                  ) : (
                    "Skip for now"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
        </div>{/* gradient border wrapper */}
      </div>
    </div>
  );
}
