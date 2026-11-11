import useSWR, { SWRConfig } from "swr";
import { api } from "../api";
import { ErrorBox } from "./common/ErrorBox";
import { Login } from "./auth/Login";
import type { User } from "../types";
import { Workspace } from "./layout/Workspace";
export function App() {
  const {
    data: user,
    error,
    mutate,
  } = useSWR<User>("/auth/me", api, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  });
  if (error && error.status !== 401)
    return (
      <div className="login-form">
        <ErrorBox error={error} />
        <button onClick={() => void mutate()}>Повторить</button>
      </div>
    );
  if (!user)
    return error ? (
      <Login refresh={() => void mutate()} />
    ) : (
      <div className="boot">Загружаем кабинет…</div>
    );
  return (
    <SWRConfig key={user.email} value={{ provider: () => new Map() }}>
      <Workspace
        user={user}
        logout={async () => {
          await api("/auth/logout", { method: "POST" });
          await mutate(undefined, { revalidate: true });
        }}
      />
    </SWRConfig>
  );
}
