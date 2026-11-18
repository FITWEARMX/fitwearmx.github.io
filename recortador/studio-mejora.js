// FITWEARMX Studio · mejorar imagen de videos chicos (quita bloques, sube a 4K con bordes limpios, nitidez y color)
// y "golpe" de zoom al ritmo. Corre en la tarjeta de video con WebGL2; si no hay WebGL2, dibuja el video normal.
// Sube la nitidez, pero no inventa detalle: un video de WhatsApp sigue siendo de WhatsApp.

Object.assign(TIPOS.video.def, { mejora: 0, contraste: 0.5, luz: 0.5, colorV: 1, golpe: 0, brillo: 1, luces: 0, orillas: 0.22, temblor: 0, rgb: 0 });
TIPOS.video.campos.push(
  ['mejora', 'Mejorar imagen', 'rango', 0, 1, 0.05],
  ['contraste', 'Contraste', 'rango', 0, 1, 0.05],
  ['luz', 'Sacar detalle de lo oscuro', 'rango', 0, 1, 0.05],
  ['colorV', 'Color', 'rango', 0, 2, 0.05],
  ['brillo', 'Brillo', 'rango', 0.3, 1.2, 0.01],
  ['luces', 'Bajar luces fuertes', 'rango', 0, 2, 0.05],
  ['orillas', 'Oscurecer orillas', 'rango', 0, 1, 0.01],
  ['golpe', 'Golpe de zoom al entrar', 'rango', 0, 0.3, 0.01],
  ['temblor', 'Temblor al entrar', 'rango', 0, 0.04, 0.002],
  ['rgb', 'Separar color al entrar', 'rango', 0, 4, 0.1]);

const VERT_MEJORA = `#version 300 es
in vec2 p; out vec2 uv;
void main() { uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

// Paso 1, al tamaño original: quita bloques y ruido de compresión sin borrar los bordes.
const FRAG_LIMPIA = `#version 300 es
precision highp float;
uniform sampler2D t; uniform vec2 px; uniform float fuerza;
in vec2 uv; out vec4 sal;
void main() {
  vec3 c = texture(t, uv).rgb, suma = vec3(0.); float pesos = 0.;
  for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) {
    vec2 d = vec2(float(x), float(y));
    vec3 m = texture(t, uv + d * px).rgb, dif = m - c;
    float w = exp(-dot(d, d) / 3.) * exp(-dot(dif, dif) / (2. * .045 * .045));
    suma += m * w; pesos += w;
  }
  sal = vec4(mix(c, suma / pesos, fuerza), 1.);
}`;

// Paso 2, al tamaño de salida: agranda con bordes limpios, da nitidez sin halos y corrige el color.
const FRAG_SUBE = `#version 300 es
precision highp float;
uniform sampler2D t;
uniform vec2 px; uniform vec4 caja;
uniform float detalle, local, negro, blanco, curva, gama, sat, vin, grano, semilla, brillo, luces, rgb;
in vec2 uv; out vec4 sal;
float lu(vec3 c) { return dot(c, vec3(.2126, .7152, .0722)); }
vec3 bicubica(vec2 q) {   // Catmull-Rom con 9 lecturas
  vec2 f = q / px - .5, i = floor(f); f -= i;
  vec2 w0 = f * (-.5 + f * (1. - .5 * f)), w1 = 1. + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (.5 + f * (2. - 1.5 * f)), w3 = f * f * (-.5 + .5 * f);
  vec2 w12 = w1 + w2, o12 = w2 / w12;
  vec2 a = (i + .5 - 1.) * px, b = (i + .5 + o12) * px, d = (i + .5 + 2.) * px;
  vec3 r = vec3(0.);
  r += texture(t, vec2(a.x, a.y)).rgb * w0.x * w0.y + texture(t, vec2(b.x, a.y)).rgb * w12.x * w0.y + texture(t, vec2(d.x, a.y)).rgb * w3.x * w0.y;
  r += texture(t, vec2(a.x, b.y)).rgb * w0.x * w12.y + texture(t, vec2(b.x, b.y)).rgb * w12.x * w12.y + texture(t, vec2(d.x, b.y)).rgb * w3.x * w12.y;
  r += texture(t, vec2(a.x, d.y)).rgb * w0.x * w3.y + texture(t, vec2(b.x, d.y)).rgb * w12.x * w3.y + texture(t, vec2(d.x, d.y)).rgb * w3.x * w3.y;
  return r;
}
vec3 anillo(vec2 q, float r) {   // promedio de 8 puntos alrededor
  const float s = .7071; vec3 m = vec3(0.);
  m += texture(t, q + vec2(r, 0.) * px).rgb + texture(t, q - vec2(r, 0.) * px).rgb;
  m += texture(t, q + vec2(0., r) * px).rgb + texture(t, q - vec2(0., r) * px).rgb;
  m += texture(t, q + vec2(r * s, r * s) * px).rgb + texture(t, q - vec2(r * s, r * s) * px).rgb;
  m += texture(t, q + vec2(r * s, -r * s) * px).rgb + texture(t, q - vec2(r * s, -r * s) * px).rgb;
  return m / 8.;
}
void main() {
  vec2 q = caja.xy + uv * caja.zw;
  vec3 c = clamp(bicubica(q), 0., 1.);
  float gi = lu(texture(t, q - vec2(px.x, 0.)).rgb), gd = lu(texture(t, q + vec2(px.x, 0.)).rgb);
  float ga = lu(texture(t, q - vec2(0., px.y)).rgb), gb = lu(texture(t, q + vec2(0., px.y)).rgb);
  // Suaviza a lo largo del borde para quitar la escalera de los píxeles grandes.
  vec2 g = vec2(gd - gi, gb - ga); float mg = length(g);
  if (mg > .02) {
    vec2 tan = vec2(-g.y, g.x) / mg * px;
    vec3 lado = (texture(t, q + tan * .8).rgb + texture(t, q - tan * .8).rgb + texture(t, q + tan * 1.6).rgb + texture(t, q - tan * 1.6).rgb) * .25;
    c = mix(c, lado, smoothstep(.02, .12, mg) * .6);
  }
  float y = lu(c), yC = lu(anillo(q, 1.25)), yL = lu(anillo(q, 4.));
  float mn = min(y, min(min(gi, gd), min(ga, gb))), mx = max(y, max(max(gi, gd), max(ga, gb)));
  float d1 = y - yC, d2 = yC - yL;
  d1 *= smoothstep(.003, .018, abs(d1));   // lo muy chiquito es ruido: no se afila
  d2 *= 1. - smoothstep(.05, .16, abs(d2));   // junto a un borde muy fuerte no se sube: ahí nacen los halos blancos
  float sube = clamp(y + d1 * detalle, mn - .012, mx + .012) + d2 * local;
  c += sube - y;
  // color: puntos de negro y blanco, medios, curva, saturación
  c = clamp((c - negro) / (blanco - negro), 0., 1.);
  c = pow(c, vec3(gama));
  c = mix(c, c * c * (3. - 2. * c), curva);
  c = clamp(mix(vec3(lu(c)), c, sat), 0., 1.);
  c = c / (1. + luces * c * c) * brillo;
  if (rgb > 0.) {   // separación de color que dura un instante después del golpe
    vec2 o = vec2(rgb, 0.) * px;
    float base = lu(texture(t, q).rgb);
    c.r += (lu(texture(t, q + o).rgb) - base) * .9;
    c.b += (lu(texture(t, q - o).rgb) - base) * .9;
  }
  float dist = length((uv - .5) * vec2(1., .85)) * 1.414;
  c *= 1. - vin * smoothstep(.5, 1.05, dist);
  float n = fract(sin(dot(gl_FragCoord.xy + semilla, vec2(12.9898, 78.233))) * 43758.5453) - .5;
  c += n * grano * (1. - .6 * lu(c));
  sal = vec4(c, 1.);
}`;

const MJ = { gl: null, lista: false, lienzo: document.createElement('canvas') };
function mjPrograma(gl, fs) {
  const hacer = (tipo, txt) => { const s = gl.createShader(tipo); gl.shaderSource(s, txt); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram();
  gl.attachShader(p, hacer(gl.VERTEX_SHADER, VERT_MEJORA)); gl.attachShader(p, hacer(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
  return { p, u };
}
function mjTextura(gl) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  return t;
}
function mjIniciar() {
  if (MJ.lista || MJ.fallo) return MJ.lista;
  try {
    const gl = MJ.lienzo.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('sin WebGL2');
    MJ.gl = gl; MJ.limpia = mjPrograma(gl, FRAG_LIMPIA); MJ.sube = mjPrograma(gl, FRAG_SUBE);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    MJ.tEntra = mjTextura(gl); MJ.tLimpia = mjTextura(gl); MJ.fb = gl.createFramebuffer();
    MJ.lista = true;
  } catch (e) { console.warn('Mejorar imagen no disponible', e); MJ.fallo = true; }
  return MJ.lista;
}
// Devuelve el lienzo con el cuadro ya mejorado, recortado y con zoom, listo para pegarlo a pantalla completa.
function mjCuadro(src, c, lt, z) {
  if (!mjIniciar()) return null;
  const gl = MJ.gl, sw = src.videoWidth || src.naturalWidth, sh = src.videoHeight || src.naturalHeight;
  if (!sw || !sh) return null;
  const ow = lienzo.width, oh = lienzo.height, m = c.mejora;
  if (MJ.lienzo.width !== ow || MJ.lienzo.height !== oh) { MJ.lienzo.width = ow; MJ.lienzo.height = oh; }
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, MJ.tEntra);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.bindTexture(gl.TEXTURE_2D, MJ.tLimpia);
  if (MJ.lw !== sw || MJ.lh !== sh) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, sw, sh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); MJ.lw = sw; MJ.lh = sh; }
  gl.bindFramebuffer(gl.FRAMEBUFFER, MJ.fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, MJ.tLimpia, 0);
  gl.viewport(0, 0, sw, sh);
  gl.useProgram(MJ.limpia.p); gl.bindTexture(gl.TEXTURE_2D, MJ.tEntra);
  gl.uniform1i(MJ.limpia.u.t, 0); gl.uniform2f(MJ.limpia.u.px, 1 / sw, 1 / sh); gl.uniform1f(MJ.limpia.u.fuerza, 0.7 * m);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  // qué parte de la fuente se ve (igual que cubrir(), con el foco del zoom)
  const s = Math.max(W / sw, H / sh) * z, dw = sw * s, dh = sh * s;
  const fx = c.focoX ?? 0.5, fy = c.focoY ?? 0.5;
  const du = W / dw, dv = H / dh, u0 = (dw - W) * fx / dw, vArriba = (dh - H) * fy / dh;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, ow, oh);
  const U = MJ.sube.u, k = c.contraste ?? 0.5, l = c.luz ?? 0.5;
  gl.useProgram(MJ.sube.p); gl.bindTexture(gl.TEXTURE_2D, MJ.tLimpia);
  gl.uniform1i(U.t, 0); gl.uniform2f(U.px, 1 / sw, 1 / sh);
  const entra = 1 - clamp(lt / 0.25), tiembla = (c.temblor || 0) * entra;
  const mu = clamp(u0 + Math.sin(lt * 97) * tiembla, 0, 1 - du), mv = clamp(1 - vArriba - dv + Math.cos(lt * 131) * tiembla, 0, 1 - dv);
  gl.uniform4f(U.caja, mu, mv, du, dv);
  gl.uniform1f(U.brillo, c.brillo ?? 1); gl.uniform1f(U.luces, c.luces || 0); gl.uniform1f(U.rgb, (c.rgb || 0) * entra);
  gl.uniform1f(U.detalle, 1.6 * m); gl.uniform1f(U.local, 0.55 * m);
  gl.uniform1f(U.negro, 0.09 * k * m); gl.uniform1f(U.blanco, 1 - 0.1 * k * m);
  gl.uniform1f(U.curva, 0.55 * k * m); gl.uniform1f(U.gama, 1 - 0.3 * l * m);
  gl.uniform1f(U.sat, c.colorV ?? 1); gl.uniform1f(U.vin, (c.orillas ?? 0.22) * m);
  gl.uniform1f(U.grano, 0.018 * m); gl.uniform1f(U.semilla, Math.floor(lt * 30) % 97);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  return MJ.lienzo;
}
DIBUJAR.video = (c, lt) => {
  const golpe = (c.golpe || 0) * (1 - eOut(clamp(lt / 0.28)));
  const z = lerp(c.zoomIni, c.zoomFin, eInOut(clamp(lt / c.dur))) * (1 + golpe);
  const src = fuenteDe(c);
  const lista = c.mejora > 0 && src ? mjCuadro(src, c, lt, z) : null;
  if (!lista) return dibVideo(golpe ? { ...c, zoomIni: z, zoomFin: z } : c, lt);
  ctx.save(); ctx.globalAlpha = alfa(c, lt);
  ctx.drawImage(lista, 0, 0, W, H);
  ctx.restore();
};

// Vertical u horizontal: cada formato guarda su propio proyecto.
const selFormato = $('selFormato');
if (selFormato) {
  selFormato.value = HORIZONTAL ? 'horizontal' : 'vertical';
  selFormato.onchange = e => {
    const u = new URL(location.href);
    if (e.target.value === 'horizontal') u.searchParams.set('formato', 'horizontal'); else u.searchParams.delete('formato');
    location.href = u.href;
  };
}
