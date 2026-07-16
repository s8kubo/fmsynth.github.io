
"use strict";

const elements = {
  carrierFrequency: document.querySelector("#carrier-frequency"),
  carrierFrequencyValue: document.querySelector(
    "#carrier-frequency-value"
  ),
  carrierWave: document.querySelector("#carrier-wave"),

  modulatorFrequency: document.querySelector(
    "#modulator-frequency"
  ),
  modulatorFrequencyValue: document.querySelector(
    "#modulator-frequency-value"
  ),
  modulatorWave: document.querySelector("#modulator-wave"),

  modulationDepth: document.querySelector("#modulation-depth"),
  modulationDepthValue: document.querySelector(
    "#modulation-depth-value"
  ),

  volume: document.querySelector("#volume"),
  volumeValue: document.querySelector("#volume-value"),

  playButton: document.querySelector("#play-button"),
  status: document.querySelector("#status"),

  canvas: document.querySelector("#oscilloscope")
};

const canvasContext = elements.canvas.getContext("2d");

let audioContext = null;
let carrierOscillator = null;
let modulatorOscillator = null;
let modulationGain = null;
let masterGain = null;
let analyser = null;

let waveformData = null;
let animationFrameId = null;
let isPlaying = false;

/**
 * AudioContextを作成する。
 * ブラウザーによってwebkitAudioContextが必要な場合にも対応する。
 */
function createAudioContext() {
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error(
      "このブラウザーはWeb Audio APIに対応していません。"
    );
  }

  return new AudioContextClass();
}

/**
 * スライダー横の数値表示を更新する。
 */
function updateDisplayedValues() {
  const carrierFrequency =
    Number(elements.carrierFrequency.value);

  const modulatorFrequency =
    Number(elements.modulatorFrequency.value);

  const depth =
    Number(elements.modulationDepth.value);

  const volume =
    Number(elements.volume.value);

  elements.carrierFrequencyValue.textContent =
    `${carrierFrequency.toFixed(0)} Hz`;

  elements.modulatorFrequencyValue.textContent =
    `${modulatorFrequency.toFixed(1)} Hz`;

  elements.modulationDepthValue.textContent =
    `${depth.toFixed(0)} Hz`;

  elements.volumeValue.textContent =
    `${Math.round(volume * 100)}%`;
}

/**
 * AudioParamを急激に変化させず、短時間で滑らかに変更する。
 */
function setAudioParam(audioParam, value) {
  if (!audioContext || !audioParam) {
    return;
  }

  const now = audioContext.currentTime;

  audioParam.cancelScheduledValues(now);
  audioParam.setTargetAtTime(value, now, 0.01);
}

/**
 * FMシンセのノードを作成し、接続する。
 *
 * modulator
 *   ↓
 * modulationGain
 *   ↓
 * carrier.frequency
 *
 * carrier
 *   ↓
 * masterGain
 *   ↓
 * analyser
 *   ↓
 * destination
 */
function buildSynth() {
  carrierOscillator = audioContext.createOscillator();
  modulatorOscillator = audioContext.createOscillator();

  modulationGain = audioContext.createGain();
  masterGain = audioContext.createGain();
  analyser = audioContext.createAnalyser();

  carrierOscillator.type =
    elements.carrierWave.value;

  modulatorOscillator.type =
    elements.modulatorWave.value;

  carrierOscillator.frequency.value =
    Number(elements.carrierFrequency.value);

  modulatorOscillator.frequency.value =
    Number(elements.modulatorFrequency.value);

  modulationGain.gain.value =
    Number(elements.modulationDepth.value);

  /*
   * 音量変更時のクリックノイズを避けるため、
   * 最初は0から現在の音量まで少しずつ上げる。
   */
  masterGain.gain.value = 0;

  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.75;

  waveformData = new Uint8Array(analyser.fftSize);

  modulatorOscillator.connect(modulationGain);
  modulationGain.connect(carrierOscillator.frequency);

  carrierOscillator.connect(masterGain);
  masterGain.connect(analyser);
  analyser.connect(audioContext.destination);

  const now = audioContext.currentTime;
  const requestedVolume =
    Number(elements.volume.value);

  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(
    requestedVolume,
    now + 0.03
  );

  carrierOscillator.start();
  modulatorOscillator.start();
}

/**
 * 音を再生する。
 */
async function startSynth() {
  try {
    if (!audioContext) {
      audioContext = createAudioContext();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    buildSynth();

    isPlaying = true;

    elements.playButton.textContent = "stop";
    elements.playButton.classList.add("playing");

    elements.status.textContent = "playing";
    elements.status.classList.add("playing");

    drawOscilloscope();
  } catch (error) {
    console.error(error);

    elements.status.textContent = "error";

    window.alert(
      error instanceof Error
        ? error.message
        : "音声の再生に失敗しました。"
    );
  }
}

/**
 * 音を停止する。
 */
function stopSynth() {
  if (!audioContext || !isPlaying) {
    return;
  }

  const now = audioContext.currentTime;

  /*
   * いきなり接続を切るとノイズが出るので、
   * 音量を短時間で0まで下げてから停止する。
   */
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(
    masterGain.gain.value,
    now
  );
  masterGain.gain.linearRampToValueAtTime(
    0,
    now + 0.03
  );

  window.setTimeout(() => {
    try {
      carrierOscillator.stop();
      modulatorOscillator.stop();

      carrierOscillator.disconnect();
      modulatorOscillator.disconnect();
      modulationGain.disconnect();
      masterGain.disconnect();
      analyser.disconnect();
    } catch (error) {
      console.warn("音声ノードの停止に失敗しました。", error);
    }

    carrierOscillator = null;
    modulatorOscillator = null;
    modulationGain = null;
    masterGain = null;
    analyser = null;
    waveformData = null;
  }, 40);

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  isPlaying = false;

  elements.playButton.textContent = "start";
  elements.playButton.classList.remove("playing");

  elements.status.textContent = "stopped";
  elements.status.classList.remove("playing");

  drawIdleCanvas();
}

/**
 * 再生ボタンの処理。
 */
async function toggleSynth() {
  if (isPlaying) {
    stopSynth();
  } else {
    await startSynth();
  }
}

/**
 * Canvasの実際の解像度を表示サイズに合わせる。
 * Retinaなどの高密度ディスプレイでも線をぼかさないための処理。
 */
function resizeCanvas() {
  const devicePixelRatio =
    window.devicePixelRatio || 1;

  const rectangle =
    elements.canvas.getBoundingClientRect();

  const width =
    Math.max(1, Math.floor(rectangle.width * devicePixelRatio));

  const height =
    Math.max(1, Math.floor(rectangle.height * devicePixelRatio));

  if (
    elements.canvas.width !== width ||
    elements.canvas.height !== height
  ) {
    elements.canvas.width = width;
    elements.canvas.height = height;
  }

  canvasContext.setTransform(
    devicePixelRatio,
    0,
    0,
    devicePixelRatio,
    0,
    0
  );
}

/**
 * 停止中のCanvasを描く。
 */
function drawIdleCanvas() {
  resizeCanvas();

  const width =
    elements.canvas.clientWidth;

  const height =
    elements.canvas.clientHeight;

  canvasContext.fillStyle = "#141414";
  canvasContext.fillRect(0, 0, width, height);

  canvasContext.strokeStyle = "#353535";
  canvasContext.lineWidth = 1;

  /*
   * 背景のグリッド。
   */
  const horizontalSections = 6;
  const verticalSections = 12;

  for (let i = 1; i < horizontalSections; i += 1) {
    const y =
      (height / horizontalSections) * i;

    canvasContext.beginPath();
    canvasContext.moveTo(0, y);
    canvasContext.lineTo(width, y);
    canvasContext.stroke();
  }

  for (let i = 1; i < verticalSections; i += 1) {
    const x =
      (width / verticalSections) * i;

    canvasContext.beginPath();
    canvasContext.moveTo(x, 0);
    canvasContext.lineTo(x, height);
    canvasContext.stroke();
  }

  canvasContext.strokeStyle = "#77776f";
  canvasContext.lineWidth = 1;

  canvasContext.beginPath();
  canvasContext.moveTo(0, height / 2);
  canvasContext.lineTo(width, height / 2);
  canvasContext.stroke();
}

/**
 * オシロスコープを描画する。
 */
function drawOscilloscope() {
  if (!analyser || !waveformData || !isPlaying) {
    return;
  }

  animationFrameId =
    requestAnimationFrame(drawOscilloscope);

  analyser.getByteTimeDomainData(waveformData);

  resizeCanvas();

  const width =
    elements.canvas.clientWidth;

  const height =
    elements.canvas.clientHeight;

  canvasContext.fillStyle = "#141414";
  canvasContext.fillRect(0, 0, width, height);

  /*
   * 背景グリッド。
   */
  canvasContext.strokeStyle = "#353535";
  canvasContext.lineWidth = 1;

  const horizontalSections = 6;
  const verticalSections = 12;

  for (let i = 1; i < horizontalSections; i += 1) {
    const y =
      (height / horizontalSections) * i;

    canvasContext.beginPath();
    canvasContext.moveTo(0, y);
    canvasContext.lineTo(width, y);
    canvasContext.stroke();
  }

  for (let i = 1; i < verticalSections; i += 1) {
    const x =
      (width / verticalSections) * i;

    canvasContext.beginPath();
    canvasContext.moveTo(x, 0);
    canvasContext.lineTo(x, height);
    canvasContext.stroke();
  }

  /*
   * 波形本体。
   */
  canvasContext.strokeStyle = "#f4f4ef";
  canvasContext.lineWidth = 2;
  canvasContext.beginPath();

  const sliceWidth =
    width / (waveformData.length - 1);

  let x = 0;

  for (
    let index = 0;
    index < waveformData.length;
    index += 1
  ) {
    const normalized =
      waveformData[index] / 128;

    const y =
      normalized * (height / 2);

    if (index === 0) {
      canvasContext.moveTo(x, y);
    } else {
      canvasContext.lineTo(x, y);
    }

    x += sliceWidth;
  }

  canvasContext.stroke();
}

/**
 * 操作部品のイベントを設定する。
 */
function registerEventListeners() {
  elements.playButton.addEventListener(
    "click",
    toggleSynth
  );

  elements.carrierFrequency.addEventListener(
    "input",
    () => {
      updateDisplayedValues();

      if (carrierOscillator) {
        setAudioParam(
          carrierOscillator.frequency,
          Number(elements.carrierFrequency.value)
        );
      }
    }
  );

  elements.modulatorFrequency.addEventListener(
    "input",
    () => {
      updateDisplayedValues();

      if (modulatorOscillator) {
        setAudioParam(
          modulatorOscillator.frequency,
          Number(elements.modulatorFrequency.value)
        );
      }
    }
  );

  elements.modulationDepth.addEventListener(
    "input",
    () => {
      updateDisplayedValues();

      if (modulationGain) {
        setAudioParam(
          modulationGain.gain,
          Number(elements.modulationDepth.value)
        );
      }
    }
  );

  elements.volume.addEventListener(
    "input",
    () => {
      updateDisplayedValues();

      if (masterGain) {
        setAudioParam(
          masterGain.gain,
          Number(elements.volume.value)
        );
      }
    }
  );

  elements.carrierWave.addEventListener(
    "change",
    () => {
      if (carrierOscillator) {
        carrierOscillator.type =
          elements.carrierWave.value;
      }
    }
  );

  elements.modulatorWave.addEventListener(
    "change",
    () => {
      if (modulatorOscillator) {
        modulatorOscillator.type =
          elements.modulatorWave.value;
      }
    }
  );

  window.addEventListener(
    "resize",
    () => {
      if (!isPlaying) {
        drawIdleCanvas();
      }
    }
  );

  window.addEventListener(
    "beforeunload",
    () => {
      if (audioContext) {
        audioContext.close();
      }
    }
  );
}

/**
 * 初期化。
 */
function initialize() {
  updateDisplayedValues();
  registerEventListeners();
  drawIdleCanvas();
}

initialize();
