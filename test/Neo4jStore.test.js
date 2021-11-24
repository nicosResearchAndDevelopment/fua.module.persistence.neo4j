const
    {describe, test, before} = require('mocha'),
    expect                   = require('expect'),
    Neo4jStore               = require('../src/module.persistence.neo4j.js'),
    options                  = {
        uri:       'bolt://localhost:7687/',
        user:      'neo4j',
        password:  'test',
        defaultDB: 'bolt://localhost:7687/?use=neo4j',
        databases: [{
            id:   'bolt://localhost:7687/?use=neo4j',
            name: 'neo4j'
        }]
    };

describe('module.persistence.neo4j', function () {

    let store, quad_1, quad_2;
    before('construct a Neo4jStore and two quads', async function () {
        store = new Neo4jStore(options);
        // await store.createIndex();

        quad_1 = store.factory.quad(
            store.factory.namedNode('http://example.com/subject'),
            store.factory.namedNode('http://example.com/predicate'),
            store.factory.namedNode('http://example.com/object')
        );
        quad_2 = store.factory.quad(
            quad_1.subject,
            quad_1.predicate,
            store.factory.literal('Hello World', 'en')
        );
    });

    test('should have an initial size of 0', async function () {
        expect(await store.size()).toBe(0);
    });

});
