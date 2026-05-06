import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// --- helpers ---
const formatKRW = (n) => {
  if (!isFinite(n)) return "0원";
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}억원`;
  if (n >= 1e4) return `${Math.round(n / 1e4)}만원`;
  return `${Math.round(n).toLocaleString()}원`;
};

const parseNumber = (v) => {
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// --- UI primitives (mobile friendly) ---
const Card = ({ children }) => (
  <div style={{ border: "1px solid #e5e7eb", padding: 16, borderRadius: 16, background: "#fff" }}>{children}</div>
);

const Label = ({ children }) => (
  <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>{children}</div>
);

const Row = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", marginBottom: 10 }}>{children}</div>
);

const NumberInput = ({ value, onChange, placeholder }) => (
  <input
    inputMode="numeric"
    value={value}
    placeholder={placeholder}
    onChange={(e) => onChange(parseNumber(e.target.value))}
    style={{
      padding: 12,
      width: "100%",
      fontSize: 16,
      borderRadius: 10,
      border: "1px solid #ddd",
    }}
  />
);

const Slider = ({ value, min, max, step = 1, onChange }) => (
  <input
    type="range"
    min={min}
    max={max}
    step={step}
    value={value}
    onChange={(e) => onChange(Number(e.target.value))}
    style={{ width: "100%" }}
  />
);

const Button = ({ children, ...props }) => (
  <button
    {...props}
    style={{
      padding: 14,
      width: "100%",
      fontSize: 16,
      borderRadius: 12,
      background: "black",
      color: "white",
      fontWeight: "bold",
      marginTop: 6,
    }}
  >
    {children}
  </button>
);

export default function RetirementCalculator() {
  // inputs
  const [monthlyDeposit, setMonthlyDeposit] = useState(1000000);
  const [years, setYears] = useState(25);
  const [rate, setRate] = useState(5);
  const [withdrawal, setWithdrawal] = useState(2500000);
  const [retireAfterYears, setRetireAfterYears] = useState(20);

  // results
  const [data, setData] = useState([]);
  const [endBalance, setEndBalance] = useState(0);
  const [depletionMonth, setDepletionMonth] = useState(null);

  const monthlyRate = useMemo(() => rate / 100 / 12, [rate]);

  const calculate = () => {
    let balance = 0;
    const res = [];
    const retireStart = retireAfterYears * 12;

    let depletedAt = null;

    for (let m = 1; m <= years * 12; m++) {
      balance = balance * (1 + monthlyRate) + monthlyDeposit;

      if (m >= retireStart) {
        balance -= withdrawal;
      }

      if (balance <= 0 && depletedAt === null) {
        depletedAt = m;
      }

      res.push({ month: m, balance: Math.max(0, balance) });
    }

    setData(res);
    setEndBalance(res[res.length - 1]?.balance || 0);
    setDepletionMonth(depletedAt);
  };

  const depletionText = useMemo(() => {
    if (!depletionMonth) return "자산 고갈 없음";
    const y = Math.floor(depletionMonth / 12);
    const m = depletionMonth % 12;
    return `${y}년 ${m}개월 시점 고갈`;
  }, [depletionMonth]);

  const status = useMemo(() => {
    if (!data.length) return null;
    if (depletionMonth) return { text: "⚠️ 자산이 중간에 고갈됩니다", color: "#dc2626" };
    if (endBalance < withdrawal * 12) return { text: "주의: 말년에 여유가 적습니다", color: "#f59e0b" };
    return { text: "👍 안정적으로 유지됩니다", color: "#16a34a" };
  }, [data, depletionMonth, endBalance, withdrawal]);

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: "0 auto", fontFamily: "-apple-system, sans-serif" }}>
      <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 6 }}>은퇴자금 계산기</h2>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
        슬라이더로 빠르게 조건을 바꾸고, 자산 고갈 여부를 확인하세요
      </p>

      <Card>
        <Label>월 저축액</Label>
        <Row>
          <NumberInput value={monthlyDeposit} onChange={(v) => setMonthlyDeposit(clamp(v, 0, 50000000))} placeholder="원" />
          <div style={{ fontWeight: 600 }}>{formatKRW(monthlyDeposit)}</div>
        </Row>
        <Slider value={monthlyDeposit} min={0} max={5000000} step={10000} onChange={setMonthlyDeposit} />

        <Label>투자 기간 (년)</Label>
        <Row>
          <NumberInput value={years} onChange={(v) => setYears(clamp(v, 1, 60))} placeholder="년" />
          <div style={{ fontWeight: 600 }}>{years}년</div>
        </Row>
        <Slider value={years} min={1} max={60} step={1} onChange={setYears} />

        <Label>연 수익률 (%)</Label>
        <Row>
          <NumberInput value={rate} onChange={(v) => setRate(clamp(v, 0, 15))} placeholder="%" />
          <div style={{ fontWeight: 600 }}>{rate}%</div>
        </Row>
        <Slider value={rate} min={0} max={15} step={0.1} onChange={setRate} />

        <Label>은퇴 시작 (몇 년 후)</Label>
        <Row>
          <NumberInput value={retireAfterYears} onChange={(v) => setRetireAfterYears(clamp(v, 0, years))} placeholder="년" />
          <div style={{ fontWeight: 600 }}>{retireAfterYears}년 후</div>
        </Row>
        <Slider value={retireAfterYears} min={0} max={years} step={1} onChange={setRetireAfterYears} />

        <Label>월 인출액 (은퇴 후)</Label>
        <Row>
          <NumberInput value={withdrawal} onChange={(v) => setWithdrawal(clamp(v, 0, 20000000))} placeholder="원" />
          <div style={{ fontWeight: 600 }}>{formatKRW(withdrawal)}</div>
        </Row>
        <Slider value={withdrawal} min={0} max={10000000} step={10000} onChange={setWithdrawal} />

        <Button onClick={calculate}>계산하기</Button>
      </Card>

      {(data.length > 0) && (
        <Card>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 700 }}>결과 요약</div>
            <div>최종 자산: <b>{formatKRW(endBalance)}</b></div>
            <div>자산 상태: <b style={{ color: status?.color }}>{status?.text}</b></div>
            <div>고갈 시점: <b>{depletionText}</b></div>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={data}>
              <XAxis dataKey="month" hide />
              <YAxis hide />
              <Tooltip formatter={(v) => formatKRW(v)} labelFormatter={(l) => `${l}개월`} />
              <Line type="monotone" dataKey="balance" stroke="#000" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
