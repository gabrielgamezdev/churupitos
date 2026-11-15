import { describe, expect, it } from "vitest";

import { parseCapture } from "./parse-capture";

// Capturas inventadas, con las formas que tienen las de verdad: la etiqueta en una línea
// y el dato debajo, todo en una línea, la cifra grande arriba sin etiqueta, o en
// mayúsculas. Los importes con miles llevan la marca del barrido: son inventados.
const TODAY = "2026-11-15";
const read = (lines: string[]) => parseCapture(lines.join("\n"), TODAY);

const labelAbove = [
  "Pago Móvil - Emisión",
  "Su pago móvil ha sido Ejecutado exitosamente",
  "Cuenta debitada:",
  "Cta. Corriente: ***1234",
  "Beneficiario:",
  "0400-1112233 Pago V-1000000 - 0001",
  "Monto:",
  "Bs. 1.000,00", // barrido:permitido
  "Referencia:",
  "123456789",
  "Fecha de operación:",
  "2/11/2026 2:07:54 P. M.",
  "Concepto:",
  "Pago",
];

const inline = [
  "11:35 a. m. 16.7 K/S",
  "Comprobante de operación",
  "Transferencias a terceros",
  "4.000,00 Bs", // barrido:permitido
  "Fecha: 06/11/2026",
  "Operación: 059100000000",
  "Origen: 0001****1234",
  "Destino: 0001****5678",
  "Concepto: pago",
];

const upperCase = [
  "Transacción exitosa",
  "NUMERO DE REFERENCIA:",
  "100000000000",
  "MONTO DE LA OPERACIÓN:",
  "Bs. 1.500,00", // barrido:permitido
  "CI /RIF BENEFICIARIO:",
  "V-10000000",
  "TELF BENEFICIARIO:",
  "04001112233",
  "FECHA:",
  "06/11/26 12:38 pm",
];

describe("leer una captura", () => {
  it("con la etiqueta encima del dato", () => {
    expect(read(labelAbove)).toEqual({
      amountCents: 100000,
      day: "2026-11-02",
      description: null,
      accountId: null,
      receipt: false,
    });
  });

  it("con la etiqueta y el dato en la misma línea, y la cifra grande sin etiqueta", () => {
    expect(read(inline)).toEqual({
      amountCents: 400000,
      day: "2026-11-06",
      description: null,
      accountId: null,
      receipt: false,
    });
  });

  it("en mayúsculas, con el año en dos cifras y sin concepto", () => {
    expect(read(upperCase)).toEqual({
      amountCents: 150000,
      day: "2026-11-06",
      description: null,
      accountId: null,
      receipt: false,
    });
  });

  it("lo que no está queda en null", () => {
    expect(read(["Comprobante", "Operación exitosa"])).toEqual({
      amountCents: null,
      day: null,
      description: null,
      accountId: null,
      receipt: false,
    });
  });
});

describe("el monto", () => {
  it("con miles y céntimos, a la manera de aquí o en dólares", () => {
    expect(read(["Monto: Bs 2.000.000,50"]).amountCents).toBe(200000050); // barrido:permitido
    expect(read(["Monto: 25,00"]).amountCents).toBe(2500);
    expect(read(["Amount 1,250.00 USDT"]).amountCents).toBe(125000);
    expect(read(["Total: $ 30.00"]).amountCents).toBe(3000);
  });

  it("no confunde un teléfono, una cédula, una referencia o una hora con un monto", () => {
    expect(
      read(["0400-1112233", "V-10.000.000", "Referencia 123456789", "9:40:33 PM", "16.7 K/S"])
        .amountCents,
    ).toBeNull();
  });

  it("prefiere el de la etiqueta «Monto» al de otra cifra", () => {
    expect(read(["Ref 10,00", "Monto:", "Bs. 20,00"]).amountCents).toBe(2000);
  });

  it("a igual etiqueta, el primero: lo que se pagó va antes que el total con comisión", () => {
    expect(read(["Monto: Bs 100,00", "Total debitado: Bs 100,30"]).amountCents).toBe(10000);
  });

  it("ni el saldo ni la comisión son lo que se pagó", () => {
    expect(read(["Saldo disponible:", "Bs. 900,00", "Monto: Bs. 50,00"]).amountCents).toBe(5000);
    expect(read(["Comisión: Bs 0,30", "Monto: Bs 100,00"]).amountCents).toBe(10000);
    expect(read(["Saldo disponible: Bs. 900,00"]).amountCents).toBeNull();
  });

  it("un dólar cripto con hasta ocho decimales: se toman los dos primeros", () => {
    expect(read(["Pago exitoso", "40.12345678 USDT"]).amountCents).toBe(4012);
    expect(read(["Pagado con 9.999 USDC"]).amountCents).toBe(999);
    expect(read(["40,12345678 usdt"]).amountCents).toBe(4012);
    // Sin la moneda, tres decimales o más no son un monto.
    expect(read(["40.12345678"]).amountCents).toBeNull();
  });

  it("con el punto pegado a «Bs.»", () => {
    expect(read(["Monto Bs.10,00"]).amountCents).toBe(1000);
  });
});

describe("la fecha", () => {
  it("en las formas de los bancos y de las apps en dólares", () => {
    expect(read(["06-11-2026"]).day).toBe("2026-11-06");
    expect(read(["06.11.26"]).day).toBe("2026-11-06");
    expect(read(["2026-11-06 21:40:33"]).day).toBe("2026-11-06");
    expect(read(["6 nov 2026"]).day).toBe("2026-11-06");
    expect(read(["6 de noviembre de 2026, 9:40 p. m."]).day).toBe("2026-11-06");
  });

  it("en UTC, antes de las 4:00 aquí aún era el día anterior", () => {
    expect(read(["Pagaste 10.00 USDT el 2026-11-14 21:25:15(UTC)"]).day).toBe("2026-11-14");
    expect(read(["Pagaste 10.00 USDT el 2026-11-14 01:25:15(UTC)"]).day).toBe("2026-11-13");
    expect(read(["2026-11-14 01:25:15"]).day).toBe("2026-11-14");
  });

  it("primero el día, salvo que el mes no pueda ser mes", () => {
    expect(read(["03/11/2026"]).day).toBe("2026-11-03");
    expect(read(["11/13/2026"]).day).toBe("2026-11-13");
  });

  it("prefiere la que lleva «Fecha», en su línea o encima", () => {
    expect(read(["Vence 01/12/2025", "Fecha de la operación:", "05/11/2026"]).day).toBe(
      "2026-11-05",
    );
  });

  it("descarta un día que no existe o que aún no llegó: sería una lectura mala", () => {
    expect(read(["Fecha: 31/11/2026"]).day).toBeNull();
    expect(read(["Fecha: 16/11/2026"]).day).toBeNull();
    expect(read(["Fecha: 15/11/2026"]).day).toBe("2026-11-15");
  });
});

describe("el concepto", () => {
  it("el que se escribió al pagar, en su línea o debajo de la etiqueta", () => {
    expect(read(["Concepto: Luz de octubre"]).description).toBe("Luz de octubre");
    expect(read(["Concepto:", "Mercado del sábado", "Banco destino:"]).description).toBe(
      "Mercado del sábado",
    );
    expect(read(["DESCRIPCIÓN: Farmacia."]).description).toBe("Farmacia");
  });

  it("lo que ponen los bancos cuando no se escribe nada, vacío", () => {
    expect(read(["Concepto: Pago"]).description).toBeNull();
    expect(read(["Concepto:", "pago móvil"]).description).toBeNull();
    expect(read(["Concepto:", "Fecha:"]).description).toBeNull();
    expect(read(["Concepto: 12345"]).description).toBeNull();
  });
});

describe("la cuenta", () => {
  const accounts = [
    { accountId: "first", hints: ["1234"] },
    { accountId: "second", hints: ["5678", "Banco Dos"] },
    { accountId: "empty", hints: [] },
  ];
  const accountOf = (lines: string[], list = accounts) =>
    parseCapture(lines.join("\n"), TODAY, list).accountId;

  it("la que aparece, por sus últimos dígitos o por una palabra", () => {
    expect(accountOf(labelAbove)).toBe("first");
    expect(accountOf(["BANCO DOS", "Pago móvil"])).toBe("second");
  });

  it("si aparecen dos, la primera: la de origen va antes que la de destino", () => {
    expect(accountOf(inline)).toBe("first");
    expect(accountOf(["Origen: 0001****5678", "Destino: 0001****1234"])).toBe("second");
  });

  it("unos dígitos sueltos dentro de otra cifra no cuentan", () => {
    expect(accountOf(["Referencia 912345", "Teléfono 0400-5678000"])).toBeNull();
  });

  it("sin ninguna, o con dos en el mismo sitio, ninguna", () => {
    expect(accountOf(upperCase)).toBeNull();
    expect(
      accountOf(labelAbove, [
        { accountId: "one", hints: ["1234"] },
        { accountId: "other", hints: [" 1234 "] },
      ]),
    ).toBeNull();
  });
});

describe("la foto de una factura", () => {
  // Como se lee una foto: con ruido alrededor, una cifra mal leída (la base, que es igual
  // al subtotal) y sin la etiqueta del total.
  const receipt = [
    "SENIAT",
    "COMERCIO DE EJEMPLO, C.A.",
    "Transaccion: 10000",
    "FACTURA",
    "FECHA: 13-11-2026 HORA: 14:48",
    "Plato del dia (G) Bs 1.200,00", // barrido:permitido
    "Bebida (G) Bs 300,00",
    "PuBrTL Bs 1.500,00", // barrido:permitido
    "BI G16,00% Bs 7.500,00 IVA G16,00% Bs 240,00", // barrido:permitido
    "Efectivo Bs 2.000,00", // barrido:permitido
    "Cambio Bs 260,00",
    "e Ds 1.740,00 L A", // barrido:permitido
  ];

  it("el monto es el total, el último; el concepto, «Factura»; y sin cuenta", () => {
    expect(
      parseCapture(receipt.join("\n"), TODAY, [{ accountId: "first", hints: ["Ejemplo"] }]),
    ).toEqual({
      amountCents: 174000,
      day: "2026-11-13",
      description: "Factura",
      accountId: null,
      receipt: true,
    });
  });

  it("si se lee «Total», el suyo, aunque haya cifras después", () => {
    expect(
      read(["FACTURA", "TOTAL Bs 1.740,00", "Ref. de la caja 10,00"]).amountCents, // barrido:permitido
    ).toBe(174000);
  });

  it("una captura de un pago no es una factura", () => {
    expect(read(labelAbove).receipt).toBe(false);
  });
});
