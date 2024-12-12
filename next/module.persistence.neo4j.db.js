const
    util                   = require('./module.persistence.neo4j.util.js'),
    neo4j                  = require('neo4j-driver'),
    {Dataset, DataFactory} = require('@fua/module.persistence');

class Neo4jDatabase {

    /** @type {import("neo4j-driver").Driver} */
    #driver   = null;
    #database = '';

    #queue = new util.WaitQueue();

    constructor({id, connect, auth}) {
        util.assert(util.isString(id), 'Neo4jDatabase#constructor : expected id to be a string', TypeError);

        util.assert(util.isString(connect?.uri), 'Neo4jDatabase#constructor : expected connect.uri to be a string', TypeError);
        util.assert(util.isString(connect?.database), 'Neo4jDatabase#constructor : expected connect.database to be a string', TypeError);

        util.assert(util.isString(auth?.user), 'Neo4jDatabase#constructor : expected auth.user to be a string', TypeError);
        util.assert(util.isString(auth?.password), 'Neo4jDatabase#constructor : expected auth.password to be a string', TypeError);

        this.id = id;
        util.lockProp(this, 'id');

        this.#database = connect.database;
        this.#driver   = neo4j.driver(connect.uri, neo4j.auth.basic(auth.user, auth.password));
        process.on('beforeExit', () => this.#driver.close());
    } // Neo4jConnection#constructor

    createTransaction(factory) {
        return {
            addCache:    new Dataset(null, factory),
            deleteCache: new Dataset(null, factory),
            addQuads(quads) {
                this.addCache.add(quads);
                this.deleteCache.delete(quads);
                return this;
            },
            deleteQuads(quads) {
                this.addCache.delete(quads);
                this.deleteCache.add(quads);
                return this;
            }
        };
    } // Neo4jDatabase#createTransaction

    async submitTransaction(transaction) {
        const ticket  = await this.#queue.requestTicket();
        // const promise = transaction.submit(this.#driver.session());
    } // Neo4jDatabase#createTransaction

} // Neo4jDatabase

module.exports = Neo4jDatabase;
