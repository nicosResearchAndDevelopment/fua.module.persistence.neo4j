# module.persistence.neo4j

## Interface

```ts
interface Neo4jStoreFactory extends DataStoreCoreFactory {
    store(graph: NamedNode, driver: Neo4jDriver): Neo4jStore;
};
```
