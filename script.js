const aboutModal = document.getElementById("about-modal");
const openAboutButton = document.querySelector("[data-open-about]");
const closeAboutButton = document.querySelector("[data-close-about]");
const heroArt = document.querySelector(".hero-art");
const heroVideo = document.querySelector("[data-hero-video]");
const heroCanvas = document.querySelector("[data-hero-canvas]");

const shouldUseVideoKeying = () => {
  const userAgent = navigator.userAgent;
  const isAppleMobile = /iPad|iPhone|iPod/.test(userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS/i.test(userAgent);

  return isAppleMobile && isSafari;
};

if (heroArt && heroVideo && heroCanvas && shouldUseVideoKeying()) {
  const ctx = heroCanvas.getContext("2d", { willReadFrequently: true });

  if (ctx) {
    let frameId = 0;
    let hasStarted = false;

    const resizeCanvas = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(heroVideo.clientWidth * ratio));
      const height = Math.max(1, Math.round(heroVideo.clientHeight * ratio));

      if (heroCanvas.width !== width || heroCanvas.height !== height) {
        heroCanvas.width = width;
        heroCanvas.height = height;
      }
    };

    const renderFrame = () => {
      if (heroVideo.paused || heroVideo.ended || !heroCanvas.width || !heroCanvas.height) {
        frameId = requestAnimationFrame(renderFrame);
        return;
      }

      ctx.drawImage(heroVideo, 0, 0, heroCanvas.width, heroCanvas.height);

      const frame = ctx.getImageData(0, 0, heroCanvas.width, heroCanvas.height);
      const data = frame.data;

      for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const maxChannel = Math.max(red, green, blue);

        if (maxChannel <= 16) {
          data[index + 3] = 0;
          continue;
        }

        if (maxChannel < 54) {
          data[index + 3] = Math.round(((maxChannel - 16) / 38) * 255);
        }
      }

      ctx.putImageData(frame, 0, 0);
      frameId = requestAnimationFrame(renderFrame);
    };

    const startKeyedPlayback = async () => {
      if (hasStarted) {
        return;
      }

      hasStarted = true;
      heroArt.classList.add("is-keyed");
      heroCanvas.hidden = false;
      resizeCanvas();

      try {
        await heroVideo.play();
      } catch (_error) {
        // iOS may defer autoplay until the element is ready; keep the canvas path active.
      }

      cancelAnimationFrame(frameId);
      renderFrame();
    };

    heroVideo.addEventListener("loadedmetadata", startKeyedPlayback, { once: true });
    heroVideo.addEventListener("loadeddata", startKeyedPlayback, { once: true });
    window.addEventListener("resize", resizeCanvas);

    if (heroVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      startKeyedPlayback();
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
