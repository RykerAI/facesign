import { BiometricBg } from "@/components/ui/BiometricBg";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "#050507" }}
    >
      {/* Full-screen biometric scan graphic */}
      <BiometricBg />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[400px] px-4 py-16">
        {/* Logo mark */}
        <div className="text-center mb-10">
          {/* Reticle icon: two corner brackets forming a face-scan target */}
          <div className="inline-flex items-center justify-center mb-5">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Top-left bracket */}
              <path d="M4 14 L4 4 L14 4" stroke="white" strokeWidth="2" strokeLinecap="square" />
              {/* Top-right bracket */}
              <path d="M40 14 L40 4 L30 4" stroke="white" strokeWidth="2" strokeLinecap="square" />
              {/* Bottom-left bracket */}
              <path d="M4 30 L4 40 L14 40" stroke="white" strokeWidth="2" strokeLinecap="square" />
              {/* Bottom-right bracket */}
              <path d="M40 30 L40 40 L30 40" stroke="white" strokeWidth="2" strokeLinecap="square" />
              {/* Face oval */}
              <ellipse cx="22" cy="22" rx="9" ry="11" stroke="#4db3ff" strokeWidth="1" />
              {/* Center dot */}
              <circle cx="22" cy="22" r="1.5" fill="#4db3ff" />
            </svg>
          </div>

          <h1 className="text-[1.75rem] font-semibold tracking-tight text-white">
            FaceSign
          </h1>
          <p
            className="mt-2 text-[10px] tracking-[0.22em] uppercase"
            style={{ color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}
          >
            Biometric Document Signing
          </p>
        </div>

        {/* Minimal glass card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(8,8,12,0.75)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
