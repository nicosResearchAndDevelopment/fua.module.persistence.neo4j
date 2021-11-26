const
    util  = require('./module.persistence.neo4j.util.js'),
    neo4j = require('neo4j-driver');

class Neo4jConnection {

    /** @type {import("neo4j-driver").Driver} */
    #driver   = null;
    #database = '';

    constructor({id, connect, auth}) {
        util.assert(util.isString(id), 'Neo4jConnection#constructor : expected id to be a string', TypeError);

        util.assert(util.isObject(connect), 'Neo4jConnection#constructor : expected connect to be an object', TypeError);
        util.assert(util.isString(connect.uri), 'Neo4jStore#constructor : expected connect.uri to be a string', TypeError);
        util.assert(util.isString(connect.database), 'Neo4jStore#constructor : expected connect.database to be a string', TypeError);

        util.assert(util.isObject(auth), 'Neo4jConnection#constructor : expected auth to be an object', TypeError);
        util.assert(util.isString(auth.user), 'Neo4jStore#constructor : expected auth.user to be a string', TypeError);
        util.assert(util.isString(auth.password), 'Neo4jStore#constructor : expected auth.password to be a string', TypeError);

        this.id = id;
        util.lockProp(this, 'id');

        this.#driver = neo4j.driver(connect.uri, neo4j.auth.basic(auth.user, auth.password));
        process.on('beforeExit', () => this.#driver.close());
    } // Neo4jConnection#constructor

    /**
     * @queryParams {string} cypherQuery
     * @queryParams {object} [queryParams]
     * @returns {Promise<Array<import("neo4j-driver").Record>>}
     */
    async runQuery(cypherQuery, queryParams = {}) {
        util.assert(util.isString(cypherQuery), 'Neo4jConnection#runQuery : expected cypherQuery to be a string', TypeError);
        util.assert(util.isObject(queryParams), 'Neo4jConnection#runQuery : expected queryParams to be an object', TypeError);
        const session = this.#driver.session({database: this.#database});

        try {
            const queryResult = await session.run(cypherQuery, queryParams);
            await session.close();
            return queryResult.records;
        } catch (err) {
            await session.close();
            throw err;
        }
    } // Neo4jConnection#runQuery

    /**
     * @template T
     * @param {function((query: string, param?: object) => Promise<Array<import("neo4j-driver").Record>>): Promise<T>} txMethod
     * @returns {Promise<T>}
     */
    async runTransaction(txMethod) {
        util.assert(util.isFunction(txMethod), 'Neo4jConnection#runTransaction : expected txMethod to be a function', TypeError);
        const
            session = this.#driver.session({database: this.#database}),
            txc     = session.beginTransaction();

        async function runQuery(cypherQuery, queryParams = {}) {
            util.assert(txc.isOpen(), 'Neo4jConnection#runTransaction~runQuery : transaction is already closed');
            util.assert(util.isString(cypherQuery), 'Neo4jConnection#runTransaction~runQuery : expected cypherQuery to be a string', TypeError);
            util.assert(util.isObject(queryParams), 'Neo4jConnection#runTransaction~runQuery : expected queryParams to be an object', TypeError);
            try {
                const queryResult = await txc.run(cypherQuery, queryParams);
                return queryResult.records;
            } catch (err) {
                await txc.rollback();
                throw err;
            }
        } // runQuery

        try {
            const txResult = await txMethod(runQuery);
            await txc.commit();
            await session.close();
            return txResult;
        } catch (err) {
            await session.close();
            throw err;
        }
    } // Neo4jConnection#runTransaction

} // Neo4jConnection

module.exports = Neo4jConnection;
