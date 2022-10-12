const theme = localStorage.getItem("THEME");
const themeClass = theme === "DARK" ? "theme-dark" : "theme-light";
window.onload = () => document.body.classList.add(themeClass);