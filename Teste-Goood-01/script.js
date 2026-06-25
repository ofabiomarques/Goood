document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");
    const target = targetId ? document.querySelector(targetId) : null;

    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
});

const heroVideo = document.querySelector(".hero-background");
const soundToggle = document.querySelector("[data-sound-toggle]");

if (heroVideo instanceof HTMLVideoElement && soundToggle) {
  let wantsSoundOn = true;

  const updateSoundUi = () => {
    soundToggle.setAttribute("aria-pressed", String(wantsSoundOn));
    soundToggle.setAttribute("aria-label", wantsSoundOn ? "Desativar som" : "Ativar som");
    soundToggle.classList.toggle("is-muted", !wantsSoundOn);
  };

  const playWithCurrentPreference = async () => {
    heroVideo.muted = !wantsSoundOn;
    heroVideo.volume = 1;

    try {
      await heroVideo.play();
      return true;
    } catch (_error) {
      return false;
    }
  };

  const syncPlaybackPreference = async () => {
    const started = await playWithCurrentPreference();

    if (!started && wantsSoundOn) {
      const retryOnGesture = async () => {
        const retryWorked = await playWithCurrentPreference();

        if (retryWorked) {
          window.removeEventListener("pointerdown", retryOnGesture);
          window.removeEventListener("keydown", retryOnGesture);
        }

        updateSoundUi();
      };

      window.addEventListener("pointerdown", retryOnGesture, { once: true });
      window.addEventListener("keydown", retryOnGesture, { once: true });
    }

    updateSoundUi();
  };

  soundToggle.addEventListener("click", async () => {
    wantsSoundOn = !wantsSoundOn;
    await playWithCurrentPreference();
    updateSoundUi();
  });

  syncPlaybackPreference();
}
