const
    util        = require('./module.persistence.neo4j.util.js'),
    // queries     = require('./module.persistence.neo4j.queries.js'),
    {DataStore} = require('@nrd/fua.module.persistence'),
    neo4j       = require('neo4j-driver');

class Neo4jStore extends DataStore {

    /** @type {import("neo4j-driver").Driver} */
    #driver = null;

    constructor(options, factory) {
        super(options, factory);
        const {uri, user, password} = options;
        util.assert(util.isString(uri), 'Neo4jStore#constructor : expected uri to be a string', TypeError);
        util.assert(util.isString(user), 'Neo4jStore#constructor : expected user to be a string', TypeError);
        util.assert(util.isString(password), 'Neo4jStore#constructor : expected password to be a string', TypeError);
        this.#driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
        process.on('beforeExit', () => this.#driver.close());
    } // Neo4jStore#constructor

    async size() {
        const
            /** @type {import("neo4j-driver").Session} */
            session = this.#driver.session({database: 'neo4j'}),
            txc     = session.beginTransaction();

        try {
            const
                result = await txc.run(
                    'MATCH (:Term)-[quad]->(:Term) ' +
                    'RETURN count(DISTINCT quad) AS size'
                ),
                size   = result.records[0]?.get('size').toNumber() || 0;

            await txc.commit();
            await session.close();
            return size;
        } catch (err) {
            await txc.rollback();
            await session.close();
            throw err;
        }
    } // Neo4jStore#size

    // async match(subject, predicate, object, graph) {
    //     // TODO
    // } // Neo4jStore#match

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
