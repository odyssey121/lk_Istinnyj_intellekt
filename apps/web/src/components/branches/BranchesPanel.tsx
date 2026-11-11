import type { WorkspaceState } from "../../hooks/useWorkspace";
import { ArrowUpRight, MapPin } from "lucide-react";

export function BranchesPanel({
  branches,
  setBranch,
  navigate,
}: Pick<WorkspaceState, "branches" | "setBranch" | "navigate">) {
  return (
    <div className="branch-grid">
      {branches?.map((b) => (
        <article className="panel branch" key={b.id}>
          <div className="branch-icon">
            <MapPin />
          </div>
          <span className="muted">{b.company.name}</span>
          <h2>{b.name}</h2>
          <p className="muted">{b.address}</p>
          <button
            className="secondary"
            onClick={() => {
              setBranch(String(b.id));
              navigate("/analytics");
            }}
          >
            Смотреть статистику <ArrowUpRight size={16} />
          </button>
        </article>
      ))}
      {branches?.length === 0 ? <p>Филиалов пока нет.</p> : null}
    </div>
  );
}
