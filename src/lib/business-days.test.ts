import { afterEach, describe, expect, it, vi } from "vitest";
import { addBusinessDays, toLimaDate } from "./business-days";

describe("addBusinessDays", () => {
  it("devuelve la misma fecha con 0 días", () => {
    expect(addBusinessDays("2026-10-05", 0)).toBe("2026-10-05");
    expect(addBusinessDays("2026-10-10", 0)).toBe("2026-10-10");
  });

  it("suma 1 día hábil desde un lunes", () => {
    expect(addBusinessDays("2026-10-05", 1)).toBe("2026-10-06");
  });

  it("viernes + 1 día hábil es el lunes", () => {
    expect(addBusinessDays("2026-10-09", 1)).toBe("2026-10-12");
  });

  it("desde sábado, el día 1 es el lunes siguiente", () => {
    expect(addBusinessDays("2026-10-10", 1)).toBe("2026-10-12");
  });

  it("desde domingo, el día 1 es el lunes siguiente", () => {
    expect(addBusinessDays("2026-10-11", 1)).toBe("2026-10-12");
  });

  it("sábado + 5 días hábiles es el viernes siguiente", () => {
    expect(addBusinessDays("2026-10-10", 5)).toBe("2026-10-16");
  });

  it("5 días hábiles desde lunes es el lunes siguiente", () => {
    expect(addBusinessDays("2026-10-05", 5)).toBe("2026-10-12");
  });

  it("cruza el fin de mes", () => {
    expect(addBusinessDays("2026-10-29", 3)).toBe("2026-11-03");
  });

  it("cruza el fin de año", () => {
    expect(addBusinessDays("2026-12-30", 2)).toBe("2027-01-01");
    expect(addBusinessDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addBusinessDays("2026-12-31", 2)).toBe("2027-01-04");
  });

  it("maneja febrero bisiesto", () => {
    expect(addBusinessDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addBusinessDays("2028-02-29", 1)).toBe("2028-03-01");
  });

  it.each([
    ["2026-10-05", "2026-10-26"],
    ["2026-10-07", "2026-10-28"],
    ["2026-10-09", "2026-10-30"],
    ["2026-10-10", "2026-10-30"],
    ["2026-10-11", "2026-10-30"],
    ["2026-12-21", "2027-01-11"],
  ])("15 días hábiles desde %s es %s", (start, expected) => {
    expect(addBusinessDays(start, 15)).toBe(expected);
  });

  it("el resultado nunca cae en fin de semana", () => {
    for (let day = 1; day <= 28; day += 1) {
      const start = `2026-02-${String(day).padStart(2, "0")}`;
      const weekday = new Date(`${addBusinessDays(start, 15)}T00:00:00Z`).getUTCDay();
      expect([0, 6]).not.toContain(weekday);
    }
  });

  it("no depende de la zona horaria del proceso", () => {
    vi.stubEnv("TZ", "Pacific/Auckland");
    expect(addBusinessDays("2026-10-09", 1)).toBe("2026-10-12");
    vi.stubEnv("TZ", "America/Los_Angeles");
    expect(addBusinessDays("2026-10-05", 15)).toBe("2026-10-26");
    vi.unstubAllEnvs();
  });

  it("rechaza fechas con formato inválido", () => {
    expect(() => addBusinessDays("05/10/2026", 1)).toThrow();
    expect(() => addBusinessDays("", 1)).toThrow();
  });

  it("rechaza días negativos o no enteros", () => {
    expect(() => addBusinessDays("2026-10-05", -1)).toThrow();
    expect(() => addBusinessDays("2026-10-05", 1.5)).toThrow();
  });
});

describe("toLimaDate", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("03:00 UTC del sábado sigue siendo viernes en Lima", () => {
    expect(toLimaDate(new Date("2026-10-10T03:00:00Z"))).toBe("2026-10-09");
  });

  it("04:59 UTC sigue en el día anterior y 05:00 UTC ya es el día siguiente", () => {
    expect(toLimaDate(new Date("2026-10-10T04:59:59Z"))).toBe("2026-10-09");
    expect(toLimaDate(new Date("2026-10-10T05:00:00Z"))).toBe("2026-10-10");
  });

  it("medianoche UTC de Año Nuevo es todavía el 31 de diciembre en Lima", () => {
    expect(toLimaDate(new Date("2027-01-01T00:00:00Z"))).toBe("2026-12-31");
  });

  it("mediodía UTC coincide con la fecha UTC", () => {
    expect(toLimaDate(new Date("2026-10-07T12:00:00Z"))).toBe("2026-10-07");
  });

  it("no depende de la zona horaria del proceso", () => {
    vi.stubEnv("TZ", "Pacific/Auckland");
    expect(toLimaDate(new Date("2026-10-10T03:00:00Z"))).toBe("2026-10-09");
  });

  it("combina con addBusinessDays: registro el viernes a las 22:00 Lima", () => {
    const registered = toLimaDate(new Date("2026-10-10T03:00:00Z"));
    expect(addBusinessDays(registered, 1)).toBe("2026-10-12");
  });
});
