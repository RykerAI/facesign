"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { CheckCircle, AlertCircle, Loader2, Camera, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  loadModels,
  detectFaceWithLandmarks,
  detectFaceWithDescriptor,
  eyeAspectRatio,
  getEyePoints,
  getHeadTurnRatio,
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

type Challenge = "blink" | "turn_left" | "turn_right";

const CHALLENGE_LABELS: Record<Challenge, string> = {
  blink: "Blink your eyes",
  turn_left: "Turn your head left",
  turn_right: "Turn your head right",
};

const CHALLENGES: Challenge[] = ["blink", "turn_left", "turn_right"];

function pickChallenges(n = 2): Challenge[] {
  return [...CHALLENGES].sort(() => Math.random() - 0.5).slice(0, n);
}

type Phase = "loading" | "error" | "align" | "challenge" | "capturing" | "done";

const EAR_BLINK_THRESHOLD = 0.22;
const HEAD_TURN_THRESHOLD = 0.15;
const DETECTION_MS = 120;

export default function LivenessCapture({ onSuccess, onError }: Props) {
  const webcamRef = useRef<Webcam>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blinkDetected = useRef(false);
  const eyesClosed = useRef(false);

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [faceDetected, setFaceDetected] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed, setCompleted] = useState<Challenge[]>([]);

  const stopLoop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  // Load models
  useEffect(() => {
    loadModels()
      .then(() => { setPhase("align"); })
      .catch(() => {
        const msg = "Failed to load face detection models. Check your internet connection and reload.";
        setErrorMsg(msg);
        setPhase("error");
        onError?.(msg);
      });
    return () => stopLoop();
  }, [stopLoop, onError]);

  // Alignment phase — wait for centred face
  useEffect(() => {
    if (phase !== "align") return;
    const id = setInterval(async () => {
      const video = webcamRef.current?.video;
      if (!video || video.readyState < 2) return;
      const result = await detectFaceWithLandmarks(video);
      setFaceDetected(!!result);
    }, DETECTION_MS);
    return () => clearInterval(id);
  }, [phase]);

  function startChallenges() {
    const selected = pickChallenges(2);
    setChallenges(selected);
    setCurrentIdx(0);
    setCompleted([]);
    blinkDetected.current = false;
    eyesClosed.current = false;
    setPhase("challenge");
  }

  const captureAndFinish = useCallback(async () => {
    setPhase("capturing");
    stopLoop();
    const video = webcamRef.current?.video;
    if (!video) {
      setErrorMsg("Camera unavailable. Please allow camera access and try again.");
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

  // Challenge detection loop
  useEffect(() => {
    if (phase !== "challenge") return;
    const currentChallenge = challenges[currentIdx];
    if (!currentChallenge) return;

    blinkDetected.current = false;
    eyesClosed.current = false;

    intervalRef.current = setInterval(async () => {
      const video = webcamRef.current?.video;
      if (!video || video.readyState < 2) return;

      try {
        const detection = await detectFaceWithLandmarks(video);
        if (!detection) return;

        const { landmarks, detection: det } = detection;
        const eyes = getEyePoints(landmarks);
        const avgEAR = (eyeAspectRatio(eyes.left) + eyeAspectRatio(eyes.right)) / 2;
        const turnRatio = getHeadTurnRatio(landmarks, det.box);

        if (currentChallenge === "blink") {
          if (avgEAR < EAR_BLINK_THRESHOLD) {
            eyesClosed.current = true;
          } else if (eyesClosed.current) {
            blinkDetected.current = true;
            eyesClosed.current = false;
          }
          if (blinkDetected.current) advance(currentChallenge);
        } else if (currentChallenge === "turn_left") {
          if (turnRatio < -HEAD_TURN_THRESHOLD) advance(currentChallenge);
        } else if (currentChallenge === "turn_right") {
          if (turnRatio > HEAD_TURN_THRESHOLD) advance(currentChallenge);
        }
      } catch {
        // Transient detection error
      }
    }, DETECTION_MS);

    return () => stopLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIdx, challenges]);

  function advance(done: Challenge) {
    stopLoop();
    const next = currentIdx + 1;
    setCompleted((prev) => [...prev, done]);
    if (next >= challenges.length) {
      captureAndFinish();
    } else {
      setCurrentIdx(next);
    }
  }

  function reset() {
    setPhase("align");
    setFaceDetected(false);
    setCompleted([]);
    setCurrentIdx(0);
    setErrorMsg("");
  }

  const currentChallenge = challenges[currentIdx];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Camera viewport */}
      <div className="relative w-72 h-72">
        <div className={`absolute inset-0 rounded-full overflow-hidden border-4 transition-colors duration-300 ${
          phase === "done" ? "border-green-500" :
          phase === "error" ? "border-red-500" :
          faceDetected || phase === "challenge" ? "border-indigo-500" :
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
      <div className="text-center space-y-2 min-h-[80px]">
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
            <p className="text-slate-500 text-xs">Ensure good lighting and face the camera</p>
            {faceDetected && (
              <Button onClick={startChallenges} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                <Camera size={16} className="mr-2" /> Start liveness check
              </Button>
            )}
          </div>
        )}

        {phase === "challenge" && currentChallenge && (
          <div className="space-y-3">
            <p className="text-slate-400 text-xs">Step {currentIdx + 1} of {challenges.length}</p>
            <p className="text-white font-bold text-xl">{CHALLENGE_LABELS[currentChallenge]}</p>
            <div className="flex gap-2 justify-center">
              {challenges.map((c, i) => (
                <div key={c} className={`w-3 h-3 rounded-full transition-colors ${
                  completed.includes(c) ? "bg-green-500" :
                  i === currentIdx ? "bg-indigo-500 animate-pulse" : "bg-white/20"
                }`} />
              ))}
            </div>
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

      {/* Completed challenges */}
      {completed.length > 0 && phase === "challenge" && (
        <div className="flex flex-wrap gap-2 justify-center">
          {completed.map((c) => (
            <span key={c} className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full">
              <CheckCircle size={10} /> {CHALLENGE_LABELS[c]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
