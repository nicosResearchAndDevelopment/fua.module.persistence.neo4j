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
 * Should only be used on module buildup, because it uses readFileSync!
 * @param {string} filename
 * @returns {string}
 */
util.loadQuery = function (filename) {
    const buffer = readFileSync(joinPath(__dirname, 'queries', filename));
    return buffer.toString();
}; // loadQuery

Object.freeze(util);
module.exports = util;
