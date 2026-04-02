(function () {
  var currentScript = document.currentScript;
  var clientSlug = currentScript && currentScript.getAttribute("data-client-slug");
  var apiBase = (currentScript && currentScript.getAttribute("data-api-base")) || window.location.origin;
  var position = (currentScript && currentScript.getAttribute("data-position")) || "right"; // "left" or "right"
  var offsetX = parseInt((currentScript && currentScript.getAttribute("data-offset-x")) || "20", 10);
  var offsetY = parseInt((currentScript && currentScript.getAttribute("data-offset-y")) || "20", 10);
  if (!clientSlug) {
    console.error("Missing data-client-slug on widget script");
    return;
  }

  var iframe;
  var open = false;
  var launcher;
  var launcherBubble;
  var overlay;

  function isMobile() { return window.innerWidth <= 600; }

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
      if (launcher) launcher.style.transform = "scale(0.9)";
      if (launcherBubble) launcherBubble.style.display = "none";
    } else {
      if (iframe) {
        iframe.style.opacity = "0";
        iframe.style.transform = isMobile() ? "translateY(100%)" : "translateY(12px) scale(0.96)";
        setTimeout(function () { if (!open) iframe.style.display = "none"; }, 300);
      }
      if (overlay) overlay.style.display = "none";
      if (launcher) launcher.style.transform = "scale(1)";
      if (launcherBubble) launcherBubble.style.display = "block";
    }
  }

  // Listen for close messages from widget iframe
  window.addEventListener("message", function (event) {
    if (event.data === "widget-close" && open) toggleWidget();
  });

  // Escape key closes widget
  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && open) toggleWidget();
  });

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
      iframe.style.bottom = (offsetY + 70) + "px";
      if (position === "left") { iframe.style.left = offsetX + "px"; iframe.style.right = "auto"; }
      else { iframe.style.right = offsetX + "px"; iframe.style.left = "auto"; }
      iframe.style.top = "auto";
      iframe.style.width = "390px";
      iframe.style.maxWidth = "calc(100vw - 40px)";
      iframe.style.height = "600px";
      iframe.style.maxHeight = "calc(100vh - 108px)";
      iframe.style.borderRadius = "20px";
    }
  }

  function createOverlay() {
    overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:2147483645;display:none";
    overlay.addEventListener("click", toggleWidget);
    document.body.appendChild(overlay);
  }

  function createIframe() {
    iframe = document.createElement("iframe");
    iframe.src = apiBase.replace(/\/$/, "") + "/widget/" + encodeURIComponent(clientSlug);
    iframe.title = "Lead intake widget";
    iframe.style.cssText = [
      "position:fixed",
      "border:0",
      "background:#fff",
      "box-shadow:0 8px 32px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.08)",
      "z-index:2147483646",
      "display:none",
      "opacity:0",
      "transform:" + (isMobile() ? "translateY(100%)" : "translateY(12px) scale(0.96)"),
      "transition:opacity 0.3s cubic-bezier(0.4,0,0.2,1),transform 0.3s cubic-bezier(0.4,0,0.2,1)"
    ].join(";");
    iframe.allow = "clipboard-write";
    applyIframeStyles();
    document.body.appendChild(iframe);
  }

  function createLauncher(config) {
    var primaryColor = (config && config.branding && config.branding.primaryColor) || "#2563eb";
    var headline = (config && config.branding && config.branding.welcomeHeadline) || "How can I help you?";
    var avatarUrl = (config && config.branding && config.branding.avatarUrl) || "";

    // Speech bubble
    launcherBubble = document.createElement("div");
    launcherBubble.innerText = headline;
    launcherBubble.style.cssText = [
      "position:fixed",
      "bottom:" + (offsetY + 60) + "px",
      (position === "left" ? "left:" : "right:") + offsetX + "px",
      "z-index:2147483647",
      "background:#fff",
      "color:#333",
      "padding:10px 16px",
      "border-radius:12px",
      "box-shadow:0 2px 12px rgba(0,0,0,0.12)",
      "font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      "font-size:14px",
      "font-weight:500",
      "max-width:220px",
      "cursor:pointer",
      "-webkit-tap-highlight-color:transparent"
    ].join(";");
    launcherBubble.addEventListener("click", toggleWidget);
    document.body.appendChild(launcherBubble);

    // Avatar button
    launcher = document.createElement("button");
    launcher.type = "button";
    launcher.style.cssText = [
      "position:fixed",
      "bottom:" + offsetY + "px",
      (position === "left" ? "left:" : "right:") + offsetX + "px",
      "z-index:2147483647",
      "width:56px",
      "height:56px",
      "border:3px solid #fff",
      "border-radius:50%",
      "padding:0",
      "cursor:pointer",
      "box-shadow:0 4px 16px rgba(0,0,0,0.18)",
      "transition:all 0.25s cubic-bezier(0.4,0,0.2,1)",
      "transform:scale(1)",
      "overflow:hidden",
      "background:" + primaryColor,
      "-webkit-tap-highlight-color:transparent"
    ].join(";");

    if (avatarUrl) {
      var img = document.createElement("img");
      img.src = avatarUrl;
      img.alt = "Chat";
      img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block";
      launcher.appendChild(img);
    } else {
      // Default chat icon
      launcher.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
      launcher.style.display = "flex";
      launcher.style.alignItems = "center";
      launcher.style.justifyContent = "center";
    }

    // Green online dot
    var dot = document.createElement("div");
    dot.style.cssText = [
      "position:absolute",
      "bottom:0",
      "right:0",
      "width:14px",
      "height:14px",
      "background:#22c55e",
      "border:2px solid #fff",
      "border-radius:50%"
    ].join(";");
    launcher.style.position = "fixed";
    launcher.appendChild(dot);

    launcher.addEventListener("click", toggleWidget);
    document.body.appendChild(launcher);
  }

  window.addEventListener("resize", function () { if (iframe) applyIframeStyles(); });

  fetch(apiBase + "/api/widget/config?clientSlug=" + encodeURIComponent(clientSlug))
    .then(function (res) { return res.json(); })
    .then(function (config) {
      createOverlay();
      createIframe();
      createLauncher(config);
    })
    .catch(function (err) { console.error("Failed to boot widget", err); });
})();
