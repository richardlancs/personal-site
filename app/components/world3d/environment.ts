// Shader uniforms the whole world shares, for weather and daylight that
// change surfaces, not just lights: how wet things look, how much snow
// lies on what faces up, and how far into night it is. The atmosphere
// code (weather/daylight) writes them, blending over a few seconds; any
// material that wants to respond (paint.ts, the vegetation's materials)
// adds them to its shader with `Object.assign(shader.uniforms, envUniforms)`.
//
// One object, shared by reference, so a change reaches every material at
// once without recompiling or remounting anything.
export const envUniforms = {
  uWet: { value: 0 }, // 0 dry .. 1 freshly rained on
  uSnow: { value: 0 }, // 0 none .. 1 a light cover on upward faces
  uNight: { value: 0 }, // 0 day .. 1 full night
};
