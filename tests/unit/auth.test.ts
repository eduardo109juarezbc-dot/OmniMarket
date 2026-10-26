import { describe, expect, it } from "vitest";
import {
  isPublicPath,
  latestIdentityProvider,
  loginErrorMessage,
  loginPathFor,
  sanitizeNextPath,
  sessionUserFromClaims,
} from "@/lib/auth";

describe("sanitizeNextPath", () => {
  it("acepta rutas internas y rechaza redirecciones abiertas", () => {
    expect(sanitizeNextPath("/orders")).toBe("/orders");
    expect(sanitizeNextPath("/orders?status=PENDING&page=2")).toBe("/orders?status=PENDING&page=2");

    for (const unsafe of [
      null,
      undefined,
      "",
      "orders",
      "//evil.com",
      "/\\evil.com",
      "/%2F%2Fevil.com",
      "/%5Cevil.com",
      "https://evil.com",
      "javascript:alert(1)",
      "/%0d%0aSet-Cookie:x",
      "/\tevil",
      "/login",
      "/login?next=/orders",
      "/auth/callback?code=x",
      `/${"a".repeat(600)}`,
    ]) {
      expect(sanitizeNextPath(unsafe), String(unsafe)).toBe("/dashboard");
    }
  });

  it("construye la ruta de login con el destino y reconoce rutas públicas", () => {
    expect(loginPathFor("/kanban")).toBe("/login?next=%2Fkanban");
    expect(loginPathFor("/orders", "?page=2")).toBe("/login?next=%2Forders%3Fpage%3D2");
    expect(loginPathFor("/dashboard")).toBe("/login?next=%2Fdashboard");
    expect(loginPathFor("//evil.com")).toBe("/login");

    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/privacidad")).toBe(true);
    expect(isPublicPath("/dashboard")).toBe(false);

    expect(loginErrorMessage("oauth")).toMatch(/proveedor/);
    expect(loginErrorMessage("<script>")).toBeNull();
    expect(loginErrorMessage("toString")).toBeNull();
  });
});

describe("sessionUserFromClaims", () => {
  it("normaliza los datos de Google y de GitHub", () => {
    expect(
      sessionUserFromClaims({
        sub: "u1",
        email: "ana@example.com",
        user_metadata: { full_name: "Ana Gómez", picture: "https://lh3.googleusercontent.com/a" },
        app_metadata: { provider: "google" },
      }),
    ).toEqual({
      id: "u1",
      email: "ana@example.com",
      name: "Ana Gómez",
      avatarUrl: "https://lh3.googleusercontent.com/a",
      provider: "google",
    });

    expect(
      sessionUserFromClaims({
        sub: "u2",
        user_metadata: {
          user_name: "octocat",
          email: "octo@example.com",
          avatar_url: "https://avatars.githubusercontent.com/u/1",
        },
        app_metadata: { provider: "github" },
      }),
    ).toMatchObject({ name: "octocat", email: "octo@example.com", provider: "github" });

    // Cuentas vinculadas (mismo email): se muestra el proveedor del último login
    // (cookie), solo si está entre los vinculados según el JWT.
    const linked = {
      sub: "u4",
      email: "eva@example.com",
      app_metadata: { provider: "google", providers: ["google", "github"] },
    };
    expect(sessionUserFromClaims(linked, "github").provider).toBe("github");
    expect(sessionUserFromClaims(linked).provider).toBe("google");
    expect(sessionUserFromClaims(linked, "azure").provider).toBe("google");
    expect(
      sessionUserFromClaims(
        { ...linked, app_metadata: { provider: "google", providers: ["google"] } },
        "github",
      ).provider,
    ).toBe("google");

    // Proveedor desconocido (p. ej. email en el stack de E2E) y sin nombre.
    expect(
      sessionUserFromClaims({
        sub: "u3",
        email: "e2e@omnimarket.test",
        app_metadata: { provider: "email" },
      }),
    ).toMatchObject({ name: "e2e", provider: null, avatarUrl: null });
  });
});

describe("latestIdentityProvider", () => {
  it("elige la identidad OAuth con el inicio de sesión más reciente", () => {
    expect(
      latestIdentityProvider([
        { provider: "google", last_sign_in_at: "2026-10-25T23:58:53Z" },
        { provider: "github", last_sign_in_at: "2026-10-26T00:17:51Z" },
      ]),
    ).toBe("github");
    expect(
      latestIdentityProvider([
        { provider: "github", last_sign_in_at: "2026-10-01T00:00:00Z" },
        { provider: "google", last_sign_in_at: "2026-10-02T00:00:00Z" },
        { provider: "email", last_sign_in_at: "2026-10-03T00:00:00Z" },
      ]),
    ).toBe("google");
    expect(latestIdentityProvider([{ provider: "github", last_sign_in_at: null }])).toBeNull();
    expect(latestIdentityProvider(undefined)).toBeNull();
  });
});
