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

type Challenge = "blink" | "turn_head";

const CHALLENGE_LABELS: Record<Challenge, string> = {
  blink: "Blink your eyes slowly",
  turn_head: "Turn your head to either side",
};

const CHALLENGE_HINTS: Record<Challenge, string> = {
  blink: "Close and open your eyes fully",
  turn_head: "Look left or right, then back",
};

const CHALLENGES: Challenge[] = ["blink", "turn_head"];

function pickChallenges(): Challenge[] {
  return [...CHALLENGES].sort(() => Math.random() - 0.5);
}

type Phase = "loading" | "error" | "align" | "calibrating" | "challenge" | "capturing" | "done";

// Blink: EAR must drop below this fraction of the calibrated baseline
const EAR_CLOSED_RATIO = 0.70;
// Require this many consecutive below-threshold frames before marking eyes as closed
const EAR_BLINK_FRAMES = 2;
// Head turn: nose must deviate this far from calibrated baseline (fraction of half-face-width)
const HEAD_TURN_THRESHOLD = 0.20;
// Detection polling interval — kept above typical async detection time to avoid overlap
const DETECTION_MS = 90;
// Number of frames to sample for baseline calibration (~1.6s at 90ms)
const CALIBRATION_FRAMES = 18;

export default function LivenessCapture({ onSuccess, onError }: Props) {
  const webcamRef = useRef<Webcam>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDetecting = useRef(false);

  // Calibrated baseline (learned per-person in calibration phase)
  const calibratedEAR = useRef(0.28);
  const calibratedNoseRatio = useRef(0.0);
  const calibEARs = useRef<number[]>([]);
  const calibNoseRatios = useRef<number[]>([]);

  // Blink state
  const consecutiveClosedFrames = useRef(0);
  const eyesWereClosed = useRef(false);

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [faceDetected, setFaceDetected] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed, setCompleted] = useState<Challenge[]>([]);
  const [calibProgress, setCalibProgress] = useState(0);

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

  // Alignment phase — wait for a centred face
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

  // Calibration phase — sample baseline EAR and nose position while user holds still
  useEffect(() => {
    if (phase !== "calibrating") return;
    calibEARs.current = [];
    calibNoseRatios.current = [];

    const id = setInterval(async () => {
      if (isDetecting.current) return;
      isDetecting.current = true;

      const video = webcamRef.current?.video;
      if (!video || video.readyState < 2) { isDetecting.current = false; return; }

      try {
        const detection = await detectFaceWithLandmarks(video);
        if (!detection) { isDetecting.current = false; return; }

        const { landmarks, detection: det } = detection;
        const eyes = getEyePoints(landmarks);
        const avgEAR = (eyeAspectRatio(eyes.left) + eyeAspectRatio(eyes.right)) / 2;
        const noseRatio = getHeadTurnRatio(landmarks, det.box);

        calibEARs.current.push(avgEAR);
        calibNoseRatios.current.push(noseRatio);
        setCalibProgress(calibEARs.current.length / CALIBRATION_FRAMES);

        if (calibEARs.current.length >= CALIBRATION_FRAMES) {
          clearInterval(id);
          calibratedEAR.current = calibEARs.current.reduce((a, b) => a + b, 0) / calibEARs.current.length;
          calibratedNoseRatio.current = calibNoseRatios.current.reduce((a, b) => a + b, 0) / calibNoseRatios.current.length;

          consecutiveClosedFrames.current = 0;
          eyesWereClosed.current = false;
          const selected = pickChallenges();
          setChallenges(selected);
          setCurrentIdx(0);
          setCompleted([]);
          setPhase("challenge");
        }
      } catch {
        // transient
      } finally {
        isDetecting.current = false;
      }
    }, DETECTION_MS);

    return () => clearInterval(id);
  }, [phase]);

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

    consecutiveClosedFrames.current = 0;
    eyesWereClosed.current = false;

    const earThreshold = calibratedEAR.current * EAR_CLOSED_RATIO;
    const baselineNose = calibratedNoseRatio.current;

    function advance(done: Challenge) {
      stopLoop();
      const next = currentIdx + 1;
      setCompleted((prev) => [...prev, done]);
      if (next >= challenges.length) {
        captureAndFinish();
      } else {
        consecutiveClosedFrames.current = 0;
        eyesWereClosed.current = false;
        setCurrentIdx(next);
      }
    }

    intervalRef.current = setInterval(async () => {
      if (isDetecting.current) return;
      isDetecting.current = true;

      const video = webcamRef.current?.video;
      if (!video || video.readyState < 2) { isDetecting.current = false; return; }

      try {
        const detection = await detectFaceWithLandmarks(video);
        if (!detection) { isDetecting.current = false; return; }

        const { landmarks, detection: det } = detection;
        const eyes = getEyePoints(landmarks);
        const avgEAR = (eyeAspectRatio(eyes.left) + eyeAspectRatio(eyes.right)) / 2;

        if (currentChallenge === "blink") {
          if (avgEAR < earThreshold) {
            consecutiveClosedFrames.current++;
            if (consecutiveClosedFrames.current >= EAR_BLINK_FRAMES) {
              eyesWereClosed.current = true;
            }
          } else if (eyesWereClosed.current) {
            // Eyes were shut for enough frames and are now open — confirmed blink
            advance(currentChallenge);
          } else {
            consecutiveClosedFrames.current = 0;
          }
        } else if (currentChallenge === "turn_head") {
          const noseRatio = getHeadTurnRatio(landmarks, det.box);
          const deviation = Math.abs(noseRatio - baselineNose);
          if (deviation > HEAD_TURN_THRESHOLD) {
            advance(currentChallenge);
          }
        }
      } catch {
        // transient
      } finally {
        isDetecting.current = false;
      }
    }, DETECTION_MS);

    return () => stopLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIdx, challenges, stopLoop, captureAndFinish]);

  function startCalibration() {
    setCalibProgress(0);
    setPhase("calibrating");
  }

  function reset() {
    stopLoop();
    setPhase("align");
    setFaceDetected(false);
    setCompleted([]);
    setCurrentIdx(0);
    setErrorMsg("");
    calibratedEAR.current = 0.28;
    calibratedNoseRatio.current = 0;
    consecutiveClosedFrames.current = 0;
    eyesWereClosed.current = false;
  }

  const currentChallenge = challenges[currentIdx];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Camera viewport */}
      <div className="relative w-72 h-72">
        <div className={`absolute inset-0 rounded-full overflow-hidden border-4 transition-colors duration-300 ${
          phase === "done" ? "border-green-500" :
          phase === "error" ? "border-red-500" :
          faceDetected || phase === "challenge" || phase === "calibrating" ? "border-indigo-500" :
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

        {phase === "calibrating" && (
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="48"
                fill="none"
                stroke="rgb(99 102 241)"
                strokeWidth="4"
                strokeDasharray={`${calibProgress * 301.6} 301.6`}
                strokeLinecap="round"
                className="transition-all duration-100"
              />
            </svg>
          </div>
        )}

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
      <div className="text-center space-y-2 min-h-[100px]">
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
              <Button onClick={startCalibration} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                <Camera size={16} className="mr-2" /> Start liveness check
              </Button>
            )}
          </div>
        )}

        {phase === "calibrating" && (
          <div className="space-y-2">
            <p className="text-white font-medium">Hold still…</p>
            <p className="text-slate-400 text-sm">Calibrating to your face</p>
            <div className="w-48 mx-auto bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-100"
                style={{ width: `${calibProgress * 100}%` }}
              />
            </div>
          </div>
        )}

        {phase === "challenge" && currentChallenge && (
          <div className="space-y-3">
            <p className="text-slate-400 text-xs">Step {currentIdx + 1} of {challenges.length}</p>
            <p className="text-white font-bold text-xl">{CHALLENGE_LABELS[currentChallenge]}</p>
            <p className="text-slate-400 text-sm">{CHALLENGE_HINTS[currentChallenge]}</p>
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
