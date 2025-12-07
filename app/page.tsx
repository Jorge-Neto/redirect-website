"use client";

import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    // The data collector script will handle everything:
    // 1. Collect browser data
    // 2. Get geolocation (with fallbacks)
    // 3. Persist to Supabase
    // 4. Redirect to destination
    const script = document.createElement("script");
    script.src = "/app-core.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <main className="flex items-center justify-center w-full h-screen bg-white">
      <p className="text-center text-base text-black">
        Processando a sua solicitação...
      </p>
    </main>
  );
}
