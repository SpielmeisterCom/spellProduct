var fs      = require( 'fs' ),
	path    = require( 'path' ),
    _       = require( 'underscore' )

var directories     = fs.readdirSync( 'build-artifacts' ),
	moduleConfigs   = {}


_.each(directories, function( directory ) {
	var propertyFile = path.join( 'build-artifacts', directory, 'build.properties' )

	if( fs.existsSync( propertyFile ) ) {

		var properties          = {},
			propertyFileContent = fs.readFileSync( propertyFile , 'utf8' ),
			lines               = propertyFileContent.split( /\r?\n/ )
			_.each( lines, function( line ) {
				if( !line ) {
					return
				}

				var property = line.split( /=/ )
				properties[ property[ 0 ] ] =  (property[ 0 ] == 'buildNumber') ? parseInt( property[ 1 ], 10 ) : property[ 1 ]
			})

		moduleConfigs[ properties.buildKey ] = properties
	}
})

var fileContent = JSON.stringify( moduleConfigs, null, 4 )

console.log( fileContent )
