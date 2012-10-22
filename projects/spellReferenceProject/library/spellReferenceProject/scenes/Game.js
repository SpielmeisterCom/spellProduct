define(
	'spellReferenceProject/scenes/Game',
	[
		'spell/functions'
	],
	function(
		_
	) {
		'use strict'


		return {
			init : function( spell, sceneConfig ) {
				spell.EntityManager.createEntities( sceneConfig.entities )
			},
			destroy : function( spell, sceneConfig ) {}
		}
	}
)
