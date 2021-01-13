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

WITH subject, predicate
MATCH (object:Term)
  WHERE CASE
    WHEN $object IS NULL THEN true
    ELSE object.termType = $object.termType AND object.value = $object.value
    END

WITH subject, predicate, object
MATCH (subject)-[quad]->(object)
  WHERE type(quad) = predicate.value

WITH subject, predicate, object, quad
OPTIONAL MATCH (object)-[:datatype]->(datatype:Term)

RETURN
  quad.termType AS termType,
  quad.`$ts` AS `$ts`,
  subject { .termType, .value } AS subject,
  predicate { .termType, .value } AS predicate,
  CASE
    WHEN object.termType = 'Literal' THEN object { .termType, .value, .language, datatype: properties(datatype) }
    ELSE object { .termType, .value }
    END AS object