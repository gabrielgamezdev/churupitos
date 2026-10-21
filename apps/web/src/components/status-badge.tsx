import { Badge } from "@/components/ui/badge";

// ✅ o ⏳, como en el Excel, dentro de una pastilla que además lo dice con palabras
// (M7): «✅ Cobrado», «⏳ Pendiente». Se lee igual en cualquier teléfono, y el lector de
// pantalla dice solo la palabra.
export function StatusBadge({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <Badge variant={done ? "done" : "pending"}>
      <span aria-hidden="true">{done ? "✅" : "⏳"}</span>
      {children}
    </Badge>
  );
}
