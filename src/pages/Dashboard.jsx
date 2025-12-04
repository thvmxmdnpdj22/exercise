// Dashboard.jsx
import React, { useEffect, useState } from "react";
import "./Dashboard.css";
import Sidebar from "../components/sidebar";

const mockData = {
  meta: {
    currentMonth: "2024년 12월",
  },
  summary: {
    totalUsers: 24,
    totalUsersChange: 12,
    totalSessions: 1247,
    totalSessionsChange: 8,
    avgAccuracy: 87.3,
    avgAccuracyChange: 2.1,
    totalHours: 342,
    totalHoursChange: 15,
  },
  monthlySessions: [
    { month: "1월", sessions: 120 },
    { month: "2월", sessions: 130 },
    { month: "3월", sessions: 140 },
    { month: "4월", sessions: 150 },
    { month: "5월", sessions: 160 },
    { month: "6월", sessions: 170 },
    { month: "7월", sessions: 180 },
    { month: "8월", sessions: 185 },
    { month: "9월", sessions: 190 },
    { month: "10월", sessions: 200 },
    { month: "11월", sessions: 205 },
    { month: "12월", sessions: 210 },
  ],
  exerciseTypes: [
    { name: "스쿼트", value: 35, color: "#4f46e5" },
    { name: "푸시업", value: 15, color: "#f97316" },
    { name: "플랭크", value: 5, color: "#ec4899" },
    { name: "런지", value: 20, color: "#22c55e" },
    { name: "버피", value: 25, color: "#0ea5e9" },
  ],
  accuracyTrend: {
    weeks: ["1주", "2주", "3주", "4주", "5주", "6주", "7주", "8주"],
    users: [
      {
        name: "김현지",
        color: "#2563eb",
        values: [86, 87.5, 88.5, 89.2, 90, 90.5, 91, 91.5],
      },
      {
        name: "박준호",
        color: "#22c55e",
        values: [88, 88.8, 89.5, 90.3, 91, 91.8, 92.4, 93],
      },
      {
        name: "이수정",
        color: "#f59e0b",
        values: [92, 92.8, 93.6, 94.2, 94.8, 95.4, 95.8, 96],
      },
    ],
  },
};

const Dashboard = ({ currentPage, onChangePage }) => {
  const [data, setData] = useState(null);

  // 나중에 API로 교체
  useEffect(() => {
    setData(mockData);
  }, []);

  if (!data) {
    return <div className="dashboard-loading">로딩 중...</div>;
  }

  const totalPieValue = data.exerciseTypes.reduce(
    (sum, item) => sum + item.value,
    0
  );
  let offset = 0;
  const pieSegments = data.exerciseTypes.map((item) => {
    const start = offset;
    const end = offset + (item.value / totalPieValue) * 100;
    offset = end;
    return { ...item, start, end };
  });
  const pieBackground = pieSegments
    .map((seg) => `${seg.color} ${seg.start}% ${seg.end}%`)
    .join(", ");

  const maxMonthlySessions = Math.max(
    ...data.monthlySessions.map((m) => m.sessions)
  );

  const allAccuracyValues = data.accuracyTrend.users.flatMap(
    (u) => u.values
  );
  const maxAcc = Math.max(...allAccuracyValues);
  const minAcc = Math.min(...allAccuracyValues);

  const svgWidth = 700;
  const svgHeight = 260;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const weeksCount = data.accuracyTrend.weeks.length;

  const getLinePath = (user) => {
    return user.values
      .map((value, index) => {
        const x =
          padding.left +
          (index / Math.max(weeksCount - 1, 1)) *
            (svgWidth - padding.left - padding.right);
        const ratio =
          (value - minAcc) / Math.max(maxAcc - minAcc, 1);
        const y =
          svgHeight -
          padding.bottom -
          ratio * (svgHeight - padding.top - padding.bottom);
        return `${x},${y}`;
      })
      .join(" ");
  };

  return (
    <div className="dashboard">
      <Sidebar currentPage={currentPage} onChangePage={onChangePage} />

      <main className="main">
        <header className="header">
          <div>
            <h1 className="page-title">운동 통계 대시보드</h1>
            <p className="page-subtitle">
              사용자별 운동 기록 및 성과 분석
            </p>
          </div>

          <div className="header-right">
            <button className="date-selector">
              <span>{data.meta.currentMonth}</span>
              <span className="chevron">▾</span>
            </button>
            <button className="primary-button">리포트 내보내기</button>
          </div>
        </header>

        {/* 상단 요약 카드 */}
        <section className="summary-cards">
          <div className="card stat-card">
            <div className="card-row">
              <div>
                <div className="stat-title">총 사용자</div>
                <div className="stat-value">{data.summary.totalUsers}</div>
                <div className="stat-diff positive">
                  +{data.summary.totalUsersChange}% 증가
                </div>
              </div>
              <div className="icon-box icon-users">👥</div>
            </div>
          </div>

          <div className="card stat-card">
            <div className="card-row">
              <div>
                <div className="stat-title">총 운동 세션</div>
                <div className="stat-value">
                  {data.summary.totalSessions.toLocaleString()}
                </div>
                <div className="stat-diff positive">
                  +{data.summary.totalSessionsChange}% 증가
                </div>
              </div>
              <div className="icon-box icon-sessions">🏋️</div>
            </div>
          </div>

          <div className="card stat-card">
            <div className="card-row">
              <div>
                <div className="stat-title">평균 정확도</div>
                <div className="stat-value">
                  {data.summary.avgAccuracy.toFixed(1)}%
                </div>
                <div className="stat-diff positive">
                  +{data.summary.avgAccuracyChange}% 향상
                </div>
              </div>
              <div className="icon-box icon-accuracy">⚙️</div>
            </div>
          </div>

          <div className="card stat-card">
            <div className="card-row">
              <div>
                <div className="stat-title">총 운동 시간</div>
                <div className="stat-value">
                  {data.summary.totalHours}h
                </div>
                <div className="stat-diff positive">
                  +{data.summary.totalHoursChange}% 증가
                </div>
              </div>
              <div className="icon-box icon-time">⏱️</div>
            </div>
          </div>
        </section>

        {/* 중간 차트 */}
        <section className="charts-row">
          <div className="card">
            <div className="card-header">
              <div className="card-title">월별 운동 세션</div>
            </div>
            <div className="bar-chart">
              {data.monthlySessions.map((item) => (
                <div className="bar" key={item.month}>
                  <div
                    className="bar-inner"
                    style={{
                      height: `${
                        (item.sessions / maxMonthlySessions) * 100
                      }%`,
                    }}
                  />
                  <span className="bar-label">{item.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">운동 유형별 분포</div>
            </div>
            <div className="pie-chart-wrapper">
              <div
                className="pie-chart"
                style={{
                  backgroundImage: `conic-gradient(${pieBackground})`,
                }}
              />
              <ul className="legend">
                {data.exerciseTypes.map((item) => (
                  <li key={item.name} className="legend-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="legend-text">
                      {item.name} {item.value}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 하단 라인 차트 */}
        <section className="card trend-card">
          <div className="card-header">
            <div className="card-title">사용자별 정확도 트렌드</div>
          </div>
          <div className="trend-chart">
            <svg
              className="trend-svg"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="none"
            >
              <g>
                {Array.from({ length: 4 }).map((_, idx) => {
                  const y =
                    padding.top +
                    ((svgHeight - padding.top - padding.bottom) *
                      idx) /
                      3;
                  return (
                    <line
                      key={idx}
                      x1={padding.left}
                      x2={svgWidth - padding.right}
                      y1={y}
                      y2={y}
                      className="grid-line"
                    />
                  );
                })}
              </g>

              {data.accuracyTrend.users.map((user) => (
                <polyline
                  key={user.name}
                  fill="none"
                  stroke={user.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={getLinePath(user)}
                />
              ))}
            </svg>

            <div className="trend-footer">
              <div className="trend-legend">
                {data.accuracyTrend.users.map((user) => (
                  <div
                    key={user.name}
                    className="trend-legend-item"
                  >
                    <span
                      className="trend-legend-dot"
                      style={{ backgroundColor: user.color }}
                    />
                    <span className="trend-legend-name">
                      {user.name}
                    </span>
                  </div>
                ))}
              </div>

              <div className="trend-weeks">
                {data.accuracyTrend.weeks.map((week) => (
                  <span
                    key={week}
                    className="trend-week-label"
                  >
                    {week}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
