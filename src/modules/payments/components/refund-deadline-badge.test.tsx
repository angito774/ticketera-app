import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RefundDeadlineBadge } from "./refund-deadline-badge";

describe("RefundDeadlineBadge", () => {
  it("muestra los días hábiles en plazo", () => {
    render(<RefundDeadlineBadge deadline={{ state: "on_track", businessDays: 3 }} />);
    expect(screen.getByText("3 de 15 días hábiles")).toBeInTheDocument();
  });

  it("muestra el aviso de plazo por vencer", () => {
    render(<RefundDeadlineBadge deadline={{ state: "warning", businessDays: 11 }} />);
    expect(screen.getByText(/Por vencer: 11 de 15 días hábiles/)).toBeInTheDocument();
  });

  it("muestra el plazo vencido", () => {
    render(<RefundDeadlineBadge deadline={{ state: "overdue", businessDays: 16 }} />);
    expect(screen.getByText(/Plazo vencido: 16 de 15 días hábiles/)).toBeInTheDocument();
  });

  it("no muestra días cuando no hay fecha de cancelación", () => {
    render(<RefundDeadlineBadge deadline={{ state: "unknown", businessDays: null }} />);
    expect(screen.getByText("Sin fecha de cancelación")).toBeInTheDocument();
    expect(screen.queryByText(/días hábiles/)).not.toBeInTheDocument();
  });
});
