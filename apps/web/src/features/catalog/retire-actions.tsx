import { Button } from "@/components/ui/button";
import { useOnline } from "@/lib/use-online";
import { writeErrorMessage } from "@/lib/write-error";

interface RetireActionsProps {
  // «el sobre» o «la cuenta», para los textos.
  noun: string;
  archived: boolean;
  // No tiene nada: ni movimientos ni plan. Se borra en vez de archivarse (R20).
  deletable: boolean;
  // Por qué no se puede archivar todavía; null si se puede.
  blockedBy: string | null;
  pending: boolean;
  error: unknown;
  onArchive: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}

// Qué hacer con un sobre o una cuenta que ya no se usa (M11, R20): borrarlo si no tiene
// nada; si tiene historia, archivarlo, solo en cero, o reactivarlo. Si todavía no se
// puede, dice por qué en vez de esperar al error.
export function RetireActions({
  noun,
  archived,
  deletable,
  blockedBy,
  pending,
  error,
  onArchive,
  onReactivate,
  onDelete,
}: RetireActionsProps) {
  const online = useOnline();
  const disabled = !online || pending;
  return (
    <section aria-labelledby="retire-title" className="flex flex-col gap-3">
      <h2 id="retire-title" className="text-heading">
        {archived ? "En el archivo" : "Si ya no se usa"}
      </h2>
      {archived && (
        <>
          <p className="text-body text-ink-muted">
            No sale al registrar, al planear ni en las listas. Sus movimientos se siguen viendo.
          </p>
          <Button variant="outline" disabled={disabled} onClick={onReactivate}>
            Reactivar
          </Button>
        </>
      )}
      {deletable ? (
        <>
          <p className="text-body text-ink-muted">
            No tiene movimientos ni plan: se puede borrar sin dejar rastro.
          </p>
          <Button variant="outline" disabled={disabled} onClick={onDelete}>
            Borrar {noun}
          </Button>
        </>
      ) : (
        !archived && (
          <>
            <p className="text-body text-ink-muted">
              Al archivar {noun}, sale de Registrar, de las listas y del plan. Sus movimientos se
              siguen viendo, y se puede reactivar.
            </p>
            {blockedBy && <p className="text-body">{blockedBy}</p>}
            <Button variant="outline" disabled={disabled || blockedBy !== null} onClick={onArchive}>
              Archivar {noun}
            </Button>
          </>
        )
      )}
      {Boolean(error) && (
        <p role="alert" className="text-body text-destructive">
          No se pudo. {writeErrorMessage(error)}
        </p>
      )}
    </section>
  );
}
