/* ============================================================
   Testvéri Szövetség – Video Hero + Normal Website
   ============================================================ */

(function () {
  "use strict";

  const FRAME_COUNT = parseInt(document.body.dataset.frameCount || "122", 10);
  const IMAGE_SCALE = 0.86;

  /* DOM */
  const loader = document.getElementById("loader");
  const loaderBar = document.getElementById("loader-bar");
  const loaderPercent = document.getElementById("loader-percent");
  const heroOverlay = document.getElementById("hero-overlay");
  const canvasWrap = document.getElementById("canvas-wrap");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const scrollTrack = document.getElementById("scroll-track");
  const mainContent = document.getElementById("main-content");
  const header = document.getElementById("site-header");

  /* State */
  const frames = new Array(FRAME_COUNT);
  let currentFrame = -1;
  let bgColor = "#ffffff";

  /* ============================================================
     CANVAS
     ============================================================ */
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    if (currentFrame >= 0) drawFrame(currentFrame);
  }

  function frameUrl(n) {
    return "frames/frame_" + String(n).padStart(4, "0") + ".webp";
  }

  function loadImage(n) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.decoding = "async";
      img.src = frameUrl(n);
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
    });
  }

  function sampleBgColor(img) {
    var mini = document.createElement("canvas");
    mini.width = 8; mini.height = 8;
    var mctx = mini.getContext("2d", { willReadFrequently: true });
    mctx.drawImage(img, 0, 0, 8, 8);
    var corners = [
      mctx.getImageData(0, 0, 1, 1).data,
      mctx.getImageData(7, 0, 1, 1).data,
      mctx.getImageData(0, 7, 1, 1).data,
      mctx.getImageData(7, 7, 1, 1).data,
    ];
    var avg = corners.reduce(function (a, c) {
      return [a[0] + c[0], a[1] + c[1], a[2] + c[2]];
    }, [0, 0, 0]);
    return "rgb(" + Math.round(avg[0] / 4) + "," + Math.round(avg[1] / 4) + "," + Math.round(avg[2] / 4) + ")";
  }

  function drawFrame(index) {
    var img = frames[index];
    if (!img || !img.naturalWidth) return;
    if (index % 20 === 0 || index === 0) bgColor = sampleBgColor(img);

    var cw = window.innerWidth, ch = window.innerHeight;
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
    var dw = iw * scale, dh = ih * scale;
    var dx = (cw - dw) / 2, dy = (ch - dh) / 2;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  /* ============================================================
     PRELOADER
     ============================================================ */
  async function preloadFrames() {
    var loaded = 0;
    function tick() {
      loaded++;
      var pct = Math.round((loaded / FRAME_COUNT) * 100);
      loaderBar.style.width = pct + "%";
      loaderPercent.textContent = pct + "%";
    }

    // Phase 1: first 10
    var p1 = [];
    for (var i = 1; i <= Math.min(10, FRAME_COUNT); i++) {
      (function (idx) {
        p1.push(loadImage(idx).then(function (img) { frames[idx - 1] = img; tick(); }));
      })(i);
    }
    await Promise.all(p1);
    currentFrame = 0;
    drawFrame(0);

    // Phase 2: rest
    var p2 = [];
    for (var j = 11; j <= FRAME_COUNT; j++) {
      (function (idx) {
        p2.push(loadImage(idx).then(function (img) { frames[idx - 1] = img; tick(); }));
      })(j);
    }
    await Promise.all(p2);
  }

  /* ============================================================
     LENIS SMOOTH SCROLL
     ============================================================ */
  function initLenis() {
    var lenis = new Lenis({
      duration: 1.2,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    return lenis;
  }

  /* ============================================================
     HERO ENTRANCE
     ============================================================ */
  function animateHeroEntrance() {
    var tl = gsap.timeline({ delay: 0.3 });
    tl.to(".hero-word", {
      y: 0, opacity: 1, duration: 1.0, stagger: 0.15, ease: "power3.out",
    });
    tl.to(".hero-sub", {
      y: 0, opacity: 1, duration: 0.8, ease: "power3.out",
    }, "-=0.5");
  }

  /* ============================================================
     SCROLL → VIDEO + HERO FADE + CANVAS FADE
     ============================================================ */
  function initScrollVideo() {
    // Frame playback driven by scroll
    ScrollTrigger.create({
      trigger: scrollTrack,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: function (self) {
        var p = self.progress;

        // Frame index (play all frames evenly across the entire scroll track)
        var frameProgress = p;
        var index = Math.min(Math.floor(frameProgress * FRAME_COUNT), FRAME_COUNT - 1);
        if (index !== currentFrame) {
          currentFrame = index;
          requestAnimationFrame(function () { drawFrame(currentFrame); });
        }

        // Hero text fades out quickly
        var heroOpacity = Math.max(0, 1 - p * 3);
        heroOverlay.style.opacity = heroOpacity;
        if (heroOpacity <= 0) {
          heroOverlay.style.visibility = "hidden";
        } else {
          heroOverlay.style.visibility = "visible";
        }

        // Header style: dark during video, light after
        if (p > 0.6) {
          header.classList.add("scrolled-past");
        } else {
          header.classList.remove("scrolled-past");
        }
      },
    });
  }

  /* ============================================================
     CONTENT SECTION REVEAL ANIMATIONS
     ============================================================ */
  function initContentAnimations() {
    // Reveal elements with IntersectionObserver + GSAP
    var revealEls = mainContent.querySelectorAll(
      ".section-badge, .section-title, .section-text, .features-grid, .stats-row, .events-grid, .speakers-grid, .cta-row, .big-quote, .quote-cite"
    );

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          gsap.to(entry.target, {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            delay: parseFloat(entry.target.dataset.delay || "0"),
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    revealEls.forEach(function (el, i) {
      // Small stagger within each section
      var section = el.closest(".content-section, .quote-section");
      if (section) {
        var siblings = Array.from(section.querySelectorAll(
          ".section-badge, .section-title, .section-text, .features-grid, .stats-row, .events-grid, .speakers-grid, .cta-row, .big-quote, .quote-cite"
        ));
        var idx = siblings.indexOf(el);
        el.dataset.delay = String(idx * 0.1);
      }
      observer.observe(el);
    });
  }

  /* ============================================================
     COUNTER ANIMATIONS
     ============================================================ */
  function initCounters() {
    var statNums = document.querySelectorAll(".stat-num[data-target]");
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var target = parseInt(el.dataset.target, 10);
          var obj = { val: 0 };
          gsap.to(obj, {
            val: target,
            duration: 2,
            ease: "power1.out",
            onUpdate: function () {
              el.textContent = Math.round(obj.val);
            },
          });
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    statNums.forEach(function (el) { observer.observe(el); });
  }

  /* ============================================================
     INIT
     ============================================================ */
  async function init() {
    gsap.registerPlugin(ScrollTrigger);

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    await preloadFrames();
    loader.classList.add("loaded");

    initLenis();
    animateHeroEntrance();
    initScrollVideo();
    initContentAnimations();
    initCounters();
  }

  init();
})();
