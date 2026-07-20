// The biological "reasoning engine" for Assemble Yourself, written in Prolog and
// executed in the browser by Tau Prolog. This is a faithful port of the domain
// logic from the original PRISM/Prolog program (genecode.pl and dnaseq.pl):
// the standard genetic code (NCBI translation table 11), codon translation in
// all reading frames, reverse-complementation, open-reading-frame detection and
// the IUPAC consensus relations.
//
// The program is kept as a string so the page loads with no fetch() call, which
// means it also runs when opened directly from disk (file://).
window.BIOLOGY_PROLOG = String.raw`
:- use_module(library(lists)).

%% ---------------------------------------------------------------------------
%% Genetic code (NCBI translation table 11)
%% gc(+Codon, ?AminoAcid) where Codon is a list of three bases from [a,c,g,t]
%% and AminoAcid is a lowercase letter atom, or the atom 'stop'.
%% ---------------------------------------------------------------------------
gc([t,t,t],f). gc([t,c,t],s). gc([t,a,t],y). gc([t,g,t],c).
gc([t,t,c],f). gc([t,c,c],s). gc([t,a,c],y). gc([t,g,c],c).
gc([t,t,a],l). gc([t,c,a],s). gc([t,a,a],stop). gc([t,g,a],stop).
gc([t,t,g],l). gc([t,c,g],s). gc([t,a,g],stop). gc([t,g,g],w).
gc([c,t,t],l). gc([c,c,t],p). gc([c,a,t],h). gc([c,g,t],r).
gc([c,t,c],l). gc([c,c,c],p). gc([c,a,c],h). gc([c,g,c],r).
gc([c,t,a],l). gc([c,c,a],p). gc([c,a,a],q). gc([c,g,a],r).
gc([c,t,g],l). gc([c,c,g],p). gc([c,a,g],q). gc([c,g,g],r).
gc([a,t,t],i). gc([a,c,t],t). gc([a,a,t],n). gc([a,g,t],s).
gc([a,t,c],i). gc([a,c,c],t). gc([a,a,c],n). gc([a,g,c],s).
gc([a,t,a],i). gc([a,c,a],t). gc([a,a,a],k). gc([a,g,a],r).
gc([a,t,g],m). gc([a,c,g],t). gc([a,a,g],k). gc([a,g,g],r).
gc([g,t,t],v). gc([g,c,t],a). gc([g,a,t],d). gc([g,g,t],g).
gc([g,t,c],v). gc([g,c,c],a). gc([g,a,c],d). gc([g,g,c],g).
gc([g,t,a],v). gc([g,c,a],a). gc([g,a,a],e). gc([g,g,a],g).
gc([g,t,g],v). gc([g,c,g],a). gc([g,a,g],e). gc([g,g,g],g).

%% start_codon(?Codon): codons that can initiate translation in table 11.
start_codon([t,t,g]). start_codon([c,t,g]). start_codon([a,t,t]).
start_codon([a,t,c]). start_codon([a,t,a]). start_codon([a,t,g]).
start_codon([g,t,g]).

%% codons_for(?AminoAcid, -Codons): all codons that encode an amino acid.
%% Used by the game generator to pick a (synonymous) codon for each letter.
codons_for(AA, Codons) :- findall(C, gc(C, AA), Codons).

start_codons(Cs) :- findall(C, start_codon(C), Cs).
stop_codons(Cs)  :- findall(C, gc(C, stop), Cs).

%% ---------------------------------------------------------------------------
%% Strands
%% ---------------------------------------------------------------------------
comp(a,t). comp(t,a). comp(g,c). comp(c,g).

%% reverse_complement(+Seq, -RevComp)
reverse_complement(Seq, RC) :- rc_(Seq, [], RC).
rc_([], Acc, Acc).
rc_([H|T], Acc, RC) :- comp(H, C), rc_(T, [C|Acc], RC).

%% ---------------------------------------------------------------------------
%% Translation of one reading frame.
%% translate(+Bases, -AminoAcids): consumes the base list three at a time.
%% A codon that is not a plain [a,c,g,t] triplet (e.g. an IUPAC ambiguity code
%% or a gap) becomes the atom '?'. A trailing 1-2 leftover bases are dropped.
%% ---------------------------------------------------------------------------
translate([], []).
translate([_], []).
translate([_,_], []).
translate([A,B,C|T], [AA|Rest]) :-
    ( gc([A,B,C], X) -> AA = X ; AA = '?' ),
    translate(T, Rest).

%% ---------------------------------------------------------------------------
%% Open reading frames, searched over a list of codons for one frame.
%% codonize(+Bases, -Codons) chops a base list into whole codons.
%% orf(+Codons, -Protein): Protein is the amino-acid list strictly between a
%% start codon and the next in-frame stop codon (start Met and stop excluded).
%% ---------------------------------------------------------------------------
codonize([A,B,C|T], [[A,B,C]|Rest]) :- !, codonize(T, Rest).
codonize(_, []).

orf(Codons, Protein) :-
    append(_, [Start|Rest], Codons),
    start_codon(Start),
    orf_body(Rest, Protein).

orf_body([Stop|_], []) :- gc(Stop, stop), !.
orf_body([C|T], [AA|Rest]) :-
    gc(C, AA), AA \= stop,
    orf_body(T, Rest).

%% ---------------------------------------------------------------------------
%% IUPAC ambiguity codes: iupac(+SortedBaseSet, ?Code)
%% ---------------------------------------------------------------------------
iupac([a], a). iupac([c], c). iupac([g], g). iupac([t], t).
iupac([a,g], r). iupac([c,t], y). iupac([c,g], s). iupac([a,t], w).
iupac([g,t], k). iupac([a,c], m).
iupac([c,g,t], b). iupac([a,g,t], d). iupac([a,c,t], h). iupac([a,c,g], v).
iupac([a,c,g,t], n).

%% consensus_code(+Bases, -Code): IUPAC code covering exactly the given bases.
consensus_code(Bases, Code) :-
    sort(Bases, Sorted),
    iupac(Sorted, Code).
`;
