import { beforeEach, describe, expect, it, vi } from "vitest";

const { transaction } = vi.hoisted(() => ({ transaction: vi.fn() }));

vi.mock("@/db", () => ({ db: { transaction } }));

import { runAtomic, type Tx } from "./atomic";

const fakeTx = { id: "tx" } as unknown as Tx;

describe("runAtomic", () => {
  beforeEach(() => {
    transaction.mockReset();
    transaction.mockImplementation(async (callback: (tx: Tx) => Promise<unknown>) => callback(fakeTx));
  });

  it("devuelve [] sin abrir transacción cuando no hay sentencias", async () => {
    await expect(runAtomic([])).resolves.toEqual([]);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("ejecuta las sentencias en orden, todas contra la misma transacción", async () => {
    const order: string[] = [];
    const first = vi.fn(async (tx: Tx) => {
      order.push("first");
      return { tx, value: 1 };
    });
    const second = vi.fn(async () => {
      order.push("second");
      return [{ id: "a" }];
    });

    const results = await runAtomic([first, second]);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["first", "second"]);
    expect(first).toHaveBeenCalledWith(fakeTx);
    expect(results).toEqual([{ tx: fakeTx, value: 1 }, [{ id: "a" }]]);
  });

  it("propaga el error y no ejecuta las sentencias siguientes", async () => {
    const boom = new Error("23505");
    const after = vi.fn();

    await expect(
      runAtomic([
        async () => {
          throw boom;
        },
        after,
      ]),
    ).rejects.toBe(boom);
    expect(after).not.toHaveBeenCalled();
  });
});
