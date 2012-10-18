define(
	'superkumba/playerMover',
	[
		'spell/functions'
	],
	function(
		_
	) {
		'use strict'


        var init = function( spell ) {
spell.logger.log("test")
        }

        var process = function( spell ) {

        }

        var playerMover = function( spell ) {

		}

		playerMover.prototype = {
			init : init,
			destroy : function() {},
			activate : function() {},
			deactivate : function() {},
			process : process
		}

		return playerMover
	}
)
