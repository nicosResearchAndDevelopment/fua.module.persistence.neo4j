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
