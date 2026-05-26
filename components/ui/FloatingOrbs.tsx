export function FloatingOrbs({ subtle = false }: { subtle?: boolean }) {
  const opacity = subtle ? "opacity-40" : "opacity-100";
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${opacity}`}>
      {/* Orb 1 — large indigo, top-left */}
      <div
        className="absolute -top-48 -left-48 w-[600px] h-[600px] rounded-full blur-[120px]"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
          animation: "orb-1 18s ease-in-out infinite",
        }}
      />
      {/* Orb 2 — purple, top-right */}
      <div
        className="absolute -top-24 right-0 w-[500px] h-[500px] rounded-full blur-[100px]"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)",
          animation: "orb-2 22s ease-in-out infinite",
        }}
      />
      {/* Orb 3 — blue, bottom-left */}
      <div
        className="absolute bottom-0 -left-24 w-[450px] h-[450px] rounded-full blur-[100px]"
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)",
          animation: "orb-3 26s ease-in-out infinite",
        }}
      />
      {/* Orb 4 — violet, bottom-right */}
      <div
        className="absolute -bottom-16 right-16 w-[400px] h-[400px] rounded-full blur-[90px]"
        style={{
          background: "radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)",
          animation: "orb-4 20s ease-in-out infinite",
        }}
      />
      {/* Orb 5 — cyan accent, center */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-[80px]"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
          animation: "orb-2 30s ease-in-out infinite reverse",
        }}
      />
    </div>
  );
}
