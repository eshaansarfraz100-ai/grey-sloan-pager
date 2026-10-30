
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const STORE = "grey-sloan-pager-v1";

  // Replace this with your Render server URL once deployed.
const SERVER_URL = "https://grey-sloan-notification-server.onrender.com";
  
  const VAPID_PUBLIC_KEY =
    "BH9PTluDWNLLt9q5gvloktIuzV3BCKHddd0y3xU3dzxKzvssLsapHhMf_M392Dkq1zLY-zNVL90xxXijs7MKH2w";

  let state = loadState();
  let selectedPriority = "Urgent";
  let toastTimer;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE));
      if (saved && Array.isArray(saved.pages)) {
        return { pages: saved.pages, onCall: saved.onCall !== false };
      }
    } catch (_) {}
    return { pages: [], onCall: true };
  }

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify(state));
    } catch (_) {
      showToast("Could not save on this device");
    }
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleString([], {
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit"
    });
  }

  function showToast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.value = .055;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .22);
      osc.stop(ctx.currentTime + .23);
      osc.onended = () => ctx.close();
    } catch (_) {}
  }

  function render() {
    const latest = state.pages[0];

    $("#latestCard").innerHTML = latest ? `
      <div class="page-top">
        <span class="priority-badge ${latest.priority.toLowerCase()}">
          ${escapeHTML(latest.priority.toUpperCase())} PRIORITY
        </span>
        <span class="page-time">${formatTime(latest.createdAt)}</span>
      </div>
      <h3 class="page-dept">${escapeHTML(latest.department.toUpperCase())}</h3>
      <p class="page-message">${escapeHTML(latest.message)}</p>
      <button class="ack-btn ${latest.acknowledged ? "done" : ""}" id="ackLatest">
        ${latest.acknowledged ? "✓ PAGE ACKNOWLEDGED" : "ACKNOWLEDGE PAGE"}
      </button>` :
      `<div class="empty-state">
        <div class="empty-radio">⌁</div>
        <h3>NO NEW PAGES</h3>
        <p>Your pager is standing by. Create a simulated page below.</p>
      </div>`;

    $("#historyCount").textContent = state.pages.length;
    $("#profileCount").textContent = state.pages.length;
    $("#profileDuty").textContent = state.onCall ? "On call" : "Off duty";
    $("#dutyStatus").innerHTML = `<i></i> ${state.onCall ? "ON CALL" : "OFF DUTY"}`;
    $("#dutyToggle").textContent = state.onCall ? "SIGN OFF DUTY" : "SIGN ON DUTY";
    $("#dutyToggle").classList.toggle("off", !state.onCall);

    $("#historyList").innerHTML = state.pages.length ?
      state.pages.map(p => `
        <article class="history-item">
          <div class="page-top">
            <span class="priority-badge ${p.priority.toLowerCase()}">
              ${escapeHTML(p.priority)}
            </span>
            <span class="page-time">${formatTime(p.createdAt)}</span>
          </div>
          <h3 class="page-dept">${escapeHTML(p.department)}</h3>
          <p class="page-message">${escapeHTML(p.message)}</p>
          <span class="page-time">
            ${p.acknowledged ? "ACKNOWLEDGED" : "NOT ACKNOWLEDGED"}
          </span>
        </article>`).join("") :
      `<div class="empty-state small">
        <h3>NO HISTORY YET</h3>
        <p>Pages you create will appear here.</p>
      </div>`;

    $("#ackLatest")?.addEventListener("click", () => {
      if (!state.pages[0]) return;
      state.pages[0].acknowledged = true;
      save();
      render();
      showToast("Page acknowledged");
    });
  }

  // Convert the public VAPID key into the format required by the browser.
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
  }

  // Register this iPhone for push notifications.
  async function setupNotifications() {
    try {
      if (!("serviceWorker" in navigator) ||
          !("PushManager" in window) ||
          !("Notification" in window)) {
        showToast("Push notifications are not supported here");
        return;
      }

      if (SERVER_URL.includes("YOUR-RENDER-SERVICE")) {
        showToast("Notification server has not been deployed yet");
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        showToast("Notification permission was not granted");
        return;
      }

      const registration = await navigator.serviceWorker.register("./sw.js");
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      const response = await fetch(`${SERVER_URL}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        throw new Error("Server could not save the subscription");
      }

      showToast("iPhone successfully registered for pages!");
    } catch (error) {
      console.error("Notification setup failed:", error);
      showToast("Notification setup failed. Check the connection.");
    }
  }

  // Add the notification setup button to the existing profile controls.
  const notificationButton = document.createElement("button");
  notificationButton.id = "notificationSetup";
  notificationButton.textContent = "SET UP NOTIFICATIONS";
  notificationButton.className = "ack-btn";
  notificationButton.style.marginTop = "12px";
  notificationButton.addEventListener("click", setupNotifications);

  $("#dutyToggle").insertAdjacentElement("afterend", notificationButton);

  $$(".tab").forEach(btn => btn.addEventListener("click", () => {
    $$(".tab").forEach(b => {
      b.classList.toggle("active", b === btn);
      b.setAttribute("aria-selected", b === btn ? "true" : "false");
    });
    $$(".view").forEach(v => v.classList.remove("active"));
    $("#" + btn.dataset.tab + "View").classList.add("active");
  }));

  $$(".priority-btn").forEach(btn => btn.addEventListener("click", () => {
    selectedPriority = btn.dataset.priority;
    $$(".priority-btn").forEach(b =>
      b.classList.toggle("selected", b === btn)
    );
  }));

  $("#message").addEventListener("input", () => {
    $("#charCount").textContent = `${$("#message").value.length} / 240`;
  });

  $("#sendPage").addEventListener("click", () => {
    if (!state.onCall) {
      showToast("Sign on duty before receiving test pages");
      return;
    }

    const message = $("#message").value.trim();

    if (!message) {
      showToast("Enter a page message first");
      $("#message").focus();
      return;
    }

    state.pages.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      department: $("#department").value,
      priority: selectedPriority,
      message,
      createdAt: new Date().toISOString(),
      acknowledged: false
    });

    state.pages = state.pages.slice(0, 100);
    save();
    render();
    beep();
    showToast("New simulated page received");
  });

  $("#dutyToggle").addEventListener("click", () => {
    state.onCall = !state.onCall;
    save();
    render();
    showToast(state.onCall ? "You are now on call" : "You are now off duty");
  });

  $("#clearHistory").addEventListener("click", () => {
    if (!state.pages.length) {
      showToast("History is already empty");
      return;
    }

    if (confirm("Clear all simulated pager history from this device?")) {
      state.pages = [];
      save();
      render();
      showToast("History cleared");
    }
  });

  render();

  if ("serviceWorker" in navigator &&
      location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();
