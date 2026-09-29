import { describe, expect, it } from "vitest";

import { buildCalendarFile } from "@/lib/calendar";

const ics = buildCalendarFile(
  {
    id: "TK-24817",
    title: "Bad Bunny — World Tour",
    start: "2026-11-14T20:00:00-05:00",
    location: "Estadio Nacional, Calle José Díaz s/n; Lima",
    description: "Pedido TK-24817\n2 entradas",
  },
  new Date("2026-09-29T17:00:00Z")
);
const lines = ics.split("\r\n");

describe("buildCalendarFile", () => {
  it("wraps a single VEVENT in a VCALENDAR with CRLF line endings", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines.at(-1)).toBe("END:VCALENDAR");
    expect(lines).toContain("BEGIN:VEVENT");
    expect(lines).toContain("END:VEVENT");
    expect(lines).toContain("VERSION:2.0");
  });

  it("writes start, end (default 3h) and stamp in UTC", () => {
    expect(lines).toContain("DTSTART:20261115T010000Z");
    expect(lines).toContain("DTEND:20261115T040000Z");
    expect(lines).toContain("DTSTAMP:20260929T170000Z");
  });

  it("escapes commas, semicolons and new lines", () => {
    expect(lines).toContain("LOCATION:Estadio Nacional\\, Calle José Díaz s/n\\; Lima");
    expect(lines).toContain("DESCRIPTION:Pedido TK-24817\\n2 entradas");
    expect(lines).toContain("UID:TK-24817@ticketera");
  });
});
