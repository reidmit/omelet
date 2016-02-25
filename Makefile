LANGUAGES = omelet html dust

.PHONY:parsers
parsers:
	for lang in ${LANGUAGES}; do \
		pegjs grammars/$$lang.peg parsers/$$lang.js; \
	done