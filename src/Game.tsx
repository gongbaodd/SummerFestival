import { signal } from "@preact/signals-react";
import { Suspense } from "react";
import { EngineComponent } from "./Components/Babylon";
import { Loading } from "./Scenes/Loading";
import { Action } from "./Scenes/Action"

const isLoading = signal(true);

const onPlay = () => {
  isLoading.value = false;
};

export const App = () => {
  return (
    <Suspense fallback="loading">
      <EngineComponent antialias canvasId="game">
        {isLoading.value ? <Loading /> : <Action />}
      </EngineComponent>
      <div style={{ position: "absolute", top: 0 }}>
        <button onClick={onPlay}>Play</button>
      </div>
    </Suspense>
  );
};
