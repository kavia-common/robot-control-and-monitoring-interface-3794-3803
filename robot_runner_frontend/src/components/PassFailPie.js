import React, { useMemo } from "react";
import { useDashboard } from "../context/DashboardContext";

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y, "L", cx, cy, "Z"].join(
    " "
  );
}

// PUBLIC_INTERFACE
export default function PassFailPie() {
  /** Renders a pass/fail pie chart for the selected project's latest summary. */
  const { latestSummary } = useDashboard();
  const pass = latestSummary.pass || 0;
  const fail = latestSummary.fail || 0;

  const { passPct, failPct } = useMemo(() => {
    const total = pass + fail;
    if (total === 0) return { passPct: 0, failPct: 0 };
    return {
      passPct: Math.round((pass / total) * 100),
      failPct: Math.round((fail / total) * 100),
    };
  }, [pass, fail]);

  const size = 170;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;

  const total = pass + fail;
  const passAngle = total === 0 ? 0 : (pass / total) * 360;

  const passPath = total === 0 ? null : describeArc(cx, cy, r, 0, passAngle);
  const failPath = total === 0 ? null : describeArc(cx, cy, r, passAngle, 360);

  return (
    <div className="op-card">
      <div className="op-card-header">
        <h3 className="op-card-title">Latest Results</h3>
        <div className="op-muted">
          Pass <span className="op-kbd">{pass}</span> Fail <span className="op-kbd">{fail}</span>
        </div>
      </div>

      <div className="op-card-body PieBody">
        <div className="PieWrap" role="img" aria-label={`Pass ${passPct} percent, Fail ${failPct} percent`}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={cx} cy={cy} r={r} fill="rgba(17,24,39,0.06)" />
            {passPath ? <path d={passPath} fill="var(--op-success)" /> : null}
            {failPath ? <path d={failPath} fill="var(--op-error)" /> : null}
            {/* inner cutout */}
            <circle cx={cx} cy={cy} r={44} fill="var(--op-surface)" />
            <text x={cx} y={cy - 2} textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--op-text)">
              {total === 0 ? "—" : `${passPct}%`}
            </text>
            <text x={cx} y={cy + 18} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--op-muted)">
              PASS
            </text>
          </svg>
        </div>

        <div className="Legend">
          <div className="LegendRow">
            <span className="LegendSwatch success" aria-hidden="true" />
            <div>
              <div className="LegendLabel">Pass</div>
              <div className="LegendValue">{passPct}%</div>
            </div>
          </div>
          <div className="LegendRow">
            <span className="LegendSwatch error" aria-hidden="true" />
            <div>
              <div className="LegendLabel">Fail</div>
              <div className="LegendValue">{failPct}%</div>
            </div>
          </div>
          <div className="op-muted LegendHint">
            Updates live as each test completes.
          </div>
        </div>
      </div>
    </div>
  );
}
