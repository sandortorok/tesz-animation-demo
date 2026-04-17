const FRAME_COUNT = Number(document.body.dataset.frameCount || 122);
const CANVAS = document.getElementById("canvas");
const CTX = CANVAS.getContext("2d", { alpha: false });

const frames = new Array(FRAME_COUNT);
let currentFrame = 0;
let bgColor = "#f6f3ed";

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.floor(window.innerWidth);
  const h = Math.floor(window.innerHeight);
  CANVAS.width = Math.floor(w * dpr);
  CANVAS.height = Math.floor(h * dpr);
  CANVAS.style.width = `${w}px`;
  CANVAS.style.height = `${h}px`;
  CTX.setTransform(1, 0, 0, 1, 0, 0);
  CTX.scale(dpr, dpr);
  drawFrame(currentFrame);
}

function sampleBgColor(img) {
  const mini = document.createElement("canvas");
  mini.width = 8;
  mini.height = 8;
  const mctx = mini.getContext("2d", { willReadFrequently: true });
  mctx.drawImage(img, 0, 0, 8, 8);
  const corners = [
    mctx.getImageData(0, 0, 1, 1).data,
    mctx.getImageData(7, 0, 1, 1).data,
    mctx.getImageData(0, 7, 1, 1).data,
    mctx.getImageData(7, 7, 1, 1).data
  ];

  const avg = corners.reduce(
    (acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]],
    [0, 0, 0]
  );

  return `rgb(${Math.round(avg[0] / 4)}, ${Math.round(avg[1] / 4)}, ${Math.round(avg[2] / 4)})`;
}

function drawFrame(index) {
  const img = frames[index];
  if (!img || !img.naturalWidth) return;

  if (index % 20 === 0 || index === 0) {
    bgColor = sampleBgColor(img);
  }

  const cw = window.innerWidth;
  const ch = window.innerHeight;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const imageScale = 0.86;
  const scale = Math.max(cw / iw, ch / ih) * imageScale;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;

  CTX.fillStyle = bgColor;
  CTX.fillRect(0, 0, cw, ch);
  CTX.drawImage(img, dx, dy, dw, dh);
}

function frameUrl(n) {
  return `frames/frame_${String(n).padStart(4, "0")}.webp`;
}

function loadImage(n) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = frameUrl(n);
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
}

async function preloadFrames() {
  const jobs = [];
  for (let i = 1; i <= FRAME_COUNT; i += 1) {
    jobs.push(
      loadImage(i).then((img) => {
        frames[i - 1] = img;
      })
    );
  }

  await Promise.all(jobs);
  drawFrame(0);
}

function getScrollProgress() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (maxScroll <= 0) return 0;
  return Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
}

function renderFromScroll() {
  const progress = getScrollProgress();
  const nextFrame = Math.min(Math.floor(progress * (FRAME_COUNT - 1)), FRAME_COUNT - 1);
  if (nextFrame !== currentFrame) {
    currentFrame = nextFrame;
    drawFrame(currentFrame);
  }
}

async function init() {
  resizeCanvas();
  window.addEventListener("resize", () => {
    resizeCanvas();
    renderFromScroll();
  });

  await preloadFrames();
  renderFromScroll();

  window.addEventListener("scroll", renderFromScroll, { passive: true });
}

init();
