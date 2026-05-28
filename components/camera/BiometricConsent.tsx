"use client";

import { Shield, Eye, Clock, Server, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onAccept: () => void;
  onDecline: () => void;
}

const disclosures = [
  {
    icon: Eye,
    label: "What we capture",
    body: "A 128-number mathematical representation of your facial geometry — not a photo or video. Raw camera feed is processed locally in your browser and never transmitted.",
  },
  {
    icon: Shield,
    label: "Why we collect it",
    body: "To cryptographically bind your identity to each document you sign, proving you were present and consenting at the moment of signing.",
  },
  {
    icon: Server,
    label: "Where it's stored",
    body: "Your face embedding is encrypted at rest in your account on our servers. It is never sold, shared with third parties, or used for any purpose other than signing verification.",
  },
  {
    icon: Clock,
    label: "How long we keep it",
    body: "Retained for the life of your account. You can permanently delete your biometric data at any time from Account Settings.",
  },
  {
    icon: UserCheck,
    label: "Who can see it",
    body: "No human ever views your biometric data. Matching runs entirely in your browser — your face embedding is compared locally during each signing session.",
  },
];

export function BiometricConsent({ onAccept, onDecline }: Props) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-1"
          style={{ background: "rgba(77,179,255,0.1)", border: "1px solid rgba(77,179,255,0.2)" }}
        >
          <Shield size={22} style={{ color: "#4db3ff" }} />
        </div>
        <h2 className="text-lg font-semibold text-white tracking-tight">
          Biometric data consent
        </h2>
        <p className="text-white/40 text-sm">
          Before your camera opens, please review how we handle your biometric data.
        </p>
      </div>

      {/* Disclosure list */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        {disclosures.map(({ icon: Icon, label, body }, i) => (
          <div
            key={label}
            className="flex gap-3 p-4"
            style={{
              background: "rgba(255,255,255,0.02)",
              borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : undefined,
            }}
          >
            <div className="shrink-0 mt-0.5">
              <Icon size={14} style={{ color: "#4db3ff" }} />
            </div>
            <div>
              <p className="text-white text-xs font-semibold mb-0.5">{label}</p>
              <p className="text-white/40 text-xs leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Regulatory note */}
      <p
        className="text-center text-[10px] leading-relaxed"
        style={{ color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}
      >
        This disclosure is provided in compliance with BIPA, GDPR Article 9,
        and applicable biometric privacy laws.
      </p>

      {/* Actions */}
      <div className="space-y-2">
        <Button
          onClick={onAccept}
          className="w-full bg-white text-black hover:bg-white/90 font-semibold rounded-xl h-11"
        >
          I agree — allow camera access
        </Button>
        <Button
          onClick={onDecline}
          variant="ghost"
          className="w-full text-white/30 hover:text-white/60 text-sm rounded-xl h-9"
        >
          Decline
        </Button>
      </div>
    </div>
  );
}
