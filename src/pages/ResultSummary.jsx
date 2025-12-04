import React, { useEffect } from "react";
import PrimaryButton from "../components/PrimaryButton";

export default function ResultSummary({
  metrics = { accuracy: 92, success: 10, fail: 3, repeat: 50 },
  feedback = "정확도를 높이려면 스트레칭 중 일관된 팔 각도를 유지하세요. 훌륭한 성과를 계속 유지하세요!",
  userId = "test_user_123", // 실제로는 부모에서 props로 내려주는 걸 추천
  onSave = () => {},
  onReport = () => {},
  onBack = () => {},
}) {
  const container = {
    backgroundColor: "#F6FBF7",
    minHeight: "100vh",
    padding: "32px 0",
  };

  const card = {
    maxWidth: 960,
    margin: "0 auto",
    padding: "24px",
  };

  const title = {
    fontSize: "1.8rem",
    fontWeight: 800,
    color: "#0F1E12",
    marginBottom: 20,
  };

  const statWrap = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    marginBottom: 28,
  };

  const statCard = {
    backgroundColor: "#EAF7EE",
    borderRadius: 14,
    padding: "18px 20px",
  };

  const statLabel = { color: "#3D5B47", fontSize: ".95rem", marginBottom: 6 };
  const statValue = { fontSize: "1.4rem", fontWeight: 800, color: "#0F1E12" };

  const sectionTitle = {
    fontSize: "1.35rem",
    fontWeight: 800,
    color: "#0F1E12",
    margin: "10px 0 8px",
  };

  const desc = { color: "#2C3E34", lineHeight: 1.7, marginBottom: 24 };

  const btnRow = {
    display: "flex",
    gap: 16,
    justifyContent: "center",
    marginTop: 18,
  };

  useEffect(() => {handleSaveClick()
    console.log("metrics:", metrics);
  }, [metrics]);

  // 👉 여기서 FastAPI로 POST 요청
  const handleSaveClick = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accuracy: metrics.accuracy,
          fail: metrics.fail,
          success: metrics.success,
          repeat: metrics.repeat,
          user_id: userId,
        }),
      });

      const data = await res.json();
      console.log("서버 응답:", data);

      // 필요하면 부모 콜백도 호출
      onSave(data);
    } catch (err) {
      console.error("기록 저장 실패:", err);
      // 에러 상황에서 UI로 알려주고 싶으면 여기서 상태를 추가해서 토스트/알림 띄우면 됨
    }
  };

  return (
    <div style={container}>
      <div style={card}>
        <h1 style={title}>운동 결과 요약</h1>

        {/* 통계 카드 2개 */}
        <div style={statWrap}>
          <div style={statCard}>
            <div style={statLabel}>평균 정확도</div>
            <div style={statValue}>{Math.round(metrics.accuracy)}%</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>총 반복 횟수</div>
            <div style={statValue}>{metrics.repeat}</div>
          </div>
        </div>

        {/* 피드백 */}
        <h2 style={sectionTitle}>맞춤형 피드백</h2>
        <p style={desc}>{feedback}</p>

        {/* 버튼들 */}
        <div style={btnRow}>
          {/* 기록 저장 → FastAPI 호출 */}
          <PrimaryButton onClick={handleSaveClick}>기록 저장</PrimaryButton>

          {/* 보고서 보기 → 기존 콜백 유지 */}
          <PrimaryButton onClick={onReport}>보고서 보기</PrimaryButton>
        </div>

        {/* 뒤로가기(선택) */}
        <div style={{ marginTop: 14, textAlign: "center" }}>
          <PrimaryButton variant="outline" minWidth={140} onClick={onBack}>
            돌아가기
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}