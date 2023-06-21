import { useCallback, useMemo, useRef, useState } from "react"
import { SceneComponent } from "../Components/Babylon"
import { DebugLayer } from "../Helpers/DebugLayer"
import { ActionManager, Color3, ExecuteCodeAction, Mesh, MeshBuilder, Nullable, PointLight, Scalar, ShadowGenerator, TransformNode, Vector3 } from "@babylonjs/core"
import { useBeforeRender, useScene } from "react-babylonjs"
import { Player } from "../Components/Player"
import { Camera } from "../Components/Camera"
import { Environment } from "../Components/Environment"
import { Controller } from "../Components/Controller"

export const Action = () => {
    const playerRef = useRef<Mesh | null>(null)
    return (
        <SceneComponent>
            <DebugLayer>
                <Controller>
                    <Environment />
                    <Camera player={playerRef.current} />
                    <Player ref={playerRef} />
                </Controller>
            </DebugLayer>
        </SceneComponent>
    )
}