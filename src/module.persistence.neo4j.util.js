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

util.WaitQueue = class WaitQueue {

    #ticketQueue = [];

    requestTicket(timeoutSecs = 0) {
        return new Promise((resolve, reject) => {
            const ticket = {
                resolve: resolve,
                reject:  reject,
                start:   () => {
                    if (ticket.timeout) clearTimeout(ticket.timeout);
                    ticket.resolve({close: ticket.close});
                },
                close:   () => {
                    this.#ticketQueue.shift();
                    const nextTicket = this.#ticketQueue[0];
                    if (nextTicket) nextTicket.start();
                },
                timeout: this.#ticketQueue.length > 0 && timeoutSecs > 0 && timeoutSecs < Infinity && setTimeout(() => {
                    const index = this.#ticketQueue.indexOf(ticket);
                    if (index <= 0) return;
                    this.#ticketQueue.splice(index, 1);
                    ticket.reject(new Error('module.persistence.neo4j : timed out'));
                }, 1e3 * timeoutSecs)
            };
            this.#ticketQueue.push(ticket);
            if (this.#ticketQueue.length === 1) ticket.start();
        });
    } // WaitQueue#requestTicket

}; // WaitQueue

Object.freeze(util);
module.exports = util;
