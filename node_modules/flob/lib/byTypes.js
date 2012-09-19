var glob = require( 'glob'),
	path = require( 'path'),
	_    = require( 'underscore' )

module.exports = function( pattern, types, relative ) {
	var cwd        = process.cwd(),
		relative   = !!relative,
		tmpPattern = path.relative( cwd, pattern )

	if( _.isArray( types ) && types.length > 0 ) {
		var tmp = _.map(
			types,
			function( type ) {
				return tmpPattern + type
			}
		)

		if( tmp.length > 1 )
			tmpPattern = "{" + tmp.join( "," ) + "}"
		else
			tmpPattern = tmp.join( "," )

	}

	tmpPattern = tmpPattern.replace( /\\/g, "/")
	var result = glob.sync( tmpPattern )

	if( !relative ) {
		result = _.map(	result,	function( file ) { return path.resolve( cwd, file )	} )
	}

	return result
}

