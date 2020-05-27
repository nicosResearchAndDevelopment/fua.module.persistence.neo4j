const
    assert = require("assert"),
    neo4j = require("neo4j-driver").v1;

class PersistenceAdapter {
    constructor(param) {
        Object.assign(this, param);
        Object.freeze(this);
    }
} // PersistenceAdapter

/**
 * This is the factory method to build a persistence adapter for neo4j.
 * @param {Object} config 
 * @returns {PersistenceAdapter<neo4j>}
 */
module.exports = function (config) {

    assert(typeof config === "object" && config !== null,
        "The parameter for a persistence adapter must be a nonnull object.");

    // TODO

    return new PersistenceAdapter({
        "@id": config["@id"] || "neo4j"
    });

}; // module.exports