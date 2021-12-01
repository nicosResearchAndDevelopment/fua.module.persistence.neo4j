UNWIND $quads AS quad

CALL apoc.merge.node(
	[ 'Term', quad.subject.termType ],
	quad.subject
)
YIELD node AS subject

CALL apoc.merge.node(
	[ 'Term', quad.object.termType ],
	CASE quad.object.termType
		WHEN 'Literal' THEN {
			termType: quad.object.termType,
			value: quad.object.value,
			language: quad.object.language,
			datatype: quad.object.datatype.value
		}
		ELSE quad.object
	END
)
YIELD node AS object

WITH apoc.nodes.connected(
	subject,
	object,
	'`' + quad.predicate.value + '`>'
) AS connected

RETURN all(value IN collect(connected) WHERE value = true) AS included
