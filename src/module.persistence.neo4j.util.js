const
    _util               = require('@nrd/fua.core.util'),
    util                = exports = module.exports = {
        ..._util,
        assert: _util.Assert('module.persistence.neo4j')
    },
    {join: joinPath}    = require('path'),
    {readFileSync}      = require('fs'),
    RE_replace_template = /\$\{(\w+(?:\.\w+)*)}/g;

/**
 * @param {{keys: Array<string>, _fields: object, _fieldLookup: object}} record
 * @returns {{[key: string]: any}}
 */
util.convertRecord = function (record) {
    const result = {};
    for (let key of record['keys']) {
        const value = record['_fields'][record['_fieldLookup'][key]];
        result[key] = value;
    }
    return result;
}; // convertRecord

/**
 * @param {import("neo4j-driver").driver} driver
 * @param {string} query
 * @param {object} [param]
 * @returns {Promise<Array<{[key: string]: any}>>}
 */
util.fetchData = async function (driver, query, param) {
    const session = driver.session();
    try {
        const result = await session.run(query, param);
        session.close();
        return result['records'].map(util.convertRecord);
    } catch (err) {
        session.close();
        throw err;
    }
}; // fetchData

/**
 * @param {string} query
 * @param {object} param
 * @returns {string}
 */
util.replaceTemplate = function (query, param) {
    return query.replace(RE_replace_template, (match, path) => {
        let target = param, segments = path.split('.');
        while (segments.length > 0) {
            if (!target) return '';
            target = target[segments.shift()];
        }
        return target;
    });
}; // replaceTemplate

/**
 * @param {string} filename
 * @returns {function(import("neo4j-driver").driver, object): Promise<Array<{[key: string]: any}>>}
 */
util.loadQuery = function (filename) {
    const query = readFileSync(joinPath(__dirname, 'queries', filename)).toString();
    return (driver, param) => util.fetchData(driver, util.replaceTemplate(query, param), param);
}; // loadQuery

module.exports = Object.freeze(util);
