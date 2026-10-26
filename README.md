# OmniMarket · Operations Hub

[![CI](https://github.com/eduardo109juarezbc-dot/OmniMarket/actions/workflows/ci.yml/badge.svg)](https://github.com/eduardo109juarezbc-dot/OmniMarket/actions/workflows/ci.yml)

Dashboard de analítica y operaciones de e-commerce en tiempo real: KPIs y gráficos de ventas, CRUD de productos y pedidos, tablero Kanban con drag and drop, edición en lote y endpoints de auditoría `/api/test/*`.

## Stack

| Capa          | Tecnología                                                                              |
| ------------- | --------------------------------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router, Cache Components), React 19, TypeScript estricto                |
| Estilos       | Tailwind CSS v4                                                                         |
| Autenticación | Supabase Auth: OAuth 2.0 con Google y GitHub (único método de acceso)                   |
| Base de datos | Supabase Postgres, Drizzle ORM y `postgres` (postgres-js)                               |
| Tiempo real   | Supabase Realtime, con polling de respaldo cada 15 s                                    |
| Cliente       | TanStack Query (mutaciones optimistas), dnd-kit, React Hook Form, Zod, sonner, Recharts |
| Pruebas       | Vitest (unitarias e integración) y Playwright (E2E)                                     |

Arquitectura por capas:

| Capa         | Ubicación                                | Contenido                               |
| ------------ | ---------------------------------------- | --------------------------------------- |
| Presentación | `src/app`, `src/components`, `src/hooks` | Páginas y componentes                   |
| Aplicación   | `src/server/services`                    | Casos de uso                            |
| Datos        | `src/server/db`                          | Esquema Drizzle y conexión              |
| Dominio puro | `src/lib`                                | Cálculos, formato, esquemas Zod, Kanban |

ESLint impide que las capas se importen en sentido contrario.

## Requisitos

- **Node.js 22 o superior** y npm 10 o superior (`node -v`).
- **Un proyecto de Supabase.** El plan gratuito sirve.
- **Credenciales OAuth** de una app de Google (Google Cloud Console) y de una OAuth App de GitHub.
- **Git.**
- **Docker Desktop**, solo para los tests E2E en local. Ver [¿Necesito Docker?](#necesito-docker).

## Puesta en marcha en local

### 1. Clonar e instalar

```bash
git clone https://github.com/eduardo109juarezbc-dot/OmniMarket.git
cd OmniMarket
npm ci
```

### 2. Configurar Supabase (una sola vez)

En el panel del proyecto de Supabase:

1. **Al crear el proyecto:**
   - desmarca _Automatically expose new tables_;
   - marca _Enable automatic RLS_;
   - elige la misma región que usarás en Vercel.

   Los permisos se conceden en la migración `drizzle/0001_security_realtime.sql`.

2. **Authentication → Sign In / Providers:**
   - **Google:** actívalo y pega el _Client ID_ y el _Client Secret_.
   - **GitHub:** actívalo y pega el _Client ID_ y el _Client Secret_.
   - **Email:** desactívalo. El acceso es exclusivamente por OAuth.
3. **Authentication → URL Configuration:**
   - _Site URL_: `http://localhost:3000`
   - _Redirect URLs_: `http://localhost:3000/**`

En las apps de Google y GitHub, la URL de callback autorizada es la de Supabase:

```
https://<tu-proyecto>.supabase.co/auth/v1/callback
```

En Google, añade además `http://localhost:3000` como _Authorized JavaScript origin_. Mientras la app de Google esté en modo _Testing_, solo pueden entrar los usuarios añadidos en _Audience → Test users_.

### 3. Variables de entorno

```bash
cp .env.example .env.local   # PowerShell: Copy-Item .env.example .env.local
```

Rellena `.env.local`. Nunca lo subas al repositorio: ya está en `.gitignore`.

| Variable                                                                | Dónde obtenerla                                                 |
| ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                              | Supabase → Project Settings → API (`https://<ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                                  | Supabase → Project Settings → API Keys (`sb_publishable_…`)     |
| `DATABASE_URL`                                                          | Supabase → **Connect** → _Transaction pooler_ (puerto **6543**) |
| `DATABASE_URL_DIRECT`                                                   | La misma cadena con el puerto **5432** (_Session pooler_)       |
| `TEST_API_TOKEN`                                                        | Un secreto propio de 16 o más caracteres (ver abajo)            |
| `NEXT_PUBLIC_CURRENCY` / `NEXT_PUBLIC_LOCALE` / `NEXT_PUBLIC_TIME_ZONE` | Opcionales. Por defecto `USD`, `es-ES` y `UTC`                  |

Para generar `TEST_API_TOKEN`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

En las dos URL de base de datos, sustituye `[YOUR-PASSWORD]` por la contraseña de la base, sin corchetes. Si tiene caracteres especiales, codifícalos: `@` → `%40`, `#` → `%23`, `:` → `%3A`, `/` → `%2F`, `?` → `%3F`, `&` → `%26`, `%` → `%25`, `"` → `%22`. Lo más sencillo es usar una contraseña solo con letras y números.

No hace falta activar el _IPv4 add-on_ de Supabase: el _Shared pooler_ ya funciona por IPv4.

Comprueba la configuración. El comando no muestra los valores y prueba las dos conexiones:

```bash
npm run env:check
```

### 4. Crear las tablas y cargar los datos de prueba

```bash
npm run db:migrate
npx tsx scripts/seed.ts --yes
```

La semilla es determinista: siempre carga 40 productos, 60 clientes, 300 pedidos y 738 líneas. El pedido `OM-0001` queda primero en la columna _Pendiente_.

El script **borra los datos de negocio** antes de cargarlos, aunque no toca los usuarios. Por eso pide `--yes` si la base no es local. En PowerShell, `npm run db:seed -- --yes` no reenvía el flag, así que usa `npx tsx` como arriba.

### 5. Arrancar

```bash
npm run dev
```

Abre <http://localhost:3000> e inicia sesión con Google o GitHub. Usa exactamente `localhost:3000`, porque es la URL autorizada en Supabase y en los proveedores OAuth.

Para probar el build de producción en local:

```bash
npm run build
npm run start
```

## Comandos

| Comando                                              | Para qué                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| `npm run dev`                                        | Servidor de desarrollo con recarga automática                 |
| `npm run build` / `npm run start`                    | Build y servidor de producción                                |
| `npm run lint`                                       | ESLint (incluye reglas de capas y la prohibición de spinners) |
| `npm run typecheck`                                  | Tipos de rutas y `tsc --noEmit`                               |
| `npm run format` / `npm run format:check`            | Prettier                                                      |
| `npm run test`                                       | Pruebas unitarias e integración (Vitest)                      |
| `npm run test:coverage`                              | Pruebas con cobertura de `src/lib`                            |
| `npm run test:e2e`                                   | Flujos E2E (Playwright; requiere Docker, ver abajo)           |
| `npm run db:generate`                                | Genera una migración tras cambiar `src/server/db/schema.ts`   |
| `npm run db:migrate`                                 | Aplica las migraciones pendientes (usa `DATABASE_URL_DIRECT`) |
| `npx tsx scripts/seed.ts --yes`                      | Restablece los datos de prueba                                |
| `npm run env:check`                                  | Valida `.env.local` y prueba la conexión                      |
| `npx tsx scripts/audit-endpoints.ts <url> [--reset]` | Verifica los endpoints `/api/test/*` y mide la latencia       |

## Endpoints de auditoría

Los dos `GET` son públicos y de solo lectura, sin datos personales. `reset-data` está protegido con la cabecera `x-test-token`.

```bash
# Métricas de ventas paginadas (SLA < 300 ms; la duración va en Server-Timing y meta.durationMs)
curl -i "http://localhost:3000/api/test/analytics?page=1&limit=50"

# Estado de un pedido tras moverlo en el Kanban (también ?orderId=<uuid>; sin parámetros, resumen por columna)
curl "http://localhost:3000/api/test/kanban-status?code=OM-0001"

# Restablecer los datos de prueba
curl -X POST -H "x-test-token: <TEST_API_TOKEN>" "http://localhost:3000/api/test/reset-data"
```

En PowerShell, usa `curl.exe` en lugar de `curl`, o `Invoke-RestMethod`.

| Endpoint                      | Respuestas                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/test/analytics`     | `200` con `summary`, `data` y `meta`. `400` si `page < 1` o `limit` no está entre 1 y 100                                             |
| `GET /api/test/kanban-status` | `200` con `status`, `columnLabel` y `position` (índice desde 0). `400` si los parámetros no son válidos. `404` si el pedido no existe |
| `POST /api/test/reset-data`   | `200` con los conteos. `401` si el token falta o es incorrecto. `503` si `TEST_API_TOKEN` no está configurado                         |

## ¿Necesito Docker?

**No, para usar la app.** La aplicación se conecta a tu proyecto de Supabase en la nube, tanto para la base de datos como para la autenticación y Realtime. `npm run dev` y `npm run build` no usan Docker.

Docker solo hace falta para levantar un Supabase local con `npx supabase start`, que se usa para:

- **Ejecutar los tests E2E en tu máquina** (`npm run test:e2e`). Los E2E simulan la sesión con un usuario de email y contraseña. Ese método solo está habilitado en el Supabase local (`supabase/config.toml`) y nunca en el proyecto real, donde el único acceso es OAuth.
- **Probar migraciones sin tocar la base real.**

En GitHub Actions el pipeline levanta su propio Supabase local, así que tampoco necesitas Docker encendido para el CI.

Si no lo estás usando, apágalo:

```bash
npx supabase stop
```

Después puedes cerrar Docker Desktop.

### Ejecutar los E2E en local

Los E2E cubren los tres flujos del PDF §5: autenticación, creación y drag and drop. Usan siempre el Supabase local y se niegan a ejecutarse contra una URL que no sea `127.0.0.1` o `localhost`.

1. Con Docker abierto y el Supabase local arrancado (ver abajo), instala el navegador una sola vez:

   ```bash
   npx playwright install chromium
   ```

2. Ejecuta la suite:

   ```bash
   npm run test:e2e
   ```

   Playwright hace todo lo demás:
   - aplica las migraciones al Supabase local;
   - crea el usuario de prueba y guarda su sesión;
   - compila la app en `.next-e2e` y la sirve en `http://localhost:3100`, así no choca con tu `npm run dev`;
   - restablece los datos antes de cada test.

   Si aparece cualquier error o aviso en la consola del navegador, el test falla.

   Para ver el informe: `npx playwright show-report`.

### Supabase local (opcional)

```bash
cp supabase/.env.example supabase/.env   # credenciales OAuth ficticias, suficientes para los E2E
npx supabase start -x "storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor"
npx supabase status                      # URL, claves y DB_URL del stack local
```

## CI/CD y despliegue

`.github/workflows/ci.yml` se ejecuta en cada push y pull request:

| Job            | Qué hace                                                                |
| -------------- | ----------------------------------------------------------------------- |
| `quality`      | Prettier, ESLint y tipos                                                |
| `unit`         | Vitest con cobertura (artifact `coverage`)                              |
| `e2e`          | Supabase local en el runner y Playwright (artifact `playwright-report`) |
| `migrate-prod` | `drizzle-kit migrate` contra la base de producción                      |
| `deploy`       | `vercel build` y `vercel deploy --prebuilt --prod`                      |
| `smoke`        | Verifica los 3 endpoints de auditoría en la URL de producción           |

Los tres últimos solo corren en `main`, con un push o con _Run workflow_. Además necesitan que `quality`, `unit` y `e2e` pasen y que la variable `DEPLOY_ENABLED` valga `true`. Nunca corren en pull requests.

`vercel.json` desactiva los despliegues automáticos de Vercel desde Git. Así **la única vía a producción es el pipeline**, y un test en rojo bloquea el despliegue. La región de las funciones (`pdx1`, Oregón) es la misma que la del proyecto de Supabase (`us-west-2`), para cumplir el SLA de 300 ms.

`.github/workflows/keepalive.yml` consulta la API cada 2 días para que el plan gratuito de Supabase no pause el proyecto.

### Configuración (una sola vez)

1. **Vercel:**
   - importa el repositorio, con framework Next.js y la raíz del repo como directorio raíz;
   - en _Settings → Environment Variables_ (entorno _Production_), añade: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, `TEST_API_TOKEN`, `NEXT_PUBLIC_SITE_URL` (la URL pública), `NEXT_PUBLIC_CURRENCY`, `NEXT_PUBLIC_LOCALE` y `NEXT_PUBLIC_TIME_ZONE`;
   - crea un token en _Account Settings → Tokens_;
   - los ids están en _Project Settings_ (`Project ID`) y en _Team/Account Settings_ (`Team ID`), o en `.vercel/project.json` tras ejecutar `npx vercel link`.
2. **GitHub → Settings → Secrets and variables → Actions:**

   | Tipo     | Nombre                                 | Valor                                                          |
   | -------- | -------------------------------------- | -------------------------------------------------------------- |
   | Secret   | `VERCEL_TOKEN`                         | Token de Vercel                                                |
   | Secret   | `VERCEL_ORG_ID`                        | Team ID (u Org ID) de Vercel                                   |
   | Secret   | `VERCEL_PROJECT_ID`                    | Project ID de Vercel                                           |
   | Secret   | `PROD_DATABASE_URL_DIRECT`             | Cadena del _Session pooler_ (puerto 5432) de producción        |
   | Secret   | `PROD_URL`                             | URL pública, p. ej. `https://<app>.vercel.app` (sin `/` final) |
   | Secret   | `NEXT_PUBLIC_SUPABASE_URL`             | URL del proyecto de Supabase (se incrusta en el build)         |
   | Secret   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key de Supabase (se incrusta en el build)          |
   | Variable | `DEPLOY_ENABLED`                       | `true` cuando lo anterior esté listo                           |

   El pipeline compila en GitHub y sube el resultado con `vercel deploy --prebuilt`. `vercel pull` no entrega el valor real de las variables marcadas como _Sensitive_ en Vercel. Por eso las que necesita el build se leen de GitHub, y el despliegue se detiene si faltan o tienen un formato incorrecto. Las variables de servidor (`DATABASE_URL`, `TEST_API_TOKEN`) las inyecta Vercel en tiempo de ejecución: se configuran solo en Vercel, y un cambio de valor se aplica en el siguiente despliegue.

3. **Protección de rama:** en _Settings → Branches_, marca `quality`, `unit` y `e2e` como checks obligatorios en `main`.
4. **Supabase y proveedores OAuth:**
   - añade `https://<app>.vercel.app/**` a _Redirect URLs_ y cambia _Site URL_ a la URL pública;
   - en Google, añade el dominio de Vercel como dominio autorizado y publica la app (_Audience → Publish app_), para que cualquier cuenta pueda entrar.
5. **Datos de prueba en producción:** tras el primer despliegue, ejecuta una vez:

   ```bash
   curl -X POST -H "x-test-token: <TEST_API_TOKEN>" https://<app>.vercel.app/api/test/reset-data
   ```

## Estructura

```text
src/
  app/                  rutas (App Router): (app)/dashboard, kanban, orders, products; login; auth/*; api/*
  components/           UI (ui/, skeletons/, dashboard/, kanban/, orders/, products/, layout/)
  hooks/                TanStack Query: mutaciones optimistas, Realtime, selección en lote
  lib/                  dominio puro: finanzas, formato, filtros, Kanban, esquemas Zod, auth
  server/               solo servidor: db (Drizzle), services, auth, http, route
  proxy.ts              sesión y protección de rutas (el antiguo middleware.ts)
e2e/                    Playwright: auth, creación y drag and drop
drizzle/                migraciones SQL
supabase/config.toml    stack local para E2E
scripts/                semilla, verificación de entorno y auditoría de endpoints
tests/unit/             Vitest
```

## Solución de problemas

- **El login vuelve a `/login` con un error.**
  - Revisa que `http://localhost:3000/**` esté en _Redirect URLs_ de Supabase.
  - Revisa que la callback de Google y GitHub sea la de Supabase.
  - Con Google en modo _Testing_, la cuenta debe estar en _Test users_.
- **`npm run env:check` indica "URL mal formada".** La contraseña de la base tiene caracteres especiales sin codificar. Ver el paso 3.
- **Aparece Google en la cabecera aunque entraste con GitHub, o al revés.** Si las dos cuentas comparten email, Supabase las vincula al mismo usuario. Cierra sesión y vuelve a entrar: la etiqueta muestra el proveedor del último inicio de sesión.
- **"Another next dev server is already running".** Ya tienes `npm run dev` abierto en otra terminal. Ciérralo o usa esa.
- **La primera petición tarda más de 300 ms.** Es el arranque en frío y el establecimiento de la conexión. El SLA se mide con la función en caliente.
