"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ScanFace,
  Fingerprint,
  Loader2,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import FaceAuthCapture from "@/components/camera/FaceAuthCapture";
import LivenessCapture from "@/components/camera/LivenessCapture";
import Link from "next/link";

interface Props {
  documentId: string;
  faceDescriptor: number[] | null;
  faceImageUrl: string | null;
  hasWebauthn: boolean;
}

type Method = "none" | "face" | "fingerprint";
type FaceStep = 1 | 2 | 3;

const STEP_LABELS: Record<FaceStep, string> = {
  1: "Liveness",
  2: "Face Match",
  3: "Sign",
};

export function DocumentSigner({
  documentId,
  faceDescriptor,
  faceImageUrl,
  hasWebauthn,
}: Props) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("none");
  const [fingerprintLoading, setFingerprintLoading] = useState(false);

  // Face signing step state
  const [faceStep, setFaceStep] = useState<FaceStep>(1);
  const [livenessKey, setLivenessKey] = useState(0);
  const [faceMatchKey, setFaceMatchKey] = useState(0);
  const [stepError, setStepError] = useState<{ step: FaceStep; message: string } | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState("");

  function resetFaceFlow() {
    setFaceStep(1);
    setStepError(null);
    setCapturedImage(null);
    setSigning(false);
    setSignError("");
    setLivenessKey((k) => k + 1);
    setFaceMatchKey((k) => k + 1);
  }

  function cancelFaceFlow() {
    resetFaceFlow();
    setMethod("none");
  }

  const doSign = useCallback(
    async (imageDataUrl: string) => {
      setSigning(true);
      setSignError("");
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
        setSignError("Failed to sign document. Please try again.");
        setSigning(false);
      }
    },
    [documentId, router]
  );

  const handleFaceMatchSuccess = useCallback(
    async (imageDataUrl: string) => {
      setCapturedImage(imageDataUrl);
      setFaceStep(3);
      await doSign(imageDataUrl);
    },
    [doSign]
  );

  const handleFaceMatchFailure = useCallback(() => {
    setStepError({
      step: 2,
      message:
        "Face verification failed. Ensure good lighting and look directly at the camera.",
    });
  }, []);

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

  // ── Face signing flow ─────────────────────────────────────────────────────
  if (method === "face" && faceDescriptor) {
    const steps: FaceStep[] = [1, 2, 3];

    const stepIndicator = (
      <div className="flex items-center justify-center gap-1 mb-5">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-1">
            <div
              className={`flex items-center gap-1.5 text-xs font-medium ${
                faceStep > step
                  ? "text-green-400"
                  : faceStep === step
                  ? "text-white"
                  : "text-slate-500"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border shrink-0 ${
                  faceStep > step
                    ? "bg-green-500/20 border-green-500 text-green-400"
                    : faceStep === step
                    ? "bg-indigo-600 border-indigo-400 text-white"
                    : "bg-white/5 border-white/20 text-slate-500"
                }`}
              >
                {faceStep > step ? <CheckCircle size={12} /> : step}
              </div>
              <span>{STEP_LABELS[step]}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-px w-6 mx-1 ${
                  faceStep > step ? "bg-green-500/50" : "bg-white/10"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );

    return (
      <div className="space-y-4">
        {stepIndicator}

        {/* Step 1 — Liveness */}
        {faceStep === 1 && (
          stepError?.step === 1 ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-300 text-xs">{stepError.message}</p>
              </div>
              <Button
                onClick={() => {
                  setStepError(null);
                  setLivenessKey((k) => k + 1);
                }}
                size="sm"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                <RefreshCw size={14} className="mr-2" /> Retry liveness check
              </Button>
            </div>
          ) : (
            <div className="flex justify-center">
              <LivenessCapture
                key={livenessKey}
                onSuccess={() => setFaceStep(2)}
                onError={(msg) => setStepError({ step: 1, message: msg })}
              />
            </div>
          )
        )}

        {/* Step 2 — Face Match */}
        {faceStep === 2 && (
          <>
            {faceImageUrl && !stepError && (
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                <img
                  src={faceImageUrl}
                  alt="Enrolled selfie"
                  className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/40"
                />
                <div>
                  <p className="text-white text-sm font-medium">
                    Matching against your enrolled selfie
                  </p>
                  <p className="text-slate-400 text-xs">
                    Look directly at the camera to match
                  </p>
                </div>
                <ShieldCheck size={18} className="text-indigo-400 ml-auto shrink-0" />
              </div>
            )}
            {stepError?.step === 2 ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-red-300 text-xs">{stepError.message}</p>
                </div>
                <Button
                  onClick={() => {
                    setStepError(null);
                    setFaceMatchKey((k) => k + 1);
                  }}
                  size="sm"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <RefreshCw size={14} className="mr-2" /> Retry face match
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStepError(null);
                    setFaceStep(1);
                    setLivenessKey((k) => k + 1);
                  }}
                  className="w-full text-slate-500 hover:text-slate-300 text-xs"
                >
                  Redo liveness check (step 1)
                </Button>
              </div>
            ) : (
              <div className="flex justify-center">
                <FaceAuthCapture
                  key={faceMatchKey}
                  storedDescriptor={faceDescriptor}
                  onSuccess={handleFaceMatchSuccess}
                  onFailure={handleFaceMatchFailure}
                />
              </div>
            )}
          </>
        )}

        {/* Step 3 — Signing */}
        {faceStep === 3 && (
          <div className="space-y-4">
            {signing && !signError && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="text-indigo-400 animate-spin w-10 h-10" />
                <p className="text-white font-medium">Signing document…</p>
              </div>
            )}
            {signError && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-red-300 text-xs">{signError}</p>
                </div>
                <Button
                  onClick={() => capturedImage && doSign(capturedImage)}
                  size="sm"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
                  disabled={!capturedImage}
                >
                  <RefreshCw size={14} className="mr-2" /> Retry signing
                </Button>
              </div>
            )}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={cancelFaceFlow}
          className="w-full text-slate-500 hover:text-slate-300"
        >
          Cancel
        </Button>
      </div>
    );
  }

  // ── Method selection ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">Choose how to authenticate and sign:</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {faceDescriptor && (
          <button
            onClick={() => { resetFaceFlow(); setMethod("face"); }}
            className="flex flex-col items-center gap-3 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl p-5 transition-colors group text-left"
          >
            <div className="flex items-center gap-3 w-full">
              {faceImageUrl ? (
                <img
                  src={faceImageUrl}
                  alt="Your face"
                  className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500/40"
                />
              ) : (
                <ScanFace className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
              )}
              <div>
                <p className="text-white font-medium text-sm">Sign with face</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  Camera matches your enrolled selfie
                </p>
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
              {fingerprintLoading ? (
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              ) : (
                <Fingerprint className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
              )}
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
          <p className="text-amber-400/70 text-xs">
            You need to enroll your face and fingerprint before you can sign documents.
          </p>
          <Button
            asChild
            size="sm"
            className="bg-amber-500 hover:bg-amber-400 text-black font-medium mt-1"
          >
            <Link href="/onboarding">Complete biometric setup</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
