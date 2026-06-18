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
