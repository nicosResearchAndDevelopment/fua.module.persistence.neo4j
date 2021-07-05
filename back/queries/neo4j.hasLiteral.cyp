MATCH (subject:Term:`${subject.termType}` { termType: $subject.termType, value: $subject.value })
MATCH (predicate:Term:`${predicate.termType}` { termType: $predicate.termType, value: $predicate.value })
MATCH(datatype:Term:`${object.datatype.termType}` { termType: $object.datatype.termType, value: $object.datatype.value })
MATCH (object:Term:`${object.termType}` { termType: $object.termType, value: $object.value, language: $object.language })
  WHERE (object)-[:datatype]->(datatype)

WITH subject, predicate, object
MATCH (subject)-[quad:`${predicate.value}`]->(object)

RETURN
  true AS has