module.exports = ({
    // 'Helmut': Helmut,
    'neo4j': neo4j,
    // 'neo4j': neo4j = require("neo4j-driver").v1,
    'neo4j_driver': neo4j_driver,
    'hrt': hrt = () => Date.now() / 1000,
    'config': config = {},
    'default_timeout': default_timeout = 10000 // TODO:config
}) => {

    /**
    * @abstract
    * @param node
    * @param parameter
    * @returns {{}}
    */
    function module_persistence(node, parameter) {
        let
            module_persistence = {}
            ;
        //module_persistence = rdf:Resource(node, parameter);
        return module_persistence;
    } // function module_persistence ()

    function module_persistence_neo4j_factory({
        'neo4j': neo4j,
        'neo4j_driver': driver,
        // 'hrt': hrt,
        //region interface
        '@id': id = "neo4j",
        'config': {
            "log_queries": log_queries = false
        }
    }) {
        const
            // driver = neo4j.driver(config["host"], config["auth"], config["driver-config"]),
            regex_valid_id = /^https?:\/\/\S+$|^\w+:\S+$/,
            array_primitive_types = ["boolean", "number", "string"],
            module_persistence_neo4j = module_persistence({
                '@id': id
            }, /** parameter */ null);

        /**
         * Returns true, if the value is a complete or prefixed IRI.
         * This function is important to distinct values from IRIs and
         * to make sure, subject, predicate and object are valid ids.
         * @param {IRI} value 
         * @returns {Boolean}
         */
        function is_semantic_id(value) {
            return regex_valid_id.test(value);
        } // is_semantic_id

        /**
         * This are the only values neo4j can store on a node.
         * @typedef {null|Boolean|Number|String|Array<Boolean>|Array<Number>|Array<String>} PrimitiveValue 
         */

        /**
         * Returns true, if the value is primitive. This function
         * is important to make sure, a value can be stored in neo4j.
         * @param {PrimitiveValue} value 
         * @returns {Boolean}
         */
        function is_primitive_value(value) {
            return value === null
                || array_primitive_types.includes(typeof value)
                || (Array.isArray(value) && array_primitive_types.some(
                    type => value.every(arrValue => typeof arrValue === type)
                ));
        } // is_primitive_value

        /**
         * Resolves the data types of neo4j, although most likely there are 
         * currently no neo4j data types if only written to neo4j by this module.
         * @param {*} neo4j_value 
         * @returns {*} 
         */
        function neo4j_norm_value(neo4j_value) {
            let normed_value;
            if (neo4j.isInt(neo4j_value)) {
                normed_value = neo4j.integer.inSafeRange(neo4j_value) ? neo4j_value.toNumber() : neo4j_value.toString();
            } else if (neo4j.isDateTime(neo4j_value) || neo4j.isDuration(neo4j_value) || neo4j.isPoint(neo4j_value)) {
                normed_value = neo4j_value.toString();
            } else if (Array.isArray(neo4j_value)) {
                normed_value = neo4j_value.map(neo4j_norm_value);
            } else if (typeof neo4j_value === "object" && neo4j_value !== null) {
                normed_value = {};
                for (let key in neo4j_value) {
                    normed_value[key] = neo4j_norm_value(neo4j_value[key]);
                }
            } else {
                normed_value = neo4j_value;
            }
            return normed_value;
        } // neo4j_norm_value

        /**
         * This is an object, which looks like the return of cypher queries.
         * @typedef {Object} Record 
         */

        /**
         * Creates a nice object from the neo4j record.
         * @param {Neo4j~Record} neo4j_record 
         * @returns {Record} with key-values as defined in the query
         */
        function neo4j_create_record(neo4j_record) {
            let custom_record = {};
            for (let key of neo4j_record['keys']) {
                let value = neo4j_record['_fields'][neo4j_record['_fieldLookup'][key]];
                custom_record[key] = neo4j_norm_value(value);
            }
            return custom_record;
        } // neo4j_create_record

        /**
         * Creates a session and runs the given query with optional 
         * parameter object and returns the result array with custom records.
         * @param {String} query 
         * @param {Object} [param] 
         * @returns {Promise<Array<Record>>}
         */
        async function neo4j_run_query(query, param) {
            let result, session = driver.session();
            try {
                if (log_queries) {
                    console.log([
                        "module_persistence_neo4j : neo4j_run_query :",
                        "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
                        "query:\t" + query.split("\n").join("\n\t"),
                        "param:\t" + JSON.stringify(param, null, 2).split("\n").join("\n\t"),
                        ""
                    ].join("\n"));
                }
                result = await session.run(query, param);
                session.close();
                return result['records'].map(neo4j_create_record);
            } catch (err) {
                session.close();
                throw err;
            }
        } // neo4j_run_query

        /**
         * @param {IRI} subject 
         * @param {Number} timeout 
         * @returns {Promise<Boolean>}
         */
        function module_persistence_neo4j_CREATE(subject, timeout = default_timeout) {
            return new Promise(async (resolve, reject) => {
                let semaphore;
                try {
                    if (!is_semantic_id(subject))
                        throw `module_persistence_neo4j_CREATE : subject <${subject}> invalid.`;
                    semaphore = setTimeout(() => {
                        clearTimeout(semaphore);
                        reject(`module_persistence_neo4j_CREATE : timeout <${timeout}> reached.`);
                    }, timeout);

                    let nodeID = await module_persistence_neo4j_READ(subject, '@id');
                    if (nodeID)
                        throw `module_persistence_neo4j_CREATE : subject <${subject}> already present.`;

                    if (semaphore) clearTimeout(semaphore);
                    await neo4j_run_query(
                        "CREATE (subject:`rdfs:Resource` { `@id`: $subject })",
                        { "subject": subject }
                    );
                    resolve(true);

                } catch (err) {
                    if (semaphore) clearTimeout(semaphore);
                    reject(err);
                } // try
            }); // return new P
        } // function module_persistence_neo4j_CREATE()

        /**
         * @param {IRI} subject 
         * @param {String|Array<String>} [key] 
         * @param {Number} timeout 
         * @returns {Promise<Object|PrimitiveValue|Array<PrimitiveValue>>}
         */
        function module_persistence_neo4j_READ(subject, key, timeout = default_timeout) {
            return new Promise(async (resolve, reject) => {
                let semaphore;
                try {
                    if (!is_semantic_id(subject))
                        throw `module_persistence_neo4j_READ : subject <${subject}> invalid.`;
                    semaphore = setTimeout(() => {
                        clearTimeout(semaphore);
                        reject(`module_persistence_neo4j_READ : timeout <${timeout}> reached.`);
                    }, timeout);
                    if (key) {
                        let is_array = Array.isArray(key), key_array = is_array ? key : [key];
                        let results = await neo4j_run_query(
                            "MATCH (subject:`rdfs:Resource` { `@id`: $subject }) \n" +
                            "WITH subject UNWIND $keys AS key \n" +
                            "RETURN key, CASE key WHEN '@type' THEN labels(subject) ELSE subject[key] END AS value",
                            { "subject": subject, "keys": key_array }
                        );
                        if (semaphore) clearTimeout(semaphore);
                        let value_map = new Map(results.map(record => [record["key"], record["value"]]));
                        let value_array = key_array.map(key => value_map.get(key));
                        resolve(is_array ? value_array : value_array[0]);
                    } else {
                        let results = await neo4j_run_query(
                            "MATCH (subject:`rdfs:Resource` { `@id`: $subject }) \n" +
                            "RETURN subject { .*, `@type`: labels(subject) } AS node",
                            { "subject": subject }
                        );
                        if (results.length === 0)
                            throw `module_persistence_neo4j_READ : subject <${subject}> not found.`;
                        if (results.length > 1)
                            throw `module_persistence_neo4j_READ : subject <${subject}> appeared ${results.length} times. Please make sure to index the @id property uniquely!`;

                        if (semaphore) clearTimeout(semaphore);
                        resolve(results[0]["node"]);
                    } // if ()
                } catch (err) {
                    if (semaphore) clearTimeout(semaphore);
                    reject(err);
                } // try
            }); // return new P
        } // function module_persistence_neo4j_READ()

        /**
         * @param {IRI} subject 
         * @param {string|IRI} key 
         * @param {PrimitiveValue|IRI} value 
         * @param {Number} timeout 
         * @returns {Promise<Boolean>}
         */
        function module_persistence_neo4j_UPDATE(subject, key, value, timeout = default_timeout) {
            return new Promise(async (resolve, reject) => {
                let semaphore;
                try {
                    if (!is_semantic_id(subject))
                        throw `module_persistence_neo4j_UPDATE : subject <${subject}> invalid.`;
                    if (key === "@id")
                        throw `module_persistence_neo4j_UPDATE : the @id cannot be overridden.`;

                    semaphore = setTimeout(() => {
                        clearTimeout(semaphore);
                        reject(`module_persistence_neo4j_UPDATE : timeout <${timeout}> reached.`);
                    }, timeout);

                    if (key === "@type") {
                        let newTypes = Array.isArray(value) ? value : value ? [value] : [];
                        if (newTypes.length === 0)
                            throw `module_persistence_neo4j_UPDATE : the @type must not be empty.`;
                        if (!newTypes.includes("rdfs:Resource"))
                            throw `module_persistence_neo4j_UPDATE : the @type must always contain rdfs:Resource.`;
                        let invalidIndex = newTypes.findIndex(type => !is_semantic_id(type));
                        if (invalidIndex >= 0)
                            throw `module_persistence_neo4j_UPDATE : @type <${newTypes[invalidIndex]}> invalid.`;

                        let
                            oldTypes = await module_persistence_neo4j_READ(subject, '@type'),
                            toAdd = newTypes.filter(type => !oldTypes.includes(type)),
                            toRemove = oldTypes.filter(type => !newTypes.includes(type));

                        if (toAdd.length + toRemove.length === 0) {
                            if (semaphore) clearTimeout(semaphore);
                            resolve(true);
                        } else {
                            let results = await neo4j_run_query(
                                "MATCH (subject:`rdfs:Resource` { `@id`: $subject }) \n" +
                                (toAdd.length === 0 ? "" : "SET " + toAdd.map(
                                    (type) => "subject:`" + type + "`"
                                ).join(",\n    ") + " \n") +
                                (toRemove.length === 0 ? "" : "REMOVE " + toRemove.map(
                                    (type) => "subject:`" + type + "`"
                                ).join(",\n    ") + " \n") +
                                "RETURN true AS success",
                                { "subject": subject }
                            );

                            if (results.length === 0)
                                throw `module_persistence_neo4j_UPDATE : subject <${subject}> not found.`;
                            if (results.length > 1)
                                throw `module_persistence_neo4j_UPDATE : subject <${subject}> appeared ${results.length} times. Please make sure to index the @id property uniquely!`;

                            if (semaphore) clearTimeout(semaphore);
                            resolve(true);
                        }
                    } else if (is_semantic_id(key) && is_semantic_id(value)) {
                        let
                            predicate = key,
                            object = value,
                            results = await neo4j_run_query(
                                "MATCH (subject:`rdfs:Resource` { `@id`: $subject }) \n" +
                                "MATCH (object:`rdfs:Resource` { `@id`: $object }) \n" +
                                "MERGE (subject)-[:`" + predicate + "`]->(object) \n" +
                                "RETURN true AS success",
                                { "subject": subject, "object": object }
                            );

                        if (results.length === 0)
                            throw `module_persistence_neo4j_UPDATE : subject <${subject}> not found.`;
                        if (results.length > 1)
                            throw `module_persistence_neo4j_UPDATE : subject <${subject}> appeared ${results.length} times. Please make sure to index the @id property uniquely!`;

                        if (semaphore) clearTimeout(semaphore);
                        resolve(true);
                    } else {
                        if (!is_primitive_value(value))
                            throw `module_persistence_neo4j_UPDATE : value <${value}> not a primitive value.`;
                        let results = await neo4j_run_query(
                            "MATCH (subject:`rdfs:Resource` { `@id`: $subject }) \n" +
                            "SET subject.`" + key + "` = $value \n" +
                            "RETURN true AS success",
                            { "subject": subject, "value": value }
                        );

                        if (results.length === 0)
                            throw `module_persistence_neo4j_UPDATE : subject <${subject}> not found.`;
                        if (results.length > 1)
                            throw `module_persistence_neo4j_UPDATE : subject <${subject}> appeared ${results.length} times. Please make sure to index the @id property uniquely!`;

                        if (semaphore) clearTimeout(semaphore);
                        resolve(true);
                    } // if ()
                } catch (err) {
                    if (semaphore) clearTimeout(semaphore);
                    reject(err);
                } // try
            }); // return new P
        } // function module_persistence_neo4j_UPDATE()

        /**
         * @param {IRI} subject 
         * @param {IRI} [predicate] 
         * @param {IRI} [object] 
         * @param {Number} timeout 
         * @returns {Promise<Boolean>}
         */
        function module_persistence_neo4j_DELETE(subject, predicate, object, timeout = default_timeout) {
            return new Promise(async (resolve, reject) => {
                let semaphore;
                try {
                    if (!is_semantic_id(subject))
                        throw `module_persistence_neo4j_DELETE : subject <${subject}> invalid.`;
                    semaphore = setTimeout(() => {
                        clearTimeout(semaphore);
                        reject(`module_persistence_neo4j_DELETE : timeout <${timeout}> reached.`);
                    }, timeout);

                    if (!predicate && !object) {
                        await neo4j_run_query(
                            "MATCH (subject:`rdfs:Resource` { `@id`: $subject }) \n" +
                            "DETACH DELETE subject",
                            { "subject": subject }
                        );
                        if (semaphore) clearTimeout(semaphore);
                        resolve(true);
                    } else {
                        if (!is_semantic_id(predicate))
                            throw `module_persistence_neo4j_DELETE : predicate <${predicate}> invalid.`;
                        if (!is_semantic_id(object))
                            throw `module_persistence_neo4j_DELETE : object <${object}> invalid.`;
                        await neo4j_run_query(
                            "MATCH (:`rdfs:Resource` { `@id`: $subject })-[predicate:`" + predicate + "`]->(:`rdfs:Resource` { `@id`: $object }) \n" +
                            "DELETE predicate",
                            { "subject": subject, "object": object }
                        );
                        if (semaphore) clearTimeout(semaphore);
                        resolve(true);
                    }
                } catch (err) {
                    if (semaphore) clearTimeout(semaphore);
                    reject(err);
                } // try
            }); // return new P
        } // function module_persistence_neo4j_DELETE()

        /**
         * @param {IRI} subject 
         * @param {IRI} predicate 
         * @param {Number} timeout 
         * @returns {Promise<Array<IRI>>}
         */
        function module_persistence_neo4j_LIST(subject, predicate, timeout = default_timeout) {
            return new Promise(async (resolve, reject) => {
                let semaphore;
                try {
                    if (!is_semantic_id(subject))
                        throw `module_persistence_neo4j_LIST : subject <${subject}> invalid.`;
                    if (!is_semantic_id(subject))
                        throw `module_persistence_neo4j_LIST : predicate <${predicate}> invalid.`;
                    semaphore = setTimeout(() => {
                        clearTimeout(semaphore);
                        reject(`module_persistence_neo4j_LIST : timeout <${timeout}> reached.`);
                    }, timeout);

                    let results = await neo4j_run_query(
                        "MATCH (subject:`rdfs:Resource` { `@id`: $subject }) \n" +
                        "MATCH (subject)-[:`" + predicate + "`]->(object:`rdfs:Resource`) \n" +
                        "RETURN object.`@id` AS object",
                        { "subject": subject }
                    );
                    if (semaphore) clearTimeout(semaphore);
                    resolve(results.map(record => record["object"]));
                } catch (err) {
                    if (semaphore) clearTimeout(semaphore);
                    reject(err);
                } // try
            }); // return new P
        } // function module_persistence_neo4j_LIST()

        Object.defineProperties(module_persistence_neo4j, {
            '@id': { value: id },
            '@type': { value: ["fua:PersistantAdapterNeo4j", "fua:PersistantAdapter", "rdfs:Resource"] },
            'mode': { value: "neo4j" }
            ,
            //REM: interface methods are shoen with capital letters
            'CREATE': { value: module_persistence_neo4j_CREATE },
            'READ': { value: module_persistence_neo4j_READ },
            'UPDATE': { value: module_persistence_neo4j_UPDATE },
            'DELETE': { value: module_persistence_neo4j_DELETE },
            'LIST': { value: module_persistence_neo4j_LIST }
            // ,
            // 'set': { value: module_persistence_neo4j_set },
            // 'get': { value: module_persistence_neo4j_get }
        }); // Object.defineProperties()

        return module_persistence_neo4j;

    } // module_persistence_neo4j_factory ()

    return module_persistence_neo4j_factory({ 'neo4j': neo4j, 'neo4j_driver': neo4j_driver, 'hrt': hrt, 'config': config });

};