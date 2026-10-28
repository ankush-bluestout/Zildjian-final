/* Artist Form — plain vanilla JS (no React).
   Adds behaviour to the HTML in blocks/artist-form.liquid. Edit that file for
   structure; you rarely need to touch this.

   NOTE: this is a THEME ASSET (runs in the browser). Never paste it into an
   app route (submit.jsx / search.jsx) — those run on the server and have no
   document/window. */
(function () {
  "use strict";

  var root = document.getElementById("artist-form-root");
  if (!root || root.dataset.enhanced) return;
  root.dataset.enhanced = "1";

  var proxyUrl = root.dataset.proxyUrl || "/apps/artist-form/submit";
  var searchUrl = root.dataset.searchUrl || "/apps/artist-form/search";
  var form = root.querySelector("#artist-form");
  var SECTIONS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];

  var selected = {}; // { cymbals: [...], gotos: [...] }
  var files = {}; // { profilePhoto: File, setupPhoto: File }

  // warning icon injected before each error message
  var WARN =
    '<svg class="err-ico" xmlns="http://www.w3.org/2000/svg" width="13" height="14" viewBox="0 0 13 14" fill="none">' +
    '<path d="M6.50016 12.9166C9.49171 12.9166 11.9168 10.4915 11.9168 7.49998C11.9168 4.50844 9.49171 2.08331 6.50016 2.08331C3.50862 2.08331 1.0835 4.50844 1.0835 7.49998C1.0835 10.4915 3.50862 12.9166 6.50016 12.9166Z" stroke="#C0392B" stroke-width="1.08333"/>' +
    '<path d="M6.5 5.33331V7.49998" stroke="#C0392B" stroke-width="1.08333"/>' +
    '<path d="M6.5 9.66669H6.50542" stroke="#C0392B" stroke-width="1.08333"/>' +
    "</svg> ";

  /* ---------------- nav / scroll-spy ---------------- */
  var navLinks = root.querySelectorAll(".sidebar-link, .mobile-tab");
  var tabBar = root.querySelector(".mobile-tabs");
  var clickLock = false;

  /* keep mobile tabs just below the site's sticky header */
  var siteHeader = document.querySelector(".section-header");

  function setHeaderH() {
    var h = siteHeader
      ? Math.max(0, siteHeader.getBoundingClientRect().bottom)
      : 0;
    root.style.setProperty("--header-h", h + "px");
  }
  setHeaderH();
  window.addEventListener("resize", setHeaderH);
  window.addEventListener("scroll", setHeaderH, { passive: true });

  function setActive(id) {
    navLinks.forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("href") === "#" + id);
    });
    if (tabBar) {
      var tab = tabBar.querySelector('.mobile-tab[href="#' + id + '"]');
      if (tab) {
        var bw = tabBar.offsetWidth;
        tabBar.scrollTo({
          left: tab.offsetLeft - bw / 2 + tab.offsetWidth / 2,
          behavior: "smooth",
        });
      }
    }
  }

  function onScroll() {
    if (clickLock) return;
    if (window.scrollY < 10) {
      setActive("s1");
      return;
    }
    var scrollBottom = window.scrollY + window.innerHeight;
    if (document.documentElement.scrollHeight - scrollBottom < 10) {
      setActive(SECTIONS[SECTIONS.length - 1]);
      return;
    }
    var offset = window.innerHeight * 0.45;
    var current = SECTIONS[0];
    SECTIONS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= offset) current = id;
    });
    setActive(current);
  }

  navLinks.forEach(function (a) {
    a.addEventListener("click", function () {
      var id = (a.getAttribute("href") || "").slice(1);
      setActive(id);
      clickLock = true;
      setTimeout(function () {
        clickLock = false;
      }, 800);
    });
  });
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------- custom select (ul/li) built from each <select> ----------------
     Keeps the original <select> in the DOM (hidden) so its value still submits
     under the same name and validation keeps working. A search box appears only
     when the select has more than SEARCH_THRESHOLD real options (so only
     Country gets it). */
  var SEARCH_THRESHOLD = 8;
  var openDropdown = null;

  function buildCustomSelect(sel) {
    if (sel.dataset.cfDone) return;
    sel.dataset.cfDone = "1";

    var multi = sel.multiple;
    var opts = Array.prototype.map.call(sel.options, function (o) {
      return {
        value: o.value,
        label: o.textContent,
        placeholder: o.value === "",
      };
    });
    var placeholderLabel =
      sel.dataset.placeholder ||
      (opts[0] && opts[0].placeholder ? opts[0].label : "Select an option...");
    var realOpts = opts.filter(function (o) {
      return !o.placeholder;
    });
    var searchable =
      realOpts.length > SEARCH_THRESHOLD || sel.dataset.searchable === "true";

    function isSelected(v) {
      return multi
        ? Array.prototype.some.call(sel.selectedOptions, function (o) {
            return o.value === v;
          })
        : sel.value === v;
    }

    var wrap = document.createElement("div");
    wrap.className = "cf-select";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cf-trigger field-input";
    var labelSpan = document.createElement("span");
    labelSpan.className = "cf-value placeholder";
    labelSpan.textContent = placeholderLabel;
    btn.appendChild(labelSpan);
    var caret = document.createElement("span");
    caret.className = "cf-caret";
    caret.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    btn.appendChild(caret);
    wrap.appendChild(btn);

    var panel = document.createElement("div");
    panel.className = "cf-panel";
    panel.hidden = true;

    var searchInput = null;
    if (searchable) {
      var searchWrap = document.createElement("div");
      searchWrap.className = "cf-search";
      searchWrap.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M6.41667 11.0833C8.994 11.0833 11.0833 8.994 11.0833 6.41667C11.0833 3.83934 8.994 1.75 6.41667 1.75C3.83934 1.75 1.75 3.83934 1.75 6.41667C1.75 8.994 3.83934 11.0833 6.41667 11.0833Z" stroke="#000000" stroke-width="1.16667"/><path d="M12.2499 12.25L9.7124 9.71252" stroke="#000000" stroke-width="1.16667"/></svg>';
      searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.className = "cf-search-input";
      searchInput.placeholder = "Search...";
      searchWrap.appendChild(searchInput);
      panel.appendChild(searchWrap);
    }

    var ul = document.createElement("ul");
    ul.className = "cf-options";
    panel.appendChild(ul);
    wrap.appendChild(panel);

    function renderOptions(filter) {
      ul.innerHTML = "";
      var f = (filter || "").toLowerCase();
      var shown = realOpts.filter(function (o) {
        return !f || o.label.toLowerCase().indexOf(f) !== -1;
      });
      if (shown.length === 0) {
        var empty = document.createElement("li");
        empty.className = "cf-empty";
        empty.textContent = "No matches";
        ul.appendChild(empty);
        return;
      }
      shown.forEach(function (o) {
        var on = isSelected(o.value);
        var li = document.createElement("li");
        li.className =
          "cf-option" + (on ? " selected" : "") + (multi ? " multi" : "");
        li.setAttribute("data-value", o.value);
        li.setAttribute("role", "option");
        var txt = document.createElement("span");
        txt.className = "cf-option-label";
        txt.textContent = o.label;
        li.appendChild(txt);
        if (on) {
          var chk = document.createElement("span");
          chk.className = "cf-check";
          chk.innerHTML = "✓";
          li.appendChild(chk);
        }
        li.addEventListener("click", function () {
          choose(o);
        });
        ul.appendChild(li);
      });
    }

    function setLabel() {
      if (multi) {
        var labels = realOpts
          .filter(function (o) {
            return isSelected(o.value);
          })
          .map(function (o) {
            return o.label;
          });
        labelSpan.textContent = labels.length
          ? labels.join(", ")
          : placeholderLabel;
        labelSpan.classList.toggle("placeholder", !labels.length);
        return;
      }
      if (sel.value) {
        var match = realOpts.filter(function (o) {
          return o.value === sel.value;
        })[0];
        labelSpan.textContent = match ? match.label : sel.value;
        labelSpan.classList.remove("placeholder");
      } else {
        labelSpan.textContent = placeholderLabel;
        labelSpan.classList.add("placeholder");
      }
    }

    function choose(o) {
      if (multi) {
        Array.prototype.forEach.call(sel.options, function (opt) {
          if (opt.value === o.value) opt.selected = !opt.selected;
        });
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        setLabel();
        renderOptions(searchInput ? searchInput.value.trim() : ""); // dropdown open rehta hai
        return;
      }
      sel.value = o.value;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      setLabel();
      close();
    }

    function open() {
      if (openDropdown && openDropdown !== wrap) openDropdown.__cfClose();
      panel.hidden = false;
      wrap.classList.add("open");
      openDropdown = wrap;
      renderOptions("");
      if (searchInput) {
        searchInput.value = "";
        setTimeout(function () {
          searchInput.focus();
        }, 0);
      }
    }
    function close() {
      panel.hidden = true;
      wrap.classList.remove("open");
      if (openDropdown === wrap) openDropdown = null;
    }
    wrap.__cfClose = close;

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      if (panel.hidden) open();
      else close();
    });

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        renderOptions(searchInput.value.trim());
      });
      searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          close();
          btn.focus();
        }
      });
    }

    sel.addEventListener("change", function () {
      setLabel();
    });
    if (form)
      form.addEventListener("reset", function () {
        setTimeout(function () {
          setLabel();
        }, 0);
      });

    sel.classList.add("cf-native-hidden");
    sel.parentNode.insertBefore(wrap, sel.nextSibling);
    setLabel();
  }

  form.querySelectorAll("select.field-input").forEach(buildCustomSelect);

  document.addEventListener("click", function (e) {
    if (openDropdown && !openDropdown.contains(e.target))
      openDropdown.__cfClose();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && openDropdown) openDropdown.__cfClose();
  });

  /* ---------------- quote character counter ---------------- */
  var quote = form.querySelector('textarea[name="quote"]');
  var counter = root.querySelector(".quote-count");
  if (quote && counter) {
    quote.addEventListener("input", function () {
      counter.textContent = quote.value.length + " / 400";
    });
  }

  /* ---------------- checklist picker with infinite scroll ---------------- */
  var pickerResets = [];

  function initPicker(pickerEl) {
    var group = pickerEl.dataset.group || "cymbals";
    var mode = pickerEl.dataset.mode || "browse";
    selected[group] = [];

    var cpInput = pickerEl.querySelector(".cp-input");
    var cpList = pickerEl.querySelector(".cp-list");
    var cpCount = pickerEl.querySelector(".cp-count");
    var cpClear = pickerEl.querySelector(".cp-clear");
    var cpChips =
      pickerEl.querySelector(".cp-selected") ||
      (pickerEl.parentNode &&
        pickerEl.parentNode.querySelector(".cp-selected"));

    var state = {
      term: "",
      items: [],
      cursor: null,
      hasNext: false,
      loading: false,
      reqId: 0,
      started: false,
    };
    var typeTimer;

    function isSel(id) {
      return selected[group].some(function (x) {
        return x.id === id;
      });
    }
    function updateCount() {
      if (cpCount) cpCount.textContent = selected[group].length + " selected";
    }
    function toggle(p, on) {
      if (on) {
        if (!isSel(p.id)) selected[group].push(p);
      } else {
        selected[group] = selected[group].filter(function (x) {
          return x.id !== p.id;
        });
      }
      updateCount();
      renderChips();
      if (selected[group].length > 0) {
        pickerEl.classList.remove("invalid");
        var host = pickerEl.closest(".field-group") || pickerEl.parentNode;
        if (host && host.classList) host.classList.remove("invalid");
        var err = host && host.querySelector(".field-error");
        if (err) err.classList.remove("show");
      }
    }

    function renderChips() {
      if (!cpChips) return;
      cpChips.innerHTML = "";
      if (selected[group].length === 0) {
        cpChips.hidden = true;
        return;
      }
      cpChips.hidden = false;
      selected[group].forEach(function (p) {
        var chip = document.createElement("span");
        chip.className = "cp-chip";
        var t = document.createElement("span");
        t.className = "cp-chip-title";
        t.textContent = p.title;
        chip.appendChild(t);
        var sub = p.size || p.sku;
        if (sub) {
          var s = document.createElement("span");
          s.className = "cp-chip-sub";
          s.textContent = sub;
          chip.appendChild(s);
        }
        var x = document.createElement("span");
        x.className = "cp-chip-x";
        x.setAttribute("aria-label", "Remove");
        x.innerHTML = "&times;";
        x.addEventListener("click", function () {
          toggle(p, false);
          var box = cpList.querySelector('input[data-id="' + p.id + '"]');
          if (box) box.checked = false;
          var rowEl = box ? box.closest(".cp-row") : null;
          if (rowEl) rowEl.classList.remove("selected");
        });
        chip.appendChild(x);
        cpChips.appendChild(chip);
      });
    }

    function makeRow(p) {
      var row = document.createElement("label");
      row.className = "cp-row" + (isSel(p.id) ? " selected" : "");
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "cp-check";
      cb.setAttribute("data-id", p.id);
      cb.checked = isSel(p.id);
      cb.addEventListener("change", function () {
        toggle(p, cb.checked);
        row.classList.toggle("selected", cb.checked);
      });
      row.appendChild(cb);
      var thumb = document.createElement("div");
      thumb.className = "cp-thumb";
      if (p.image) {
        var img = document.createElement("img");
        img.src = p.image;
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        thumb.appendChild(img);
      }
      row.appendChild(thumb);
      var info = document.createElement("div");
      info.className = "cp-info";
      var t = document.createElement("div");
      t.className = "cp-title";
      t.textContent = p.title;
      info.appendChild(t);
      var subText = p.size || p.sku;
      if (subText) {
        var s = document.createElement("div");
        s.className = "cp-sub";
        s.textContent = subText;
        info.appendChild(s);
      }
      row.appendChild(info);
      return row;
    }

    function setStatus(text) {
      var existing = cpList.querySelector(".cp-empty");
      if (existing) existing.remove();
      if (!text) return;
      var el = document.createElement("div");
      el.className = "cp-empty";
      el.textContent = text;
      cpList.appendChild(el);
    }

    function appendItems(newItems) {
      var frag = document.createDocumentFragment();
      newItems.forEach(function (p) {
        frag.appendChild(makeRow(p));
      });
      var status = cpList.querySelector(".cp-empty");
      if (status) cpList.insertBefore(frag, status);
      else cpList.appendChild(frag);
    }

    function startQuery(term) {
      state.term = term;
      state.items = [];
      state.cursor = null;
      state.hasNext = false;
      state.loading = false;
      state.reqId++;
      cpList.innerHTML = "";
      cpList.scrollTop = 0;
      loadPage(true);
    }

    function loadPage(isFirst) {
      if (state.loading) return;
      if (!isFirst && !state.hasNext) return;
      state.loading = true;
      var myReq = state.reqId;
      setStatus(isFirst ? "Loading…" : "Loading more…");
      var qs = "?group=" + encodeURIComponent(group);
      if (state.term.length >= 2) qs += "&q=" + encodeURIComponent(state.term);
      if (state.cursor) qs += "&after=" + encodeURIComponent(state.cursor);
      fetch(searchUrl + qs, { headers: { Accept: "application/json" } })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          if (myReq !== state.reqId) return;
          var items = (data && data.products) || [];
          var pi = (data && data.pageInfo) || {};
          state.items = state.items.concat(items);
          state.cursor = pi.endCursor || null;
          state.hasNext = !!pi.hasNextPage;
          state.loading = false;
          setStatus(null);
          appendItems(items);
          if (state.items.length === 0) {
            setStatus(
              state.term.length >= 2 ? "No matches" : "No products found",
            );
          }
          maybeAutoFill();
        })
        .catch(function () {
          if (myReq !== state.reqId) return;
          state.loading = false;
          setStatus("Couldn't load products.");
        });
    }

    function maybeAutoFill() {
      if (state.hasNext && cpList.scrollHeight <= cpList.clientHeight + 4)
        loadPage(false);
    }

    cpList.addEventListener(
      "scroll",
      function () {
        if (cpList.scrollTop + cpList.clientHeight >= cpList.scrollHeight - 60)
          loadPage(false);
      },
      { passive: true },
    );

    pickerResets.push(function () {
      selected[group] = [];
      if (cpInput) cpInput.value = "";
      updateCount();
      renderChips();
      startQuery("");
    });

    if (cpInput) {
      cpInput.addEventListener("input", function () {
        var t = cpInput.value.trim();
        clearTimeout(typeTimer);
        if (t.length < 2) {
          startQuery("");
          return;
        }
        typeTimer = setTimeout(function () {
          startQuery(t);
        }, 300);
      });
    }
    if (cpClear) {
      cpClear.addEventListener("click", function (e) {
        e.preventDefault();
        selected[group] = [];
        updateCount();
        renderChips();
        cpList.querySelectorAll(".cp-check").forEach(function (cb) {
          cb.checked = false;
        });
        cpList.querySelectorAll(".cp-row.selected").forEach(function (r) {
          r.classList.remove("selected");
        });
      });
    }

    renderChips();
    updateCount();

    if (mode === "browse") {
      var sectionEl = pickerEl.closest("section") || pickerEl;
      setStatus("Loading…");
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (en) {
              if (en.isIntersecting && !state.started) {
                state.started = true;
                startQuery("");
                io.disconnect();
              }
            });
          },
          { rootMargin: "300px" },
        );
        io.observe(sectionEl);
      } else {
        state.started = true;
        startQuery("");
      }
    } else {
      state.started = true;
      startQuery("");
    }
  }

  root.querySelectorAll(".cymbal-picker").forEach(initPicker);

  function resetAllPickers() {
    pickerResets.forEach(function (fn) {
      fn();
    });
  }

  /* ---------------- success modal ---------------- */
  //   var successModal = document.querySelector("[data-success-modal]");

  //   function openSuccessModal() {
  //     if (!successModal) return false;
  //     successModal.hidden = false;
  //     document.body.style.overflow = "hidden";
  //     return true;
  //   }
  //   function closeSuccessModal() {
  //     if (!successModal) return;
  //     successModal.hidden = true;
  //     document.body.style.overflow = "";
  //   }
  //   if (successModal) {
  //     successModal.addEventListener("click", function (e) {
  //       if (e.target === successModal) closeSuccessModal();
  //     });
  //     document.addEventListener("keydown", function (e) {
  //       if (e.key === "Escape" && !successModal.hidden) closeSuccessModal();
  //     });

  //   }

  //  if (successModal && successModal.parentNode !== document.body) {
  //     document.body.appendChild(successModal);
  //   }

  /* ---------------- success modal ---------------- */
  var successModal = document.querySelector("[data-success-modal]");

  // move it to <body> so position:fixed covers the viewport, not a transformed ancestor
  if (successModal && successModal.parentNode !== document.body) {
    document.body.appendChild(successModal);
  }

  function openSuccessModal() {
    if (!successModal) return false;
    successModal.hidden = false;
    document.body.style.overflow = "hidden";
    return true;
  }
  function closeSuccessModal() {
    if (!successModal) return;
    successModal.hidden = true;
    document.body.style.overflow = "";
  }

  if (successModal) {
    successModal.addEventListener("click", function (e) {
      if (e.target === successModal) closeSuccessModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !successModal.hidden) closeSuccessModal();
    });
  }

  // "Back to Zildjian" -> close modal + hide the whole form
  var hideBtn = document.querySelector("[data-hide-form]");
  if (hideBtn) {
    hideBtn.addEventListener("click", function () {
      closeSuccessModal();
      var formRoot = document.getElementById("artist-form-root");
      if (formRoot) formRoot.style.display = "none";
    });
  }

  /* ---------------- inline validation helpers ---------------- */
  function fieldError(afterEl, msg) {
    if (!afterEl) return;
    var host = afterEl.closest(".field-group") || afterEl.parentNode;
    if (!host) return;
    var err = host.querySelector(".field-error");
    if (!err) {
      err = document.createElement("div");
      err.className = "field-error";
      host.appendChild(err);
    }
    if (msg) {
      err.innerHTML = msg;
      err.classList.add("show");
    } else {
      err.classList.remove("show");
      err.innerHTML = "";
    }
  }
  function clearFieldError(afterEl) {
    fieldError(afterEl, "");
  }

  function markSelectInvalid(sel, on) {
    var wrap = sel.parentNode && sel.parentNode.querySelector(".cf-select");
    if (wrap) wrap.classList.toggle("invalid", !!on);
  }

  /* ---------------- photo uploads ---------------- */
  root.querySelectorAll(".upload-box").forEach(function (box) {
    var key = box.dataset.upload;
    var input = box.querySelector(".upload-input");
    var fileText = box.querySelector(".upload-file");

    function setFile(f) {
      files[key] = f || null;
      if (fileText) fileText.textContent = f ? f.name : "";
      box.classList.toggle("has-file", !!f);
      if (f) {
        box.classList.remove("invalid");
        var grp = box.closest(".field-group");
        if (grp) grp.classList.remove("invalid");
        clearFieldError(box);
      }
    }

    box.addEventListener("click", function (e) {
      if (e.target === input) return;
      input.click();
    });
    input.addEventListener("change", function () {
      setFile(input.files && input.files[0]);
    });

    // ---- drag & drop ----
    ["dragenter", "dragover"].forEach(function (ev) {
      box.addEventListener(ev, function (e) {
        e.preventDefault();
        e.stopPropagation();
        box.classList.add("dragover");
      });
    });
    box.addEventListener("dragleave", function (e) {
      if (box.contains(e.relatedTarget)) return;
      box.classList.remove("dragover");
    });
    box.addEventListener("drop", function (e) {
      e.preventDefault();
      e.stopPropagation();
      box.classList.remove("dragover");
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      if (!/^image\//i.test(f.type)) {
        fieldError(box, WARN + "Please drop an image file (JPG, PNG, TIFF).");
        return;
      }
      try {
        var dt = new DataTransfer();
        dt.items.add(f);
        input.files = dt.files;
      } catch (err) {
        /* purane browsers: files[key] phir bhi set ho jayega */
      }
      setFile(f);
    });
  });

  // box ke bahar file drop ho to browser file open na kare
  ["dragover", "drop"].forEach(function (ev) {
    window.addEventListener(ev, function (e) {
      if (!e.target.closest || !e.target.closest(".upload-box"))
        e.preventDefault();
    });
  });

  function toDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        resolve(r.result);
      };
      r.onerror = function () {
        reject(new Error("Could not read file"));
      };
      r.readAsDataURL(file);
    });
  }

  /* ---------------- submit ---------------- */
  var alertBox = root.querySelector("[data-alert]");
  var submitBtn = form.querySelector(".submit-btn");

  function showAlert(type, msg) {
    if (!alertBox) return;
    alertBox.className = "form-alert " + type;
    alertBox.hidden = false;
    alertBox.textContent = msg;
  }

  function isYouTubeShorts(url) {
    return (
      /youtube\.com\/shorts\//i.test(url) || /youtu\.be\/shorts\//i.test(url)
    );
  }

  function validateForm() {
    var ok = true;
    var firstBad = null;
    function fail(el, wrapEl, msg) {
      ok = false;
      if (el) el.classList.add("invalid");
      if (el && el.tagName === "SELECT") markSelectInvalid(el, true);
      var grp = (el && el.closest(".field-group")) || wrapEl;
      if (grp && grp.classList) grp.classList.add("invalid");
      fieldError(el || wrapEl, msg);
      if (!firstBad) firstBad = wrapEl || el;
    }

    var requiredNamed = [
      ["name", WARN + "Please fill out this field."],
      ["band", WARN + "Please fill out this field."],
      ["artistType", WARN + "Please select an artist type."],
      ["role", WARN + "Please select an option."],
      ["country", WARN + "Please select your country."],
      ["quote", WARN + "Please share your Zildjian quote."],
    ];

    requiredNamed.forEach(function (pair) {
      var el = form.querySelector('[name="' + pair[0] + '"]');
      if (!el) return;
      el.classList.remove("invalid");
      if (el.tagName === "SELECT") markSelectInvalid(el, false);
      var grp = el.closest(".field-group");
      if (grp) grp.classList.remove("invalid");
      clearFieldError(el);
      if (!String(el.value || "").trim()) fail(el, el, pair[1]);
    });

    var cymbalPicker = root.querySelector(
      '.cymbal-picker[data-group="cymbals"]',
    );
    if (cymbalPicker) {
      cymbalPicker.classList.remove("invalid");
      var cgrp = cymbalPicker.closest(".field-group");
      if (cgrp) cgrp.classList.remove("invalid");
      clearFieldError(cymbalPicker);
      if (!(selected.cymbals && selected.cymbals.length)) {
        ok = false;
        cymbalPicker.classList.add("invalid");
        if (cgrp) cgrp.classList.add("invalid");
        fieldError(
          cymbalPicker,
          WARN + "Please select at least one cymbal from your setup.",
        );
        if (!firstBad) firstBad = cgrp || cymbalPicker;
      }
    }

    [
      ["profilePhoto", WARN + "Please upload a profile photo."],

      ["setupPhoto", WARN + "Please upload a setup photo."],
    ].forEach(function (pair) {
      var box = root.querySelector(
        '.upload-box[data-upload="' + pair[0] + '"]',
      );
      if (!box) return;
      box.classList.remove("invalid");
      var bgrp = box.closest(".field-group");
      if (bgrp) bgrp.classList.remove("invalid");
      clearFieldError(box);
      if (!files[pair[0]]) fail(box, box, pair[1]);
    });

    // [["profileRights", WARN + "Please select a usage rights option."],
    //  ["setupRights",   WARN + "Please select a usage rights option."]].forEach(function (pair) {
    //   var radios = form.querySelectorAll('input[name="' + pair[0] + '"]');
    //   if (!radios.length) return;
    //   var group = radios[0].closest(".field-group");
    //   if (group) {
    //     group.classList.remove("invalid");
    //     var f = group.querySelector(".field-error");
    //     if (f) f.classList.remove("show");
    //   }
    //   var checked = Array.prototype.some.call(radios, function (r) { return r.checked; });
    //   if (!checked) {
    //     ok = false;
    //     if (group) group.classList.add("invalid");
    //     fieldError(radios[0], pair[1]);
    //     if (!firstBad) firstBad = group || radios[0];
    //   }
    // });

    [
      ["profileRights", WARN + "Please select a usage rights option."],
      ["setupRights", WARN + "Please select a usage rights option."],
    ].forEach(function (pair) {
      var radios = form.querySelectorAll('input[name="' + pair[0] + '"]');
      if (!radios.length) return;
      var group = radios[0].closest(".field-group");
      if (group) {
        group.classList.remove("invalid");
        var f = group.querySelector(".field-error");
        if (f) f.classList.remove("show");
      }
      var checked = Array.prototype.some.call(radios, function (r) {
        return r.checked;
      });
      if (!checked) {
        ok = false;
        if (group) group.classList.add("invalid"); // <-- this line adds it
        fieldError(radios[0], pair[1]);
        if (!firstBad) firstBad = group || radios[0];
      }
    });

    var v1 = form.querySelector('[name="video1"]');
    if (v1) {
      v1.classList.remove("invalid");
      var vgrp = v1.closest(".field-group");
      if (vgrp) vgrp.classList.remove("invalid");
      clearFieldError(v1);
      var val = String(v1.value || "").trim();
      if (val && isYouTubeShorts(val)) {
        fail(
          v1,
          v1,
          WARN +
            "YouTube Shorts are not supported. Please use a full-length YouTube URL.",
        );
      }
    }

    if (firstBad && firstBad.scrollIntoView) {
      firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return ok;
  }

  form.addEventListener("input", function (e) {
    var el = e.target;
    if (el.classList && el.classList.contains("invalid")) {
      el.classList.remove("invalid");
      clearFieldError(el);
    }
    var grp = el.closest && el.closest(".field-group.invalid");
    if (grp) grp.classList.remove("invalid");
    if (el.type === "radio") {
      var g = el.closest(".field-group");
      if (g) {
        g.classList.remove("invalid");
        var f = g.querySelector(".field-error");
        if (f) f.classList.remove("show");
      }
    }
  });
  form.addEventListener("change", function (e) {
    var el = e.target;
    if (el.tagName === "SELECT") {
      if (el.value) {
        el.classList.remove("invalid");
        markSelectInvalid(el, false);
        var grp = el.closest(".field-group");
        if (grp) grp.classList.remove("invalid");
        clearFieldError(el);
      }
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validateForm()) return;

    if (alertBox) alertBox.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";

    (async function () {
      try {
        var fd = new FormData(form);
        var payload = Object.fromEntries(fd.entries());
        payload.artistType = fd.getAll("artistType");

        payload.artistType = fd.getAll("artistType");
        payload.role = fd.getAll("role");

        payload.cymbals = (selected.cymbals || []).map(function (p) {
          return { id: p.id, title: p.title, sku: p.sku };
        });

        // manual free-text cymbals: one per line, sent as {title} (no id)
        var manualEl = form.querySelector('[name="cymbalsManual"]');
        if (manualEl && manualEl.value.trim()) {
          var manualCymbals = manualEl.value
            .split("\n")
            .map(function (line) {
              return line.trim();
            })
            .filter(Boolean)
            .map(function (title) {
              return { title: title, manual: true };
            });
          payload.cymbals = payload.cymbals.concat(manualCymbals);
        }

        payload.gotos = (selected.gotos || []).map(function (p) {
          return { id: p.id, title: p.title };
        });
        if (files.profilePhoto)
          payload.profilePhoto = {
            name: files.profilePhoto.name,
            dataUrl: await toDataUrl(files.profilePhoto),
          };
        if (files.setupPhoto)
          payload.setupPhoto = {
            name: files.setupPhoto.name,
            dataUrl: await toDataUrl(files.setupPhoto),
          };

        var res = await fetch(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        var data = await res.json().catch(function () {
          return {};
        });
        if (!res.ok || (data && data.ok === false)) {
          throw new Error(
            (data && data.error) || "Server returned " + res.status,
          );
        }

        if (!openSuccessModal()) {
          showAlert(
            "success",
            "Thanks! Your profile was submitted and saved as a draft for review.",
          );
        }
        form.reset();
        resetAllPickers();
        root.querySelectorAll(".upload-box").forEach(function (b) {
          b.classList.remove("has-file");
          var ft = b.querySelector(".upload-file");
          if (ft) ft.textContent = "";
        });
        files = {};
        if (counter) counter.textContent = "0 / 400";
      } catch (err) {
        showAlert("error", "Couldn't submit: " + (err.message || err));
      }
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Profile";
    })();
  });
})();
