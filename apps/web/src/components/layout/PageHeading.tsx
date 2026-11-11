import { pageTitles } from "../../constants";
import type { WorkspaceState } from "../../hooks/useWorkspace";
import { Building2 } from "lucide-react";

export function PageHeading({
  tab,
  branches,
}: Pick<WorkspaceState, "tab" | "branches">) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">ВАШ БИЗНЕС В ЦИФРАХ</div>
        <h1>{pageTitles[tab]}</h1>
        <p className="muted">
          Следите за присутствием бизнеса и вниманием ваших клиентов.
        </p>
      </div>
      <span className="tag">
        <Building2 size={16} /> {branches?.length ?? "—"} филиала
      </span>
    </div>
  );
}
