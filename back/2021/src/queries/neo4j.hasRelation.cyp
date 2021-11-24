MATCH (subject:Term:`${subject.termType}` { termType: $subject.termType, value: $subject.value })
MATCH (predicate:Term:`${predicate.termType}` { termType: $predicate.termType, value: $predicate.value })
MATCH (object:Term:`${object.termType}` { termType: $object.termType, value: $object.value })
MATCH (subject)-[quad:`${predicate.value}`]->(object)

RETURN
  true AS has