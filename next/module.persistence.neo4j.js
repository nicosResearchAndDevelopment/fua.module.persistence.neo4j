const
    util        = require('./module.persistence.neo4j.util.js'),
    {DataStore} = require('@nrd/fua.module.persistence');

class Neo4jStore extends DataStore {

    constructor(options, factory) {
        super(options, factory);
        // TODO
    } // Neo4jStore#constructor

    async size() {
        util.assert(false, 'not implemented');
        // TODO
    } // Neo4jStore#size

    async match(subject, predicate, object, graph) {
        util.assert(false, 'not implemented');
        const dataset = await super.match(subject, predicate, object, graph);
        // TODO
    } // Neo4jStore#match

    async add(quads) {
        util.assert(false, 'not implemented');
        const quadArr = await super.add(quads);
        // TODO
    } // Neo4jStore#add

    async addStream(stream) {
        util.assert(false, 'not implemented');
        const quadStream = await super.addStream(stream);
        // TODO
    } // Neo4jStore#addStream

    async delete(quads) {
        util.assert(false, 'not implemented');
        const quadArr = await super.delete(quads);
        // TODO
    } // Neo4jStore#delete

    async deleteStream(stream) {
        util.assert(false, 'not implemented');
        const quadStream = await super.deleteStream(stream);
        // TODO
    } // Neo4jStore#deleteStream

    async deleteMatches(subject, predicate, object, graph) {
        util.assert(false, 'not implemented');
        await super.deleteMatches(subject, predicate, object, graph);
        // TODO
    } // Neo4jStore#deleteMatches

    async has(quads) {
        util.assert(false, 'not implemented');
        const quadArr = await super.has(quads);
        // TODO
    } // Neo4jStore#has

    async createIndex(graph) {
        util.assert(false, 'not implemented');
        // TODO
    } // Neo4jStore#createIndex

} // Neo4jStore

module.exports = Neo4jStore;
