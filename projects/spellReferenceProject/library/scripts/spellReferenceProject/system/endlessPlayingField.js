define(
	'spellReferenceProject/system/endlessPlayingField',
	[
		'spell/shared/util/createEntityEach'
	],
	function(
		createEntityEach
	) {
		'use strict'


		/**
		 * private
		 */

		var playingFieldSize    = [ 1024, 768 ],
			border              = 25,
			wrapOffset          = 75,
			rightBorder         = playingFieldSize[ 0 ] + border,
			leftBorder          = 0 - border,
			topBorder           = playingFieldSize[ 1 ] + border,
			bottomBorder        = 0 - border


		var init = function( globals ) { }

		var cleanUp = function( globals ) {}

		var updatePositionIter = function( transform, inertialObject ) {
			if( !inertialObject ) return

			var position = transform.translation

			if( position[ 0 ] > rightBorder ) {
				position[ 0 ] = leftBorder
				position[ 1 ] += wrapOffset

			} else if( position[ 0 ] < leftBorder ) {
				position[ 0 ] = rightBorder
				position[ 1 ] -= wrapOffset

			} else if( position[ 1 ] > topBorder ) {
				position[ 0 ] += wrapOffset
				position[ 1 ] = bottomBorder

			} else if( position[ 1 ] < bottomBorder ) {
				position[ 0 ] -= wrapOffset
				position[ 1 ] = topBorder
			}
		}

		var process = function( globals, timeInMs, deltaTimeInMs ) {
			this.updatePosition()
		}


		/**
		 * public
		 */

		var EndlessPlayingField = function( globals ) {
			this.updatePosition = createEntityEach( this.transforms, [ this.inertialObjects ], updatePositionIter )
		}

		EndlessPlayingField.prototype = {
			cleanUp : cleanUp,
			init : init,
			process : process
		}

		return EndlessPlayingField
	}
)
