const
    neo4j = require("neo4j-driver").v1,
    neo4j_driver = neo4j.driver(
        "bolt://localhost:7687",
        neo4j.auth.basic("neo4j", "persistence")
    ),
    fua_module_persistence_neo4j = require("../src/fua.module.persistence.neo4j.js");

// REM Only ever run on a test database. Queries might destroy active data.
// I would advice to download neo4j-community-3.5.x from https://neo4j.com/download-center/
// and run it locally with "bin/neo4j.bat console". The gitignore will exclude all folders 
// starting with "neo4j-" to make sure, those test databases do not get pushed.

(async (/* async IIFE */) => {

    const init_session = neo4j_driver.session();
    await init_session.run("CREATE CONSTRAINT ON (node:`rdfs:Resource`) ASSERT node.`@id` IS UNIQUE");
    await init_session.run("MATCH (n) DETACH DELETE n");
    init_session.close();

    const neo4j_persistence_adapter = fua_module_persistence_neo4j({
        'neo4j': neo4j,
        'neo4j_driver': neo4j_driver,
        'driver': neo4j_driver,
        // 'hrt': () => Date.now() / 1e3,
        'config': {
            'log_queries': true
        },
        // 'default_timeout': 10e3
    });

    await neo4j_persistence_adapter.CREATE("test:hello_world");
    await neo4j_persistence_adapter.UPDATE("test:hello_world", "@type", ["rdfs:Resource", "ldp:NonRDFSource", "xsd:string"]);
    await neo4j_persistence_adapter.UPDATE("test:hello_world", "@value", "Hello World!");
    await neo4j_persistence_adapter.CREATE("test:lorem_ipsum");
    await neo4j_persistence_adapter.UPDATE("test:lorem_ipsum", "rdf:label", "Lorem Ipsum");
    await neo4j_persistence_adapter.UPDATE("test:lorem_ipsum", "test:property", "test:hello_world");
    await neo4j_persistence_adapter.UPDATE("test:hello_world", "test:marzipan", "test:lorem_ipsum");
    console.log("READ(test:hello_world) =>", await neo4j_persistence_adapter.READ("test:hello_world"), "\n");
    console.log("LIST(test:lorem_ipsum, test:property) =>", await neo4j_persistence_adapter.LIST("test:lorem_ipsum", "test:property"), "\n");
    await neo4j_persistence_adapter.DELETE("test:hello_world", "test:marzipan", "test:lorem_ipsum");

})(/* async IIFE */).catch(console.error);
