// The playable board and the teacher "create a class game" screen.
(function () {
  "use strict";

  var AA_NAMES = {
    a: "Alanine", c: "Cysteine", d: "Aspartate", e: "Glutamate", f: "Phenylalanine",
    g: "Glycine", h: "Histidine", i: "Isoleucine", k: "Lysine", l: "Leucine",
    m: "Methionine", n: "Asparagine", p: "Proline", q: "Glutamine", r: "Arginine",
    s: "Serine", t: "Threonine", v: "Valine", w: "Tryptophan", y: "Tyrosine"
  };
  function aaName(atom) { return AA_NAMES[atom] || atom; }

  // IUPAC complement map (handles ambiguity codes and gaps for reverse frames).
  var COMP = {
    a: "t", t: "a", g: "c", c: "g",
    r: "y", y: "r", s: "s", w: "w", k: "m", m: "k",
    b: "v", v: "b", d: "h", h: "d", n: "n", "-": "-", "?": "?"
  };
  // Base set of an IUPAC code (for consensus agreement colouring).
  var CODE_SET = {
    a: "a", c: "c", g: "g", t: "t",
    r: "ag", y: "ct", s: "cg", w: "at", k: "gt", m: "ac",
    b: "cgt", d: "agt", h: "act", v: "acg", n: "acgt"
  };
  var SET_CODE = {}; // sorted base-string -> code
  Object.keys(CODE_SET).forEach(function (code) {
    SET_CODE[CODE_SET[code].split("").sort().join("")] = code;
  });

  function jsRevComp(seq) {
    return seq.slice().reverse().map(function (b) { return COMP[b] || "?"; });
  }

  // ==========================================================================
  //  PLAY
  // ==========================================================================
  function renderPlay(app, config) {
    var h = window.h;
    app.innerHTML = "";
    app.appendChild(h("div", { class: "loading" }, ["Generating puzzle…"]));

    window.Generator.generate(config.word, config).then(function (puzzle) {
      buildBoard(app, puzzle);
    }).catch(function (err) {
      app.innerHTML = "";
      app.appendChild(h("div", { class: "error-box" }, [
        h("h2", {}, ["Could not build that puzzle"]),
        h("p", {}, [err.message]),
        h("a", { class: "btn", href: "#/play" }, ["Try the default puzzle"])
      ]));
    });
  }

  function buildBoard(app, puzzle) {
    var h = window.h;
    var CELL = 26;
    var L = puzzle.genomeLen;
    var primerLen = puzzle.options.primerLen;

    // per-read interactive state
    var reads = puzzle.reads.map(function (r) {
      return { id: r.id, bases: r.bases.slice(), truePos: r.truePos, trueReverse: r.trueReverse,
        offset: 0, reversed: false, len: r.bases.length };
    });

    var won = false;

    app.innerHTML = "";

    // ---- header ----
    var feedback = h("div", { class: "answer-feedback" }, []);
    var header = h("section", { class: "game-head" }, [
      h("div", {}, [
        h("h1", {}, ["Assemble the reads"]),
        h("p", { class: "sub" }, [
          "Reconstruct the DNA, then read the reading frames to find the hidden ",
          h("strong", {}, [String(puzzle.word.length)]), "-letter protein."
        ])
      ]),
      h("div", { class: "game-tools" }, [
        btn(h, "⟲ Reset alignment", function () { reads.forEach(function (r) { r.offset = 0; r.reversed = false; }); redrawAll(); }),
        btn(h, "💡 Nudge a read", nudge),
        btn(h, "✓ Check consensus", checkConsensus),
        btn(h, "🔑 Reveal solution", revealSolution, "btn-ghost")
      ])
    ]);
    app.appendChild(header);

    // ---- board ----
    var boardInner = h("div", { class: "board-inner", style: "width:" + (L * CELL) + "px" }, []);
    var boardScroll = h("div", { class: "board-scroll" }, [boardInner]);
    app.appendChild(h("section", { class: "board" }, [boardScroll]));

    // ruler
    var ruler = h("div", { class: "row ruler" }, []);
    for (var c = 0; c < L; c++) {
      ruler.appendChild(h("div", { class: "cell ruler-cell" }, [c % 5 === 0 ? String(c) : ""]));
    }

    // primer reference row
    var refRow = h("div", { class: "row ref-row" }, []);
    for (var rc = 0; rc < L; rc++) {
      var known = "";
      if (rc < primerLen) known = puzzle.forwardPrimer[rc];
      else if (rc >= L - primerLen) known = puzzle.reversePrimer[rc - (L - primerLen)];
      refRow.appendChild(h("div", { class: "cell ref-cell" + (known ? " known" : "") }, [known ? known.toUpperCase() : ""]));
    }

    boardInner.appendChild(h("div", { class: "row-label-wrap" }, [
      h("div", { class: "row-label" }, ["position"]), ruler
    ]));
    boardInner.appendChild(h("div", { class: "row-label-wrap" }, [
      h("div", { class: "row-label" }, ["primers"]), refRow
    ]));

    // reads
    var readsWrap = h("div", { class: "reads-wrap" }, []);
    var readEls = {};
    reads.forEach(function (r) {
      var track = h("div", { class: "row read-track", style: "width:" + (L * CELL) + "px" }, []);
      var strip = h("div", { class: "strip", "data-id": r.id }, []);
      track.appendChild(strip);
      readEls[r.id] = { strip: strip };
      var flip = h("button", { class: "flip-btn", title: "Flip to the other strand" }, ["⟲"]);
      flip.onclick = function () { r.reversed = !r.reversed; drawStrip(r); recompute(); };
      readsWrap.appendChild(h("div", { class: "row-label-wrap read-row" }, [
        h("div", { class: "row-label read-label" }, [flip]), track
      ]));
      makeDraggable(strip, r);
    });
    boardInner.appendChild(readsWrap);

    // depth + consensus
    var depthRow = h("div", { class: "row depth-row" }, []);
    var consRow = h("div", { class: "row cons-row" }, []);
    for (var dc = 0; dc < L; dc++) {
      depthRow.appendChild(h("div", { class: "cell depth-cell" }, [h("span", { class: "depth-bar" }, [])]));
      consRow.appendChild(h("div", { class: "cell cons-cell" }, [""]));
    }
    boardInner.appendChild(h("div", { class: "row-label-wrap" }, [h("div", { class: "row-label" }, ["depth"]), depthRow]));
    boardInner.appendChild(h("div", { class: "row-label-wrap" }, [h("div", { class: "row-label" }, ["consensus"]), consRow]));

    // ---- translation panel ----
    var translationPanel = h("div", { class: "translation" }, [h("div", { class: "loading small" }, ["…"])]);
    app.appendChild(h("section", { class: "panel" }, [
      h("h2", {}, ["Six-frame translation"]),
      h("p", { class: "sub" }, ["Computed from your consensus by Prolog. Look for a run from a start ", h("b", {}, ["M"]), " to a stop ", h("b", {}, ["*"]), " (highlighted)."]),
      h("div", { class: "translation-scroll" }, [translationPanel])
    ]));

    // ---- answer ----
    var answerInput = h("input", { class: "answer-in", type: "text", placeholder: "e.g. GENE", autocomplete: "off", spellcheck: "false" }, []);
    var answerBtn = btn(h, "Submit protein", submitAnswer, "btn-primary");
    answerInput.addEventListener("keydown", function (e) { if (e.key === "Enter") submitAnswer(); });
    app.appendChild(h("section", { class: "panel answer" }, [
      h("h2", {}, ["Your answer"]),
      h("p", { class: "sub" }, ["Type the amino-acid letters between the start and stop codons (one-letter codes, no leading M)."]),
      h("div", { class: "answer-row" }, [answerInput, answerBtn]),
      feedback
    ]));

    // ---- reference tables ----
    app.appendChild(referenceTables(h));

    // ---- behaviour ----
    var consensus = new Array(L).fill("-");

    function displayedBases(r) { return r.reversed ? jsRevComp(r.bases) : r.bases.slice(); }

    function drawStrip(r) {
      var el = readEls[r.id].strip;
      el.innerHTML = "";
      el.style.left = (r.offset * CELL) + "px";
      el.classList.toggle("reversed", r.reversed);
      var bs = displayedBases(r);
      bs.forEach(function (b, i) {
        var col = r.offset + i;
        var agree = consensus[col] && consensus[col] !== "-" &&
          (CODE_SET[consensus[col]] || consensus[col]).indexOf(b) !== -1;
        el.appendChild(h("div", { class: "cell base-cell " + (agree ? "agree" : "clash") }, [b.toUpperCase()]));
      });
    }

    function computeConsensus() {
      for (var col = 0; col < L; col++) {
        var counts = { a: 0, c: 0, g: 0, t: 0 };
        var n = 0;
        // known primers count as (strong) evidence
        if (col < primerLen) { counts[puzzle.forwardPrimer[col]] += 2; n += 2; }
        else if (col >= L - primerLen) { counts[puzzle.reversePrimer[col - (L - primerLen)]] += 2; n += 2; }
        reads.forEach(function (r) {
          if (col >= r.offset && col < r.offset + r.len) {
            var b = displayedBases(r)[col - r.offset];
            if (counts[b] !== undefined) { counts[b]++; n++; }
          }
        });
        if (n === 0) { consensus[col] = "-"; continue; }
        var max = Math.max(counts.a, counts.c, counts.g, counts.t);
        var winners = ["a", "c", "g", "t"].filter(function (b) { return counts[b] === max; });
        consensus[col] = winners.length === 1 ? winners[0] : (SET_CODE[winners.sort().join("")] || "n");
      }
    }

    function drawConsensusAndDepth() {
      for (var col = 0; col < L; col++) {
        var depthCell = depthRow.children[col];
        var count = 0;
        reads.forEach(function (r) { if (col >= r.offset && col < r.offset + r.len) count++; });
        var bar = depthCell.firstChild;
        bar.style.height = Math.min(100, count * 22) + "%";
        bar.className = "depth-bar" + (count === 0 ? " empty" : count < 2 ? " low" : " ok");
        depthCell.title = count + "× coverage";

        var cc = consRow.children[col];
        cc.textContent = consensus[col] === "-" ? "" : consensus[col].toUpperCase();
        cc.className = "cell cons-cell" + (consensus[col] === "-" ? " empty" : /[acgt]/.test(consensus[col]) ? " sure" : " ambig");
      }
    }

    var translateTimer = null;
    function recompute() {
      computeConsensus();
      reads.forEach(drawStrip);
      drawConsensusAndDepth();
      clearTimeout(translateTimer);
      translateTimer = setTimeout(updateTranslation, 180);
    }

    function redrawAll() { reads.forEach(function (r) { readEls[r.id].strip.style.left = (r.offset * CELL) + "px"; }); recompute(); }

    function updateTranslation() {
      var fwd = consensus.map(function (x) { return x === "-" ? "?" : x; });
      var rev = jsRevComp(fwd);
      var frames = [
        { label: "5′→3′ frame 1", strand: "f", offset: 0, seq: fwd },
        { label: "5′→3′ frame 2", strand: "f", offset: 1, seq: fwd },
        { label: "5′→3′ frame 3", strand: "f", offset: 2, seq: fwd },
        { label: "3′→5′ frame 1", strand: "r", offset: 0, seq: rev },
        { label: "3′→5′ frame 2", strand: "r", offset: 1, seq: rev },
        { label: "3′→5′ frame 3", strand: "r", offset: 2, seq: rev }
      ];
      Promise.all(frames.map(function (fr) {
        var slice = fr.seq.slice(fr.offset);
        return window.Prolog.queryOne("translate([" + slice.join(",") + "], AAs).")
          .then(function (res) { fr.aas = (res && res.AAs) || []; return fr; });
      })).then(function (done) {
        renderTranslation(done);
      });
    }

    function renderTranslation(frames) {
      translationPanel.innerHTML = "";
      frames.forEach(function (fr) {
        var cells = new Array(L).fill(null);
        var orf = orfMask(fr.aas); // which amino-acid indices are inside an M..* ORF
        fr.aas.forEach(function (aa, k) {
          var centerF;
          if (fr.strand === "f") centerF = fr.offset + 3 * k + 1;
          else centerF = (L - 1) - (fr.offset + 3 * k + 1);
          if (centerF < 0 || centerF >= L) return;
          cells[centerF] = { aa: aa, orf: orf[k] };
        });
        var row = h("div", { class: "row tl-row" }, []);
        for (var col = 0; col < L; col++) {
          var cell = cells[col];
          var letter = cell ? (cell.aa === "stop" ? "*" : cell.aa === "?" ? "·" : cell.aa.toUpperCase()) : "";
          var cls = "cell tl-cell";
          if (cell && cell.orf) cls += " orf";
          if (cell && cell.aa === "stop") cls += " stop";
          if (cell && cell.aa === "m") cls += " start";
          row.appendChild(h("div", { class: cls }, [letter]));
        }
        translationPanel.appendChild(h("div", { class: "tl-line" }, [
          h("div", { class: "tl-label" }, [fr.label]),
          h("div", { class: "tl-track", style: "width:" + (L * CELL) + "px" }, [row])
        ]));
      });
    }

    // Mark amino acids that lie strictly between a start M and the next stop.
    function orfMask(aas) {
      var mask = new Array(aas.length).fill(false);
      var i = 0;
      while (i < aas.length) {
        if (aas[i] === "m") {
          var j = i + 1;
          while (j < aas.length && aas[j] !== "stop" && aas[j] !== "?") j++;
          if (j < aas.length && aas[j] === "stop") {
            for (var k = i; k <= j; k++) mask[k] = true;
            i = j + 1; continue;
          }
        }
        i++;
      }
      return mask;
    }

    // ---- dragging ----
    function makeDraggable(strip, r) {
      var dragging = false, startX = 0, startOffset = 0;
      strip.addEventListener("pointerdown", function (e) {
        if (won) return;
        dragging = true; startX = e.clientX; startOffset = r.offset;
        strip.setPointerCapture(e.pointerId);
        strip.classList.add("dragging");
      });
      strip.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        var delta = Math.round((e.clientX - startX) / CELL);
        var no = Math.max(0, Math.min(startOffset + delta, L - r.len));
        if (no !== r.offset) { r.offset = no; strip.style.left = (no * CELL) + "px"; }
      });
      function end(e) {
        if (!dragging) return;
        dragging = false; strip.classList.remove("dragging");
        try { strip.releasePointerCapture(e.pointerId); } catch (x) {}
        recompute();
      }
      strip.addEventListener("pointerup", end);
      strip.addEventListener("pointercancel", end);
    }

    // ---- helpers/actions ----
    function nudge() {
      if (won) return;
      var wrong = reads.filter(function (r) { return r.offset !== r.truePos || r.reversed !== r.trueReverse; });
      if (!wrong.length) { flash(feedback, "Every read is already correctly placed!", "ok"); return; }
      var r = wrong[0];
      r.offset = r.truePos; r.reversed = r.trueReverse;
      readEls[r.id].strip.style.left = (r.offset * CELL) + "px";
      recompute();
      flash(feedback, "Placed one read for you. " + (wrong.length - 1) + " still to align.", "hint");
    }

    function checkConsensus() {
      var wrongCols = 0, covered = 0;
      for (var col = 0; col < L; col++) {
        if (consensus[col] === "-") continue;
        covered++;
        var set = CODE_SET[consensus[col]] || consensus[col];
        if (set.indexOf(puzzle.genome[col]) === -1) wrongCols++;
      }
      if (covered < L) flash(feedback, covered + " of " + L + " columns covered. Keep aligning reads to fill the gaps.", "hint");
      else if (wrongCols === 0) flash(feedback, "Consensus matches the true sequence at every column. Now translate and read off the protein!", "ok");
      else flash(feedback, wrongCols + " column(s) disagree with a clean assembly — check your alignment there.", "warn");
    }

    function revealSolution() {
      reads.forEach(function (r) { r.offset = r.truePos; r.reversed = r.trueReverse; readEls[r.id].strip.style.left = (r.offset * CELL) + "px"; });
      recompute();
      flash(feedback, "Solution revealed. The hidden protein is " + puzzle.word + ".", "hint");
    }

    function submitAnswer() {
      var guess = answerInput.value.toUpperCase().replace(/[^A-Z]/g, "");
      if (!guess) { flash(feedback, "Type the protein's one-letter codes first.", "warn"); return; }
      if (guess === puzzle.word) {
        won = true;
        flash(feedback, "🎉 Correct! You uncovered " + puzzle.word + ". Eternal bioinformatics fame is yours.", "win");
      } else if (("M" + guess) === "M" + puzzle.word) {
        flash(feedback, "Drop the leading M — report only the amino acids after the start codon.", "warn");
      } else {
        flash(feedback, "Not the hidden protein yet. Refine your alignment, rebuild the consensus and re-read the frames.", "warn");
      }
    }

    recompute();
  }

  function flash(node, msg, kind) {
    node.className = "answer-feedback show " + (kind || "");
    node.textContent = msg;
  }

  // ==========================================================================
  //  CREATE (teacher)
  // ==========================================================================
  function renderCreate(app) {
    var h = window.h;
    app.innerHTML = "";

    var wordIn = h("input", { class: "big-in", type: "text", value: "GENE", placeholder: "A word made of amino-acid letters" }, []);
    var depthIn = h("input", { type: "number", min: "2", max: "6", value: "3" }, []);
    var readIn = h("input", { type: "number", min: "6", max: "14", value: "10" }, []);
    var seedIn = h("input", { type: "text", placeholder: "(optional) fixed seed", value: "" }, []);
    var validityNote = h("div", { class: "validity" }, []);
    var linkBox = h("div", { class: "link-box" }, []);
    var preview = h("div", { class: "solution-preview" }, []);

    function currentConfig() {
      var seedRaw = seedIn.value.trim();
      var cfg = {
        word: wordIn.value,
        minDepth: clampInt(depthIn.value, 2, 6, 3),
        readLen: clampInt(readIn.value, 6, 14, 10),
        errorRate: 0.06
      };
      if (seedRaw) cfg.seed = hashSeed(seedRaw);
      return cfg;
    }

    function refreshValidity() {
      var v = window.Generator.validateWord(wordIn.value);
      validityNote.innerHTML = "";
      if (v.invalid.length) {
        validityNote.className = "validity warn";
        validityNote.appendChild(document.createTextNode(
          "Skipping letters that are not amino acids: " + v.invalid.join(", ").toUpperCase() +
          ". Usable letters: " + (v.letters.join("").toUpperCase() || "(none)") + "."));
      } else if (v.letters.length) {
        validityNote.className = "validity ok";
        validityNote.appendChild(document.createTextNode(
          v.letters.length + " amino acids: " + v.letters.join("").toUpperCase() + "."));
      } else {
        validityNote.className = "validity warn";
        validityNote.appendChild(document.createTextNode("Enter a word using the 20 amino-acid letters (no B, J, O, U, X, Z)."));
      }
      return v;
    }

    function generateLink() {
      var v = refreshValidity();
      if (!v.letters.length) { linkBox.innerHTML = ""; preview.innerHTML = ""; return; }
      var cfg = currentConfig();
      var url = window.Share.buildLink(cfg);

      linkBox.innerHTML = "";
      var urlField = h("input", { class: "url-field", type: "text", readonly: "readonly", value: url }, []);
      var copyBtn = btn(h, "Copy link", function () {
        urlField.select();
        navigator.clipboard && navigator.clipboard.writeText(url);
        copyBtn.textContent = "Copied!";
        setTimeout(function () { copyBtn.textContent = "Copy link"; }, 1500);
      }, "btn-primary");
      linkBox.appendChild(h("label", {}, ["Shareable link (the word is hidden inside the link)"]));
      linkBox.appendChild(h("div", { class: "url-row" }, [urlField, copyBtn]));
      linkBox.appendChild(h("div", { class: "link-actions" }, [
        h("a", { class: "btn", href: url }, ["Open the puzzle"]),
      ]));

      buildSolutionPreview(preview, cfg);
    }

    wordIn.addEventListener("input", refreshValidity);
    [wordIn, depthIn, readIn, seedIn].forEach(function (el) {
      el.addEventListener("change", generateLink);
    });

    app.appendChild(h("section", { class: "create" }, [
      h("h1", {}, ["Create a class game"]),
      h("p", { class: "sub" }, [
        "Bury any word inside a gene and share one link with your students. ",
        "The word is only made of the 20 amino-acid letters: ",
        h("code", {}, ["A C D E F G H I K L M N P Q R S T V W Y"]), "."
      ]),
      h("div", { class: "form-grid" }, [
        field(h, "Secret word", wordIn),
        field(h, "Minimum coverage depth", depthIn),
        field(h, "Read length", readIn),
        field(h, "Seed (optional)", seedIn)
      ]),
      validityNote,
      h("div", { class: "create-actions" }, [ btn(h, "Generate link & preview", generateLink, "btn-primary") ]),
      linkBox,
      preview
    ]));

    refreshValidity();
    generateLink();
  }

  function buildSolutionPreview(node, cfg) {
    var h = window.h;
    node.innerHTML = "";
    node.appendChild(h("div", { class: "loading small" }, ["Building solution preview…"]));
    window.Generator.generate(cfg.word, cfg).then(function (p) {
      node.innerHTML = "";
      node.appendChild(h("h2", {}, ["Teacher solution (keep hidden from students)"]));
      node.appendChild(h("div", { class: "sol-grid" }, [
        solItem(h, "Hidden protein", p.word),
        solItem(h, "Genome length", String(p.genomeLen) + " bp"),
        solItem(h, "Number of reads", String(p.reads.length)),
        solItem(h, "Coverage depth", String(cfg.minDepth) + "×")
      ]));
      node.appendChild(h("div", { class: "sol-seq" }, [
        h("span", { class: "sol-seq-label" }, ["Forward strand: "]),
        h("code", {}, [p.genome.join("").toUpperCase()])
      ]));
      node.appendChild(h("div", { class: "sol-seq" }, [
        h("span", { class: "sol-seq-label" }, ["Gene (ORF): "]),
        h("code", {}, [
          p.orf.slice(0, 3).join("").toUpperCase(), " ",
          p.orf.slice(3, p.orf.length - 3).join("").toUpperCase(), " ",
          p.orf.slice(p.orf.length - 3).join("").toUpperCase()
        ]),
        h("span", { class: "small" }, [" (start · protein · stop)"])
      ]));
      node.appendChild(h("div", { class: "print-hint small" }, ["Tip: use your browser's Print to keep a paper copy of this solution."]));
    }).catch(function (e) {
      node.innerHTML = "";
      node.appendChild(h("p", { class: "validity warn" }, [e.message]));
    });
  }

  // ==========================================================================
  //  shared bits
  // ==========================================================================
  function referenceTables(h) {
    var codons = [
      ["TTT F", "TCT S", "TAT Y", "TGT C"], ["TTC F", "TCC S", "TAC Y", "TGC C"],
      ["TTA L", "TCA S", "TAA *", "TGA *"], ["TTG L", "TCG S", "TAG *", "TGG W"],
      ["CTT L", "CCT P", "CAT H", "CGT R"], ["CTC L", "CCC P", "CAC H", "CGC R"],
      ["CTA L", "CCA P", "CAA Q", "CGA R"], ["CTG L", "CCG P", "CAG Q", "CGG R"],
      ["ATT I", "ACT T", "AAT N", "AGT S"], ["ATC I", "ACC T", "AAC N", "AGC S"],
      ["ATA I", "ACA T", "AAA K", "AGA R"], ["ATG M", "ACG T", "AAG K", "AGG R"],
      ["GTT V", "GCT A", "GAT D", "GGT G"], ["GTC V", "GCC A", "GAC D", "GGC G"],
      ["GTA V", "GCA A", "GAA E", "GGA G"], ["GTG V", "GCG A", "GAG E", "GGG G"]
    ];
    var grid = h("div", { class: "codon-grid" }, codons.map(function (row) {
      return h("div", { class: "codon-row" }, row.map(function (c) {
        var parts = c.split(" ");
        return h("div", { class: "codon" + (parts[1] === "*" ? " stopc" : parts[0] === "ATG" ? " startc" : "") }, [
          h("b", {}, [parts[0]]), h("span", {}, [parts[1]])
        ]);
      }));
    }));

    var iupac = [["R", "A/G"], ["Y", "C/T"], ["S", "C/G"], ["W", "A/T"], ["K", "G/T"], ["M", "A/C"],
      ["B", "C/G/T"], ["D", "A/G/T"], ["H", "A/C/T"], ["V", "A/C/G"], ["N", "any"]];
    var iupacTable = h("table", { class: "iupac-table" }, [
      h("tbody", {}, iupac.map(function (r) { return h("tr", {}, [h("td", {}, [r[0]]), h("td", {}, [r[1]])]); }))
    ]);

    return h("details", { class: "reference" }, [
      h("summary", {}, ["Reference: genetic code & IUPAC codes"]),
      h("div", { class: "reference-body" }, [
        h("div", {}, [h("h3", {}, ["Standard genetic code"]), grid]),
        h("div", {}, [h("h3", {}, ["IUPAC ambiguity codes"]), iupacTable])
      ])
    ]);
  }

  function btn(h, label, onclick, cls) {
    var b = h("button", { class: "btn " + (cls || "") }, [label]);
    b.onclick = onclick;
    return b;
  }
  function field(h, label, input) {
    return h("label", { class: "field" }, [h("span", {}, [label]), input]);
  }
  function solItem(h, k, v) { return h("div", { class: "sol-item" }, [h("span", {}, [k]), h("b", {}, [v])]); }
  function clampInt(v, lo, hi, dflt) { var n = parseInt(v, 10); if (isNaN(n)) return dflt; return Math.max(lo, Math.min(hi, n)); }
  function hashSeed(str) { var h = 2166136261 >>> 0; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  window.Game = {
    renderPlay: renderPlay,
    renderCreate: renderCreate,
    aaName: aaName
  };
})();
