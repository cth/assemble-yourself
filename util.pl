random_split_seq(Seq, Part1, Part2) :-
	length(Seq,L),
	writeln(L),
	random_uniform(0,L,F),
	L1 is round(F),
	L #= L1+L2,
	length(Part2,L2),
	append(Part1,Part2,Seq).

random_split_seq_min(Seq, Part1, Part2,MinLen2) :-
	length(Seq,L),
	writeln(L),
	LMax is L - MinLen2,
	random_uniform(0,LMax,F),
	L1 is round(F),
	L #= L1+L2,
	length(Part2,L2),
	append(Part1,Part2,Seq).



