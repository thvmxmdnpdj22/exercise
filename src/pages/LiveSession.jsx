// src/pages/LiveSession.jsx
import React from "react";
import VideoPanel from "../components/VideoPanel";
import UserPose from "../components/UserPose";
import PrimaryButton from "../components/PrimaryButton";

export default function LiveSession({ metrics = {}, onFinish = () => {} }) {
  return (
    <section className="px-6 pt-12">
      <h2 className="text-center text-2xl font-bold text-red-600"></h2>

      {/* 가로 2칸 고정 */}
      <div className="mt-6 w-full overflow-x-auto">
        <div className="flex flex-nowrap gap-6 items-start justify-start" style={{ minWidth: 1340 }}>
          <div className="shrink-0" style={{ width: 640, flex: "0 0 640px" }}>
            <VideoPanel title="가이드 영상" src="/videos/Lunge.mp4" autoPlay muted loop />
          </div>
          <div className="shrink-0" style={{ width: 640, flex: "0 0 640px" }}>
            <UserPose />
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <PrimaryButton onClick={onFinish}>결과 보기</PrimaryButton>
      </div>
    </section>
  );
}
