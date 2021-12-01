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

CALL apoc.merge.relationship(
	subject,
	quad.predicate.value,
	null,
	{ _created: true },
	object,
	{ _created: null }
)
YIELD rel AS predicate

RETURN exists(predicate._created) AS created
