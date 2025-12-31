import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  cancelRun,
  listHistory,
  listProjects,
  listTestCases,
  startRun,
  subscribeRunStatus,
} from "../mocks/api";

/**
 * Shape notes:
 * - selectedTestCaseIds are ordered, not a set.
 * - history rows include QUEUED/RUNNING/PASS/FAIL and update live.
 */

const DashboardContext = createContext(null);

function computeSummaryFromHistory(history, projectId) {
  const filtered = history.filter((h) => h.projectId === projectId);
  let pass = 0;
  let fail = 0;
  for (const row of filtered) {
    if (row.status === "PASS") pass += 1;
    if (row.status === "FAIL") fail += 1;
  }
  return { pass, fail };
}

// PUBLIC_INTERFACE
export function DashboardProvider({ children }) {
  /** Provides global dashboard state + actions for the Test Automation Dashboard. */
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const [testCases, setTestCases] = useState([]);
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState([]);

  const [history, setHistory] = useState([]);
  const [latestSummary, setLatestSummary] = useState({ pass: 0, fail: 0 });

  const [activeRun, setActiveRun] = useState(null); // { runId, projectId, startedAt }
  const [isRunning, setIsRunning] = useState(false);

  const unsubscribeRef = useRef(null);

  // Initial load: projects + history
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [p, h] = await Promise.all([listProjects(), listHistory()]);
      if (!mounted) return;
      setProjects(p);
      setHistory(h);
      const initialProjectId = p[0]?.id || null;
      setSelectedProjectId(initialProjectId);
      if (initialProjectId) setLatestSummary(computeSummaryFromHistory(h, initialProjectId));
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Load test cases when project changes
  useEffect(() => {
    let mounted = true;
    if (!selectedProjectId) return () => {};
    (async () => {
      const tcs = await listTestCases(selectedProjectId);
      if (!mounted) return;
      setTestCases(tcs);
      // Default select none on project change
      setSelectedTestCaseIds([]);
      setLatestSummary(computeSummaryFromHistory(history, selectedProjectId));
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  // Update summary when history changes (for selected project)
  useEffect(() => {
    if (!selectedProjectId) return;
    setLatestSummary(computeSummaryFromHistory(history, selectedProjectId));
  }, [history, selectedProjectId]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  // PUBLIC_INTERFACE
  const selectProject = (projectId) => {
    /** Selects a project; resets test case selection. */
    if (isRunning) return; // lock project changes during run
    setSelectedProjectId(projectId);
  };

  // PUBLIC_INTERFACE
  const toggleTestCase = (testCaseId) => {
    /** Toggles selection of a test case, maintaining ordering. */
    setSelectedTestCaseIds((prev) => {
      if (prev.includes(testCaseId)) return prev.filter((id) => id !== testCaseId);
      return [...prev, testCaseId];
    });
  };

  // PUBLIC_INTERFACE
  const setSelectAll = (checked) => {
    /** Selects or clears all visible test cases for the current project. */
    if (checked) setSelectedTestCaseIds(testCases.map((t) => t.id));
    else setSelectedTestCaseIds([]);
  };

  // PUBLIC_INTERFACE
  const moveSelected = (testCaseId, direction) => {
    /** Moves a selected test case up/down in the ordered list. */
    setSelectedTestCaseIds((prev) => {
      const idx = prev.indexOf(testCaseId);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapWith = direction === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= next.length) return prev;
      const tmp = next[swapWith];
      next[swapWith] = next[idx];
      next[idx] = tmp;
      return next;
    });
  };

  function applyHistoryPatchFromEvent(event) {
    // Convert event to a table row and upsert by testId
    if (!selectedProjectId) return;
    if (
      event.type === "TEST_QUEUED" ||
      event.type === "TEST_RUNNING" ||
      event.type === "TEST_COMPLETED"
    ) {
      const testId = `${event.runId}:${event.testCaseId}`;
      setHistory((prev) => {
        const row = {
          testId,
          projectId: event.projectId,
          projectName:
            projects.find((p) => p.id === event.projectId)?.name || event.projectId,
          status: event.status,
          durationMs: event.durationMs ?? null,
          timestamp: event.timestamp,
          logsUrl: event.logsUrl || `#/logs/${event.runId}-${event.testCaseId}`,
          testCaseId: event.testCaseId,
          testCaseName: event.testCaseName,
        };

        const idx = prev.findIndex((h) => h.testId === testId);
        const next = [...prev];
        if (idx >= 0) next[idx] = row;
        else next.unshift(row);

        // Keep only recent 50 to avoid unbounded growth in UI
        return next.slice(0, 50);
      });
    }
  }

  // PUBLIC_INTERFACE
  const beginRun = async () => {
    /** Starts a mock run and subscribes to its status updates. */
    if (!selectedProjectId) return;
    if (selectedTestCaseIds.length === 0) return;
    if (isRunning) return;

    setIsRunning(true);

    const { runId } = await startRun({
      projectId: selectedProjectId,
      orderedTestCaseIds: selectedTestCaseIds,
    });

    setActiveRun({ runId, projectId: selectedProjectId, startedAt: Date.now() });

    if (unsubscribeRef.current) unsubscribeRef.current();
    unsubscribeRef.current = subscribeRunStatus(runId, (event) => {
      applyHistoryPatchFromEvent(event);

      if (event.type === "RUN_COMPLETED" || event.type === "RUN_CANCELLED") {
        setIsRunning(false);
        setActiveRun(null);
        // resync from mock history store after finishing to reflect queued inserts, etc.
        listHistory().then(setHistory);
      }
    });
  };

  // PUBLIC_INTERFACE
  const stopRun = async () => {
    /** Stops the currently running mock run (best-effort cancellation). */
    if (!activeRun?.runId) return;
    await cancelRun(activeRun.runId);
    setIsRunning(false);
    setActiveRun(null);
    if (unsubscribeRef.current) unsubscribeRef.current();
    unsubscribeRef.current = null;
    // resync from mock history store after stopping
    const h = await listHistory();
    setHistory(h);
  };

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const value = useMemo(
    () => ({
      projects,
      selectedProjectId,
      selectedProject,
      selectProject,

      testCases,
      selectedTestCaseIds,
      toggleTestCase,
      setSelectAll,
      moveSelected,

      latestSummary,
      history,

      isRunning,
      activeRun,
      beginRun,
      stopRun,
    }),
    [
      projects,
      selectedProjectId,
      selectedProject,
      testCases,
      selectedTestCaseIds,
      latestSummary,
      history,
      isRunning,
      activeRun,
    ]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

// PUBLIC_INTERFACE
export function useDashboard() {
  /** Hook for accessing the dashboard context. */
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
