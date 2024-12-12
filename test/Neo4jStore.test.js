const
  { describe, test, before, after } = require('mocha'),
  expect = require('expect'),
  Neo4jStore = require('../src/module.persistence.neo4j.js'),
  sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  options = {
    defaultDB: 'neo4j://local-default',
    databases: [{
      id: 'neo4j://local-default',
      connect: {
        uri: 'bolt://localhost:7687/',
        database: 'neo4j'
      },
      auth: {
        user: 'neo4j',
        password: 'test'
      }
    }]
  };

describe.skip('module.persistence.neo4j', function () {

  // TODO mockup of neo4j needed

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

  test('should create an index', async function () {
    await store.createIndex();
  });

  test('should add the two quads to the store once', async function () {
    expect(await store.add(quad_1)).toBeTruthy();
    expect(await store.add(quad_2)).toBeTruthy();
    expect(await store.add(quad_1)).toBeFalsy();
    expect(await store.add(quad_2)).toBeFalsy();
  });

  test('should match the two added quads by their subject', async function () {
    /** @type {Dataset} */
    const result = await store.match(quad_1.subject);
    expect(result.has(quad_1)).toBeTruthy();
    expect(result.has(quad_2)).toBeTruthy();
  });

  test('should currently have a size of 2', async function () {
    expect(await store.size()).toBe(2);
  });

  test('should delete the first quad once', async function () {
    await sleep(50);
    expect(await store.delete(quad_1)).toBeTruthy();
    expect(await store.delete(quad_1)).toBeFalsy();
  });

  test('should only have the second quad stored', async function () {
    await sleep(50);
    expect(await store.has(quad_1)).toBeFalsy();
    expect(await store.has(quad_2)).toBeTruthy();
  });

  test('should match the remaining quad by its object', async function () {
    await sleep(50);
    /** @type {Dataset} */
    const result = await store.match(null, null, quad_2.object);
    expect(result.has(quad_1)).toBeFalsy();
    expect(result.has(quad_2)).toBeTruthy();
  });

  test('should have a size of 0, after it deleted the second quad', async function () {
    await sleep(50);
    await store.delete(quad_2);
    expect(await store.size()).toBe(0);
  });

  after('wait a sec before finishing', async function () {
    this.timeout(3e3);
    await sleep(1e3);
  });

});
