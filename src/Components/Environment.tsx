import { ActionManager, Color3, ExecuteCodeAction, MeshBuilder, Nullable, PointLight, Scalar, ShadowGenerator, Vector3 } from "@babylonjs/core"
import { useCallback, useMemo, useState } from "react"
import { useBeforeRender, useScene } from "react-babylonjs"

const envLightDirection = new Vector3(0, 1, 0)
const sparkLightPos = new Vector3(0, 1, 0)
const sparkLightDiffuse = new Color3(0.08627450980392157, 0.10980392156862745, 0.15294117647058825)


export const Environment = () => {
    const scene = useScene()
    const ground = useMemo(() => {
        const ground = MeshBuilder.CreateBox("ground", { size: 24 }, scene)
        ground.scaling = new Vector3(1, .02, 1)
        return ground
    }, [])

    const [_, setShadow] = useState<Nullable<ShadowGenerator>>(null)

    const sparkLightRef = useCallback((light: PointLight) => {
        const shadow = new ShadowGenerator(1024, light)
        shadow.darkness = .4
        setShadow(shadow)
    }, [])

    return (
        <>
            <abstractMesh name="ground" fromInstance={ground} />
            <hemisphericLight name="envLight" direction={envLightDirection} />
            <pointLight name="sparkLight" position={sparkLightPos} diffuse={sparkLightDiffuse} intensity={35} radius={1} ref={sparkLightRef} />
        </>
    )
}
