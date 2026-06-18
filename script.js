const aboutModal = document.getElementById("about-modal");
const openAboutButton = document.querySelector("[data-open-about]");
const closeAboutButton = document.querySelector("[data-close-about]");
const heroArt = document.querySelector(".hero-art");
const heroStackVideo = document.querySelector("[data-hero-stack-video]");
const heroStackCanvas = document.querySelector("[data-hero-stack-canvas]");
const heroFallbackImage = document.querySelector("[data-hero-fallback]");

const isApplePlatform = () => {
  const userAgent = navigator.userAgent;
  const isAppleMobile = /iPad|iPhone|iPod/.test(userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAppleDesktop = /Mac/.test(navigator.platform);

  return isAppleMobile || isAppleDesktop;
};

if (heroArt && heroFallbackImage && isApplePlatform()) {
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
    const frameBuffer = document.createElement("canvas");
    const frameBufferCtx = frameBuffer.getContext("2d", { willReadFrequently: true });

    if (ctx && frameBufferCtx) {
      let stackReady = false;
      let hasMaskedPlayback = false;
      let frameId = 0;

      const resizeCanvas = () => {
        const sourceWidth = heroStackVideo.videoWidth || 1;
        const sourceHeight = heroStackVideo.videoHeight || 1;
        const visibleWidth = sourceWidth / 2;
        const aspectRatio = visibleWidth / sourceHeight;
        const containerWidth = heroArt.getBoundingClientRect().width || 1;
        const maxHeight = window.innerWidth <= 720 ? window.innerHeight * 0.32 : window.innerHeight * 0.42;
        let displayWidth = containerWidth;
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
          frameBuffer.width = width * 2;
          frameBuffer.height = height;
        }

        heroStackCanvas.style.width = `${displayWidth}px`;
        heroStackCanvas.style.height = `${displayHeight}px`;
      };

      const renderMaskedFrame = () => {
        if (!hasMaskedPlayback) {
          return;
        }

        if (!heroStackVideo.paused) {
          frameBufferCtx.drawImage(heroStackVideo, 0, 0, frameBuffer.width, frameBuffer.height);

          const width = heroStackCanvas.width;
          const height = heroStackCanvas.height;
          const colorFrame = frameBufferCtx.getImageData(0, 0, width, height);
          const maskFrame = frameBufferCtx.getImageData(width, 0, width, height);
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
