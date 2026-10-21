import { Link } from "@tanstack/react-router";

import { Button, buttonVariants } from "@/components/ui/button";
import { showToast } from "@/lib/toast";
import { useOnline } from "@/lib/use-online";
import { cn } from "@/lib/utils";
import { writeErrorMessage } from "@/lib/write-error";

import type { AppKind } from "./app-kinds";
import { undoDeletedOperation, useDeleteOperation } from "./save";

// Lo que dice el aviso al borrar, según lo que era.
const DELETED: Record<AppKind, string> = {
  expense: "Gasto borrado",
  income: "Ingreso borrado",
  envelope_transfer: "Movimiento borrado",
  account_transfer: "Traspaso borrado",
  exchange: "Cambio borrado",
};

interface OperationActionsProps {
  operationId: string;
  kind: AppKind;
  description: string;
  // Al borrarla: la hoja que la enseña se cierra.
  onDeleted?: () => void;
}

// Corregir o borrar una operación registrada en la app, desde su hoja. Borrar no
// pregunta: el aviso de abajo lo deshace (M7). Sin red, las dos se apagan.
export function OperationActions({
  operationId,
  kind,
  description,
  onDeleted,
}: OperationActionsProps) {
  const online = useOnline();
  const remove = useDeleteOperation();

  const deleteIt = () =>
    remove.mutate(operationId, {
      onSuccess: (snapshot) => {
        onDeleted?.();
        // Sin lo borrado, otro lo borró antes: no hay nada que deshacer.
        showToast(
          snapshot
            ? {
                message: DELETED[kind],
                detail: description || undefined,
                action: { label: "Deshacer", run: undoDeletedOperation(snapshot) },
              }
            : { message: "Ya estaba borrado" },
        );
      },
    });

  return (
    <div className="flex flex-col gap-2 border-t border-hairline pt-3">
      {remove.error && (
        <p role="alert" className="text-body text-destructive">
          No se borró. {writeErrorMessage(remove.error)}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/operations/$operationId/edit"
          params={{ operationId }}
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
