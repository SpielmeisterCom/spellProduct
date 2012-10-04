define(
	'battleblast/levels/doom_elevator/doom_elevator_background_animation',
	[
		'spell/functions'
	],
	function(
		_
	) {
		"use strict"

        /**
		 * private
		 */

        var animationLengthInMs = 1000,
			numFrames           = 30,
			frameDuration       = Math.floor( animationLengthInMs / numFrames ),
			replaySpeed         = 1.0,
			offsetInMs          = 0


		var createOffsetInMs = function( deltaTimeInMs, animationLengthInMs, offsetInMs, replaySpeed ) {
			offsetInMs += deltaTimeInMs * replaySpeed

			return offsetInMs > animationLengthInMs ?
				offsetInMs % animationLengthInMs :
				offsetInMs
		}

		var createFrameIndex = function( offsetInMs, frameDuration ) {
			var index = Math.max(
				Math.round( offsetInMs / frameDuration ) - 1,
				0
			)

			return index < 10 ? "0" + index : "" + index
		}

		var init = function( spell ) { }

		var cleanUp = function( spell ) {}

		var process = function( spell, timeInMs, deltaTimeInMs ) {
			offsetInMs = createOffsetInMs( deltaTimeInMs, animationLengthInMs, offsetInMs, replaySpeed )

			var backgroundTiles = this.backgroundTiles,
				entityManager   = spell.EntityManager,
				frameIndex      = createFrameIndex( offsetInMs, frameDuration )

			for( var id in backgroundTiles ) {
				var backgroundTile = backgroundTiles[ id ]

				entityManager.updateComponent(
					"spell.component.2d.graphics.appearance",
					id,
					{
						"assetId": "appearance:battleblast.levels.doom_elevator.background.frame_00" + frameIndex
					}
				)
			}
		}

		/**
		 * public
		 */

		var BackgroundAnimationSystem = function( spell ) {
            this.spell = spell
		}

		BackgroundAnimationSystem.prototype = {
			cleanUp : cleanUp,
			init : init,
			process : process
		}

		return BackgroundAnimationSystem
	}
)

