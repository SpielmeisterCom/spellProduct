"use strict"

var fs   = require('fs'),
	_    = require('underscore'),
	path = require( 'path' ),
	exec = require('child_process').exec,
	flob = require( 'flob' ),
	supportedMedia = [
		'mp3',
		'wav',
		'ogg'
	],
	rootPath = "projects"

var pattern   = rootPath + "/*/library/**/*",
	fileTypes = _.map( supportedMedia, function( mediaType ) { return "." + mediaType }),
	files     = flob.byTypes( pattern, fileTypes ),
	progress  = {}

var callback = function (error, stdout, stderr) {
	if (error !== null) {
		console.log('exec error: ' + error)
	}
}

var convertFile = function( filePath ) {
	var extension = path.extname( filePath),
		dir       = path.dirname( filePath ),
		baseName  = path.basename( filePath, extension )

	console.log( filePath )

	_.each(
		supportedMedia,
		function( type ) {
			var newExtension = "." + type,
				soundPath    = path.join( dir, baseName + newExtension )

			if( newExtension != extension && !progress[ soundPath ] ) {
				progress[ soundPath ] = true
				var soxCommand = 'sox '+ filePath + ' ' + soundPath

				console.log( 'Doing: ' + soxCommand )
				var child = exec(
					soxCommand,
					callback
				)
			}
		}
	)

}

_.each(
	files,
	convertFile
)