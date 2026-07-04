/* ============================================================
   WhatsApp-style animated chat demo — GestorLocal
   Vanilla JS, no dependencies.

   Usage: place the .wa-phone markup in the page, then:
     <script>
       window.CHAT_CONFIG = { ... };  // see demo pages
     </script>
     <script src="chat.js"></script>

   URL params (for the recorder):
     ?record=1  -> play once, no loop; sets document.title to
                   "DEMO_DONE" when the animation finishes.
   ============================================================ */
(function () {
  "use strict";

  var cfg = window.CHAT_CONFIG;
  if (!cfg) return;

  var root = document.querySelector(cfg.selector || ".wa-phone");
  if (!root) return;

  var params = new URLSearchParams(window.location.search);
  var recordMode = params.get("record") === "1";
  var loop = recordMode ? false : cfg.loop !== false;

  var messagesEl = root.querySelector(".wa-messages");
  var statusEl = root.querySelector(".wa-peer-status");
  var endcardEl = root.querySelector(".wa-endcard");

  var TICKS_SVG =
    '<svg viewBox="0 0 16 11" aria-hidden="true">' +
    '<path d="M11.07.65a.5.5 0 0 0-.7.08L5.7 6.7 3.65 4.8a.5.5 0 1 0-.68.73l2.44 2.28c.22.2.56.18.75-.06L11.15 1.35a.5.5 0 0 0-.08-.7z"/>' +
    '<path class="wa-tick2" d="M15.07.65a.5.5 0 0 0-.7.08L9.7 6.7l-.62-.58-.65.83.9.85c.22.2.56.18.75-.06L15.15 1.35a.5.5 0 0 0-.08-.7z"/>' +
    "</svg>";

  var timers = [];

  function after(ms, fn) {
    timers.push(setTimeout(fn, ms));
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setStatus(text) {
    if (!statusEl) return;
    statusEl.style.opacity = "0";
    setTimeout(function () {
      statusEl.textContent = text;
      statusEl.style.opacity = "1";
    }, 140);
  }

  function bubble(msg, followup) {
    var el = document.createElement("div");
    el.className =
      "wa-msg " +
      (msg.from === "lead" ? "wa-msg--out" : "wa-msg--in") +
      (followup ? " wa-msg--followup" : "");
    var meta =
      '<span class="wa-meta">' +
      msg.time +
      (msg.from === "lead"
        ? '<span class="wa-ticks" data-state="sent">' + TICKS_SVG + "</span>"
        : "") +
      "</span>";
    el.innerHTML = '<span class="wa-text">' + msg.html + "</span>" + meta;
    return el;
  }

  function typingTime(html) {
    var len = html.replace(/<[^>]+>/g, "").length;
    return Math.min(3400, Math.max(1700, len * 22));
  }

  /* Build the timeline from cfg.messages.
     Each message: { from: "lead"|"bot", html, time, gap }
     gap = ms to wait after the PREVIOUS event before this one starts. */
  function play() {
    clearTimers();
    // reset DOM
    messagesEl
      .querySelectorAll(".wa-msg, .wa-typing")
      .forEach(function (n) {
        n.remove();
      });
    if (endcardEl) endcardEl.classList.remove("is-visible");
    setStatus(cfg.statusOnline);
    messagesEl.scrollTop = 0;

    var t = 0;
    var prevFrom = null;
    var pendingTicks = []; // outgoing tick elements not yet "read"

    cfg.messages.forEach(function (msg) {
      var followup = prevFrom === msg.from;
      t += msg.gap != null ? msg.gap : 1200;

      if (msg.from === "bot") {
        var typeMs = typingTime(msg.html);

        // bot "reads" the lead's messages, then types
        (function (startAt) {
          after(startAt, function () {
            pendingTicks.forEach(function (tickEl) {
              tickEl.setAttribute("data-state", "read");
            });
            pendingTicks = [];
            setStatus(cfg.statusTyping);
            var typing = document.createElement("div");
            typing.className = "wa-typing";
            typing.innerHTML = "<i></i><i></i><i></i>";
            messagesEl.appendChild(typing);
            scrollToBottom();
          });
        })(t);

        t += typeMs;

        (function (startAt, m, fu) {
          after(startAt, function () {
            var typing = messagesEl.querySelector(".wa-typing");
            if (typing) typing.remove();
            setStatus(cfg.statusOnline);
            messagesEl.appendChild(bubble(m, fu));
            scrollToBottom();
          });
        })(t, msg, followup);
      } else {
        (function (startAt, m, fu) {
          after(startAt, function () {
            var el = bubble(m, fu);
            messagesEl.appendChild(el);
            scrollToBottom();
            var ticks = el.querySelector(".wa-ticks");
            if (ticks) {
              pendingTicks.push(ticks);
              setTimeout(function () {
                if (ticks.getAttribute("data-state") === "sent") {
                  ticks.setAttribute("data-state", "delivered");
                }
              }, 650);
            }
          });
        })(t, msg, followup);
      }

      prevFrom = msg.from;
    });

    // end card
    t += cfg.endcardGap != null ? cfg.endcardGap : 2600;
    after(t, function () {
      if (endcardEl) endcardEl.classList.add("is-visible");
    });

    t += cfg.endcardHold != null ? cfg.endcardHold : 5200;
    after(t, function () {
      if (recordMode) {
        window.__demoDone = true;
        document.title = "DEMO_DONE";
        return;
      }
      if (loop) {
        if (endcardEl) endcardEl.classList.remove("is-visible");
        after(900, play);
      }
    });
  }

  // small delay so the first paint is the empty chat (nicer loop + video hook)
  after(cfg.startDelay != null ? cfg.startDelay : 700, play);
})();
