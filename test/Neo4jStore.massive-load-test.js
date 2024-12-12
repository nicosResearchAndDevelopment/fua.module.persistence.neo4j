const
    Neo4jStore             = require('../src/module.persistence.neo4j.js'),
    {join: joinPath}       = require('path'),
    {loadDataFiles}        = require('@fua/module.rdf'),
    {DataFactory, Dataset} = require('@fua/module.persistence'),
    context                = require('./data/context.json');

(async function Main() {
    const
        factory    = new DataFactory(context),
        store      = new Neo4jStore({
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
        }, factory),
        dataFiles  = await loadDataFiles([{
            'dct:identifier': joinPath(process.env.FUA_RESOURCES, 'resource.universe/script/test.universe.next.js'),
            'dct:format':     'application/fua.load+js'
        }, {
            'dct:identifier': joinPath(process.env.FUA_REMOTES, 'IDS/InformationModel/docs/serializations/ontology.ttl'),
            'dct:format':     'text/turtle'
        }, {
            'dct:identifier': joinPath(process.env.FUA_REMOTES, 'IDS/InformationModel/docs/serializations/ontology.ttl'),
            'dct:format':     'text/turtle'
        }], factory),
        datasetArr = dataFiles.map(file => file.dataset).filter(val => val),
        allData    = new Dataset(null, factory);

    await store.createIndex();
    datasetArr.forEach(dataset => allData.add(dataset));
    console.log('size before: ' + await store.size());
    console.log('quads to add: ' + allData.size);

    let added = 0;
    console.time('transfer time');

    // REM Variant 1: Add all data at once.
    // added += await store.add(allData);

    // REM Variant 2: Add all datasets one after another.
    // for (let dataset of datasetArr) {
    //     added += await store.add(dataset);
    // }

    // REM Variant 3: Add all datasets simultaneously.
    const results = await Promise.all(datasetArr.map((dataset) => store.add(dataset)));
    for (let value of results) {
        added += value;
    }

    console.timeEnd('transfer time');
    console.log('added quads: ' + added);
    console.log('size after: ' + await store.size());

    const deleted = await store.delete(allData);
    // const deleted = await store.deleteMatches();
    console.log('deleted quads: ' + deleted);
    await store.clearLooseNodes();
})().catch(err => console.error(err?.stack ?? err)).finally(() => {
    setTimeout(process.exit, 100)
});
