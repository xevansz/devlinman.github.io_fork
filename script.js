document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".card");

  cards.forEach((card) => {
    card.addEventListener("click", (e) => {
      // If the user clicked on a link inside the card, let the link handle it.
      if (e.target.closest("a")) return;

      const url = card.getAttribute("data-href");
      if (url) {
        // Mimic target="_blank" behavior
        window.open(url, "_blank");
      }
    });
  });
});
