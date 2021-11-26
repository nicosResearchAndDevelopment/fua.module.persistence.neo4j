const
    util            = require('./module.persistence.neo4j.util.js'),
    {DataStore}     = require('@nrd/fua.module.persistence'),
    queries         = require('./module.persistence.neo4j.queries.js'),
    Neo4jConnection = require('./module.persistence.neo4j.connection.js');

class Neo4jStore extends DataStore {

    /** @type {Map<string, Neo4jConnection>} */
    #databases = new Map();
    #defaultDB = '';

    constructor(options, factory) {
        super(options, factory);

        const {defaultDB, databases} = options;
        util.assert(util.isString(defaultDB), 'Neo4jStore#constructor : expected defaultDB to be a string', TypeError);
        util.assert(util.isObject(databases), 'Neo4jStore#constructor : expected databases to be an object', TypeError);

        this.#defaultDB = defaultDB;
        for (let dbParam of util.toArray(databases)) {
            const db = new Neo4jConnection(dbParam);
            util.assert(!this.#databases.has(db.id), 'Neo4jStore#constructor : expected database IDs to be unique');
            this.#databases.set(db.id, db);
        }
        util.assert(this.#databases.size > 0, 'Neo4jStore#constructor : expected at least one database to be defined');
        util.assert(this.#databases.has(defaultDB), 'Neo4jStore#constructor : expected databases to contain the default');
    } // Neo4jStore#constructor

    async size() {
        let size = 0;

        await Promise.all(Array.from(this.#databases.values()).map(async (db) => {
            const records = await db.runQuery(queries.countQuads);
            size += records[0]?.get('size').toNumber() || 0;
        }));

        return size;
    } // Neo4jStore#size

    async match(subject, predicate, object, graph) {
        // TODO
    } // Neo4jStore#match

    // async add(quads) {
    //     // TODO
    // } // Neo4jStore#add

    // async addStream(stream) {
    //     // TODO
    // } // Neo4jStore#addStream

    // async delete(quads) {
    //     // TODO
    // } // Neo4jStore#delete

    // async deleteStream(stream) {
    //     // TODO
    // } // Neo4jStore#deleteStream

    // async deleteMatches(subject, predicate, object, graph) {
    //     // TODO
    // } // Neo4jStore#deleteMatches

    // async has(quads) {
    //     // TODO
    // } // Neo4jStore#has

} // Neo4jStore

module.exports = Neo4jStore;
