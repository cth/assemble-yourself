// Internationalisation layer. Holds one dictionary per locale, a t() lookup
// with {placeholder} interpolation and English fallback, a tiny inline-markup
// parser (so translations can contain **bold**, _italic_, ==highlight== and
// [links](#/hash)), and the current-locale state persisted in localStorage.
(function () {
  "use strict";

  var LOCALE_ORDER = ["en", "fr", "es", "da", "de", "it"];
  var LOCALE_NAMES = { en: "English", fr: "Français", es: "Español", da: "Dansk", de: "Deutsch", it: "Italiano" };
  var STORAGE_KEY = "ay-locale";
  var current = "en";
  var listeners = [];

  // -- amino-acid full names per locale (one-letter codes are international) --
  var AA = {
    en: { a: "Alanine", c: "Cysteine", d: "Aspartate", e: "Glutamate", f: "Phenylalanine", g: "Glycine", h: "Histidine", i: "Isoleucine", k: "Lysine", l: "Leucine", m: "Methionine", n: "Asparagine", p: "Proline", q: "Glutamine", r: "Arginine", s: "Serine", t: "Threonine", v: "Valine", w: "Tryptophan", y: "Tyrosine" },
    fr: { a: "Alanine", c: "Cystéine", d: "Aspartate", e: "Glutamate", f: "Phénylalanine", g: "Glycine", h: "Histidine", i: "Isoleucine", k: "Lysine", l: "Leucine", m: "Méthionine", n: "Asparagine", p: "Proline", q: "Glutamine", r: "Arginine", s: "Sérine", t: "Thréonine", v: "Valine", w: "Tryptophane", y: "Tyrosine" },
    es: { a: "Alanina", c: "Cisteína", d: "Aspartato", e: "Glutamato", f: "Fenilalanina", g: "Glicina", h: "Histidina", i: "Isoleucina", k: "Lisina", l: "Leucina", m: "Metionina", n: "Asparagina", p: "Prolina", q: "Glutamina", r: "Arginina", s: "Serina", t: "Treonina", v: "Valina", w: "Triptófano", y: "Tirosina" },
    da: { a: "Alanin", c: "Cystein", d: "Aspartat", e: "Glutamat", f: "Phenylalanin", g: "Glycin", h: "Histidin", i: "Isoleucin", k: "Lysin", l: "Leucin", m: "Methionin", n: "Asparagin", p: "Prolin", q: "Glutamin", r: "Arginin", s: "Serin", t: "Threonin", v: "Valin", w: "Tryptofan", y: "Tyrosin" },
    de: { a: "Alanin", c: "Cystein", d: "Aspartat", e: "Glutamat", f: "Phenylalanin", g: "Glycin", h: "Histidin", i: "Isoleucin", k: "Lysin", l: "Leucin", m: "Methionin", n: "Asparagin", p: "Prolin", q: "Glutamin", r: "Arginin", s: "Serin", t: "Threonin", v: "Valin", w: "Tryptophan", y: "Tyrosin" },
    it: { a: "Alanina", c: "Cisteina", d: "Aspartato", e: "Glutammato", f: "Fenilalanina", g: "Glicina", h: "Istidina", i: "Isoleucina", k: "Lisina", l: "Leucina", m: "Metionina", n: "Asparagina", p: "Prolina", q: "Glutammina", r: "Arginina", s: "Serina", t: "Treonina", v: "Valina", w: "Triptofano", y: "Tirosina" }
  };

  var DICT = {
    en: {
      nav: { learn: "Learn", play: "Play", create: "Class game", source: "Source" },
      langLabel: "Language",
      home: {
        badge: "bioinformatics puzzle",
        lede: "You are a bioinformatician. A stretch of bacterial DNA has been sequenced into short, noisy reads. Piece the reads back together, read the genetic code, and uncover the **secret protein** hidden inside the gene.",
        start: "Start the tutorial", play: "Play a puzzle", create: "Create a class game",
        c1t: "Learn the biology", c1b: "A quick, friendly primer on DNA, the central dogma, codons and next-generation sequencing.",
        c2t: "Solve the puzzle", c2b: "Drag and flip reads until they align, watch the consensus sequence emerge, then translate the reading frames.",
        c3t: "Share with a class", c3b: "Teachers can bury any word in a gene and share a single link. Everyone gets the same puzzle.",
        note: "Based on the printable board game by Christian Theil Have. All genetics runs in your browser as Prolog."
      },
      learn: {
        back: "← Back", next: "Next →", playCta: "Play the puzzle →", ready: "I'm ready — play →",
        s1: { kicker: "story", title: "The mission",
          p1: "An interesting protein was found in the bacterium _S. Equencia_. Does a similar gene exist in the related species _B. Ionformatica_? A lab amplified the matching stretch of DNA and ran it through a sequencing machine.",
          p2: "The sequencer did not hand back one clean sequence. It returned dozens of short, overlapping fragments called **reads** — some of them with errors, some read off the opposite strand. Your job is to reconstruct the original DNA and find the protein it encodes.",
          callout: "This tutorial takes about two minutes. If you already know the central dogma, codons and NGS, jump straight to [the puzzle](#/play)." },
        s2: { kicker: "biology 101", title: "The central dogma",
          p1: "Genetic information flows in one main direction. This is the **central dogma** of molecular biology:",
          dna: "DNA", dnaSub: "the stored blueprint", rna: "RNA", rnaSub: "a working copy", prot: "Protein", protSub: "the molecular machine",
          transcription: "transcription", translation: "translation",
          p2: "In this game we work at the two ends: we reconstruct the **DNA** and then translate it directly into the **protein** to find the hidden word." },
        s3: { kicker: "the alphabet", title: "DNA, bases and two strands",
          p1: "DNA is a long chain of four building blocks — the bases A C G T.",
          p2: "DNA is double-stranded. The two strands run in opposite directions and pair up: **A pairs with T**, and **C pairs with G**. So one strand completely determines the other — its **reverse complement**.",
          p3: "That matters here because some reads come from the bottom strand. To line them up you may have to **flip** a read to its reverse complement." },
        s4: { kicker: "reading the message", title: "Codons and the genetic code",
          p1: "The cell reads DNA three bases at a time. Each triplet — a **codon** — codes for one amino acid, the beads that make up a protein. There are 64 codons for 20 amino acids, so the code is redundant.",
          p2: "**ATG** (Methionine, **M**) usually starts a gene, and three codons (**TAA, TAG, TGA**) are **stop** signals that end it.",
          tryLabel: "Try it — type a codon:", live: "(translated live by Prolog)", notCodon: "not a codon", stop: "STOP" },
        s5: { kicker: "finding the signal", title: "Genes and reading frames",
          p1: "A gene is an **open reading frame (ORF)**: a start codon, then a run of amino-acid codons, then a stop codon — all in the same frame.",
          p2: "Because you can start counting triplets at position 1, 2 or 3, every strand has **three reading frames**. With two strands that is **six frames** to check. Only one of them hides the intended gene.",
          caption: "Read the amino acids between the start **M** and the stop **\\*** — that is your protein word." },
        s6: { kicker: "why it's a puzzle", title: "Next-generation sequencing",
          p1: "Sequencers can't read a long molecule end to end. Instead they read enormous numbers of short **reads** from random positions on both strands.",
          b1: "**Coverage / depth:** each position is read several times over. Comparing the overlapping reads lets you vote out mistakes.",
          b2: "**Read errors:** roughly one base in twenty is wrong. A single read can't be trusted; the consensus of many can.",
          b3: "**Strand:** a read may come from either strand, so some must be flipped to line up." },
        s7: { kicker: "putting it together", title: "Assembly and consensus",
          p1: "Assembly means sliding the reads against each other until their overlaps agree, then reading down each column to get the **consensus** base.",
          p2: "When reads in a column disagree, the majority usually wins. If it is a genuine tie, biologists write an **IUPAC ambiguity code** — for example **R** means “A or G”. The game shows these automatically.",
          colReads: "column reads", consensus: "consensus" },
        s8: { kicker: "your tools", title: "How the board works",
          intro: "The puzzle screen has four parts, top to bottom:",
          li1: "**Reference row:** the known primer bases at each end. Anchor your reads to these.",
          li2: "**Assembly area:** drag each read left/right to align it. Hit **⟲ flip** if a read belongs to the other strand. Green cells agree with the column; red cells disagree.",
          li3: "**Consensus row:** built automatically from your alignment as you go.",
          li4: "**Translation:** all six reading frames, computed by Prolog. Find the **M … \\*** ORF and type the protein to win.",
          callout: "Stuck? The board has hint buttons and, for teachers, a full solution reveal." }
      },
      game: {
        loading: "Generating puzzle…", errTitle: "Could not build that puzzle", errBack: "Try the default puzzle",
        title: "Assemble the reads",
        sub: "Reconstruct the DNA, then read the reading frames to find the hidden **{n}**-letter protein.",
        reset: "⟲ Reset alignment", nudge: "💡 Nudge a read", check: "✓ Check consensus", reveal: "🔑 Reveal solution", paper: "🖨 Paper version", flip: "Flip to the other strand",
        lblPosition: "position", lblPrimers: "primers", lblDepth: "depth", lblConsensus: "consensus",
        tlTitle: "Six-frame translation",
        tlSub: "Computed from your consensus by Prolog. Look for a run from a start **M** to a stop **\\*** (highlighted).",
        frameF: "5′→3′ frame {n}", frameR: "3′→5′ frame {n}",
        answerTitle: "Your answer",
        answerSub: "Type the amino-acid letters between the start and stop codons (one-letter codes, no leading M).",
        answerPh: "e.g. GENE", submit: "Submit protein",
        fbEmpty: "Type the protein's one-letter codes first.",
        fbWin: "🎉 Correct! You uncovered {word}. Eternal bioinformatics fame is yours.",
        fbDropM: "Drop the leading M — report only the amino acids after the start codon.",
        fbWrong: "Not the hidden protein yet. Refine your alignment, rebuild the consensus and re-read the frames.",
        fbNudged: "Placed one read for you. {n} still to align.",
        fbAllPlaced: "Every read is already correctly placed!",
        fbCovered: "{c} of {L} columns covered. Keep aligning reads to fill the gaps.",
        fbConsOk: "Consensus matches the true sequence at every column. Now translate and read off the protein!",
        fbConsWrong: "{n} column(s) disagree with a clean assembly — check your alignment there.",
        fbRevealed: "Solution revealed. The hidden protein is {word}.",
        refSummary: "Reference: genetic code & IUPAC codes", refCode: "Standard genetic code", refIupac: "IUPAC ambiguity codes"
      },
      create: {
        title: "Create a class game",
        sub: "Bury any word inside a gene and share one link with your students. The word is only made of the 20 amino-acid letters:",
        fWord: "Secret word", fDepth: "Minimum coverage depth", fRead: "Read length", fSeed: "Seed (optional)",
        seedPh: "(optional) fixed seed",
        vInvalid: "Skipping letters that are not amino acids: {bad}. Usable letters: {ok}.",
        vOk: "{n} amino acids: {letters}.",
        vEmpty: "Enter a word using the 20 amino-acid letters (no B, J, O, U, X, Z).",
        generate: "Generate link & preview",
        linkLabel: "Shareable link (the word is hidden inside the link)",
        copy: "Copy link", copied: "Copied!", open: "Open the puzzle", paper: "🖨 Printable paper version",
        solTitle: "Teacher solution (keep hidden from students)",
        solProtein: "Hidden protein", solLen: "Genome length", solReads: "Number of reads", solDepth: "Coverage depth",
        bp: "bp", forward: "Forward strand:", gene: "Gene (ORF):", geneNote: "(start · protein · stop)",
        tip: "Tip: use your browser's Print to keep a paper copy of this solution.",
        building: "Building solution preview…"
      },
      print: {
        building: "Building the printable game…", errTitle: "Could not build that puzzle",
        printBtn: "🖨 Print / Save as PDF", back: "← Back to the online game",
        tip: "Tip: enable “Background graphics” in the print dialog; choose landscape for long genomes.",
        title: "Assemble Yourself",
        subtitle: "A pen-and-paper NGS assembly puzzle. Print this, grab scissors, and reconstruct the gene.",
        mission: "The mission",
        story1: "An interesting protein with amino-acid sequence =={mutant}== was found in the bacterium _S. Equencia_. Does a **homologue** exist in the related species _B. Ionformatica_?",
        story2: "A lab amplified the matching region of _B. Ionformatica_ DNA with primers flanking the gene and sequenced it, yielding **{n}** short reads. About one base in twenty is a read error, and reads may come from either strand. The supercomputer is down — assemble them by hand!",
        task: "**Your task:** cut out the reads, align them on the scaffold (flip a strip over to read the other strand), write the consensus sequence, then translate the reading frames to find the homologous protein and how it differs from =={mutant}==.",
        readsHeading: "Reads — cut these out", readLabel: "read {n}",
        scaffoldTitle: "Assembly scaffold",
        scaffoldInstr: "Place your cut-out reads in the alignment area so overlapping bases agree. The shaded end cells are the known primer bases — anchor your reads to them. Then write the consensus and translate.",
        frameF: "frame +{n}", frameR: "frame −{n}",
        rowForward: "forward 5′→3′", rowReverse: "reverse 3′→5′", rowAlignment: "alignment",
        refTitle: "Reference tables", refCode: "Standard genetic code (table 11)", refIupac: "IUPAC codes", iupacAny: "any base",
        solTitle: "Solution — for the game master only",
        solAnswerLbl: "Hidden protein (the answer):", solRefLbl: "Reference protein shown in the story:",
        solRefNote: "(differs from the answer by the mutated residues)",
        forward: "Forward strand:", gene: "Gene (ORF):", geneNote: "(start · protein · stop)",
        alignTitle: "Read alignment", consensus: "consensus", read: "read"
      }
    }
  };

  // ---- FRENCH ----
  DICT.fr = {
    nav: { learn: "Apprendre", play: "Jouer", create: "Jeu de classe", source: "Source" },
    langLabel: "Langue",
    home: {
      badge: "énigme bio-informatique",
      lede: "Vous êtes bio-informaticien·ne. Un fragment d'ADN bactérien a été séquencé en courtes lectures bruitées. Reconstituez les lectures, lisez le code génétique et découvrez la **protéine secrète** cachée dans le gène.",
      start: "Commencer le tutoriel", play: "Jouer une énigme", create: "Créer un jeu de classe",
      c1t: "Apprendre la biologie", c1b: "Une introduction simple à l'ADN, au dogme central, aux codons et au séquençage nouvelle génération.",
      c2t: "Résoudre l'énigme", c2b: "Glissez et retournez les lectures jusqu'à l'alignement, voyez émerger la séquence consensus, puis traduisez les cadres de lecture.",
      c3t: "Partager avec une classe", c3b: "Les enseignants peuvent enfouir n'importe quel mot dans un gène et partager un seul lien. Tout le monde a la même énigme.",
      note: "D'après le jeu de plateau imprimable de Christian Theil Have. Toute la génétique s'exécute dans votre navigateur en Prolog."
    },
    learn: {
      back: "← Retour", next: "Suivant →", playCta: "Jouer l'énigme →", ready: "Je suis prêt·e — jouer →",
      s1: { kicker: "histoire", title: "La mission",
        p1: "Une protéine intéressante a été trouvée chez la bactérie _S. Equencia_. Un gène similaire existe-t-il chez l'espèce voisine _B. Ionformatica_ ? Un laboratoire a amplifié la portion d'ADN correspondante et l'a passée dans un séquenceur.",
        p2: "Le séquenceur n'a pas rendu une séquence propre. Il a renvoyé des dizaines de courts fragments qui se chevauchent, les **lectures** — certaines avec des erreurs, d'autres lues sur le brin opposé. À vous de reconstruire l'ADN d'origine et de trouver la protéine qu'il code.",
        callout: "Ce tutoriel dure environ deux minutes. Si vous connaissez déjà le dogme central, les codons et le NGS, passez directement à [l'énigme](#/play)." },
      s2: { kicker: "b.a.-ba de la biologie", title: "Le dogme central",
        p1: "L'information génétique circule dans un sens principal. C'est le **dogme central** de la biologie moléculaire :",
        dna: "ADN", dnaSub: "le plan stocké", rna: "ARN", rnaSub: "une copie de travail", prot: "Protéine", protSub: "la machine moléculaire",
        transcription: "transcription", translation: "traduction",
        p2: "Dans ce jeu, on travaille aux deux extrémités : on reconstruit l'**ADN** puis on le traduit directement en **protéine** pour trouver le mot caché." },
      s3: { kicker: "l'alphabet", title: "ADN, bases et deux brins",
        p1: "L'ADN est une longue chaîne de quatre briques — les bases A C G T.",
        p2: "L'ADN est bicaténaire. Les deux brins sont antiparallèles et s'apparient : **A s'apparie avec T**, et **C avec G**. Un brin détermine donc entièrement l'autre — son **complément inverse**.",
        p3: "C'est important ici, car certaines lectures proviennent du brin inférieur. Pour les aligner, il faudra parfois **retourner** une lecture en son complément inverse." },
      s4: { kicker: "lire le message", title: "Codons et code génétique",
        p1: "La cellule lit l'ADN par groupes de trois bases. Chaque triplet — un **codon** — code un acide aminé, les perles qui composent une protéine. Il y a 64 codons pour 20 acides aminés : le code est redondant.",
        p2: "**ATG** (Méthionine, **M**) démarre en général un gène, et trois codons (**TAA, TAG, TGA**) sont des signaux **stop** qui le terminent.",
        tryLabel: "Essayez — tapez un codon :", live: "(traduit en direct par Prolog)", notCodon: "pas un codon", stop: "STOP" },
      s5: { kicker: "trouver le signal", title: "Gènes et cadres de lecture",
        p1: "Un gène est un **cadre de lecture ouvert (ORF)** : un codon start, puis une suite de codons d'acides aminés, puis un codon stop — tous dans le même cadre.",
        p2: "Comme on peut commencer à compter les triplets en position 1, 2 ou 3, chaque brin a **trois cadres de lecture**. Avec deux brins, cela fait **six cadres** à vérifier. Un seul cache le gène recherché.",
        caption: "Lisez les acides aminés entre le start **M** et le stop **\\*** — c'est votre mot-protéine." },
      s6: { kicker: "pourquoi c'est une énigme", title: "Séquençage nouvelle génération",
        p1: "Les séquenceurs ne peuvent pas lire une longue molécule d'un bout à l'autre. Ils lisent d'énormes quantités de courtes **lectures** à des positions aléatoires sur les deux brins.",
        b1: "**Couverture / profondeur :** chaque position est lue plusieurs fois. Comparer les lectures qui se chevauchent permet d'écarter les erreurs par vote.",
        b2: "**Erreurs de lecture :** environ une base sur vingt est fausse. Une seule lecture n'est pas fiable ; le consensus de plusieurs l'est.",
        b3: "**Brin :** une lecture peut venir de l'un ou l'autre brin ; il faut donc en retourner certaines pour les aligner." },
      s7: { kicker: "assembler le tout", title: "Assemblage et consensus",
        p1: "Assembler, c'est faire glisser les lectures les unes contre les autres jusqu'à ce que leurs chevauchements concordent, puis lire chaque colonne pour obtenir la base **consensus**.",
        p2: "Quand les lectures d'une colonne divergent, la majorité l'emporte le plus souvent. En cas d'égalité réelle, les biologistes écrivent un **code d'ambiguïté IUPAC** — par exemple **R** signifie « A ou G ». Le jeu les affiche automatiquement.",
        colReads: "lectures de la colonne", consensus: "consensus" },
      s8: { kicker: "vos outils", title: "Comment fonctionne le plateau",
        intro: "L'écran de l'énigme comporte quatre parties, de haut en bas :",
        li1: "**Ligne de référence :** les bases d'amorce connues à chaque extrémité. Ancrez-y vos lectures.",
        li2: "**Zone d'assemblage :** glissez chaque lecture à gauche/droite pour l'aligner. Appuyez sur **⟲ retourner** si une lecture appartient à l'autre brin. Les cases vertes concordent avec la colonne ; les rouges non.",
        li3: "**Ligne consensus :** construite automatiquement à partir de votre alignement.",
        li4: "**Traduction :** les six cadres de lecture, calculés par Prolog. Trouvez l'ORF **M … \\*** et tapez la protéine pour gagner.",
        callout: "Bloqué ? Le plateau a des boutons d'indice et, pour les enseignants, une révélation complète de la solution." }
    },
    game: {
      loading: "Génération de l'énigme…", errTitle: "Impossible de construire cette énigme", errBack: "Essayer l'énigme par défaut",
      title: "Assemblez les lectures",
      sub: "Reconstruisez l'ADN, puis lisez les cadres de lecture pour trouver la protéine cachée de **{n}** lettres.",
      reset: "⟲ Réinitialiser l'alignement", nudge: "💡 Placer une lecture", check: "✓ Vérifier le consensus", reveal: "🔑 Révéler la solution", paper: "🖨 Version papier", flip: "Retourner sur l'autre brin",
      lblPosition: "position", lblPrimers: "amorces", lblDepth: "profondeur", lblConsensus: "consensus",
      tlTitle: "Traduction en six cadres",
      tlSub: "Calculée à partir de votre consensus par Prolog. Cherchez une suite d'un start **M** à un stop **\\*** (surlignée).",
      frameF: "5′→3′ cadre {n}", frameR: "3′→5′ cadre {n}",
      answerTitle: "Votre réponse",
      answerSub: "Tapez les lettres d'acides aminés entre les codons start et stop (codes à une lettre, sans le M initial).",
      answerPh: "ex. GENE", submit: "Valider la protéine",
      fbEmpty: "Tapez d'abord les codes à une lettre de la protéine.",
      fbWin: "🎉 Correct ! Vous avez découvert {word}. La gloire éternelle en bio-informatique est à vous.",
      fbDropM: "Enlevez le M initial — indiquez seulement les acides aminés après le codon start.",
      fbWrong: "Ce n'est pas encore la protéine cachée. Affinez votre alignement, reconstruisez le consensus et relisez les cadres.",
      fbNudged: "Une lecture placée pour vous. Il en reste {n} à aligner.",
      fbAllPlaced: "Toutes les lectures sont déjà correctement placées !",
      fbCovered: "{c} colonnes couvertes sur {L}. Continuez d'aligner les lectures pour combler les trous.",
      fbConsOk: "Le consensus correspond à la vraie séquence dans chaque colonne. Traduisez maintenant et lisez la protéine !",
      fbConsWrong: "{n} colonne(s) ne concordent pas avec un assemblage propre — vérifiez votre alignement à cet endroit.",
      fbRevealed: "Solution révélée. La protéine cachée est {word}.",
      refSummary: "Référence : code génétique et codes IUPAC", refCode: "Code génétique standard", refIupac: "Codes d'ambiguïté IUPAC"
    },
    create: {
      title: "Créer un jeu de classe",
      sub: "Enfouissez n'importe quel mot dans un gène et partagez un seul lien avec vos élèves. Le mot n'utilise que les 20 lettres d'acides aminés :",
      fWord: "Mot secret", fDepth: "Profondeur de couverture minimale", fRead: "Longueur de lecture", fSeed: "Graine (optionnelle)",
      seedPh: "(optionnel) graine fixe",
      vInvalid: "Lettres ignorées car non acides aminés : {bad}. Lettres utilisables : {ok}.",
      vOk: "{n} acides aminés : {letters}.",
      vEmpty: "Saisissez un mot avec les 20 lettres d'acides aminés (sans B, J, O, U, X, Z).",
      generate: "Générer le lien et l'aperçu",
      linkLabel: "Lien à partager (le mot est caché dans le lien)",
      copy: "Copier le lien", copied: "Copié !", open: "Ouvrir l'énigme", paper: "🖨 Version papier imprimable",
      solTitle: "Solution enseignant (à cacher des élèves)",
      solProtein: "Protéine cachée", solLen: "Longueur du génome", solReads: "Nombre de lectures", solDepth: "Profondeur de couverture",
      bp: "pb", forward: "Brin sens :", gene: "Gène (ORF) :", geneNote: "(start · protéine · stop)",
      tip: "Astuce : utilisez l'impression de votre navigateur pour garder une copie papier de cette solution.",
      building: "Génération de l'aperçu de la solution…"
    },
    print: {
      building: "Génération du jeu imprimable…", errTitle: "Impossible de construire cette énigme",
      printBtn: "🖨 Imprimer / Enregistrer en PDF", back: "← Retour au jeu en ligne",
      tip: "Astuce : activez « Graphiques d'arrière-plan » dans la boîte d'impression ; choisissez le paysage pour les longs génomes.",
      title: "Assemble Yourself",
      subtitle: "Une énigme d'assemblage NGS sur papier. Imprimez ceci, prenez des ciseaux et reconstruisez le gène.",
      mission: "La mission",
      story1: "Une protéine intéressante de séquence en acides aminés =={mutant}== a été trouvée chez la bactérie _S. Equencia_. Un **homologue** existe-t-il chez l'espèce voisine _B. Ionformatica_ ?",
      story2: "Un laboratoire a amplifié la région correspondante de l'ADN de _B. Ionformatica_ avec des amorces flanquant le gène et l'a séquencée, produisant **{n}** courtes lectures. Environ une base sur vingt est une erreur de lecture, et les lectures peuvent venir de l'un ou l'autre brin. Le supercalculateur est en panne — assemblez à la main !",
      task: "**Votre tâche :** découpez les lectures, alignez-les sur le plateau (retournez une bande pour lire l'autre brin), écrivez la séquence consensus, puis traduisez les cadres de lecture pour trouver la protéine homologue et en quoi elle diffère de =={mutant}==.",
      readsHeading: "Lectures — à découper", readLabel: "lecture {n}",
      scaffoldTitle: "Plateau d'assemblage",
      scaffoldInstr: "Placez vos lectures découpées dans la zone d'alignement pour que les bases qui se chevauchent concordent. Les cases grisées aux extrémités sont les bases d'amorce connues — ancrez-y vos lectures. Écrivez ensuite le consensus et traduisez.",
      frameF: "cadre +{n}", frameR: "cadre −{n}",
      rowForward: "sens 5′→3′", rowReverse: "antisens 3′→5′", rowAlignment: "alignement",
      refTitle: "Tables de référence", refCode: "Code génétique standard (table 11)", refIupac: "Codes IUPAC", iupacAny: "toute base",
      solTitle: "Solution — pour le maître du jeu uniquement",
      solAnswerLbl: "Protéine cachée (la réponse) :", solRefLbl: "Protéine de référence montrée dans l'histoire :",
      solRefNote: "(diffère de la réponse par les résidus mutés)",
      forward: "Brin sens :", gene: "Gène (ORF) :", geneNote: "(start · protéine · stop)",
      alignTitle: "Alignement des lectures", consensus: "consensus", read: "lecture"
    }
  };

  // ---- SPANISH ----
  DICT.es = {
    nav: { learn: "Aprender", play: "Jugar", create: "Juego de clase", source: "Código" },
    langLabel: "Idioma",
    home: {
      badge: "rompecabezas bioinformático",
      lede: "Eres bioinformático·a. Un tramo de ADN bacteriano se ha secuenciado en lecturas cortas y ruidosas. Vuelve a unir las lecturas, lee el código genético y descubre la **proteína secreta** oculta en el gen.",
      start: "Empezar el tutorial", play: "Jugar un rompecabezas", create: "Crear un juego de clase",
      c1t: "Aprende la biología", c1b: "Una introducción sencilla al ADN, el dogma central, los codones y la secuenciación de nueva generación.",
      c2t: "Resuelve el rompecabezas", c2b: "Arrastra y voltea lecturas hasta alinearlas, observa cómo surge la secuencia consenso y traduce los marcos de lectura.",
      c3t: "Comparte con una clase", c3b: "El profesorado puede esconder cualquier palabra en un gen y compartir un único enlace. Todos reciben el mismo rompecabezas.",
      note: "Basado en el juego de mesa imprimible de Christian Theil Have. Toda la genética se ejecuta en tu navegador como Prolog."
    },
    learn: {
      back: "← Atrás", next: "Siguiente →", playCta: "Jugar el rompecabezas →", ready: "Estoy listo·a — jugar →",
      s1: { kicker: "historia", title: "La misión",
        p1: "Se encontró una proteína interesante en la bacteria _S. Equencia_. ¿Existe un gen similar en la especie emparentada _B. Ionformatica_? Un laboratorio amplificó el tramo de ADN correspondiente y lo pasó por un secuenciador.",
        p2: "El secuenciador no devolvió una secuencia limpia. Devolvió decenas de fragmentos cortos y solapados llamados **lecturas** — algunas con errores, otras leídas de la hebra opuesta. Tu tarea es reconstruir el ADN original y hallar la proteína que codifica.",
        callout: "Este tutorial dura unos dos minutos. Si ya conoces el dogma central, los codones y la NGS, ve directo al [rompecabezas](#/play)." },
      s2: { kicker: "biología básica", title: "El dogma central",
        p1: "La información genética fluye en una dirección principal. Es el **dogma central** de la biología molecular:",
        dna: "ADN", dnaSub: "el plano almacenado", rna: "ARN", rnaSub: "una copia de trabajo", prot: "Proteína", protSub: "la máquina molecular",
        transcription: "transcripción", translation: "traducción",
        p2: "En este juego trabajamos en los dos extremos: reconstruimos el **ADN** y luego lo traducimos directamente a la **proteína** para hallar la palabra oculta." },
      s3: { kicker: "el alfabeto", title: "ADN, bases y dos hebras",
        p1: "El ADN es una larga cadena de cuatro piezas — las bases A C G T.",
        p2: "El ADN es bicatenario. Las dos hebras van en sentidos opuestos y se emparejan: **A con T**, y **C con G**. Así, una hebra determina por completo la otra — su **complemento inverso**.",
        p3: "Esto importa aquí porque algunas lecturas vienen de la hebra inferior. Para alinearlas quizá tengas que **voltear** una lectura a su complemento inverso." },
      s4: { kicker: "leer el mensaje", title: "Codones y código genético",
        p1: "La célula lee el ADN de tres bases en tres. Cada triplete — un **codón** — codifica un aminoácido, las cuentas que forman una proteína. Hay 64 codones para 20 aminoácidos, así que el código es redundante.",
        p2: "**ATG** (Metionina, **M**) suele iniciar un gen, y tres codones (**TAA, TAG, TGA**) son señales de **stop** que lo terminan.",
        tryLabel: "Pruébalo — escribe un codón:", live: "(traducido en vivo por Prolog)", notCodon: "no es un codón", stop: "STOP" },
      s5: { kicker: "hallar la señal", title: "Genes y marcos de lectura",
        p1: "Un gen es un **marco de lectura abierto (ORF)**: un codón de inicio, luego una serie de codones de aminoácidos, y un codón de stop — todos en el mismo marco.",
        p2: "Como puedes empezar a contar tripletes en la posición 1, 2 o 3, cada hebra tiene **tres marcos de lectura**. Con dos hebras son **seis marcos** que revisar. Solo uno esconde el gen buscado.",
        caption: "Lee los aminoácidos entre el inicio **M** y el stop **\\*** — esa es tu palabra-proteína." },
      s6: { kicker: "por qué es un reto", title: "Secuenciación de nueva generación",
        p1: "Los secuenciadores no pueden leer una molécula larga de extremo a extremo. Leen enormes cantidades de **lecturas** cortas en posiciones aleatorias de ambas hebras.",
        b1: "**Cobertura / profundidad:** cada posición se lee varias veces. Comparar las lecturas solapadas permite descartar errores por mayoría.",
        b2: "**Errores de lectura:** cerca de una base de cada veinte es incorrecta. Una sola lectura no es fiable; el consenso de muchas sí.",
        b3: "**Hebra:** una lectura puede venir de cualquier hebra, así que algunas hay que voltearlas para alinearlas." },
      s7: { kicker: "montarlo todo", title: "Ensamblaje y consenso",
        p1: "Ensamblar es deslizar las lecturas unas contra otras hasta que sus solapes coincidan, y luego leer cada columna para obtener la base **consenso**.",
        p2: "Cuando las lecturas de una columna discrepan, suele ganar la mayoría. Si hay empate real, los biólogos escriben un **código de ambigüedad IUPAC** — por ejemplo **R** significa «A o G». El juego los muestra automáticamente.",
        colReads: "lecturas de la columna", consensus: "consenso" },
      s8: { kicker: "tus herramientas", title: "Cómo funciona el tablero",
        intro: "La pantalla del rompecabezas tiene cuatro partes, de arriba abajo:",
        li1: "**Fila de referencia:** las bases de cebador conocidas en cada extremo. Ancla tus lecturas a ellas.",
        li2: "**Zona de ensamblaje:** arrastra cada lectura a izquierda/derecha para alinearla. Pulsa **⟲ voltear** si una lectura pertenece a la otra hebra. Las celdas verdes coinciden con la columna; las rojas no.",
        li3: "**Fila de consenso:** se construye automáticamente a partir de tu alineamiento.",
        li4: "**Traducción:** los seis marcos de lectura, calculados por Prolog. Encuentra el ORF **M … \\*** y escribe la proteína para ganar.",
        callout: "¿Atascado? El tablero tiene botones de pista y, para el profesorado, una revelación completa de la solución." }
    },
    game: {
      loading: "Generando el rompecabezas…", errTitle: "No se pudo construir ese rompecabezas", errBack: "Probar el rompecabezas por defecto",
      title: "Ensambla las lecturas",
      sub: "Reconstruye el ADN y luego lee los marcos de lectura para hallar la proteína oculta de **{n}** letras.",
      reset: "⟲ Reiniciar alineamiento", nudge: "💡 Colocar una lectura", check: "✓ Comprobar consenso", reveal: "🔑 Revelar solución", paper: "🖨 Versión en papel", flip: "Voltear a la otra hebra",
      lblPosition: "posición", lblPrimers: "cebadores", lblDepth: "profundidad", lblConsensus: "consenso",
      tlTitle: "Traducción en seis marcos",
      tlSub: "Calculada a partir de tu consenso por Prolog. Busca una serie desde un inicio **M** hasta un stop **\\*** (resaltada).",
      frameF: "5′→3′ marco {n}", frameR: "3′→5′ marco {n}",
      answerTitle: "Tu respuesta",
      answerSub: "Escribe las letras de aminoácidos entre los codones de inicio y stop (códigos de una letra, sin la M inicial).",
      answerPh: "p. ej. GENE", submit: "Enviar proteína",
      fbEmpty: "Escribe primero los códigos de una letra de la proteína.",
      fbWin: "🎉 ¡Correcto! Descubriste {word}. La fama eterna en bioinformática es tuya.",
      fbDropM: "Quita la M inicial — indica solo los aminoácidos tras el codón de inicio.",
      fbWrong: "Aún no es la proteína oculta. Afina tu alineamiento, reconstruye el consenso y relee los marcos.",
      fbNudged: "Coloqué una lectura por ti. Quedan {n} por alinear.",
      fbAllPlaced: "¡Todas las lecturas ya están bien colocadas!",
      fbCovered: "{c} de {L} columnas cubiertas. Sigue alineando lecturas para llenar los huecos.",
      fbConsOk: "El consenso coincide con la secuencia real en todas las columnas. ¡Ahora traduce y lee la proteína!",
      fbConsWrong: "{n} columna(s) no coinciden con un ensamblaje limpio — revisa tu alineamiento ahí.",
      fbRevealed: "Solución revelada. La proteína oculta es {word}.",
      refSummary: "Referencia: código genético y códigos IUPAC", refCode: "Código genético estándar", refIupac: "Códigos de ambigüedad IUPAC"
    },
    create: {
      title: "Crear un juego de clase",
      sub: "Esconde cualquier palabra dentro de un gen y comparte un único enlace con tu alumnado. La palabra solo usa las 20 letras de aminoácidos:",
      fWord: "Palabra secreta", fDepth: "Profundidad de cobertura mínima", fRead: "Longitud de lectura", fSeed: "Semilla (opcional)",
      seedPh: "(opcional) semilla fija",
      vInvalid: "Se omiten letras que no son aminoácidos: {bad}. Letras utilizables: {ok}.",
      vOk: "{n} aminoácidos: {letters}.",
      vEmpty: "Escribe una palabra con las 20 letras de aminoácidos (sin B, J, O, U, X, Z).",
      generate: "Generar enlace y vista previa",
      linkLabel: "Enlace para compartir (la palabra va oculta en el enlace)",
      copy: "Copiar enlace", copied: "¡Copiado!", open: "Abrir el rompecabezas", paper: "🖨 Versión imprimible en papel",
      solTitle: "Solución del profesorado (ocúltala al alumnado)",
      solProtein: "Proteína oculta", solLen: "Longitud del genoma", solReads: "Número de lecturas", solDepth: "Profundidad de cobertura",
      bp: "pb", forward: "Hebra directa:", gene: "Gen (ORF):", geneNote: "(inicio · proteína · stop)",
      tip: "Consejo: usa la impresión de tu navegador para guardar una copia en papel de esta solución.",
      building: "Generando la vista previa de la solución…"
    },
    print: {
      building: "Generando el juego imprimible…", errTitle: "No se pudo construir ese rompecabezas",
      printBtn: "🖨 Imprimir / Guardar como PDF", back: "← Volver al juego en línea",
      tip: "Consejo: activa «Gráficos de fondo» en el diálogo de impresión; elige horizontal para genomas largos.",
      title: "Assemble Yourself",
      subtitle: "Un rompecabezas de ensamblaje NGS en papel. Imprime esto, coge unas tijeras y reconstruye el gen.",
      mission: "La misión",
      story1: "Se halló una proteína interesante con secuencia de aminoácidos =={mutant}== en la bacteria _S. Equencia_. ¿Existe un **homólogo** en la especie emparentada _B. Ionformatica_?",
      story2: "Un laboratorio amplificó la región correspondiente del ADN de _B. Ionformatica_ con cebadores que flanquean el gen y la secuenció, obteniendo **{n}** lecturas cortas. Cerca de una base de cada veinte es un error de lectura, y las lecturas pueden venir de cualquier hebra. El superordenador está caído — ¡ensámblalas a mano!",
      task: "**Tu tarea:** recorta las lecturas, alinéalas en el tablero (voltea una tira para leer la otra hebra), escribe la secuencia consenso y luego traduce los marcos de lectura para hallar la proteína homóloga y en qué difiere de =={mutant}==.",
      readsHeading: "Lecturas — recórtalas", readLabel: "lectura {n}",
      scaffoldTitle: "Tablero de ensamblaje",
      scaffoldInstr: "Coloca tus lecturas recortadas en la zona de alineamiento para que las bases solapadas coincidan. Las celdas sombreadas de los extremos son las bases de cebador conocidas — ancla ahí tus lecturas. Luego escribe el consenso y traduce.",
      frameF: "marco +{n}", frameR: "marco −{n}",
      rowForward: "directa 5′→3′", rowReverse: "inversa 3′→5′", rowAlignment: "alineamiento",
      refTitle: "Tablas de referencia", refCode: "Código genético estándar (tabla 11)", refIupac: "Códigos IUPAC", iupacAny: "cualquier base",
      solTitle: "Solución — solo para quien dirige el juego",
      solAnswerLbl: "Proteína oculta (la respuesta):", solRefLbl: "Proteína de referencia mostrada en la historia:",
      solRefNote: "(difiere de la respuesta en los residuos mutados)",
      forward: "Hebra directa:", gene: "Gen (ORF):", geneNote: "(inicio · proteína · stop)",
      alignTitle: "Alineamiento de lecturas", consensus: "consenso", read: "lectura"
    }
  };

  // ---- DANISH ----
  DICT.da = {
    nav: { learn: "Lær", play: "Spil", create: "Klassespil", source: "Kildekode" },
    langLabel: "Sprog",
    home: {
      badge: "bioinformatisk gåde",
      lede: "Du er bioinformatiker. Et stykke bakterie-DNA er blevet sekventeret til korte, støjfyldte reads. Saml dem igen, læs den genetiske kode, og afslør det **hemmelige protein**, der gemmer sig i genet.",
      start: "Start guiden", play: "Spil en gåde", create: "Lav et klassespil",
      c1t: "Lær biologien", c1b: "En hurtig, venlig introduktion til DNA, det centrale dogme, kodoner og næste generations sekventering.",
      c2t: "Løs gåden", c2b: "Træk og vend reads, indtil de flugter, se konsensussekvensen dukke op, og oversæt så læserammerne.",
      c3t: "Del med en klasse", c3b: "Lærere kan gemme et hvilket som helst ord i et gen og dele ét link. Alle får den samme gåde.",
      note: "Baseret på det printbare brætspil af Christian Theil Have. Al genetik kører i din browser som Prolog."
    },
    learn: {
      back: "← Tilbage", next: "Næste →", playCta: "Spil gåden →", ready: "Jeg er klar — spil →",
      s1: { kicker: "historie", title: "Missionen",
        p1: "Et interessant protein blev fundet i bakterien _S. Equencia_. Findes et lignende gen i den beslægtede art _B. Ionformatica_? Et laboratorium opformerede det tilsvarende stykke DNA og kørte det gennem en sekventeringsmaskine.",
        p2: "Sekventeringsmaskinen gav ikke én ren sekvens tilbage. Den returnerede snesevis af korte, overlappende fragmenter kaldet **reads** — nogle med fejl, andre læst fra den modsatte streng. Din opgave er at genskabe det oprindelige DNA og finde proteinet, det koder for.",
        callout: "Denne guide tager cirka to minutter. Kender du allerede det centrale dogme, kodoner og NGS, så gå direkte til [gåden](#/play)." },
      s2: { kicker: "biologi 101", title: "Det centrale dogme",
        p1: "Genetisk information flyder i én hovedretning. Det er molekylærbiologiens **centrale dogme**:",
        dna: "DNA", dnaSub: "den lagrede tegning", rna: "RNA", rnaSub: "en arbejdskopi", prot: "Protein", protSub: "den molekylære maskine",
        transcription: "transkription", translation: "translation",
        p2: "I dette spil arbejder vi i de to ender: vi genskaber **DNA'et** og oversætter det derefter direkte til **proteinet** for at finde det skjulte ord." },
      s3: { kicker: "alfabetet", title: "DNA, baser og to strenge",
        p1: "DNA er en lang kæde af fire byggesten — baserne A C G T.",
        p2: "DNA er dobbeltstrenget. De to strenge løber i modsat retning og parrer sig: **A parrer med T**, og **C parrer med G**. Én streng bestemmer derfor fuldstændig den anden — dens **omvendte komplement**.",
        p3: "Det er vigtigt her, fordi nogle reads stammer fra den nederste streng. For at få dem til at flugte skal du måske **vende** et read til dets omvendte komplement." },
      s4: { kicker: "at læse budskabet", title: "Kodoner og den genetiske kode",
        p1: "Cellen læser DNA tre baser ad gangen. Hver triplet — et **kodon** — koder for én aminosyre, perlerne der udgør et protein. Der er 64 kodoner for 20 aminosyrer, så koden er redundant.",
        p2: "**ATG** (Methionin, **M**) starter som regel et gen, og tre kodoner (**TAA, TAG, TGA**) er **stop**-signaler, der afslutter det.",
        tryLabel: "Prøv det — skriv et kodon:", live: "(oversat live af Prolog)", notCodon: "ikke et kodon", stop: "STOP" },
      s5: { kicker: "at finde signalet", title: "Gener og læserammer",
        p1: "Et gen er en **åben læseramme (ORF)**: et startkodon, så en række aminosyre-kodoner, så et stopkodon — alle i samme ramme.",
        p2: "Da man kan begynde at tælle tripletter ved position 1, 2 eller 3, har hver streng **tre læserammer**. Med to strenge er det **seks rammer** at tjekke. Kun én skjuler det tilsigtede gen.",
        caption: "Læs aminosyrerne mellem start-**M** og stop-**\\*** — det er dit protein-ord." },
      s6: { kicker: "derfor er det en gåde", title: "Næste generations sekventering",
        p1: "Sekventeringsmaskiner kan ikke læse et langt molekyle fra ende til ende. I stedet læser de enorme mængder korte **reads** fra tilfældige positioner på begge strenge.",
        b1: "**Dækning / dybde:** hver position læses flere gange. Ved at sammenligne de overlappende reads kan man stemme fejl ud.",
        b2: "**Læsefejl:** cirka én base ud af tyve er forkert. Ét enkelt read kan ikke stoles på; konsensus af mange kan.",
        b3: "**Streng:** et read kan komme fra begge strenge, så nogle skal vendes for at flugte." },
      s7: { kicker: "at samle det", title: "Samling og konsensus",
        p1: "Samling betyder at skubbe readsene mod hinanden, indtil deres overlap stemmer, og så læse ned ad hver kolonne for at få **konsensus**-basen.",
        p2: "Når reads i en kolonne er uenige, vinder flertallet som regel. Ved reel uafgjort skriver biologer en **IUPAC-tvetydighedskode** — for eksempel betyder **R** “A eller G”. Spillet viser dem automatisk.",
        colReads: "reads i kolonnen", consensus: "konsensus" },
      s8: { kicker: "dine værktøjer", title: "Sådan virker brættet",
        intro: "Gådeskærmen har fire dele, fra top til bund:",
        li1: "**Referencerække:** de kendte primer-baser i hver ende. Forankr dine reads til dem.",
        li2: "**Samlingsområde:** træk hvert read til venstre/højre for at flugte det. Tryk **⟲ vend**, hvis et read hører til den anden streng. Grønne felter stemmer med kolonnen; røde gør ikke.",
        li3: "**Konsensusrække:** bygges automatisk ud fra din samling undervejs.",
        li4: "**Oversættelse:** alle seks læserammer, beregnet af Prolog. Find **M … \\***-ORF'en og skriv proteinet for at vinde.",
        callout: "Sidder du fast? Brættet har hjælpeknapper og, for lærere, en fuld afsløring af løsningen." }
    },
    game: {
      loading: "Genererer gåde…", errTitle: "Kunne ikke bygge den gåde", errBack: "Prøv standardgåden",
      title: "Saml readsene",
      sub: "Genskab DNA'et, og læs så læserammerne for at finde det skjulte protein på **{n}** bogstaver.",
      reset: "⟲ Nulstil samling", nudge: "💡 Placér et read", check: "✓ Tjek konsensus", reveal: "🔑 Afslør løsning", paper: "🖨 Papirudgave", flip: "Vend til den anden streng",
      lblPosition: "position", lblPrimers: "primere", lblDepth: "dybde", lblConsensus: "konsensus",
      tlTitle: "Oversættelse i seks rammer",
      tlSub: "Beregnet ud fra din konsensus af Prolog. Kig efter en række fra et start-**M** til et stop-**\\*** (fremhævet).",
      frameF: "5′→3′ ramme {n}", frameR: "3′→5′ ramme {n}",
      answerTitle: "Dit svar",
      answerSub: "Skriv aminosyrebogstaverne mellem start- og stopkodon (ét-bogstavskoder, uden det indledende M).",
      answerPh: "f.eks. GENE", submit: "Indsend protein",
      fbEmpty: "Skriv først proteinets ét-bogstavskoder.",
      fbWin: "🎉 Korrekt! Du afslørede {word}. Evig bioinformatisk berømmelse er din.",
      fbDropM: "Fjern det indledende M — angiv kun aminosyrerne efter startkodonet.",
      fbWrong: "Ikke det skjulte protein endnu. Finjustér din samling, genopbyg konsensus, og læs rammerne igen.",
      fbNudged: "Placerede ét read for dig. {n} tilbage at flugte.",
      fbAllPlaced: "Alle reads er allerede placeret korrekt!",
      fbCovered: "{c} af {L} kolonner dækket. Bliv ved med at flugte reads for at fylde hullerne.",
      fbConsOk: "Konsensus stemmer med den sande sekvens i hver kolonne. Oversæt nu og læs proteinet af!",
      fbConsWrong: "{n} kolonne(r) stemmer ikke med en ren samling — tjek din flugtning der.",
      fbRevealed: "Løsning afsløret. Det skjulte protein er {word}.",
      refSummary: "Reference: genetisk kode og IUPAC-koder", refCode: "Standard genetisk kode", refIupac: "IUPAC-tvetydighedskoder"
    },
    create: {
      title: "Lav et klassespil",
      sub: "Gem et hvilket som helst ord i et gen, og del ét link med dine elever. Ordet består kun af de 20 aminosyrebogstaver:",
      fWord: "Hemmeligt ord", fDepth: "Mindste dækningsdybde", fRead: "Read-længde", fSeed: "Frø (valgfrit)",
      seedPh: "(valgfrit) fast frø",
      vInvalid: "Springer bogstaver over, der ikke er aminosyrer: {bad}. Brugbare bogstaver: {ok}.",
      vOk: "{n} aminosyrer: {letters}.",
      vEmpty: "Skriv et ord med de 20 aminosyrebogstaver (uden B, J, O, U, X, Z).",
      generate: "Generér link og forhåndsvisning",
      linkLabel: "Delbart link (ordet er skjult i linket)",
      copy: "Kopiér link", copied: "Kopieret!", open: "Åbn gåden", paper: "🖨 Printbar papirudgave",
      solTitle: "Lærerløsning (hold den skjult for eleverne)",
      solProtein: "Skjult protein", solLen: "Genomlængde", solReads: "Antal reads", solDepth: "Dækningsdybde",
      bp: "bp", forward: "Sense-streng:", gene: "Gen (ORF):", geneNote: "(start · protein · stop)",
      tip: "Tip: brug din browsers Udskriv for at gemme en papirkopi af denne løsning.",
      building: "Bygger forhåndsvisning af løsning…"
    },
    print: {
      building: "Bygger det printbare spil…", errTitle: "Kunne ikke bygge den gåde",
      printBtn: "🖨 Udskriv / Gem som PDF", back: "← Tilbage til onlinespillet",
      tip: "Tip: slå “Baggrundsgrafik” til i udskriftsdialogen; vælg liggende for lange genomer.",
      title: "Assemble Yourself",
      subtitle: "En NGS-samlingsgåde på papir. Print dette, tag en saks, og genskab genet.",
      mission: "Missionen",
      story1: "Et interessant protein med aminosyresekvensen =={mutant}== blev fundet i bakterien _S. Equencia_. Findes en **homolog** i den beslægtede art _B. Ionformatica_?",
      story2: "Et laboratorium opformerede den tilsvarende region af _B. Ionformatica_-DNA med primere, der flankerer genet, og sekventerede den, hvilket gav **{n}** korte reads. Cirka én base ud af tyve er en læsefejl, og reads kan komme fra begge strenge. Supercomputeren er nede — saml dem i hånden!",
      task: "**Din opgave:** klip readsene ud, flugt dem på brættet (vend en strimmel for at læse den anden streng), skriv konsensussekvensen, og oversæt så læserammerne for at finde det homologe protein, og hvordan det adskiller sig fra =={mutant}==.",
      readsHeading: "Reads — klip disse ud", readLabel: "read {n}",
      scaffoldTitle: "Samlingsbræt",
      scaffoldInstr: "Placér dine udklippede reads i flugtningsområdet, så overlappende baser stemmer. De skraverede endefelter er de kendte primer-baser — forankr dine reads til dem. Skriv så konsensus og oversæt.",
      frameF: "ramme +{n}", frameR: "ramme −{n}",
      rowForward: "sense 5′→3′", rowReverse: "antisense 3′→5′", rowAlignment: "flugtning",
      refTitle: "Referencetabeller", refCode: "Standard genetisk kode (tabel 11)", refIupac: "IUPAC-koder", iupacAny: "enhver base",
      solTitle: "Løsning — kun for spillederen",
      solAnswerLbl: "Skjult protein (svaret):", solRefLbl: "Referenceprotein vist i historien:",
      solRefNote: "(adskiller sig fra svaret ved de muterede rester)",
      forward: "Sense-streng:", gene: "Gen (ORF):", geneNote: "(start · protein · stop)",
      alignTitle: "Read-flugtning", consensus: "konsensus", read: "read"
    }
  };

  // ---- GERMAN ----
  DICT.de = {
    nav: { learn: "Lernen", play: "Spielen", create: "Klassenspiel", source: "Quellcode" },
    langLabel: "Sprache",
    home: {
      badge: "Bioinformatik-Rätsel",
      lede: "Du bist Bioinformatiker·in. Ein Stück bakterielle DNA wurde in kurze, verrauschte Reads sequenziert. Füge die Reads wieder zusammen, lies den genetischen Code und enthülle das im Gen verborgene **geheime Protein**.",
      start: "Tutorial starten", play: "Ein Rätsel spielen", create: "Klassenspiel erstellen",
      c1t: "Lerne die Biologie", c1b: "Eine kurze, freundliche Einführung in DNA, das zentrale Dogma, Codons und Next-Generation-Sequenzierung.",
      c2t: "Löse das Rätsel", c2b: "Ziehe und drehe Reads, bis sie passen, sieh die Konsensussequenz entstehen und übersetze die Leserahmen.",
      c3t: "Mit einer Klasse teilen", c3b: "Lehrkräfte können ein beliebiges Wort in einem Gen verstecken und einen einzigen Link teilen. Alle bekommen dasselbe Rätsel.",
      note: "Basiert auf dem druckbaren Brettspiel von Christian Theil Have. Die gesamte Genetik läuft in deinem Browser als Prolog."
    },
    learn: {
      back: "← Zurück", next: "Weiter →", playCta: "Das Rätsel spielen →", ready: "Ich bin bereit — spielen →",
      s1: { kicker: "Geschichte", title: "Die Mission",
        p1: "In dem Bakterium _S. Equencia_ wurde ein interessantes Protein gefunden. Gibt es ein ähnliches Gen in der verwandten Art _B. Ionformatica_? Ein Labor amplifizierte den passenden DNA-Abschnitt und schickte ihn durch einen Sequenzierer.",
        p2: "Der Sequenzierer lieferte keine saubere Sequenz. Er gab Dutzende kurzer, überlappender Fragmente zurück, sogenannte **Reads** — manche mit Fehlern, manche vom Gegenstrang gelesen. Deine Aufgabe ist es, die ursprüngliche DNA zu rekonstruieren und das codierte Protein zu finden.",
        callout: "Dieses Tutorial dauert etwa zwei Minuten. Wenn du das zentrale Dogma, Codons und NGS schon kennst, geh direkt zum [Rätsel](#/play)." },
      s2: { kicker: "Biologie-Grundlagen", title: "Das zentrale Dogma",
        p1: "Genetische Information fließt in eine Hauptrichtung. Das ist das **zentrale Dogma** der Molekularbiologie:",
        dna: "DNA", dnaSub: "der gespeicherte Bauplan", rna: "RNA", rnaSub: "eine Arbeitskopie", prot: "Protein", protSub: "die molekulare Maschine",
        transcription: "Transkription", translation: "Translation",
        p2: "In diesem Spiel arbeiten wir an beiden Enden: Wir rekonstruieren die **DNA** und übersetzen sie dann direkt in das **Protein**, um das versteckte Wort zu finden." },
      s3: { kicker: "das Alphabet", title: "DNA, Basen und zwei Stränge",
        p1: "DNA ist eine lange Kette aus vier Bausteinen — den Basen A C G T.",
        p2: "DNA ist doppelsträngig. Die beiden Stränge verlaufen entgegengesetzt und paaren sich: **A paart mit T** und **C mit G**. Ein Strang bestimmt also vollständig den anderen — sein **reverses Komplement**.",
        p3: "Das ist hier wichtig, weil manche Reads vom unteren Strang stammen. Um sie auszurichten, musst du ein Read vielleicht auf sein reverses Komplement **umdrehen**." },
      s4: { kicker: "die Botschaft lesen", title: "Codons und der genetische Code",
        p1: "Die Zelle liest DNA in Dreiergruppen. Jedes Triplett — ein **Codon** — codiert eine Aminosäure, die Bausteine eines Proteins. Es gibt 64 Codons für 20 Aminosäuren, der Code ist also redundant.",
        p2: "**ATG** (Methionin, **M**) startet meist ein Gen, und drei Codons (**TAA, TAG, TGA**) sind **Stopp**-Signale, die es beenden.",
        tryLabel: "Probier's — tippe ein Codon:", live: "(live von Prolog übersetzt)", notCodon: "kein Codon", stop: "STOPP" },
      s5: { kicker: "das Signal finden", title: "Gene und Leserahmen",
        p1: "Ein Gen ist ein **offener Leserahmen (ORF)**: ein Startcodon, dann eine Folge von Aminosäure-Codons, dann ein Stoppcodon — alle im selben Rahmen.",
        p2: "Da man Tripletts an Position 1, 2 oder 3 zu zählen beginnen kann, hat jeder Strang **drei Leserahmen**. Bei zwei Strängen sind das **sechs Rahmen** zu prüfen. Nur einer verbirgt das gesuchte Gen.",
        caption: "Lies die Aminosäuren zwischen dem Start-**M** und dem Stopp-**\\*** — das ist dein Protein-Wort." },
      s6: { kicker: "warum es ein Rätsel ist", title: "Next-Generation-Sequenzierung",
        p1: "Sequenzierer können ein langes Molekül nicht von Ende zu Ende lesen. Stattdessen lesen sie riesige Mengen kurzer **Reads** von zufälligen Positionen auf beiden Strängen.",
        b1: "**Abdeckung / Tiefe:** Jede Position wird mehrfach gelesen. Der Vergleich überlappender Reads lässt Fehler herausstimmen.",
        b2: "**Lesefehler:** Etwa eine von zwanzig Basen ist falsch. Einem einzelnen Read kann man nicht trauen; dem Konsens vieler schon.",
        b3: "**Strang:** Ein Read kann von beiden Strängen stammen, also müssen manche zum Ausrichten umgedreht werden." },
      s7: { kicker: "alles zusammensetzen", title: "Assemblierung und Konsens",
        p1: "Assemblieren heißt, die Reads gegeneinander zu verschieben, bis ihre Überlappungen übereinstimmen, und dann jede Spalte hinunterzulesen, um die **Konsens**-Base zu erhalten.",
        p2: "Wenn Reads in einer Spalte uneinig sind, gewinnt meist die Mehrheit. Bei echtem Gleichstand schreiben Biologen einen **IUPAC-Mehrdeutigkeitscode** — z. B. bedeutet **R** „A oder G“. Das Spiel zeigt sie automatisch.",
        colReads: "Reads der Spalte", consensus: "Konsens" },
      s8: { kicker: "deine Werkzeuge", title: "So funktioniert das Brett",
        intro: "Der Rätselbildschirm hat vier Bereiche, von oben nach unten:",
        li1: "**Referenzzeile:** die bekannten Primer-Basen an jedem Ende. Verankere deine Reads daran.",
        li2: "**Assemblierungsbereich:** ziehe jedes Read nach links/rechts, um es auszurichten. Drücke **⟲ umdrehen**, wenn ein Read zum anderen Strang gehört. Grüne Zellen stimmen mit der Spalte überein, rote nicht.",
        li3: "**Konsenszeile:** wird beim Ausrichten automatisch aufgebaut.",
        li4: "**Übersetzung:** alle sechs Leserahmen, von Prolog berechnet. Finde den **M … \\***-ORF und tippe das Protein, um zu gewinnen.",
        callout: "Feststeckt? Das Brett hat Hinweisknöpfe und, für Lehrkräfte, eine vollständige Lösungsanzeige." }
    },
    game: {
      loading: "Rätsel wird erzeugt…", errTitle: "Dieses Rätsel ließ sich nicht bauen", errBack: "Standardrätsel versuchen",
      title: "Setze die Reads zusammen",
      sub: "Rekonstruiere die DNA und lies dann die Leserahmen, um das versteckte **{n}**-Buchstaben-Protein zu finden.",
      reset: "⟲ Ausrichtung zurücksetzen", nudge: "💡 Ein Read platzieren", check: "✓ Konsens prüfen", reveal: "🔑 Lösung zeigen", paper: "🖨 Papierversion", flip: "Auf den anderen Strang umdrehen",
      lblPosition: "Position", lblPrimers: "Primer", lblDepth: "Tiefe", lblConsensus: "Konsens",
      tlTitle: "Übersetzung in sechs Rahmen",
      tlSub: "Aus deinem Konsens von Prolog berechnet. Suche eine Folge von einem Start-**M** zu einem Stopp-**\\*** (hervorgehoben).",
      frameF: "5′→3′ Rahmen {n}", frameR: "3′→5′ Rahmen {n}",
      answerTitle: "Deine Antwort",
      answerSub: "Tippe die Aminosäurebuchstaben zwischen Start- und Stoppcodon (Ein-Buchstaben-Codes, ohne führendes M).",
      answerPh: "z. B. GENE", submit: "Protein abschicken",
      fbEmpty: "Tippe zuerst die Ein-Buchstaben-Codes des Proteins.",
      fbWin: "🎉 Richtig! Du hast {word} enthüllt. Ewiger Bioinformatik-Ruhm gehört dir.",
      fbDropM: "Lass das führende M weg — gib nur die Aminosäuren nach dem Startcodon an.",
      fbWrong: "Noch nicht das versteckte Protein. Verfeinere deine Ausrichtung, baue den Konsens neu auf und lies die Rahmen erneut.",
      fbNudged: "Ein Read für dich platziert. Noch {n} auszurichten.",
      fbAllPlaced: "Alle Reads sind bereits korrekt platziert!",
      fbCovered: "{c} von {L} Spalten abgedeckt. Richte weiter Reads aus, um die Lücken zu füllen.",
      fbConsOk: "Der Konsens stimmt in jeder Spalte mit der echten Sequenz überein. Jetzt übersetzen und das Protein ablesen!",
      fbConsWrong: "{n} Spalte(n) passen nicht zu einer sauberen Assemblierung — prüfe dort deine Ausrichtung.",
      fbRevealed: "Lösung angezeigt. Das versteckte Protein ist {word}.",
      refSummary: "Referenz: genetischer Code & IUPAC-Codes", refCode: "Standard-Gencode", refIupac: "IUPAC-Mehrdeutigkeitscodes"
    },
    create: {
      title: "Klassenspiel erstellen",
      sub: "Verstecke ein beliebiges Wort in einem Gen und teile einen einzigen Link mit deinen Schülern. Das Wort besteht nur aus den 20 Aminosäurebuchstaben:",
      fWord: "Geheimes Wort", fDepth: "Minimale Abdeckungstiefe", fRead: "Read-Länge", fSeed: "Seed (optional)",
      seedPh: "(optional) fester Seed",
      vInvalid: "Buchstaben, die keine Aminosäuren sind, werden übersprungen: {bad}. Nutzbare Buchstaben: {ok}.",
      vOk: "{n} Aminosäuren: {letters}.",
      vEmpty: "Gib ein Wort mit den 20 Aminosäurebuchstaben ein (ohne B, J, O, U, X, Z).",
      generate: "Link & Vorschau erzeugen",
      linkLabel: "Teilbarer Link (das Wort ist im Link verborgen)",
      copy: "Link kopieren", copied: "Kopiert!", open: "Rätsel öffnen", paper: "🖨 Druckbare Papierversion",
      solTitle: "Lehrerlösung (vor Schülern verbergen)",
      solProtein: "Verstecktes Protein", solLen: "Genomlänge", solReads: "Anzahl Reads", solDepth: "Abdeckungstiefe",
      bp: "bp", forward: "Sense-Strang:", gene: "Gen (ORF):", geneNote: "(Start · Protein · Stopp)",
      tip: "Tipp: Nutze die Druckfunktion deines Browsers, um eine Papierkopie dieser Lösung zu behalten.",
      building: "Lösungsvorschau wird erstellt…"
    },
    print: {
      building: "Druckbares Spiel wird erstellt…", errTitle: "Dieses Rätsel ließ sich nicht bauen",
      printBtn: "🖨 Drucken / Als PDF speichern", back: "← Zurück zum Online-Spiel",
      tip: "Tipp: Aktiviere „Hintergrundgrafiken“ im Druckdialog; wähle Querformat für lange Genome.",
      title: "Assemble Yourself",
      subtitle: "Ein NGS-Assemblierungsrätsel auf Papier. Drucke dies, nimm eine Schere und rekonstruiere das Gen.",
      mission: "Die Mission",
      story1: "Ein interessantes Protein mit der Aminosäuresequenz =={mutant}== wurde im Bakterium _S. Equencia_ gefunden. Gibt es ein **Homolog** in der verwandten Art _B. Ionformatica_?",
      story2: "Ein Labor amplifizierte die passende Region der _B. Ionformatica_-DNA mit Primern, die das Gen flankieren, und sequenzierte sie, was **{n}** kurze Reads ergab. Etwa eine von zwanzig Basen ist ein Lesefehler, und Reads können von beiden Strängen stammen. Der Supercomputer ist ausgefallen — setze sie von Hand zusammen!",
      task: "**Deine Aufgabe:** schneide die Reads aus, richte sie auf dem Brett aus (drehe einen Streifen um, um den anderen Strang zu lesen), schreibe die Konsensussequenz und übersetze dann die Leserahmen, um das homologe Protein zu finden und wie es sich von =={mutant}== unterscheidet.",
      readsHeading: "Reads — hier ausschneiden", readLabel: "Read {n}",
      scaffoldTitle: "Assemblierungsbrett",
      scaffoldInstr: "Lege deine ausgeschnittenen Reads in den Ausrichtungsbereich, sodass überlappende Basen übereinstimmen. Die schattierten Endzellen sind die bekannten Primer-Basen — verankere deine Reads daran. Schreibe dann den Konsens und übersetze.",
      frameF: "Rahmen +{n}", frameR: "Rahmen −{n}",
      rowForward: "Sense 5′→3′", rowReverse: "Antisense 3′→5′", rowAlignment: "Ausrichtung",
      refTitle: "Referenztabellen", refCode: "Standard-Gencode (Tabelle 11)", refIupac: "IUPAC-Codes", iupacAny: "beliebige Base",
      solTitle: "Lösung — nur für die Spielleitung",
      solAnswerLbl: "Verstecktes Protein (die Antwort):", solRefLbl: "In der Geschichte gezeigtes Referenzprotein:",
      solRefNote: "(unterscheidet sich von der Antwort durch die mutierten Reste)",
      forward: "Sense-Strang:", gene: "Gen (ORF):", geneNote: "(Start · Protein · Stopp)",
      alignTitle: "Read-Ausrichtung", consensus: "Konsens", read: "Read"
    }
  };

  // ---- ITALIAN ----
  DICT.it = {
    nav: { learn: "Impara", play: "Gioca", create: "Gioco di classe", source: "Sorgente" },
    langLabel: "Lingua",
    home: {
      badge: "rompicapo bioinformatico",
      lede: "Sei un·a bioinformatico·a. Un tratto di DNA batterico è stato sequenziato in letture corte e rumorose. Rimetti insieme le letture, leggi il codice genetico e scopri la **proteina segreta** nascosta nel gene.",
      start: "Avvia il tutorial", play: "Gioca un rompicapo", create: "Crea un gioco di classe",
      c1t: "Impara la biologia", c1b: "Un'introduzione semplice al DNA, al dogma centrale, ai codoni e al sequenziamento di nuova generazione.",
      c2t: "Risolvi il rompicapo", c2b: "Trascina e capovolgi le letture finché non si allineano, guarda emergere la sequenza consenso e traduci i moduli di lettura.",
      c3t: "Condividi con una classe", c3b: "Gli insegnanti possono nascondere qualsiasi parola in un gene e condividere un solo link. Tutti ricevono lo stesso rompicapo.",
      note: "Basato sul gioco da tavolo stampabile di Christian Theil Have. Tutta la genetica gira nel tuo browser come Prolog."
    },
    learn: {
      back: "← Indietro", next: "Avanti →", playCta: "Gioca il rompicapo →", ready: "Sono pronto·a — gioca →",
      s1: { kicker: "storia", title: "La missione",
        p1: "Una proteina interessante è stata trovata nel batterio _S. Equencia_. Esiste un gene simile nella specie affine _B. Ionformatica_? Un laboratorio ha amplificato il tratto di DNA corrispondente e l'ha fatto passare in un sequenziatore.",
        p2: "Il sequenziatore non ha restituito una sequenza pulita. Ha restituito decine di frammenti corti e sovrapposti chiamati **letture** — alcune con errori, altre lette dal filamento opposto. Il tuo compito è ricostruire il DNA originale e trovare la proteina che codifica.",
        callout: "Questo tutorial dura circa due minuti. Se conosci già il dogma centrale, i codoni e l'NGS, vai dritto al [rompicapo](#/play)." },
      s2: { kicker: "biologia di base", title: "Il dogma centrale",
        p1: "L'informazione genetica scorre in una direzione principale. È il **dogma centrale** della biologia molecolare:",
        dna: "DNA", dnaSub: "il progetto conservato", rna: "RNA", rnaSub: "una copia di lavoro", prot: "Proteina", protSub: "la macchina molecolare",
        transcription: "trascrizione", translation: "traduzione",
        p2: "In questo gioco lavoriamo ai due estremi: ricostruiamo il **DNA** e poi lo traduciamo direttamente nella **proteina** per trovare la parola nascosta." },
      s3: { kicker: "l'alfabeto", title: "DNA, basi e due filamenti",
        p1: "Il DNA è una lunga catena di quattro mattoni — le basi A C G T.",
        p2: "Il DNA è a doppio filamento. I due filamenti corrono in direzioni opposte e si appaiano: **A si appaia con T** e **C con G**. Quindi un filamento determina completamente l'altro — il suo **complemento inverso**.",
        p3: "Qui conta perché alcune letture provengono dal filamento inferiore. Per allinearle potresti dover **capovolgere** una lettura nel suo complemento inverso." },
      s4: { kicker: "leggere il messaggio", title: "Codoni e codice genetico",
        p1: "La cellula legge il DNA tre basi alla volta. Ogni tripletta — un **codone** — codifica un amminoacido, le perline che formano una proteina. Ci sono 64 codoni per 20 amminoacidi, quindi il codice è ridondante.",
        p2: "**ATG** (Metionina, **M**) di solito inizia un gene, e tre codoni (**TAA, TAG, TGA**) sono segnali di **stop** che lo terminano.",
        tryLabel: "Prova — digita un codone:", live: "(tradotto in tempo reale da Prolog)", notCodon: "non è un codone", stop: "STOP" },
      s5: { kicker: "trovare il segnale", title: "Geni e moduli di lettura",
        p1: "Un gene è un **modulo di lettura aperto (ORF)**: un codone di inizio, poi una sequenza di codoni amminoacidici, poi un codone di stop — tutti nello stesso modulo.",
        p2: "Poiché puoi iniziare a contare le triplette in posizione 1, 2 o 3, ogni filamento ha **tre moduli di lettura**. Con due filamenti sono **sei moduli** da controllare. Solo uno nasconde il gene cercato.",
        caption: "Leggi gli amminoacidi tra l'inizio **M** e lo stop **\\*** — è la tua parola-proteina." },
      s6: { kicker: "perché è un rompicapo", title: "Sequenziamento di nuova generazione",
        p1: "I sequenziatori non possono leggere una lunga molecola da un capo all'altro. Leggono invece enormi quantità di **letture** corte da posizioni casuali su entrambi i filamenti.",
        b1: "**Copertura / profondità:** ogni posizione viene letta più volte. Confrontare le letture sovrapposte permette di eliminare gli errori a maggioranza.",
        b2: "**Errori di lettura:** circa una base su venti è sbagliata. Una singola lettura non è affidabile; il consenso di molte sì.",
        b3: "**Filamento:** una lettura può provenire da entrambi i filamenti, quindi alcune vanno capovolte per allinearle." },
      s7: { kicker: "mettere insieme", title: "Assemblaggio e consenso",
        p1: "Assemblare significa far scorrere le letture l'una contro l'altra finché le sovrapposizioni non concordano, poi leggere ogni colonna per ottenere la base di **consenso**.",
        p2: "Quando le letture di una colonna discordano, di solito vince la maggioranza. In caso di vero pareggio, i biologi scrivono un **codice di ambiguità IUPAC** — per esempio **R** significa «A o G». Il gioco li mostra automaticamente.",
        colReads: "letture della colonna", consensus: "consenso" },
      s8: { kicker: "i tuoi strumenti", title: "Come funziona il tabellone",
        intro: "La schermata del rompicapo ha quattro parti, dall'alto in basso:",
        li1: "**Riga di riferimento:** le basi dei primer note a ciascuna estremità. Ancora ad esse le tue letture.",
        li2: "**Area di assemblaggio:** trascina ogni lettura a sinistra/destra per allinearla. Premi **⟲ capovolgi** se una lettura appartiene all'altro filamento. Le celle verdi concordano con la colonna, le rosse no.",
        li3: "**Riga di consenso:** costruita automaticamente dal tuo allineamento man mano.",
        li4: "**Traduzione:** tutti e sei i moduli di lettura, calcolati da Prolog. Trova l'ORF **M … \\*** e digita la proteina per vincere.",
        callout: "Bloccato? Il tabellone ha pulsanti di aiuto e, per gli insegnanti, una rivelazione completa della soluzione." }
    },
    game: {
      loading: "Generazione del rompicapo…", errTitle: "Impossibile costruire questo rompicapo", errBack: "Prova il rompicapo predefinito",
      title: "Assembla le letture",
      sub: "Ricostruisci il DNA, poi leggi i moduli di lettura per trovare la proteina nascosta di **{n}** lettere.",
      reset: "⟲ Reimposta allineamento", nudge: "💡 Posiziona una lettura", check: "✓ Verifica consenso", reveal: "🔑 Rivela soluzione", paper: "🖨 Versione cartacea", flip: "Capovolgi sull'altro filamento",
      lblPosition: "posizione", lblPrimers: "primer", lblDepth: "profondità", lblConsensus: "consenso",
      tlTitle: "Traduzione a sei moduli",
      tlSub: "Calcolata dal tuo consenso da Prolog. Cerca una sequenza da un inizio **M** a uno stop **\\*** (evidenziata).",
      frameF: "5′→3′ modulo {n}", frameR: "3′→5′ modulo {n}",
      answerTitle: "La tua risposta",
      answerSub: "Digita le lettere degli amminoacidi tra i codoni di inizio e stop (codici a una lettera, senza la M iniziale).",
      answerPh: "es. GENE", submit: "Invia proteina",
      fbEmpty: "Digita prima i codici a una lettera della proteina.",
      fbWin: "🎉 Corretto! Hai scoperto {word}. La gloria eterna nella bioinformatica è tua.",
      fbDropM: "Togli la M iniziale — indica solo gli amminoacidi dopo il codone di inizio.",
      fbWrong: "Non è ancora la proteina nascosta. Affina l'allineamento, ricostruisci il consenso e rileggi i moduli.",
      fbNudged: "Ho posizionato una lettura per te. Ne restano {n} da allineare.",
      fbAllPlaced: "Tutte le letture sono già posizionate correttamente!",
      fbCovered: "{c} colonne coperte su {L}. Continua ad allineare le letture per colmare i vuoti.",
      fbConsOk: "Il consenso corrisponde alla sequenza vera in ogni colonna. Ora traduci e leggi la proteina!",
      fbConsWrong: "{n} colonna/e non concordano con un assemblaggio pulito — controlla lì il tuo allineamento.",
      fbRevealed: "Soluzione rivelata. La proteina nascosta è {word}.",
      refSummary: "Riferimento: codice genetico e codici IUPAC", refCode: "Codice genetico standard", refIupac: "Codici di ambiguità IUPAC"
    },
    create: {
      title: "Crea un gioco di classe",
      sub: "Nascondi qualsiasi parola dentro un gene e condividi un solo link con i tuoi studenti. La parola usa solo le 20 lettere degli amminoacidi:",
      fWord: "Parola segreta", fDepth: "Profondità minima di copertura", fRead: "Lunghezza lettura", fSeed: "Seme (opzionale)",
      seedPh: "(opzionale) seme fisso",
      vInvalid: "Salto le lettere che non sono amminoacidi: {bad}. Lettere utilizzabili: {ok}.",
      vOk: "{n} amminoacidi: {letters}.",
      vEmpty: "Inserisci una parola con le 20 lettere degli amminoacidi (senza B, J, O, U, X, Z).",
      generate: "Genera link e anteprima",
      linkLabel: "Link condivisibile (la parola è nascosta nel link)",
      copy: "Copia link", copied: "Copiato!", open: "Apri il rompicapo", paper: "🖨 Versione cartacea stampabile",
      solTitle: "Soluzione per l'insegnante (tienila nascosta agli studenti)",
      solProtein: "Proteina nascosta", solLen: "Lunghezza del genoma", solReads: "Numero di letture", solDepth: "Profondità di copertura",
      bp: "bp", forward: "Filamento senso:", gene: "Gene (ORF):", geneNote: "(inizio · proteina · stop)",
      tip: "Suggerimento: usa la stampa del browser per conservare una copia cartacea di questa soluzione.",
      building: "Creazione dell'anteprima della soluzione…"
    },
    print: {
      building: "Creazione del gioco stampabile…", errTitle: "Impossibile costruire questo rompicapo",
      printBtn: "🖨 Stampa / Salva come PDF", back: "← Torna al gioco online",
      tip: "Suggerimento: attiva «Grafica di sfondo» nella finestra di stampa; scegli orizzontale per genomi lunghi.",
      title: "Assemble Yourself",
      subtitle: "Un rompicapo di assemblaggio NGS su carta. Stampa questo, prendi le forbici e ricostruisci il gene.",
      mission: "La missione",
      story1: "Una proteina interessante con sequenza amminoacidica =={mutant}== è stata trovata nel batterio _S. Equencia_. Esiste un **omologo** nella specie affine _B. Ionformatica_?",
      story2: "Un laboratorio ha amplificato la regione corrispondente del DNA di _B. Ionformatica_ con primer che fiancheggiano il gene e l'ha sequenziata, ottenendo **{n}** letture corte. Circa una base su venti è un errore di lettura, e le letture possono provenire da entrambi i filamenti. Il supercomputer è fuori uso — assemblale a mano!",
      task: "**Il tuo compito:** ritaglia le letture, allineale sul tabellone (capovolgi una striscia per leggere l'altro filamento), scrivi la sequenza consenso e poi traduci i moduli di lettura per trovare la proteina omologa e come differisce da =={mutant}==.",
      readsHeading: "Letture — ritaglia queste", readLabel: "lettura {n}",
      scaffoldTitle: "Tabellone di assemblaggio",
      scaffoldInstr: "Metti le tue letture ritagliate nell'area di allineamento in modo che le basi sovrapposte concordino. Le celle ombreggiate alle estremità sono le basi dei primer note — ancora ad esse le tue letture. Poi scrivi il consenso e traduci.",
      frameF: "modulo +{n}", frameR: "modulo −{n}",
      rowForward: "senso 5′→3′", rowReverse: "antisenso 3′→5′", rowAlignment: "allineamento",
      refTitle: "Tabelle di riferimento", refCode: "Codice genetico standard (tabella 11)", refIupac: "Codici IUPAC", iupacAny: "qualsiasi base",
      solTitle: "Soluzione — solo per chi conduce il gioco",
      solAnswerLbl: "Proteina nascosta (la risposta):", solRefLbl: "Proteina di riferimento mostrata nella storia:",
      solRefNote: "(differisce dalla risposta per i residui mutati)",
      forward: "Filamento senso:", gene: "Gene (ORF):", geneNote: "(inizio · proteina · stop)",
      alignTitle: "Allineamento delle letture", consensus: "consenso", read: "lettura"
    }
  };

  // ---- machinery ----
  function detectInitial() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved && DICT[saved]) return saved;
    } catch (e) {}
    var nav = (navigator.language || "en").slice(0, 2).toLowerCase();
    return DICT[nav] ? nav : "en";
  }

  function lookup(locale, key) {
    var parts = key.split(".");
    var node = DICT[locale];
    for (var i = 0; i < parts.length && node != null; i++) node = node[parts[i]];
    return node;
  }

  function t(key, params) {
    var val = lookup(current, key);
    if (val == null) val = lookup("en", key);
    if (val == null) return key;
    if (typeof val === "string" && params) {
      val = val.replace(/\{(\w+)\}/g, function (m, name) {
        return params[name] != null ? params[name] : m;
      });
    }
    return val;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  // Inline markup: **bold**, _italic_, ==highlight==, [text](#/hash), \\* literal.
  function inlineMd(s) {
    s = escapeHtml(s).replace(/\\\*/g, "&#42;");
    s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/==(.+?)==/g, "<span class=\"highlight\">$1</span>");
    s = s.replace(/_(.+?)_/g, "<em>$1</em>");
    s = s.replace(/\[(.+?)\]\((#[^)]+)\)/g, "<a href=\"$2\">$1</a>");
    return s;
  }
  // Return an element (default <span>) with the parsed rich text as content.
  function rich(key, params, tag) {
    var el = document.createElement(tag || "span");
    var raw = typeof key === "string" && (lookup(current, key) != null || lookup("en", key) != null) ? t(key, params) : key;
    el.innerHTML = inlineMd(raw);
    return el;
  }
  // Same as rich() but takes an already-resolved string.
  function richStr(str, tag) {
    var el = document.createElement(tag || "span");
    el.innerHTML = inlineMd(str);
    return el;
  }

  function setLocale(locale) {
    if (!DICT[locale] || locale === current) return;
    current = locale;
    try { localStorage.setItem(STORAGE_KEY, locale); } catch (e) {}
    document.documentElement.setAttribute("lang", locale);
    listeners.forEach(function (fn) { fn(locale); });
  }

  function aaName(atom) {
    return (AA[current] && AA[current][atom]) || (AA.en[atom]) || atom;
  }

  current = detectInitial();

  window.I18N = {
    t: t,
    rich: rich,
    richStr: richStr,
    aaName: aaName,
    setLocale: setLocale,
    getLocale: function () { return current; },
    locales: LOCALE_ORDER.slice(),
    localeName: function (l) { return LOCALE_NAMES[l] || l; },
    onChange: function (fn) { listeners.push(fn); }
  };
})();
