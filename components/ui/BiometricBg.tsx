export function BiometricBg() {
  const landmarks: [number, number, number][] = [
    [605, 352, 0],
    [660, 352, 0.4],
    [780, 352, 0.8],
    [835, 352, 1.2],
    [720, 432, 1.6],
    [655, 492, 2.0],
    [785, 492, 2.4],
    [720, 572, 2.8],
    [538, 365, 3.2],
    [902, 365, 3.6],
  ];

  const fpRings = [52, 78, 104, 130, 156, 182, 208];

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <clipPath id="fp-clip">
          <rect x="1080" y="560" width="360" height="340" />
        </clipPath>
        <filter id="scan-glow" x="-20%" y="-400%" width="140%" height="900%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="dot-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Fingerprint (lower-right, amber, very subtle) ── */}
      <g
        clipPath="url(#fp-clip)"
        opacity="0.18"
        style={{ animation: "fp-pulse 7s ease-in-out infinite" }}
      >
        {fpRings.map((r) => (
          <circle
            key={r}
            cx="1240"
            cy="560"
            r={r}
            stroke="#c9a24c"
            strokeWidth="1.1"
            fill="none"
          />
        ))}
        {/* Ridge break marks — fingerprint detail */}
        {fpRings.map((r, i) => (
          <circle
            key={`gap-${r}`}
            cx={1240 + r * Math.cos(Math.PI * 0.35 + i * 0.18)}
            cy={560 + r * Math.sin(Math.PI * 0.35 + i * 0.18)}
            r="1.5"
            fill="#050507"
          />
        ))}
      </g>

      {/* ── Signature ghost (upper-left, amber, deprecated) ── */}
      <g
        opacity="0.22"
        style={{ animation: "sig-fade 10s ease-in-out infinite" }}
      >
        {/* Signature strokes */}
        <path
          d="M 52 138 C 82 108 118 162 158 132 C 198 102 228 154 274 122 C 306 100 328 142 368 124"
          stroke="#c9a24c"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 68 164 C 108 150 162 172 214 162 C 252 155 298 165 342 160"
          stroke="#c9a24c"
          strokeWidth="1.1"
          strokeLinecap="round"
          fill="none"
        />
        {/* Strikethrough — deprecated */}
        <line x1="42" y1="180" x2="380" y2="176" stroke="#c9a24c" strokeWidth="0.8" opacity="0.6" />
        <line x1="46" y1="189" x2="376" y2="186" stroke="#c9a24c" strokeWidth="0.5" opacity="0.35" />
        {/* "DEPRECATED" label */}
        <text x="52" y="208" fill="#c9a24c" fontSize="8" fontFamily="monospace" letterSpacing="3" opacity="0.5">
          DEPRECATED
        </text>
      </g>

      {/* ── Horizontal reference grid (very faint) ── */}
      {[200, 350, 500, 650, 750].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="1440"
          y2={y}
          stroke="rgba(255,255,255,0.015)"
          strokeWidth="1"
        />
      ))}

      {/* ── Face oval ── */}
      <ellipse
        cx="720"
        cy="432"
        rx="210"
        ry="264"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth="1"
        fill="none"
      />

      {/* ── Axis lines ── */}
      {/* Vertical */}
      <line
        x1="720"
        y1="158"
        x2="720"
        y2="708"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth="1"
        strokeDasharray="3 10"
      />
      {/* Eye-level horizontal */}
      <line
        x1="500"
        y1="350"
        x2="940"
        y2="350"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth="1"
        strokeDasharray="3 10"
      />
      {/* Nose-level horizontal */}
      <line
        x1="500"
        y1="432"
        x2="940"
        y2="432"
        stroke="rgba(255,255,255,0.025)"
        strokeWidth="1"
        strokeDasharray="2 14"
      />

      {/* ── Bounding box corner brackets (white, precision) ── */}
      {/* Top-left */}
      <path d="M 492 150 L 492 186 M 492 150 L 528 150" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" strokeLinecap="square" />
      {/* Top-right */}
      <path d="M 948 150 L 948 186 M 948 150 L 912 150" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" strokeLinecap="square" />
      {/* Bottom-left */}
      <path d="M 492 714 L 492 678 M 492 714 L 528 714" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" strokeLinecap="square" />
      {/* Bottom-right */}
      <path d="M 948 714 L 948 678 M 948 714 L 912 714" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" strokeLinecap="square" />

      {/* ── Measurement ticks on oval perimeter ── */}
      <line x1="720" y1="158" x2="720" y2="172" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <line x1="720" y1="692" x2="720" y2="706" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <line x1="510" y1="432" x2="524" y2="432" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <line x1="916" y1="432" x2="930" y2="432" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />

      {/* ── Facial landmark points (cold blue) ── */}
      {landmarks.map(([cx, cy, delay], i) => (
        <g
          key={i}
          filter="url(#dot-glow)"
          style={{
            animation: `dot-pulse 3.5s ease-in-out ${delay}s infinite`,
            transformOrigin: `${cx}px ${cy}px`,
          }}
        >
          <circle cx={cx} cy={cy} r="2.8" fill="#4db3ff" opacity="0.85" />
          <circle cx={cx} cy={cy} r="6" fill="none" stroke="#4db3ff" strokeWidth="0.6" opacity="0.3" />
        </g>
      ))}

      {/* ── Scan beam (sweeping, clipped to face column) ── */}
      <g
        transform="translate(0, 432)"
        style={{ animation: "biometric-scan 4s ease-in-out infinite" }}
      >
        {/* Wide glow */}
        <line x1="492" y1="0" x2="948" y2="0" stroke="#4db3ff" strokeWidth="12" opacity="0.04" />
        {/* Soft glow */}
        <line x1="492" y1="0" x2="948" y2="0" stroke="#4db3ff" strokeWidth="3" opacity="0.15" filter="url(#scan-glow)" />
        {/* Crisp line */}
        <line x1="492" y1="0" x2="948" y2="0" stroke="#4db3ff" strokeWidth="0.8" opacity="1" />
        {/* End caps */}
        <circle cx="492" cy="0" r="2" fill="#4db3ff" opacity="0.9" />
        <circle cx="948" cy="0" r="2" fill="#4db3ff" opacity="0.9" />
      </g>

      {/* ── Data annotations (monospace, precision instrument feel) ── */}
      <text x="497" y="144" fill="rgba(255,255,255,0.3)" fontSize="8.5" fontFamily="monospace" letterSpacing="1.5" style={{ animation: "data-flicker 8s ease-in-out infinite" }}>
        BIOMETRIC · LIVE
      </text>
      <text x="948" y="144" fill="rgba(255,255,255,0.3)" fontSize="8.5" fontFamily="monospace" letterSpacing="1.5" textAnchor="end" style={{ animation: "data-flicker 8s ease-in-out 2s infinite" }}>
        DEPTH · IR · 3D
      </text>
      <text x="497" y="724" fill="rgba(255,255,255,0.3)" fontSize="8.5" fontFamily="monospace" letterSpacing="1.5" style={{ animation: "data-flicker 8s ease-in-out 4s infinite" }}>
        LIVENESS · VERIFIED
      </text>
      <text x="948" y="724" fill="rgba(255,255,255,0.3)" fontSize="8.5" fontFamily="monospace" letterSpacing="1.5" textAnchor="end" style={{ animation: "data-flicker 8s ease-in-out 6s infinite" }}>
        128-DIM · EMBEDDING
      </text>

      {/* ── Subtle vignette overlay via radial fill ── */}
      <ellipse cx="720" cy="432" rx="680" ry="440" fill="url(#vignette)" opacity="0.6" />
      <defs>
        <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#050507" stopOpacity="0" />
          <stop offset="100%" stopColor="#050507" stopOpacity="0.7" />
        </radialGradient>
      </defs>
    </svg>
  );
}
