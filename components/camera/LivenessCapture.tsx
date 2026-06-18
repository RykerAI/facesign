"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { CheckCircle, AlertCircle, Loader2, Camera, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  loadModels,
  detectFaceWithLandmarks,
  detectFaceWithDescriptor,
  descriptorToArray,
} from "@/lib/face/detection";

export type LivenessResult = {
  imageDataUrl: string;
  descriptor: number[];
};

interface Props {
  onSuccess: (result: LivenessResult) => void;
  onError?: (msg: string) => void;
}

type Phase = "loading" | "error" | "align" | "capturing" | "done";

const DETECTION_MS = 150;

export default function LivenessCapture({ onSuccess, onError }: Props) {
  const webcamRef = useRef<Webcam>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [faceDetected, setFaceDetected] = useState(false);

  const stopLoop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    loadModels()
      .then(() => setPhase("align"))
      .catch(() => {
        const msg = "Failed to load face detection models. Check your internet connection and reload.";
        setErrorMsg(msg);
        setPhase("error");
        onError?.(msg);
      });
    return () => stopLoop();
  }, [stopLoop, onError]);

  // Continuously detect face so the border and button update live
  useEffect(() => {
    if (phase !== "align") return;
    intervalRef.current = setInterval(async () => {
      const video = webcamRef.current?.video;
      if (!video || video.readyState < 2) return;
      const result = await detectFaceWithLandmarks(video);
      setFaceDetected(!!result);
    }, DETECTION_MS);
    return () => stopLoop();
  }, [phase, stopLoop]);

  const capture = useCallback(async () => {
    setPhase("capturing");
    stopLoop();
    const video = webcamRef.current?.video;
    if (!video) {
      const msg = "Camera unavailable. Please allow camera access and try again.";
      setErrorMsg(msg);
      setPhase("error");
      return;
    }
    try {
      const result = await detectFaceWithDescriptor(video);
      if (!result) {
        setErrorMsg("Could not read your face. Try again in better lighting.");
        setPhase("error");
        return;
      }
      const descriptor = descriptorToArray(result.descriptor);
      if (descriptor.length !== 128) {
        setErrorMsg("Face descriptor invalid. Please retry.");
        setPhase("error");
        return;
      }
      const imageDataUrl = webcamRef.current!.getScreenshot()!;
      setPhase("done");
      onSuccess({ imageDataUrl, descriptor });
    } catch {
      setErrorMsg("Face capture failed. Please try again.");
      setPhase("error");
    }
  }, [onSuccess, stopLoop]);

  function reset() {
    stopLoop();
    setPhase("align");
    setFaceDetected(false);
    setErrorMsg("");
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Camera viewport */}
      <div className="relative w-72 h-72">
        <div className={`absolute inset-0 rounded-full overflow-hidden border-4 transition-colors duration-300 ${
          phase === "done" ? "border-green-500" :
          phase === "error" ? "border-red-500" :
          faceDetected ? "border-indigo-500" :
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

        {phase === "done" && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/30 rounded-full">
            <CheckCircle className="text-green-400 w-16 h-16" />
          </div>
        )}
        {phase === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-full">
            <AlertCircle className="text-red-400 w-16 h-16" />
          </div>
        )}
        {(phase === "loading" || phase === "capturing") && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="text-white w-10 h-10 animate-spin" />
          </div>
        )}
      </div>

      {/* Status */}
      <div className="text-center space-y-3 min-h-[100px]">
        {phase === "loading" && (
          <p className="text-slate-400 flex items-center gap-2 justify-center text-sm">
            <Loader2 className="animate-spin" size={14} /> Loading face detection models…
          </p>
        )}

        {phase === "align" && (
          <div className="space-y-3">
            <p className="text-white font-medium">
              {faceDetected ? "✓ Face detected — ready!" : "Position your face inside the circle"}
            </p>
            <p className="text-slate-500 text-xs">Ensure good lighting and face the camera directly</p>
            {faceDetected && (
              <Button onClick={capture} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                <Camera size={16} className="mr-2" /> Take selfie
              </Button>
            )}
          </div>
        )}

        {phase === "capturing" && (
          <p className="text-white font-medium">Capturing your biometric…</p>
        )}

        {phase === "done" && (
          <p className="text-green-400 font-semibold text-lg">Liveness verified!</p>
        )}

        {phase === "error" && (
          <div className="space-y-3">
            <p className="text-red-400 text-sm font-medium">{errorMsg}</p>
            <Button variant="outline" onClick={reset}
              className="border-white/20 text-slate-300 hover:text-white">
              <RefreshCw size={14} className="mr-2" /> Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
