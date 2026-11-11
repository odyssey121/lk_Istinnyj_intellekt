import React, { useState } from "react";
import { Activity, ArrowUpRight, MapPin } from "lucide-react";
import { api } from "../../api";
import { ErrorBox } from "../common/ErrorBox";
import { DemoAccounts } from "./DemoAccounts";
export function Login({ refresh }: { refresh: () => void }) {
  const [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    const form = new FormData(e.currentTarget);
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      refresh();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login">
      <div className="login-story">
        <div className="brand">
          <Activity /> истинный интеллект
        </div>
        <span className="eyebrow">АНАЛИТИКА ГЕОСЕРВИСОВ</span>
        <h1>
          Ваш бизнес.
          <br />В полной картине.
        </h1>
        <p>
          Все филиалы, показатели и отзывы — в одном пространстве для уверенных
          решений.
        </p>
        <div className="orbit">
          <MapPin size={70} />
        </div>
      </div>
      <form className="login-form" onSubmit={submit}>
        <span className="eyebrow">ЛИЧНЫЙ КАБИНЕТ</span>
        <h2>С возвращением</h2>
        <p className="muted">
          Войдите, чтобы увидеть результаты вашей компании
        </p>
        <label>
          Email
          <input
            name="email"
            type="email"
            placeholder="name@company.ru"
            required
            autoComplete="username"
          />
        </label>
        <label>
          Пароль
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
        <label className="remember-me">
          <input type="checkbox" name="rememberMe" />
          Запомнить меня
        </label>
        <ErrorBox error={error} />
        <button className="primary" disabled={busy}>
          {busy ? "Входим…" : "Войти в кабинет"} <ArrowUpRight size={18} />
        </button>
        <DemoAccounts />
      </form>
    </div>
  );
}
