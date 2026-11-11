import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../src/index.css";
import { Generator } from "../src/pages/Generator";
import "../src/generator.css";

createRoot(document.getElementById("root")!).render(<StrictMode><Generator /></StrictMode>);
