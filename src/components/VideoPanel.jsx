// src/components/VideoPanel.jsx
import React from "react";

export default function VideoPanel({ title, src, autoPlay = false, muted = false, loop = false, originalVideoRef = null }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm" style={{width: '100%'}}>
      {title && <div className="mb-3 text-sm font-semibold text-gray-700">{title}</div>}
      <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: "16 / 9" }}>
        <video
          src={src}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          playsInline
          controls={false}
          className="absolute inset-0 w-full h-full object-cover"
          style={{width: '100%'}}
          ref={originalVideoRef}
        />
      </div>
    </div>
  );
}
