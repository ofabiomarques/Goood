const aboutModal = document.getElementById("about-modal");
const openAboutButton = document.querySelector("[data-open-about]");
const closeAboutButton = document.querySelector("[data-close-about]");
const preloader = document.querySelector("[data-preloader]");
const heroArt = document.querySelector(".hero-art");
const heroVideo = document.querySelector("[data-hero-video]");
const heroStackVideo = document.querySelector("[data-hero-stack-video]");
const heroStackCanvas = document.querySelector("[data-hero-stack-canvas]");
const heroFallbackImage = document.querySelector("[data-hero-fallback]");

const shouldUseMaskedVideoWorkaround = () => {
  const userAgent = navigator.userAgent;
  const isAppleMobile = /iPad|iPhone|iPod/.test(userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAppleDesktop = /Mac/.test(navigator.platform);
  const isApplePlatform = isAppleMobile || isAppleDesktop;
  const isSafari = /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|Edg|EdgiOS|Firefox|FxiOS/i.test(userAgent);
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    || window.matchMedia("(pointer: coarse)").matches;

  return isMobileDevice || (isApplePlatform && isSafari);
};

if (preloader) {
  const shouldUseMaskedVideo = shouldUseMaskedVideoWorkaround();
  const activeHeroMedia = shouldUseMaskedVideo ? heroStackVideo : heroVideo;
  const minimumLoaderTime = 850;
  const startedAt = performance.now();
  let pageLoaded = document.readyState === "complete";
  let mediaReady = !activeHeroMedia;
  let preloaderDismissed = false;

  const dismissPreloader = () => {
    if (preloaderDismissed || !pageLoaded || !mediaReady) {
      return;
    }

    preloaderDismissed = true;
    const elapsed = performance.now() - startedAt;
    const waitTime = Math.max(0, minimumLoaderTime - elapsed);

    window.setTimeout(() => {
      document.body.classList.remove("is-loading");
      preloader.classList.add("is-hidden");

      window.setTimeout(() => {
        preloader.hidden = true;
      }, 560);
    }, waitTime);
  };

  const markMediaReady = () => {
    mediaReady = true;
    dismissPreloader();
  };

  const markPageLoaded = () => {
    pageLoaded = true;
    dismissPreloader();
  };

  if (activeHeroMedia?.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    mediaReady = true;
  } else if (activeHeroMedia) {
    activeHeroMedia.addEventListener("loadeddata", markMediaReady, { once: true });
    activeHeroMedia.addEventListener("error", markMediaReady, { once: true });
  }

  if (!pageLoaded) {
    window.addEventListener("load", markPageLoaded, { once: true });
  }

  window.setTimeout(() => {
    mediaReady = true;
    pageLoaded = true;
    dismissPreloader();
  }, 3200);

  dismissPreloader();
}

if (heroArt && heroFallbackImage && shouldUseMaskedVideoWorkaround()) {
  const showStaticFallback = () => {
    heroArt.classList.remove("is-masked");
    heroArt.classList.add("is-static");
    heroFallbackImage.hidden = false;

    if (heroStackCanvas) {
      heroStackCanvas.hidden = true;
    }
  };

  showStaticFallback();

  if (heroStackVideo && heroStackCanvas) {
    const ctx = heroStackCanvas.getContext("2d", { willReadFrequently: true });
    const colorBuffer = document.createElement("canvas");
    const maskBuffer = document.createElement("canvas");
    const probeBuffer = document.createElement("canvas");
    const colorBufferCtx = colorBuffer.getContext("2d", { willReadFrequently: true });
    const maskBufferCtx = maskBuffer.getContext("2d", { willReadFrequently: true });
    const probeBufferCtx = probeBuffer.getContext("2d", { willReadFrequently: true });

    if (ctx && colorBufferCtx && maskBufferCtx && probeBufferCtx) {
      let stackReady = false;
      let hasMaskedPlayback = false;
      let frameId = 0;
      let maskBounds = null;

      const updateMaskBounds = () => {
        const sourceWidth = heroStackVideo.videoWidth || 0;
        const sourceHeight = heroStackVideo.videoHeight || 0;

        if (!sourceWidth || !sourceHeight) {
          return;
        }

        const halfWidth = Math.floor(sourceWidth / 2);
        probeBuffer.width = sourceWidth;
        probeBuffer.height = sourceHeight;
        probeBufferCtx.drawImage(heroStackVideo, 0, 0, sourceWidth, sourceHeight);

        const maskFrame = probeBufferCtx.getImageData(halfWidth, 0, halfWidth, sourceHeight);
        const maskData = maskFrame.data;
        let minX = halfWidth;
        let minY = sourceHeight;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < sourceHeight; y += 1) {
          for (let x = 0; x < halfWidth; x += 1) {
            const index = (y * halfWidth + x) * 4;
            const alpha = (maskData[index] + maskData[index + 1] + maskData[index + 2]) / 3;

            if (alpha > 8) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX >= minX && maxY >= minY) {
          const paddingX = Math.round((maxX - minX + 1) * 0.24);
          const paddingY = Math.round((maxY - minY + 1) * 0.18);
          const cropX = Math.max(0, minX - paddingX);
          const cropY = Math.max(0, minY - paddingY);
          const cropWidth = Math.min(halfWidth - cropX, maxX - minX + 1 + (paddingX * 2));
          const cropHeight = Math.min(sourceHeight - cropY, maxY - minY + 1 + (paddingY * 2));

          maskBounds = {
            x: cropX,
            y: cropY,
            width: cropWidth,
            height: cropHeight,
          };
        } else {
          maskBounds = {
            x: 0,
            y: 0,
            width: halfWidth,
            height: sourceHeight,
          };
        }
      };

      const resizeCanvas = () => {
        const sourceWidth = heroStackVideo.videoWidth || 1;
        const sourceHeight = heroStackVideo.videoHeight || 1;
        const visibleWidth = sourceWidth / 2;
        const aspectRatio = maskBounds
          ? maskBounds.width / maskBounds.height
          : visibleWidth / sourceHeight;
        const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const containerWidth = heroArt.getBoundingClientRect().width || 1;
        const maxWidth = window.innerWidth <= 720
          ? Math.min(containerWidth, 22 * rootFontSize)
          : Math.min(containerWidth, 44.95 * rootFontSize, window.innerHeight * 0.62);
        const maxHeight = window.innerWidth <= 720 ? window.innerHeight * 0.32 : window.innerHeight * 0.42;
        let displayWidth = maxWidth;
        let displayHeight = displayWidth / aspectRatio;

        if (displayHeight > maxHeight) {
          displayHeight = maxHeight;
          displayWidth = displayHeight * aspectRatio;
        }

        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(displayWidth * ratio));
        const height = Math.max(1, Math.round(displayHeight * ratio));

        if (heroStackCanvas.width !== width || heroStackCanvas.height !== height) {
          heroStackCanvas.width = width;
          heroStackCanvas.height = height;
          colorBuffer.width = width;
          colorBuffer.height = height;
          maskBuffer.width = width;
          maskBuffer.height = height;
        }

        heroStackCanvas.style.width = `${displayWidth}px`;
        heroStackCanvas.style.height = `${displayHeight}px`;
      };

      const renderMaskedFrame = () => {
        if (!hasMaskedPlayback) {
          return;
        }

        if (!heroStackVideo.paused) {
          const width = heroStackCanvas.width;
          const height = heroStackCanvas.height;
          const sourceWidth = heroStackVideo.videoWidth || 2;
          const sourceHeight = heroStackVideo.videoHeight || 1;
          const halfWidth = Math.floor(sourceWidth / 2);
          const bounds = maskBounds || {
            x: 0,
            y: 0,
            width: halfWidth,
            height: sourceHeight,
          };

          colorBufferCtx.clearRect(0, 0, width, height);
          maskBufferCtx.clearRect(0, 0, width, height);

          colorBufferCtx.drawImage(
            heroStackVideo,
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height,
            0,
            0,
            width,
            height,
          );

          maskBufferCtx.drawImage(
            heroStackVideo,
            halfWidth + bounds.x,
            bounds.y,
            bounds.width,
            bounds.height,
            0,
            0,
            width,
            height,
          );

          const colorFrame = colorBufferCtx.getImageData(0, 0, width, height);
          const maskFrame = maskBufferCtx.getImageData(0, 0, width, height);
          const colorData = colorFrame.data;
          const maskData = maskFrame.data;

          for (let index = 0; index < colorData.length; index += 4) {
            const alpha = Math.round((maskData[index] + maskData[index + 1] + maskData[index + 2]) / 3);
            colorData[index + 3] = alpha;
          }

          ctx.putImageData(colorFrame, 0, 0);
        }

        frameId = requestAnimationFrame(renderMaskedFrame);
      };

      const startMaskedPlayback = async () => {
        if (!stackReady || hasMaskedPlayback) {
          return;
        }

        hasMaskedPlayback = true;
        updateMaskBounds();
        resizeCanvas();
        heroArt.classList.remove("is-static");
        heroArt.classList.add("is-masked");
        heroFallbackImage.hidden = true;
        heroStackCanvas.hidden = false;

        try {
          await heroStackVideo.play();
        } catch (_error) {
          hasMaskedPlayback = false;
          showStaticFallback();
          return;
        }

        cancelAnimationFrame(frameId);
        renderMaskedFrame();
      };

      heroStackVideo.addEventListener("loadeddata", () => {
        stackReady = true;
        startMaskedPlayback();
      });

      heroStackVideo.addEventListener("error", showStaticFallback);
      window.addEventListener("resize", resizeCanvas);

      if (heroStackVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        stackReady = true;
      }

      startMaskedPlayback();
    }
  }
}

if (aboutModal && openAboutButton && closeAboutButton) {
  const openAboutModal = () => {
    aboutModal.hidden = false;
    document.body.classList.add("modal-open");
    openAboutButton.setAttribute("aria-expanded", "true");
    closeAboutButton.focus();
  };

  const closeAboutModal = () => {
    aboutModal.hidden = true;
    document.body.classList.remove("modal-open");
    openAboutButton.setAttribute("aria-expanded", "false");
    openAboutButton.focus();
  };

  openAboutButton.addEventListener("click", openAboutModal);
  closeAboutButton.addEventListener("click", closeAboutModal);

  aboutModal.addEventListener("click", (event) => {
    if (event.target === aboutModal) {
      closeAboutModal();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !aboutModal.hidden) {
      closeAboutModal();
    }
  });
}
