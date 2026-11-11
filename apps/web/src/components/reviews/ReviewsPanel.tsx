import type { WorkspaceState } from "../../hooks/useWorkspace";
import { statuses } from "../../types";

export function ReviewsPanel({
  reviews,
  rating,
  setRating,
  status,
  setStatus,
  page,
  setPage,
  changeStatus,
}: Pick<
  WorkspaceState,
  | "reviews"
  | "rating"
  | "setRating"
  | "status"
  | "setStatus"
  | "page"
  | "setPage"
  | "changeStatus"
>) {
  return (
    <article className="panel">
      <div className="panel-heading">
        <h2>
          Обратная связь{" "}
          <span className="muted">· {reviews?.total ?? "—"}</span>
        </h2>
        <div className="review-filters">
          <select
            aria-label="Оценка"
            value={rating}
            onChange={(e) => {
              setRating(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Все оценки</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} ★
              </option>
            ))}
          </select>
          <select
            aria-label="Статус"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Все статусы</option>
            {Object.entries(statuses).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      {reviews ? (
        reviews.items.length ? (
          reviews.items.map((r) => (
            <div className="review" key={r.id}>
              <div className="review-heading">
                <strong>{r.author}</strong>
                <span className="stars">
                  {"★".repeat(r.rating)}
                  <span className="empty-stars">
                    {"★".repeat(5 - r.rating)}
                  </span>
                </span>
                <small className="muted">
                  {new Date(r.date).toLocaleDateString("ru-RU", {
                    timeZone: "UTC",
                  })}
                </small>
              </div>
              <p>{r.text}</p>
              <div className="review-bottom">
                <span className="muted">{r.branch.name}</span>
                <select
                  aria-label={"Статус отзыва " + r.author}
                  value={r.status}
                  onChange={(e) => void changeStatus(r.id, e.target.value)}
                >
                  {Object.entries(statuses).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))
        ) : (
          <p className="empty">Нет отзывов по выбранным фильтрам.</p>
        )
      ) : (
        <p>Загрузка…</p>
      )}
      <div className="pagination">
        <button
          className="secondary"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Назад
        </button>
        <span>Страница {page}</span>
        <button
          className="secondary"
          disabled={!reviews || page * 10 >= reviews.total}
          onClick={() => setPage((p) => p + 1)}
        >
          Далее
        </button>
      </div>
    </article>
  );
}
