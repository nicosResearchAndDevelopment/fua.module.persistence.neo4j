const
    util = require('./module.persistence.neo4j.util.js');

// SEE https://neo4j.com/docs/cypher-refcard/current/
// SEE https://neo4j.com/docs/cypher-manual/current/syntax/expressions/
// SEE https://neo4j.com/developer/neo4j-apoc/
// SEE https://neo4j.com/labs/apoc/4.3/

exports.countQuads  = util.loadQuery('countQuads.cyp');
exports.addQuads    = util.loadQuery('addQuads.cyp');
exports.matchQuads  = util.loadQuery('matchQuads.cyp');
exports.hasQuads    = util.loadQuery('hasQuads.cyp');
exports.deleteQuads = util.loadQuery('deleteQuads.cyp');

Object.freeze(exports);
