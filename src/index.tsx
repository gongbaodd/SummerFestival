import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import { createRoot } from "react-dom/client";
import { App } from "./Game";

document.documentElement.style["overflow"] = "hidden";
document.documentElement.style.overflow = "hidden";
document.documentElement.style.width = "100%";
document.documentElement.style.height = "100%";
document.documentElement.style.margin = "0";
document.documentElement.style.padding = "0";
document.body.style.overflow = "hidden";
document.body.style.width = "100%";
document.body.style.height = "100%";
document.body.style.margin = "0";
document.body.style.padding = "0";

const root = createRoot(document.getElementById("app") as HTMLDivElement);

root.render(<App />);

// import "./Copy/app"