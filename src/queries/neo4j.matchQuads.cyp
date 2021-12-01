MATCH (subject:Term)-[predicate]->(object:Term)

WHERE (
	$subject IS NULL OR (
		$subject.termType = subject.termType
		AND $subject.value = subject.value
	)
) AND (
	$predicate IS NULL OR (
		$predicate.termType = 'NamedNode'
		AND $predicate.value = type(predicate)
	)
) AND (
	$object IS NULL OR (
		$object.termType = object.termType
		AND $object.value = object.value
		AND (object.termType <> 'Literal' OR (
			$object.language = object.language
			AND $object.datatype.value = object.datatype
		))
	)
)

RETURN
	{
		termType: subject.termType,
		value: subject.value
	} AS subject,
	{
		termType: 'NamedNode',
		value: type(predicate)
	} AS predicate,
	CASE object.termType
		WHEN 'Literal' THEN {
			termType: object.termType,
			value: object.value,
			language: object.language,
			datatype: {
				termType: 'NamedNode',
				value: object.datatype
			}
		}
		ELSE {
			termType: object.termType,
			value: object.value
		}
	END AS object
