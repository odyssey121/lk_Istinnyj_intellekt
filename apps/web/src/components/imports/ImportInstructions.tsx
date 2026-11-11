const importBody = JSON.stringify(
  { branchId: 1, dateFrom: "2026-11-01", dateTo: "2026-11-03" },
  null,
  2,
);
const sourceBody = JSON.stringify(
  { branchExternalId: "ext-1", dateFrom: "2026-11-01", dateTo: "2026-11-03" },
  null,
  2,
);
const sourceResponse = JSON.stringify(
  {
    branchExternalId: "ext-1",
    items: [
      { date: "2026-11-01", views: 300, clicks: 54, calls: 24, routes: 36 },
      { date: "2026-11-02", views: 320, clicks: 57, calls: 25, routes: 38 },
      { date: "2026-11-03", views: 340, clicks: 61, calls: 27, routes: 40 },
    ],
  },
  null,
  2,
);
export function ImportInstructions() {
  return (
    <details className="import-instructions">
      <summary>Инструкция по подключению источника</summary>
      <p>
        Укажите полный HTTP/HTTPS-адрес API. Для демонстрационного источника в
        Docker: <code>http://mock:4001/statistics</code>. Запрос выполняет
        backend: localhost означает сам контейнер API.
      </p>
      <h3>1. Запуск импорта в нашем API</h3>
      <p>
        <code>POST /api/imports/statistics</code> — используется при нажатии
        «Импортировать данные» независимо от метода источника.
      </p>
      <pre>{importBody}</pre>
      <h3>2. Запрос backend к источнику</h3>
      <p>GET передаёт внешний код филиала и даты в URL:</p>
      <pre>
        {
          "GET <SOURCE_URL>?branchExternalId=ext-1&dateFrom=2026-11-01&dateTo=2026-11-03"
        }
      </pre>
      <p>
        POST отправляет JSON с заголовком{" "}
        <code>Content-Type: application/json</code>:
      </p>
      <pre>{sourceBody}</pre>
      <h3>3. Ответ источника для обоих методов</h3>
      <pre>{sourceResponse}</pre>
      <p>
        Нужна одна запись за каждый день периода включительно, максимум 90 дней.
        Код филиала должен совпадать с запросом, показатели — целые
        неотрицательные числа. Повторный импорт обновляет значения без
        дубликатов.
      </p>
    </details>
  );
}
