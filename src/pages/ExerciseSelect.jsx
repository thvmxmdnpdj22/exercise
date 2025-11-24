import React, { useState } from "react";
import ExerciseCard from "../components/ExerciseCard";

const ExerciseSelect = ({
  onSelect,
  onStart
}) => {
  const [selected, setSelected] = useState(null);

  const exercises = [
    {
      title: "코어 근육 훈련",
      description: "균형 운동으로 안정성과 코어 근력을 향상시키세요.",
      image: "core.jpg",
      video: 'Lunge.mp4',
    },
    {
      title: "스쿼트 훈련",
      description: "하체 근력 강화를 위한 완벽한 스쿼트 자세를 마스터하세요.",
      image: "shoulder.jpg",
      video: 'shoulder.mp4',
    },
    {
      title: "어깨 훈련",
      description: "효과적인 운동으로 어깨를 강화하고 탄탄하게 만드세요.",
      image: "Test_Move.png",
      video: 'Test_MOV.mov',
    },
  ];

  return (
    <div
      style={{
        backgroundColor: "#F9FAF8",
        minHeight: "100vh",
        padding: "40px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h1 style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#111" }}>
        운동 선택
      </h1>
      <p style={{ color: "#444", marginBottom: "32px" }}>
        실시간 피드백 세션을 시작할 운동을 선택하세요.
        <br />
        각 운동은 자세를 개선하고 운동 효과를 극대화하도록 설계되었습니다.
      </p>

      <div
        style={{
          display: "flex",
          gap: "24px",
          justifyContent: "center",
          flexWrap: "wrap",
          maxWidth: "900px",
        }}
      >
        {exercises.map((ex, idx) => (
          <ExerciseCard
            key={idx}
            title={ex.title}
            description={ex.description}
            image={ex.image}
            isSelected={selected === idx}
            onClick={() => {
              setSelected(idx);
              onSelect(ex);
            }}
          />
        ))}
      </div>

      <button
        onClick={() => onStart(exercises[selected])}
        disabled={selected === null}
        style={{
          marginTop: "40px",
          backgroundColor: selected === null ? "#ccc" : "#22A45D",
          color: "white",
          padding: "14px 48px",
          border: "none",
          borderRadius: "30px",
          fontSize: "1.1rem",
          cursor: selected === null ? "not-allowed" : "pointer",
          transition: "background 0.2s ease",
        }}
      >
        시작하기
      </button>
    </div>
  );
};

export default ExerciseSelect;
