import React from "react";
import "./App.css";
import "./theme.css";

import SidebarProjects from "./components/SidebarProjects";
import PassFailPie from "./components/PassFailPie";
import StartButton from "./components/StartButton";
import HistoryTable from "./components/HistoryTable";
import TestCaseSelector from "./components/TestCaseSelector";

// PUBLIC_INTERFACE
function App() {
  /** Main application entry component rendering the Test Automation Dashboard (mock data only). */
  return (
    <div className="AppShell">
      <SidebarProjects />

      <main className="Main">
        <header className="TopBar">
          <div>
            <div className="PageTitle">Test Automation Dashboard</div>
            <div className="PageSubtitle op-muted">
              Mock execution, live status updates, and historical runs.
            </div>
          </div>
        </header>

        <section className="TopGrid">
          <div className="TopLeft">
            <PassFailPie />
          </div>
          <div className="TopRight">
            <StartButton />
            <div className="TopRightSpacer" />
            <TestCaseSelector />
          </div>
        </section>

        <section className="Bottom">
          <HistoryTable />
        </section>
      </main>
    </div>
  );
}

export default App;
