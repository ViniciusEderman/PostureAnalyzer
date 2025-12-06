# PostureAnalyzer

Aplicação web para monitorar e registrar a postura sentada em frente ao computador, usando visão computacional (BlazePose + TensorFlow.js) diretamente no navegador, com armazenamento local das capturas.

---

## Visão Geral

O PostureAnalyzer faz:

- Detecção de pose em tempo real via câmera do navegador.
- Análise da postura focada em **pescoço** e **ombros**.
- Classificação da postura em níveis (Boa, Regular, Ruim, Crítica).
- Capturas automáticas de screenshots + metadados de postura a cada intervalo configurável.
- Armazenamento local e privado usando **IndexedDB** (nada vai para servidor).

Stack principal:

- **Frontend:** HTML + CSS + JavaScript (ES Modules).
- **ML / Pose:** `@tensorflow-models/pose-detection` (BlazePose) + `@tensorflow/tfjs` + `@mediapipe/pose`.
- **Build/Dev:** Vite.

---

## Instalação e Execução

Pré-requisitos:

- Node.js + npm instalados.

Passos:

```bash
git clone <repo>
cd PostureAnalyzer
npm install
npm run dev
```

Depois abra o endereço indicado pelo Vite (normalmente `http://localhost:5173`).

O navegador irá pedir permissão para acessar a câmera.

---

## Fluxo de Funcionamento

1. **Carregamento da página** (`index.html`):
   - Renderiza a UI principal (card central, vídeo, painel de status).
   - Carrega o módulo `src/index.js`.

2. **Inicialização** (`src/index.js`):
   - Configura a câmera (`setupCamera`).
   - Inicializa o IndexedDB (`initDB`).
   - Cria o detector de pose BlazePose (`pose-detection`).
   - Inicia o sistema de capturas automáticas (`startPostureCapture`).
   - Começa o loop de renderização (`render()` com `requestAnimationFrame`).

3. **Render em tempo real**:
   - A cada frame: estima poses, desenha o vídeo e os keypoints no `canvas`.
   - Calcula a mensagem de postura via `analyzeSittingPosture`.
   - Atualiza o texto de status com um **intervalo mínimo de 5s**, para evitar flicker.

4. **Capturas periódicas** (`src/capture/snapshot.js`):
   - A cada 30 segundos, captura um frame do `canvas`.
   - Reduz a imagem para 320x240, converte para JPEG.
   - Armazena no IndexedDB junto com status de postura e keypoints.

---

## Estrutura de Pastas

```text
PostureAnalyzer/
  index.html          # Estrutura da página
  package.json
  src/
    camera/
      camera.js       # Setup da câmera
    capture/
      snapshot.js     # Captura automática e armazenamento
    db/
      database.js     # IndexedDB: init, store, history
    posture/
      analyzer.js     # Lógica de análise de postura
    index.js          # Orquestrador principal (main/render)
    styles.css        # Estilos globais da interface
```

---

## Módulos Principais

### `index.html`

Fornece a estrutura base da interface:

- Container principal com layout de dashboard.
- Elementos principais:
  - `<video id="video">` — feed da câmera.
  - `<canvas id="output">` — vídeo + keypoints desenhados.
  - `<div id="posture-status">` — texto da análise de postura.

Inclui os assets:

```html
<link rel="stylesheet" href="./src/styles.css" />
<script type="module" src="./src/index.js"></script>
```

### `src/index.js` – Orquestrador

Responsável por conectar todos os módulos.

Principais responsabilidades:

- Pegar referências de DOM (`video`, `canvas`, `posture-status`).
- Inicializar câmera (`setupCamera`).
- Inicializar banco (`initDB`).
- Criar o detector de pose BlazePose.
- Iniciar as capturas automáticas (`startPostureCapture`).
- Rodar o loop de renderização e atualizar o status textual.

Trecho-chave do fluxo:

```js
async function main() {
  await setupCamera(canvas, postureStatus);

  await initDB();

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
      // desenha keypoints...
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
}

window.onload = main;
```

### `src/camera/camera.js` – Configuração da Câmera

Cuida do acesso à câmera via `getUserMedia` e do dimensionamento do `canvas`:

```js
export async function setupCamera(canvas, postureStatus) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.getElementById("video");
    video.srcObject = stream;
    await new Promise((resolve) => (video.onloadedmetadata = resolve));
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  } catch (error) {
    console.warn("Sem câmera detectada. Modo de demonstração ativado.");
    postureStatus.textContent = "Sem câmera detectada. Exibindo simulação.";
    canvas.width = 640;
    canvas.height = 480;
  }
}
```

### `src/posture/analyzer.js` – Análise de Postura

Implementa a lógica de avaliação da postura focada nos pontos mais estáveis:

- Ombro esquerdo e direito (11, 12).
- Orelha (7).
- Quadris (23, 24) são opcionais (apenas se o score for alto).

Ideia geral:

- Verifica se os ombros têm confiança mínima.
- Calcula alinhamento lateral dos ombros (`shoulderTiltRatio`).
- Analisa o quanto a cabeça está projetada para frente/baixo (`headForwardScore`).
- Usa quadris apenas como bônus se bem detectados.
- Classifica em: Boa, Regular/Aceitável, Ruim, Crítica.

Retorna mensagens descrevendo o estado da postura.

### `src/db/database.js` – Persistência com IndexedDB

Responsável por todo acesso ao banco local:

- `initDB()` – cria/abre o banco `PostureAnalyzerDB` e o store `postureRecords`.
- `storePostureRecord(status, imageBlob, keypointData)` – salva uma captura.
- `getPostureHistory(limit)` – retorna as últimas N capturas.
- `cleanOldRecords()` – remove registros com mais de 30 dias.
- `createImageUrlFromRecord(record)` – gera uma `object URL` a partir do `imageBlob` para exibição.

Schema aproximado de cada registro:

```ts
{
  id: number,             // auto-increment
  timestamp: number,      // Date.now()
  date: string,           // ISO string
  postureStatus: string,  // mensagem de postura
  imageBlob: Blob,        // JPEG 320x240
  keypointData: Array<{ x: number; y: number; score: number }>
}
```

### `src/capture/snapshot.js` – Captura Automática

Lida com a geração de screenshots e armazenamento periódico:

- `capturePostureSnapshot(canvas, currentStatus, keypoints)`
  - Cria um canvas menor (320x240).
  - Desenha o frame atual do `canvas` principal.
  - Converte para JPEG (`toBlob`).
  - Extrai os keypoints essenciais (posição + score).
  - Salva tudo via `storePostureRecord`.

- `startPostureCapture(detector, video, canvas, postureStatus)`
  - Agenda uma captura a cada 30 s.
  - Faz uma captura inicial após alguns segundos.
  - Retorna o `captureInterval` (id do `setInterval`).

- `stopPostureCapture(captureInterval)`
  - Limpa o `setInterval`.

### `src/styles.css` – Estilos

Define a identidade visual:

- Fundo em gradiente escuro.
- Card central (`.app-shell`) com sombra e bordas arredondadas.
- Layout em grid da área de vídeo + painel lateral.
- Estilo do painel de status da postura e texto de dicas.
- Responsividade para telas menores.

---

## Comportamento em Tempo Real

- O modelo de pose roda continuamente (30+ fps, dependendo da máquina).
- O texto de status **não** é atualizado a cada frame, e sim no máximo a cada 5 segundos, para evitar mudanças muito rápidas.
- As capturas de histórico são salvas em intervalos configuráveis (padrão atual: 30 segundos).

---

## Possíveis Extensões

Algumas ideias de evolução natural do projeto:

- Criar uma tela de **Histórico**, listando as últimas capturas com miniaturas + status.
- Exportar dados de postura (ex.: JSON) para análise posterior.

---
