import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError, withQuery } from "@/lib/api-client";
import { DomainError, pgErrorCode, readJson, toErrorResponse } from "@/server/errors";
import { safeEqual } from "@/server/security";
import { containsPattern, utcDayRange } from "@/server/sql";

describe("utilidades de servidor", () => {
  it("escapa comodines de ILIKE y calcula rangos de días en UTC", () => {
    expect(containsPattern("teclado")).toBe("%teclado%");
    expect(containsPattern("50%_a\\b")).toBe("%50\\%\\_a\\\\b%");

    const { start, end } = utcDayRange("2026-09-01", "2026-09-30");
    expect(start?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(end?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(utcDayRange()).toEqual({ start: undefined, end: undefined });
  });

  it("compara secretos sin depender de la longitud y traduce errores a HTTP", async () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "abc")).toBe(false);

    const conflict = toErrorResponse(new DomainError(409, "SKU_TAKEN", "SKU repetido"), "test");
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).error).toEqual({ code: "SKU_TAKEN", message: "SKU repetido" });

    const zod = toErrorResponse(z.object({ a: z.number() }).safeParse({ a: "x" }).error, "test");
    expect(zod.status).toBe(400);
    expect((await zod.json()).error.details[0].path).toBe("a");

    expect(pgErrorCode({ cause: { code: "23505" } })).toBe("23505");
    expect(pgErrorCode(new Error("x"))).toBeUndefined();

    const badJson = new Request("http://localhost", { method: "POST", body: "{x" });
    await expect(readJson(badJson, z.object({}))).rejects.toMatchObject({ status: 400 });
  });

  it("el cliente de la API arma la query y expone errores por campo", () => {
    expect(withQuery("/api/orders", { page: 2, q: "", status: undefined, active: false })).toBe(
      "/api/orders?page=2&active=false",
    );
    expect(withQuery("/api/orders")).toBe("/api/orders");

    const error = new ApiError(400, "VALIDATION_ERROR", "Datos no válidos", [
      { path: "sku", message: "Este SKU ya está en uso" },
    ]);
    expect(error.fieldError("sku")).toBe("Este SKU ya está en uso");
    expect(error.fieldError("name")).toBeUndefined();
  });
});
