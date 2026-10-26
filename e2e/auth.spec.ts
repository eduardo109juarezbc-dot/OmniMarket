/**
 * Flujo E2E 1 — Autenticación (PDF §5): redirección de rutas privadas, OAuth
 * con Google y GitHub como únicos métodos y acceso con sesión simulada.
 */
import { E2E_USER, STORAGE_STATE } from "./env";
import { expect, test } from "./fixtures";
import { sessionCookies } from "./global-setup";

test.describe("sin sesión", () => {
  test("las rutas privadas redirigen a /login y solo se ofrece OAuth", async ({ page }) => {
    for (const path of ["/dashboard", "/kanban", "/orders", "/products"]) {
      await page.goto(path);
      await expect(page).toHaveURL(`/login?next=${encodeURIComponent(path)}`);
    }
    await page.goto("/");
    await expect(page).toHaveURL("/login?next=%2Fdashboard");

    await expect(page.getByTestId("login-google")).toBeVisible();
    await expect(page.getByTestId("login-github")).toBeVisible();
    // Requisito 2.3: sin formularios de email ni contraseña.
    await expect(page.locator('input[type="email"], input[type="password"]')).toHaveCount(0);

    const api = await page.request.get("/api/orders");
    expect(api.status()).toBe(401);
    expect((await api.json()).error.code).toBe("UNAUTHORIZED");
  });

  for (const provider of ["google", "github"] as const) {
    test(`"Continuar con ${provider}" redirige al proveedor con PKCE`, async ({ page }) => {
      await page.goto("/login?next=%2Fkanban");

      // Se intercepta la redirección a Supabase Auth: no se sale a internet.
      const authorize = page.waitForRequest((request) =>
        request.url().includes("/auth/v1/authorize"),
      );
      await page.route("**/auth/v1/authorize**", (route) =>
        route.fulfill({ status: 200, contentType: "text/html", body: "<p>Proveedor simulado</p>" }),
      );
      await page.getByTestId(`login-${provider}`).click();

      const url = new URL((await authorize).url());
      expect(url.searchParams.get("provider")).toBe(provider);
      expect(url.searchParams.get("code_challenge_method")?.toLowerCase()).toBe("s256");
      expect(url.searchParams.get("code_challenge")).toBeTruthy();
      const redirectTo = new URL(url.searchParams.get("redirect_to") ?? "");
      expect(redirectTo.pathname).toBe("/auth/callback");
      expect(redirectTo.searchParams.get("next")).toBe("/kanban");
    });
  }

  test("las páginas legales son públicas", async ({ page }) => {
    for (const [path, heading] of [
      ["/privacidad", "Política de privacidad"],
      ["/terminos", "Términos de uso"],
    ] as const) {
      await page.goto(path);
      await expect(page).toHaveURL(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    }
  });

  test("un callback inválido vuelve a /login con un mensaje en español", async ({ page }) => {
    await page.goto("/auth/callback?error=access_denied");
    await expect(page).toHaveURL("/login?error=oauth");
    await expect(page.getByTestId("login-error")).toContainText("Inténtalo de nuevo");
  });
});

test.describe("con sesión simulada", () => {
  test.use({ storageState: STORAGE_STATE });

  test("accede al dashboard y ve sus datos", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL("/dashboard");

    await expect(page.getByTestId("user-name")).toHaveText(E2E_USER.name);
    await expect(page.getByTestId("kpi-orders")).toContainText("279");
    await expect(page.getByTestId("sales-table").locator("tbody tr")).toHaveCount(10);
  });
});

test.describe("cierre de sesión", () => {
  test("cerrar sesión vuelve a /login y protege de nuevo las rutas", async ({ page, context }) => {
    // Sesión propia: cerrarla no afecta a la compartida del resto de specs.
    await context.addCookies(await sessionCookies());
    await page.goto("/dashboard");
    await expect(page.getByTestId("user-menu")).toBeVisible();

    await page.getByTestId("signout").click();
    await expect(page).toHaveURL("/login");
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login?next=%2Fdashboard");
  });
});
