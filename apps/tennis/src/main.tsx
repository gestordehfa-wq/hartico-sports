import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@hartico/ui/styles.css";
import { App } from "./app/app";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Tennis root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
