import React from "react";
import { useDashboard } from "../context/DashboardContext";

// PUBLIC_INTERFACE
export default function SidebarProjects() {
  /** Renders the left sidebar list of projects and handles selection. */
  const { projects, selectedProjectId, selectProject, isRunning } = useDashboard();

  return (
    <aside className="Sidebar">
      <div className="SidebarHeader">
        <div className="Brand">
          <div className="BrandMark" aria-hidden="true">
            RR
          </div>
          <div className="BrandText">
            <div className="BrandTitle">Robot Runner</div>
            <div className="BrandSubtitle">Test Automation</div>
          </div>
        </div>
      </div>

      <div className="SidebarSection">
        <div className="SidebarSectionTitle">Test Projects</div>
        <div className="ProjectList" role="list">
          {projects.map((p) => {
            const active = p.id === selectedProjectId;
            return (
              <button
                key={p.id}
                type="button"
                className={`ProjectItem ${active ? "active" : ""}`}
                onClick={() => selectProject(p.id)}
                disabled={isRunning}
                aria-current={active ? "page" : undefined}
              >
                <div className="ProjectName">{p.name}</div>
                {active ? <div className="ProjectActiveDot" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
        {isRunning ? (
          <div className="SidebarHint op-muted">
            Running… project selection is locked.
          </div>
        ) : (
          <div className="SidebarHint op-muted">Select a project to view test cases.</div>
        )}
      </div>
    </aside>
  );
}
