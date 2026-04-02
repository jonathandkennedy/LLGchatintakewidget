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
  var launcher;

  function toggleWidget() {
    open = !open;
    if (iframe) {
      iframe.style.display = open ? "block" : "none";
      iframe.style.opacity = open ? "1" : "0";
      iframe.style.transform = open ? "translateY(0) scale(1)" : "translateY(12px) scale(0.96)";
    }
    if (launcher) {
      launcher.style.transform = open ? "scale(0.95)" : "scale(1)";
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
    iframe.style.borderRadius = "24px";
    iframe.style.background = "transparent";
    iframe.style.boxShadow = "0 20px 60px rgba(15, 23, 42, 0.12), 0 8px 24px rgba(15, 23, 42, 0.08)";
    iframe.style.zIndex = "2147483646";
    iframe.style.display = "none";
    iframe.style.opacity = "0";
    iframe.style.transform = "translateY(12px) scale(0.96)";
    iframe.style.transition = "opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)";
    iframe.allow = "clipboard-write";
    document.body.appendChild(iframe);
  }

  function createLauncher(config) {
    launcher = document.createElement("button");
    launcher.type = "button";
    launcher.innerText = (config && config.branding && config.branding.welcomeHeadline) || "Injured in an accident?";
    var primaryColor = (config && config.branding && config.branding.primaryColor) || "#2563eb";
    launcher.style.position = "fixed";
    launcher.style.bottom = "20px";
    launcher.style.right = "20px";
    launcher.style.zIndex = "2147483647";
    launcher.style.padding = "14px 22px";
    launcher.style.border = "0";
    launcher.style.borderRadius = "999px";
    launcher.style.background = primaryColor;
    launcher.style.color = "#fff";
    launcher.style.fontFamily = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    launcher.style.fontSize = "15px";
    launcher.style.fontWeight = "600";
    launcher.style.letterSpacing = "-0.01em";
    launcher.style.boxShadow = "0 4px 14px rgba(37,99,235,0.3), 0 12px 32px rgba(37,99,235,0.15)";
    launcher.style.cursor = "pointer";
    launcher.style.transition = "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
    launcher.style.transform = "scale(1)";
    launcher.addEventListener("mouseenter", function () {
      if (!open) launcher.style.transform = "scale(1.04)";
    });
    launcher.addEventListener("mouseleave", function () {
      if (!open) launcher.style.transform = "scale(1)";
    });
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
