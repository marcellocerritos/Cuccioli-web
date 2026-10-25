import { createRoot } from "react-dom/client";
import Cuccioli from "../components/cuccioli";
import { apiOrigin } from "../lib/hosting";
import "../app/globals.css";

// Monitoreo: manda errores de JavaScript del navegador a los logs del Worker.
// Máximo 5 por visita, solo mensaje/archivo/línea/ruta — nunca datos del pedido ni del cliente.
let reported = 0;
function report(message: string, source = "", line?: number) {
  if (!apiOrigin || reported >= 5) return;
  reported++;
  fetch(`${apiOrigin}/api/client-error`, {
    method: "POST", keepalive: true, credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, source, line, path: location.pathname }),
  }).catch(() => {});
}
window.addEventListener("error", e => report(String(e.message || "error"), e.filename, e.lineno));
window.addEventListener("unhandledrejection", e => report(`promesa: ${e.reason instanceof Error ? e.reason.message : String(e.reason)}`));

createRoot(document.getElementById("root")!).render(<Cuccioli />);
