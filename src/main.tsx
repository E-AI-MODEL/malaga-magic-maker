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
