const aboutModal = document.getElementById("about-modal");
const openAboutButton = document.querySelector("[data-open-about]");
const closeAboutButton = document.querySelector("[data-close-about]");

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
