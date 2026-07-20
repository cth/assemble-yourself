// Home screen and the educational "Learn" carousel that introduces NGS, the
// central dogma, codons and how the concepts map onto the game board.
(function () {
  "use strict";

  function renderHome(app) {
    var h = window.h;
    app.innerHTML = "";
    app.appendChild(
      h("section", { class: "home" }, [
        h("div", { class: "hero" }, [
          h("div", { class: "hero-badge" }, ["🧬 bioinformatics puzzle"]),
          h("h1", {}, ["Assemble Yourself"]),
          h("p", { class: "lede" }, [
            "You are a bioinformatician. A stretch of bacterial DNA has been ",
            "sequenced into short, noisy reads. Piece the reads back together, ",
            "read the genetic code, and uncover the ",
            h("strong", {}, ["secret protein"]), " hidden inside the gene."
          ]),
          h("div", { class: "home-actions" }, [
            h("a", { class: "btn btn-primary", href: "#/learn" }, ["Start the tutorial"]),
            h("a", { class: "btn", href: "#/play" }, ["Play a puzzle"]),
            h("a", { class: "btn btn-ghost", href: "#/create" }, ["Create a class game"])
          ])
        ]),
        h("div", { class: "home-cards" }, [
          card(h, "🔬", "Learn the biology", "A quick, friendly primer on DNA, the central dogma, codons and next-generation sequencing."),
          card(h, "🧩", "Solve the puzzle", "Drag and flip reads until they align, watch the consensus sequence emerge, then translate the reading frames."),
          card(h, "👩‍🏫", "Share with a class", "Teachers can bury any word in a gene and share a single link. Everyone gets the same puzzle.")
        ]),
        h("p", { class: "home-note" }, [
          "Based on the printable board game by Christian Theil Have. ",
          "All genetics runs in your browser as Prolog."
        ])
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
      return h("button", { class: "dot", "data-k": k, "aria-label": "Go to step " + (k + 1) }, []);
    }));
    var prev = h("button", { class: "btn btn-ghost" }, ["← Back"]);
    var next = h("button", { class: "btn btn-primary" }, ["Next →"]);

    var wrap = h("section", { class: "learn" }, [
      h("div", { class: "learn-card" }, [slide]),
      h("div", { class: "learn-nav" }, [prev, dots, next])
    ]);
    app.appendChild(wrap);

    function show(k) {
      i = Math.max(0, Math.min(steps.length - 1, k));
      slide.innerHTML = "";
      slide.appendChild(steps[i].node);
      slide.scrollTop = 0;
      Array.prototype.forEach.call(dots.children, function (d, idx) {
        d.classList.toggle("active", idx === i);
      });
      prev.style.visibility = i === 0 ? "hidden" : "visible";
      next.textContent = i === steps.length - 1 ? "Play the puzzle →" : "Next →";
      if (steps[i].onShow) steps[i].onShow();
    }

    prev.onclick = function () { show(i - 1); };
    next.onclick = function () {
      if (i === steps.length - 1) { location.hash = "#/play"; }
      else { show(i + 1); }
    };
    Array.prototype.forEach.call(dots.children, function (d) {
      d.onclick = function () { show(parseInt(d.getAttribute("data-k"), 10)); };
    });

    show(0);
  }

  function step(h, title, kicker, bodyNodes, onShow) {
    return {
      node: h("div", { class: "step" }, [
        h("div", { class: "kicker" }, [kicker]),
        h("h2", {}, [title])
      ].concat(bodyNodes)),
      onShow: onShow
    };
  }

  function learnSteps(h) {
    var steps = [];

    steps.push(step(h, "The mission", "story", [
      h("p", {}, [
        "An interesting protein was found in the bacterium ",
        h("em", {}, ["S. Equencia"]), ". Does a similar gene exist in the related species ",
        h("em", {}, ["B. Ionformatica"]), "? A lab amplified the matching stretch of DNA and ran it through a sequencing machine."
      ]),
      h("p", {}, [
        "The sequencer did not hand back one clean sequence. It returned dozens of short, ",
        "overlapping fragments called ", h("strong", {}, ["reads"]),
        " — some of them with errors, some read off the opposite strand. Your job is to ",
        "reconstruct the original DNA and find the protein it encodes."
      ]),
      h("div", { class: "callout" }, [
        "This tutorial takes about two minutes. If you already know the central dogma, codons and NGS, jump straight to ",
        h("a", { href: "#/play" }, ["the puzzle"]), "."
      ])
    ]));

    steps.push(step(h, "The central dogma", "biology 101", [
      h("p", {}, [
        "Genetic information flows in one main direction. This is the ",
        h("strong", {}, ["central dogma"]), " of molecular biology:"
      ]),
      h("div", { class: "dogma" }, [
        pill(h, "DNA", "the stored blueprint"),
        arrow(h, "transcription"),
        pill(h, "RNA", "a working copy"),
        arrow(h, "translation"),
        pill(h, "Protein", "the molecular machine")
      ]),
      h("p", {}, [
        "In this game we work at the two ends: we reconstruct the ", h("strong", {}, ["DNA"]),
        " and then translate it directly into the ", h("strong", {}, ["protein"]),
        " to find the hidden word."
      ])
    ]));

    steps.push(step(h, "DNA, bases and two strands", "the alphabet", [
      h("p", {}, [
        "DNA is a long chain of four building blocks — the bases ",
        base(h, "A"), " ", base(h, "C"), " ", base(h, "G"), " ", base(h, "T"), "."
      ]),
      h("p", {}, [
        "DNA is double-stranded. The two strands run in opposite directions and pair up: ",
        h("strong", {}, ["A pairs with T"]), ", and ", h("strong", {}, ["C pairs with G"]),
        ". So one strand completely determines the other — its ",
        h("strong", {}, ["reverse complement"]), "."
      ]),
      h("div", { class: "strands" }, [
        h("div", { class: "strand" }, [label(h, "5′"), seq(h, "A T G C A A C"), label(h, "3′")]),
        h("div", { class: "rungs" }, ["| | | | | | |"]),
        h("div", { class: "strand" }, [label(h, "3′"), seq(h, "T A C G T T G"), label(h, "5′")])
      ]),
      h("p", { class: "small" }, [
        "That matters here because some reads come from the bottom strand. To line them up you may have to ",
        h("strong", {}, ["flip"]), " a read to its reverse complement."
      ])
    ]));

    var out = h("div", { class: "translate-out" }, ["—"]);
    var inp = h("input", { class: "translate-in", type: "text", maxlength: "3", placeholder: "e.g. ATG", value: "ATG" }, []);
    var codonStep = step(h, "Codons and the genetic code", "reading the message", [
      h("p", {}, [
        "The cell reads DNA three bases at a time. Each triplet — a ", h("strong", {}, ["codon"]),
        " — codes for one amino acid, the beads that make up a protein. ",
        "There are 64 codons for 20 amino acids, so the code is redundant."
      ]),
      h("p", {}, [
        h("strong", {}, ["ATG"]), " (Methionine, ", h("strong", {}, ["M"]), ") usually ",
        "starts a gene, and three codons (", h("strong", {}, ["TAA, TAG, TGA"]), ") are ",
        h("strong", {}, ["stop"]), " signals that end it."
      ]),
      h("div", { class: "tryit" }, [
        h("span", {}, ["Try it — type a codon: "]),
        inp,
        h("span", { class: "translate-eq" }, ["→"]),
        out,
        h("span", { class: "small" }, ["(translated live by Prolog)"])
      ])
    ], function onShow() {
      var run = function () {
        var v = inp.value.toLowerCase().replace(/[^acgt]/g, "");
        if (v.length !== 3) { out.textContent = "—"; return; }
        window.Prolog.init().then(function () {
          return window.Prolog.queryOne("gc([" + v.split("").join(",") + "], AA).");
        }).then(function (r) {
          if (!r) { out.textContent = "not a codon"; return; }
          out.textContent = r.AA === "stop" ? "STOP" : window.Game.aaName(r.AA);
        });
      };
      inp.oninput = run;
      run();
    });
    steps.push(codonStep);

    steps.push(step(h, "Genes and reading frames", "finding the signal", [
      h("p", {}, [
        "A gene is an ", h("strong", {}, ["open reading frame (ORF)"]),
        ": a start codon, then a run of amino-acid codons, then a stop codon — all in the same frame."
      ]),
      h("p", {}, [
        "Because you can start counting triplets at position 1, 2 or 3, every strand has ",
        h("strong", {}, ["three reading frames"]), ". With two strands that is ",
        h("strong", {}, ["six frames"]), " to check. Only one of them hides the intended gene."
      ]),
      h("div", { class: "frame-demo" }, [
        h("div", { class: "fd-seq" }, ["…c a ", h("b", {}, ["a t g"]), " ", h("b", {}, ["g g a"]), " ", h("b", {}, ["g a a"]), " ", h("b", {}, ["t a a"]), " g…"]),
        h("div", { class: "fd-aa" }, ["      ", h("b", {}, ["M"]), "     ", h("b", {}, ["G"]), "     ", h("b", {}, ["E"]), "    ", h("b", {}, ["*"])])
      ]),
      h("p", { class: "small" }, ["Read the amino acids between the start ", h("b", {}, ["M"]), " and the stop ", h("b", {}, ["*"]), " — that is your protein word."])
    ]));

    steps.push(step(h, "Next-generation sequencing", "why it's a puzzle", [
      h("p", {}, [
        "Sequencers can't read a long molecule end to end. Instead they read enormous numbers of short ",
        h("strong", {}, ["reads"]), " from random positions on both strands."
      ]),
      h("ul", { class: "bullets" }, [
        h("li", {}, [h("strong", {}, ["Coverage / depth:"]), " each position is read several times over. Comparing the overlapping reads lets you vote out mistakes."]),
        h("li", {}, [h("strong", {}, ["Read errors:"]), " roughly one base in twenty is wrong. A single read can't be trusted; the consensus of many can."]),
        h("li", {}, [h("strong", {}, ["Strand:"]), " a read may come from either strand, so some must be flipped to line up."])
      ]),
      h("div", { class: "coverage-demo" }, [
        h("div", { class: "cd-ref" }, ["ATGGGAGAAAACGAGTAA"]),
        h("div", { class: "cd-read", style: "margin-left:0ch" }, ["ATGGGAGA"]),
        h("div", { class: "cd-read", style: "margin-left:4ch" }, ["GAGAAAAC"]),
        h("div", { class: "cd-read", style: "margin-left:9ch" }, ["AACGAGTAA"])
      ])
    ]));

    steps.push(step(h, "Assembly and consensus", "putting it together", [
      h("p", {}, [
        "Assembly means sliding the reads against each other until their overlaps agree, ",
        "then reading down each column to get the ", h("strong", {}, ["consensus"]), " base."
      ]),
      h("p", {}, [
        "When reads in a column disagree, the majority usually wins. If it is a genuine tie, ",
        "biologists write an ", h("strong", {}, ["IUPAC ambiguity code"]), " — for example ",
        h("strong", {}, ["R"]), " means “A or G”. The game shows these automatically."
      ]),
      h("div", { class: "iupac-demo" }, [
        iupacRow(h, "column reads", "A  A  G  A"),
        iupacRow(h, "consensus", "A")
      ])
    ]));

    steps.push(step(h, "How the board works", "your tools", [
      h("p", {}, ["The puzzle screen has four parts, top to bottom:"]),
      h("ol", { class: "howto" }, [
        h("li", {}, [h("strong", {}, ["Reference row:"]), " the known primer bases at each end. Anchor your reads to these."]),
        h("li", {}, [h("strong", {}, ["Assembly area:"]), " drag each read left/right to align it. Hit ", h("b", {}, ["⟲ flip"]), " if a read belongs to the other strand. Green cells agree with the column; red cells disagree."]),
        h("li", {}, [h("strong", {}, ["Consensus row:"]), " built automatically from your alignment as you go."]),
        h("li", {}, [h("strong", {}, ["Translation:"]), " all six reading frames, computed by Prolog. Find the ", h("b", {}, ["M … *"]), " ORF and type the protein to win."])
      ]),
      h("div", { class: "callout" }, ["Stuck? The board has hint buttons and, for teachers, a full solution reveal."]),
      h("div", { style: "text-align:center;margin-top:18px" }, [
        h("a", { class: "btn btn-primary", href: "#/play" }, ["I'm ready — play →"])
      ])
    ]));

    return steps;
  }

  // small builders
  function pill(h, t, s) { return h("div", { class: "pill" }, [h("b", {}, [t]), h("span", {}, [s])]); }
  function arrow(h, t) { return h("div", { class: "arrow" }, ["→", h("small", {}, [t])]); }
  function base(h, b) { return h("span", { class: "base base-" + b }, [b]); }
  function label(h, t) { return h("span", { class: "endlabel" }, [t]); }
  function seq(h, t) { return h("span", { class: "seqline" }, [t]); }
  function iupacRow(h, name, val) {
    return h("div", { class: "iupac-line" }, [h("span", { class: "iupac-name" }, [name]), h("span", { class: "iupac-val" }, [val])]);
  }

  window.Intro = { renderHome: renderHome, renderLearn: renderLearn };
})();
