random_split_seq(Seq, Part1, Part2) :-
	length(Seq,L),
	random_uniform(0,L,F),!,
	L1 is round(F),
	L #= L1+L2,
	length(Part2,L2),
	append(Part1,Part2,Seq).
