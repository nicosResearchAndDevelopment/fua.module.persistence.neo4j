const
    {join: joinPath} = require('path'),
    {readFileSync}   = require('fs'),
    loadQuery        = (filename) => readFileSync(joinPath(__dirname, filename), 'utf-8');

// SEE https://neo4j.com/docs/cypher-refcard/current/
// SEE https://neo4j.com/docs/cypher-manual/current/syntax/expressions/
// SEE https://neo4j.com/developer/neo4j-apoc/
// SEE https://neo4j.com/labs/apoc/4.3/

exports.countQuads       = loadQuery('neo4j.countQuads.cyp');
exports.addQuads         = loadQuery('neo4j.addQuads.cyp');
exports.matchQuads       = loadQuery('neo4j.matchQuads.cyp');
exports.hasQuads         = loadQuery('neo4j.hasQuads.cyp');
exports.deleteQuads      = loadQuery('neo4j.deleteQuads.cyp');
exports.removeLooseNodes = loadQuery('neo4j.removeLooseNodes.cyp');

Object.freeze(exports);
