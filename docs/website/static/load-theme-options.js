const theme = localStorage.getItem("THEME");
const themeClass = theme === "DARK" ? "theme-dark" : "theme-light";
window.onload = () => document.body.classList.add(themeClass);

/** Add "BETA" tag below the logi */
document.addEventListener('DOMContentLoaded', function() {
    const themeSwitch = document.getElementsByClassName('headerWrapper')[0];
    
    const betaDiv = document.createElement("div");
    const betaLink = document.createElement("a");
    betaLink.setAttribute("href", "/docs/beta-notice");
    betaLink.classList.add("beta");
    betaLink.innerHTML = "Beta";
    betaDiv.appendChild(betaLink);
    themeSwitch.appendChild(betaDiv);

}, false);