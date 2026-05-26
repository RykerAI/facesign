export interface Profile {
  id: string;
  email: string;
  full_name: string;
  face_image_url: string | null;
  face_descriptor: number[] | null;
  liveness_verified: boolean;
  webauthn_credential_id: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  content: string;
  status: "pending" | "signed";
  signed_at: string | null;
  signature_face_url: string | null;
  signature_method: "face" | "fingerprint" | "both" | null;
  created_at: string;
}

export interface LivenessChallenge {
  type: "blink" | "smile" | "turn_left" | "turn_right" | "nod";
  label: string;
  completed: boolean;
}
