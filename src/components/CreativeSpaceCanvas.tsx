"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";

import type {
  CreativeSceneSnapshot,
  CreativeSpaceCanvasProps,
  CreativeIntroPhase,
} from "@/types/creative-runtime";

type LiveProps = Omit<CreativeSpaceCanvasProps, "items">;

type SceneItem = {
  item: CreativeSpaceCanvasProps["items"][number] | null;
  index: number;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  material: THREE.MeshBasicMaterial;
  orderly: THREE.Vector3;
  random: THREE.Vector3;
  basePos: THREE.Vector3;
  baseScale: THREE.Vector3;
  aspect: number;
  ready: boolean;
  failed: boolean;
  loadStarted: boolean;
  startLoad: () => void;
  texture: THREE.Texture | null;
  video: HTMLVideoElement | null;
  hemiPaused: boolean;
  expand: number;
  collapse: number;
  explode: number;
  stackZ: number;
  circleStartScale: THREE.Vector2;
  explosionStartPos: THREE.Vector3;
  explosionStartScale: THREE.Vector2;
};

type RuntimeWindow = Window & {
  __cameFromInAppNav?: boolean;
  __creativeSpaceExploded?: boolean;
  __loadingComplete?: boolean;
  __pageContentReady?: boolean;
  __playScrubTick?: (options: { rate: number; volume: number }) => void;
};

const TOKENS = {
  radiusPx: 250,
  desktopPlanePx: 82,
  mobilePlanePx: 60,
  dragSpeed: 0.001,
  wheelSpeed: 0.0002,
  friction: 0.94,
  smoothing: 0.11,
  autoSpeed: 0.001,
  expandDuration: 0.8,
  push: 1.8,
  scrubTickStep: 0.06,
  scrubMinGap: 0.035,
  scrubMinDelta: 0.0006,
  scrubSpeedRef: 0.03,
  scrubSpeedSmooth: 0.2,
  scrubVolume: 0.8,
  scrubRateMin: 0.92,
  scrubRateMax: 1.12,
  scrubJitter: 0.02,
  preloaderSizePx: 90,
  orbitRadiusPx: 240,
  logoSizePx: 70,
  introStagger: 0.1,
  introFadeDuration: 1,
  revealDelay: 2,
  maxGateWait: 30,
  fastSpinDelay: 1.3,
  fastSpinRampDuration: 1,
  fastSpinMultiplier: 7.3,
  collapseDelay: 0.8,
  collapseDuration: 1.25,
  collapseStagger: 0.05,
  stackGapPx: 1.5,
  explodeDelay: 0.2,
  explodeDuration: 1,
  explodeOvershoot: 0.1,
} as const;

function orderlyPoint(index: number, count: number) {
  const y = index * (2 / count) - 1 + 1 / count;
  const radial = Math.sqrt(Math.max(0, 1 - y * y));
  const phi = Math.PI * (3 - Math.sqrt(5)) * index;
  return new THREE.Vector3(Math.cos(phi) * radial, y, Math.sin(phi) * radial);
}

function randomPoint(index: number) {
  const h1 = 43758.5453 * Math.sin(12.9898 * index);
  const h2 = 43758.5453 * Math.sin(78.233 * index);
  const theta = 2 * Math.PI * (h1 - Math.floor(h1));
  const phi = Math.acos(2 * (h2 - Math.floor(h2)) - 1);
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi),
  );
}

function cropTexture(texture: THREE.Texture, width: number, height: number) {
  if (!width || !height) return;
  const aspect = width / height;
  const target = 0.75;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  if (aspect > target) {
    const repeatX = target / aspect;
    texture.repeat.set(repeatX, 1);
    texture.offset.set((1 - repeatX) / 2, 0);
  } else {
    const repeatY = aspect / target;
    texture.repeat.set(1, repeatY);
    texture.offset.set(0, (1 - repeatY) / 2);
  }
  texture.needsUpdate = true;
}

function sameSnapshot(a: CreativeSceneSnapshot, b: CreativeSceneSnapshot) {
  return a.hoveredIndex === b.hoveredIndex
    && a.expandedIndex === b.expandedIndex
    && a.overExpandedPlane === b.overExpandedPlane
    && a.openPlaneWidthPx === b.openPlaneWidthPx
    && a.introPhase === b.introPhase
    && a.progress === b.progress;
}

export default function CreativeSpaceCanvas(props: CreativeSpaceCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<LiveProps>({
    overviewOpen: props.overviewOpen,
    reservedBottomPx: props.reservedBottomPx,
    onSnapshotChange: props.onSnapshotChange,
    onNavigateCase: props.onNavigateCase,
    onToggleOverview: props.onToggleOverview,
  });

  useEffect(() => {
    liveRef.current = {
      overviewOpen: props.overviewOpen,
      reservedBottomPx: props.reservedBottomPx,
      onSnapshotChange: props.onSnapshotChange,
      onNavigateCase: props.onNavigateCase,
      onToggleOverview: props.onToggleOverview,
    };
  }, [
    props.onNavigateCase,
    props.onSnapshotChange,
    props.onToggleOverview,
    props.overviewOpen,
    props.reservedBottomPx,
  ]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const runtimeWindow = window as RuntimeWindow;
    const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.z = 12;
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !coarse,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    const dprSteps = coarse ? [3, 2.5, 2, 1.5] : [2];
    let dprIndex = 0;
    const targetDpr = () => Math.min(window.devicePixelRatio || 1, dprSteps[dprIndex]);
    renderer.setPixelRatio(targetDpr());
    renderer.setClearColor(0xffffff, 0);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
    host.replaceChildren(renderer.domElement);

    const sphere = new THREE.Group();
    const introGroup = new THREE.Group();
    scene.add(sphere, introGroup);
    const geometry = new THREE.PlaneGeometry(1, 1);
    const textureLoader = new THREE.TextureLoader();
    const count = Math.max(props.items.length, 18);
    const entries: SceneItem[] = [];
    const mediaCleanups: Array<() => void> = [];
    const timers: number[] = [];
    let frameId = 0;
    let snapshotFrame = 0;
    let disposed = false;
    let width = 1;
    let height = 1;
    let phase: CreativeIntroPhase = "loading";
    let progress = 1;
    let hoveredIndex: number | null = null;
    let expandedIndex: number | null = null;
    let overExpandedPlane = false;
    let openPlaneWidthPx: number | null = null;
    let lastSnapshot: CreativeSceneSnapshot | null = null;
    let circleAngle = 0;
    const introState = { spinRamp: 0 };
    let interactive = false;
    let interacted = false;
    let dragging = false;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let pointerLastX = 0;
    let pointerLastY = 0;
    let cumulativeTravel = 0;
    let pinchDistance = 0;
    const activePointers = new Map<number, THREE.Vector2>();
    let targetYaw = 0;
    let targetPitch = 0;
    let smoothYaw = 0;
    let smoothPitch = 0;
    let lastYaw = 0;
    let lastPitch = 0;
    let velocityYaw = 0;
    let velocityPitch = 0;
    let scrubX = 0;
    let scrubY = 0;
    let scrubMarkX = 0;
    let scrubMarkY = 0;
    let scrubSpeed = 0;
    let lastScrubAt = 0;
    let lastScrubMotionAt = 0;
    let fpsStartedAt = 0;
    let fpsFrames = 0;
    let lowFpsSamples = 0;
    let lastHemiCheck = 0;
    const rotation = new THREE.Quaternion();
    const deltaQuaternion = new THREE.Quaternion();
    const inverseRotation = new THREE.Quaternion();
    const axisY = new THREE.Vector3(0, 1, 0);
    const axisX = new THREE.Vector3(1, 0, 0);
    const tiltRadians = THREE.MathUtils.degToRad(23);
    const autoAxis = new THREE.Vector3(Math.sin(tiltRadians), Math.cos(tiltRadians), 0).normalize();
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const scratch = new THREE.Vector3();
    const desiredCenter = new THREE.Vector3();

    const worldPerPixel = () => (
      (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / Math.max(1, height)
    );
    const viewportFactor = () => (width >= 1025 && width <= 1440 ? 0.8 : 1);
    const planePixels = () => (width <= 640 ? TOKENS.mobilePlanePx : TOKENS.desktopPlanePx * viewportFactor());

    const queueSnapshot = () => {
      if (snapshotFrame) return;
      snapshotFrame = requestAnimationFrame(() => {
        snapshotFrame = 0;
        const snapshot: CreativeSceneSnapshot = {
          hoveredIndex,
          expandedIndex,
          overExpandedPlane,
          openPlaneWidthPx,
          introPhase: phase,
          progress,
        };
        if (!lastSnapshot || !sameSnapshot(lastSnapshot, snapshot)) {
          lastSnapshot = snapshot;
          liveRef.current.onSnapshotChange(snapshot);
        }
      });
    };

    const setPhase = (next: CreativeIntroPhase) => {
      if (phase === next) return;
      phase = next;
      queueSnapshot();
    };

    const updateProgress = () => {
      const loaded = entries.filter((entry) => entry.ready || entry.failed).length;
      progress = interactive ? 100 : Math.max(1, Math.min(99, Math.round(100 * loaded / Math.max(1, entries.length))));
      queueSnapshot();
    };

    const updateLayout = () => {
      const factor = viewportFactor();
      const planeWorld = planePixels() * worldPerPixel();
      const desktopRadius = TOKENS.radiusPx * factor * worldPerPixel();
      const mobileRadius = Math.max(0, ((width - 48) / 2) * worldPerPixel() - planeWorld / 2);
      const radius = width <= 640 ? mobileRadius : desktopRadius;
      for (const entry of entries) {
        const point = entry.orderly.clone().lerp(entry.random, 0).normalize();
        entry.basePos.copy(point).multiplyScalar(radius);
        entry.baseScale.set(planeWorld * 0.75, planeWorld, 1);
        if (interactive && entry.expand < 0.001) entry.mesh.scale.copy(entry.baseScale);
      }
    };

    const resize = () => {
      const nextWidth = renderer.domElement.clientWidth || host.clientWidth || window.innerWidth;
      const nextHeight = renderer.domElement.clientHeight || host.clientHeight || window.innerHeight;
      if (!nextWidth || !nextHeight) return;
      width = nextWidth;
      height = nextHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      updateLayout();
      const preloaderWorld = TOKENS.preloaderSizePx * worldPerPixel();
      const preloaderAspect = preloaderMesh.userData.aspect as number || 1;
      preloaderMesh.scale.set(preloaderAspect >= 1 ? preloaderWorld : preloaderWorld * preloaderAspect, preloaderAspect >= 1 ? preloaderWorld / preloaderAspect : preloaderWorld, 1);
    };

    for (let index = 0; index < count; index += 1) {
      const item = props.items.length ? props.items[index % props.items.length] : null;
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      sphere.add(mesh);
      const entry: SceneItem = {
        item,
        index,
        mesh,
        material,
        orderly: orderlyPoint(index, count),
        random: randomPoint(index),
        basePos: new THREE.Vector3(),
        baseScale: new THREE.Vector3(1, 1, 1),
        aspect: 0.75,
        ready: item === null,
        failed: false,
        loadStarted: false,
        startLoad: () => {},
        texture: null,
        video: null,
        hemiPaused: false,
        expand: 0,
        collapse: 0,
        explode: 0,
        stackZ: 0,
        circleStartScale: new THREE.Vector2(0.01, 0.01),
        explosionStartPos: new THREE.Vector3(),
        explosionStartScale: new THREE.Vector2(0.01, 0.01),
      };
      entries.push(entry);
      if (!item) continue;

      if (item.type === "video") {
        const video = document.createElement("video");
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = "none";
        video.crossOrigin = "anonymous";
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        const texture = new THREE.VideoTexture(video);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        entry.video = video;
        let videoShown = false;
        const metadata = () => cropTexture(texture, video.videoWidth, video.videoHeight);
        video.addEventListener("loadedmetadata", metadata);
        mediaCleanups.push(() => video.removeEventListener("loadedmetadata", metadata));
        const showVideo = () => {
          if (disposed) return;
          videoShown = true;
          if (entry.texture && entry.texture !== texture) entry.texture.dispose();
          entry.texture = texture;
          material.map = texture;
          material.needsUpdate = true;
        };
        video.addEventListener("canplay", showVideo, { once: true });
        const posterSrc = item.poster;
        if (posterSrc) {
          textureLoader.load(
            posterSrc,
            (posterTexture) => {
              if (disposed) { posterTexture.dispose(); return; }
              if (videoShown) { posterTexture.dispose(); return; }
              posterTexture.colorSpace = THREE.SRGBColorSpace;
              posterTexture.minFilter = THREE.LinearFilter;
              posterTexture.magFilter = THREE.LinearFilter;
              const image = posterTexture.image as { width?: number; height?: number };
              cropTexture(posterTexture, image.width ?? 0, image.height ?? 0);
              entry.texture = posterTexture;
              material.map = posterTexture;
              material.needsUpdate = true;
              entry.ready = true;
              updateProgress();
            },
            undefined,
            () => { entry.failed = true; updateProgress(); },
          );
        }
        mediaCleanups.push(() => {
          video.removeEventListener("canplay", showVideo);
        });
        entry.startLoad = () => {
          if (entry.loadStarted) return;
          entry.loadStarted = true;
          video.src = item.src;
          video.preload = "metadata";
          try { video.load(); } catch { /* browsers may reject an eager load */ }
          video.play().catch(() => {});
          if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) showVideo();
        };
      } else {
        entry.startLoad = () => {
          if (entry.loadStarted) return;
          entry.loadStarted = true;
          textureLoader.load(
            item.src,
            (texture) => {
              if (disposed) { texture.dispose(); return; }
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.minFilter = THREE.LinearFilter;
              texture.magFilter = THREE.LinearFilter;
              const image = texture.image as { width?: number; height?: number };
              cropTexture(texture, image.width ?? 0, image.height ?? 0);
              entry.texture = texture;
              material.map = texture;
              material.needsUpdate = true;
              entry.ready = true;
              updateProgress();
            },
            undefined,
            () => { entry.failed = true; updateProgress(); },
          );
        };
      }
    }

    const preloaderVideo = document.createElement("video");
    preloaderVideo.src = "/assets/videos/Preloader.mp4";
    preloaderVideo.loop = false;
    preloaderVideo.muted = true;
    preloaderVideo.playsInline = true;
    preloaderVideo.preload = "auto";
    preloaderVideo.crossOrigin = "anonymous";
    preloaderVideo.setAttribute("playsinline", "");
    preloaderVideo.setAttribute("webkit-playsinline", "");
    const preloaderTexture = new THREE.VideoTexture(preloaderVideo);
    preloaderTexture.colorSpace = THREE.SRGBColorSpace;
    preloaderTexture.minFilter = THREE.LinearFilter;
    preloaderTexture.magFilter = THREE.LinearFilter;
    const preloaderMaterial = new THREE.MeshBasicMaterial({
      map: preloaderTexture,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false,
    });
    const preloaderMesh = new THREE.Mesh(geometry, preloaderMaterial);
    preloaderMesh.renderOrder = 1000;
    preloaderMesh.userData.aspect = 1;
    introGroup.add(preloaderMesh);
    const preloaderMetadata = () => {
      preloaderMesh.userData.aspect = preloaderVideo.videoWidth / Math.max(1, preloaderVideo.videoHeight);
      resize();
    };
    preloaderVideo.addEventListener("loadedmetadata", preloaderMetadata);
    mediaCleanups.push(() => preloaderVideo.removeEventListener("loadedmetadata", preloaderMetadata));

    updateLayout();
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    window.addEventListener("resize", resize);

    let introMediaStarted = false;
    const startIntroMedia = () => {
      if (introMediaStarted) return;
      introMediaStarted = true;
      entries.slice(0, 10).forEach((entry) => entry.startLoad());
    };
    const canStartMedia = () => startIntroMedia();
    preloaderVideo.addEventListener("playing", canStartMedia, { once: true });
    preloaderVideo.addEventListener("canplay", canStartMedia, { once: true });
    preloaderVideo.addEventListener("error", canStartMedia, { once: true });
    mediaCleanups.push(() => {
      preloaderVideo.removeEventListener("playing", canStartMedia);
      preloaderVideo.removeEventListener("canplay", canStartMedia);
      preloaderVideo.removeEventListener("error", canStartMedia);
    });
    preloaderVideo.play().catch(() => {});
    timers.push(window.setTimeout(startIntroMedia, 1200));

    const circlePosition = (slot: number, target: THREE.Vector3) => {
      const mobileFactor = width <= 640 ? 0.75 : 1;
      const radius = TOKENS.orbitRadiusPx * mobileFactor * worldPerPixel();
      const angle = THREE.MathUtils.degToRad(-90 + slot * 36) + circleAngle;
      target.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    };

    const makeInteractive = () => {
      setPhase("interactive");
      interactive = true;
      progress = 100;
      introGroup.visible = false;
      entries.filter((entry) => entry.item?.type === "image").forEach((entry) => entry.startLoad());
      entries.forEach((entry) => {
        gsap.killTweensOf(entry);
        entry.expand = 0;
        entry.mesh.position.copy(entry.basePos);
        entry.mesh.scale.copy(entry.baseScale);
        entry.material.opacity = 1;
        entry.mesh.renderOrder = 0;
      });
      runtimeWindow.__loadingComplete = true;
      runtimeWindow.__pageContentReady = true;
      window.dispatchEvent(new Event("loading:complete"));
      requestAnimationFrame(() => window.dispatchEvent(new Event("page-content-ready")));
      queueSnapshot();
    };

    const explode = () => {
      setPhase("explode");
      entries.forEach((entry) => {
        entry.explosionStartPos.copy(entry.mesh.position);
        entry.explosionStartScale.set(entry.mesh.scale.x, entry.mesh.scale.y);
        entry.explode = 0;
        entry.mesh.visible = true;
        entry.material.opacity = 1;
        gsap.to(entry, {
          explode: 1,
          duration: TOKENS.explodeDuration,
          ease: "power3.out",
          overwrite: true,
        });
      });
      timers.push(window.setTimeout(() => {
        runtimeWindow.__creativeSpaceExploded = true;
        window.dispatchEvent(new CustomEvent("creativespace:explode"));
        makeInteractive();
      }, TOKENS.explodeDuration * 1000));
    };

    const collapse = () => {
      setPhase("collapse");
      gsap.to(preloaderMaterial, {
        opacity: 0,
        duration: TOKENS.collapseDuration * 0.6,
        ease: "power2.inOut",
      });
      entries.slice(0, 10).forEach((entry, index) => {
        entry.stackZ = index * TOKENS.stackGapPx * worldPerPixel();
        entry.mesh.renderOrder = 20 + index;
        entry.circleStartScale.set(entry.mesh.scale.x, entry.mesh.scale.y);
        gsap.to(entry, {
          collapse: 1,
          duration: TOKENS.collapseDuration,
          delay: index * TOKENS.collapseStagger,
          ease: "power2.inOut",
        });
      });
      const lastCollapse = TOKENS.collapseDuration + 9 * TOKENS.collapseStagger;
      timers.push(window.setTimeout(explode, (lastCollapse + TOKENS.explodeDelay) * 1000));
    };

    const startSpin = () => {
      setPhase("spin");
      gsap.to(introState, {
        spinRamp: 1,
        duration: TOKENS.fastSpinRampDuration,
        ease: "power2.in",
      });
      timers.push(window.setTimeout(collapse, TOKENS.collapseDelay * 1000));
    };

    const revealCircle = () => {
      runtimeWindow.__loadingComplete = true;
      window.dispatchEvent(new Event("loading:complete"));
      progress = 100;
      setPhase("circle");
      entries.forEach((entry) => {
        entry.mesh.visible = false;
        entry.material.opacity = 0;
        entry.mesh.scale.setScalar(0.01);
      });
      entries.slice(0, 10).forEach((entry, index) => {
        entry.mesh.visible = true;
        sphere.remove(entry.mesh);
        introGroup.add(entry.mesh);
        circlePosition(index, entry.mesh.position);
        const logoWorld = TOKENS.logoSizePx * (width <= 640 ? 0.75 : 1) * worldPerPixel();
        gsap.fromTo(entry.material, { opacity: 0 }, {
          opacity: 1,
          duration: TOKENS.introFadeDuration,
          delay: index * TOKENS.introStagger,
          ease: "power3.out",
        });
        gsap.fromTo(entry.mesh.scale, { x: 0.01, y: 0.01 }, {
          x: logoWorld * 0.75,
          y: logoWorld,
          duration: TOKENS.introFadeDuration,
          delay: index * TOKENS.introStagger,
          ease: "back.out(1.7)",
        });
      });
      timers.push(window.setTimeout(startSpin, TOKENS.fastSpinDelay * 1000));
    };

    const introBeganAt = performance.now();
    const gate = window.setInterval(() => {
      const elapsed = (performance.now() - introBeganAt) / 1000;
      const allReady = entries.slice(0, 10).every((entry) => entry.ready || entry.failed);
      if (elapsed >= TOKENS.revealDelay && (allReady || elapsed >= TOKENS.maxGateWait)) {
        window.clearInterval(gate);
        revealCircle();
      }
    }, 100);

    if (runtimeWindow.__cameFromInAppNav) {
      window.clearInterval(gate);
      startIntroMedia();
      makeInteractive();
    }

    const intersectAt = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const meshes = entries.map((entry) => entry.mesh);
      const intersection = expandedIndex === null
        ? raycaster.intersectObjects(meshes, false)[0]
        : raycaster.intersectObject(entries[expandedIndex].mesh, false)[0];
      const nextHovered = intersection
        ? entries.findIndex((entry) => entry.mesh === intersection.object)
        : null;
      hoveredIndex = nextHovered !== null && nextHovered >= 0 ? nextHovered : null;
      overExpandedPlane = expandedIndex !== null && hoveredIndex === expandedIndex;
      if (expandedIndex !== null) host.style.cursor = overExpandedPlane ? "pointer" : "default";
      else if (hoveredIndex !== null) host.style.cursor = "pointer";
      else {
        const x = clientX - rect.left - rect.width / 2;
        const y = clientY - rect.top - rect.height / 2;
        const radius = width <= 640 ? Math.max(0, (width - 48) / 2) : TOKENS.radiusPx * viewportFactor();
        host.style.cursor = Math.hypot(x, y) <= radius ? "grab" : "default";
      }
      queueSnapshot();
      return hoveredIndex;
    };

    const addMotion = (x: number, y: number) => {
      velocityYaw += x;
      velocityPitch += y;
      scrubX += x;
      scrubY += y;
    };

    const onWheel = (event: WheelEvent) => {
      if (!interactive || expandedIndex !== null) return;
      event.preventDefault();
      interacted = true;
      addMotion(event.deltaY * TOKENS.wheelSpeed, event.deltaX * TOKENS.wheelSpeed);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!interactive) return;
      activePointers.set(event.pointerId, new THREE.Vector2(event.clientX, event.clientY));
      if (activePointers.size === 2) {
        const pair = [...activePointers.values()];
        pinchDistance = pair[0].distanceTo(pair[1]);
        dragging = false;
        return;
      }
      dragging = true;
      interacted = true;
      pointerStartX = pointerLastX = event.clientX;
      pointerStartY = pointerLastY = event.clientY;
      cumulativeTravel = 0;
      host.style.cursor = "grabbing";
      renderer.domElement.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!interactive) return;
      intersectAt(event.clientX, event.clientY);
      if (activePointers.has(event.pointerId)) activePointers.set(event.pointerId, new THREE.Vector2(event.clientX, event.clientY));
      if (activePointers.size >= 2) {
        const pair = [...activePointers.values()];
        const distance = pair[0].distanceTo(pair[1]);
        const delta = pinchDistance - distance;
        pinchDistance = distance;
        if (expandedIndex === null) addMotion(delta * TOKENS.wheelSpeed, 0);
        return;
      }
      if (!dragging) return;
      const deltaX = event.clientX - pointerLastX;
      const deltaY = event.clientY - pointerLastY;
      pointerLastX = event.clientX;
      pointerLastY = event.clientY;
      cumulativeTravel += Math.hypot(deltaX, deltaY);
      if (expandedIndex === null) addMotion(deltaX * TOKENS.dragSpeed, deltaY * TOKENS.dragSpeed);
    };

    const collapseExpanded = () => {
      if (expandedIndex === null) return;
      gsap.to(entries[expandedIndex], {
        expand: 0,
        duration: TOKENS.expandDuration,
        ease: "power4.out",
        overwrite: true,
      });
      expandedIndex = null;
      hoveredIndex = null;
      overExpandedPlane = false;
      queueSnapshot();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!interactive) return;
      activePointers.delete(event.pointerId);
      if (activePointers.size === 1) {
        const remaining = [...activePointers.values()][0];
        pointerLastX = remaining.x;
        pointerLastY = remaining.y;
      }
      dragging = false;
      const displacement = Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY);
      if (displacement < 6 && cumulativeTravel < 10) {
        const clicked = intersectAt(event.clientX, event.clientY);
        if (expandedIndex !== null) {
          if (clicked === expandedIndex && width > 1024) {
            const item = entries[expandedIndex].item;
            if (item?.caseStudy && item.slug) liveRef.current.onNavigateCase(item.slug);
            else liveRef.current.onToggleOverview();
          } else collapseExpanded();
        } else if (clicked !== null) {
          expandedIndex = clicked;
          gsap.to(entries[clicked], {
            expand: 1,
            duration: TOKENS.expandDuration,
            ease: "power4.out",
            overwrite: true,
          });
          queueSnapshot();
        }
      }
      if (event.pointerType === "touch") host.style.cursor = "default";
      else intersectAt(event.clientX, event.clientY);
    };

    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    const playScrub = (now: number) => {
      const speed = Math.abs(scrubX) + Math.abs(scrubY);
      scrubSpeed += (speed - scrubSpeed) * TOKENS.scrubSpeedSmooth;
      if (speed > TOKENS.scrubMinDelta) {
        if (now - lastScrubMotionAt > 200) {
          scrubMarkX = -Math.sign(scrubX) * TOKENS.scrubTickStep;
          scrubMarkY = -Math.sign(scrubY) * TOKENS.scrubTickStep;
        }
        lastScrubMotionAt = now;
        if (
          Math.max(Math.abs(scrubX - scrubMarkX), Math.abs(scrubY - scrubMarkY)) >= TOKENS.scrubTickStep
          && now - lastScrubAt >= TOKENS.scrubMinGap * 1000
          && runtimeWindow.__playScrubTick
        ) {
          scrubMarkX = scrubX;
          scrubMarkY = scrubY;
          lastScrubAt = now;
          const intensity = Math.min(1, scrubSpeed / TOKENS.scrubSpeedRef);
          const rate = TOKENS.scrubRateMin
            + (TOKENS.scrubRateMax - TOKENS.scrubRateMin) * intensity
            + (Math.random() * 2 - 1) * TOKENS.scrubJitter;
          runtimeWindow.__playScrubTick({ rate, volume: TOKENS.scrubVolume });
        }
      }
      scrubX = 0;
      scrubY = 0;
    };

    const updateCoarseDpr = (now: number) => {
      if (!coarse || dprIndex >= dprSteps.length - 1) return;
      if (!fpsStartedAt || now - fpsStartedAt > 2000) {
        fpsStartedAt = now;
        fpsFrames = 0;
        return;
      }
      fpsFrames += 1;
      if (now - fpsStartedAt < 1000) return;
      const fps = fpsFrames * 1000 / (now - fpsStartedAt);
      fpsStartedAt = now;
      fpsFrames = 0;
      lowFpsSamples = fps < 45 ? lowFpsSamples + 1 : 0;
      if (lowFpsSamples >= 2) {
        lowFpsSamples = 0;
        dprIndex += 1;
        renderer.setPixelRatio(targetDpr());
        renderer.setSize(width, height, false);
      }
    };

    const render = (now: number) => {
      if (disposed) return;
      frameId = requestAnimationFrame(render);
      updateCoarseDpr(now);

      if (!interactive) {
        if (phase === "circle" || phase === "spin" || phase === "collapse") {
          circleAngle += THREE.MathUtils.degToRad(0.5 * (1 + (TOKENS.fastSpinMultiplier - 1) * introState.spinRamp));
          entries.slice(0, 10).forEach((entry, index) => {
            circlePosition(index, scratch);
            if (phase === "collapse") {
              entry.mesh.position.set(
                scratch.x * (1 - entry.collapse),
                scratch.y * (1 - entry.collapse),
                entry.stackZ * entry.collapse,
              );
              const centerWorld = planePixels() * (120 / 82) * worldPerPixel();
              entry.mesh.scale.set(
                THREE.MathUtils.lerp(entry.circleStartScale.x, centerWorld * 0.75, entry.collapse),
                THREE.MathUtils.lerp(entry.circleStartScale.y, centerWorld, entry.collapse),
                1,
              );
            } else entry.mesh.position.copy(scratch);
          });
        } else if (phase === "explode") {
          for (const entry of entries) {
            if (entry.mesh.parent !== sphere) {
              introGroup.remove(entry.mesh);
              sphere.add(entry.mesh);
            }
            const overshoot = 1 + TOKENS.explodeOvershoot * Math.sin(Math.PI * entry.explode);
            entry.mesh.position.lerpVectors(entry.explosionStartPos, entry.basePos, entry.explode).multiplyScalar(overshoot);
            entry.mesh.scale.set(
              THREE.MathUtils.lerp(entry.explosionStartScale.x, entry.baseScale.x, entry.explode),
              THREE.MathUtils.lerp(entry.explosionStartScale.y, entry.baseScale.y, entry.explode),
              1,
            );
          }
        }
      } else {
        targetYaw += velocityYaw;
        targetPitch += velocityPitch;
        velocityYaw *= TOKENS.friction;
        velocityPitch *= TOKENS.friction;
        smoothYaw += (targetYaw - smoothYaw) * TOKENS.smoothing;
        smoothPitch += (targetPitch - smoothPitch) * TOKENS.smoothing;
        const yawDelta = smoothYaw - lastYaw;
        const pitchDelta = smoothPitch - lastPitch;
        lastYaw = smoothYaw;
        lastPitch = smoothPitch;
        deltaQuaternion.setFromAxisAngle(axisY, yawDelta);
        rotation.premultiply(deltaQuaternion);
        deltaQuaternion.setFromAxisAngle(axisX, pitchDelta);
        rotation.premultiply(deltaQuaternion);
        if (!interacted && expandedIndex === null) {
          deltaQuaternion.setFromAxisAngle(autoAxis, TOKENS.autoSpeed);
          rotation.premultiply(deltaQuaternion);
        }
        rotation.normalize();
        sphere.quaternion.copy(rotation);
        inverseRotation.copy(rotation).invert();
        playScrub(now);

        const maxExpand = entries.reduce((maximum, entry) => Math.max(maximum, entry.expand), 0);
        const reservedWorld = liveRef.current.overviewOpen
          ? liveRef.current.reservedBottomPx * worldPerPixel() * maxExpand
          : 0;
        const availableWorldHeight = Math.max(0, height * worldPerPixel() - reservedWorld);
        const expandedHeight = availableWorldHeight * 0.7;
        const mobileWidthCap = width <= 640 ? (width - 16) * worldPerPixel() : Number.POSITIVE_INFINITY;
        desiredCenter.set(0, reservedWorld / 2, 0).applyQuaternion(inverseRotation);
        const push = 1 + (TOKENS.push - 1) * maxExpand;

        for (const entry of entries) {
          entry.mesh.quaternion.copy(inverseRotation);
          const expanded = entry.expand;
          let targetHeight = expandedHeight;
          let targetWidth = targetHeight * 0.75;
          if (targetWidth > mobileWidthCap) {
            targetWidth = mobileWidthCap;
            targetHeight = targetWidth / 0.75;
          }
          entry.mesh.scale.set(
            THREE.MathUtils.lerp(entry.baseScale.x, targetWidth, expanded),
            THREE.MathUtils.lerp(entry.baseScale.y, targetHeight, expanded),
            1,
          );
          const positionalPush = expanded > 0.0001 ? 1 : push;
          scratch.copy(entry.basePos).multiplyScalar(positionalPush);
          entry.mesh.position.lerpVectors(scratch, desiredCenter, expanded);
          entry.material.opacity = expanded > 0.0001 ? 1 : 1 - maxExpand;
          entry.mesh.renderOrder = expanded > 0.0001 ? 100 : 0;
        }
        const expandedEntry = expandedIndex === null ? null : entries[expandedIndex];
        const nextWidth = expandedEntry
          ? Math.round(expandedEntry.mesh.scale.x / worldPerPixel())
          : null;
        if (nextWidth !== openPlaneWidthPx) {
          openPlaneWidthPx = nextWidth;
          queueSnapshot();
        }

        if (now - lastHemiCheck > 300) {
          lastHemiCheck = now;
          for (const entry of entries) {
            if (!entry.video) continue;
            let shouldPause: boolean;
            if (expandedIndex !== null) shouldPause = entry.index !== expandedIndex;
            else {
              scratch.copy(entry.basePos).applyQuaternion(rotation);
              const normalizedZ = scratch.z / Math.max(0.001, scratch.length());
              shouldPause = entry.hemiPaused ? normalizedZ <= -0.1 : normalizedZ < -0.25;
            }
            if (!shouldPause) entry.startLoad();
            if (!entry.ready) continue;
            if (shouldPause === entry.hemiPaused) continue;
            entry.hemiPaused = shouldPause;
            if (shouldPause) entry.video.pause();
            else entry.video.play().catch(() => {});
          }
        }
      }

      renderer.render(scene, camera);
    };

    queueSnapshot();
    frameId = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      if (snapshotFrame) cancelAnimationFrame(snapshotFrame);
      window.clearInterval(gate);
      timers.forEach((timer) => window.clearTimeout(timer));
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      mediaCleanups.forEach((cleanup) => cleanup());
      gsap.killTweensOf(introState);
      gsap.killTweensOf(preloaderMaterial);
      entries.forEach((entry) => {
        gsap.killTweensOf(entry);
        gsap.killTweensOf(entry.mesh.scale);
        gsap.killTweensOf(entry.material);
        if (entry.video) {
          entry.video.pause();
          entry.video.removeAttribute("src");
          entry.video.load();
        }
        entry.texture?.dispose();
        entry.material.dispose();
      });
      preloaderVideo.pause();
      preloaderVideo.removeAttribute("src");
      preloaderVideo.load();
      preloaderTexture.dispose();
      preloaderMaterial.dispose();
      geometry.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [props.items]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, overflow: "hidden", cursor: "default" }}
    />
  );
}
