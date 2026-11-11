import { useState } from "react";
import useSWR from "swr";
import { api } from "../../api";
import { ErrorBox } from "../common/ErrorBox";
type LogEntry = {
  id: number;
  runId: string;
  attempt: number;
  redirect: number;
  branchName: string;
  initiatedBy: string;
  createdAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  method: string;
  url: string;
  responseStatus: number | null;
  error: string | null;
};
type LogDetail = LogEntry & {
  requestHeaders: Record<string, string>;
  requestBody: string | null;
  responseHeaders: Record<string, string> | null;
  responseBody: string | null;
};
function pretty(value: string | null | Record<string, string>) {
  if (value === null) return "Нет данных";
  if (typeof value !== "string") return JSON.stringify(value, null, 2);
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value || "(пустое тело)";
  }
}
function LogDetails({
  id,
  open,
  busy,
}: {
  id: number;
  open: boolean;
  busy: boolean;
}) {
  const { data, error } = useSWR<LogDetail>(
    open ? "/imports/logs/" + id : null,
    api,
    { refreshInterval: busy ? 1000 : 0 },
  );
  if (!open) return null;
  if (error) return <ErrorBox error={error} />;
  if (!data) return <p>Загрузка запроса и ответа…</p>;
  return (
    <div className="import-log-details">
      <p>
        Импорт: <code>{data.runId}</code>
        <br />
        Запустил: {data.initiatedBy}
      </p>
      <h4>Запрос: {data.method}</h4>
      <pre>{data.url}</pre>
      <h4>Заголовки запроса</h4>
      <pre>{pretty(data.requestHeaders)}</pre>
      <h4>Тело запроса</h4>
      <pre>
        {data.requestBody === null
          ? "Без тела запроса"
          : pretty(data.requestBody)}
      </pre>
      <h4>Ответ: {data.responseStatus ?? "HTTP-ответ не получен"}</h4>
      <h4>Заголовки ответа</h4>
      <pre>{pretty(data.responseHeaders)}</pre>
      <h4>Тело ответа</h4>
      <pre>{pretty(data.responseBody)}</pre>
      {data.error ? <p className="error">{data.error}</p> : null}
      <p className="muted">
        Заголовки запроса указаны в том виде, в котором их задаёт приложение;
        служебные заголовки HTTP-клиента добавляются автоматически.
      </p>
    </div>
  );
}
function LogItem({ entry, busy }: { entry: LogEntry; busy: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="import-log"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <strong>
          {entry.method} ·{" "}
          {entry.responseStatus ??
            (entry.finishedAt ? "Ошибка сети" : "Не завершён")}
        </strong>
        <span>
          {new Date(entry.createdAt).toLocaleString("ru-RU")} ·{" "}
          {entry.branchName}
        </span>
        <span>
          Попытка {entry.attempt}
          {entry.redirect ? ` · Перенаправление ${entry.redirect}` : ""} ·{" "}
          {entry.durationMs === null ? "…" : entry.durationMs + " мс"}
        </span>
        <span className="import-log-url">{entry.url}</span>
        {entry.error ? (
          <span className="import-log-error">{entry.error}</span>
        ) : null}
      </summary>
      <LogDetails id={entry.id} open={open} busy={busy} />
    </details>
  );
}
export function ImportLogs({ busy }: { busy: boolean }) {
  const [page, setPage] = useState(1);
  const { data, error, mutate, isLoading, isValidating } = useSWR<{
    items: LogEntry[];
    total: number;
  }>("/imports/logs?page=" + page + "&pageSize=10", api, {
    refreshInterval: busy ? 1000 : 0,
  });
  return (
    <section className="import-logs" aria-labelledby="import-logs-title">
      <div className="panel-heading">
        <h3 id="import-logs-title">Журнал обращений к источникам</h3>
        <button
          className="secondary"
          disabled={isValidating}
          onClick={() => void mutate()}
        >
          Обновить
        </button>
      </div>
      <p className="muted">
        Все попытки запросов и ответы, включая ошибки и перенаправления.
        Раскройте запись для просмотра содержимого.
      </p>
      <ErrorBox error={error} />
      {isLoading ? <p>Загрузка журнала…</p> : null}
      {data?.items.map((entry) => (
        <LogItem entry={entry} busy={busy} key={entry.id} />
      ))}
      {data?.total === 0 ? (
        <p className="empty">Обращений к источникам пока нет.</p>
      ) : null}
      <div className="pagination">
        <button
          className="secondary"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Назад
        </button>
        <span>
          Страница {page} · Всего {data?.total ?? "—"}
        </span>
        <button
          className="secondary"
          disabled={!data || page * 10 >= data.total}
          onClick={() => setPage((p) => p + 1)}
        >
          Далее
        </button>
      </div>
    </section>
  );
}
