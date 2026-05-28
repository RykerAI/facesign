"use client";

import * as faceapi from "face-api.js";

let modelsLoaded = false;

export async function loadModels() {
  if (modelsLoaded) return;
  const MODEL_URL = "/models";
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

export async function detectFaceWithDescriptor(
  video: HTMLVideoElement
): Promise<faceapi.WithFaceDescriptor<
  faceapi.WithFaceLandmarks<
    { detection: faceapi.FaceDetection },
    faceapi.FaceLandmarks68
  >
> | null> {
  const result = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result ?? null;
}

export async function detectFaceWithLandmarks(
  video: HTMLVideoElement
): Promise<faceapi.WithFaceLandmarks<
  { detection: faceapi.FaceDetection },
  faceapi.FaceLandmarks68
> | null> {
  const result = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 }))
    .withFaceLandmarks();
  return result ?? null;
}

// Eye Aspect Ratio — < 0.25 means eye is closed (blink)
export function eyeAspectRatio(
  eye: faceapi.Point[]
): number {
  const A = distance(eye[1], eye[5]);
  const B = distance(eye[2], eye[4]);
  const C = distance(eye[0], eye[3]);
  return (A + B) / (2.0 * C);
}

function distance(a: faceapi.Point, b: faceapi.Point): number {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

// Extract left/right eye landmark points from 68-point model
export function getEyePoints(landmarks: faceapi.FaceLandmarks68) {
  const positions = landmarks.positions;
  return {
    left: positions.slice(36, 42),
    right: positions.slice(42, 48),
  };
}

// Head pose estimate via nose-tip relative to face bounding box center
export function getHeadTurnRatio(
  landmarks: faceapi.FaceLandmarks68,
  box: faceapi.Box
): number {
  const noseTip = landmarks.positions[30];
  const faceCenter = box.x + box.width / 2;
  return (noseTip.x - faceCenter) / (box.width / 2); // -1 = full left, +1 = full right
}

export function compareFaceDescriptors(
  a: Float32Array,
  b: Float32Array
): number {
  return faceapi.euclideanDistance(a, b);
}

export function descriptorToArray(d: Float32Array): number[] {
  return Array.from(d);
}

export function arrayToDescriptor(a: number[]): Float32Array {
  return new Float32Array(a);
}
