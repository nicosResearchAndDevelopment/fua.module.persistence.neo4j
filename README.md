# module.persistence.neo4j

- [Persistence](https://git02.int.nsc.ag/Research/fua/lib/module.persistence)

## Interface

```ts
interface Neo4jStoreFactory extends DataStoreCoreFactory {
    store(graph: NamedNode, driver: Neo4jDriver): Neo4jStore;
};
```