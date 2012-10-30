define(
	'spellReferenceProject/system/endlessPlayingField',
	function() {
		'use strict'


		var playingFieldSize    = [ 1024, 768 ],
			border              = 100,
			wrapOffset          = 75,
			rightBorder         = playingFieldSize[ 0 ] + border,
			leftBorder          = 0 - border,
			topBorder           = playingFieldSize[ 1 ] + border,
			bottomBorder        = 0 - border

		var updatePosition = function( entityManager, simpleBodies, transforms ) {
			for( var id in simpleBodies ) {
				var transform = transforms[ id ],
					position  = transform.translation,
					updated   = true

				if( position[ 0 ] > rightBorder ) {
					position[ 0 ] = leftBorder + wrapOffset

				} else if( position[ 0 ] < leftBorder ) {
					position[ 0 ] = rightBorder - wrapOffset

				} else if( position[ 1 ] > topBorder ) {
					position[ 1 ] = bottomBorder + wrapOffset

				} else if( position[ 1 ] < bottomBorder ) {
					position[ 1 ] = topBorder - wrapOffset

				} else {
					var updated = false
				}

				if( updated ) {
					entityManager.addComponent(
						id,
						'spell.component.box2d.setPosition',
						{
							value : position
						}
					)
				}
			}
		}

		var init = function( spell ) {}

		var process = function( spell, timeInMs, deltaTimeInMs ) {
			var entityManager = spell.entityManager,
				simpleBoxes   = this.simpleBoxes,
				simpleSpheres = this.simpleSpheres,
				transforms    = this.transforms

			updatePosition( entityManager, simpleBoxes, transforms )
			updatePosition( entityManager, simpleSpheres, transforms )
		}


		/**
		 * public
		 */

		var EndlessPlayingField = function( spell ) {}

		EndlessPlayingField.prototype = {
			init : init,
			destroy : function() {},
			activate : function() {},
			deactivate : function() {},
			process : process
		}

		return EndlessPlayingField
	}
)
