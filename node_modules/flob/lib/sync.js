var glob = require( 'glob'),
	path = require( 'path'),
	_    = require( 'underscore' )

/**
 * Creates a path which is relative to the root path.
 *
 * @param root
 * @param path
 * @return {*}
 */
var createRelativePath = function( root, path ) {
	return path.substr( root.length )
}

module.exports = function( pattern, config ) {
	var result = [],
		cwd    = config && config.cwd ? config.cwd : process.cwd(),
		root   = config ? config.root : undefined

	if( root ) {
		var tmpRoot    = path.relative( cwd, root ),
			tmpPattern = path.join( tmpRoot, pattern )

		result = _.map(
			glob.sync( tmpPattern.replace( /\\/g, '/' ) ),
			function( filePath ) {
				return createRelativePath( tmpRoot + '/', filePath )
			}
		)

	} else {
		result = glob.sync( pattern, config )
	}

	return result
}
