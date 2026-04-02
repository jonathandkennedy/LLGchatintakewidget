(function () {
  var currentScript = document.currentScript;
  var clientSlug = currentScript && currentScript.getAttribute("data-client-slug");
  var apiBase = (currentScript && currentScript.getAttribute("data-api-base")) || window.location.origin;
  if (!clientSlug) {
    console.error("Missing data-client-slug on widget script");
    return;
  }

  var iframe;
  var open = false;

  function toggleWidget() {
    open = !open;
    if (iframe) {
      iframe.style.display = open ? "block" : "none";
    }
  }

  function createIframe() {
    iframe = document.createElement("iframe");
    iframe.src = apiBase.replace(/\/$/, "") + "/widget/" + encodeURIComponent(clientSlug);
    iframe.title = "Lead intake widget";
    iframe.style.position = "fixed";
    iframe.style.bottom = "84px";
    iframe.style.right = "20px";
    iframe.style.width = "390px";
    iframe.style.maxWidth = "calc(100vw - 24px)";
    iframe.style.height = "680px";
    iframe.style.maxHeight = "calc(100vh - 100px)";
    iframe.style.border = "0";
    iframe.style.background = "transparent";
    iframe.style.zIndex = "2147483646";
    iframe.style.display = "none";
    iframe.allow = "clipboard-write";
    document.body.appendChild(iframe);
  }

  function createLauncher(config) {
    var launcher = document.createElement("button");
    launcher.type = "button";
    launcher.innerText = (config && config.branding && config.branding.welcomeHeadline) || "Injured in an accident?";
    launcher.style.position = "fixed";
    launcher.style.bottom = "20px";
    launcher.style.right = "20px";
    launcher.style.zIndex = "2147483647";
    launcher.style.padding = "14px 18px";
    launcher.style.border = "0";
    launcher.style.borderRadius = "999px";
    launcher.style.background = (config && config.branding && config.branding.primaryColor) || "#2563eb";
    launcher.style.color = "#fff";
    launcher.style.fontWeight = "700";
    launcher.style.boxShadow = "0 18px 40px rgba(37,99,235,0.28)";
    launcher.addEventListener("click", toggleWidget);
    document.body.appendChild(launcher);
  }

  fetch(apiBase + "/api/widget/config?clientSlug=" + encodeURIComponent(clientSlug))
    .then(function (res) { return res.json(); })
    .then(function (config) {
      createIframe();
      createLauncher(config);
    })
    .catch(function (error) { console.error("Failed to boot widget", error); });
})();
