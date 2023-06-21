import { Color3, Matrix, MeshBuilder, Quaternion, Vector3, StandardMaterial, TransformNode, UniversalCamera, Mesh } from "@babylonjs/core"
import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react"
import { useScene } from "react-babylonjs"
import { setForwardRef } from "../Helpers/ref"

export const Player = forwardRef<Mesh, {}>(({}, ref) => {
    const scene = useScene()
    const collider = useMemo(() => {
        if (!scene) return

        const outer = MeshBuilder.CreateBox("collider", { width: 2, depth: 1, height: 3 }, scene)
        outer.isVisible = false
        outer.isPickable = false
        outer.checkCollisions = true

        outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0))

        outer.ellipsoid = new Vector3(1, 1.5, 1)
        outer.ellipsoidOffset = new Vector3(0, 1.5, 0)

        outer.rotationQuaternion = new Quaternion(0, 1, 0, 0);

        setForwardRef(ref, outer)
        return outer
    }, [scene])
    const body = useMemo(() => {
        if (!scene) return

        const body = MeshBuilder.CreateCylinder("body", {
            height: 3,
            diameterTop: 2,
            diameterBottom: 2,
            tessellation: 0,
            subdivisions: 0
        }, scene)
        const material = new StandardMaterial("ref", scene)
        material.diffuseColor = new Color3(0.8, 0.5, 0.5)

        body.material = material
        body.isPickable = false
        body.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0))

        return body
    }, [scene])
    const inner = useMemo(() => {
        if (!scene) return
        const box = MeshBuilder.CreateBox("inner", { width: 0.5, depth: 0.5, height: 0.25 }, scene)
        return box
    }, [scene])

    return (
        <abstractMesh name="player" fromInstance={collider}>
            <abstractMesh name="body" fromInstance={body}>
                <abstractMesh name="inner" fromInstance={inner} />
            </abstractMesh>
        </abstractMesh>
    )
})

Player.displayName = "Player"