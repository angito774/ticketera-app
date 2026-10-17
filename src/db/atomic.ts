import { db } from "@/db";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Sentencia diferida: se construye contra la transacción que la ejecuta. */
export type Statement = (tx: Tx) => PromiseLike<unknown>;

/**
 * Ejecuta las sentencias en orden dentro de una sola transacción: si una falla, se revierte todo y el error
 * se propaga (con su código de Postgres en `error.cause`). Devuelve el resultado de cada sentencia.
 */
export async function runAtomic(statements: Statement[]): Promise<unknown[]> {
  if (statements.length === 0) return [];
  return db.transaction(async (tx) => {
    const results: unknown[] = [];
    for (const statement of statements) results.push(await statement(tx));
    return results;
  });
}
