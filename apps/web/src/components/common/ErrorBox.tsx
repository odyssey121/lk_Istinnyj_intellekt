export function ErrorBox({ error }: { error: unknown }) {
  return error ? (
    <div className="error" role="alert">
      {error instanceof Error ? error.message : "Ошибка загрузки"}
    </div>
  ) : null;
}
