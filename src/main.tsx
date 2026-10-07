import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
document.head.appendChild(fontLink);

window.addEventListener("vite:preloadError", () => {
  if (!sessionStorage.getItem("vakansie:chunk-reload")) {
    sessionStorage.setItem("vakansie:chunk-reload", "1");
    window.location.reload();
  }
});

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);

// Offline shell: keeps opened trip pages and assets available without network.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is optional */
    });
  });
}
