const accounts = [
  {
    role: "Администратор",
    email: "admin@ii.demo",
    access: "Все компании и филиалы",
  },
  {
    role: "Клиент «Зёрна»",
    email: "client@zerna.demo",
    access: "Только филиалы «Зёрен»",
  },
  {
    role: "Клиент «Баланс»",
    email: "client@balance.demo",
    access: "Только филиалы «Баланса»",
  },
];

export function DemoAccounts() {
  return (
    <section className="demo-accounts" aria-labelledby="demo-accounts-title">
      <h3 id="demo-accounts-title">Тестовые пользователи</h3>
      <p>
        Пароль для всех: <code>DemoPass123!</code>
      </p>
      <dl>
        {accounts.map(({ role, email, access }) => (
          <div className="demo-account" key={email}>
            <dt>
              {role}
              <small>{access}</small>
            </dt>
            <dd>
              <code>{email}</code>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
