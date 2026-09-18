import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/app";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Football Lite root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
