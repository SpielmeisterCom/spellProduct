var fs      = require( 'fs' ),
    xml2js  = require( 'xml2js' ),
	parser  = new xml2js.Parser(),
    wrench  = require( 'wrench' ),
    ff      = require( 'ff' )

var bambooJobConfiguration = {
	'SPELLJS-SPELLCLI-JOB1': {
		artifact: 'SPELLJS-SPELLCLI',
		srcDir: 'spellCli',
		dstDir: 'build-artifacts/spellCli'
	},
	'SPELLJS-SPELLANDROID-JOB1': {
		artifact: 'SPELLJS-SPELLANDROID',
		srcDir: 'spellAndroid',
		dstDir: 'build-artifacts/spellAndroid'
	},
	'SPELLJS-SPELLDOCS-JOB1': {
		artifact: 'SPELLJS-SPELLDOCS',
		srcDir: 'spellDocs',
		dstDir: 'build-artifacts/spellDocs'
	},
	'SPELLJS-SPELLED-JOB1': {
		artifact: 'SPELLJS-SPELLED',
		srcDir: 'spellEd',
		dstDir: 'build-artifacts/spellEd'
	},
	'SPELLJS-SPELLFLASH-JOB1': {
		artifact: 'SPELLJS-SPELLFLASH',
		srcDir: 'spellFlash',
		dstDir: 'build-artifacts/spellFlash'
	},
	'SPELLJS-SPELLCORE-JOB1': {
		artifact: 'SPELLJS-SPELLCORE',
		srcDir: 'spellCore',
		dstDir: 'build-artifacts/spellCore'
	}
}

var getLastSuccessfulBuild = function( bambooJobKey, completeFn ) {
	var baseDir = '/srv/atlassian/application-data/bamboo/xml-data/builds/' + bambooJobKey + '/results'

	var f = ff(
		this,
		function () {
			// read directory content
			fs.readdir( baseDir, f.slot() )
		},
		function( directoryContent ) {
			// read all files in directory
			directoryContent.forEach( function( filename ) {
				fs.readFile( baseDir + '/' + filename, f.slot() )
			} )
		},
		function() {
			// parse XML into JS Objects
			for( var i = 0; i < arguments.length; i++ ) {
				parser.parseString( arguments[ i ], f.slot() )
			}
		},
		function() {
			var lastSuccessfulBuild = {
				jobKey : bambooJobKey,
				number : 0
			}

			for( var i = 0; i < arguments.length; i++ ) {
				var result      = arguments[ i ],
					buildState  = result.BuildResults.myBuildState[ 0 ].myState[ 0 ],
					buildNumber = result.BuildResults.myBuildNumber[ 0 ],
					buildDate   = result.BuildResults.myBuildDate[ 0 ]

				if( buildState == 'Successful' &&
					parseInt( lastSuccessfulBuild.number, 10 ) < parseInt( buildNumber, 10 ) ) {

					lastSuccessfulBuild.state = buildState
					lastSuccessfulBuild.number = buildNumber
					lastSuccessfulBuild.date  = buildDate
				}
			}

			if( lastSuccessfulBuild.number == 0 ) {
				f.fail( 'Could not find last successful build in ' + baseDir )

			} else {
				f.pass( lastSuccessfulBuild )
			}
		}

	).onComplete( completeFn )
}

var copyBuildArtifact = function( jobKey, buildNumber ) {
	var config      = bambooJobConfiguration[ jobKey ],
	    	srcDir      = config.srcDir,
		dstDir      = config.dstDir,
		artifactDir = '/var/atlassian/application-data/bamboo/artifacts/' + config.artifact + '/shared/build-' + String( '00000' + buildNumber ).slice( -5 ) + '/' + srcDir

	console.log( 'copying artifact from ' + artifactDir + ' to ' + dstDir )

	wrench.copyDirSyncRecursive(
		artifactDir,
		dstDir,
		{
			forceDelete: true,
			excludeHiddenUnix: true,
			preserveFiles: false,
			inflateSymlinks: true
		}
	)
}

var f = ff(
	this,
	function() {
		console.log( 'Cleaning build-artifacts directory' )

		wrench.rmdirSyncRecursive( 'build-artifacts', true )
		wrench.mkdirSyncRecursive( 'build-artifacts', 0777 )
	},
	function() {
		// get latest successful build for every job
		for( var jobKey in bambooJobConfiguration ) {
			getLastSuccessfulBuild( jobKey, f.slot() )
		}
	},
	function() {
		var moduleConfig = {}

		// copy all build artifacts
		for( var i = 0; i < arguments.length; i++ ) {
			var latestBuild		= arguments[ i ],
			    config		= bambooJobConfiguration[ latestBuild.jobKey ],
			    buildDate		= new Date( parseInt( latestBuild.date, 10 ) )

			copyBuildArtifact( latestBuild.jobKey, latestBuild.number )

			moduleConfig[ config.artifact ] = {
				buildNumber:	parseInt( latestBuild.number, 10 ),
				buildTimeStamp:	buildDate.toISOString() 
			}
		}
	
		f.pass( moduleConfig )
	},
	function( moduleConfig ) {
		// writing build config
		var fileContent = JSON.stringify( moduleConfig, null, 4 )
		fs.writeFileSync( 'build-artifacts/moduleBuilds.json', fileContent )
	}

).onSuccess(
	function( result ) {}
)
