
export function toggleThemeWithNoFlash(
  setTheme?: (theme: "light" | "dark") => void
): "light" | "dark" {
  if (typeof window === "undefined") return "light";

  // 1. Inject temporary stylesheet to freeze all CSS transitions globally
  const css = document.createElement("style");
  css.id = "theme-no-flash-style";
  css.appendChild(
    document.createTextNode(
      `*, *::before, *::after {
        -webkit-transition: none !important;
        -moz-transition: none !important;
        -o-transition: none !important;
        -ms-transition: none !important;
        transition: none !important;
      }`
    )
  );
  document.head.appendChild(css);

  // 2. Toggle dark class on document.documentElement
  const isDark = document.documentElement.classList.toggle("dark");
  const newTheme = isDark ? "dark" : "light";

  try {
    localStorage.setItem("theme", newTheme);
  } catch (e) {
  }

  if (setTheme) {
    setTheme(newTheme);
  }

  // 3. Force synchronous DOM reflow
  void window.getComputedStyle(document.body).opacity;

  // 4. Remove transition freeze style tag after 2 paint frames
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (css.parentNode) {
        css.parentNode.removeChild(css);
      }
    });
  });

  return newTheme;
}
