import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const fmtKRW = (n) => {
  if (!isFinite(n)) return "0원";
  if (n >= 1e8) return (n / 1e8).toFixed(1) + "억원";
  if (n >= 1e4) return Math.round(n / 1e4) + "만원";
  return Math.round(n).toLocaleString() + "원";
};

const fmtKRWFull = (n) => {
  if (!isFinite(n)) return "0";
  return Math.round(n).toLocaleString();
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const SliderRow = ({ label, value, displayValue, min, max, step, onChange }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
      <span style={{ fontSize: 13, color: "#666" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: "#111" }}>{displayValue}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: "100%", accentColor: "#111" }}
    />
  </div>
);

const MetricCard = ({ label, value, color, fullWidth }) => (
  <div style={{
    background: "#f5f5f3",
    borderRadius: 12,
    padding: "14px 16px",
    gridColumn: fullWidth ? "1/-1" : undefined,
  }}>
    <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 500, color: color || "#111" }}>{value}</div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? payload[1]?.value ?? 0;
  return (
    <div style={{
      background: "#fff",
      border: "0.5px solid #e5e5e5",
      borderRadius: 8,
      padding: "8px 12px",
      fontSize: 13,
    }}>
      <div style={{ color: "#888", marginBottom: 2 }}>{label}년차</div>
      <div style={{ fontWeight: 500 }}>{fmtKRW(val)}</div>
    </div>
  );
};

export default function RetirementCalculator() {
  const [initial, setInitial] = useState(0);
  const [deposit, setDeposit] = useState(1000000);
  const [saveYears, setSaveYears] = useState(25);
  const [rate, setRate] = useState(5);
  const [withdrawYears, setWithdrawYears] = useState(30);
  const [withdraw, setWithdraw] = useState(2500000);
  const [result, setResult] = useState(null);

  const calculate = () => {
    const mr = Math.pow(1 + rate / 100, 1 / 12) - 1;
    const saveMonths = saveYears * 12;
    const withdrawMonths = withdrawYears * 12;
    const totalMonths = saveMonths + withdrawMonths;

    let balance = initial;
    let depletedAt = null;
    const chartData = [];
    const tableData = [];
    let pivotBalance = 0;
    let totalInvested = initial;

    for (let m = 1; m <= totalMonths; m++) {
      const isSaving = m <= saveMonths;
      if (isSaving) {
        balance = balance * (1 + mr) + deposit;
        totalInvested += deposit;
        if (m === saveMonths) pivotBalance = Math.max(0, balance);
      } else {
        balance = balance * (1 + mr) - withdraw;
      }

      if (balance <= 0 && depletedAt === null) depletedAt = m;

      const b = Math.max(0, balance);
      const yr = Math.ceil(m / 12);

      if (m % 3 === 0 || m === totalMonths || m === saveMonths) {
        chartData.push({
          year: yr,
          saving: isSaving ? b : null,
          withdrawing: !isSaving ? b : null,
        });
      }

      if (m % 12 === 0) {
        if (isSaving) {
          const inv = Math.min(totalInvested, b);
          tableData.push({
            year: yr,
            phase: "적립",
            invested: inv,
            profit: b - inv,
            balance: b,
          });
        } else {
          tableData.push({
            year: yr,
            phase: "인출",
            invested: null,
            profit: null,
            balance: b,
          });
        }
      }
    }

    const pivotIdx = chartData.findIndex((d) => d.year === saveYears && d.saving !== null);
    if (pivotIdx !== -1) {
      chartData[pivotIdx] = { ...chartData[pivotIdx], withdrawing: chartData[pivotIdx].saving };
    }

    const finalBal = Math.max(0, balance);

    let statusText, statusColor;
    if (depletedAt) { statusText = "고갈"; statusColor = "#A32D2D"; }
    else if (finalBal < withdraw * 12) { statusText = "주의"; statusColor = "#BA7517"; }
    else { statusText = "안정적"; statusColor = "#0F6E56"; }

    let depletionText = "고갈 없음";
    let depletionColor = "#0F6E56";
    if (depletedAt) {
      const relMonth = depletedAt - saveMonths;
      const y = Math.floor(relMonth / 12);
      const mo = relMonth % 12;
      depletionText = `은퇴 후 ${y}년 ${mo}개월 시점`;
      depletionColor = "#A32D2D";
    }

    setResult({ finalBal, statusText, statusColor, depletionText, depletionColor, chartData, pivotBalance, tableData });
  };

  const thStyle = {
    fontSize: 11,
    color: "#888",
    fontWeight: 500,
    padding: "8px 6px",
    textAlign: "right",
    borderBottom: "1px solid #e5e5e5",
    whiteSpace: "nowrap",
  };
  const tdStyle = (align) => ({
    fontSize: 12,
    padding: "7px 6px",
    textAlign: align || "right",
    borderBottom: "0.5px solid #f0f0f0",
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ padding: "20px 3% 40px", maxWidth: "100%", margin: 0, fontFamily: "-apple-system, 'Apple SD Gothic Neo', sans-serif", background: "#ffffff", color: "#111111", minHeight: "100vh" }}>
      <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4, color: "#111" }}>은퇴자금 계산기</h2>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>적립 후 은퇴 — 두 단계로 시뮬레이션합니다</p>

      <div style={{ fontSize: 11, fontWeight: 500, color: "#1D9E75", letterSpacing: "0.05em", marginBottom: 14 }}>적립 단계</div>
      <SliderRow label="시작 금액" value={initial} displayValue={fmtKRW(initial)} min={0} max={300000000} step={5000000} onChange={(v) => setInitial(clamp(v, 0, 300000000))} />
      <SliderRow label="월 적립액" value={deposit} displayValue={fmtKRW(deposit)} min={0} max={10000000} step={100000} onChange={(v) => setDeposit(clamp(v, 0, 10000000))} />
      <SliderRow label="적립 기간" value={saveYears} displayValue={`${saveYears}년`} min={1} max={50} step={1} onChange={(v) => setSaveYears(clamp(v, 1, 50))} />
      <SliderRow label="연 수익률" value={rate} displayValue={`${rate.toFixed(1)}%`} min={0} max={30} step={0.1} onChange={(v) => setRate(clamp(v, 0, 30))} />

      <div style={{ height: 0.5, background: "#e5e5e5", margin: "4px 0 20px" }} />

      <div style={{ fontSize: 11, fontWeight: 500, color: "#3266ad", letterSpacing: "0.05em", marginBottom: 14 }}>인출 단계 (은퇴 후)</div>
      <SliderRow label="인출 기간" value={withdrawYears} displayValue={`${withdrawYears}년`} min={1} max={50} step={1} onChange={(v) => setWithdrawYears(clamp(v, 1, 50))} />
      <SliderRow label="월 인출액" value={withdraw} displayValue={fmtKRW(withdraw)} min={0} max={10000000} step={50000} onChange={(v) => setWithdraw(clamp(v, 0, 20000000))} />

      <div style={{ height: 0.5, background: "#e5e5e5", margin: "4px 0 20px" }} />

      <button
        onClick={calculate}
        style={{ width: "100%", padding: 14, background: "#111", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: "pointer", letterSpacing: "-0.01em" }}
      >
        계산하기
      </button>

      {result && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 20 }}>
            <MetricCard label="은퇴 시점 자산" value={fmtKRW(result.pivotBalance)} />
            <MetricCard label="자산 상태" value={result.statusText} color={result.statusColor} />
            <MetricCard label="인출 종료 후 잔액" value={fmtKRW(result.finalBal)} fullWidth />
            <MetricCard label="고갈 시점" value={result.depletionText} color={result.depletionColor} fullWidth />
          </div>

          <div style={{ marginTop: 16, background: "#f5f5f3", borderRadius: 16, padding: "16px 16px 12px" }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>자산 변화 그래프</div>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <AreaChart data={result.chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSaving" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradWithdraw" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3266ad" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3266ad" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#aaa" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}년`} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: "#aaa" }} tickLine={false} axisLine={false} tickFormatter={fmtKRW} width={52} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="saving" stroke="#1D9E75" strokeWidth={2} fill="url(#gradSaving)" dot={false} connectNulls={false} />
                  <Area type="monotone" dataKey="withdrawing" stroke="#3266ad" strokeWidth={2} fill="url(#gradWithdraw)" dot={false} connectNulls={false} strokeDasharray="5 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "#999" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 3, borderRadius: 2, background: "#1D9E75", display: "inline-block" }} />
                적립 구간
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 3, borderRadius: 2, background: "#3266ad", display: "inline-block" }} />
                인출 구간
              </span>
            </div>
          </div>

          {/* 연도별 표 */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>연도별 상세</div>
            <div style={{ overflowX: "auto", borderRadius: 12, border: "0.5px solid #e5e5e5" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <thead>
                  <tr style={{ background: "#f5f5f3" }}>
                    <th style={{ ...thStyle, textAlign: "center", width: "14%" }}>년차</th>
                    <th style={{ ...thStyle, width: "14%" }}>구분</th>
                    <th style={{ ...thStyle, width: "24%" }}>원금 (₩)</th>
                    <th style={{ ...thStyle, width: "24%" }}>수익 (₩)</th>
                    <th style={{ ...thStyle, width: "24%" }}>잔액 (₩)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.tableData.map((row, i) => {
                    const isSave = row.phase === "적립";
                    const isRetireStart = i > 0 && result.tableData[i - 1].phase === "적립" && !isSave;
                    return (
                      <tr key={i} style={{ background: isRetireStart ? "#f0f7ff" : i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ ...tdStyle("center"), fontWeight: isRetireStart ? 600 : 400 }}>{row.year}</td>
                        <td style={{ ...tdStyle("center"), color: isSave ? "#1D9E75" : "#3266ad", fontSize: 11 }}>{row.phase}</td>
                        <td style={{ ...tdStyle(), color: "#444" }}>{isSave ? fmtKRWFull(row.invested) : "—"}</td>
                        <td style={{ ...tdStyle(), color: isSave ? "#1D9E75" : "#888" }}>{isSave ? "+" + fmtKRWFull(row.profit) : "—"}</td>
                        <td style={{ ...tdStyle(), fontWeight: 500, color: row.balance === 0 ? "#A32D2D" : "#111" }}>{fmtKRWFull(row.balance)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
