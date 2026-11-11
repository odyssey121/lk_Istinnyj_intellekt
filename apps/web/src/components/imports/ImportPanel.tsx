import { ImportLogs } from "./ImportLogs";
import { useImportSettings } from "../../hooks/useImportSettings";
import { SourceSettings } from "./SourceSettings";
import { ImportInstructions } from "./ImportInstructions";
import type { WorkspaceState } from "../../hooks/useWorkspace";
import { Download } from "lucide-react";

export function ImportPanel({
  branch,
  busy,
  runImport,
  notice,
}: Pick<WorkspaceState, "branch" | "busy" | "runImport" | "notice">) {
  const settings = useImportSettings();
  return (
    <article className="panel import-panel">
      <div className="branch-icon">
        <Download />
      </div>
      <h2>Обновление статистики</h2>
      <p className="muted">
        Выберите конкретный филиал и период до 90 дней в фильтрах выше.
        Повторная загрузка обновляет показатели без дубликатов.
      </p>
      <SourceSettings settings={settings} busy={busy} />
      <button
        className="primary"
        disabled={!branch || busy || !settings.ready}
        onClick={() => void runImport()}
      >
        {busy ? "Получаем статистику…" : "Импортировать данные"}{" "}
        <Download size={17} />
      </button>
      {!branch ? (
        <small className="muted">Для импорта необходимо выбрать филиал.</small>
      ) : null}
      {notice ? (
        <div className="success" role="status">
          {notice}
        </div>
      ) : null}
      <ImportInstructions />
      <ImportLogs busy={busy} />
    </article>
  );
}
