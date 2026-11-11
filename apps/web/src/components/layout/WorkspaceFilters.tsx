import type { WorkspaceState } from "../../hooks/useWorkspace";
import type { User } from "../../types";

export function WorkspaceFilters({
  company,
  setCompany,
  branch,
  setBranch,
  from,
  setFrom,
  to,
  setTo,
  setPage,
  companies,
  branches,
  user,
  showPeriod = true,
}: Pick<
  WorkspaceState,
  | "company"
  | "setCompany"
  | "branch"
  | "setBranch"
  | "from"
  | "setFrom"
  | "to"
  | "setTo"
  | "setPage"
  | "companies"
  | "branches"
> & { user: User; showPeriod?: boolean }) {
  return (
    <div className="filters">
      {user.role === "ADMIN" ? (
        <label>
          Компания
          <select
            value={company}
            onChange={(e) => {
              setCompany(e.target.value);
              setBranch("");
              setPage(1);
            }}
          >
            <option value="">Все компании</option>
            {companies?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label>
        Филиал
        <select
          value={branch}
          onChange={(e) => {
            setBranch(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Все филиалы</option>
          {branches?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      {showPeriod ? (
        <>
          <label>
            Начало периода
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            Конец периода
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </>
      ) : null}
    </div>
  );
}
