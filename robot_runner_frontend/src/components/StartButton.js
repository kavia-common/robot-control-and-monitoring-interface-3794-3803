import React from "react";
import { useDashboard } from "../context/DashboardContext";

// PUBLIC_INTERFACE
export default function StartButton() {
  /** Primary action button to start (or stop) a mock test run. */
  const { selectedTestCaseIds, isRunning, beginRun, stopRun } = useDashboard();
  const disabled = selectedTestCaseIds.length === 0 && !isRunning;

  return (
    <div className="StartButtonWrap">
      <button
        type="button"
        className="op-btn op-btn-primary StartButton"
        onClick={isRunning ? stopRun : beginRun}
        disabled={disabled}
      >
        {isRunning ? (
          <>
            <span className="Spinner" aria-hidden="true" />
            Stop
          </>
        ) : (
          "Start Test"
        )}
      </button>
      <div className="StartHint op-muted">
        {isRunning
          ? "Running sequentially… (mock)"
          : disabled
          ? "Select at least one test case to start."
          : "Runs selected tests in order (mock)."}
      </div>
    </div>
  );
}
