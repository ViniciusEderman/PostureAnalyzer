// Posture analysis utilities

// Enhanced posture analysis focused on visible points (neck/shoulders)
export function analyzeSittingPosture(keypoints) {
  if (!keypoints || keypoints.length === 0)
    return "Aguardando detecção de pose...";

  const leftShoulder = keypoints[11];
  const rightShoulder = keypoints[12];
  const leftEar = keypoints[7];
  const rightEar = keypoints[8];
  const nose = keypoints[0];

  // Verificar pontos essenciais com confiança mínima
  if (!leftShoulder || !rightShoulder || leftShoulder.score < 0.5 || rightShoulder.score < 0.5) {
    return "Posicione-se melhor na câmera para detectar os ombros.";
  }

  // Centro dos ombros (sempre disponível)
  const shoulderCenter = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  };

  // 1. Nível dos ombros (inclinação lateral)
  const shoulderLevelDiff = Math.abs(leftShoulder.y - rightShoulder.y);
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
  const shoulderTiltRatio = shoulderLevelDiff / shoulderWidth; // normalizado

  // 2. Posição da cabeça/pescoço (curvatura para frente)
  let headForwardScore = 0;
  if (leftEar && leftEar.score > 0.5) {
    const earForwardX = shoulderCenter.x - leftEar.x;
    const earDownY = leftEar.y - shoulderCenter.y;
    
    if (earForwardX > 12) headForwardScore += 2;
    else if (earForwardX > 6) headForwardScore += 1;
    
    if (earDownY > 20) headForwardScore += 2;
    else if (earDownY > 10) headForwardScore += 1;
  }

  // 3. Verificação opcional dos quadris (só se detectados com boa confiança)
  let hipBonus = 0;
  const leftHip = keypoints[23];
  const rightHip = keypoints[24];
  
  if (leftHip && rightHip && leftHip.score > 0.7 && rightHip.score > 0.7) {
    const hipCenter = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    };
    
    // Alinhamento ombro-quadril (verticalidade)
    const spineOffset = Math.abs(shoulderCenter.x - hipCenter.x);
    if (spineOffset < 15) hipBonus = 1; // bônus se coluna está alinhada
  }

  // Decisão baseada principalmente em ombros e cabeça
  const severeTilt = shoulderTiltRatio > 0.15 || shoulderLevelDiff > 25;
  const moderateTilt = shoulderTiltRatio > 0.08 || shoulderLevelDiff > 12;
  const severeHead = headForwardScore >= 3;
  const moderateHead = headForwardScore >= 1;

  // Lógica de decisão
  if (severeTilt && severeHead) {
    return "Postura Crítica! Ombros muito inclinados E cabeça projetada. Endireite imediatamente.";
  }
  
  if (severeTilt || severeHead) {
    return "Postura Ruim: Ombros desalinhados ou cabeça muito projetada. Ajuste sua posição.";
  }
  
  if (moderateTilt || moderateHead) {
    if (hipBonus > 0) {
      return "Postura Aceitável. Pequenos ajustes nos ombros ou pescoço podem melhorar.";
    }
    return "Postura Regular: Tente alinhar melhor os ombros e manter a cabeça erguida.";
  }

  return "Postura Boa! Ombros nivelados e cabeça bem posicionada.";
}
