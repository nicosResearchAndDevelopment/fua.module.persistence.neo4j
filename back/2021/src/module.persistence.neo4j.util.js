const {
          Assert,
          lockProp,
          isDefined, isTruthy, isFalsy,
          isBoolean, isNumber, isString,
          isFunction, isObject,
          isArray, isIterable
      }                   = require('@fua/core.util'),
      uuid                = require('@fua/core.uuid'),
      hrt                 = require('@fua/core.hrt'),
      neo4j               = require('neo4j-driver'),
      {join: joinPath}    = require('path'),
      {readFileSync}      = require('fs'),
      RE_replace_template = /\$\{(\w+(?:\.\w+)*)}/g;

function generateBlankId() {
    return () => '_:' + uuid.v1();
}

/**
 * @param {string} query
 * @param {object} param
 * @returns {string}
 */
function replaceTemplate(query, param) {
    return query.replace(RE_replace_template, (match, path) => {
        let target = param, segments = path.split('.');
        while (segments.length > 0) {
            if (!target) return '';
            target = target[segments.shift()];
        }
        return target;
    });
} // replaceTemplate

/**
 * @typedef {object} Record
 *
 * @param {object} record
 * @returns {Record}
 */
function convertRecord(record) {
    const result = {};
    for (let key of record['keys']) {
        const value = record['_fields'][record['_fieldLookup'][key]];
        result[key] = value;
    }
    return result;
} // convertRecord

/**
 * @param {neo4j.driver} driver
 * @param {string} query
 * @param {object} [param]
 * @returns {Promise<Array<Record>>}
 */
async function fetchData(driver, query, param) {
    const session = driver.session();
    try {
        const result = await session.run(query, param);
        session.close();
        return result['records'].map(convertRecord);
    } catch (err) {
        session.close();
        throw err;
    }
} // fetchData

/**
 * @param {string} filename
 * @returns {function(neo4j.driver, object): Promise<Array<Record>>}
 */
function loadQuery(filename) {
    const query = readFileSync(joinPath(__dirname, 'queries', filename)).toString();
    return (driver, param) => fetchData(driver, replaceTemplate(query, param), param);
} // loadQuery

module.exports = {
    assert: new Assert('module.persistence.neo4j'),
    lockProp,
    isDefined, isTruthy, isFalsy,
    isBoolean, isNumber, isString,
    isFunction, isObject,
    isArray, isIterable,
    generateBlankId,
    loadQuery,
    hrt
};