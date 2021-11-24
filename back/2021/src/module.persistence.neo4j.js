const
    _                    = require('./module.persistence.neo4j.util.js'),
    {Dataset, DataStore} = require('@nrd/fua.module.persistence'),
    neo4j                = require('neo4j-driver'),
    Query_size           = _.loadQuery('neo4j.size.cyp'),
    Query_addRelation    = _.loadQuery('neo4j.addRelation.cyp'),
    Query_addLiteral     = _.loadQuery('neo4j.addLiteral.cyp'),
    Query_delete         = _.loadQuery('neo4j.delete.cyp'),
    Query_hasRelation    = _.loadQuery('neo4j.hasRelation.cyp'),
    Query_hasLiteral     = _.loadQuery('neo4j.hasLiteral.cyp'),
    Query_matchRelation  = _.loadQuery('neo4j.matchRelation.cyp'),
    Query_matchLiteral   = _.loadQuery('neo4j.matchLiteral.cyp');

class Neo4jStore extends DataStore {

    #driver = null;

    constructor(options, factory) {
        super(options, factory);
        // TODO
        _.assert(options.driver && typeof options.driver.session === 'function', 'invalid driver');
        this.#driver = options.driver;
    } // Neo4jStore#constructor

    async size() {
        const records = await Query_size(this.#driver);
        return records.length > 0 && records[0].size.toNumber() || 0;
    } // Neo4jStore#size

    async match(subject, predicate, object, graph) {
        const dataset = await super.match(subject, predicate, object, graph);
        // TODO
        _.assert(false, 'not implemented');
    } // Neo4jStore#match

    async add(quads) {
        const quadArr = await super.add(quads), ts = _.hrt();
        let addCount  = 0;

        // REM: Neo4jError: LockClient[980 for transaction: 638] can't wait on resource RWLock[NODE(50), hash=1748831453] since 
        // => LockClient[980 for transaction: 638] <-[:HELD_BY]- RWLock[NODE(57), hash=1202783845] <-[:WAITING_FOR]
        // - LockClient[1079 for transaction: 734] <-[:HELD_BY]- RWLock[NODE(50), hash=1748831453]

        //await Promise.all(quadArr.map(async (quad) => {
        //    const
        //        Query_add = this.factory.isLiteral(quad.object) ? Query_addLiteral : Query_addRelation,
        //        records   = await Query_add(this.#driver, {
        //            subject:   quad.subject,
        //            predicate: quad.predicate,
        //            object:    quad.object,
        //            ts:        ts
        //        });
        //
        //    if (records.length > 0 && records[0].created) {
        //        addCount++;
        //        this.emit('created', quad);
        //    }
        //}));

        for (let quad of quadArr) {
            const
                Query_add = this.factory.isLiteral(quad.object) ? Query_addLiteral : Query_addRelation,
                records   = await Query_add(this.#driver, {
                    subject:   quad.subject,
                    predicate: quad.predicate,
                    object:    quad.object,
                    ts:        ts
                });

            if (records.length > 0 && records[0].created) {
                addCount++;
                this.emit('created', quad);
            }
        }

        return addCount;
    } // Neo4jStore#add

    async addStream(stream) {
        const quadStream = await super.addStream(stream);
        // TODO
        _.assert(false, 'not implemented');
    } // Neo4jStore#addStream

    async delete(quads) {
        const quadArr = await super.delete(quads);
        // TODO
        _.assert(false, 'not implemented');
    } // Neo4jStore#delete

    async deleteStream(stream) {
        const quadStream = await super.deleteStream(stream);
        // TODO
        _.assert(false, 'not implemented');
    } // Neo4jStore#deleteStream

    async deleteMatches(subject, predicate, object, graph) {
        await super.deleteMatches(subject, predicate, object, graph);
        // TODO
        _.assert(false, 'not implemented');
    } // Neo4jStore#deleteMatches

    async has(quads) {
        const quadArr = await super.has(quads);
        // TODO
        _.assert(false, 'not implemented');
    } // Neo4jStore#has

} // Neo4jStore

module.exports = Neo4jStore;