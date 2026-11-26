/* ============================================================
   Интерактивность плаката. Без библиотек.
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Утилиты ---------- */
  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $all(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function plural(n, one, few, many) {
    var mod10 = n % 10;
    var mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }

  function norm(value) {
    return String(value).toLowerCase().replace(/ё/g, "е");
  }

  /* ---------- Герои ---------- */
  var peopleGrid = $("#people-grid");

  function renderPeople() {
    if (!peopleGrid || !window.PEOPLE) return;

    peopleGrid.innerHTML = window.PEOPLE.map(function (person, index) {
      return (
        '<article class="person reveal" style="--i:' + index + '">' +
          '<button class="person__open" type="button" data-person="' + esc(person.id) + '" aria-haspopup="dialog">' +
            '<span class="person__media">' +
              '<img src="' + esc(person.portrait) + '" alt="' + esc(person.alt) + '" width="700" height="1000" loading="lazy">' +
              '<span class="person__index">0' + (index + 1) + '</span>' +
              '<span class="person__medal">Герой СССР</span>' +
            '</span>' +
            '<span class="person__body">' +
              '<span class="person__rank">' + esc(person.rank) + '</span>' +
              '<span class="person__name">' + esc(person.name) + '</span>' +
              '<span class="person__years">' + esc(person.years) + ' · ' + esc(person.shortPlace || person.place) + '</span>' +
              '<span class="person__line">' + esc(person.line) + '</span>' +
              '<span class="person__cta">Читать историю <span aria-hidden="true">↗</span></span>' +
            '</span>' +
          '</button>' +
        '</article>'
      );
    }).join("");

    $all(".person__open", peopleGrid).forEach(function (button) {
      button.addEventListener("click", function () {
        openPerson(button.getAttribute("data-person"));
      });
    });
  }

  /* ---------- Модальное окно ---------- */
  var dialog = $("#person-dialog");
  var modalImg = $("#modal-img");
  var modalCaption = $("#modal-caption");
  var modalRank = $("#modal-rank");
  var modalName = $("#modal-name");
  var modalYears = $("#modal-years");
  var modalContent = $("#modal-content");
  var modalSources = $("#modal-sources");

  function openPerson(id) {
    if (!dialog || !window.PEOPLE) return;

    var person = window.PEOPLE.filter(function (item) {
      return item.id === id;
    })[0];

    if (!person) return;

    modalImg.src = person.portrait;
    modalImg.alt = person.alt;
    modalCaption.textContent = person.caption;
    modalRank.textContent = person.rank;
    modalName.textContent = person.fullName;
    modalYears.textContent = person.dates + " · " + person.place;

    var html = person.bio.map(function (paragraph) {
      return "<p>" + esc(paragraph) + "</p>";
    }).join("");

    if (person.quote) {
      html +=
        '<blockquote class="modal__quote">' +
          "<p>«" + esc(person.quote.text) + "»</p>" +
          "<cite>" + esc(person.quote.cite) + "</cite>" +
        "</blockquote>";
    }

    html += '<h3>Коротко</h3><dl class="modal__facts">';
    person.facts.forEach(function (fact) {
      html += "<div><dt>" + esc(fact[0]) + "</dt><dd>" + esc(fact[1]) + "</dd></div>";
    });
    html += "</dl>";

    modalContent.innerHTML = html;

    modalSources.innerHTML = person.sources.map(function (source) {
      return '<a href="' + esc(source.url) + '" target="_blank" rel="noopener noreferrer">' +
        esc(source.title) + ' <span aria-hidden="true">↗</span></a>';
    }).join("");

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }

    document.body.classList.add("modal-open");
    dialog.scrollTop = 0;
  }

  function closeDialog() {
    if (!dialog) return;
    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
      document.body.classList.remove("modal-open");
    }
  }

  if (dialog) {
    $("#modal-close").addEventListener("click", closeDialog);

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeDialog();
    });

    dialog.addEventListener("close", function () {
      document.body.classList.remove("modal-open");
    });
  }

  /* ---------- Хроника ---------- */
  var timelineTrack = $("#timeline-track");
  var timelinePanel = $("#timeline-panel");

  function renderTimeline() {
    if (!timelineTrack || !timelinePanel || !window.TIMELINE) return;

    timelineTrack.innerHTML = window.TIMELINE.map(function (item, index) {
      return (
        '<button class="timeline__tab" type="button" role="tab" id="timeline-tab-' + index + '"' +
          ' aria-controls="timeline-panel" aria-selected="' + (index === 0) + '"' +
          ' tabindex="' + (index === 0 ? "0" : "-1") + '">' +
          '<span class="timeline__tab-year">' + esc(item.year) + "</span>" +
          '<span class="timeline__tab-label">' + esc(item.label) + "</span>" +
        "</button>"
      );
    }).join("");

    updateTimeline(0, false);

    $all(".timeline__tab", timelineTrack).forEach(function (tab, index) {
      tab.addEventListener("click", function () {
        updateTimeline(index, true);
      });

      tab.addEventListener("keydown", function (event) {
        var next = index;
        if (event.key === "ArrowRight") next = (index + 1) % window.TIMELINE.length;
        else if (event.key === "ArrowLeft") next = (index - 1 + window.TIMELINE.length) % window.TIMELINE.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = window.TIMELINE.length - 1;
        else return;

        event.preventDefault();
        updateTimeline(next, true);
        var nextTab = $("#timeline-tab-" + next);
        if (nextTab) nextTab.focus();
      });
    });
  }

  function updateTimeline(index, animate) {
    if (!window.TIMELINE || !window.TIMELINE[index]) return;
    var item = window.TIMELINE[index];

    $all(".timeline__tab", timelineTrack).forEach(function (tab, i) {
      var selected = i === index;
      tab.setAttribute("aria-selected", String(selected));
      tab.setAttribute("tabindex", selected ? "0" : "-1");
    });

    timelinePanel.innerHTML =
      '<p class="timeline__year">' + esc(item.date) + "</p>" +
      "<div><h3>" + esc(item.title) + "</h3><p>" + esc(item.text) + "</p></div>";

    if (animate && !reduceMotion) {
      timelinePanel.classList.remove("is-switching");
      void timelinePanel.offsetWidth;
      timelinePanel.classList.add("is-switching");
    }
  }

  /* ---------- Мемориал ---------- */
  var memorialTabs = $("#memorial-tabs");
  var memorialImage = $("#memorial-image");
  var memorialCaption = $("#memorial-caption");
  var memorialText = $("#memorial-text");
  var memorialWrap = $(".memorial__image-wrap");

  function renderMemorial() {
    if (!memorialTabs || !window.MEMORIAL) return;

    memorialTabs.innerHTML = window.MEMORIAL.map(function (item, index) {
      return (
        '<button class="memorial__tab" type="button" role="tab" id="memorial-tab-' + index + '"' +
          ' aria-controls="memorial-text" aria-selected="' + (index === 0) + '"' +
          ' tabindex="' + (index === 0 ? "0" : "-1") + '">' +
          "<span>" + esc(item.num) + "</span>" +
          "<strong>" + esc(item.tab) + "</strong>" +
        "</button>"
      );
    }).join("");

    updateMemorial(0, false);

    $all(".memorial__tab", memorialTabs).forEach(function (tab, index) {
      tab.addEventListener("click", function () {
        updateMemorial(index, true);
      });

      tab.addEventListener("keydown", function (event) {
        var next = index;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % window.MEMORIAL.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + window.MEMORIAL.length) % window.MEMORIAL.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = window.MEMORIAL.length - 1;
        else return;

        event.preventDefault();
        updateMemorial(next, true);
        var nextTab = $("#memorial-tab-" + next);
        if (nextTab) nextTab.focus();
      });
    });
  }

  function updateMemorial(index, animate) {
    if (!window.MEMORIAL || !window.MEMORIAL[index]) return;
    var item = window.MEMORIAL[index];

    $all(".memorial__tab", memorialTabs).forEach(function (tab, i) {
      var selected = i === index;
      tab.setAttribute("aria-selected", String(selected));
      tab.setAttribute("tabindex", selected ? "0" : "-1");
    });

    var apply = function () {
      memorialImage.src = item.img;
      memorialImage.alt = item.alt;
      memorialCaption.textContent = item.caption;
      memorialText.innerHTML =
        "<h3>" + esc(item.title) + "</h3>" +
        item.text.map(function (paragraph) {
          return "<p>" + esc(paragraph) + "</p>";
        }).join("");

      if (animate && !reduceMotion) {
        memorialWrap.classList.remove("is-switching");
        memorialText.classList.remove("is-switching");
        void memorialWrap.offsetWidth;
        memorialWrap.classList.add("is-switching");
        memorialText.classList.add("is-switching");
      }
    };

    if (animate && !reduceMotion) {
      memorialWrap.classList.add("is-switching");
      window.setTimeout(apply, 180);
      window.setTimeout(function () {
        memorialWrap.classList.remove("is-switching");
      }, 420);
    } else {
      apply();
    }
  }

  /* ---------- Цифры ---------- */
  var statsRoot = $("#stats");

  function renderStats() {
    if (!statsRoot || !window.STATS) return;

    statsRoot.innerHTML = window.STATS.map(function (stat, index) {
      var sourceHtml = stat.source.map(function (source) {
        return '<a href="' + esc(source.url) + '" target="_blank" rel="noopener noreferrer">' +
          esc(source.title) + "</a>";
      }).join(", ");

      return (
        '<article class="stat">' +
          '<button class="stat__head" type="button" aria-expanded="false" aria-controls="stat-body-' + index + '">' +
            '<span class="stat__value">' + esc(stat.value) + "</span>" +
            '<span class="stat__label"><strong>' + esc(stat.label) + "</strong>" + esc(stat.sub) + "</span>" +
            '<span class="stat__plus" aria-hidden="true"></span>' +
          "</button>" +
          '<div class="stat__body" id="stat-body-' + index + '">' +
            '<div class="stat__body-inner">' +
              "<p>" + esc(stat.text) + "</p>" +
              '<p class="stat__source">Источник: ' + sourceHtml + "</p>" +
            "</div>" +
          "</div>" +
        "</article>"
      );
    }).join("");

    $all(".stat__head", statsRoot).forEach(function (button) {
      button.addEventListener("click", function () {
        var expanded = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!expanded));
      });
    });
  }

  /* ---------- Книга памяти ---------- */
  var names = (window.MEMORIAL_NAMES || []).slice();
  var namesList = $("#names-list");
  var namesCount = $("#name-count");
  var namesCountLabel = $("#name-count-label");
  var namesShown = $("#names-shown");
  var searchInput = $("#name-search");
  var searchClear = $("#search-clear");
  var letterRoot = $("#letter-filter");
  var showMore = $("#show-more");
  var missingToggle = $("#missing-toggle");
  var missingPanel = $("#missing-panel");
  var missingList = $("#missing-list");
  var heroNamesCount = $("#hero-names-count");

  var PAGE_SIZE = 60;
  var state = { query: "", letter: "", shown: PAGE_SIZE };

  function getLetters() {
    var seen = {};
    var letters = [];

    names.forEach(function (name) {
      var first = norm(name.charAt(0));
      if (!seen[first]) {
        seen[first] = true;
        letters.push(name.charAt(0).toUpperCase());
      }
    });

    letters.sort(function (a, b) {
      return a.localeCompare(b, "ru");
    });

    return letters;
  }

  function renderLetters() {
    if (!letterRoot) return;

    var letters = getLetters();
    letterRoot.innerHTML =
      '<button class="letters__btn" type="button" data-letter="" aria-pressed="true">Все</button>' +
      letters.map(function (letter) {
        return '<button class="letters__btn" type="button" data-letter="' + esc(letter) + '" aria-pressed="false">' +
          esc(letter) + "</button>";
      }).join("");

    $all(".letters__btn", letterRoot).forEach(function (button) {
      button.addEventListener("click", function () {
        state.letter = button.getAttribute("data-letter");
        state.shown = PAGE_SIZE;
        $all(".letters__btn", letterRoot).forEach(function (item) {
          item.setAttribute("aria-pressed", String(item === button));
        });
        renderNames();
      });
    });
  }

  function filteredNames() {
    var query = norm(state.query.trim());

    return names.filter(function (name) {
      if (state.letter && norm(name.charAt(0)) !== norm(state.letter)) return false;
      if (query && norm(name).indexOf(query) === -1) return false;
      return true;
    });
  }

  function highlight(name) {
    var query = state.query.trim();
    if (!query) return esc(name);

    var index = norm(name).indexOf(norm(query));
    if (index === -1) return esc(name);

    return esc(name.slice(0, index)) +
      "<mark>" + esc(name.slice(index, index + query.length)) + "</mark>" +
      esc(name.slice(index + query.length));
  }

  function renderNames() {
    if (!namesList) return;

    var results = filteredNames();
    var visible = results.slice(0, state.shown);

    namesList.innerHTML = visible.length
      ? visible.map(function (name, index) {
          return "<li><span>" + String(index + 1).padStart(3, "0") +
            "</span>" + highlight(name) + "</li>";
        }).join("")
      : '<li class="names__empty">Ничего не найдено. Попробуйте другую фамилию или сбросьте фильтр.</li>';

    if (namesCount) namesCount.textContent = results.length;
    if (namesCountLabel) {
      namesCountLabel.textContent = plural(results.length, "имя", "имени", "имён");
    }

    if (showMore) {
      showMore.hidden = results.length <= state.shown;
    }

    if (namesShown) {
      if (!results.length) {
        namesShown.textContent = "Попробуйте изменить запрос.";
      } else if (results.length <= state.shown) {
        namesShown.textContent = "Показаны все " + results.length + " " +
          plural(results.length, "имя", "имени", "имён") + ".";
      } else {
        namesShown.textContent = "Показано " + visible.length + " из " + results.length + " имён.";
      }
    }

    if (searchClear) {
      searchClear.hidden = state.query.length === 0;
    }
  }

  function renderMissing() {
    if (!missingList || !window.MISSING) return;

    missingList.innerHTML = window.MISSING.map(function (name, index) {
      return "<li><span>" + String(index + 1).padStart(2, "0") + "</span>" + esc(name) + "</li>";
    }).join("");
  }

  function setupMemory() {
    if (!namesList) return;

    renderLetters();
    renderMissing();
    renderNames();

    if (heroNamesCount && names.length) {
      heroNamesCount.textContent = names.length;
    }

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        state.query = searchInput.value;
        state.shown = PAGE_SIZE;
        renderNames();
      });

      searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && searchInput.value) {
          searchInput.value = "";
          state.query = "";
          state.shown = PAGE_SIZE;
          renderNames();
        }
      });
    }

    if (searchClear) {
      searchClear.addEventListener("click", function () {
        if (!searchInput) return;
        searchInput.value = "";
        state.query = "";
        state.shown = PAGE_SIZE;
        renderNames();
        searchInput.focus();
      });
    }

    if (showMore) {
      showMore.addEventListener("click", function () {
        state.shown += PAGE_SIZE;
        renderNames();
      });
    }

    if (missingToggle && missingPanel) {
      missingToggle.addEventListener("click", function () {
        var open = missingToggle.getAttribute("aria-expanded") === "true";
        missingToggle.setAttribute("aria-expanded", String(!open));
        missingPanel.hidden = open;
        if (!open) {
          missingPanel.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "nearest"
          });
        }
      });
    }
  }

  /* ---------- Фильм ---------- */
  var filmPlayer = $("#film-player");
  var filmFacade = $("#film-facade");
  var playFilm = $("#play-film");

  function loadFilm() {
    if (!filmPlayer || filmPlayer.classList.contains("is-playing")) return;

    filmPlayer.classList.add("is-playing");

    var iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube-nocookie.com/embed/Audlp6MboPs?autoplay=1&rel=0";
    iframe.title = "Афганистан. Я помню. Документальный фильм киностудии «Беларусьфильм»";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.setAttribute("loading", "lazy");

    filmPlayer.appendChild(iframe);

    if (filmFacade && filmFacade.parentNode) filmFacade.parentNode.removeChild(filmFacade);

    var label = $(".film__label", filmPlayer);
    if (label && label.parentNode) label.parentNode.removeChild(label);
  }

  if (filmFacade) filmFacade.addEventListener("click", loadFilm);
  if (playFilm) playFilm.addEventListener("click", loadFilm);

  /* ---------- Прогресс и шапка ---------- */
  var progressBar = $("#progress-bar");
  var header = $("#site-header");
  var navLinks = $all(".nav a");
  var navSections = navLinks.map(function (link) {
    var id = link.getAttribute("href");
    return id && id.charAt(0) === "#" ? document.getElementById(id.slice(1)) : null;
  });

  var ticking = false;

  function onScroll() {
    var scrolled = window.scrollY || window.pageYOffset;
    var height = document.documentElement.scrollHeight - window.innerHeight;

    if (progressBar) {
      progressBar.style.width = (height > 0 ? (scrolled / height) * 100 : 0) + "%";
    }

    if (header) {
      header.classList.toggle("is-scrolled", scrolled > 24);
    }

    var activeIndex = -1;
    navSections.forEach(function (section, index) {
      if (!section) return;
      var rect = section.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.36 && rect.bottom > window.innerHeight * 0.36) {
        activeIndex = index;
      }
    });

    navLinks.forEach(function (link, index) {
      link.classList.toggle("is-active", index === activeIndex);
    });

    ticking = false;
  }

  function requestScroll() {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }

  window.addEventListener("scroll", requestScroll, { passive: true });
  window.addEventListener("resize", requestScroll);
  onScroll();

  /* ---------- Появление блоков ---------- */
  function setupReveal() {
    if (reduceMotion) return;

    var selectors = [
      ".section-head",
      ".intro__facts",
      ".timeline",
      ".memorial__layout",
      ".memorial__facts",
      ".memory__toolbar",
      ".letters",
      ".names",
      ".stats",
      ".film__grid",
      ".quote__inner",
      ".sources__list"
    ];

    selectors.forEach(function (selector) {
      $all(selector).forEach(function (block, index) {
        if (block.classList.contains("reveal")) return;
        block.classList.add("reveal");
        block.style.setProperty("--i", String(index % 4));
      });
    });

    var blocks = $all(".reveal");

    if (!("IntersectionObserver" in window)) {
      blocks.forEach(function (block) {
        block.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: "0px 0px -8% 0px"
    });

    blocks.forEach(function (block) {
      observer.observe(block);
    });
  }

  /* ---------- Запуск ---------- */
  renderPeople();
  renderTimeline();
  renderMemorial();
  renderStats();
  setupMemory();
  setupReveal();

  if (dialog) {
    dialog.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeDialog();
    });
  }
})();
