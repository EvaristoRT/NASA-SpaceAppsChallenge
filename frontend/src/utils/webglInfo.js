// Datos del WebGL del navegador, para entender por qué el relieve 3D se ve distinto de un navegador a otro.
//
// El relieve depende de WebGL con aceleración por hardware. Sin ella (aceleración desactivada, lista negra de GPU o
// modo de privacidad estricto) el navegador dibuja por software y el mapa va lento o sin relieve.

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic|mesa offscreen/i;

export function getWebglInfo() {
  const info = { webgl: false, version: null, renderer: null, vendor: null, software: false, maxTextureSize: null };
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return info;
    info.webgl = true;
    info.version = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 2 : 1;
    info.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      info.renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      info.vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
      info.software = SOFTWARE_RENDERER.test(String(info.renderer));
    }
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  } catch {
    // el navegador bloquea el acceso (modo de privacidad): se devuelve lo que se pudo leer
  }
  return info;
}
