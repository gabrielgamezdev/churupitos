import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { useOnline } from "@/lib/use-online";
import { cn } from "@/lib/utils";
import { writeErrorMessage } from "@/lib/write-error";

import { useDeleteOperation } from "./save";

interface OperationActionsProps {
  operationId: string;
  // Al borrarla: la hoja que la enseña se cierra.
  onDeleted?: () => void;
}

// Corregir o borrar una operación registrada en la app, desde su hoja. Borrar pide
// confirmarlo ahí mismo; sin red, las dos se apagan.
export function OperationActions({ operationId, onDeleted }: OperationActionsProps) {
  const online = useOnline();
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteOperation();

  if (confirming) {
    return (
      <div className="flex flex-col gap-2 border-t border-hairline pt-3">
        <p className="text-body">¿Borrar este movimiento? Los saldos vuelven a como estaban.</p>
        {remove.error && (
          <p role="alert" className="text-body text-destructive">
            No se borró. {writeErrorMessage(remove.error)}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!online || remove.isPending}
            onClick={() => remove.mutate(operationId, { onSuccess: onDeleted })}
          >
            {remove.isPending ? "Borrando…" : "Borrar"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 border-t border-hairline pt-3">
      <Link
        to="/operations/$operationId/edit"
        params={{ operationId }}
        disabled={!online}
        className={cn(buttonVariants({ variant: "outline" }), !online && "opacity-50")}
      >
        Corregir
      </Link>
      <Button variant="outline" disabled={!online} onClick={() => setConfirming(true)}>
        Borrar
      </Button>
    </div>
  );
}
