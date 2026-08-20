import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

window.addEventListener("vite:preloadError", () => {
  if (!sessionStorage.getItem("vakansie:chunk-reload")) {
    sessionStorage.setItem("vakansie:chunk-reload", "1");
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);

// Offline shell: keeps opened trip pages and assets available without network.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is optional */
    });
  });
}
