import { useState } from "react";
import useSWR from "swr";
import { api } from "../api";
export type ImportSettings = { sourceUrl: string; method: "GET" | "POST" };
export function useImportSettings() {
  const { data, error, mutate, isLoading } = useSWR<ImportSettings>(
    "/imports/settings",
    api,
    { revalidateOnFocus: false },
  );
  const [draft, setDraft] = useState<ImportSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<unknown>();
  const [message, setMessage] = useState("");
  const values = draft ?? data;
  const dirty =
    !!draft &&
    (!data ||
      draft.sourceUrl !== data.sourceUrl ||
      draft.method !== data.method);
  function change(next: ImportSettings) {
    setDraft(next);
    setMessage("");
    setSaveError(undefined);
  }
  async function save() {
    if (!values) return;
    setSaving(true);
    setMessage("");
    setSaveError(undefined);
    try {
      const saved = await api<ImportSettings>("/imports/settings", {
        method: "PUT",
        body: JSON.stringify(values),
      });
      await mutate(saved, { revalidate: false });
      setDraft(null);
      setMessage("Настройки источника сохранены.");
    } catch (e) {
      setSaveError(e);
    } finally {
      setSaving(false);
    }
  }
  return {
    values,
    error: error || saveError,
    isLoading,
    saving,
    message,
    dirty,
    change,
    save,
    retry: () => mutate(),
    ready: !!data && !error && !dirty && !saving,
  };
}
