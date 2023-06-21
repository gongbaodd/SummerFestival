import {
  Engine as EngineComponent,
  Scene as SceneComponent,
} from "react-babylonjs";
import { Engine, Scene } from "@babylonjs/core";

EngineComponent.displayName = Engine.name;
SceneComponent.displayName = Scene.name;

export { EngineComponent, SceneComponent };
