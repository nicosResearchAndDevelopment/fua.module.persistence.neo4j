const
    assert = require("assert"),
    regex_semantic_id = /^https?:\/\/\S+$|^\w+:\S+$/,
    regex_cypher_save_string = /^[^`'"]*$/,
    array_primitive_types = Object.freeze(["boolean", "number", "string"]);

/**
 * This is the general concept of a persistence adapter.
 * @typedef {Object} PersistenceAdapter 
 * @property {Function} CREATE Create a resource.
 * @property {Function} READ Return a resource or some properties.
 * @property {Function} UPDATE Update a property or a reference.
 * @property {Function} DELETE Delete a resource or a reference.
 * @property {Function} LIST List targets of a reference on a resource.
 * 
 * This is a persistent adapter with build in methods for neo4j.
 * @typedef {PersistenceAdapter} Neo4jAdapter
 * 
 * This is the factory method to build a persistence adapter for neo4j.
 * @param {Object} config 
 * @param {Neo4j~Driver} config.driver
 * @returns {Neo4jAdapter}
 */
module.exports = function (config) {

    assert(typeof config === "object" && config !== null,
        "The config for a persistence adapter must be a nonnull object.");
    assert(typeof config["driver"] === "object" && config["driver"] !== null && typeof config["driver"]["session"] === "function",
        "The config.driver must contain a neo4j driver instance.");

    /** @type {Neo4j~Driver} */
    const neo4j_driver = config["driver"];

    /**
     * Returns true, if the value does not include any `, ' or ".
     * @param {string} value 
     * @returns {Boolean}
     */
    function is_cypher_save_string(value) {
        return regex_cypher_save_string.test(value);
    } // is_cypher_save_string

    /**
     * This is an IRI or a prefixed IRI.
     * @typedef {string|IRI} SemanticID
     * 
     * Returns true, if the value is a complete or prefixed IRI.
     * This function is important to distinct values from IRIs and
     * to make sure, subject, predicate and object have valid ids.
     * @param {SemanticID} value 
     * @returns {Boolean}
     */
    function is_semantic_id(value) {
        return regex_semantic_id.test(value);
    } // is_semantic_id

    /**
     * This are the only values neo4j can store on a node.
     * @typedef {null|Boolean|Number|String|Array<Boolean>|Array<Number>|Array<String>} PrimitiveValue 
     * 
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
     * This is an object, which looks like the return of cypher queries.
     * @typedef {Object} Record 
     * 
     * Creates a nice object from a neo4j record.
     * @param {Neo4j~Record} neo4j_record 
     * @returns {Record} with key-values as defined in the return of the query
     */
    function create_record(neo4jRecord) {
        let customRecord = {};
        for (let key of neo4jRecord['keys']) {
            let value = neo4jRecord['_fields'][neo4jRecord['_fieldLookup'][key]];
            customRecord[key] = value;
        }
        return customRecord;
    } // create_record

    /**
     * Creates a session and runs the given query with optional 
     * parameter object and returns an array of records as result.
     * @async
     * @param {String} query 
     * @param {Object} [param] 
     * @returns {Array<Record>}
     */
    async function request_neo4j(query, param) {
        let session = neo4j_driver.session();
        try {
            let result = await session.run(query, param);
            session.close();
            return result['records'].map(create_record);
        } catch (err) {
            session.close();
            throw err;
        }
    } // request_neo4j

    /**
     * TODO describe operation EXIST
     * @async
     * @param {SemanticID} subject 
     * @returns {Boolean}
     */
    async function operation_neo4j_exist(subject) {

        assert(is_semantic_id(subject),
            `neo4j_adapter - operation_exist - invalid {SemanticID} subject <${subject}>`);

        /** @type {Array<Record>} */
        const existRecords = await request_neo4j(
            "MATCH (subject:`rdfs:Resource` { `@id`: $subject })\n" +
            "RETURN true AS exists",
            { "subject": subject }
        );

        return existRecords.length > 0 ? existRecords[0]["exists"] : false;

    } // operation_neo4j_exist

    /**
     * TODO describe operation CREATE
     * @async
     * @param {SemanticID} subject 
     * @returns {Boolean}
     */
    async function operation_neo4j_create(subject) {

        assert(is_semantic_id(subject),
            `neo4j_adapter - operation_create - invalid {SemanticID} subject <${subject}>`);

        if (await operation_neo4j_exist(subject))
            return false;

        /** @type {Array<Record>} */
        const createRecords = await request_neo4j(
            "CREATE (subject:`rdfs:Resource` { `@id`: $subject })\n" +
            "RETURN true AS created",
            { "subject": subject }
        );

        return createRecords.length > 0 ? createRecords[0]["created"] : false;

    } // operation_neo4j_create

    /**
     * TODO describe operation READ_subject
     * @async
     * @param {SemanticID} subject 
     * @returns {Object|null}
     */
    async function operation_neo4j_read_subject(subject) {

        assert(is_semantic_id(subject),
            `neo4j_adapter - neo4j_read_subject - invalid {SemanticID} subject <${subject}>`);

        /** @type {Array<Record>} */
        const readRecords = await request_neo4j(
            "MATCH (subject:`rdfs:Resource` { `@id`: $subject })\n" +
            "RETURN subject { .*, `@type`: labels(subject) } AS properties",
            { "subject": subject }
        );

        return readRecords.length > 0 ? readRecords[0]["properties"] : null;

    } // operation_neo4j_read_subject

    /**
     * TODO describe operation READ_type
     * @async
     * @param {SemanticID} subject 
     * @returns {Array<SemanticID>}
     */
    async function operation_neo4j_read_type(subject) {

        assert(is_semantic_id(subject),
            `neo4j_adapter - neo4j_read_type - invalid {SemanticID} subject <${subject}>`);

        /** @type {Array<Record>} */
        const readRecords = await request_neo4j(
            "MATCH (subject:`rdfs:Resource` { `@id`: $subject })\n" +
            "RETURN labels(subject) AS type",
            { "subject": subject }
        );

        return readRecords.length > 0 ? readRecords[0]["type"] : null;

    } // operation_neo4j_read_type

    /**
     * TODO describe operation READ
     * @async
     * @param {SemanticID} subject 
     * @param {String|Array<String>} [key] 
     * @returns {Object|null|PrimitiveValue|Array<PrimitiveValue>}
     */
    async function operation_neo4j_read(subject, key) {

        if (!key) return await operation_neo4j_read_subject(subject);
        if (key === "@type") return await operation_neo4j_read_type(subject);

        assert(is_semantic_id(subject),
            `neo4j_adapter - neo4j_read - invalid {SemanticID} subject <${subject}>`);

        const isArray = Array.isArray(key);
        /** @type {Array<String>} */
        const keyArr = isArray ? key : [key];

        assert(keyArr.every(is_cypher_save_string),
            `neo4j_adapter - neo4j_read - invalid {String|Array<String>} key <${key}> not cypher save`);

        /** @type {Array<Record>} */
        const readRecords = await request_neo4j(
            "MATCH (subject:`rdfs:Resource` { `@id`: $subject })\n" +
            "WITH subject UNWIND $keys AS key\n" +
            "RETURN key, CASE key WHEN '@type' THEN labels(subject) ELSE subject[key] END AS value",
            { "subject": subject, "keys": keyArr }
        );

        /** @type {Map<String, PrimitiveValue>} */
        const valueMap = new Map(readRecords.map(record => [record["key"], record["value"]]));
        /** @type {Array<PrimitiveValue>} */
        const valueArr = keyArr.map(key => valueMap.get(key) || null);

        return isArray ? valueArr : valueArr[0];

    } // operation_neo4j_read

    /**
     * TODO describe operation UPDATE_predicate
     * @async
     * @param {SemanticID} subject 
     * @param {SemanticID} predicate 
     * @param {SemanticID} object 
     * @returns {Boolean}
     */
    async function operation_neo4j_update_predicate(subject, predicate, object) {

        // TODO implement operation UPDATE_predicate

    } // operation_neo4j_update_predicate

    /**
     * TODO describe operation UPDATE_type
     * @async
     * @param {SemanticID} subject 
     * @param {SemanticID|Array<SemanticID>} type 
     * @returns {Boolean}
     */
    async function operation_neo4j_update_type(subject, type) {

        // TODO implement operation UPDATE_type

    } // operation_neo4j_update_type

    /**
     * TODO describe operation UPDATE
     * @async
     * @param {SemanticID} subject 
     * @param {String|SemanticID} key 
     * @param {PrimitiveValue|SemanticID} value 
     * @returns {Boolean}
     */
    async function operation_neo4j_update(subject, key, value) {

        // TODO implement operation UPDATE

    } // operation_neo4j_update

    /**
     * TODO describe operation DELETE_predicate
     * @async
     * @param {SemanticID} subject 
     * @param {SemanticID} predicate 
     * @param {SemanticID} object 
     * @returns {Boolean} 
     */
    async function operation_neo4j_delete_predicate(subject, predicate, object) {

        // TODO implement operation DELETE_predicate

    } // operation_neo4j_delete_predicate

    /**
     * TODO describe operation DELETE
     * @async
     * @param {SemanticID} subject 
     * @param {SemanticID} [predicate] 
     * @param {SemanticID} [object] 
     * @returns {Boolean}
     */
    async function operation_neo4j_delete(subject, predicate, object) {

        // TODO implement operation DELETE

    } // operation_neo4j_delete

    /**
     * TODO describe operation LIST
     * @async
     * @param {SemanticID} subject 
     * @param {SemanticID} predicate 
     * @returns {Array<SemanticID>}
     */
    async function operation_neo4j_list(subject, predicate) {

        // TODO implement operation LIST

    } // operation_neo4j_list

    /**
     * Creates a promise that times out after a given number of seconds.
     * If the original promise finishes before that, the error or result
     * will be resolved or rejected accordingly and the timeout will be canceled.
     * @param {Promise} origPromise 
     * @param {Number} timeoutDelay 
     * @param {String} [errMsg="This promise timed out after waiting ${timeoutDelay}s for the original promise."] 
     * @returns {Promise}
     */
    function create_timeout_promise(origPromise, timeoutDelay, errMsg) {
        assert(origPromise instanceof Promise,
            "The promise must be a Promise.");
        assert(typeof timeoutDelay === "number" && timeoutDelay > 0,
            "The timeout must be a number greater than 0.");

        let timeoutErr = new Error(typeof errMsg === "string" ? errMsg :
            `This promise timed out after waiting ${timeoutDelay}s for the original promise.`);
        Object.defineProperty(timeoutErr, "name", { value: "TimeoutError" });
        Error.captureStackTrace(timeoutErr, create_timeout_promise);

        return new Promise((resolve, reject) => {
            let pending = true;

            let timeoutID = setTimeout(() => {
                if (pending) {
                    pending = false;
                    clearTimeout(timeoutID);
                    reject(timeoutErr);
                }
            }, 1e3 * timeoutDelay);

            origPromise.then((result) => {
                if (pending) {
                    pending = false;
                    clearTimeout(timeoutID);
                    resolve(result);
                }
            }).catch((err) => {
                if (pending) {
                    pending = false;
                    clearTimeout(timeoutID);
                    reject(err);
                }
            });
        });
    } // create_timeout_promise

    /** @type {Neo4jAdapter} */
    const neo4j_adapter = Object.freeze({

        "CREATE": (subject, timeout) => !timeout ? operation_neo4j_create(subject)
            : create_timeout_promise(operation_neo4j_create(subject), timeout),

        "READ": (subject, key, timeout) => !timeout ? operation_neo4j_read(subject, key)
            : create_timeout_promise(operation_neo4j_read(subject, key), timeout),

        "UPDATE": (subject, key, value, timeout) => !timeout ? operation_neo4j_update(subject, key, value)
            : create_timeout_promise(operation_neo4j_update(subject, key, value), timeout),

        "DELETE": (subject, predicate, object, timeout) => !timeout ? operation_neo4j_delete(subject, predicate, object)
            : create_timeout_promise(operation_neo4j_delete(subject, predicate, object), timeout),

        "LIST": (subject, predicate, timeout) => !timeout ? operation_neo4j_list(subject, predicate)
            : create_timeout_promise(operation_neo4j_list(subject, predicate), timeout),

    }); // neo4j_adapter

    return neo4j_adapter;

}; // module.exports