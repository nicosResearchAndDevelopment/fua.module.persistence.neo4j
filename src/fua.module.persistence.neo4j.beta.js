const
    assert = require("assert"),
    // neo4j = require("neo4j-driver").v1,
    regex_semantic_id = /^https?:\/\/\S+$|^\w+:\S+$/,
    array_primitive_types = Object.freeze(["boolean", "number", "string"]),
    default_name = "module_persistence_neo4j";

/**
 * This is the factory method to build a persistence adapter for neo4j.
 * @param {Object} config 
 * @returns {PersistenceAdapter<neo4j>}
 */
module.exports = function (config) {

    assert(typeof config === "object" && config !== null,
        "The parameter for a persistence adapter must be a nonnull object.");

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
    function create_record(neo4j_record) {
        let custom_record = {};
        for (let key of neo4j_record['keys']) {
            let value = neo4j_record['_fields'][neo4j_record['_fieldLookup'][key]];
            custom_record[key] = value;
        }
        return custom_record;
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
        let result, session = driver.session();
        try {
            result = await session.run(query, param);
            session.close();
            return result['records'].map(create_record);
        } catch (err) {
            session.close();
            throw err;
        }
    } // request_neo4j

    /**
     * Creates a promise that times out after a given number of seconds.
     * If the original promise finishes before that, the error or result
     * will be resolved or rejected accordingly and the timeout will be canceled.
     * @param {Promise} origPromise 
     * @param {Number} timeoutDelay 
     * @param {String} [errMsg] 
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

    /**
     * @async
     * @param {SemanticID} subject 
     * @returns {Boolean}
     */
    async function persistence_neo4j_create(subject) {
        // TODO
    } // persistence_neo4j_create

    /**
     * @async
     * @param {SemanticID} subject 
     * @param {String|Array<String>} [key] 
     * @returns {Object|PrimitiveValue|Array<PrimitiveValue>}
     */
    async function persistence_neo4j_read(subject, key, value) {
        // TODO
    } // persistence_neo4j_read

    /**
     * @async
     * @param {SemanticID} subject 
     * @param {String|SemanticID} key 
     * @param {PrimitiveValue|SemanticID} value 
     * @returns {Boolean}
     */
    async function persistence_neo4j_update(subject, key, value) {
        // TODO
    } // persistence_neo4j_update

    /**
     * @async
     * @param {SemanticID} subject 
     * @param {SemanticID} [predicate] 
     * @param {SemanticID} [object] 
     * @returns {Boolean}
     */
    async function persistence_neo4j_delete(subject, predicate, object) {
        // TODO
    } // persistence_neo4j_delete

    /**
     * @async
     * @param {SemanticID} subject 
     * @param {SemanticID} predicate 
     * @returns {Array<SemanticID>}
     */
    async function persistence_neo4j_list(subject, predicate) {
        // TODO
    } // persistence_neo4j_list

    return Object.freeze({

        "@id": config["@id"] || default_name,

        "CREATE": (subject, timeout) => !timeout ? persistence_neo4j_create(subject)
            : create_timeout_promise(persistence_neo4j_create(subject), timeout),

        "READ": (subject, key, timeout) => !timeout ? persistence_neo4j_read(subject, key)
            : create_timeout_promise(persistence_neo4j_read(subject, key), timeout),

        "UPDATE": (subject, key, value, timeout) => !timeout ? persistence_neo4j_update(subject, key, value)
            : create_timeout_promise(persistence_neo4j_update(subject, key, value), timeout),

        "DELETE": (subject, predicate, object, timeout) => !timeout ? persistence_neo4j_delete(subject, predicate, object)
            : create_timeout_promise(persistence_neo4j_delete(subject, predicate, object), timeout),

        "LIST": (subject, predicate, timeout) => !timeout ? persistence_neo4j_list(subject, predicate)
            : create_timeout_promise(persistence_neo4j_list(subject, predicate), timeout),

    });

}; // module.exports