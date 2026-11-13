// E2E de la Fase 4: búsqueda (Pagefind + Ctrl+K), 404 y responsive a 400 px en todas las páginas.
// Uso: npm run preview (en otra terminal) y luego `node scripts/e2e-busqueda.mjs`.
import { spawn } from "node:child_process";
import { mkdtempSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const perfil = mkdtempSync(join(tmpdir(), "ml-e2e-"));
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=9335", `--user-data-dir=${perfil}`, "--no-first-run", "--window-size=1440,1000", "about:blank"], { stdio: "ignore" });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const pendientes = new Map();
async function conectar() {
  for (let i = 0; i < 40; i++) {
    try {
      const lista = await (await fetch("http://127.0.0.1:9335/json")).json();
      const pag = lista.find((p) => p.type === "page");
      if (pag) { ws = new WebSocket(pag.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); break; }
    } catch {}
    await espera(250);
  }
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pendientes.has(d.id)) { pendientes.get(d.id)(d); pendientes.delete(d.id); } };
}
const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; pendientes.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ir = async (url, ms = 900) => { await cmd("Page.navigate", { url }); await espera(ms); };
const js = async (expr) => { const r = await cmd("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails)); return r.result.result.value; };
const ok = (c, m) => { if (!c) { console.error("✖", m); chrome.kill(); process.exit(1); } console.log("✓", m); };
const hasta = async (expr, ms = 3000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await js(expr)) return true; await espera(100); } return false; };
const foto = async (nombre) => { const s = await cmd("Page.captureScreenshot", { format: "jpeg", quality: 70 }); writeFileSync(`dist/_e2e-${nombre}.jpg`, Buffer.from(s.result.data, "base64")); };

await conectar();
await cmd("Page.enable");
const B = "http://localhost:4321";

// --- búsqueda ---
await ir(`${B}/`);
ok(await js(`document.getElementById('buscador').hidden`), "buscador: cerrado al inicio");
await cmd("Input.dispatchKeyEvent", { type: "keyDown", key: "k", code: "KeyK", modifiers: 2, windowsVirtualKeyCode: 75 });
await cmd("Input.dispatchKeyEvent", { type: "keyUp", key: "k", code: "KeyK", modifiers: 2, windowsVirtualKeyCode: 75 });
await espera(200);
ok(!(await js(`document.getElementById('buscador').hidden`)), "buscador: Ctrl+K lo abre");
ok((await js(`document.activeElement.id`)) === "bq-input", "buscador: foco en el input");
await js(`(() => { const i = document.getElementById('bq-input'); i.value = 'potencia'; i.dispatchEvent(new Event('input')); })()`);
await hasta(`document.querySelectorAll('#bq-resultados .bq-item').length > 0`);
const n = await js(`document.querySelectorAll('#bq-resultados .bq-item').length`);
ok(n >= 3, `buscador: 'potencia' devuelve resultados (${n} mostrados)`);
ok((await js(`document.querySelector('#bq-resultados .bq-grupo').textContent`)).startsWith("Sesión"), "buscador: resultados agrupados por sesión");
ok((await js(`[...document.querySelectorAll('#bq-resultados .bq-item')].some(a => a.href.includes('/teoria/02-potencia-tamano-muestra/'))`)), "buscador: incluye la lección de potencia");
ok((await js(`[...document.querySelectorAll('#bq-resultados .bq-tipo')].some((t) => t.textContent === 'Lección')`)), "buscador: muestra el tipo (Lección)");
ok((await js(`document.querySelector('#bq-resultados .bq-excerpt mark') !== null`)), "buscador: resalta el término en el extracto");
await foto("busqueda");
await js(`document.getElementById('bq-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))`);
ok((await js(`document.querySelectorAll('#bq-resultados .bq-item.activo').length`)) === 1, "buscador: ↓ selecciona un resultado");
// Pagefind hace coincidencia difusa: se prueban varias cadenas sin sentido hasta dar con una vacía.
let vacioVisto = false, consultaVacia = "";
for (const q of ["wvwvwv", "kjkjkj", "xqzjvp", "zzqxjkw", "qwzxqwzxqwzx", "jjjjvvvvqqqq"]) {
  await js(`(() => { const i = document.getElementById('bq-input'); i.value = ${JSON.stringify(q)}; i.dispatchEvent(new Event('input')); })()`);
  if (await hasta(`document.querySelector('#bq-resultados .bq-vacio') !== null`, 1500)) { vacioVisto = true; consultaVacia = q; break; }
}
ok(vacioVisto, `buscador: sin resultados muestra aviso (consulta "${consultaVacia}")`);
await js(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
ok(await js(`document.getElementById('buscador').hidden`), "buscador: Esc lo cierra");
// no debe indexar soluciones: se revisa el índice directamente (la UI aplica stemming y
// devolvería coincidencias parciales legítimas como "exige")
{
  const { readdirSync: rd, readFileSync: rf } = await import("node:fs");
  const { gunzipSync } = await import("node:zlib");
  let fugas = 0, fragmentos = 0;
  for (const f of rd("dist/pagefind/fragment")) {
    const s = gunzipSync(rf(join("dist/pagefind/fragment", f))).toString();
    const j = JSON.parse(s.slice(s.indexOf("{")));
    fragmentos++;
    if (/exigible/i.test(j.content) || /Material del docente|Clave · Quiz/.test(j.content) || /-sol/.test(j.url)) fugas++;
  }
  ok(fugas === 0, `índice: ${fragmentos} fragmentos, ninguno con material del docente`);
}
await js(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);

// --- 404 ---
const r404 = await fetch(`${B}/no-existe/`);
ok(r404.status === 404, `404: la ruta inexistente responde ${r404.status}`);
await ir(`${B}/no-existe/`);
ok((await js(`document.title`)).startsWith("Página no encontrada"), "404: página propia con título");

// --- skip link y foco del drawer ---
await ir(`${B}/sesion/2/teoria/01-pruebas-t-varianzas/`);
ok((await js(`document.querySelector('a.skip').getAttribute('href')`)) === "#contenido" && (await js(`document.getElementById('contenido') !== null`)), "a11y: skip-link apunta a #contenido");
await cmd("Emulation.setDeviceMetricsOverride", { width: 400, height: 800, deviceScaleFactor: 1, mobile: true });
await espera(300);
await js(`(() => { const b = document.querySelector('[data-sidebar-abrir]'); b.focus(); b.click(); })()`); // un clic real también enfoca el botón
await espera(350);
ok((await js(`document.activeElement?.hasAttribute('data-sidebar-cerrar')`)), "a11y: al abrir el drawer el foco va al botón de cerrar");
await js(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
await espera(100);
ok((await js(`document.activeElement?.hasAttribute('data-sidebar-abrir')`)), "a11y: al cerrar vuelve el foco al botón Temario");

// --- responsive: sin scroll horizontal a 400 px en todas las páginas ---
function* htmls(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* htmls(p);
    else if (f === "index.html") yield p;
  }
}
const rutas = [...htmls("dist")].map((p) => "/" + p.replace(/\\/g, "/").replace(/^dist\//, "").replace(/index\.html$/, ""));
let anchas = [];
for (const ruta of rutas) {
  await ir(`${B}${ruta}`, 500);
  const sw = await js(`document.documentElement.scrollWidth`);
  if (sw > 400) anchas.push(`${ruta} (${sw}px)`);
}
ok(anchas.length === 0, `responsive: ${rutas.length} páginas sin scroll horizontal a 400 px${anchas.length ? " — FALLAN: " + anchas.join(", ") : ""}`);
await ir(`${B}/sesion/2/teoria/02-potencia-tamano-muestra/`, 800);
await foto("movil-leccion");

chrome.kill();
console.log("listo");
