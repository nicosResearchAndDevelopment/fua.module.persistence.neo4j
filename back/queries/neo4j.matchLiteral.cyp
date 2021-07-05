MATCH (subject:Term)
  WHERE CASE
    WHEN $subject IS NULL THEN true
    ELSE subject.termType = $subject.termType AND subject.value = $subject.value
    END

WITH subject
MATCH (predicate:Term)
  WHERE CASE
    WHEN $predicate IS NULL THEN true
    ELSE predicate.termType = $predicate.termType AND predicate.value = $predicate.value
    END

MATCH(datatype:Term:`${object.datatype.termType}` { termType: $object.datatype.termType, value: $object.datatype.value })

WITH subject, predicate, datatype
MATCH (object:Term:`${object.termType}` { termType: $object.termType, value: $object.value, language: $object.language })
  WHERE (object)-[:datatype]->(datatype)

WITH subject, predicate, object, datatype
MATCH (subject)-[quad]->(object)
  WHERE  type(quad) = predicate.value

RETURN
  quad.termType AS termType,
  quad.`$ts` AS `$ts`,
  subject { .termType, .value } AS subject,
  predicate { .termType, .value } AS predicate,
  object { .termType, .value, .language, datatype: properties(datatype) } AS object