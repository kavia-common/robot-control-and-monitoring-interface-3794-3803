import React, { useMemo } from "react";
import { useDashboard } from "../context/DashboardContext";

function formatDuration(ms) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatTimestamp(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString();
}

function StatusPill({ status }) {
  const normalized = status || "—";
  if (normalized === "PASS") return <span className="op-pill op-pill-success">PASS</span>;
  if (normalized === "FAIL") return <span className="op-pill op-pill-error">FAIL</span>;
  if (normalized === "RUNNING") return <span className="op-pill">RUNNING</span>;
  if (normalized === "QUEUED") return <span className="op-pill">QUEUED</span>;
  return <span className="op-pill">{normalized}</span>;
}

// PUBLIC_INTERFACE
export default function HistoryTable() {
  /** Renders the detailed history table (recent run entries). */
  const { history, selectedProjectId } = useDashboard();

  const rows = useMemo(() => {
    // Show project-specific rows first, but still include others for context (limited)
    const p = history.filter((h) => h.projectId === selectedProjectId);
    const other = history.filter((h) => h.projectId !== selectedProjectId);
    return [...p, ...other].slice(0, 25);
  }, [history, selectedProjectId]);

  return (
    <div className="op-card">
      <div className="op-card-header">
        <h3 className="op-card-title">History</h3>
        <div className="op-muted">Live updates during runs</div>
      </div>

      <div className="op-card-body TableWrap">
        <table className="HistoryTable">
          <thead>
            <tr>
              <th>Test ID</th>
              <th>Project Name</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Timestamp</th>
              <th>Logs Link</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.testId}>
                <td className="Mono">{r.testId}</td>
                <td>{r.projectName}</td>
                <td>
                  <StatusPill status={r.status} />
                </td>
                <td className="Mono">{formatDuration(r.durationMs)}</td>
                <td>{formatTimestamp(r.timestamp)}</td>
                <td>
                  <a
                    href={r.logsUrl || `#/logs/${encodeURIComponent(r.testId)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}

            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="EmptyState op-muted">
                  No history yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
