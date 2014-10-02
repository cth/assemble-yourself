Assemble yourself
=================
Assemble yourself is a paper-printable bioinformatics boardgame which is designed to be educational, fun and engaging. 
It introduces basic genetics and Next Generation Sequencing through a a puzzle-like problem. 

The main idea of the game is to manually perform a assembly of a genome sequence
from next generation reads. The entire game is printed on paper. This includes the reads (cut out paperstrips) 
and a board which serves scaffold to assemble the reads and writing down the sequence.
Once the reads have been assembled and a consensus sequence is found, the consensus
sequence is translated into amino acid sequences in both DNA strands. The letters
representing the amino acid sequence contains a secret word. Once the player
finds the secret word he wins the game. 

The game is generated by a computer program and many aspects of the game can 
be configured prior to generation. For instance, the secret protein word
can be changed and the minimal read depth at any loci can be configured. 

The game can be played by a single person or run as a competion, e.g.,  in a class. I have experienced
the latter scenario to be a lot of fun, especially when students work in small groups. 

To get the most out the game, players should have been introduced to/be familiar with the central dogma of biology
and concepts like DNA, base-pairing, amino acid, strand, reading frame, gene and codon before playing the game.


Running the program
===================

The computer program is implemented in PRISM, a probabilistic logic extension 
of Prolog language.

You can get PRISM here: http://sato-www.cs.titech.ac.jp/prism/

Besides PRISM you will need a working installation of latex. The program 
calls pdflatex to generate a PDF-file from the .tex file generated by 
the program.

Once you have both PRISM and Latex installed, you can run the program from PRISM by
starting prism in this directory and typing:

  prism(game), go([g,e,n,e]).<enter>

Where [g,e,n,e] is the secret protein name specified as a Prolog list. 
This will generate the printable game as *gene.pdf* .

If you are fortunate enough to be on a Unix platform, you may also run the 
program to using game.sh hell script, e.g.,

  $ ./game.sh gene

This will generate similarly generate the printable game as *gene.pdf* .

You may adjust various settings such as the minimum read depth and the 
read length by editing *settings.pl*.  



Copyright
=========


Copyright (C) 2014 Christian Theil Have

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
