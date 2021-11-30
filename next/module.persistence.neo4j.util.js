const
    _util = require('@nrd/fua.core.util'),
    path  = require('path'),
    fs    = require('fs'),
    util  = exports = module.exports = {
        ..._util,
        assert: _util.Assert('module.persistence.neo4j')
    };

/**
 * Should only be used on module buildup, because it uses readFileSync!
 * @param {string} filename
 * @returns {string}
 */
util.requireFile = function (filename) {
    const filePath = path.isAbsolute(filename) ? filename : path.join(__dirname, filename);
    return fs.readFileSync(filePath, 'utf-8');
}; // requireFile

Object.freeze(util);
module.exports = util;
