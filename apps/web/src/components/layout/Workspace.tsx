import { Navigate, Route, Routes } from "react-router-dom";
import type { User } from "../../types";
import { useWorkspace } from "../../hooks/useWorkspace";
import { ErrorBox } from "../common/ErrorBox";
import { Sidebar } from "./Sidebar";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { PageHeading } from "./PageHeading";
import { WorkspaceFilters } from "./WorkspaceFilters";
import { DashboardPanel } from "../dashboard/DashboardPanel";
import { BranchesPanel } from "../branches/BranchesPanel";
import { ReviewsPanel } from "../reviews/ReviewsPanel";
import { ImportPanel } from "../imports/ImportPanel";
export function Workspace({
  user,
  logout,
}: {
  user: User;
  logout: () => Promise<void>;
}) {
  const state = useWorkspace();
  return (
    <div className="layout">
      <Sidebar
        setActionError={state.setActionError}
        user={user}
        logout={logout}
      />
      <main>
        <WorkspaceHeader
          tab={state.tab}
          setActionError={state.setActionError}
          user={user}
          logout={logout}
        />
        <section className="content">
          <PageHeading
            tab={state.tab}
            branches={
              state.tab === "branches" ? state.filteredBranches : state.branches
            }
          />
          <WorkspaceFilters
            showPeriod={state.tab !== "branches"}
            company={state.company}
            setCompany={state.setCompany}
            branch={state.branch}
            setBranch={state.setBranch}
            from={state.from}
            setFrom={state.setFrom}
            to={state.to}
            setTo={state.setTo}
            setPage={state.setPage}
            companies={state.companies}
            branches={state.branches}
            user={user}
          />
          <ErrorBox
            error={
              state.companyError ||
              state.branchError ||
              state.summaryError ||
              state.seriesError ||
              state.reviewError ||
              state.actionError
            }
          />
          <Routes>
            <Route
              path="analytics"
              element={
                <DashboardPanel
                  summary={state.summary}
                  series={state.series}
                  isLoading={state.isLoading}
                />
              }
            />
            <Route
              path="branches"
              element={
                <BranchesPanel
                  branches={state.filteredBranches}
                  setBranch={state.setBranch}
                  navigate={state.navigate}
                />
              }
            />
            <Route
              path="reviews"
              element={
                <ReviewsPanel
                  reviews={state.reviews}
                  rating={state.rating}
                  setRating={state.setRating}
                  status={state.status}
                  setStatus={state.setStatus}
                  page={state.page}
                  setPage={state.setPage}
                  changeStatus={state.changeStatus}
                />
              }
            />
            <Route
              path="imports"
              element={
                user.role === "ADMIN" ? (
                  <ImportPanel
                    branch={state.branch}
                    busy={state.busy}
                    runImport={state.runImport}
                    notice={state.notice}
                  />
                ) : (
                  <Navigate to="/analytics" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/analytics" replace />} />
          </Routes>
          <footer>
            Истинный интеллект <span>Аналитика, которая помогает расти</span>
          </footer>
        </section>
      </main>
    </div>
  );
}
