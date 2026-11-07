import { Link } from "@tanstack/react-router";

import { Button, buttonVariants } from "@/components/ui/button";
import { undoDeletedOperation, useDeleteOperation } from "@/features/operations/save";
import { showToast } from "@/lib/toast";
import { useOnline } from "@/lib/use-online";
import { cn } from "@/lib/utils";
import { writeErrorMessage } from "@/lib/write-error";

import type { Debt } from "./queries";
import { undoDebtPaid, undoDeletedDebt, useDeleteDebt, useSetDebtPaid } from "./write";

// Lo que se hace con una deuda desde su fila: pagarla, que registra el gasto en el mismo
// paso (M13, R17); marcarla pagada sin gasto, si se pagó por otro medio; corregirla y
// borrarla, que no pregunta: el aviso de abajo lo deshace (M7). Una pagada con un gasto se
// deshace borrándolo, o se corrige el gasto: la deuda lo sigue. Sin red, todo se apaga.
export function DebtActions({ debt }: { debt: Debt }) {
  const online = useOnline();
  const setPaid = useSetDebtPaid();
  const remove = useDeleteDebt();
  const removePayment = useDeleteOperation();
  const paid = debt.paidOn !== null;
  const payable = debt.direction === "payable";
  const error = setPaid.error ?? remove.error ?? removePayment.error;

  const deleteIt = () =>
    remove.mutate(debt.id, {
      // Sin lo borrado, otro la borró antes: no hay nada que deshacer.
      onSuccess: (snapshot) =>
        showToast(
          snapshot
            ? {
                message: "Deuda borrada",
                detail: debt.description,
                action: { label: "Deshacer", run: undoDeletedDebt(snapshot) },
              }
            : { message: "Ya estaba borrada" },
        ),
    });

  // Borra el gasto: la base devuelve la deuda a pendiente, y «Deshacer» los deja como estaban.
  const undoPayment = (operationId: string) =>
    removePayment.mutate(operationId, {
      onSuccess: (snapshot) =>
        showToast(
          snapshot
            ? {
                message: "Pago deshecho",
                detail: debt.description,
                action: { label: "Deshacer", run: undoDeletedOperation(snapshot) },
              }
            : { message: "Ya estaba deshecho" },
        ),
    });

  return (
    <div className="flex flex-col gap-2 rounded-md bg-surface-sunken p-3">
      {error && (
        <p role="alert" className="text-body text-destructive">
          {remove.error ? "No se borró." : removePayment.error ? "No se deshizo." : "No se guardó."}{" "}
          {writeErrorMessage(error)}
        </p>
      )}
      {payable && !paid && (
        <Link
          to="/operations/pay/$debtId"
          params={{ debtId: debt.id }}
          disabled={!online}
          className={cn(buttonVariants(), !online && "opacity-50")}
        >
          Pagar
        </Link>
      )}
      {debt.payment ? (
        <>
          <Button
            variant="outline"
            disabled={!online || removePayment.isPending}
            onClick={() => debt.payment && undoPayment(debt.payment.operationId)}
          >
            {removePayment.isPending ? "Deshaciendo…" : "Deshacer el pago"}
          </Button>
          <p className="text-caption text-ink-muted">
            Borra el gasto y la deuda vuelve a pendiente.
          </p>
          <Link
            to="/operations/$operationId/edit"
            params={{ operationId: debt.payment.operationId }}
            disabled={!online}
            className={cn(buttonVariants({ variant: "outline" }), !online && "opacity-50")}
          >
            Corregir el pago
          </Link>
        </>
      ) : (
        <Button
          variant={paid || payable ? "outline" : "default"}
          disabled={!online || setPaid.isPending}
          onClick={() =>
            setPaid.mutate(
              { id: debt.id, paid: !paid },
              {
                onSuccess: () =>
                  showToast({
                    message: paid ? "Vuelve a estar pendiente" : "Marcada como pagada",
                    detail: debt.description,
                    action: { label: "Deshacer", run: undoDebtPaid(debt) },
                  }),
              },
            )
          }
        >
          {paid ? "No está pagada" : "Marcar pagada"}
        </Button>
      )}
      {paid && !payable && (
        <Link
          to="/operations/new"
          search={{
            kind: "income",
            amount: debt.amountCents,
            description: debt.description,
            currency: debt.currency,
          }}
          disabled={!online}
          className={cn(buttonVariants({ variant: "outline" }), !online && "opacity-50")}
        >
          Registrar el cobro
        </Link>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/debts/$debtId/edit"
          params={{ debtId: debt.id }}
          disabled={!online}
          className={cn(buttonVariants({ variant: "outline" }), !online && "opacity-50")}
        >
          Corregir
        </Link>
        <Button variant="outline" disabled={!online || remove.isPending} onClick={deleteIt}>
          {remove.isPending ? "Borrando…" : "Borrar"}
        </Button>
      </div>
    </div>
  );
}
