const neo4j = require("neo4j-driver").v1;

const neo4j_persistence_adapter = require("../src/fua.module.persistence.neo4j.js")({
    'neo4j': neo4j,
    'neo4j-driver': neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "neo4j")),
    'hrt': () => Date.now() / 1e3,
    'config': {},
    'default_timeout': 10e3
});

console.log(neo4j_persistence_adapter.CREATE);
console.log(neo4j_persistence_adapter.READ);
console.log(neo4j_persistence_adapter.UPDATE);
console.log(neo4j_persistence_adapter.DELETE);
console.log(neo4j_persistence_adapter.LIST);