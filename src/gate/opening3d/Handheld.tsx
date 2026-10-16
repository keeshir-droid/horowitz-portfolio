import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Ball, Merge, RBox, useKit } from './kit'
import { GB_POS, GB_TILT, roundedRect, type Clock } from './util'

/**
 * The grey brick handheld (evokes the classic shape; no real brand/logo). Local frame:
 * x right, y up the face, z out of the screen. Body 0.2 x 0.32 x 0.05, front face at z 0.025,
 * screen centre (0, 0.06). The screen is a live 160x144 canvas drawn by `draw` every frame.
 */

const FZ = 0.025

export default function Handheld({ clock, draw }: { clock: Clock; draw: (ctx: CanvasRenderingContext2D, t: number) => void }) {
  const k = useKit()
  const sheen = useRef<THREE.MeshBasicMaterial>(null)
  const res = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 160
    c.height = 144
    const screen = new THREE.CanvasTexture(c)
    screen.magFilter = THREE.NearestFilter
    screen.minFilter = THREE.NearestFilter
    screen.colorSpace = THREE.SRGBColorSpace

    // body: rounded slab with the big bottom-right corner, bevelled edges
    const depth = 0.038
    const bevel = 0.006
    const body = new THREE.ExtrudeGeometry(roundedRect(0.2 - 2 * bevel, 0.32 - 2 * bevel, [0.008, 0.008, 0.04, 0.01]), {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 4,
      curveSegments: 10,
    })
    body.translate(0, 0, -depth / 2)
    body.computeVertexNormals()
    const bezel = new THREE.ShapeGeometry(roundedRect(0.168, 0.132, [0.008, 0.008, 0.032, 0.008]), 8)
    const recess = new THREE.CircleGeometry(0.031, 28)

    // diagonal glass sheen
    const sc = document.createElement('canvas')
    sc.width = 64
    sc.height = 64
    const g = sc.getContext('2d')!
    const grad = g.createLinearGradient(0, 0, 64, 64)
    grad.addColorStop(0, 'rgba(255,255,255,0)')
    grad.addColorStop(0.38, 'rgba(255,255,255,0)')
    grad.addColorStop(0.46, 'rgba(255,255,255,0.55)')
    grad.addColorStop(0.52, 'rgba(255,255,255,0.12)')
    grad.addColorStop(0.62, 'rgba(255,255,255,0.3)')
    grad.addColorStop(0.68, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
    const sheenTex = new THREE.CanvasTexture(sc)
    return { ctx: c.getContext('2d')!, screen, body, bezel, recess, sheenTex }
  }, [])
  useEffect(
    () => () => {
      res.screen.dispose()
      res.body.dispose()
      res.bezel.dispose()
      res.recess.dispose()
      res.sheenTex.dispose()
    },
    [res],
  )
  useFrame(() => {
    draw(res.ctx, clock.t)
    res.screen.needsUpdate = true
    // the sheen fades out before the flat DOM menu takes over the screen
    if (sheen.current) sheen.current.opacity = 0.16 * (1 - Math.min(1, Math.max(0, (clock.t - 6.5) / 0.6)))
  })

  const abAngle = 0.5
  return (
    <group position={GB_POS} rotation={[GB_TILT, 0, 0]}>
      <Merge>
      <mesh geometry={res.body} material={k.mat.gbBody} castShadow receiveShadow />
      {/* top groove line + power switch + cartridge peeking out of the top */}
      <RBox p={[0, 0.142, FZ + 0.0003]} s={[0.19, 0.0016, 0.001]} rad={0.0005} seg={1} m="gbBack" />
      <RBox p={[-0.062, 0.161, 0.006]} s={[0.026, 0.006, 0.01]} rad={0.002} m="gbPill" />
      <RBox p={[0, 0.152, -0.013]} s={[0.15, 0.06, 0.016]} rad={0.004} m="cart" cast />
      {[0, 1, 2, 3].map((i) => (
        <RBox key={i} p={[-0.045 + i * 0.03, 0.181, -0.013]} s={[0.018, 0.002, 0.017]} rad={0.0007} seg={1} m="gbBack" />
      ))}
      <mesh position={[0, 0.15, -0.0215]} rotation={[0, Math.PI, 0]} material={k.mat.cartLabel}>
        <planeGeometry args={[0.11, 0.05]} />
      </mesh>
      {/* side wheels: contrast (left) and volume (right) */}
      <mesh position={[-0.1, 0.07, 0]} rotation={[0, 0, Math.PI / 2]} material={k.mat.gbDark}>
        <cylinderGeometry args={[0.012, 0.012, 0.008, 10]} />
      </mesh>
      <mesh position={[0.1, -0.075, 0]} rotation={[0, 0, Math.PI / 2]} material={k.mat.gbDark}>
        <cylinderGeometry args={[0.012, 0.012, 0.008, 10]} />
      </mesh>

      {/* screen bezel, stripes, power LED, live screen, glass sheen */}
      <mesh geometry={res.bezel} material={k.mat.gbBezel} position={[0, 0.062, FZ + 0.0006]} />
      <mesh position={[0, 0.119, FZ + 0.0009]}>
        <planeGeometry args={[0.15, 0.0018]} />
        <meshBasicMaterial color="#8c1d4e" />
      </mesh>
      <mesh position={[0, 0.1155, FZ + 0.0009]}>
        <planeGeometry args={[0.15, 0.0018]} />
        <meshBasicMaterial color="#2c2f86" />
      </mesh>
      <mesh position={[-0.072, 0.075, FZ + 0.001]}>
        <circleGeometry args={[0.0042, 12]} />
        <meshBasicMaterial color="#ff2a3a" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.06, FZ + 0.0012]}>
        <planeGeometry args={[0.12, 0.108]} />
        <meshBasicMaterial map={res.screen} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.062, FZ + 0.0016]} renderOrder={3}>
        <planeGeometry args={[0.165, 0.128]} />
        <meshBasicMaterial ref={sheen} map={res.sheenTex} transparent opacity={0.16} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* wordmark (matches the boot logo) */}
      <mesh position={[-0.026, -0.012, FZ + 0.0006]}>
        <planeGeometry args={[0.1, 0.019]} />
        <meshBasicMaterial map={k.tex.wordmark} transparent depthWrite={false} color="#c0c4ff" />
      </mesh>

      {/* d-pad in its round recess */}
      <mesh geometry={res.recess} material={k.mat.gbBack} position={[-0.05, -0.065, FZ + 0.0004]} />
      <RBox p={[-0.05, -0.065, FZ + 0.004]} s={[0.054, 0.018, 0.008]} rad={0.003} m="gbDark" cast />
      <RBox p={[-0.05, -0.065, FZ + 0.004]} s={[0.018, 0.054, 0.008]} rad={0.003} m="gbDark" cast />
      <Ball p={[-0.05, -0.065, FZ + 0.0082]} r={0.004} sc={[1, 1, 0.3]} m="gbBack" seg={8} />

      {/* A / B on an angled pill */}
      <RBox p={[0.052, -0.061, FZ + 0.0004]} s={[0.074, 0.032, 0.0012]} rad={0.0005} seg={1} r={[0, 0, abAngle]} m="gbBack" />
      <Ball p={[0.068, -0.052, FZ + 0.002]} r={0.0128} sc={[1, 1, 0.45]} m="gbBtn" seg={18} cast />
      <Ball p={[0.036, -0.07, FZ + 0.002]} r={0.0128} sc={[1, 1, 0.45]} m="gbBtn" seg={18} cast />

      {/* select / start */}
      {[-0.012, 0.018].map((x, i) => (
        <group key={i} position={[x, -0.118, FZ]} rotation={[0, 0, abAngle]}>
          <RBox p={[0, 0, 0.0004]} s={[0.032, 0.012, 0.0012]} rad={0.0005} seg={1} m="gbBack" />
          <RBox p={[0, 0, 0.0028]} s={[0.026, 0.0075, 0.005]} rad={0.0035} m="gbPill" />
        </group>
      ))}

      {/* speaker grille: diagonal slots in the bottom-right corner */}
      {Array.from({ length: 6 }, (_, i) => (
        <RBox key={i} p={[0.044 + i * 0.0069, -0.136 + i * 0.0037, FZ + 0.0003]} s={[0.0038, 0.044, 0.0012]} rad={0.0005} seg={1} r={[0, 0, abAngle]} m="gbSlot" />
      ))}
      </Merge>
    </group>
  )
}
