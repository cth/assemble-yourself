// Home screen and the educational "Learn" carousel. All copy comes from the
// i18n layer; the visual demos (DNA letters, arrows) are language-neutral.
(function () {
  "use strict";

  function T() { return window.I18N.t.apply(null, arguments); }
  function richP(key, cls, params) { var el = window.I18N.rich(key, params, "p"); if (cls) el.className = cls; return el; }
  function richLi(key) { return window.I18N.rich(key, null, "li"); }
  function calloutEl(key) { var el = window.I18N.rich(key, null, "div"); el.className = "callout"; return el; }

  function renderHome(app) {
    var h = window.h;
    app.innerHTML = "";
    app.appendChild(
      h("section", { class: "home" }, [
        h("div", { class: "hero" }, [
          h("div", { class: "hero-badge" }, ["🧬 " + T("home.badge")]),
          h("h1", {}, ["Assemble Yourself"]),
          richP("home.lede", "lede"),
          h("div", { class: "home-actions" }, [
            h("a", { class: "btn btn-primary", href: "#/learn" }, [T("home.start")]),
            h("a", { class: "btn", href: "#/play" }, [T("home.play")]),
            h("a", { class: "btn btn-ghost", href: "#/create" }, [T("home.create")])
          ])
        ]),
        h("div", { class: "home-cards" }, [
          card(h, "🔬", T("home.c1t"), T("home.c1b")),
          card(h, "🧩", T("home.c2t"), T("home.c2b")),
          card(h, "👩‍🏫", T("home.c3t"), T("home.c3b"))
        ]),
        h("p", { class: "home-note" }, [T("home.note")])
      ])
    );
  }

  function card(h, icon, title, body) {
    return h("div", { class: "card" }, [
      h("div", { class: "card-icon" }, [icon]),
      h("h3", {}, [title]),
      h("p", {}, [body])
    ]);
  }

  // ---- Learn carousel ------------------------------------------------------
  function renderLearn(app) {
    var h = window.h;
    var steps = learnSteps(h);
    var i = 0;

    app.innerHTML = "";
    var slide = h("div", { class: "slide" }, []);
    var dots = h("div", { class: "dots" }, steps.map(function (_, k) {
      return h("button", { class: "dot", "data-k": k, "aria-label": "Step " + (k + 1) }, []);
    }));
    var prev = h("button", { class: "btn btn-ghost" }, [T("learn.back")]);
    var next = h("button", { class: "btn btn-primary" }, [T("learn.next")]);

    app.appendChild(h("section", { class: "learn" }, [
      h("div", { class: "learn-card" }, [slide]),
      h("div", { class: "learn-nav" }, [prev, dots, next])
    ]));

    function show(k) {
      i = Math.max(0, Math.min(steps.length - 1, k));
      slide.innerHTML = "";
      slide.appendChild(steps[i].node);
      slide.scrollTop = 0;
      Array.prototype.forEach.call(dots.children, function (d, idx) { d.classList.toggle("active", idx === i); });
      prev.style.visibility = i === 0 ? "hidden" : "visible";
      next.textContent = i === steps.length - 1 ? T("learn.playCta") : T("learn.next");
      if (steps[i].onShow) steps[i].onShow();
    }

    prev.onclick = function () { show(i - 1); };
    next.onclick = function () { if (i === steps.length - 1) location.hash = "#/play"; else show(i + 1); };
    Array.prototype.forEach.call(dots.children, function (d) {
      d.onclick = function () { show(parseInt(d.getAttribute("data-k"), 10)); };
    });

    show(0);
  }

  function step(h, id, bodyNodes, onShow) {
    return {
      node: h("div", { class: "step" }, [
        h("div", { class: "kicker" }, [T(id + ".kicker")]),
        h("h2", {}, [T(id + ".title")])
      ].concat(bodyNodes)),
      onShow: onShow
    };
  }

  function learnSteps(h) {
    var steps = [];

    steps.push(step(h, "learn.s1", [
      richP("learn.s1.p1"), richP("learn.s1.p2"), calloutEl("learn.s1.callout")
    ]));

    steps.push(step(h, "learn.s2", [
      richP("learn.s2.p1"),
      h("div", { class: "dogma" }, [
        pill(h, T("learn.s2.dna"), T("learn.s2.dnaSub")),
        arrow(h, T("learn.s2.transcription")),
        pill(h, T("learn.s2.rna"), T("learn.s2.rnaSub")),
        arrow(h, T("learn.s2.translation")),
        pill(h, T("learn.s2.prot"), T("learn.s2.protSub"))
      ]),
      richP("learn.s2.p2")
    ]));

    steps.push(step(h, "learn.s3", [
      pWithBases(h, "learn.s3.p1"),
      richP("learn.s3.p2"),
      h("div", { class: "strands" }, [
        h("div", { class: "strand" }, [label(h, "5′"), seq(h, "A T G C A A C"), label(h, "3′")]),
        h("div", { class: "rungs" }, ["| | | | | | |"]),
        h("div", { class: "strand" }, [label(h, "3′"), seq(h, "T A C G T T G"), label(h, "5′")])
      ]),
      richP("learn.s3.p3", "small")
    ]));

    var out = h("div", { class: "translate-out" }, ["—"]);
    var inp = h("input", { class: "translate-in", type: "text", maxlength: "3", placeholder: "ATG", value: "ATG" }, []);
    steps.push(step(h, "learn.s4", [
      richP("learn.s4.p1"), richP("learn.s4.p2"),
      h("div", { class: "tryit" }, [
        h("span", {}, [T("learn.s4.tryLabel") + " "]), inp,
        h("span", { class: "translate-eq" }, ["→"]), out,
        h("span", { class: "small" }, [T("learn.s4.live")])
      ])
    ], function onShow() {
      var run = function () {
        var v = inp.value.toLowerCase().replace(/[^acgt]/g, "");
        if (v.length !== 3) { out.textContent = "—"; return; }
        window.Prolog.init().then(function () {
          return window.Prolog.queryOne("gc([" + v.split("").join(",") + "], AA).");
        }).then(function (r) {
          if (!r) { out.textContent = T("learn.s4.notCodon"); return; }
          out.textContent = r.AA === "stop" ? T("learn.s4.stop") : window.I18N.aaName(r.AA);
        });
      };
      inp.oninput = run; run();
    }));

    steps.push(step(h, "learn.s5", [
      richP("learn.s5.p1"), richP("learn.s5.p2"),
      h("div", { class: "frame-demo" }, [
        h("div", { class: "fd-seq" }, ["…c a ", h("b", {}, ["a t g"]), " ", h("b", {}, ["g g a"]), " ", h("b", {}, ["g a a"]), " ", h("b", {}, ["t a a"]), " g…"]),
        h("div", { class: "fd-aa" }, ["      ", h("b", {}, ["M"]), "     ", h("b", {}, ["G"]), "     ", h("b", {}, ["E"]), "    ", h("b", {}, ["*"])])
      ]),
      richP("learn.s5.caption", "small")
    ]));

    steps.push(step(h, "learn.s6", [
      richP("learn.s6.p1"),
      h("ul", { class: "bullets" }, [richLi("learn.s6.b1"), richLi("learn.s6.b2"), richLi("learn.s6.b3")]),
      h("div", { class: "coverage-demo" }, [
        h("div", { class: "cd-ref" }, ["ATGGGAGAAAACGAGTAA"]),
        h("div", { class: "cd-read", style: "margin-left:0ch" }, ["ATGGGAGA"]),
        h("div", { class: "cd-read", style: "margin-left:4ch" }, ["GAGAAAAC"]),
        h("div", { class: "cd-read", style: "margin-left:9ch" }, ["AACGAGTAA"])
      ])
    ]));

    steps.push(step(h, "learn.s7", [
      richP("learn.s7.p1"), richP("learn.s7.p2"),
      h("div", { class: "iupac-demo" }, [
        iupacRow(h, T("learn.s7.colReads"), "A  A  G  A"),
        iupacRow(h, T("learn.s7.consensus"), "A")
      ])
    ]));

    steps.push(step(h, "learn.s8", [
      richP("learn.s8.intro"),
      h("ol", { class: "howto" }, [richLi("learn.s8.li1"), richLi("learn.s8.li2"), richLi("learn.s8.li3"), richLi("learn.s8.li4")]),
      calloutEl("learn.s8.callout"),
      h("div", { style: "text-align:center;margin-top:18px" }, [
        h("a", { class: "btn btn-primary", href: "#/play" }, [T("learn.ready")])
      ])
    ]));

    return steps;
  }

  function pill(h, t, s) { return h("div", { class: "pill" }, [h("b", {}, [t]), h("span", {}, [s])]); }
  function arrow(h, t) { return h("div", { class: "arrow" }, ["→", h("small", {}, [t])]); }
  function label(h, t) { return h("span", { class: "endlabel" }, [t]); }
  function seq(h, t) { return h("span", { class: "seqline" }, [t]); }
  function iupacRow(h, name, val) { return h("div", { class: "iupac-line" }, [h("span", { class: "iupac-name" }, [name]), h("span", { class: "iupac-val" }, [val])]); }
  // Paragraph whose "A C G T" mention gets coloured base pills.
  function pWithBases(h, key) {
    var el = window.I18N.rich(key, null, "p");
    el.innerHTML = el.innerHTML.replace(/\bA C G T\b/,
      "<span class=\"base base-A\">A</span> <span class=\"base base-C\">C</span> <span class=\"base base-G\">G</span> <span class=\"base base-T\">T</span>");
    return el;
  }

  window.Intro = { renderHome: renderHome, renderLearn: renderLearn };
})();
