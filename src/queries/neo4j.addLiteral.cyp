MERGE (subject:Term:`${subject.termType}` { termType: $subject.termType, value: $subject.value })
  ON CREATE SET
  subject.`$ts` = $ts

WITH subject
MERGE (predicate:Term:`${predicate.termType}` { termType: $predicate.termType, value: $predicate.value })
  ON CREATE SET
  predicate.`$ts` = $ts

WITH subject, predicate
MERGE (datatype:Term:`${object.datatype.termType}` { termType: $object.datatype.termType, value: $object.datatype.value })
  ON CREATE SET
  datatype.`$ts` = $ts

WITH subject, predicate, datatype
MERGE (object:Term:`${object.termType}` { termType: $object.termType, value: $object.value, language: $object.language })-[:datatype]->(datatype)
  ON CREATE SET
  object.`$ts` = $ts

WITH subject, predicate, object
MERGE (subject)-[quad:`${predicate.value}`]->(object)
  ON CREATE SET
  quad.termType = 'Quad',
  quad.`$ts` = $ts

RETURN
  (quad.`$ts` = $ts) AS created