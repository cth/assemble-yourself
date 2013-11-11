/** <module> working with DNA sequences 

@author: Christian Theil Have

This library contains predicates for various basic operations on DNA sequences

*/

% Require genecode for translation
:- [genecode].


%% dna_seq_complement(+NucleotideSequence,-ReverseComplementedNucleotideSequence)
% Complement the DNA sequence given in the list NucleotideSequence yield its complement as the list ReverseComplementedNucleotideSequence
dna_seq_complement([],[]).

dna_seq_complement([N|NucleotidesRest],[NC|NCRest]) :-
	dna_complement(N,NC),
	dna_seq_complement(NucleotidesRest,NCRest).


%% dna_complement(?Base,?Complement)
% Relation that maps bases to their complements
dna_complement(a,t).
dna_complement(t,a).
dna_complement(g,c).
dna_complement(c,g).

%% dna_translate(+Genecode,?DNASequence,?AminoAcids)
% Translates a DNA sequence to a sequence of amino acids
% or vice versa: Produce all possible DNA sequences for
% a given amino acids sequence
dna_translate(_, [],[]).
dna_translate(Genecode, [C1,C2,C3|_], []) :-
	genecode(Genecode,[C1,C2,C3],'*'),
        !.
dna_translate(Genecode, [C1,C2,C3|DNARest], [AA|AARest]) :-
	genecode(Genecode,[C1,C2,C3],AA),
	dna_translate(Genecode,DNARest,AARest).

	
%% translate(+GeneCode,+List_Nucleotides,-List_AA)
translate(_GeneCode,[],[]) :-
        !.

translate(_GeneCode,[_],[]) :-
        !.

translate(_GeneCode,[_,_],[]) :-
        !.

translate(GeneCode,[N1,N2,N3|RestOrf],[A|RestAs]):-
        genecode(GeneCode,[N1,N2,N3],A),
        translate(GeneCode,RestOrf,RestAs).

