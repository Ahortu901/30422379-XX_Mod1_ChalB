import React from "react";
import { Box } from "@mui/material";

/**
 * Lightweight animated background:
 * - subtle gradient motion
 * - 3 blurred "blobs" drifting around
 * - respects reduced motion preference
 */
export default function LiveBackground() {
  return (
    <Box
      aria-hidden
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        overflow: "hidden",
        pointerEvents: "none",

        // Base gradient animation
        background:
          "radial-gradient(1200px 800px at 10% 10%, rgba(99,102,241,0.18), transparent 60%)," +
          "radial-gradient(1000px 700px at 90% 20%, rgba(16,185,129,0.16), transparent 55%)," +
          "radial-gradient(900px 700px at 50% 90%, rgba(56,189,248,0.14), transparent 55%)," +
          "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 60%, rgba(255,255,255,1) 100%)",
        backgroundSize: "200% 200%",
        animation: "uliGradient 16s ease-in-out infinite",

        "@media (prefers-reduced-motion: reduce)": {
          animation: "none",
        },

        // Keyframes injected via sx
        "@keyframes uliGradient": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      }}
    >
      {/* Blobs */}
      <Blob
        size={520}
        top="-140px"
        left="-120px"
        opacity={0.22}
        blur={70}
        color="rgba(99,102,241,1)" // indigo
        duration={22}
        delay={0}
      />
      <Blob
        size={620}
        top="10%"
        left="70%"
        opacity={0.16}
        blur={90}
        color="rgba(16,185,129,1)" // emerald
        duration={28}
        delay={-6}
      />
      <Blob
        size={520}
        top="70%"
        left="20%"
        opacity={0.14}
        blur={85}
        color="rgba(56,189,248,1)" // sky
        duration={26}
        delay={-12}
      />
    </Box>
  );
}

function Blob({ size, top, left, opacity, blur, color, duration, delay }) {
  return (
    <Box
      sx={{
        position: "absolute",
        width: size,
        height: size,
        top,
        left,
        borderRadius: "50%",
        background: color,
        opacity,
        filter: `blur(${blur}px)`,
        transform: "translate3d(0,0,0)",
        animation: `uliBlob ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,

        "@media (prefers-reduced-motion: reduce)": {
          animation: "none",
        },

        "@keyframes uliBlob": {
          "0%": { transform: "translate3d(0,0,0) scale(1)" },
          "33%": { transform: "translate3d(80px, -40px, 0) scale(1.08)" },
          "66%": { transform: "translate3d(-60px, 60px, 0) scale(0.96)" },
          "100%": { transform: "translate3d(0,0,0) scale(1)" },
        },
      }}
    />
  );
}
