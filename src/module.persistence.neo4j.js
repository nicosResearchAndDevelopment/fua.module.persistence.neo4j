const
    util        = require('./module.persistence.neo4j.util.js'),
    {DataStore} = require('@nrd/fua.module.persistence'),
    neo4j       = require('neo4j-driver');

class Neo4jStore extends DataStore {

    // constructor(options, factory) {
    //     super(options, factory);
    // } // Neo4jStore#constructor

    // async size() {
    //     // TODO
    // } // Neo4jStore#size

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
