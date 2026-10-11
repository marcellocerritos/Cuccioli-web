"use client";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";

// Envuelve las rutas privadas: agrega <meta name="robots" content="noindex, nofollow">
// mientras se está en ellas y lo quita al salir. No cambia el login ni el servidor.
export function NoIndexOutlet() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  return <Outlet />;
}
