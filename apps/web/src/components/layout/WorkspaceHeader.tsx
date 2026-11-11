import { pageTitles } from "../../constants";
import type { WorkspaceState } from "../../hooks/useWorkspace";
import type { User } from "../../types";
import { LogOut } from "lucide-react";

export function WorkspaceHeader({
  tab,
  setActionError,
  user,
  logout,
}: Pick<WorkspaceState, "tab" | "setActionError"> & {
  user: User;
  logout: () => Promise<void>;
}) {
  return (
    <header>
      <span>
        Личный кабинет <span className="slash">/</span> {pageTitles[tab]}
      </span>
      <span className="live">
        <i /> Данные геосервисов
      </span>
      <button
        className="mobile-logout icon-button"
        title="Выйти"
        onClick={() => void logout().catch(setActionError)}
      >
        <LogOut size={18} />
      </button>
    </header>
  );
}
