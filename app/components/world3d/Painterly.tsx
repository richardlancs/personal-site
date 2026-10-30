"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

// The last step that turns a render into a painting.
//
// 1. Brushwork (Kuwahara filter): each pixel takes the colour of the
//    calmest patch of its neighbourhood, so surfaces become flat strokes
//    of gouache with soft edges, and hard CG detail melts into paint.
// 2. Grade, in display colour: shade leans blue-green, sunlit colour warms,
//    bright places glow a little into their surroundings (the halation of
//    old film), and a faint paper grain sits over everything.
//
// The brushwork is skipped on low-power devices; the grade is cheap.

const Brushwork = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTexel: { value: new THREE.Vector2() },
    uSpread: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uTexel;
    uniform float uSpread;
    varying vec2 vUv;
    const int R = 2;
    void main() {
      vec3 m[4];
      vec3 s[4];
      for (int k = 0; k < 4; k++) { m[k] = vec3(0.0); s[k] = vec3(0.0); }
      for (int j = -R; j <= R; j++) {
        for (int i = -R; i <= R; i++) {
          vec3 c = texture2D(tDiffuse, vUv + vec2(float(i), float(j)) * uTexel * uSpread).rgb;
          vec3 c2 = c * c;
          if (i <= 0 && j <= 0) { m[0] += c; s[0] += c2; }
          if (i >= 0 && j <= 0) { m[1] += c; s[1] += c2; }
          if (i <= 0 && j >= 0) { m[2] += c; s[2] += c2; }
          if (i >= 0 && j >= 0) { m[3] += c; s[3] += c2; }
        }
      }
      float n = float((R + 1) * (R + 1));
      float best = 1e9;
      vec3 col = vec3(0.0);
      for (int k = 0; k < 4; k++) {
        vec3 mean = m[k] / n;
        vec3 v = abs(s[k] / n - mean * mean);
        float sigma = v.r + v.g + v.b;
        if (sigma < best) { best = sigma; col = mean; }
      }
      gl_FragColor = vec4(col, 1.0);
    }`,
};

const Grade = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTexel: { value: new THREE.Vector2() },
  },
  vertexShader: Brushwork.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uTexel;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float lum = dot(col, vec3(0.299, 0.587, 0.114));

      // Glow: bright places bleed softly into their surroundings
      vec3 glow = vec3(0.0);
      for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.7854;
        vec2 o = vec2(cos(a), sin(a)) * uTexel * 9.0;
        vec3 c = texture2D(tDiffuse, vUv + o).rgb;
        glow += max(c - 0.72, 0.0);
      }
      col += glow / 8.0 * 0.55 * vec3(1.0, 0.94, 0.82);

      // Shade toward blue-green, light toward warm cream
      col += vec3(0.015, 0.045, 0.075) * pow(1.0 - lum, 2.0);
      col = mix(col, col * vec3(1.04, 1.0, 0.93), smoothstep(0.55, 1.0, lum));
      // Fuller colour in the midtones, as painted
      float grey = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(grey), col, 1.0 + 0.14 * (1.0 - abs(grey - 0.5) * 2.0));
      // A gentle lift, so nothing goes to black
      col = col * 0.95 + 0.03;

      // Paper grain and a soft warm edge to the frame
      // Fixed, like the grain of real paper: it doesn't crawl
      col += (hash(floor(vUv / uTexel)) - 0.5) * 0.022;
      vec2 e = vUv - 0.5;
      col *= mix(vec3(1.0), vec3(0.92, 0.89, 0.85), smoothstep(0.35, 0.85, dot(e, e) * 2.2));
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export default function Painterly({ brushwork }: { brushwork: boolean }) {
  const { gl, scene, camera, size } = useThree();

  const { composer, brush, grade } = useMemo(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));
    const brush = new ShaderPass(Brushwork);
    composer.addPass(brush);
    composer.addPass(new OutputPass());
    const grade = new ShaderPass(Grade);
    composer.addPass(grade);
    return { composer, brush, grade };
  }, [gl, scene, camera]);

  useEffect(() => {
    const ratio = gl.getPixelRatio();
    composer.setPixelRatio(ratio);
    composer.setSize(size.width, size.height);
    const texel = new THREE.Vector2(1 / (size.width * ratio), 1 / (size.height * ratio));
    brush.uniforms.uTexel.value.copy(texel);
    grade.uniforms.uTexel.value.copy(texel);
    // Brush strokes about the same size on every screen
    brush.uniforms.uSpread.value = Math.max(1, ratio * 0.85);
  }, [composer, brush, grade, gl, size]);

  useEffect(() => {
    brush.enabled = brushwork;
  }, [brush, brushwork]);

  useEffect(() => () => composer.dispose(), [composer]);

  // Rendering through the composer replaces the normal render
  useFrame(() => composer.render(), 1);

  return null;
}
