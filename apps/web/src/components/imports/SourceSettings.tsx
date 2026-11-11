import type { useImportSettings } from "../../hooks/useImportSettings";
import { ErrorBox } from "../common/ErrorBox";
export function SourceSettings({
  settings,
  busy,
}: {
  settings: ReturnType<typeof useImportSettings>;
  busy: boolean;
}) {
  const { values, isLoading, saving, dirty, message, error } = settings;
  return (
    <section
      className="source-settings"
      aria-labelledby="source-settings-title"
    >
      <h3 id="source-settings-title">Источник статистики</h3>
      <p className="muted">
        Настройки общие для всех импортов и сохраняются после перезапуска.
      </p>
      {isLoading ? <p>Загрузка настроек…</p> : null}
      <ErrorBox error={error} />
      {!values && !isLoading ? (
        <button className="secondary" onClick={() => void settings.retry()}>
          Повторить загрузку
        </button>
      ) : null}
      {values ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void settings.save();
          }}
        >
          <fieldset disabled={saving || busy}>
            <label>
              SOURCE_URL
              <input
                type="url"
                required
                maxLength={2048}
                placeholder="https://example.com/api/statistics"
                value={values.sourceUrl}
                onChange={(e) =>
                  settings.change({ ...values, sourceUrl: e.target.value })
                }
              />
            </label>
            <label>
              Метод запроса
              <select
                value={values.method}
                onChange={(e) =>
                  settings.change({
                    ...values,
                    method: e.target.value as "GET" | "POST",
                  })
                }
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </label>
            <button
              className="secondary"
              disabled={!dirty || saving || busy}
              type="submit"
            >
              {saving ? "Сохраняем…" : "Сохранить"}
            </button>
          </fieldset>
        </form>
      ) : null}
      {dirty ? (
        <p className="muted">Сначала сохраните настройки источника.</p>
      ) : null}
      {message ? (
        <div className="success" role="status">
          {message}
        </div>
      ) : null}
    </section>
  );
}
