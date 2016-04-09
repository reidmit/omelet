LANGUAGES = omelet html dust liquid

.PHONY:parsers
parsers:
	for lang in ${LANGUAGES}; do \
		pegjs grammars/$$lang.peg parsers/$$lang.js; \
	done