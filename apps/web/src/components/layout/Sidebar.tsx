import { NavLink } from "react-router-dom";
import { sectionPaths } from "../../constants";
import type { WorkspaceState } from "../../hooks/useWorkspace";
import type { User } from "../../types";
import {
  Activity,
  ChartNoAxesCombined,
  Download,
  LogOut,
  MapPin,
  MessageSquare,
} from "lucide-react";

export function Sidebar({
  setActionError,
  user,
  logout,
}: Pick<WorkspaceState, "setActionError"> & {
  user: User;
  logout: () => Promise<void>;
}) {
  return (
    <aside>
      <div className="brand">
        <Activity />
        <span>
          истинный
          <br />
          интеллект
        </span>
      </div>
      <div className="nav-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
      <nav>
        {[
          ["dashboard", "Аналитика", ChartNoAxesCombined],
          ["branches", "Филиалы", MapPin],
          ["reviews", "Отзывы", MessageSquare],
          ...(user.role === "ADMIN"
            ? [["imports", "Импорт данных", Download] as const]
            : []),
        ].map(([key, label, Icon]) => (
          <NavLink
            key={key as string}
            to={sectionPaths[key as keyof typeof sectionPaths]}
            end
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <Icon size={19} />
            {label as string}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="avatar">{user.role === "ADMIN" ? "А" : "К"}</div>
        <div>
          <strong>{user.role === "ADMIN" ? "Администратор" : "Клиент"}</strong>
          <small>{user.email}</small>
        </div>
        <button
          className="icon-button"
          title="Выйти"
          onClick={() => void logout().catch(setActionError)}
        >
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  );
}
