import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { SceneComponent } from "../Components/Babylon"
import { DebugLayer } from "../Helpers/DebugLayer"
import { ActionManager, Color3, ExecuteCodeAction, Mesh, MeshBuilder, Nullable, PointLight, Scalar, ShadowGenerator, TransformNode, Vector3 } from "@babylonjs/core"
import { useBeforeRender, useScene } from "react-babylonjs"
import { Player } from "../Components/Player"
import { Keyboard } from "../Components/Keyboard"

export const Action = () => {
    return (
        <SceneComponent>
            <DebugLayer>
                <Stage />
            </DebugLayer>
        </SceneComponent>
    )
}

const Stage = () => {
    const scene = useScene()
    const ground = useMemo(() => {
        const ground = MeshBuilder.CreateBox("ground", { size: 24 }, scene)
        ground.scaling = new Vector3(1, .02, 1)
        return ground
    }, [])

    const envLightDirection = useMemo(() => new Vector3(0, 1, 0), [])
    const sparkLightPos = useMemo(() => new Vector3(0, 1, 0), [])
    const sparkLightDiffuse = useMemo(() => new Color3(0.08627450980392157, 0.10980392156862745, 0.15294117647058825), [])

    const [shadow, setShadow] = useState<Nullable<ShadowGenerator>>(null)

    const sparkLightRef = useCallback((light: PointLight) => {
        const shadow = new ShadowGenerator(1024, light)
        shadow.darkness = .4
        setShadow(shadow)
    }, [])

    return (
        <Keyboard>
            <Player shadow={shadow} />
            <abstractMesh name="ground" fromInstance={ground} />
            <hemisphericLight name="envLight" direction={envLightDirection} />
            <pointLight name="sparkLight" position={sparkLightPos} diffuse={sparkLightDiffuse} intensity={35} radius={1} ref={sparkLightRef} />
        </Keyboard>
    )
}