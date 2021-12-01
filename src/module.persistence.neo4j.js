const
    util            = require('./module.persistence.neo4j.util.js'),
    {DataStore}     = require('@nrd/fua.module.persistence'),
    queries         = require('./queries/index.js'),
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
            size += records[0]?.get('count').toNumber() || 0;
        }));

        return size;
    } // Neo4jStore#size

    async match(subject, predicate, object, graph) {
        const dataset = await super.match(subject, predicate, object, graph);
        let dbIterable;

        if (graph) {
            if (this.factory.isDefaultGraph(graph)) {
                dbIterable = [this.#databases.get(this.#defaultDB)];
            } else {
                util.assert(this.factory.isNamedNode(graph), 'Neo4jStore#match : expected graph to be a NamedNode');
                dbIterable = [this.#databases.get(graph.value)];
            }
        } else {
            dbIterable = this.#databases.values();
        }

        for (let db of dbIterable) {
            const
                records = await db.runQuery(queries.matchQuads, {
                    subject:   subject || null,
                    predicate: predicate || null,
                    object:    object || null
                }),
                dbGraph = (db.id === this.#defaultDB)
                    ? this.factory.defaultGraph()
                    : this.factory.namedNode(db.id);
            for (let record of records) {
                const quad = this.factory.quad(
                    this.factory.fromTerm(record.get('subject')),
                    this.factory.fromTerm(record.get('predicate')),
                    this.factory.fromTerm(record.get('object')),
                    dbGraph
                );
                dataset.add(quad);
            }
        }

        return dataset;
    } // Neo4jStore#match

    async add(quads) {
        const
            quadArr    = await super.add(quads),
            quadArrMap = new Map();

        for (let quad of quadArr) {
            let db;
            if (this.factory.isDefaultGraph(quad.graph)) {
                db = this.#databases.get(this.#defaultDB);
            } else {
                util.assert(this.factory.isNamedNode(quad.graph), 'Neo4jStore#add : expected quad.graph to be a NamedNode');
                db = this.#databases.get(quad.graph.value);
            }
            util.assert(db, 'Neo4jStore#add : expected quad to contain a known graph');
            if (quadArrMap.has(db)) {
                quadArrMap.get(db).push(quad);
            } else {
                quadArrMap.set(db, [quad]);
            }
        }

        let added = 0;
        for (let [db, dbQuadArr] of quadArrMap.entries()) {
            const records = await db.runQuery(queries.addQuads, {quads: dbQuadArr});
            util.assert(dbQuadArr.length === records.length, 'Neo4jStore#add : expected at much records as there were quads');
            records.forEach((record, index) => {
                // console.log(util.convertRecord(record));
                if (record.get('created')) {
                    this.emit('added', dbQuadArr[index]);
                    added++;
                }
            });
        }

        return added;
    } // Neo4jStore#add

    async addStream(stream) {
        const
            quadStream = await super.addStream(stream),
            quadArr    = [];
        quadStream.on('data', quad => quadArr.push(quad));
        await new Promise(resolve => quadStream.on('end', resolve));
        return await this.add(quadArr);
    } // Neo4jStore#addStream

    async delete(quads) {
        const
            quadArr    = await super.delete(quads),
            quadArrMap = new Map();

        for (let quad of quadArr) {
            let db;
            if (this.factory.isDefaultGraph(quad.graph)) {
                db = this.#databases.get(this.#defaultDB);
            } else {
                util.assert(this.factory.isNamedNode(quad.graph), 'Neo4jStore#has : expected quad.graph to be a NamedNode');
                db = this.#databases.get(quad.graph.value);
            }
            util.assert(db, 'Neo4jStore#has : expected quad to contain a known graph');
            if (quadArrMap.has(db)) {
                quadArrMap.get(db).push(quad);
            } else {
                quadArrMap.set(db, [quad]);
            }
        }

        let deleted = 0;
        for (let [db, dbQuadArr] of quadArrMap.entries()) {
            const records = await db.runQuery(queries.deleteQuads, {quads: dbQuadArr});
            util.assert(dbQuadArr.length === records.length, 'Neo4jStore#add : expected at much records as there were quads');
            records.forEach((record, index) => {
                // console.log(util.convertRecord(record));
                if (record.get('deleted')) {
                    this.emit('deleted', dbQuadArr[index]);
                    deleted++;
                }
            });
        }

        return deleted;
    } // Neo4jStore#delete

    async deleteStream(stream) {
        const
            quadStream = await super.deleteStream(stream),
            quadArr    = [];
        quadStream.on('data', quad => quadArr.push(quad));
        await new Promise(resolve => quadStream.on('end', resolve));
        return await this.delete(quadArr);
    } // Neo4jStore#deleteStream

    async deleteMatches(subject, predicate, object, graph) {
        const matches = await this.match(subject, predicate, object, graph);
        return await this.delete(matches);
    } // Neo4jStore#deleteMatches

    async has(quads) {
        const
            quadArr    = await super.has(quads),
            quadArrMap = new Map();

        for (let quad of quadArr) {
            let db;
            if (this.factory.isDefaultGraph(quad.graph)) {
                db = this.#databases.get(this.#defaultDB);
            } else if (this.factory.isNamedNode(quad.graph)) {
                db = this.#databases.get(quad.graph.value);
            }
            if (!db) return false;
            if (quadArrMap.has(db)) {
                quadArrMap.get(db).push(quad);
            } else {
                quadArrMap.set(db, [quad]);
            }
        }

        for (let [db, dbQuadArr] of quadArrMap.entries()) {
            const records = await db.runQuery(queries.hasQuads, {quads: dbQuadArr});
            // console.log(records.map(util.convertRecord));
            if (!records[0]?.get('included')) return false;
        }

        return true;
    } // Neo4jStore#has

    async createIndex(graph) {
        let dbIterable;

        if (graph) {
            if (this.factory.isDefaultGraph(graph)) {
                dbIterable = [this.#databases.get(this.#defaultDB)];
            } else {
                util.assert(this.factory.isNamedNode(graph), 'Neo4jStore#match : expected graph to be a NamedNode');
                dbIterable = [this.#databases.get(graph.value)];
            }
        } else {
            dbIterable = this.#databases.values();
        }

        for (let db of dbIterable) {
            await db.runTransaction(async (runQuery) => {
                await runQuery('CREATE CONSTRAINT IF NOT EXISTS ON (n:NamedNode) ASSERT n.value IS UNIQUE');
                await runQuery('CREATE CONSTRAINT IF NOT EXISTS ON (n:BlankNode) ASSERT n.value IS UNIQUE');
                await runQuery('CREATE INDEX IF NOT EXISTS FOR (n:Literal) ON (n.value)');
            });
        }
    } // Neo4jStore#createIndex

    async clearLooseNodes(graph) {
        let dbIterable;

        if (graph) {
            if (this.factory.isDefaultGraph(graph)) {
                dbIterable = [this.#databases.get(this.#defaultDB)];
            } else {
                util.assert(this.factory.isNamedNode(graph), 'Neo4jStore#match : expected graph to be a NamedNode');
                dbIterable = [this.#databases.get(graph.value)];
            }
        } else {
            dbIterable = this.#databases.values();
        }

        for (let db of dbIterable) {
            await db.runQuery(queries.removeLooseNodes);
        }
    } // Neo4jStore#clearLooseNodes

} // Neo4jStore

module.exports = Neo4jStore;
