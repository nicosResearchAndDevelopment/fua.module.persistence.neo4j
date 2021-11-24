UNWIND $quads AS quadParam
WITH
  quadParam.subject AS subjectParam,
  quadParam.predicate AS predicateParam,
  quadParam.object AS objectParam,
  quadParam.graph AS graphParam

MATCH (subjectNode:Term {value: subjectParam.value})
