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
  var overlay;

  function isMobile() {
    return window.innerWidth <= 600;
  }

  function toggleWidget() {
    open = !open;

    if (open) {
      if (iframe) {
        iframe.style.display = "block";
        requestAnimationFrame(function () {
          iframe.style.opacity = "1";
          iframe.style.transform = isMobile() ? "translateY(0)" : "translateY(0) scale(1)";
        });
      }
      if (overlay && isMobile()) overlay.style.display = "block";
      if (launcher) {
        launcher.style.opacity = "0";
        launcher.style.pointerEvents = "none";
        launcher.style.transform = "scale(0.8)";
      }
    } else {
      if (iframe) {
        iframe.style.opacity = "0";
        iframe.style.transform = isMobile() ? "translateY(100%)" : "translateY(12px) scale(0.96)";
        setTimeout(function () { if (!open) iframe.style.display = "none"; }, 300);
      }
      if (overlay) overlay.style.display = "none";
      if (launcher) {
        launcher.style.opacity = "1";
        launcher.style.pointerEvents = "auto";
        launcher.style.transform = "scale(1)";
      }
    }
  }

  function applyIframeStyles() {
    if (!iframe) return;
    var mobile = isMobile();

    if (mobile) {
      iframe.style.bottom = "0";
      iframe.style.right = "0";
      iframe.style.left = "0";
      iframe.style.top = "0";
      iframe.style.width = "100%";
      iframe.style.maxWidth = "100%";
      iframe.style.height = "100%";
      iframe.style.maxHeight = "100%";
      iframe.style.borderRadius = "0";
    } else {
      iframe.style.bottom = "84px";
      iframe.style.right = "20px";
      iframe.style.left = "auto";
      iframe.style.top = "auto";
      iframe.style.width = "390px";
      iframe.style.maxWidth = "calc(100vw - 40px)";
      iframe.style.height = "640px";
      iframe.style.maxHeight = "calc(100vh - 108px)";
      iframe.style.borderRadius = "24px";
    }
  }

  function createOverlay() {
    overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.4)";
    overlay.style.zIndex = "2147483645";
    overlay.style.display = "none";
    overlay.addEventListener("click", toggleWidget);
    document.body.appendChild(overlay);
  }

  function createIframe() {
    iframe = document.createElement("iframe");
    iframe.src = apiBase.replace(/\/$/, "") + "/widget/" + encodeURIComponent(clientSlug);
    iframe.title = "Lead intake widget";
    iframe.style.position = "fixed";
    iframe.style.border = "0";
    iframe.style.background = "#ffffff";
    iframe.style.boxShadow = "0 20px 60px rgba(15, 23, 42, 0.15), 0 8px 24px rgba(15, 23, 42, 0.1)";
    iframe.style.zIndex = "2147483646";
    iframe.style.display = "none";
    iframe.style.opacity = "0";
    iframe.style.transform = isMobile() ? "translateY(100%)" : "translateY(12px) scale(0.96)";
    iframe.style.transition = "opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    iframe.allow = "clipboard-write";
    applyIframeStyles();
    document.body.appendChild(iframe);
  }

  function createLauncher(config) {
    launcher = document.createElement("button");
    launcher.type = "button";
    launcher.innerText = (config && config.branding && config.branding.welcomeHeadline) || "Injured in an accident?";
    var primaryColor = (config && config.branding && config.branding.primaryColor) || "#2563eb";
    launcher.style.cssText = [
      "position:fixed",
      "bottom:20px",
      "right:20px",
      "z-index:2147483647",
      "padding:14px 22px",
      "border:0",
      "border-radius:999px",
      "background:" + primaryColor,
      "color:#fff",
      "font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      "font-size:15px",
      "font-weight:600",
      "letter-spacing:-0.01em",
      "box-shadow:0 4px 14px rgba(37,99,235,0.3),0 12px 32px rgba(37,99,235,0.15)",
      "cursor:pointer",
      "transition:all 0.25s cubic-bezier(0.4,0,0.2,1)",
      "transform:scale(1)",
      "white-space:nowrap",
      "max-width:calc(100vw - 40px)",
      "overflow:hidden",
      "text-overflow:ellipsis",
      "-webkit-tap-highlight-color:transparent"
    ].join(";");
    launcher.addEventListener("click", toggleWidget);
    document.body.appendChild(launcher);
  }

  window.addEventListener("resize", function () {
    if (iframe) applyIframeStyles();
  });

  fetch(apiBase + "/api/widget/config?clientSlug=" + encodeURIComponent(clientSlug))
    .then(function (res) { return res.json(); })
    .then(function (config) {
      createOverlay();
      createIframe();
      createLauncher(config);
    })
    .catch(function (error) { console.error("Failed to boot widget", error); });
})();
