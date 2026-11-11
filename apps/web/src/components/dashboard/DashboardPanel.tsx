import type { WorkspaceState } from "../../hooks/useWorkspace";
import {
  Activity,
  Eye,
  Globe,
  MessageSquare,
  Phone,
  Route,
  Star,
} from "lucide-react";
import { Chart } from "./Chart";
import { number } from "../../constants";

export function DashboardPanel({
  summary,
  series,
  isLoading,
}: Pick<WorkspaceState, "summary" | "series" | "isLoading">) {
  const metrics = [
    ["views", "Просмотры карточек", Eye],
    ["clicks", "Переходы на сайт", Globe],
    ["calls", "Звонки", Phone],
    ["routes", "Построенные маршруты", Route],
    ["rating", "Средний рейтинг", Star],
    ["reviews", "Отзывы за период", MessageSquare],
  ] as const;

  return (
    <>
      <div className="metrics">
        {metrics.map(([key, label, Icon]) => (
          <article className="metric" key={key}>
            <div className="metric-top">
              <span>{label}</span>
              <Icon size={19} />
            </div>
            <strong>
              {isLoading
                ? "…"
                : summary?.[key] == null
                  ? "—"
                  : key === "rating"
                    ? summary[key]!.toFixed(1)
                    : number.format(summary[key]!)}
            </strong>
            <small>
              {key === "rating"
                ? "По отзывам за выбранный период"
                : "За выбранный период"}
            </small>
          </article>
        ))}
      </div>
      <article className="panel">
        <div className="panel-heading">
          <div>
            <h2>Динамика просмотров</h2>
            <p className="muted">Как часто клиенты находят ваши карточки</p>
          </div>
          <span className="legend">
            <i /> Просмотры
          </span>
        </div>
        {series ? (
          <Chart rows={series} />
        ) : (
          <p className="muted">Загрузка графика…</p>
        )}
      </article>
      <div className="info">
        <Activity size={20} />
        <div>
          <strong>Все показатели — в одном месте</strong>
          <p>
            Выберите филиал, чтобы изучить его результаты. Средний рейтинг
            рассчитан по отзывам за выбранный период.
          </p>
        </div>
      </div>
    </>
  );
}
