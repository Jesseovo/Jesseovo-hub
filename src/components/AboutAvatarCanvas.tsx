"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  createDoroMascotHeadModel,
  disposeDoroMascotHeadModel,
  type DoroModelRuntime,
} from "../createObjectModel";

export default function AboutAvatarCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    renderer.setClearColor(0xffffff, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = "about-avatar-canvas__element";
    host.appendChild(renderer.domElement);

    const hemisphere = new THREE.HemisphereLight(0xfffaf0, 0xd6d9e6, 2.05);
    const key = new THREE.DirectionalLight(0xfff1d9, 3.65);
    key.position.set(-3.5, 4.5, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 5;
    key.shadow.bias = -0.0002;
    const fill = new THREE.DirectionalLight(0xdbe6ff, 1.25);
    fill.position.set(4, 1.5, 4);
    const rim = new THREE.DirectionalLight(0xffffff, 1.65);
    rim.position.set(0, 4, -4);
    scene.add(hemisphere, key, fill, rim);

    const model = createDoroMascotHeadModel();
    const runtime = model.userData.sculptRuntime as DoroModelRuntime;
    const headPivot = runtime.nodes.headPivot as THREE.Group;
    const leftEar = runtime.nodes.leftEar as THREE.Group;
    const rightEar = runtime.nodes.rightEar as THREE.Group;
    const leftEyeMesh = runtime.meshes.leftEye;
    const rightEyeMesh = runtime.meshes.rightEye;
    scene.add(model);

    const rawBounds = new THREE.Box3().setFromObject(model);
    const rawHeight = Math.max(rawBounds.getSize(new THREE.Vector3()).y, 0.001);
    const rawCenter = rawBounds.getCenter(new THREE.Vector3());
    model.position.sub(rawCenter);

    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(0, 0);
    const targetRotation = new THREE.Vector3();
    const smoothedRotation = new THREE.Vector3();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const runtimeWindow = window as Window & { __cameFromInAppNav?: boolean };
    const revealOnEntry = runtimeWindow.__cameFromInAppNav === true && !reduceMotion;

    let revealStartedAt = revealOnEntry ? performance.now() + 340 : Number.NEGATIVE_INFINITY;
    let revealProgress = revealOnEntry ? 0 : 1;
    let animationFrame = 0;
    let modelScale = 1;
    let verticalOffset = 0;
    let floatAmplitude = 0.04;
    let hitStartedAt = Number.NEGATIVE_INFINITY;
    let hitRunning = false;
    let hoverIntensity = 0;
    let readingOpacity = 1;
    let nextBlinkAt = 2.8;

    function resize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      const targetPixels = width <= 640 ? 205 : width <= 1024 ? 220 : 238;
      const targetHeight = (targetPixels / height) * visibleHeight;
      modelScale = targetHeight / rawHeight;
      verticalOffset = -(18 / height) * visibleHeight;
      floatAmplitude = (10 / height) * visibleHeight;
    }

    function handlePointerMove(event: PointerEvent) {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
      targetRotation.x = THREE.MathUtils.clamp(-pointer.y * 0.24, -0.24, 0.24);
      targetRotation.y = THREE.MathUtils.clamp(pointer.x * 0.34, -0.34, 0.34);
      targetRotation.z = pointer.x * 0.055;
    }

    function handleClick(event: MouseEvent) {
      if (hitRunning) return;
      const clickPoint = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
      );
      raycaster.setFromCamera(clickPoint, camera);
      const intersection = raycaster.intersectObjects(runtime.clickableParts, true)[0];
      if (!intersection) return;

      hitRunning = true;
      hitStartedAt = performance.now();
    }

    function handlePageTransitionStart() {
      if (!revealOnEntry) return;
      revealStartedAt = performance.now() + 340;
      revealProgress = 0;
    }

    function updateInteraction(delta: number, elapsed: number, now: number) {
      const smoothing = 1 - Math.pow(1 - 0.085, delta * 60);
      smoothedRotation.lerp(targetRotation, smoothing);

      const eyeOffsetX = pointer.x * 0.075;
      const eyeOffsetY = pointer.y * 0.065;
      leftEyeMesh.position.x = THREE.MathUtils.lerp(leftEyeMesh.position.x, eyeOffsetX, smoothing * 1.35);
      leftEyeMesh.position.y = THREE.MathUtils.lerp(leftEyeMesh.position.y, eyeOffsetY, smoothing * 1.35);
      rightEyeMesh.position.x = THREE.MathUtils.lerp(rightEyeMesh.position.x, eyeOffsetX, smoothing * 1.35);
      rightEyeMesh.position.y = THREE.MathUtils.lerp(rightEyeMesh.position.y, eyeOffsetY, smoothing * 1.35);

      let recoil = 0;
      let shake = 0;
      if (hitRunning) {
        const hitTime = (now - hitStartedAt) / 1150;
        if (hitTime >= 1) {
          hitRunning = false;
        } else {
          recoil = Math.sin(Math.min(hitTime / 0.34, 1) * Math.PI) * Math.exp(-hitTime * 1.7);
          shake = Math.sin(hitTime * 58) * Math.exp(-hitTime * 4.4);
        }
      }

      const blinkWindow = nextBlinkAt - elapsed;
      let blink = 0;
      if (!hitRunning && blinkWindow <= 0 && blinkWindow > -0.24) {
        blink = Math.sin((Math.abs(blinkWindow) / 0.24) * Math.PI);
      } else if (blinkWindow <= -0.24) {
        nextBlinkAt = elapsed + 3.2 + Math.random() * 2.1;
      }

      headPivot.rotation.set(
        smoothedRotation.x - recoil * 0.12,
        smoothedRotation.y + shake * 0.025,
        smoothedRotation.z + shake * 0.13,
      );
      headPivot.position.z = -recoil * 0.2;
      headPivot.scale.set(1 + recoil * 0.08, 1 - recoil * 0.11, 1 + recoil * 0.055);
      leftEar.rotation.z = 0.18 + shake * 0.24 - recoil * 0.045;
      rightEar.rotation.z = -0.18 - shake * 0.24 + recoil * 0.045;

      const eyeSquash = Math.max(0.18, 1 - Math.max(recoil * 0.68, blink * 0.82));
      leftEyeMesh.scale.y = 0.31 * eyeSquash;
      rightEyeMesh.scale.y = 0.31 * eyeSquash;
    }

    function render() {
      animationFrame = requestAnimationFrame(render);
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      const now = performance.now();

      if (revealProgress < 1 && now >= revealStartedAt) {
        const revealTime = THREE.MathUtils.clamp((now - revealStartedAt) / 1900, 0, 1);
        revealProgress = 1 - Math.pow(1 - revealTime, 3);
      }

      const revealScale = THREE.MathUtils.lerp(0.72, 1, revealProgress);
      model.scale.setScalar(modelScale * revealScale);
      model.position.y = verticalOffset + Math.sin(elapsed * 1.45) * floatAmplitude;
      model.position.x = 0;

      updateInteraction(delta, elapsed, now);
      raycaster.setFromCamera(pointer, camera);
      const hoverHit = raycaster.intersectObjects(runtime.clickableParts, true)[0];
      hoverIntensity = THREE.MathUtils.lerp(hoverIntensity, hoverHit ? 1 : 0, hoverHit ? 0.1 : 0.055);
      runtime.materials.ivory.emissive.setRGB(0.055, 0.07, 0.34);
      runtime.materials.ivory.emissiveIntensity = hoverIntensity * 0.12;

      const bioText = document.querySelector<HTMLElement>(
        ".about-final__bio-copy [data-tearable-paragraph]",
      );
      const bioBounds = bioText?.getBoundingClientRect();
      const mascotHeight = rawHeight * modelScale * revealScale * (window.innerHeight / (
        2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z
      ));
      const mascotTop = window.innerHeight / 2 - mascotHeight / 2 - 18;
      const mascotBottom = window.innerHeight / 2 + mascotHeight / 2 - 18;
      const overlapsBio = Boolean(
        bioBounds &&
        bioBounds.bottom > mascotTop &&
        bioBounds.top < mascotBottom,
      );
      const targetOpacity = overlapsBio ? 0.2 : 1;
      const opacitySmoothing = 1 - Math.pow(1 - 0.12, delta * 60);
      readingOpacity = THREE.MathUtils.lerp(readingOpacity, targetOpacity, opacitySmoothing);
      renderer.domElement.style.opacity = readingOpacity.toFixed(3);

      renderer.render(scene, camera);
    }

    resize();
    render();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("click", handleClick);
    window.addEventListener("pagetransition:start", handlePageTransitionStart);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("pagetransition:start", handlePageTransitionStart);
      disposeDoroMascotHeadModel(model);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="about-avatar-canvas" aria-hidden="true" />;
}
