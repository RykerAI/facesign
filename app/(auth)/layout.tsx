import { FloatingOrbs } from "@/components/ui/FloatingOrbs";
import { ParticleNetwork } from "@/components/ui/ParticleNetwork";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Animated background layers */}
      <FloatingOrbs />

      {/* Moving dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(99,102,241,0.8) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          animation: "grid-drift 12s linear infinite",
        }}
      />

      {/* Particle network */}
      <ParticleNetwork count={90} />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(2,6,23,0.8)_100%)]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4 py-12">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="relative inline-flex items-center justify-center mb-5">
            {/* Beacon rings */}
            <div
              className="absolute inset-0 rounded-full border border-indigo-500/40"
              style={{ animation: "beacon 2.5s ease-out infinite" }}
            />
            <div
              className="absolute inset-0 rounded-full border border-indigo-400/30"
              style={{ animation: "beacon 2.5s ease-out infinite 0.8s" }}
            />
            {/* Icon */}
            <div
              className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl"
              style={{ animation: "glow-pulse 3s ease-in-out infinite" }}
            >
              <svg
                className="w-9 h-9 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                />
              </svg>
            </div>
          </div>

          <h1
            className="text-4xl font-extrabold tracking-tight"
            style={{
              background:
                "linear-gradient(90deg, #818cf8, #a78bfa, #60a5fa, #818cf8)",
              backgroundSize: "300% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "gradient-x 5s linear infinite",
            }}
          >
            FaceSign
          </h1>
          <p className="text-slate-400 mt-2 text-sm tracking-wide">
            Biometric document signing
          </p>
        </div>

        {/* Card with rotating gradient border */}
        <div
          className="relative rounded-2xl p-px"
          style={{
            background:
              "conic-gradient(from var(--angle), rgba(99,102,241,0.6), rgba(139,92,246,0.6), rgba(59,130,246,0.6), rgba(99,102,241,0.6))",
            animation: "rotate-border 6s linear infinite",
          }}
        >
          {/* Shimmer sweep over the border */}
          <div
            className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-500"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
              backgroundSize: "200% auto",
              animation: "shimmer 3s linear infinite",
            }}
          />

          <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-[calc(1rem-1px)] p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
