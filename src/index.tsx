import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import { createRoot } from "react-dom/client";
import { App } from "./Game";

const root = createRoot(document.getElementById("app") as HTMLDivElement);

root.render(<App />);

// import "./Copy/app"