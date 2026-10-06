/* ============================================================
   Testveri Szovetseg - Video Hero + Normal Website
   ============================================================ */

(function () {
  "use strict";

  var FRAME_COUNT = parseInt(document.body.dataset.frameCount || "122", 10);
  var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  var loader = document.getElementById("loader");
  var loaderBar = document.getElementById("loader-bar");
  var loaderPercent = document.getElementById("loader-percent");
  var heroOverlay = document.getElementById("hero-overlay");
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d", { alpha: false });
  var mainContent = document.getElementById("main-content");
  var header = document.getElementById("site-header");

  var frames = new Array(FRAME_COUNT);
  var currentFrame = -1;
  var bgColor = "#ffffff";

  function prefersReducedMotion() {
    return reduceMotionQuery.matches;
  }

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function resizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth;
    var h = window.innerHeight;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    if (currentFrame >= 0) {
      drawFrame(currentFrame);
    }
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
    mini.width = 8;
    mini.height = 8;

    var mctx = mini.getContext("2d", { willReadFrequently: true });
    mctx.drawImage(img, 0, 0, 8, 8);

    var corners = [
      mctx.getImageData(0, 0, 1, 1).data,
      mctx.getImageData(7, 0, 1, 1).data,
      mctx.getImageData(0, 7, 1, 1).data,
      mctx.getImageData(7, 7, 1, 1).data,
    ];

    var avg = corners.reduce(function (acc, c) {
      return [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]];
    }, [0, 0, 0]);

    return "rgb(" + Math.round(avg[0] / 4) + "," + Math.round(avg[1] / 4) + "," + Math.round(avg[2] / 4) + ")";
  }

  function drawFrame(index) {
    var img = frames[index];
    if (!img || !img.naturalWidth) return;

    if (index % 20 === 0 || index === 0) {
      bgColor = sampleBgColor(img);
    }

    var cw = window.innerWidth;
    var ch = window.innerHeight;
    var iw = img.naturalWidth;
    var ih = img.naturalHeight;

    var scale = Math.max(cw / iw, ch / ih);
    var dw = iw * scale;
    var dh = ih * scale;
    var dx = (cw - dw) / 2;
    var dy = (ch - dh) / 2;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function setLoaderProgress(pct) {
    loaderBar.style.width = pct + "%";
    loaderPercent.textContent = pct + "%";
  }

  async function preloadFrames() {
    if (prefersReducedMotion()) {
      var first = await loadImage(1);
      frames[0] = first;
      currentFrame = 0;
      drawFrame(0);
      setLoaderProgress(100);
      return;
    }

    var loaded = 0;

    function tick() {
      loaded++;
      var pct = Math.round((loaded / FRAME_COUNT) * 100);
      setLoaderProgress(pct);
    }

    var firstBatch = [];
    var i;

    for (i = 1; i <= Math.min(10, FRAME_COUNT); i++) {
      (function (idx) {
        firstBatch.push(loadImage(idx).then(function (img) {
          frames[idx - 1] = img;
          tick();
        }));
      })(i);
    }

    await Promise.all(firstBatch);
    currentFrame = 0;
    drawFrame(0);

    var secondBatch = [];
    var j;

    for (j = 11; j <= FRAME_COUNT; j++) {
      (function (idx) {
        secondBatch.push(loadImage(idx).then(function (img) {
          frames[idx - 1] = img;
          tick();
        }));
      })(j);
    }

    await Promise.all(secondBatch);
  }

  function initLenis() {
    if (prefersReducedMotion()) {
      return null;
    }

    var lenis = new Lenis({
      duration: 1.2,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      smoothTouch: false,
    });

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return lenis;
  }

  function animateHeroEntrance() {
    if (prefersReducedMotion()) {
      gsap.set(".hero-kicker, .hero-word, .hero-sub", { y: 0, opacity: 1 });
      return;
    }

    var tl = gsap.timeline({ delay: 0.3 });

    tl.to(".hero-kicker", {
      y: 0,
      opacity: 1,
      duration: 0.7,
      ease: "power2.out",
    });

    tl.to(".hero-word", {
      y: 0,
      opacity: 1,
      duration: 1.0,
      stagger: 0.14,
      ease: "power3.out",
    }, "-=0.2");

    tl.to(".hero-sub", {
      y: 0,
      opacity: 1,
      duration: 0.75,
      ease: "power3.out",
    }, "-=0.5");
  }

  function initScrollVideo() {
    if (prefersReducedMotion()) {
      heroOverlay.style.opacity = "1";
      heroOverlay.style.visibility = "visible";
      header.classList.add("scrolled-past");
      return;
    }

    var videoSection = document.getElementById("video-section");
    var pinDuration = isMobile() ? "+=150%" : "+=200%";

    ScrollTrigger.create({
      trigger: videoSection,
      start: "top top",
      end: pinDuration,
      pin: true,
      scrub: true,
      onUpdate: function (self) {
        var p = self.progress;
        var index = Math.min(Math.floor(p * FRAME_COUNT), FRAME_COUNT - 1);

        if (index !== currentFrame) {
          currentFrame = index;
          requestAnimationFrame(function () {
            drawFrame(currentFrame);
          });
        }

        var heroOpacity = Math.max(0, 1 - p * 3.3);
        heroOverlay.style.opacity = String(heroOpacity);
        heroOverlay.style.visibility = heroOpacity <= 0 ? "hidden" : "visible";

        if (p > 0.8) {
          header.classList.add("scrolled-past");
        } else {
          header.classList.remove("scrolled-past");
        }
      },
    });
  }

  function initContentAnimations() {
    var revealEls = mainContent.querySelectorAll(
      ".section-badge, .section-title, .section-text, .features-grid, .stats-row, .events-grid, .speakers-grid, .cta-row, .big-quote, .quote-cite"
    );

    if (prefersReducedMotion()) {
      revealEls.forEach(function (el) {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        gsap.to(entry.target, {
          y: 0,
          opacity: 1,
          duration: 0.85,
          ease: "power3.out",
          delay: parseFloat(entry.target.dataset.delay || "0"),
        });

        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -30px 0px" });

    revealEls.forEach(function (el) {
      var section = el.closest(".content-section, .quote-section");

      if (section) {
        var siblings = Array.from(section.querySelectorAll(
          ".section-badge, .section-title, .section-text, .features-grid, .stats-row, .events-grid, .speakers-grid, .cta-row, .big-quote, .quote-cite"
        ));
        el.dataset.delay = String(Math.max(0, siblings.indexOf(el)) * 0.09);
      }

      observer.observe(el);
    });
  }

  function initCounters() {
    var statNums = document.querySelectorAll(".stat-num[data-target]");

    if (prefersReducedMotion()) {
      statNums.forEach(function (el) {
        el.textContent = el.dataset.target || "0";
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var el = entry.target;
        var target = parseInt(el.dataset.target, 10);
        var obj = { val: 0 };

        gsap.to(obj, {
          val: target,
          duration: 2,
          ease: "power1.out",
          onUpdate: function () {
            el.textContent = String(Math.round(obj.val));
          },
        });

        observer.unobserve(el);
      });
    }, { threshold: 0.5 });

    statNums.forEach(function (el) {
      observer.observe(el);
    });
  }

  function initMobileMenu() {
    var toggle = document.getElementById("menu-toggle");
    var links = document.querySelector(".header-links");

    if (!toggle || !links) return;

    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
      toggle.classList.toggle("active");
    });

    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.classList.remove("active");
      });
    });
  }

  var resizeTimer;
  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resizeCanvas();
      ScrollTrigger.refresh();
    }, 200);
  }

  async function init() {
    gsap.registerPlugin(ScrollTrigger);

    resizeCanvas();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", function () {
      setTimeout(function () {
        resizeCanvas();
        ScrollTrigger.refresh();
      }, 300);
    });

    await preloadFrames();
    loader.classList.add("loaded");

    initLenis();
    animateHeroEntrance();
    initScrollVideo();
    initContentAnimations();
    initCounters();
    initMobileMenu();
  }

  init();
})();
