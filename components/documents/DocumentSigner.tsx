"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ScanFace, Fingerprint, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import FaceAuthCapture from "@/components/camera/FaceAuthCapture";
import Link from "next/link";

interface Props {
  documentId: string;
  faceDescriptor: number[] | null;
  faceImageUrl: string | null;
  hasWebauthn: boolean;
}

type Method = "none" | "face" | "fingerprint";

export function DocumentSigner({ documentId, faceDescriptor, faceImageUrl, hasWebauthn }: Props) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("none");
  const [fingerprintLoading, setFingerprintLoading] = useState(false);

  async function signWithFace(imageDataUrl: string) {
    try {
      const res = await fetch(`/api/documents/${documentId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "face", imageDataUrl }),
      });
      if (!res.ok) throw new Error("Signing failed");
      toast.success("Document signed with your face!");
      router.refresh();
    } catch {
      toast.error("Failed to sign document. Please try again.");
      setMethod("none");
    }
  }

  async function signWithFingerprint() {
    setFingerprintLoading(true);
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");

      const optRes = await fetch("/api/webauthn/auth-options", { method: "POST" });
      if (!optRes.ok) throw new Error("Could not get auth options");
      const options = await optRes.json();

      const credential = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch("/api/webauthn/verify-authentication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential),
      });
      const result = await verifyRes.json();
      if (!result.verified) throw new Error("Fingerprint authentication failed");

      const signRes = await fetch(`/api/documents/${documentId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "fingerprint" }),
      });
      if (!signRes.ok) throw new Error("Signing failed");

      toast.success("Document signed with fingerprint!");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Fingerprint signing failed");
    } finally {
      setFingerprintLoading(false);
    }
  }

  // Face scanning UI
  if (method === "face" && faceDescriptor) {
    return (
      <div className="space-y-4">
        {/* Show enrolled selfie for reference */}
        {faceImageUrl && (
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
            <img
              src={faceImageUrl}
              alt="Enrolled selfie"
              className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/40"
            />
            <div>
              <p className="text-white text-sm font-medium">Matching against your enrolled selfie</p>
              <p className="text-slate-400 text-xs">Look directly at the camera to match</p>
            </div>
            <ShieldCheck size={18} className="text-indigo-400 ml-auto shrink-0" />
          </div>
        )}

        <div className="flex justify-center">
          <FaceAuthCapture
            storedDescriptor={faceDescriptor}
            onSuccess={signWithFace}
            onFailure={() => {
              toast.error("Face did not match. Try again or use fingerprint.");
              setMethod("none");
            }}
          />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setMethod("none")}
          className="w-full text-slate-500 hover:text-slate-300">
          Cancel
        </Button>
      </div>
    );
  }

  // Method selection
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">Choose how to authenticate and sign:</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {faceDescriptor && (
          <button
            onClick={() => setMethod("face")}
            className="flex flex-col items-center gap-3 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl p-5 transition-colors group text-left"
          >
            <div className="flex items-center gap-3 w-full">
              {faceImageUrl ? (
                <img src={faceImageUrl} alt="Your face" className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500/40" />
              ) : (
                <ScanFace className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
              )}
              <div>
                <p className="text-white font-medium text-sm">Sign with face</p>
                <p className="text-slate-400 text-xs mt-0.5">Camera matches your enrolled selfie</p>
              </div>
            </div>
          </button>
        )}

        {hasWebauthn && (
          <button
            onClick={signWithFingerprint}
            disabled={fingerprintLoading}
            className="flex flex-col items-center gap-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-5 transition-colors group text-left disabled:opacity-50"
          >
            <div className="flex items-center gap-3 w-full">
              {fingerprintLoading
                ? <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                : <Fingerprint className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
              }
              <div>
                <p className="text-white font-medium text-sm">Sign with fingerprint</p>
                <p className="text-slate-400 text-xs mt-0.5">Device Touch ID / Face ID</p>
              </div>
            </div>
          </button>
        )}
      </div>

      {!faceDescriptor && !hasWebauthn && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center space-y-2">
          <p className="text-amber-400 font-medium text-sm">No biometrics enrolled yet</p>
          <p className="text-amber-400/70 text-xs">You need to enroll your face and fingerprint before you can sign documents.</p>
          <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-400 text-black font-medium mt-1">
            <Link href="/onboarding">Complete biometric setup</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
