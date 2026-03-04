"use client";

import { useRef, useCallback, useEffect, useMemo } from "react";
import ForceGraph3D, { type ForceGraphMethods } from "react-force-graph-3d";
import * as THREE from "three";
import { useUniverseStore } from "@/lib/universe-store";
import { getAlbumArt } from "@/lib/album-art";
import {
  NODE_COLORS,
  NODE_SIZES,
  MC_NODE_COLORS,
  EDGE_COLORS,
  STANCE_EDGE_COLORS,
} from "@/lib/graph-constants";
import type { GraphNodeData } from "@/lib/types";

interface GraphNode extends GraphNodeData {
  x?: number;
  y?: number;
  z?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  metadata: Record<string, unknown>;
}

// ── Texture caches ──────────────────────────────────────────────────────────

const textureLoader = new THREE.TextureLoader();
const albumTextureCache = new Map<string, THREE.Texture>();

function loadAlbumTexture(slug: string): THREE.Texture | null {
  if (albumTextureCache.has(slug)) return albumTextureCache.get(slug)!;
  const path = getAlbumArt(slug);
  if (!path) return null;
  const tex = textureLoader.load(path);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  albumTextureCache.set(slug, tex);
  return tex;
}

// ── Glow texture (radial gradient, cached) ──────────────────────────────────

let _glowTex: THREE.Texture | null = null;
function glowTexture(): THREE.Texture {
  if (_glowTex) return _glowTex;
  const s = 256;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(255,255,255,0.6)");
  g.addColorStop(0.5, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  _glowTex = new THREE.CanvasTexture(c);
  return _glowTex;
}

// ── Label sprite builder ────────────────────────────────────────────────────

function makeLabelSprite(text: string, color: string, size: "lg" | "md" | "sm"): THREE.Sprite {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  c.width = 512;
  c.height = 80;

  const fontSize = size === "lg" ? 30 : size === "md" ? 26 : 22;
  const label = text.length > 24 ? text.slice(0, 22) + "\u2026" : text;

  ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const tw = ctx.measureText(label).width;
  const px = 18;
  const py = 10;
  const pw = tw + px * 2;
  const ph = fontSize + py * 2;
  const ox = (c.width - pw) / 2;
  const oy = (c.height - ph) / 2;
  const r = ph / 2;

  // Pill bg
  ctx.fillStyle = "rgba(3,3,3,0.82)";
  ctx.beginPath();
  ctx.moveTo(ox + r, oy);
  ctx.lineTo(ox + pw - r, oy);
  ctx.arc(ox + pw - r, oy + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(ox + r, oy + ph);
  ctx.arc(ox + r, oy + r, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
  ctx.fill();

  // Border
  ctx.strokeStyle = color + "55";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Text
  ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, c.width / 2, c.height / 2 + 1);

  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
  });
  return new THREE.Sprite(mat);
}

// ── Helper: create glow sprite ──────────────────────────────────────────────

function makeGlow(color: THREE.Color, size: number, opacity: number): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: glowTexture(),
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1);
  return s;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export function ForceGraph() {
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);
  const { nodes, edges, selectNode, selectedNode, hoverNode } = useUniverseStore();
  const setClickScreenPos = useUniverseStore((s) => s.setClickScreenPos);

  const graphData = useMemo(
    () => ({
      nodes: nodes.map((n) => ({ ...n })) as GraphNode[],
      links: edges.map((e) => ({
        source: e.source,
        target: e.target,
        type: e.type,
        metadata: e.metadata,
      })) as GraphLink[],
    }),
    [nodes, edges],
  );

  // ── Scene setup: lighting + fog ───────────────────────────────────────────

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const scene = fg.scene();

    // Remove default lights
    scene.children
      .filter((c) => c instanceof THREE.AmbientLight || c instanceof THREE.DirectionalLight)
      .forEach((l) => scene.remove(l));

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(50, 80, 60);
    scene.add(dir);
    const pt = new THREE.PointLight(0xd91d1c, 0.3, 600);
    pt.position.set(0, 50, 0);
    scene.add(pt);

    scene.fog = new THREE.FogExp2(0x050505, 0.0012);
  }, [graphData]);

  // ── Forces ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force("charge")?.strength(-180);
    fg.d3Force("link")?.distance((link: GraphLink) => {
      if (link.type === "contains") return 30;
      if (link.type === "mc_performs") return 50;
      if (link.type === "shares_topic") return 100;
      return 75;
    });
  }, [graphData]);

  // ── Event handlers ────────────────────────────────────────────────────────

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      selectNode(node);
      const fg = fgRef.current;
      if (!fg) return;

      // Zoom camera toward node
      const d = 90;
      fg.cameraPosition(
        {
          x: (node.x ?? 0) + d * 0.7,
          y: (node.y ?? 0) + d * 0.25,
          z: (node.z ?? 0) + d * 0.7,
        },
        { x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0 },
        1200,
      );

      // Project node position to screen coords after a short delay (post-zoom)
      setTimeout(() => {
        const fg2 = fgRef.current;
        if (!fg2) return;
        const coords = fg2.graph2ScreenCoords(node.x ?? 0, node.y ?? 0, node.z ?? 0);
        setClickScreenPos({ x: coords.x, y: coords.y });
      }, 1300);
    },
    [selectNode, setClickScreenPos],
  );

  const handleNodeHover = useCallback(
    (node: GraphNode | null) => {
      hoverNode(node);
      document.body.style.cursor = node ? "pointer" : "default";
    },
    [hoverNode],
  );

  const handleBackgroundClick = useCallback(() => {
    if (selectedNode) selectNode(null);
  }, [selectedNode, selectNode]);

  // ── Node three object builder ─────────────────────────────────────────────

  const nodeThreeObject = useCallback((node: GraphNode) => {
    const type = node.type;
    const color =
      type === "mc"
        ? MC_NODE_COLORS[node.label.toLowerCase()] || NODE_COLORS.mc
        : NODE_COLORS[type] || "#ffffff";
    const baseSize = NODE_SIZES[type] || 5;
    const tc = new THREE.Color(color);
    const group = new THREE.Group();

    // ─── ALBUM: album art on a PlaneGeometry (correct UVs) ──────────────

    if (type === "album") {
      const slug = (node.metadata?.slug as string) || "";
      const artTex = loadAlbumTexture(slug);
      const artSize = 11;

      if (artTex) {
        // PlaneGeometry has built-in 0-1 UVs — texture maps correctly
        const geo = new THREE.PlaneGeometry(artSize, artSize);
        const mat = new THREE.MeshBasicMaterial({
          map: artTex,
          transparent: true,
          opacity: 0.95,
          side: THREE.DoubleSide,
        });
        group.add(new THREE.Mesh(geo, mat));
      } else {
        // Fallback: red emissive sphere
        const geo = new THREE.SphereGeometry(baseSize * 0.45, 32, 32);
        const mat = new THREE.MeshStandardMaterial({
          color: tc,
          emissive: tc,
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.9,
        });
        group.add(new THREE.Mesh(geo, mat));
      }

      // Glow halo behind artwork
      group.add(makeGlow(tc, artSize * 2.5, 0.25));

      // Label below
      const lbl = makeLabelSprite(node.label, color, "lg");
      lbl.position.set(0, -(artSize / 2 + 3.5), 0);
      lbl.scale.set(28, 28 * (80 / 512), 1);
      group.add(lbl);

      return group;
    }

    // ─── MC: polished icosahedron with glow ─────────────────────────────

    if (type === "mc") {
      const r = baseSize * 0.5;
      const geo = new THREE.IcosahedronGeometry(r, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: tc,
        emissive: tc,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.9,
        metalness: 0.4,
        roughness: 0.3,
      });
      group.add(new THREE.Mesh(geo, mat));

      // Wireframe overlay
      group.add(
        new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: tc, transparent: true, opacity: 0.3 }),
        ),
      );

      // Glow
      group.add(makeGlow(tc, r * 5.5, 0.3));

      // Label
      const lbl = makeLabelSprite(node.label, color, "lg");
      lbl.position.set(0, r + 5, 0);
      lbl.scale.set(26, 26 * (80 / 512), 1);
      group.add(lbl);

      return group;
    }

    // ─── TOPIC: octahedron ──────────────────────────────────────────────

    if (type === "topic") {
      const r = baseSize * 0.45;
      const geo = new THREE.OctahedronGeometry(r, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: tc,
        emissive: tc,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.85,
        metalness: 0.2,
        roughness: 0.4,
      });
      group.add(new THREE.Mesh(geo, mat));
      group.add(
        new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: tc, transparent: true, opacity: 0.2 }),
        ),
      );

      // Small glow
      group.add(makeGlow(tc, r * 4, 0.15));

      const lbl = makeLabelSprite(node.label, color, "md");
      lbl.position.set(0, r + 3.5, 0);
      lbl.scale.set(22, 22 * (80 / 512), 1);
      group.add(lbl);

      return group;
    }

    // ─── SONG: energy-scaled sphere ─────────────────────────────────────

    if (type === "song") {
      const energy = (node.metadata?.energy as number) ?? 0.5;
      const r = 1.8 + energy * 2.5;
      const geo = new THREE.SphereGeometry(r, 24, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: tc,
        emissive: tc,
        emissiveIntensity: 0.1 + energy * 0.25,
        transparent: true,
        opacity: 0.85,
        metalness: 0.1,
        roughness: 0.5,
      });
      group.add(new THREE.Mesh(geo, mat));

      // Glow for energetic songs
      if (energy > 0.55) {
        group.add(makeGlow(tc, r * 4, 0.08 + energy * 0.1));
      }

      const lbl = makeLabelSprite(node.label, color, "sm");
      lbl.position.set(0, r + 2.5, 0);
      lbl.scale.set(20, 20 * (80 / 512), 1);
      group.add(lbl);

      return group;
    }

    // ─── FEATURE ARTIST: sphere with glow ───────────────────────────────

    if (type === "feature_artist") {
      const r = baseSize * 0.35;
      const geo = new THREE.SphereGeometry(r, 20, 20);
      const mat = new THREE.MeshStandardMaterial({
        color: tc,
        emissive: tc,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.85,
        metalness: 0.15,
        roughness: 0.45,
      });
      group.add(new THREE.Mesh(geo, mat));
      group.add(makeGlow(tc, r * 4.5, 0.15));

      const lbl = makeLabelSprite(node.label, color, "sm");
      lbl.position.set(0, r + 2.5, 0);
      lbl.scale.set(20, 20 * (80 / 512), 1);
      group.add(lbl);

      return group;
    }

    // ─── ENTITY / PLACE / CULTURAL_REF: small sphere ────────────────────

    {
      const r = baseSize * 0.3;
      const geo = new THREE.SphereGeometry(r, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: tc,
        emissive: tc,
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.8,
        metalness: 0.1,
        roughness: 0.5,
      });
      group.add(new THREE.Mesh(geo, mat));

      const lbl = makeLabelSprite(node.label, color, "sm");
      lbl.position.set(0, r + 2, 0);
      lbl.scale.set(18, 18 * (80 / 512), 1);
      group.add(lbl);

      return group;
    }
  }, []);

  // ── Link styling — hover-aware ────────────────────────────────────────────

  const hoveredNode = useUniverseStore((s) => s.hoveredNode);
  const hoveredId = hoveredNode?.id ?? null;

  const isLinkHighlighted = useCallback(
    (link: GraphLink): boolean => {
      if (!hoveredId && !selectedNode) return false;
      const activeId = hoveredId || selectedNode?.id;
      const srcId = typeof link.source === "string" ? link.source : link.source?.id;
      const tgtId = typeof link.target === "string" ? link.target : link.target?.id;
      return srcId === activeId || tgtId === activeId;
    },
    [hoveredId, selectedNode],
  );

  const linkColor = useCallback(
    (link: GraphLink) => {
      const hl = isLinkHighlighted(link);
      if (link.type === "mentions") {
        const stance = (link.metadata?.stance as string) || "neutral";
        const base = STANCE_EDGE_COLORS[stance] || STANCE_EDGE_COLORS.neutral;
        if (hl) return base.replace(/[\d.]+\)$/, "1)");
        return base;
      }
      if (hl) return "rgba(255,255,255,0.5)";
      return EDGE_COLORS[link.type] || "rgba(255,255,255,0.03)";
    },
    [isLinkHighlighted],
  );

  const linkWidth = useCallback(
    (link: GraphLink) => {
      const hl = isLinkHighlighted(link);
      if (link.type === "mentions" && link.metadata?.stance === "diss") return hl ? 2 : 0.8;
      if (link.type === "contains") return hl ? 1.2 : 0.25;
      if (link.type === "mc_performs") return hl ? 1.2 : 0.3;
      return hl ? 1 : 0.1;
    },
    [isLinkHighlighted],
  );

  const linkDirectionalParticles = useCallback(
    (link: GraphLink) => {
      const hl = isLinkHighlighted(link);
      if (link.type === "mentions" && link.metadata?.stance === "diss") return hl ? 5 : 3;
      if (link.type === "features") return hl ? 3 : 1;
      if (hl) return 2;
      return 0;
    },
    [isLinkHighlighted],
  );

  const linkDirectionalParticleColor = useCallback((link: GraphLink) => {
    if (link.metadata?.stance === "diss") return "#d91d1c";
    if (link.type === "features") return "#60a5fa";
    return "#ffffff44";
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ForceGraph3D<GraphNode, GraphLink>
      ref={fgRef}
      graphData={graphData}
      backgroundColor="#050505"
      nodeThreeObject={nodeThreeObject}
      nodeLabel=""
      onNodeClick={handleNodeClick}
      onNodeHover={handleNodeHover}
      onBackgroundClick={handleBackgroundClick}
      linkColor={linkColor}
      linkOpacity={0.4}
      linkWidth={linkWidth}
      linkCurvature={0.12}
      linkCurveRotation={0.5}
      linkDirectionalParticles={linkDirectionalParticles}
      linkDirectionalParticleWidth={1}
      linkDirectionalParticleSpeed={0.004}
      linkDirectionalParticleColor={linkDirectionalParticleColor}
      warmupTicks={150}
      d3AlphaDecay={0.012}
      d3VelocityDecay={0.2}
      cooldownTime={8000}
      showNavInfo={false}
    />
  );
}
