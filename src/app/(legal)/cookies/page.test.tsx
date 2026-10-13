import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CookiesPage, { metadata } from "./page";

describe("CookiesPage", () => {
  it("renders the h1", () => {
    render(<CookiesPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Política de cookies" })).toBeInTheDocument();
  });

  it("sets the metadata title", () => {
    expect(metadata.title).toBe("Política de cookies · Ticketera");
  });
});
