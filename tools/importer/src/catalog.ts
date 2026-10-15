// El catálogo dice qué hoja del Excel es qué cuenta y a qué sobre o fuente de
// ingreso corresponde cada texto. Lleva los nombres reales, así que el de verdad
// vive en `privado/import/catalogo.yml`; las pruebas usan uno inventado.

import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { z } from "zod";
import type { Currency } from "./money.ts";
import { normalizeText } from "./text.ts";

const name = z.string().trim().min(1).max(40);
// Cada texto tal cual aparece en los Excels. Un nombre canónico no es alias de sí
// mismo salvo que se escriba también aquí, porque en el Excel lleva emoji.
const aliases = z.array(z.string().trim().min(1)).min(1);

const catalogSchema = z.object({
  accounts: z.array(
    z.object({
      name,
      currency: z.enum(["VES", "USD"]),
      // Una hoja que cambió de nombre tiene varios.
      sheets: aliases,
    }),
  ),
  envelopes: z.array(
    z.object({
      name,
      // «Otro»: dinero ajeno que pasa por las cuentas (R11).
      third_party: z.boolean().default(false),
      aliases,
    }),
  ),
  incomes: z.array(z.object({ name, aliases })),
  // La hoja del presupuesto, que no es una cuenta.
  budget_sheet: z.string().default("PRESUPUESTO"),
});

export type CatalogInput = z.input<typeof catalogSchema>;

export type Catalog = {
  accounts: { name: string; currency: Currency; position: number }[];
  envelopes: { name: string; thirdParty: boolean; position: number }[];
  incomes: { name: string; position: number }[];
  budgetSheet: string;
  accountBySheet: Map<string, string>;
  envelopeByAlias: Map<string, string>;
  incomeByAlias: Map<string, string>;
};

export class CatalogError extends Error {}

export function loadCatalog(path: string): Catalog {
  return buildCatalog(parse(readFileSync(path, "utf8")));
}

export function buildCatalog(input: unknown): Catalog {
  const parsed = catalogSchema.safeParse(input);
  if (!parsed.success) {
    throw new CatalogError(
      `El catálogo no tiene la forma esperada:\n${z.prettifyError(parsed.error)}`,
    );
  }
  const data = parsed.data;
  const problems: string[] = [];

  // Un texto que apunta a dos sitios haría que el resultado dependiera del orden.
  function index(kind: string, items: { name: string; aliases: string[] }[]) {
    const byAlias = new Map<string, string>();
    const names = new Set<string>();
    for (const item of items) {
      if (names.has(item.name)) problems.push(`${kind} repetido: «${item.name}»`);
      names.add(item.name);
      for (const alias of item.aliases.map(normalizeText)) {
        const previous = byAlias.get(alias);
        if (previous && previous !== item.name) {
          problems.push(`«${alias}» es a la vez de «${previous}» y de «${item.name}»`);
        }
        byAlias.set(alias, item.name);
      }
    }
    return byAlias;
  }

  const accountBySheet = index(
    "cuenta",
    data.accounts.map((account) => ({ name: account.name, aliases: account.sheets })),
  );
  const envelopeByAlias = index("sobre", data.envelopes);
  const incomeByAlias = index("ingreso", data.incomes);

  const thirdParty = data.envelopes.filter((envelope) => envelope.third_party);
  if (thirdParty.length > 1) {
    problems.push(`solo puede haber un sobre de dinero ajeno (D6), y hay ${thirdParty.length}`);
  }
  if (problems.length > 0) {
    throw new CatalogError(`El catálogo tiene errores:\n- ${problems.join("\n- ")}`);
  }

  return {
    accounts: data.accounts.map((account, i) => ({
      name: account.name,
      currency: account.currency,
      position: i + 1,
    })),
    envelopes: data.envelopes.map((envelope, i) => ({
      name: envelope.name,
      thirdParty: envelope.third_party,
      position: i + 1,
    })),
    incomes: data.incomes.map((income, i) => ({ name: income.name, position: i + 1 })),
    budgetSheet: normalizeText(data.budget_sheet),
    accountBySheet,
    envelopeByAlias,
    incomeByAlias,
  };
}
