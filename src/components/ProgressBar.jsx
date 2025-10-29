import React, { useState, useMemo } from "react";


export default function VideoPanel({
  title,
  src,
  videoUrl,
  poster,
  autoPlay = false,
  loop = false,
  muted = false,
  controls = true,
  width = "100%",
}) {
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(null);

  // src 우선, 없으면 videoUrl 사용 (호환)
  const resolvedSrc = useMemo(() => src || videoUrl || "", [src, videoUrl]);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      {title && (
        <div className="mb-3 text-sm font-semibold text-gray-700">{title}</div>
      )}

      {!resolvedSrc ? (
        <div className="text-center text-sm text-gray-500">영상이 없습니다.</div>
      ) : (
        <>
          {!loaded && !err && (
            <div className="mb-2 text-center text-xs text-gray-500">로딩 중…</div>
          )}
          {err && (
            <div className="mb-2 text-center text-xs text-red-600">
              영상을 불러오는 중 오류가 발생했습니다.
            </div>
          )}

          <video
            src={resolvedSrc}
            poster={poster}
            controls={controls}
            autoPlay={autoPlay}
            loop={loop}
            muted={muted}
            playsInline
            onCanPlay={() => setLoaded(true)}
            onError={(e) => {
              const url = e.currentTarget.currentSrc;
              setErr(url || true);
              // 디버깅 도움: 실제 요청된 URL을 콘솔에 찍기
              console.error("VIDEO ERROR src =", url);
            }}
            style={{
              width: typeof width === "number" ? `${width}px` : width,
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              display: err ? "none" : "block",
            }}
          />
        </>
      )}
    </div>
  );
}
