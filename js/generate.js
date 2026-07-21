// Puzzle generator. Given a secret protein word and a set of options it builds:
//   - a small genome (forward strand) with the protein's gene buried in it,
//   - a set of noisy NGS reads that cover the genome to a minimum depth, some
//     of which come from the reverse strand,
//   - the "solution" data used for checking answers and for the teacher preview.
//
// Generation is fully deterministic given (word, options, seed): the same shared
// link always reproduces the same puzzle. Randomness comes from a seeded PRNG,
// while the genetic-code lookups (which codons encode a letter, etc.) are
// answered by the Prolog engine.
(function () {
  "use strict";

  var VALID_AA = "acdefghiklmnpqrstvwy".split("");
  var BASES = ["a", "c", "g", "t"];

  // ---- seeded PRNG (mulberry32) -------------------------------------------
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashString(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function normalizeWord(word) {
    return (word || "").toLowerCase().replace(/[^a-z]/g, "").split("")
      .filter(function (c) { return VALID_AA.indexOf(c) !== -1; });
  }

  // Validate and report any invalid letters (letters that are not amino acids).
  function validateWord(word) {
    var raw = (word || "").toLowerCase().replace(/[^a-z]/g, "").split("");
    var bad = raw.filter(function (c) { return VALID_AA.indexOf(c) === -1; });
    var ok = normalizeWord(word);
    return { letters: ok, invalid: bad, length: ok.length };
  }

  // Main entry. Returns a promise of the puzzle object.
  function generate(word, options) {
    var opts = Object.assign({
      readLen: 10,
      minDepth: 3,
      errorRate: 0.06,
      reverseProb: 0.4,
      primerLen: 6,
      seed: null
    }, options || {});

    var letters = normalizeWord(word);
    if (letters.length < 1) {
      return Promise.reject(new Error("The secret word needs at least one valid amino-acid letter."));
    }

    var seed = opts.seed != null ? (opts.seed >>> 0)
      : hashString(letters.join("") + "|" + opts.readLen + "|" + opts.minDepth);
    var rng = makeRng(seed);

    function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
    function randInt(lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }

    return window.Prolog.init().then(function () {
      // Ask Prolog for the synonymous codons of every letter, plus stop codons.
      var goals = letters.map(function (aa, i) {
        return window.Prolog.queryOne("codons_for(" + aa + ", Cs).").then(function (r) {
          return { i: i, aa: aa, codons: r.Cs };
        });
      });
      goals.push(window.Prolog.queryOne("stop_codons(Cs).").then(function (r) {
        return { stop: r.Cs };
      }));
      return Promise.all(goals);
    }).then(function (parts) {
      var stopCodons = null;
      var codonByIndex = [];
      parts.forEach(function (p) {
        if (p.stop) { stopCodons = p.stop; }
        else { codonByIndex[p.i] = p.codons; }
      });

      // Build the open reading frame: ATG start (clear "M"), one codon per
      // letter (chosen among synonyms), then a stop codon.
      var orf = ["a", "t", "g"];
      var orfCodonStart = [0]; // base index within orf where each codon begins
      letters.forEach(function (aa, i) {
        var codon = pick(codonByIndex[i]);
        orfCodonStart.push(orf.length);
        orf = orf.concat(codon);
      });
      var stop = pick(stopCodons);
      orf = orf.concat(stop);

      // Flanks: random DNA on each side, with the outermost primerLen bases
      // acting as the (known) PCR primers.
      var leftLen = opts.primerLen + randInt(2, 6);
      var rightLen = opts.primerLen + randInt(2, 6);
      var leftFlank = randomDna(leftLen, pick);
      var rightFlank = randomDna(rightLen, pick);

      var genome = leftFlank.concat(orf, rightFlank);
      var orfStart = leftLen;
      var genomeLen = genome.length;

      // Reads with guaranteed minimum coverage.
      var reads = makeReads(genome, opts, rng, randInt);

      var forwardPrimer = genome.slice(0, opts.primerLen);
      var reversePrimerRegion = genome.slice(genomeLen - opts.primerLen);

      return window.Prolog.queryOne(
        "reverse_complement(" + window.Prolog.baseListLiteral(genome) + ", RC)."
      ).then(function (r) {
        return {
          seed: seed,
          options: opts,
          word: letters.join("").toUpperCase(),
          protein: letters,          // amino-acid atoms (the answer)
          genome: genome,            // forward-strand truth
          genomeRevComp: r.RC,
          genomeLen: genomeLen,
          orf: orf,
          orfStart: orfStart,
          orfEnd: orfStart + orf.length,
          forwardPrimer: forwardPrimer,
          reversePrimer: reversePrimerRegion,
          reads: reads
        };
      });
    });
  }

  function randomDna(n, pick) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(pick(BASES));
    return out;
  }

  // Greedy read sampling: always place the next read so it covers the leftmost
  // still-under-covered position. Guarantees full minimum-depth coverage with
  // overlapping reads, so the puzzle is always solvable.
  function makeReads(genome, opts, rng, randInt) {
    var genomeLen = genome.length;
    var readLen = Math.min(opts.readLen, genomeLen);
    var coverage = new Array(genomeLen).fill(0);
    var placements = [];
    var guard = 0;

    function firstUnder() {
      for (var i = 0; i < genomeLen; i++) if (coverage[i] < opts.minDepth) return i;
      return -1;
    }

    while (guard++ < 500) {
      var p = firstUnder();
      if (p === -1) break;
      // Anchor the read on the gap and let it extend mostly rightward, with a
      // small leftward jitter so consecutive reads overlap (needed for
      // assembly) without wastefully re-covering the same span.
      var jitter = randInt(0, Math.floor(readLen / 3));
      var start = Math.max(0, Math.min(p - jitter, genomeLen - readLen));
      placements.push(start);
      for (var k = start; k < start + readLen; k++) coverage[k]++;
    }

    // Turn placements into reads: pick a strand, orient, then add read errors.
    return placements.map(function (start, idx) {
      var segment = genome.slice(start, start + readLen);
      var reverse = rng() < opts.reverseProb;
      var oriented = reverse ? revComp(segment) : segment.slice();
      var mutated = oriented.map(function (b) {
        if (rng() < opts.errorRate) {
          var others = BASES.filter(function (x) { return x !== b; });
          return others[Math.floor(rng() * others.length)];
        }
        return b;
      });
      return {
        id: "r" + idx,
        bases: mutated,      // as printed on the paper strip
        truePos: start,      // where it really belongs (for solution/hints)
        trueReverse: reverse // whether it needs flipping (for solution/hints)
      };
    }).sort(function () { return rng() - 0.5; }) // shuffle the tray order
      .map(function (r, i) { r.id = "r" + i; return r; });
  }

  function revComp(seq) {
    var comp = { a: "t", t: "a", g: "c", c: "g" };
    return seq.slice().reverse().map(function (b) { return comp[b]; });
  }

  window.Generator = {
    generate: generate,
    validateWord: validateWord,
    VALID_AA: VALID_AA
  };
})();
