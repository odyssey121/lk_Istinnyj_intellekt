export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch("/api" + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json().catch(() => ({
    message:
      res.status === 429
        ? "Слишком много попыток входа. Подождите минуту."
        : "Сервис временно недоступен",
  }));
  if (!res.ok)
    throw new ApiError(
      Array.isArray(data.message)
        ? data.message.join(", ")
        : (data.message ?? "Ошибка запроса"),
      res.status,
    );
  return data;
}
