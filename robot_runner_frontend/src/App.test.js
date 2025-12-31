import { render, screen } from "@testing-library/react";
import App from "./App";
import { DashboardProvider } from "./context/DashboardContext";

test("renders dashboard title", async () => {
  render(
    <DashboardProvider>
      <App />
    </DashboardProvider>
  );

  expect(screen.getByText(/Test Automation Dashboard/i)).toBeInTheDocument();
});
