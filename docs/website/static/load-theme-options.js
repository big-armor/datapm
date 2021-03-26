let theme = localStorage.getItem("theme");
const themeClass = theme === "DARK" ? "theme-dark" : "theme-light";
window.onload = () => document.body.classList.add(themeClass);
