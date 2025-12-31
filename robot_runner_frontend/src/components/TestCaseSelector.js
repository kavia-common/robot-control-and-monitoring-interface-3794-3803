import React, { useMemo } from "react";
import { useDashboard } from "../context/DashboardContext";

function IconButton({ label, onClick, disabled, children }) {
  return (
    <button type="button" className="IconBtn" onClick={onClick} disabled={disabled} aria-label={label}>
      {children}
    </button>
  );
}

// PUBLIC_INTERFACE
export default function TestCaseSelector() {
  /** Test case selection panel with Select All and ordering controls. */
  const { testCases, selectedTestCaseIds, toggleTestCase, setSelectAll, moveSelected, isRunning } =
    useDashboard();

  const allSelected = useMemo(() => {
    if (testCases.length === 0) return false;
    return selectedTestCaseIds.length === testCases.length;
  }, [selectedTestCaseIds, testCases]);

  const someSelected = selectedTestCaseIds.length > 0 && !allSelected;

  return (
    <div className="op-card">
      <div className="op-card-header">
        <h3 className="op-card-title">Test Cases</h3>
        <div className="op-muted">
          Selected: <strong>{selectedTestCaseIds.length}</strong>
        </div>
      </div>

      <div className="op-card-body">
        <label className="SelectAllRow">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={(e) => setSelectAll(e.target.checked)}
            disabled={isRunning || testCases.length === 0}
          />
          <span className="SelectAllText">Select All</span>
        </label>

        <div className="TestCaseList" role="list">
          {testCases.map((tc) => {
            const selected = selectedTestCaseIds.includes(tc.id);
            const index = selectedTestCaseIds.indexOf(tc.id);

            return (
              <div key={tc.id} className={`TestCaseRow ${selected ? "selected" : ""}`}>
                <label className="TestCaseLabel">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleTestCase(tc.id)}
                    disabled={isRunning}
                  />
                  <span className="TestCaseName">{tc.name}</span>
                  <span className="TestCaseId op-muted">{tc.id}</span>
                </label>

                <div className="OrderControls" aria-label="Ordering controls">
                  <span className="OrderIndex op-muted">{selected ? `#${index + 1}` : ""}</span>
                  <IconButton
                    label="Move up"
                    onClick={() => moveSelected(tc.id, "up")}
                    disabled={!selected || isRunning || index <= 0}
                  >
                    ↑
                  </IconButton>
                  <IconButton
                    label="Move down"
                    onClick={() => moveSelected(tc.id, "down")}
                    disabled={
                      !selected ||
                      isRunning ||
                      index < 0 ||
                      index >= selectedTestCaseIds.length - 1
                    }
                  >
                    ↓
                  </IconButton>
                </div>
              </div>
            );
          })}

          {testCases.length === 0 ? (
            <div className="EmptyState op-muted">No test cases available.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
