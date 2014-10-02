#!/bin/sh

if [ $# != 1 ]; then 
	echo "program needs a protein word argument"
else
	PROTEIN=`echo $1|tr '[:upper:]' '[:lower:]' | sed -e 's/\(.\)/,\1/g'|cut -d"," -f2-`
	prism -g "prism(game),assert(secret_protein([$PROTEIN])),go,halt."
fi
