import * as posedetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs";
import * as mpPose from "@mediapipe/pose";
import { initDB } from "./db/database.js";
import { setupCamera } from "./camera/camera.js";
import { analyzeSittingPosture } from "./posture/analyzer.js";
import {
  startPostureCapture,
  stopPostureCapture,
} from "./capture/snapshot.js";

const video = document.getElementById("video");
const canvas = document.getElementById("output");
const ctx = canvas.getContext("2d");
const postureStatus = document.getElementById("posture-status");

let detector;
let captureInterval;
let lastStatusMessage = "Aguardando detecção de pose...";
let lastStatusUpdateTime = 0;

// Enhanced posture analysis with more precise calculations (delegated to analyzer)
function analyzeSittingPostureWrapper(keypoints) {
  if (!keypoints || keypoints.length === 0)
    return "Aguardando detecção de pose...";

  // Key points for posture analysis
  const leftShoulder = keypoints[11];
  const rightShoulder = keypoints[12];
  const leftHip = keypoints[23];
  const rightHip = keypoints[24];
  const leftEar = keypoints[7];
  const rightEar = keypoints[8];
  const leftKnee = keypoints[25];
  const rightKnee = keypoints[26];
  const nose = keypoints[0];

  return analyzeSittingPosture(keypoints);
}

async function main() {
  await setupCamera(canvas, postureStatus);

  await initDB();
  console.log("Banco de dados inicializado");

  detector = await posedetection.createDetector(
    posedetection.SupportedModels.BlazePose,
    {
      runtime: "mediapipe",
      modelType: "full",
      solutionPath: `./node_modules/@mediapipe/pose`,
    }
  );

  captureInterval = startPostureCapture(
    detector,
    video,
    canvas,
    postureStatus
  );

  async function render() {
    const poses = await detector.estimatePoses(video);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    let statusMessage = "Nenhuma pessoa detectada.";

    if (poses.length > 0) {
      const pose = poses[0];

      // Draw keypoints with confidence visualization
      for (const kp of pose.keypoints) {
        if (kp.score > 0.6) {
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);

          // Color based on confidence
          if (kp.score > 0.8) {
            ctx.fillStyle = "lime";
          } else if (kp.score > 0.7) {
            ctx.fillStyle = "yellow";
          } else {
            ctx.fillStyle = "orange";
          }

          ctx.fill();
        }
      }

      statusMessage = analyzeSittingPostureWrapper(pose.keypoints);
    }

    const now = Date.now();
    if (
      statusMessage !== lastStatusMessage &&
      now - lastStatusUpdateTime > 5000
    ) {
      postureStatus.textContent = statusMessage;
      lastStatusMessage = statusMessage;
      lastStatusUpdateTime = now;
    }
    requestAnimationFrame(render);
  }

  render();

  window.addEventListener("beforeunload", () => {
    stopPostureCapture(captureInterval);
  });
}

window.onload = main;
