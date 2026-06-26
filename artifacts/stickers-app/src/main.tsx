import { createRoot } from "react-dom/client";
// Font Inter self-hosted (nessuna connessione a Google: privacy by design, GDPR).
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/900.css";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
