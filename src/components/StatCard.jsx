import React from "react";

export default function StatCard({ label, value, positive, negative }) {
  const color = positive ? "#22A45D" : negative ? "#E11D48" : "#0F1E12";
  const bg = positive ? "#EAF7EE" : negative ? "#FDECEC" : "#F3F4F6";

  return (
    <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: bg }}>
      <div className="text-sm text-gray-600">{label}</div>
      <div className="mt-1 text-2xl font-extrabold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

