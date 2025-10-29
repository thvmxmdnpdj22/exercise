import React from "react";

const ExerciseCard = ({ title, description, image, isSelected, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        border: isSelected ? "3px solid #3B82F6" : "1px solid #ddd",
        borderRadius: "12px",
        padding: "12px",
        textAlign: "center",
        cursor: "pointer",
        backgroundColor: "#fff",
        transition: "all 0.2s ease",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
        flex: "1",
        maxWidth: "280px",
      }}
    >
      <img
        src={`/images/${image}`}
        alt={title}
        style={{
          width: "100%",
          height: "200px",
          objectFit: "cover",
          borderRadius: "8px",
          marginBottom: "8px",
        }}
      />
      <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#333" }}>
        {title}
      </h3>
      <p style={{ color: "#22A45D", fontSize: "0.9rem", marginTop: "4px" }}>
        {description}
      </p>
    </div>
  );
};

export default ExerciseCard;
