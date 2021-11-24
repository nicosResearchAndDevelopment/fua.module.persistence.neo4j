const
	module_name = 'module.persistence.neo4j : Neo4jStore',
	neo4j = require('neo4j-driver'),
	hrt = typeof fua !== 'undefined' ? fua.core.hrt : () => Date.now() / 1000,
	dataFactory = require('../../module.persistence/src/module.persistence.js'),
	datasetFactory = require('../../module.persistence.inmemory/src/module.persistence.inmemory.js'),
	{ isQuad, isNamedNode, isLiteral, isSubject, isPredicate, isObject } = dataFactory,
	{ join: joinPath } = require('path'),
	{ readFileSync } = require('fs'),
	{ EventEmitter } = require('events'),
	Query_size = _loadQuery('neo4j.size.cyp'),
	Query_addRelation = _loadQuery('neo4j.addRelation.cyp'),
	Query_addLiteral = _loadQuery('neo4j.addLiteral.cyp'),
	Query_delete = _loadQuery('neo4j.delete.cyp'),
	Query_hasRelation = _loadQuery('neo4j.hasRelation.cyp'),
	Query_hasLiteral = _loadQuery('neo4j.hasLiteral.cyp'),
	Query_matchRelation = _loadQuery('neo4j.matchRelation.cyp'),
	Query_matchLiteral = _loadQuery('neo4j.matchLiteral.cyp'),
	RE_replace_template = /\$\{(\w+(?:\.\w+)*)}/g;

/**
 * @param {String} query
 * @param {Object} param
 * @returns {String}
 * @private
 */
function _replaceTemplate(query, param) {
	return query.replace(RE_replace_template, (match, path) => {
		let target = param, segments = path.split('.');
		while (segments.length > 0) {
			if (!target) return '';
			target = target[segments.shift()];
		}
		return target;
	});
} // _replaceTemplate

/**
 * @param {String} filename
 * @returns {function(neo4j.driver, Object): Promise<Array<Record>>}
 * @private
 */
function _loadQuery(filename) {
	const query = readFileSync(joinPath(__dirname, 'queries', filename)).toString();
	return (driver, param) => _fetchData(driver, _replaceTemplate(query, param), param);
} // _loadQuery

/**
 * @typedef {Object} Record
 *
 * @param {Object} record
 * @returns {Record}
 * @private
 */
function _convertRecord(record) {
	const result = {};
	for (let key of record['keys']) {
		const value = record['_fields'][record['_fieldLookup'][key]];
		result[key] = value;
	}
	return result;
} // _convertRecord

/**
 * @param {neo4j.driver} driver
 * @param {String} query
 * @param {Object} [param]
 * @returns {Promise<Array<Record>>}
 * @private
 */
async function _fetchData(driver, query, param) {
	const session = driver.session();
	try {
		const result = await session.run(query, param);
		session.close();
		return result['records'].map(_convertRecord);
	} catch (err) {
		session.close();
		throw err;
	}
} // _fetchData

class Neo4jStore extends EventEmitter {

	#graph = null;
	#driver = null;

	/**
	 * @param {NamedNode} graph
	 * @param {*} driver
	 */
	constructor(graph, driver) {
		if (!isNamedNode(graph))
			throw new Error(`${module_name}#constructor : invalid graph`);
		if (!(driver && typeof driver.session === 'function'))
			throw new Error(`${module_name}#constructor : invalid driver`);

		super();
		this.#graph = graph;
		this.#driver = driver;
	} // Neo4jStore#constructor

	/**
	 * @returns {Promise<Number>} the number of quads
	 */
	async size() {
		const records = await Query_size(this.#driver);
		return records.length > 0 ? records[0].size.toNumber() : 0;
	} // Neo4jStore#size

	/**
	 * @param {Quad} quad
	 * @returns {Promise<Boolean>} true, if an actual quad got added
	 */
	async add(quad) {
		if (!isQuad(quad))
			throw new Error(`${module_name}#add : invalid quad`);

		const
			Query_add = isLiteral(quad.object) ? Query_addLiteral : Query_addRelation,
			records = await Query_add(this.#driver, {
				subject: quad.subject,
				predicate: quad.predicate,
				object: quad.object,
				ts: hrt()
			}),
			created = records.length > 0 && records[0].created;

		if (created) this.emit('created', quad);
		return created;
	} // Neo4jStore#add

	/**
	 * @param {Quad} quad
	 * @returns {Promise<Boolean>} true, if an actual quad got deleted
	 */
	async delete(quad) {
		if (!isQuad(quad))
			throw new Error(`${module_name}#delete : invalid quad`);

		const
			records = await Query_delete(this.#driver, {
				subject: quad.subject,
				predicate: quad.predicate,
				object: quad.object
			}),
			deleted = records.length > 0 && records[0].deleted;

		if (deleted) this.emit('deleted', quad);
		return deleted;
	} // Neo4jStore#delete

	/**
	 * @param {Quad} quad
	 * @returns {Promise<Boolean>} true, if the store contains the quad
	 */
	async has(quad) {
		if (!isQuad(quad))
			throw new Error(`${module_name}#has : invalid quad`);

		const
			Query_has = isLiteral(quad.object) ? Query_hasLiteral : Query_hasRelation,
			records = await Query_has(this.#driver, {
				subject: quad.subject,
				predicate: quad.predicate,
				object: quad.object
			});

		return records.length > 0 && records[0].has;
	} // Neo4jStore#has

	/**
	 * @param {Term} [subject]
	 * @param {Term} [predicate]
	 * @param {Term} [object]
	 * @returns {Promise<Dataset>} new dataset with matching quads
	 */
	async match(subject, predicate, object) {
		if (subject && !isSubject(subject))
			throw new Error(`${module_name}#match : invalid subject`);
		if (predicate && !isPredicate(predicate))
			throw new Error(`${module_name}#match : invalid predicate`);
		if (object && !isObject(object))
			throw new Error(`${module_name}#match : invalid object`);

		const
			Query_match = (object && isLiteral(object)) ? Query_matchLiteral : Query_matchRelation,
			records = await Query_match(this.#driver, {
				subject: subject || null,
				predicate: predicate || null,
				object: object || null
			}),
			dataset = datasetFactory.dataset();

		for (let quadRecord of records) {
			quadRecord.graph = this.#graph;
			dataset.add(dataFactory.fromQuad(quadRecord));
		}

		return dataset;
	} // Neo4jStore#match

}

module.exports = Neo4jStore;