var extractModuleHeader = require( './extractModuleHeader' ),
	fs   = require( 'fs' ),
	_    = require( 'underscore' )


module.exports = function( filePath ) {
	var fileContent  = fs.readFileSync( filePath ).toString( 'utf-8' )

	try {
		var moduleHeader = extractModuleHeader( fileContent )

	} catch( e ) {
		console.error( 'Error: Loading a module triggered the following exception when processing file \'' + filePath + '\'.\n' + e )
		process.exit( 1 )
	}


	if( !moduleHeader ) return

	if( !moduleHeader.name ) {
		console.error( 'Error: Anonymous module in file \'' + filePath + '\' is not supported.' )
		return
	}

	return {
		dependencies : moduleHeader.dependencies,
		name         : moduleHeader.name,
		source       : fileContent,
		path         : filePath
	}
}
