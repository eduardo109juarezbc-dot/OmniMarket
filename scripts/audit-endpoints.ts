/**
 * Verificación de los endpoints de auditoría contra una URL (local o producción).
 * Mide la latencia de /api/test/analytics y comprueba códigos y forma de las respuestas.
 *
 *   npx tsx scripts/audit-endpoints.ts http://localhost:3005
 *   npx tsx scripts/audit-endpoints.ts https://<app>.vercel.app --reset   (usa TEST_API_TOKEN)
 *
 * Sin --reset no modifica datos: solo prueba que reset-data rechaza peticiones sin token.
 * --latency-info (CI): la puerta del SLA es la duración en el servidor.
 */
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const doReset = process.argv.includes("--reset");
/** --latency-info: la latencia del cliente se informa y la puerta es la del servidor. */
const latencyInfo = process.argv.includes("--latency-info");
let failures = 0;

function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "OK   " : "FALLA"} ${name}${detail ? ` -> ${detail}` : ""}`);
}

async function timed(path: string, init?: RequestInit) {
  const started = performance.now();
  const res = await fetch(`${base}${path}`, { redirect: "manual", ...init });
  const body = await res.text();
  return { res, body, ms: performance.now() - started };
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
}

async function main() {
  console.log(`Auditando ${base}\n`);

  // --- la app (no solo la API) ------------------------------------------
  // Las páginas pasan por proxy.ts, que necesita las variables públicas de
  // Supabase incrustadas en el build; /api/test/* no pasa por el proxy.
  const login = await timed("/login");
  check("/login 200", login.res.status === 200, String(login.res.status));
  check(
    "/login con botones de Google y GitHub",
    login.body.includes('data-testid="login-google"') &&
      login.body.includes('data-testid="login-github"'),
  );
  const privateRoute = await timed("/dashboard");
  check(
    "/dashboard sin sesión redirige a /login",
    privateRoute.res.status === 307 &&
      (privateRoute.res.headers.get("location") ?? "").includes("/login"),
    `${privateRoute.res.status} ${privateRoute.res.headers.get("location") ?? ""}`,
  );
  const privateApi = await timed("/api/orders");
  check(
    "/api/orders sin sesión -> 401",
    privateApi.res.status === 401,
    String(privateApi.res.status),
  );

  // Con --reset se parte del conjunto semilla: los conteos esperados son exactos.
  if (doReset) {
    const token = process.env.TEST_API_TOKEN ?? "";
    const reset = await timed("/api/test/reset-data", {
      method: "POST",
      headers: { "x-test-token": token },
    });
    const resetJson = JSON.parse(reset.body);
    check("reset-data con token -> 200", reset.res.status === 200, reset.body.slice(0, 200));
    check(
      "reset-data conteos",
      resetJson.counts?.orders === 300 && resetJson.counts?.products === 40,
    );
    console.log(`      reset en ${reset.ms.toFixed(0)} ms (servidor ${resetJson.durationMs} ms)`);
  }

  // --- analytics ---------------------------------------------------------
  const first = await timed("/api/test/analytics?page=1&limit=50");
  const firstJson = JSON.parse(first.body);
  check("analytics 200", first.res.status === 200, String(first.res.status));
  check("analytics meta.limit = 50", firstJson.meta?.limit === 50);
  check(
    "analytics data.length = 50",
    firstJson.data?.length === 50,
    String(firstJson.data?.length),
  );
  if (doReset)
    check(
      "analytics meta.total = 300",
      firstJson.meta?.total === 300,
      String(firstJson.meta?.total),
    );
  check("analytics Server-Timing", /app;dur=/.test(first.res.headers.get("server-timing") ?? ""));
  check("analytics sin emails", !first.body.includes("@"));
  console.log(`      primera petición (puede incluir arranque en frío): ${first.ms.toFixed(0)} ms`);

  const samples: number[] = [];
  const serverMs: number[] = [];
  for (let i = 0; i < 10; i++) {
    const page = (i % 6) + 1;
    const r = await timed(`/api/test/analytics?page=${page}&limit=50`);
    samples.push(r.ms);
    serverMs.push(JSON.parse(r.body).meta?.durationMs ?? Number.NaN);
  }
  const p50 = percentile(samples, 50);
  console.log(
    `      10 peticiones en caliente: p50 ${p50.toFixed(0)} ms, p95 ${percentile(samples, 95).toFixed(0)} ms, ` +
      `máx ${Math.max(...samples).toFixed(0)} ms (servidor p50 ${percentile(serverMs, 50).toFixed(0)} ms)`,
  );
  if (latencyInfo) {
    // Desde un runner remoto la latencia incluye su red: la puerta del SLA es
    // la duración medida en el servidor (meta.durationMs / Server-Timing).
    const serverP50 = percentile(serverMs, 50);
    check("analytics p50 servidor < 300 ms", serverP50 < 300, `${serverP50.toFixed(0)} ms`);
    console.log(`      (latencia vista desde aquí: p50 ${p50.toFixed(0)} ms, solo informativa)`);
  } else {
    check("analytics p50 < 300 ms", p50 < 300, `${p50.toFixed(0)} ms`);
  }

  const second = JSON.parse((await timed("/api/test/analytics?page=2&limit=50")).body);
  check("analytics página 2 distinta", second.data?.[0]?.code !== firstJson.data?.[0]?.code);
  const beyond = JSON.parse((await timed("/api/test/analytics?page=99&limit=50")).body);
  check(
    "analytics página fuera de rango -> data []",
    Array.isArray(beyond.data) && beyond.data.length === 0,
  );
  check(
    "analytics limit=0 -> 400",
    (await timed("/api/test/analytics?limit=0")).res.status === 400,
  );

  // --- kanban-status -----------------------------------------------------
  const board = await timed("/api/test/kanban-status");
  const boardJson = JSON.parse(board.body);
  check("kanban-status resumen 200", board.res.status === 200);
  const boardTotal = boardJson.columns?.reduce(
    (sum: number, c: { count: number }) => sum + c.count,
    0,
  );
  check("kanban-status suma = meta.total", boardTotal === firstJson.meta?.total, `${boardTotal}`);
  const om1 = await timed("/api/test/kanban-status?code=OM-0001");
  const om1Json = JSON.parse(om1.body);
  check("kanban-status OM-0001", om1.res.status === 200, om1.body.slice(0, 160));
  if (doReset)
    check(
      "OM-0001 en Pendiente, posición 0",
      om1Json.status === "PENDING" && om1Json.position === 0,
    );
  const byId = await timed(`/api/test/kanban-status?orderId=${om1Json.orderId}`);
  check("kanban-status por orderId", JSON.parse(byId.body).code === "OM-0001");
  check(
    "kanban-status 404",
    (await timed("/api/test/kanban-status?code=OM-99999")).res.status === 404,
  );
  check(
    "kanban-status 400",
    (await timed("/api/test/kanban-status?orderId=abc")).res.status === 400,
  );

  // --- reset-data --------------------------------------------------------
  check(
    "reset-data sin token -> 401",
    (await timed("/api/test/reset-data", { method: "POST" })).res.status === 401,
  );
  check(
    "reset-data token incorrecto -> 401",
    (
      await timed("/api/test/reset-data", {
        method: "POST",
        headers: { "x-test-token": "incorrecto" },
      })
    ).res.status === 401,
  );
  check("reset-data por GET -> 405", (await timed("/api/test/reset-data")).res.status === 405);

  console.log(failures === 0 ? "\nTodo correcto" : `\n${failures} fallo(s)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
