/* Godmode landing site behavior.
   Buildless: no framework, no bundler, no CDN. Plain ES modules-free script.
   Fetches ./data/godmode.json and renders the data-driven sections. Static
   fallback text already lives in each container for the no-JS / fetch-fail case. */

(function () {
  "use strict";

  var PILLAR_ORDER = ["Learn", "Plan", "Build", "Review", "Debug", "Ship"];
  var CATEGORY_ORDER = ["Docs", "Code intelligence", "Browser", "Cloud"];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function groupBy(items, key) {
    var map = {};
    items.forEach(function (item) {
      var k = item[key];
      (map[k] = map[k] || []).push(item);
    });
    return map;
  }

  /* ---------- Renderers ---------- */

  function renderCommands(root, commands) {
    var groups = groupBy(commands, "pillar");
    var frag = document.createDocumentFragment();

    PILLAR_ORDER.forEach(function (pillar) {
      var group = groups[pillar];
      if (!group || !group.length) return;

      var section = el("div", "cmd-group");
      var title = el("h3", "cmd-group-title", pillar);
      title.appendChild(el("span", "count", String(group.length)));
      section.appendChild(title);

      var grid = el("div", "cmd-grid");
      group.forEach(function (cmd) {
        var card = el("article", "cmd-card card-surface");
        var name = el("p", "cmd-name");
        var slash = el("span", "slash", "/");
        name.appendChild(slash);
        name.appendChild(document.createTextNode(cmd.name));
        card.appendChild(name);
        card.appendChild(el("p", "cmd-purpose", cmd.purpose));
        grid.appendChild(card);
      });
      section.appendChild(grid);
      frag.appendChild(section);
    });

    root.replaceChildren(frag);
    root.removeAttribute("data-fallback");
  }

  function renderAgents(root, agents) {
    var frag = document.createDocumentFragment();
    agents.forEach(function (agent) {
      var item = el("li", "agent-item card-surface");
      item.appendChild(el("span", "agent-name", agent.name));
      item.appendChild(el("p", "agent-role", agent.role));
      frag.appendChild(item);
    });
    root.replaceChildren(frag);
    root.removeAttribute("data-fallback");
  }

  function renderHooks(root, hooks) {
    var frag = document.createDocumentFragment();
    hooks.forEach(function (hook) {
      var item = el("li", "hook-item card-surface");
      var head = el("div", "hook-head");
      head.appendChild(el("span", "hook-name", hook.name));
      head.appendChild(el("span", "hook-event", hook.event));
      item.appendChild(head);
      item.appendChild(el("p", "hook-detail", hook.detail));
      frag.appendChild(item);
    });
    root.replaceChildren(frag);
    root.removeAttribute("data-fallback");
  }

  function renderConnectors(root, connectors) {
    var groups = groupBy(connectors, "category");
    var frag = document.createDocumentFragment();

    CATEGORY_ORDER.forEach(function (category) {
      var group = groups[category];
      if (!group || !group.length) return;

      var section = el("div", "conn-group");
      var title = el("h3", "conn-group-title", category);
      title.appendChild(el("span", "count", String(group.length)));
      section.appendChild(title);

      var grid = el("div", "conn-grid");
      group.forEach(function (conn) {
        var card = el("article", "conn-card card-surface");
        var head = el("div", "conn-head");
        head.appendChild(el("h4", "conn-title", conn.title));
        head.appendChild(el("span", "conn-cat", conn.category));
        card.appendChild(head);
        card.appendChild(el("p", "conn-blurb", conn.blurb));
        grid.appendChild(card);
      });
      section.appendChild(grid);
      frag.appendChild(section);
    });

    root.replaceChildren(frag);
    root.removeAttribute("data-fallback");
  }

  function renderRoadmap(root, roadmap) {
    var frag = document.createDocumentFragment();
    roadmap.forEach(function (phase) {
      var item = el("li", "roadmap-item card-surface");
      item.setAttribute("data-phase", phase.phase);

      var head = el("div", "roadmap-phase");
      head.appendChild(el("span", "roadmap-name", phase.phase));
      if (phase.label) head.appendChild(el("span", "roadmap-badge", phase.label));
      item.appendChild(head);

      var list = el("ul", "roadmap-list");
      (phase.items || []).forEach(function (line) {
        list.appendChild(el("li", null, line));
      });
      item.appendChild(list);
      frag.appendChild(item);
    });
    root.replaceChildren(frag);
    root.removeAttribute("data-fallback");
  }

  function observeReveals() {
    var revealables = document.querySelectorAll(".reveal");
    var reduceMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealables.forEach(function (node) {
        node.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );

    revealables.forEach(function (node) {
      observer.observe(node);
    });
  }

  /* ---------- Data load ---------- */

  function loadData() {
    fetch("./data/godmode.json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var commandsRoot = document.getElementById("commands-root");
        var agentsRoot = document.getElementById("agents-root");
        var hooksRoot = document.getElementById("hooks-root");
        var connectorsRoot = document.getElementById("connectors-root");
        var roadmapRoot = document.getElementById("roadmap-root");

        if (commandsRoot && Array.isArray(data.commands))
          renderCommands(commandsRoot, data.commands);
        if (agentsRoot && Array.isArray(data.agents)) renderAgents(agentsRoot, data.agents);
        if (hooksRoot && Array.isArray(data.hooks)) renderHooks(hooksRoot, data.hooks);
        if (connectorsRoot && Array.isArray(data.connectors))
          renderConnectors(connectorsRoot, data.connectors);
        if (roadmapRoot && Array.isArray(data.roadmap)) renderRoadmap(roadmapRoot, data.roadmap);

        // Newly injected cards may carry .reveal; observe again so they animate in.
        observeReveals();
      })
      .catch(function (err) {
        // Static fallback copy stays in place; surface the reason for debugging only.
        if (window.console && console.warn)
          console.warn("Godmode: data load failed, using static fallback.", err);
      });
  }

  /* ---------- Nav toggle ---------- */

  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var links = document.getElementById("nav-links");
    if (!toggle || !links) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      links.classList.toggle("is-open", open);
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    links.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* ---------- Install tabs (W3C APG: automatic activation, roving tabindex) ---------- */

  function initTabs() {
    var tablist = document.querySelector('[role="tablist"]');
    if (!tablist) return;
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));

    function activate(tab, setFocus) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute("aria-selected", selected ? "true" : "false");
        t.tabIndex = selected ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !selected;
      });
      if (setFocus) tab.focus();
    }

    tablist.addEventListener("click", function (event) {
      var tab = event.target.closest('[role="tab"]');
      if (tab) activate(tab, false);
    });

    tablist.addEventListener("keydown", function (event) {
      var index = tabs.indexOf(document.activeElement);
      if (index < 0) return;
      var next = null;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          next = tabs[(index + 1) % tabs.length];
          break;
        case "ArrowLeft":
        case "ArrowUp":
          next = tabs[(index - 1 + tabs.length) % tabs.length];
          break;
        case "Home":
          next = tabs[0];
          break;
        case "End":
          next = tabs[tabs.length - 1];
          break;
        default:
          return;
      }
      event.preventDefault();
      activate(next, true);
    });
  }

  /* ---------- Copy buttons ---------- */

  function initCopy() {
    var buttons = document.querySelectorAll(".copy-btn");
    Array.prototype.forEach.call(buttons, function (btn) {
      var label = btn.querySelector(".copy-label") || btn;

      btn.addEventListener("click", function () {
        var text = btn.getAttribute("data-copy") || "";

        function done() {
          btn.classList.add("is-copied");
          label.textContent = "Copied";
          btn.setAttribute("aria-label", "Copied to clipboard");
          window.setTimeout(function () {
            btn.classList.remove("is-copied");
            label.textContent = "Copy";
            btn.removeAttribute("aria-label");
          }, 1800);
        }

        function fallback() {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "absolute";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand("copy");
            done();
          } catch (e) {
            label.textContent = "Copy failed";
          }
          document.body.removeChild(ta);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, fallback);
        } else {
          fallback();
        }
      });
    });
  }

  /* ---------- Boot ---------- */

  function init() {
    initNav();
    initTabs();
    initCopy();
    observeReveals();
    loadData();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
