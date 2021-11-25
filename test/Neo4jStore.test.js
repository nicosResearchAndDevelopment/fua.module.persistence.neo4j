const
    {describe, test, before, after} = require('mocha'),
    expect                          = require('expect'),
    Neo4jStore                      = require('../src/module.persistence.neo4j.js'),
    sleep                           = (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    options                         = {
        defaultDB: 'neo4j://local-default',
        databases: [{
            id:      'neo4j://local-default',
            connect: {
                uri:      'bolt://localhost:7687/',
                database: 'neo4j'
            },
            auth:    {
                user:     'neo4j',
                password: 'test'
            }
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
        const size = await store.size();
        expect(typeof size).toBe('number');
        expect(size).toBe(0);
    });

    after('wait a sec before finishing', async function () {
        this.timeout(3e3);
        await sleep(1e3);
    });

});
