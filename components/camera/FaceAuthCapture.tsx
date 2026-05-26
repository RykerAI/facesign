"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { CheckCircle, XCircle, Loader2, ScanFace, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  loadModels,
  detectFaceWithDescriptor,
  compareFaceDescriptors,
  arrayToDescriptor,
} from "@/lib/face/detection";

interface Props {
  storedDescriptor: number[];
  onSuccess: (imageDataUrl: string) => void;
  onFailure?: () => void;
  matchThreshold?: number;
}

type Phase = "loading" | "scanning" | "success" | "fail" | "error";

const SCAN_INTERVAL_MS = 150;
const NO_FACE_TIMEOUT_MS = 20000;

export default function FaceAuthCapture({
  storedDescriptor,
  onSuccess,
  onFailure,
  matchThreshold = 0.62,
}: Props) {
  const webcamRef = useRef<Webcam>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noFaceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [distance, setDistance] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [attempts, setAttempts] = useState(0);

  const stopScan = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (noFaceTimer.current) { clearTimeout(noFaceTimer.current); noFaceTimer.current = null; }
  }, []);

  useEffect(() => {
    loadModels()
      .then(() => setPhase("scanning"))
      .catch(() => {
        setErrorMsg("Failed to load face recognition models. Check your connection.");
        setPhase("error");
      });
    return () => stopScan();
  }, [stopScan]);

  useEffect(() => {
    if (phase !== "scanning") return;
    const stored = arrayToDescriptor(storedDescriptor);

    // Timeout if no face detected for 20 seconds
    noFaceTimer.current = setTimeout(() => {
      if (distance === null) {
        stopScan();
        setErrorMsg("No face detected. Ensure good lighting and face the camera directly.");
        setPhase("fail");
      }
    }, NO_FACE_TIMEOUT_MS);

    intervalRef.current = setInterval(async () => {
      const video = webcamRef.current?.video;
      if (!video || video.readyState < 2) return;

      try {
        const result = await detectFaceWithDescriptor(video);
        if (!result) return;

        const dist = compareFaceDescriptors(result.descriptor, stored);
        setDistance(dist);

        if (dist <= matchThreshold) {
          stopScan();
          setPhase("success");
          const img = webcamRef.current!.getScreenshot()!;
          onSuccess(img);
        }
      } catch {
        // Transient detection error — keep scanning
      }
    }, SCAN_INTERVAL_MS);

    return () => stopScan();
  }, [phase, storedDescriptor, matchThreshold, onSuccess, stopScan, distance]);

  function retry() {
    setDistance(null);
    setAttempts((n) => n + 1);
    setPhase("scanning");
  }

  function fail() {
    stopScan();
    setPhase("fail");
    onFailure?.();
  }

  const matchPct = distance !== null
    ? Math.round(Math.max(0, (1 - distance / matchThreshold)) * 100)
    : null;

  const isClose = distance !== null && distance < matchThreshold * 1.3;

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Camera circle */}
      <div className="relative w-64 h-64">
        <div className={`absolute inset-0 rounded-full overflow-hidden border-4 transition-colors duration-300 ${
          phase === "success" ? "border-green-500" :
          phase === "fail" || phase === "error" ? "border-red-500" :
          isClose ? "border-yellow-400 animate-pulse" :
          phase === "scanning" ? "border-indigo-500" :
          "border-white/20"
        }`}>
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.92}
            videoConstraints={{ facingMode: "user", width: 480, height: 480 }}
            className="w-full h-full object-cover scale-x-[-1]"
          />
        </div>

        {phase === "success" && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/30 rounded-full">
            <CheckCircle className="text-green-400 w-14 h-14" />
          </div>
        )}
        {(phase === "fail" || phase === "error") && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-full">
            <XCircle className="text-red-400 w-14 h-14" />
          </div>
        )}
        {phase === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="text-white w-10 h-10 animate-spin" />
          </div>
        )}

        {/* Scanning overlay */}
        {phase === "scanning" && (
          <div className="absolute inset-0 rounded-full pointer-events-none overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-[scan_2s_linear_infinite]" />
          </div>
        )}
      </div>

      {/* Match confidence bar */}
      {phase === "scanning" && matchPct !== null && (
        <div className="w-64 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Match confidence</span>
            <span className={matchPct > 70 ? "text-yellow-400 font-medium" : "text-slate-400"}>
              {matchPct}%
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                matchPct > 70 ? "bg-yellow-400" : matchPct > 40 ? "bg-indigo-500" : "bg-white/20"
              }`}
              style={{ width: `${matchPct}%` }}
            />
          </div>
          {isClose && (
            <p className="text-yellow-400 text-xs text-center animate-pulse">Almost there — hold still</p>
          )}
        </div>
      )}

      {/* Status text */}
      <div className="text-center space-y-3 w-64">
        {phase === "loading" && (
          <p className="text-slate-400 text-sm flex items-center gap-2 justify-center">
            <Loader2 size={14} className="animate-spin" /> Loading face recognition…
          </p>
        )}
        {phase === "scanning" && (
          <div className="space-y-2">
            <p className="text-white font-medium flex items-center gap-2 justify-center">
              <ScanFace size={16} className="text-indigo-400 animate-pulse" />
              Scanning — look directly at the camera
            </p>
            <p className="text-slate-500 text-xs">
              Ensure your face is well lit and centred
            </p>
            <Button variant="ghost" size="sm" onClick={fail}
              className="text-slate-500 hover:text-red-400 text-xs w-full">
              Cancel
            </Button>
          </div>
        )}
        {phase === "success" && (
          <p className="text-green-400 font-semibold">Identity verified — signing…</p>
        )}
        {(phase === "fail" || phase === "error") && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-left">
              <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-300 text-xs">
                {errorMsg || "Face did not match your enrolled selfie. Ensure good lighting and look directly at the camera."}
              </p>
            </div>
            {attempts < 3 && (
              <Button onClick={retry} size="sm"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white">
                Try again {attempts > 0 ? `(${3 - attempts} left)` : ""}
              </Button>
            )}
            {attempts >= 3 && (
              <p className="text-slate-500 text-xs">
                Too many failed attempts. Try signing with fingerprint instead.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
