/**
 * Mock API adapter for the Test Automation Dashboard.
 * No network calls; uses in-memory state and timers to simulate a run.
 */

const PROJECTS = [
  { id: "proj-cable", name: "Cable Modem Tests" },
  { id: "proj-smoke", name: "Smoke Tests" },
];

const TEST_CASES_BY_PROJECT = {
  "proj-cable": [
    { id: "tc-cm-001", name: "Provisioning Flow" },
    { id: "tc-cm-002", name: "DHCP Lease" },
    { id: "tc-cm-003", name: "IPv6 Connectivity" },
    { id: "tc-cm-004", name: "Reboot Stability" },
    { id: "tc-cm-005", name: "Throughput Sanity" },
  ],
  "proj-smoke": [
    { id: "tc-sm-001", name: "Login Smoke" },
    { id: "tc-sm-002", name: "Navigation Smoke" },
    { id: "tc-sm-003", name: "Health Check" },
    { id: "tc-sm-004", name: "API Ping" },
  ],
};

// Simple deterministic RNG (LCG) so results are stable between refreshes.
let _seed = 1337;
function nextRand() {
  _seed = (_seed * 1664525 + 1013904223) % 4294967296;
  return _seed / 4294967296;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const state = {
  history: [
    {
      testId: "run-0001",
      projectId: "proj-smoke",
      projectName: "Smoke Tests",
      status: "PASS",
      durationMs: 1530,
      timestamp: Date.now() - 1000 * 60 * 22,
      logsUrl: "#/logs/run-0001",
    },
    {
      testId: "run-0002",
      projectId: "proj-cable",
      projectName: "Cable Modem Tests",
      status: "FAIL",
      durationMs: 2480,
      timestamp: Date.now() - 1000 * 60 * 58,
      logsUrl: "#/logs/run-0002",
    },
  ],
  runs: new Map(), // runId -> { projectId, orderedTestCaseIds, statusByTestCaseId, isCancelled, subscribers:Set }
};

let runCounter = 3;

/**
 * Emit helper: sends an event to all run subscribers.
 */
function emit(run, event) {
  for (const cb of run.subscribers) {
    try {
      cb(event);
    } catch {
      // ignore subscriber errors
    }
  }
}

/**
 * Convert a test-case event into a "history row" for the table.
 */
function toHistoryRow(event, projectId) {
  const project = PROJECTS.find((p) => p.id === projectId);
  const projectName = project ? project.name : projectId;

  return {
    testId: `${event.runId}:${event.testCaseId}`,
    projectId,
    projectName,
    status: event.status,
    durationMs: event.durationMs ?? null,
    timestamp: event.timestamp,
    logsUrl: event.logsUrl,
    testCaseId: event.testCaseId,
    testCaseName: event.testCaseName,
  };
}

// PUBLIC_INTERFACE
export function listProjects() {
  /** Returns an array of mock test projects. */
  return Promise.resolve([...PROJECTS]);
}

// PUBLIC_INTERFACE
export function listTestCases(projectId) {
  /** Returns test cases for a given project id. */
  return Promise.resolve([...(TEST_CASES_BY_PROJECT[projectId] || [])]);
}

// PUBLIC_INTERFACE
export function listHistory() {
  /** Returns recent run entries for the history table (most recent first). */
  return Promise.resolve([...state.history].sort((a, b) => b.timestamp - a.timestamp));
}

// PUBLIC_INTERFACE
export function startRun({ projectId, orderedTestCaseIds }) {
  /**
   * Creates a run and begins simulated sequential execution in the background.
   * Returns: { runId }
   */
  const runId = `run-${String(runCounter).padStart(4, "0")}`;
  runCounter += 1;

  const run = {
    runId,
    projectId,
    orderedTestCaseIds: [...orderedTestCaseIds],
    statusByTestCaseId: new Map(),
    isCancelled: false,
    subscribers: new Set(),
  };

  state.runs.set(runId, run);

  // Kick off async simulation
  (async () => {
    const cases = TEST_CASES_BY_PROJECT[projectId] || [];
    const caseById = new Map(cases.map((t) => [t.id, t]));

    // queue events
    for (const testCaseId of run.orderedTestCaseIds) {
      const tc = caseById.get(testCaseId);
      emit(run, {
        type: "TEST_QUEUED",
        runId,
        projectId,
        testCaseId,
        testCaseName: tc ? tc.name : testCaseId,
        status: "QUEUED",
        timestamp: Date.now(),
      });
      // also pre-create row in history as queued
      state.history.unshift(
        toHistoryRow(
          {
            runId,
            projectId,
            testCaseId,
            testCaseName: tc ? tc.name : testCaseId,
            status: "QUEUED",
            timestamp: Date.now(),
            logsUrl: `#/logs/${runId}-${testCaseId}`,
          },
          projectId
        )
      );
    }

    for (const testCaseId of run.orderedTestCaseIds) {
      if (run.isCancelled) break;

      const tc = caseById.get(testCaseId);
      const startTs = Date.now();

      emit(run, {
        type: "TEST_RUNNING",
        runId,
        projectId,
        testCaseId,
        testCaseName: tc ? tc.name : testCaseId,
        status: "RUNNING",
        timestamp: startTs,
      });

      // simulate duration
      const duration = 400 + Math.floor(nextRand() * 300); // 400-700ms
      await sleep(duration);

      if (run.isCancelled) break;

      const pass = nextRand() > 0.28; // ~72% pass rate
      const status = pass ? "PASS" : "FAIL";

      const completeTs = Date.now();
      const logsUrl = `#/logs/${runId}-${testCaseId}`;

      run.statusByTestCaseId.set(testCaseId, status);

      // Update the corresponding history row (we inserted queued row earlier)
      const rowId = `${runId}:${testCaseId}`;
      const idx = state.history.findIndex((h) => h.testId === rowId);
      const row = {
        testId: rowId,
        projectId,
        projectName: (PROJECTS.find((p) => p.id === projectId) || { name: projectId }).name,
        status,
        durationMs: completeTs - startTs,
        timestamp: completeTs,
        logsUrl,
        testCaseId,
        testCaseName: tc ? tc.name : testCaseId,
      };
      if (idx >= 0) state.history[idx] = row;
      else state.history.unshift(row);

      emit(run, {
        type: "TEST_COMPLETED",
        runId,
        projectId,
        testCaseId,
        testCaseName: tc ? tc.name : testCaseId,
        status,
        durationMs: completeTs - startTs,
        timestamp: completeTs,
        logsUrl,
      });
    }

    emit(run, {
      type: "RUN_COMPLETED",
      runId,
      projectId,
      status: run.isCancelled ? "CANCELLED" : "COMPLETED",
      timestamp: Date.now(),
    });
  })();

  return Promise.resolve({ runId });
}

// PUBLIC_INTERFACE
export function subscribeRunStatus(runId, callback) {
  /**
   * Subscribe to run status events.
   * Returns an unsubscribe function.
   */
  const run = state.runs.get(runId);
  if (!run) {
    // No run found: no-op subscription
    return () => {};
  }
  run.subscribers.add(callback);
  return () => {
    run.subscribers.delete(callback);
  };
}

// PUBLIC_INTERFACE
export function cancelRun(runId) {
  /** Cancels a running mock run (best-effort). */
  const run = state.runs.get(runId);
  if (!run) return Promise.resolve(false);
  run.isCancelled = true;
  emit(run, {
    type: "RUN_CANCELLED",
    runId,
    projectId: run.projectId,
    status: "CANCELLED",
    timestamp: Date.now(),
  });
  return Promise.resolve(true);
}
