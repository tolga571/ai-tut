"use client";

import { useEffect } from "react";

export default function AnimatedFavicon() {
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const link = document.querySelector("link[rel*='icon']") || document.createElement("link");
    (link as HTMLLinkElement).rel = "shortcut icon";
    document.getElementsByTagName("head")[0].appendChild(link);

    const animate = () => {
      ctx.clearRect(0, 0, 32, 32);

      // Background - Rounded square with gradient
      const gradient = ctx.createLinearGradient(0, 0, 32, 32);
      const hue = (frame * 2) % 360;
      
      // Theme colors: Blue, Black, White transition
      // We'll use a smooth oscillating transition between these tones
      const transition = Math.sin(frame * 0.05) * 0.5 + 0.5; // 0 to 1
      
      // Interpolate colors
      // Color 1: Deep Blue (0, 102, 204)
      // Color 2: Black (20, 20, 20)
      const r = Math.round(0 * (1 - transition) + 20 * transition);
      const g = Math.round(102 * (1 - transition) + 20 * transition);
      const b = Math.round(204 * (1 - transition) + 20 * transition);

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      
      // Draw rounded rect
      const radius = 8;
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(32 - radius, 0);
      ctx.quadraticCurveTo(32, 0, 32, radius);
      ctx.lineTo(32, 32 - radius);
      ctx.quadraticCurveTo(32, 32, 32 - radius, 32);
      ctx.lineTo(radius, 32);
      ctx.quadraticCurveTo(0, 32, 0, 32 - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.fill();

      // Draw "JL" text
      ctx.fillStyle = "white";
      ctx.font = "bold 18px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Add a subtle glow/pulse to the letters
      const pulse = Math.sin(frame * 0.1) * 2;
      ctx.shadowBlur = 4 + pulse;
      ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
      
      ctx.fillText("JL", 16, 16);

      (link as HTMLLinkElement).href = canvas.toDataURL("image/png");
      
      frame++;
      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return null;
}
