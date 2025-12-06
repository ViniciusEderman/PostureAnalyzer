import { storePostureRecord, cleanOldRecords } from "../db/database.js";

export async function capturePostureSnapshot(canvas, currentStatus, keypoints) {
  try {
    const storageCanvas = document.createElement("canvas");
    const storageCtx = storageCanvas.getContext("2d");
    storageCanvas.width = 320;
    storageCanvas.height = 240;

    storageCtx.drawImage(
      canvas,
      0,
      0,
      storageCanvas.width,
      storageCanvas.height
    );

    const blob = await new Promise((resolve) => {
      storageCanvas.toBlob(resolve, "image/jpeg", 0.7);
    });

    const essentialKeypoints = keypoints.slice(0, 17).map((kp) => ({
      x: kp.x,
      y: kp.y,
      score: kp.score,
    }));

    await storePostureRecord(currentStatus, blob, essentialKeypoints);

    console.log("Postura capturada e armazenada:", currentStatus);

    if (Math.random() < 0.1) {
      await cleanOldRecords();
    }
  } catch (error) {
    console.error("Erro ao capturar postura:", error);
  }
}

export function startPostureCapture(detector, video, canvas, postureStatus) {
  let captureInterval;

  const runCapture = async () => {
    const currentStatus = postureStatus.textContent;
    const poses = await detector.estimatePoses(video);
    if (poses.length > 0) {
      await capturePostureSnapshot(canvas, currentStatus, poses[0].keypoints);
    }
  };

  captureInterval = setInterval(runCapture, 30000);

  setTimeout(async () => {
    await runCapture();
    console.log("Captura inicial realizada");
  }, 5000);

  console.log("Captura automática iniciada (a cada 2 minutos)");

  return captureInterval;
}

export function stopPostureCapture(captureInterval) {
  if (captureInterval) {
    clearInterval(captureInterval);
    console.log("Captura automática parada");
  }
}
