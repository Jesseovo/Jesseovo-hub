import * as THREE from "three";

export type DoroModelRuntime = {
  nodes: Record<string, THREE.Object3D>;
  meshes: Record<string, THREE.Mesh>;
  sockets: Record<string, THREE.Object3D>;
  colliders: Record<string, unknown>;
  destructionGroups: Record<string, THREE.Object3D[]>;
  clickableParts: THREE.Object3D[];
  materials: {
    ivory: THREE.MeshStandardMaterial;
    peach: THREE.MeshStandardMaterial;
    black: THREE.MeshPhysicalMaterial;
    pink: THREE.MeshStandardMaterial;
  };
};

export type DoroModel = THREE.Group & {
  userData: THREE.Group["userData"] & { sculptRuntime: DoroModelRuntime };
};

function sculptHeadGeometry() {
  const geometry = new THREE.SphereGeometry(1, 72, 52);
  const positions = geometry.attributes.position as THREE.BufferAttribute;

  for (let index = 0; index < positions.count; index += 1) {
    const sourceX = positions.getX(index);
    const sourceY = positions.getY(index);
    const sourceZ = positions.getZ(index);
    const radial = Math.hypot(sourceX, sourceZ);
    const superRadius = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(sourceY), 4)), 0.25);
    const radialScale = radial > 0.0001 ? superRadius / radial : 0;
    const cheekTaper = 1.02 - sourceY * 0.16 + (1 - Math.abs(sourceY)) * 0.035;
    const depthTaper = 1.06 - sourceY * 0.18;
    const frontBulge = sourceZ > 0 ? 1.02 + (1 - sourceY * sourceY) * 0.035 : 1.02;
    const valleyWidth = THREE.MathUtils.clamp(1 - Math.abs(sourceX) / 0.7, 0, 1);
    const valleyHeight = THREE.MathUtils.clamp((sourceY - 0.45) / 0.55, 0, 1);
    const crownValley = valleyWidth * valleyWidth * valleyHeight * valleyHeight * 0.38;

    positions.setXYZ(
      index,
      sourceX * radialScale * 1.84 * cheekTaper,
      sourceY * 1.55 - crownValley,
      sourceZ * radialScale * 1.18 * frontBulge * depthTaper,
    );
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

type EarRing = { y: number; halfWidth: number; halfDepth: number };

const earRings: EarRing[] = [
  { y: -0.61, halfWidth: 0.67, halfDepth: 0.59 },
  { y: -0.3, halfWidth: 0.62, halfDepth: 0.57 },
  { y: 0.15, halfWidth: 0.51, halfDepth: 0.49 },
  { y: 0.62, halfWidth: 0.37, halfDepth: 0.37 },
  { y: 1.08, halfWidth: 0.2, halfDepth: 0.21 },
  { y: 1.44, halfWidth: 0.035, halfDepth: 0.04 },
];

function createEarLoftGeometry() {
  const radialSegments = 24;
  const vertices: number[] = [];
  const indices: number[] = [];

  earRings.forEach((ring) => {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2;
      vertices.push(
        Math.cos(angle) * ring.halfWidth,
        ring.y,
        Math.sin(angle) * ring.halfDepth,
      );
    }
  });

  for (let ringIndex = 0; ringIndex < earRings.length - 1; ringIndex += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const nextSegment = (segment + 1) % radialSegments;
      const lower = ringIndex * radialSegments + segment;
      const lowerNext = ringIndex * radialSegments + nextSegment;
      const upper = (ringIndex + 1) * radialSegments + segment;
      const upperNext = (ringIndex + 1) * radialSegments + nextSegment;
      indices.push(lower, lowerNext, upperNext, lower, upperNext, upper);
    }
  }

  const tipCenter = vertices.length / 3;
  vertices.push(0, earRings[earRings.length - 1].y + 0.015, 0);
  for (let segment = 0; segment < radialSegments; segment += 1) {
    const nextSegment = (segment + 1) % radialSegments;
    const tipRingStart = (earRings.length - 1) * radialSegments;
    indices.push(tipCenter, tipRingStart + segment, tipRingStart + nextSegment);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createInnerEarGeometry() {
  const rows = [
    { y: -0.42, halfWidth: 0.43, frontDepth: 0.555 },
    { y: -0.04, halfWidth: 0.35, frontDepth: 0.475 },
    { y: 0.39, halfWidth: 0.24, frontDepth: 0.365 },
    { y: 0.84, halfWidth: 0.12, frontDepth: 0.205 },
    { y: 1.16, halfWidth: 0.025, frontDepth: 0.09 },
  ];
  const columns = 10;
  const vertices: number[] = [];
  const indices: number[] = [];

  rows.forEach((row) => {
    for (let column = 0; column <= columns; column += 1) {
      const u = (column / columns) * 2 - 1;
      const x = u * row.halfWidth;
      const curvedDepth = Math.sqrt(Math.max(0, 1 - u * u)) * 0.035;
      vertices.push(x, row.y, row.frontDepth + curvedDepth + 0.018);
    }
  });

  for (let row = 0; row < rows.length - 1; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * (columns + 1) + column;
      const b = a + 1;
      const c = (row + 1) * (columns + 1) + column;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createCheekGeometry() {
  const geometry = new THREE.CircleGeometry(1, 48);
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    positions.setZ(index, -0.04 * (x * x + y * y));
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createTube(
  points: THREE.Vector3[],
  radius: number,
  material: THREE.Material,
  name: string,
  tubularSegments = 48,
) {
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, tubularSegments, radius, 12, false),
    material,
  );
  mesh.name = name;
  mesh.userData.explodeWithParent = true;
  return mesh;
}

function registerPart(
  runtime: DoroModelRuntime,
  id: string,
  node: THREE.Object3D,
  mesh: THREE.Mesh | null,
  group: string,
) {
  node.name = id;
  node.userData.sculptComponentId = id;
  runtime.nodes[id] = node;
  if (mesh) {
    mesh.name = id;
    mesh.userData.sculptComponentId = id;
    runtime.meshes[id] = mesh;
    runtime.clickableParts.push(mesh);
  }
  (runtime.destructionGroups[group] ??= []).push(node);
}

function createSocket(parent: THREE.Object3D, name: string, position: THREE.Vector3) {
  const socket = new THREE.Object3D();
  socket.name = name;
  socket.position.copy(position);
  parent.add(socket);
  return socket;
}

export function createDoroMascotHeadModel(): DoroModel {
  const ivory = new THREE.MeshStandardMaterial({
    color: 0xf3eee1,
    roughness: 0.62,
    metalness: 0,
  });
  const peach = new THREE.MeshStandardMaterial({
    color: 0xf2c680,
    roughness: 0.66,
    metalness: 0,
  });
  const black = new THREE.MeshPhysicalMaterial({
    color: 0x0b0b0b,
    roughness: 0.32,
    metalness: 0,
    clearcoat: 0.42,
    clearcoatRoughness: 0.24,
  });
  const pink = new THREE.MeshStandardMaterial({
    color: 0xf1b2b8,
    roughness: 0.72,
    metalness: 0,
  });

  const root = new THREE.Group() as DoroModel;
  root.name = "doroRoot";
  const runtime: DoroModelRuntime = {
    nodes: { root },
    meshes: {},
    sockets: {},
    colliders: {
      headShell: { type: "ellipsoid", center: [0, -0.25, 0], radii: [1.84, 1.55, 1.18] },
      leftEar: { type: "ellipsoid", center: [-0.98, 1.76, -0.08], radii: [0.67, 1.03, 0.59] },
      rightEar: { type: "ellipsoid", center: [0.98, 1.76, -0.08], radii: [0.67, 1.03, 0.59] },
    },
    destructionGroups: {},
    clickableParts: [],
    materials: { ivory, peach, black, pink },
  };

  const headPivot = new THREE.Group();
  headPivot.name = "headPivot";
  root.add(headPivot);
  runtime.nodes.headPivot = headPivot;

  const headShell = new THREE.Mesh(sculptHeadGeometry(), ivory);
  headShell.position.y = -0.25;
  headShell.castShadow = true;
  headShell.receiveShadow = true;
  headPivot.add(headShell);
  registerPart(runtime, "headShell", headShell, headShell, "head-core");

  const earAssemblies = new THREE.Group();
  earAssemblies.name = "earAssemblies";
  headPivot.add(earAssemblies);
  registerPart(runtime, "earAssemblies", earAssemblies, null, "ear-system");

  const outerEarGeometry = createEarLoftGeometry();
  const innerEarGeometry = createInnerEarGeometry();
  ([-1, 1] as const).forEach((side) => {
    const key = side < 0 ? "left" : "right";
    const earPivot = new THREE.Group();
    earPivot.position.set(side * 0.98, 1.34, -0.08);
    earPivot.rotation.z = -side * 0.18;
    earAssemblies.add(earPivot);

    const outer = new THREE.Mesh(outerEarGeometry, ivory);
    outer.castShadow = true;
    outer.receiveShadow = true;
    earPivot.add(outer);
    registerPart(runtime, `${key}Ear`, earPivot, outer, "outer-ear");

    const inner = new THREE.Mesh(innerEarGeometry, peach);
    inner.position.set(0, 0.01, 0);
    inner.castShadow = true;
    inner.userData.explodeWithParent = true;
    earPivot.add(inner);
    registerPart(runtime, `${key}InnerEar`, inner, inner, "inner-ear");
  });

  const eyeAssemblies = new THREE.Group();
  eyeAssemblies.name = "eyeAssemblies";
  headPivot.add(eyeAssemblies);
  registerPart(runtime, "eyeAssemblies", eyeAssemblies, null, "eye-system");

  ([-1, 1] as const).forEach((side) => {
    const key = side < 0 ? "left" : "right";
    const eyePivot = new THREE.Group();
    eyePivot.position.set(side * 0.96, -0.1, 1.18);
    eyeAssemblies.add(eyePivot);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), black);
    eye.scale.set(0.23, 0.31, 0.13);
    eye.castShadow = true;
    eyePivot.add(eye);
    registerPart(runtime, `${key}Eye`, eyePivot, eye, "eye-system");
  });

  const browAssemblies = new THREE.Group();
  browAssemblies.name = "browAssemblies";
  headPivot.add(browAssemblies);
  registerPart(runtime, "browAssemblies", browAssemblies, null, "brow-system");
  const leftBrow = createTube([
    new THREE.Vector3(-1.3, 0.57, 1.05),
    new THREE.Vector3(-1.1, 0.64, 1.13),
    new THREE.Vector3(-0.86, 0.64, 1.18),
    new THREE.Vector3(-0.62, 0.57, 1.18),
  ], 0.075, black, "leftBrow", 40);
  const rightBrow = createTube([
    new THREE.Vector3(0.62, 0.57, 1.18),
    new THREE.Vector3(0.86, 0.64, 1.18),
    new THREE.Vector3(1.1, 0.64, 1.13),
    new THREE.Vector3(1.3, 0.57, 1.05),
  ], 0.075, black, "rightBrow", 40);
  browAssemblies.add(leftBrow, rightBrow);
  runtime.meshes.leftBrow = leftBrow;
  runtime.meshes.rightBrow = rightBrow;
  runtime.clickableParts.push(leftBrow, rightBrow);

  const cheekPads = new THREE.Group();
  cheekPads.name = "cheekPads";
  headPivot.add(cheekPads);
  registerPart(runtime, "cheekPads", cheekPads, null, "cheek-system");
  const cheekGeometry = createCheekGeometry();
  ([-1, 1] as const).forEach((side) => {
    const cheek = new THREE.Mesh(cheekGeometry, pink);
    cheek.name = side < 0 ? "leftCheek" : "rightCheek";
    cheek.position.set(side * 1.08, -0.72, 1.35);
    cheek.scale.set(0.4, 0.19, 1);
    cheek.userData.explodeWithParent = true;
    cheekPads.add(cheek);
    runtime.meshes[cheek.name] = cheek;
    runtime.clickableParts.push(cheek);
  });

  runtime.sockets.headOrigin = createSocket(headPivot, "headOrigin", new THREE.Vector3(0, -0.25, 0));
  runtime.sockets.hitSocket = createSocket(headPivot, "hitSocket", new THREE.Vector3(0, -0.2, 1.28));
  runtime.sockets.leftEarRoot = createSocket(runtime.nodes.leftEar, "leftEarRoot", new THREE.Vector3(0, -0.58, 0));
  runtime.sockets.rightEarRoot = createSocket(runtime.nodes.rightEar, "rightEarRoot", new THREE.Vector3(0, -0.58, 0));

  root.userData.sculptRuntime = runtime;
  root.userData.approximationNotes = [
    "Front, angled-side and back references establish the broad rear shell and thick tapered ears; exact orthographic depth remains estimated because the middle view is angled.",
    "The mouth shown in the three-view sheet is intentionally omitted per the user's art direction.",
  ];
  return root;
}

export function disposeDoroMascotHeadModel(model: DoroModel) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
    meshMaterials.forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}
