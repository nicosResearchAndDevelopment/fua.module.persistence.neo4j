throw new Error('module.persistence.neo4j : not compatible with current module.persistence');

const
    // dataFactory = require('../../module.persistence/src/module.persistence.js'),
    // datasetFactory = require('../../module.persistence.inmemory/src/module.persistence.inmemory.js'),
    Neo4jStore = require('./Neo4jStore.js');

/**
 * @param {NamedNode} graph
 * @para {Neo4jDriver} driver
 * @returns {Neo4jStore}
 */
exports.store = function (graph, driver) {
    return new Neo4jStore(graph, driver);
};