import { useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { api } from "../api";
import type { Branch, Review } from "../types";
import { today, initialFrom, sectionPaths } from "../constants";
import { useLocation, useNavigate } from "react-router-dom";
export function useWorkspace() {
  const { mutate } = useSWRConfig();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tab =
    Object.entries(sectionPaths).find(
      ([, path]) => path === pathname.replace(/\/+$/, ""),
    )?.[0] ?? "dashboard";
  const [company, setCompany] = useState("");
  const [branch, setBranch] = useState("");
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(today);
  const [rating, setRating] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState<unknown>();
  useEffect(() => {
    setActionError(undefined);
    setNotice("");
  }, [pathname]);
  // При входе в раздел показываем все филиалы выбранной компании.
  useEffect(() => {
    if (tab === "branches") setBranch("");
  }, [tab]);
  const query = new URLSearchParams({
    dateFrom: from,
    dateTo: to,
    ...(company ? { companyId: company } : {}),
    ...(branch ? { branchId: branch } : {}),
  });
  const { data: companies, error: companyError } = useSWR<
    { id: number; name: string }[]
  >("/companies", api);
  const { data: branches, error: branchError } = useSWR<Branch[]>(
    "/branches?" + new URLSearchParams(company ? { companyId: company } : {}),
    api,
  );
  const filteredBranches = branch
    ? branches?.filter((item) => item.id === Number(branch))
    : branches;
  const {
    data: summary,
    error: summaryError,
    isLoading,
  } = useSWR<Record<string, number | null>>(
    tab === "dashboard" ? "/analytics/summary?" + query : null,
    api,
  );
  const { data: series, error: seriesError } = useSWR<
    { date: string; views: number }[]
  >(tab === "dashboard" ? "/analytics/timeseries?" + query : null, api);
  const { data: reviews, error: reviewError } = useSWR<{
    items: Review[];
    total: number;
  }>(
    tab === "reviews"
      ? "/reviews?" +
          query +
          "&" +
          new URLSearchParams({
            page: String(page),
            pageSize: "10",
            ...(rating ? { rating } : {}),
            ...(status ? { status } : {}),
          })
      : null,
    api,
  );
  async function changeStatus(id: number, value: string) {
    setActionError(undefined);
    try {
      await api("/reviews/" + id + "/status", {
        method: "PATCH",
        body: JSON.stringify({ status: value }),
      });
      await mutate(
        (key) => typeof key === "string" && key.startsWith("/reviews"),
      );
    } catch (e) {
      setActionError(e);
    }
  }
  async function runImport() {
    setBusy(true);
    setNotice("");
    setActionError(undefined);
    try {
      const result = await api<{ processedDays: number }>(
        "/imports/statistics",
        {
          method: "POST",
          body: JSON.stringify({
            branchId: Number(branch),
            dateFrom: from,
            dateTo: to,
          }),
        },
      );
      setNotice(
        `Импорт завершён: ${result.processedDays} дней. Данные обновлены.`,
      );
      await mutate(
        (key) => typeof key === "string" && key.startsWith("/analytics"),
      );
    } catch (e) {
      setActionError(e);
    } finally {
      setBusy(false);
      await mutate(
        (key) => typeof key === "string" && key.startsWith("/imports/logs"),
      ).catch(() => undefined);
    }
  }
  return {
    tab,
    navigate,
    company,
    setCompany,
    branch,
    setBranch,
    from,
    setFrom,
    to,
    setTo,
    rating,
    setRating,
    status,
    setStatus,
    page,
    setPage,
    busy,
    notice,
    setNotice,
    setActionError,
    companies,
    branches,
    filteredBranches,
    summary,
    series,
    reviews,
    isLoading,
    companyError,
    branchError,
    summaryError,
    seriesError,
    reviewError,
    actionError,
    changeStatus,
    runImport,
  };
}
export type WorkspaceState = ReturnType<typeof useWorkspace>;
