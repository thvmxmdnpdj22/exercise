import * as cam from "@mediapipe/camera_utils";
import { Pose, POSE_LANDMARKS } from "@mediapipe/pose";
import React, { useEffect, useRef } from "react";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import Webcam from "react-webcam";

const DualPoseViewer = () => {
    const videoRef = useRef(null);
    const webcamRef = useRef(null);
    const canvasVideoRef = useRef(null);
    const canvasWebcamRef = useRef(null);

    const drawPose = (results, canvasRef) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        canvas.width = results.image.width;
        canvas.height = results.image.height;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        if (results.poseLandmarks) {
            drawConnectors(ctx, results.poseLandmarks, [[0, 1], [1, 2], [0, 4], [4, 5], [11, 12]], { color: "#00FF00", lineWidth: 2 });
            drawLandmarks(ctx, results.poseLandmarks, { color: "red", lineWidth: 2, radius: 3 });
        }
        ctx.restore();
    };

    useEffect(() => {
        // 1. Video Pose
        const videoPose = new Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });
        videoPose.setOptions({
            modelComplexity: 1,
            selfieMode: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });
        videoPose.onResults((results) => drawPose(results, canvasVideoRef));

        // 2. Webcam Pose
        const webcamPose = new Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });
        webcamPose.setOptions({
            modelComplexity: 1,
            selfieMode: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });
        webcamPose.onResults((results) => drawPose(results, canvasWebcamRef));

        let active = true;

        const detectVideoFrame = async () => {
            const video = videoRef.current;
            if (video && video.readyState >= 3) {
                await videoPose.send({ image: video });
            }
            if (active) requestAnimationFrame(detectVideoFrame);
        };

        const detectWebcamFrame = async () => {
            const webcam = webcamRef.current?.video;
            if (webcam && webcam.readyState >= 3) {
                await webcamPose.send({ image: webcam });
            }
            if (active) requestAnimationFrame(detectWebcamFrame);
        };

        requestAnimationFrame(detectVideoFrame);
        requestAnimationFrame(detectWebcamFrame);

        return () => {
            active = false;
            videoPose.close();
            webcamPose.close();
        };
    }, []);

    return (
        <div
            style={{
                display: "flex",
                width: "100vw",
                height: "100vh",
                overflow: "hidden",
            }}
        >
            {/* 왼쪽: 비디오 */}
            <div style={{ position: "relative", width: "50vw", height: "100vh" }}>
                <video
                    ref={videoRef}
                    src="/Lunge.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                    }}
                />
                <canvas
                    ref={canvasVideoRef}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                    }}
                />
            </div>

            {/* 오른쪽: 웹캠 */}
            <div style={{ position: "relative", width: "50vw", height: "100vh" }}>
                <Webcam
                    ref={webcamRef}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                    }}
                />
                {/* 오버레이 */}
                <video
                    ref={videoRef}
                    src="/Lunge.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: 'cover',
                        opacity: 0.25,
                        zIndex: 10,
                    }}
                />
                <canvas
                    ref={canvasWebcamRef}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                    }}
                />
            </div>
        </div>
    );
};

export default DualPoseViewer;
