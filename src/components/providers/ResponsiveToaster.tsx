"use client";

import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

export function ResponsiveToaster() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return <Toaster position={isMobile ? "top-center" : "bottom-right"} />;
}

