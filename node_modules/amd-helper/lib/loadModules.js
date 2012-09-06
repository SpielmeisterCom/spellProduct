var loadModule = require( './loadModule' ),
	fs   = require( 'fs' ),
	flob = require( 'flob' ),
	path = require( 'path' ),
	_    = require( 'underscore' )


module.exports = function( sourcePath ) {
	var filePattern = path.relative( process.cwd(), sourcePath ).replace( /\\/g, "/") + '/**/*.js',
		filePaths   = flob.sync( filePattern, {} )

	return _.reduce(
		filePaths,
		function( memo, filePath ) {
			var module = loadModule(
				path.resolve( process.cwd(), filePath )
			)

			if( module ) {
				memo[ module.name ] = _.pick( module, [ 'dependencies', 'source', 'path' ] )
			}

			return memo
		},
		{}
	)
}
