const
    util = require('./module.persistence.neo4j.util.js');

exports.countQuads = util.loadQuery('countQuads.cyp');

Object.freeze(exports);
