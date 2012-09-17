module.exports = function( name ) {
    var parts = [
        "define(",
        "	'" + name.replace(/\\/g, "/") + "',",
        "	[",
		"		'spell/functions'",
		"	],",
		"	function(",
		"		_",
		"	) {",
		'		"use strict"',
		"		// all the codes belongs to here",
		"	}",
		")",
		""
    ]

	return parts.join( "\n" )
}

