import { FC, ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { SceneComponent } from "../Components/Babylon"
import { DebugLayer } from "../Helpers/DebugLayer"
import { ActionManager, Color3, ExecuteCodeAction, GroundMesh, Mesh, MeshAssetTask, MeshBuilder, Nullable, PhysicsAggregate, PhysicsImpostor, PhysicsShapeType, PointLight, Scalar, SceneLoader, ShadowGenerator, TransformNode, Vector3 } from "@babylonjs/core"
import { MeshTask, TaskType, useAssetManager, useBeforeRender, useScene } from "react-babylonjs"
import { Player } from "../Components/Player"
import { Keyboard } from "../Components/Keyboard"
import { CannonJSPlugin } from "@babylonjs/core"
import * as cannon from "cannon-es";

const gravityVector = new Vector3(0, -.98, 0)

export const Action = () => {
    return (
        <SceneComponent
            // enablePhysics={[
            //     gravityVector,
            //     new CannonJSPlugin(undefined, undefined, cannon),
            // ]}
        >
            <DebugLayer>
                <Stage />
            </DebugLayer>
        </SceneComponent>
    )
}

const modelAssetTasks: MeshTask[] = [{
    name: "envSetting",
    rootUrl: "/models/",
    sceneFilename: "envSetting.glb",
    taskType: TaskType.Mesh,
}]

const Ground = (props: { onLoad: (ground: Mesh) => void }) => {
    const result = useAssetManager(modelAssetTasks)

    useEffect(() => {
        const asset = result.taskNameMap["envSetting"] as MeshAssetTask
        if (!asset && !asset.loadedMeshes) return
        asset.loadedMeshes.forEach(mesh => {
            mesh.receiveShadows = true
            mesh.checkCollisions = true
        })
        props.onLoad(asset.loadedMeshes[0] as Mesh)
    }, [result, props.onLoad])

    return null;
}


const Stage = () => {
    const scene = useScene()

    const envLightDirection = useMemo(() => new Vector3(0, 1, 0), [])
    const sparkLightPos = useMemo(() => new Vector3(0, 1, 0), [])
    const sparkLightDiffuse = useMemo(() => new Color3(0.08627450980392157, 0.10980392156862745, 0.15294117647058825), [])

    const ground = useRef<GroundMesh>(null)
    const sparkLightRef = useRef<PointLight>(null)
    const shadowRef = useRef<ShadowGenerator>(null)

    const [playerPos, setPlayerPos] = useState(new Vector3(0, 1.5, 0))

    const onGroundLoad = useCallback((_ground: Mesh) => {
        // _ground.parent = ground.current
        const ground = scene.getMeshByName("Plane.002")
        ground &&  (ground.physicsImpostor = new PhysicsImpostor(_ground, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.00001 }))
        setPlayerPos(scene.getTransformNodeByName("startPosition").getAbsolutePosition())
    }, [])

    return (
        <Keyboard>
            <Suspense >
                <Ground onLoad={onGroundLoad} />
            </Suspense>
            <hemisphericLight name="envLight" direction={envLightDirection} />
            <pointLight
                name="sparkLight"
                position={sparkLightPos}
                diffuse={sparkLightDiffuse}
                intensity={35}
                radius={1}
                ref={sparkLightRef}
            >
                <shadowGenerator mapSize={1024} darkness={.4} ref={shadowRef} >
                    <Player shadow={shadowRef.current} light={sparkLightRef.current} position={playerPos} />
                </shadowGenerator>
            </pointLight>
        </Keyboard>
    )
}