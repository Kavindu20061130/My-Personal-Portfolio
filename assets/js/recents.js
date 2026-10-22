
(() => {
  "use strict";

  // ==========================================
  // ELEMENTS
  // ==========================================

  const viewer = document.getElementById("recentsViewer");
  const stage = document.getElementById("recentsCanvas");
  const counter = document.getElementById("recentsCount");
  const progress = document.getElementById("recentsProgress");

  if (!viewer || !stage) return;

  // ==========================================
  // SETTINGS
  // ==========================================

  const FOLDER = "./assets/images/images2/";
  const EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif"];

  const MAX_PHOTOS = 200;
  const AUTO_INTERVAL = 4000;
  const IDLE_DELAY = 3000;

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let photos = [];
  let cards = [];

  let position = 0;
  let target = 0;

  let paused = reducedMotion;
  let interacting = false;

  let lastInteraction = performance.now();
  let lastAuto = performance.now();
  let lastFrame = 0;

  let touchStartX = null;
  let touchStartPosition = 0;
  let touchMoved = false;
  let suppressClickUntil = 0;

  // ==========================================
  // LOADING ANIMATION
  // ==========================================

  const loadingStyle = document.createElement("style");

  loadingStyle.textContent = `
    .recents-loading {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 22px;
      background: transparent;
      z-index: 100;
      transition: opacity 0.4s ease;
    }

    .recents-loading-spinner {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: 4px solid rgba(255, 193, 7, 0.12);
      border-top-color: #ffc107;
      border-right-color: #ffc107;
      animation: recentsSpin 0.9s linear infinite;
    }

    .recents-loading-text {
      color: #e8eaff;
      font-size: 15px;
      font-weight: 500;
      letter-spacing: 1px;
      text-align: center;
      animation: recentsPulse 1.8s ease-in-out infinite;
    }

    @keyframes recentsSpin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes recentsPulse {
      0%, 100% {
        opacity: 0.5;
      }

      50% {
        opacity: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .recents-loading-spinner,
      .recents-loading-text {
        animation: none;
      }
    }
  `;

  document.head.appendChild(loadingStyle);

  function showLoading() {
    stage.innerHTML = `
      <div class="recents-loading" role="status"
           aria-label="Loading recent photos">
        <div class="recents-loading-spinner"></div>
        <div class="recents-loading-text">
          Loading moments...
        </div>
      </div>
    `;
  }

  function hideLoading() {
    const loader = stage.querySelector(".recents-loading");

    if (loader) {
      loader.remove();
    }
  }

  // ==========================================
  // HIDE SECTION WHEN EMPTY
  // ==========================================

  function hideEmptyGallery() {
    const section = viewer.closest("section");

    if (section) {
      section.style.display = "none";
    } else {
      viewer.style.display = "none";
    }
  }

  // ==========================================
  // IMAGE DISCOVERY
  // ==========================================

  function imageExists(url) {
    return new Promise(resolve => {
      const image = new Image();

      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);

      image.src = url;
    });
  }

  async function discoverImages() {
    const images = [];

    for (let number = 1; number <= MAX_PHOTOS; number++) {
      let found = null;

      for (const extension of EXTENSIONS) {
        const url = `${FOLDER}${number}.${extension}`;

        if (await imageExists(url)) {
          found = url;
          break;
        }
      }

      // Stop when the next numbered photo is missing.
      if (!found) break;

      images.push(found);
    }

    return images;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function wrap(value, length) {
    return ((value % length) + length) % length;
  }

  function nearestDistance(index, current, length) {
    let distance = index - wrap(current, length);

    if (distance > length / 2) {
      distance -= length;
    }

    if (distance < -length / 2) {
      distance += length;
    }

    return distance;
  }

  function getSpacing() {
    const width = stage.clientWidth;

    if (width < 480) return width * 0.38;
    if (width < 768) return width * 0.32;

    return Math.min(width * 0.24, 250);
  }

  function markInteraction() {
    lastInteraction = performance.now();
    lastAuto = lastInteraction;
  }

  // ==========================================
  // RESPONSIVE IMAGE SIZES
  // ==========================================

  function updateCardDimensions(card) {
    const ratio = Number(card.dataset.ratio) || 0.75;
    const width = stage.clientWidth;

    const maxHeight =
      width < 480 ? 280 :
      width < 768 ? 350 : 430;

    const maxWidth =
      width < 480 ? 215 :
      width < 768 ? 285 : 350;

    let cardWidth;
    let cardHeight;

    if (ratio >= 1) {
      cardWidth = maxWidth;
      cardHeight = cardWidth / ratio;

      if (cardHeight > maxHeight) {
        cardHeight = maxHeight;
        cardWidth = cardHeight * ratio;
      }
    } else {
      cardHeight = maxHeight;
      cardWidth = cardHeight * ratio;

      if (cardWidth > maxWidth) {
        cardWidth = maxWidth;
        cardHeight = cardWidth / ratio;
      }
    }

    card.style.width = `${cardWidth}px`;
    card.style.height = `${cardHeight}px`;
  }

  function updateAllDimensions() {
    cards.forEach(updateCardDimensions);
  }

  // ==========================================
  // NAVIGATION
  // ==========================================

  function moveTo(newPosition) {
    if (photos.length < 2) return;

    target = newPosition;
    markInteraction();
  }

  function nextPhoto() {
    moveTo(Math.round(target) + 1);
  }

  function previousPhoto() {
    moveTo(Math.round(target) - 1);
  }

  function selectPhoto(index) {
    if (photos.length < 2) return;

    const current = Math.round(target);

    const distance = nearestDistance(
      index,
      current,
      photos.length
    );

    if (distance === 0) {
      nextPhoto();
    } else {
      moveTo(current + distance);
    }
  }

  // ==========================================
  // BUILD GALLERY
  // ==========================================

  function buildGallery(images) {
    photos = images;
    cards = [];

    hideLoading();

    stage.innerHTML = "";

    if (progress) {
      progress.innerHTML = "";
    }

    // No error message or empty container.
    if (!photos.length) {
      hideEmptyGallery();
      return;
    }

    photos.forEach((src, index) => {
      const card = document.createElement("div");

      card.className = "recents-film-card";

      Object.assign(card.style, {
        position: "absolute",
        left: "50%",
        top: "50%",
        margin: "0",
        padding: "0",
        transformOrigin: "center center",
        transition: "none",
        willChange: "transform",
        backfaceVisibility: "hidden",
        overflow: "hidden",
        opacity: "1",
        visibility: "visible",
        cursor: "pointer",
        pointerEvents: "auto"
      });

      const image = document.createElement("img");

      image.src = src;
      image.alt = `Recent photo ${index + 1}`;
      image.draggable = false;
      image.loading = index < 5 ? "eager" : "lazy";

      Object.assign(image.style, {
        width: "100%",
        height: "100%",
        display: "block",
        objectFit: "contain",
        objectPosition: "center",
        pointerEvents: "none"
      });

      image.addEventListener("load", () => {
        const ratio =
          image.naturalWidth / image.naturalHeight;

        card.dataset.ratio = ratio;

        updateCardDimensions(card);
      });

      card.appendChild(image);

      // Click photos to navigate.
      card.addEventListener("click", () => {
        if (performance.now() < suppressClickUntil) {
          return;
        }

        selectPhoto(index);
      });

      stage.appendChild(card);
      cards.push(card);

      // Optional progress indicators.
      if (progress) {
        const dot = document.createElement("button");

        dot.type = "button";

        dot.setAttribute(
          "aria-label",
          `Show photo ${index + 1}`
        );

        dot.addEventListener("click", () => {
          const current = Math.round(target);

          moveTo(
            current +
            nearestDistance(
              index,
              current,
              photos.length
            )
          );
        });

        progress.appendChild(dot);
      }
    });

    updateAllDimensions();
    render();

    requestAnimationFrame(animate);
  }

  // ==========================================
  // CINEMATIC 3D POSITIONING
  // ==========================================

  function render() {
    if (!cards.length) return;

    const count = cards.length;
    const spacing = getSpacing();

    cards.forEach((card, index) => {
      const distance = nearestDistance(
        index,
        position,
        count
      );

      const absolute = Math.abs(distance);

      const scale = Math.max(
        0.58,
        1 - absolute * 0.16
      );

      const x = distance * spacing;
      const z = -absolute * 90;

      const rotation = clamp(
        -distance * 12,
        -32,
        32
      );

      const y = absolute * 7;

      card.style.transform = `
        translate(-50%, -50%)
        translate3d(${x}px, ${y}px, ${z}px)
        rotateY(${rotation}deg)
        scale(${scale})
      `;

      card.style.zIndex = String(
        1000 - Math.round(absolute * 100)
      );

      card.style.opacity = "1";
      card.style.visibility = "visible";

      card.style.filter = `brightness(${
        Math.max(0.72, 1 - absolute * 0.09)
      })`;

      const active = absolute < 0.5;

      card.classList.toggle("is-active", active);
      card.classList.remove("is-hidden");

      card.setAttribute(
        "aria-hidden",
        active ? "false" : "true"
      );
    });

    const activeIndex = wrap(
      Math.round(position),
      count
    );

    if (counter) {
      counter.textContent =
        `${String(activeIndex + 1).padStart(2, "0")} / ` +
        `${String(count).padStart(2, "0")}`;
    }

    if (progress) {
      [...progress.children].forEach((dot, index) => {
        dot.classList.toggle(
          "current",
          index === activeIndex
        );
      });
    }
  }

  // ==========================================
  // SMOOTH ANIMATION
  // ==========================================

  function animate(now) {
    if (!cards.length) return;

    const delta = lastFrame
      ? Math.min(now - lastFrame, 64)
      : 16.67;

    lastFrame = now;

    const smoothing = reducedMotion
      ? 1
      : 1 - Math.pow(0.82, delta / 16.67);

    position += (target - position) * smoothing;

    if (Math.abs(target - position) < 0.0005) {
      position = target;
    }

    if (
      Math.abs(position) > photos.length * 100 &&
      Math.abs(target - position) < 0.001
    ) {
      const cycles = Math.trunc(
        position / photos.length
      );

      position -= cycles * photos.length;
      target -= cycles * photos.length;
    }

    render();

    // Autoplay when user is idle.
    if (
      !paused &&
      !interacting &&
      photos.length > 1 &&
      !document.hidden &&
      now - lastInteraction > IDLE_DELAY &&
      now - lastAuto > AUTO_INTERVAL
    ) {
      target = Math.round(target) + 1;
      lastAuto = now;
    }

    requestAnimationFrame(animate);
  }

  // ==========================================
  // MOUSE INTERACTION
  // ==========================================

  viewer.addEventListener("pointermove", event => {
    if (event.pointerType !== "mouse") return;
    if (photos.length < 2) return;

    const rect = stage.getBoundingClientRect();

    if (
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      return;
    }

    const relativeX = clamp(
      (event.clientX - rect.left) / rect.width,
      0,
      1
    );

    // Right cursor moves photos left.
    // Left cursor moves photos right.
    const movement = (relativeX - 0.5) * 0.085;

    target += movement;

    interacting = true;
    markInteraction();
  });

  viewer.addEventListener("pointerleave", () => {
    interacting = false;
    markInteraction();
  });

  // ==========================================
  // MOBILE TOUCH SWIPING
  // ==========================================

  stage.addEventListener(
    "touchstart",
    event => {
      if (photos.length < 2) return;

      touchStartX = event.touches[0].clientX;
      touchStartPosition = target;
      touchMoved = false;
      interacting = true;

      markInteraction();
    },
    { passive: true }
  );

  stage.addEventListener(
    "touchmove",
    event => {
      if (touchStartX === null) return;

      const currentX = event.touches[0].clientX;
      const difference = currentX - touchStartX;

      if (Math.abs(difference) > 8) {
        touchMoved = true;
      }

      target =
        touchStartPosition -
        difference / getSpacing();

      markInteraction();
    },
    { passive: true }
  );

  stage.addEventListener(
    "touchend",
    () => {
      if (touchStartX === null) return;

      if (touchMoved) {
        target = Math.round(target);

        suppressClickUntil =
          performance.now() + 350;
      }

      touchStartX = null;
      interacting = false;

      markInteraction();
    },
    { passive: true }
  );

  stage.addEventListener(
    "touchcancel",
    () => {
      touchStartX = null;
      target = Math.round(target);
      interacting = false;
      touchMoved = false;

      markInteraction();
    },
    { passive: true }
  );

  // ==========================================
  // OPTIONAL BUTTON SUPPORT
  // ==========================================

  const prevBtn = document.getElementById("recentsPrev");
  const nextBtn = document.getElementById("recentsNext");
  const pauseBtn = document.getElementById("recentsPause");

  if (prevBtn) {
    prevBtn.addEventListener("click", previousPhoto);
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", nextPhoto);
  }

  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      paused = !paused;

      pauseBtn.innerHTML = paused
        ? '<i class="fas fa-play"></i>'
        : '<i class="fas fa-pause"></i>';

      pauseBtn.setAttribute(
        "aria-label",
        paused ? "Play slideshow" : "Pause slideshow"
      );
    });
  }

  // Hide arrow and pause buttons.
  const actions = viewer.querySelector(
    ".recents-actions"
  );

  if (actions) {
    actions.style.display = "none";
  }

  // ==========================================
  // KEYBOARD NAVIGATION
  // ==========================================

  viewer.setAttribute("tabindex", "0");

  viewer.addEventListener("keydown", event => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      nextPhoto();
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      previousPhoto();
    }
  });

  // ==========================================
  // RESPONSIVE RESIZING
  // ==========================================

  window.addEventListener("resize", () => {
    updateAllDimensions();
    render();
  });

  // ==========================================
  // INITIALIZATION
  // ==========================================

  stage.style.position = "relative";
  stage.style.overflow = "hidden";
  stage.style.perspective = "1200px";
  stage.style.transformStyle = "preserve-3d";
  stage.style.touchAction = "pan-y";

  // Display loading animation immediately.
  showLoading();

  // Discover photos and build gallery.
  discoverImages()
    .then(buildGallery)
    .catch(error => {
      console.error("Recents gallery error:", error);

      hideLoading();
      hideEmptyGallery();
    });

})();
