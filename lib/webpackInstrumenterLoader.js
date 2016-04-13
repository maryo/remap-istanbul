const istanbul = require('istanbul');
const loaderUtils = require('loader-utils');

function instrument(source, sourceMap) {
	const options = Object.assign({embedSource: true, noAutoWrap: true}, loaderUtils.parseQuery(this.query));
	const instrumenter = new istanbul.Instrumenter(options);

	if (this.cacheable) {
		this.cacheable();
	}

	instrument.sourceMaps = instrument.sourceMaps || {};
	instrument.sourceMaps[this.resourcePath] = sourceMap;

	return instrumenter.instrumentSync(source, this.resourcePath);
};

module.exports = instrument;
