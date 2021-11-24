const
    util        = require('./module.persistence.neo4j.util.js'),
    // queries     = require('./module.persistence.neo4j.queries.js'),
    {DataStore} = require('@nrd/fua.module.persistence'),
    neo4j       = require('neo4j-driver');

/**
 * @typedef {object} DatabaseDescription
 * @property {string} id An explicitly defined or randomly generated id for the graph reference.
 * @property {string} name The name of the database in the neo4j instance.
 */

class Neo4jStore extends DataStore {

    /** @type {import("neo4j-driver").Driver} */
    #driver    = null;
    /** @type {Map<string, DatabaseDescription>} */
    #databases = new Map();
    #defaultDB = '';

    constructor(options, factory) {
        super(options, factory);

        const {uri, user, password, defaultDB, databases} = options;
        util.assert(util.isString(uri), 'Neo4jStore#constructor : expected uri to be a string', TypeError);
        util.assert(util.isString(user), 'Neo4jStore#constructor : expected user to be a string', TypeError);
        util.assert(util.isString(password), 'Neo4jStore#constructor : expected password to be a string', TypeError);
        util.assert(util.isString(defaultDB), 'Neo4jStore#constructor : expected defaultDB to be a string', TypeError);
        util.assert(util.isObjectArray(databases), 'Neo4jStore#constructor : expected databases to be an object array', TypeError);

        this.#defaultDB = defaultDB;
        for (let db of databases) {
            util.assert(!this.#databases.has(db.id), 'Neo4jStore#constructor : expected database IDs to be unique');
            this.#databases.set(db.id, db);
        }
        util.assert(this.#databases.size > 0, 'Neo4jStore#constructor : expected at least one database to be defined');
        util.assert(this.#databases.has(defaultDB), 'Neo4jStore#constructor : expected databases to contain the default');

        this.#driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
        process.on('beforeExit', () => this.#driver.close());
    } // Neo4jStore#constructor

    async size() {
        let size = 0;

        await Promise.all(Array.from(this.#databases.values()).map(async (db) => {
            const
                /** @type {import("neo4j-driver").Session} */
                session = this.#driver.session({database: db.name}),
                txc     = session.beginTransaction();

            try {
                const result = await txc.run(
                    'MATCH (:Term)-[quad]->(:Term) ' +
                    'RETURN count(DISTINCT quad) AS size'
                );
                size += result.records[0]?.get('size').toNumber() || 0;
                await txc.commit();
                await session.close();
            } catch (err) {
                await txc.rollback();
                await session.close();
                throw err;
            }
        }));

        return size;
    } // Neo4jStore#size

    async match(subject, predicate, object, graph) {
        // const
        //     /** @type {import("neo4j-driver").Session} */
        //     session = this.#driver.session({database: 'neo4j'}),
        //     txc     = session.beginTransaction();
        //
        // try {
        //     const
        //         result = await txc.run(
        //             'MATCH (:Term)-[quad]->(:Term) ' +
        //             'RETURN count(DISTINCT quad) AS size'
        //         ),
        //         size   = result.records[0]?.get('size').toNumber() || 0;
        //
        //     await txc.commit();
        //     await session.close();
        //     return size;
        // } catch (err) {
        //     await txc.rollback();
        //     await session.close();
        //     throw err;
        // }
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
