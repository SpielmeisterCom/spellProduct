/**
 * need.js - A requiresque require.js replacement for usage in browsers.
 */

( function( document ) {
	var modules  = {},
		BASE_URL = 'library/scripts'

	var createScriptNode = function( name, source ) {
		var script = document.createElement( 'script' )
		script.type = 'text/javascript'
		script.text = source

		var head = document.getElementsByTagName( 'head' )[ 0 ]
		head.appendChild( script )
	}

	var normalizeConfig = function( config ) {
		if( !config ) {
			config = {}
		}

		if( !config.baseUrl ) {
			config.baseUrl = BASE_URL
		}

		return config
	}

	var createRequest = function( url ) {
		var request = new XMLHttpRequest()
		request.open( 'GET', url, false )
		request.send( null )

		return request
	}

	var loadModule = function( name, baseUrl ) {
		var moduleUrl = baseUrl + '/' + name + '.js',
			request   = createRequest( moduleUrl )

		if( request.status !== 200 ) throw 'Error: Loading \'' + moduleUrl + '\' failed.'

		createScriptNode( name, request.responseText )

		return modules[ name ]
	}

	var createModule = function( name, config ) {
		config = normalizeConfig( config )

		var module = loadModule( name, config.baseUrl )

		if( !module ) throw 'Error: Could not load module \'' + name + '\'.'

		modules[ name ] = module

		return module
	}

	var createModuleInstance = function( dependencies, body, config ) {
		var args = []

		if( dependencies ) {
			for( var i = 0; i < dependencies.length; i++ ) {
				var dependencyModuleName = dependencies[ i ],
					dependencyModule = modules[ dependencyModuleName ]

				if( !dependencyModule ) {
					dependencyModule = createModule( dependencyModuleName, config )
				}

				if( !dependencyModule.instance ) {
					dependencyModule.instance = createModuleInstance( dependencyModule.dependencies, dependencyModule.body )
				}

				args.push( dependencyModule.instance )
			}
		}

		if( config ) args.push( config )

		return body.apply( null, args )
	}


	var define = function( name ) {
		var numArguments = arguments.length

		if( numArguments < 2 ||
			numArguments > 3 ) {

			throw 'Error: Module definition is invalid.'
		}

		modules[ name ] = {
			body         : ( numArguments === 2 ? arguments[ 1 ] : arguments[ 2 ] ),
			dependencies : ( numArguments === 2 ? undefined : arguments[ 1 ] )
		}
	}


	var require = function( moduleName, args, config ) {
		if( !moduleName ) throw 'Error: No module name provided.'

		var module = modules[ moduleName ]

		if( !module ) {
			module = createModule( moduleName, config )
		}

		if( !module.instance ) {
			module.instance = createModuleInstance( module.dependencies, module.body, args )
		}

		return module.instance
	}

	window.define  = define
	window.require = require
} )( document )
define(
	'spell/shared/util/platform/initDebugEnvironment',
	[
		'spell/shared/util/platform/private/initDebugEnvironment'
	],
	function(
		initDebugEnvironment
	) {
		'use strict'


		return initDebugEnvironment
	}
)

define(
	'spell/shared/util/createDebugMessageHandler',
	function() {
		'use strict'


		return function( spell, startEngine ) {
			var messageTypeToHandler = {
				'spelled.debug.drawCoordinateGrid' : function( payload ) {
					spell.configurationManager.drawCoordinateGrid = !!payload
				},
				'spelled.debug.executeRuntimeModule' : function( payload ) {
					spell.runtimeModule = payload
					startEngine( payload )
				},
				'spelled.debug.updateComponent' : function( payload ) {
					//TODO: check if the scene is correct

					var component = spell.entityManager.getComponent( payload.entityId, payload.componentId );
					if ( component ) {
						spell.logger.debug( "Setting " + payload.componentId + ":" + payload.key + " = " + payload.value + " in entity " + payload.entityId)
						component[payload.key] = payload.value
					} else {
						spell.logger.debug( "Could not find component " + payload.componentId + " in entity " + payload.entityId )
					}
				}
			}

			return function( message ) {
				spell.logger.debug( 'Received message: ' + message.type )


				var handler = messageTypeToHandler[ message.type ]

				if( !handler ) return

				handler( message.payload )
			}
		}
	}
)

define(
	'spell/shared/util/platform/log',
	[
		'spell/shared/util/platform/private/log'
	],
	function(
		log
	) {
		'use strict'


		return log
	}
)


define(
	'spell/shared/util/Logger',
	[
		'spell/shared/util/platform/log'
	],
	function(
		platformLog
	) {
		'use strict'


		var LOG_LEVEL_DEBUG  = 0,
			LOG_LEVEL_INFO   = 1,
			LOG_LEVEL_WARN   = 2,
			LOG_LEVEL_ERROR  = 3,
			LOG_LEVEL_SILENT = 4


		var logLevels = [
			'DEBUG',
			'INFO',
			'WARN',
			'ERROR',
			'SILENT'
		]

		var validate = function( logLevel ) {
			if( logLevel < 0 ||
				logLevel > 4 ) {

				throw 'Log level ' + logLevel + ' is not supported.'
			}
		}

		var createTimeStamp = function() {
			var now = new Date()

			return '[' + now.toDateString() + ' ' + now.toLocaleTimeString() + ']'
		}

		var createMessage = function( level, text ) {
			return logLevels[ level ] + ' - ' + text
		}

		/**
		 * @class spell.shared.util.Logger
		 *
		 * The following log levels are available: LOG_LEVEL_DEBUG (0), LOG_LEVEL_INFO (1), LOG_LEVEL_WARN (2), LOG_LEVEL_ERROR (3), LOG_LEVEL_SILENT (4). The
		 * log level is used for filtering the logged messages. For example setting the log level to "LOG_LEVEL_WARN" (2) causes all messages with a lower level
		 * to be discarded without being logged. The default log level is LOG_LEVEL_INFO (1). If you want to disable all logging set the log level to
		 * "LOG_LEVEL_SILENT" (4).
		 *
		 *
		 * @constructor
		 *
		 * Creates a new Logger Instance.
		 *
		 * @param {Number} level sets the current log level
		 */
		var Logger = function( level ) {
			validate( level )

			this.currentLogLevel     = level || LOG_LEVEL_INFO
			this.sendMessageToEditor = undefined
		}

		Logger.prototype = {
			LOG_LEVEL_DEBUG : LOG_LEVEL_DEBUG,

			LOG_LEVEL_INFO : LOG_LEVEL_INFO,

			LOG_LEVEL_WARN : LOG_LEVEL_WARN,

			LOG_LEVEL_ERROR : LOG_LEVEL_ERROR,

			LOG_LEVEL_SILENT : LOG_LEVEL_SILENT,

			/**
			 * Sets the callback that establishes forwarding of log messages to the editor.
			 *
			 * @param {Function} fn
			 */
			setSendMessageToEditor : function( fn ) {
				this.sendMessageToEditor = fn
			},

			/**
			 * Sets the current log level.
			 *
			 * @param {Number} level
			 */
			setLogLevel : function( level ) {
				validate( level )

				this.currentLogLevel = level
			},

			/**
			 * Logs the supplied text with the supplied level.
			 *
			 * @param {Number} level
			 * @param {String} text
			 */
			log : function( level, text ) {
				validate( level )

				if( level < this.currentLogLevel ) return

				if( this.sendMessageToEditor ) {
					this.sendMessageToEditor(
						'spell.debug.consoleMessage',
						{
							level : logLevels[ level ],
							text : text
						}
					)
				}

				platformLog( createTimeStamp() + ' ' + createMessage( level, text ) )
			},

			/**
			 * Logs the supplied message with log level LOG_LEVEL_DEBUG.
			 *
			 * @param {String} message
			 */
			debug : function( message ) {
				this.log( LOG_LEVEL_DEBUG, message )
			},

			/**
			 * Logs the supplied message with log level LOG_LEVEL_INFO.
			 *
			 * @param {String} message
			 */
			info : function( message ) {
				this.log( LOG_LEVEL_INFO, message )
			},

			/**
			 * Logs the supplied message with log level LOG_LEVEL_WARN.
			 *
			 * @param {String} message
			 */
			warn : function( message ) {
				this.log( LOG_LEVEL_WARN, message )
			},

			/**
			 * Logs the supplied message with log level LOG_LEVEL_ERROR.
			 *
			 * @param {String} message
			 */
			error : function( message ) {
				this.log( LOG_LEVEL_ERROR, message )
			}
		}

		return Logger
	}
)

define(
	"spell/shared/util/StatisticsManager",
	[
		'spell/functions'
	],
	function(
		_
	) {
		"use strict"


		/*
		 * private
		 */

		var numberOfValues = 512

		var createBuffer = function( bufferSize ) {
			var buffer = []

			while( bufferSize > 0 ) {
				buffer.push( 0 )
				bufferSize--
			}

			return buffer
		}

		var createSeries = function( id, name, unit ) {
			return {
				values : createBuffer( numberOfValues ),
				name   : name,
				unit   : unit
			}
		}


		/*
		 * public
		 */

		var StatisticsManager = function() {
			this.series = {}
		}

		StatisticsManager.prototype = {
			init : function() {
				this.addSeries( 'fps', 'frames per second', 'fps' )
				this.addSeries( 'totalTimeSpent', 'total time spent', 'ms' )
				this.addSeries( 'timeSpentRendering', 'time spent rendering', 'ms' )
			},
			/*
			 * call this method to signal the beginning of a new measurement period
			 */
			startTick: function() {
				_.each(
					this.series,
					function( iter ) {
						iter.values.push( 0 )
						iter.values.shift()
					}
				)
			},
			addSeries : function( id, name, unit ) {
				if( !id ) return

				if( _.has( this.series, id ) ) throw 'Series with id "' + id + '" already exists'

				this.series[ id ] = createSeries( id, name, unit )
			},
			updateSeries : function( id, value ) {
				if( !id ) return

				var series = this.series[ id ]

				if( !series ) return

				series.values[ numberOfValues - 1 ] += value
			},
			getValues : function() {
				return this.series
			},
			getSeriesValues : function( id ) {
				return this.series[ id ]
			}
		}

		return StatisticsManager
	}
)

define(
	'spell/shared/util/ResourceLoader',
	[
		'spell/shared/util/platform/PlatformKit',
		'spell/shared/util/Events',

		'spell/functions'
	],
	function(
		PlatformKit,
		Events,

		_
	) {
		'use strict'


		/*
		 * private
		 */

		var STATE_WAITING_FOR_PROCESSING = 0
		var STATE_PROCESSING = 1
		var STATE_COMPLETED = 2

		var BASE_URL = 'library'

		var extensionToLoaderFactory = {
			'image' : PlatformKit.createImageLoader,
			'text'  : PlatformKit.createTextLoader
		}


		var createResourceBundle = function( name, resources, config ) {
			return {
				afterLoad             : config.afterLoad,
				baseUrl               : config.baseUrl,
				name                  : name,
				resources             : resources,
				resourcesTotal        : resources.length,
				resourcesNotCompleted : resources.length,
				state                 : STATE_WAITING_FOR_PROCESSING,
				type                  : config.type
			}
		}

		/*
		 * Returns true if a resource bundle with the provided name exists, false otherwise.
		 *
		 * @param resourceBundles
		 * @param name
		 */
		var resourceBundleExists = function( resourceBundles, name ) {
			return _.has( resourceBundles, name )
		}

		var updateProgress = function( resourceBundle ) {
			resourceBundle.resourcesNotCompleted -= 1

			var progress = 1.0 - resourceBundle.resourcesNotCompleted / resourceBundle.resourcesTotal

			this.eventManager.publish(
				[ Events.RESOURCE_PROGRESS, resourceBundle.name ],
				[ progress ]
			)

			if( resourceBundle.resourcesNotCompleted === 0 ) {
				resourceBundle.state = STATE_COMPLETED

				this.eventManager.publish(
					[ Events.RESOURCE_LOADING_COMPLETED, resourceBundle.name ],
					[ _.pick( this.cache, resourceBundle.resources ) ]
				)
			}
		}

		var checkResourceAlreadyLoaded = function( loadedResource, resourceName ) {
			if( !_.has( this.cache, resourceName ) ) return

			throw 'Error: Resource "' + resourceName + '" already loaded.'
		}

		var resourceLoadingCompletedCallback = function( resourceBundleName, resourceName, loadedResource ) {
			if( !loadedResource ) {
				throw 'Resource "' + resourceName + '" from resource bundle "' + resourceBundleName + '" is undefined or empty on loading completed.'
			}

//			// making sure the loaded resource was not already returned earlier
//			checkResourceAlreadyLoaded.call( this, loadedResource, resourceName )

			var resourceBundle = this.resourceBundles[ resourceBundleName ]

			// add newly loaded resources to cache, run trough afterLoad callback if available
			this.cache[ resourceName ] = resourceBundle.afterLoad ?
				resourceBundle.afterLoad( loadedResource ) :
				loadedResource

			updateProgress.call( this, resourceBundle )
		}

		var resourceLoadingTimedOutCallback = function( logger, resourceBundleName, resourceName ) {
			logger.debug( 'Loading "' + resourceName + '" failed with a timeout. In case the execution environment is safari this message can be ignored.' )

			updateProgress.call( this, this.resourceBundles[ resourceBundleName ] )
		}

		var createLoader = function(
			eventManager,
			host,
			baseUrl,
			resourceBundleName,
			resourceName,
			loadingCompletedCallback,
			loadingTimedOutCallback,
			soundManager,
			renderingContext,
			type
		) {
			var extension = ( type === 'auto' ?
				_.last( resourceName.split( '.' ) )
				: type
			)

			var loaderFactory = extensionToLoaderFactory[ extension ]

			if( loaderFactory === undefined ) {
				throw 'Could not create loader factory for resource "' + resourceName + '".'
			}

			var resourcePath = baseUrl

			var loader = loaderFactory(
				eventManager,
				resourcePath,
				resourceBundleName,
				resourceName,
				loadingCompletedCallback,
				loadingTimedOutCallback,
				( extension === 'json' ?
					soundManager :
					( extension === 'jpg' || extension === 'png' ?
						renderingContext :
						undefined
					)
				)
			)

			return loader
		}

		var startLoadingResourceBundle = function( logger, resourceBundle ) {
			_.each(
				resourceBundle.resources,
				_.bind(
					function( resourceName ) {
						var cachedEntry = this.cache[ resourceName ]

						if( cachedEntry ) {
							resourceLoadingCompletedCallback.call(
								this,
								resourceBundle.name,
								resourceName,
								cachedEntry
							)

							return
						}

						var loader = createLoader(
							this.eventManager,
							this.host,
							resourceBundle.baseUrl,
							resourceBundle.name,
							resourceName,
							_.bind( resourceLoadingCompletedCallback, this, resourceBundle.name, resourceName ),
							_.bind( resourceLoadingTimedOutCallback, this, logger, resourceBundle.name, resourceName ),
                            this.soundManager,
							this.renderingContext,
							resourceBundle.type
						)

						if( loader !== undefined ) {
							loader.start()

						} else {
							throw 'Could not create a loader for resource "' + resourceName + '".'
						}
					},
					this
				)
			)
		}

		var normalizeConfig = function( config ) {
			return {
				afterLoad : _.isFunction( config.afterLoad ) ? config.afterLoad : undefined,
				baseUrl   : config.baseUrl ? config.baseUrl : BASE_URL,
				type      : config.type ? config.type : 'auto'
			}
		}


		/*
		 * public
		 */

		var ResourceLoader = function( spell, soundManager, renderingContext, eventManager, hostConfig ) {
			if( eventManager === undefined ) throw 'Argument "eventManager" is undefined.'
            if( soundManager === undefined ) throw 'Argument "soundManager" is undefined.'

            this.soundManager = soundManager
			this.renderingContext = renderingContext
			this.eventManager = eventManager
			this.resourceBundles = {}
			this.cache = {}
			this.host = ( hostConfig.type === 'internal' ? '' : 'http://' + hostConfig.host )
		}

		ResourceLoader.prototype = {
			addResourceBundle: function( name, resources, config ) {
				if( _.size( resources ) === 0 ) {
					throw 'Resource group with name "' + name + '" has zero assigned resources.'
				}

				if( resourceBundleExists( this.resourceBundles, name ) ) {
					throw 'Resource group with name "' + name + '" already exists.'
				}

				this.resourceBundles[ name ] = createResourceBundle(
					name,
					resources,
					normalizeConfig( config )
				)
			},

			getResources: function() {
				return this.cache
			},

			setCache: function( content ) {
				this.cache = content
			},

			start: function() {
				_.each(
					this.resourceBundles,
					_.bind(
						function( resourceBundle ) {
							if( resourceBundle.state !== STATE_WAITING_FOR_PROCESSING ) return

							resourceBundle.state = STATE_PROCESSING
							startLoadingResourceBundle.call( this, this.logger, resourceBundle )
						},
						this
					)
				)
			}
		}

		return ResourceLoader
	}
)

define(
	"spell/shared/util/InputManager",
	[
		"spell/shared/util/platform/PlatformKit"
	],
	function(
		PlatformKit
	) {
		"use strict"

		//TODO: get constants from a global configuration
		var constants = {
			"xSize" : 1024,
			"ySize" : 768
		}

		/*
		 * private
		 */

		var nextSequenceNumber = 0


		/*
		 * public
		 */

		var inputEvents = []

		var mouseHandler = function( event ) {
			// scale screen space position to "world" position
			event.position[ 0 ] *= constants.xSize
			event.position[ 1 ] *= constants.ySize

			var internalEvent = {
				type           : event.type,
				sequenceNumber : nextSequenceNumber++,
                position       : event.position
			}

			inputEvents.push( internalEvent )
		}

        var touchHandler = function( event ) {
            // scale screen space position to "world" position
            event.position[ 0 ] *= constants.xSize
            event.position[ 1 ] *= constants.ySize

            var internalEvent = {
                type           : ( event.type === 'touchstart' ? 'mousedown' : 'mouseup' ),
                sequenceNumber : nextSequenceNumber++,
                position       : event.position
            }

            inputEvents.push( internalEvent )
        }

		var keyHandler = function( event ) {
			inputEvents.push( createKeyEvent( event.type, event.keyCode ) )
		}

		var createKeyEvent = function( type, keyCode ) {
			return {
				type           : type,
				keyCode        : keyCode,
				sequenceNumber : nextSequenceNumber++
			}
		}


		var InputManager = function( configurationManager ) {
			this.nativeInput = PlatformKit.createInput( configurationManager )
		}

		InputManager.prototype = {
			init : function() {
				if( PlatformKit.features.touch ) {
					this.nativeInput.setInputEventListener( 'touchstart', touchHandler )
					this.nativeInput.setInputEventListener( 'touchend', touchHandler )
				}

                this.nativeInput.setInputEventListener( 'mousedown', mouseHandler )
                this.nativeInput.setInputEventListener( 'mouseup', mouseHandler )

				this.nativeInput.setInputEventListener( 'keydown', keyHandler )
				this.nativeInput.setInputEventListener( 'keyup', keyHandler )
			},
			cleanUp : function() {
				if( PlatformKit.features.touch ) {
					this.nativeInput.removeInputEventListener( 'touchstart' )
					this.nativeInput.removeInputEventListener( 'touchend' )
				}

                this.nativeInput.removeInputEventListener( 'mousedown' )
                this.nativeInput.removeInputEventListener( 'mouseup' )

				this.nativeInput.removeInputEventListener( 'keydown' )
				this.nativeInput.removeInputEventListener( 'keyup' )
			},
			getInputEvents : function() {
				return inputEvents
			},
			injectKeyEvent : function( type, keyCode ) {
				inputEvents.push( createKeyEvent( type, keyCode ) )
			}
		}

		return InputManager
	}
)

define(
	"spell/shared/util/forestMultiMap",
	[
		'spell/functions'
	],
	function(
		_
	) {
		"use strict"


		function createNode() {
			return {
				subNodes: {},
				elements: []
			}
		}

		function getElements( node ) {
			if( !node ) {
				return []

			} else {
				return _.reduce(
					node.subNodes,
					function( elements, subNode ) {
						return elements.concat( getElements( subNode ) )
					},
					node.elements
				)
			}
		}

		function getNode( node, key, eachNode ) {
			return _.reduce(
				key,
				function( node, keyComponent ) {
					if( node === undefined ) return undefined

					if( eachNode !== undefined ) eachNode( node, keyComponent )

					return node.subNodes[ keyComponent ]
				},
				node
			)
		}


		return {
			create: function() {
				return createNode()
			},

			add: function(
				data,
				key,
				element
			) {
				var node = getNode(
					data,
					key,
					function( node, keyComponent ) {
						if ( !node.subNodes.hasOwnProperty( keyComponent ) ) {
							node.subNodes[ keyComponent ] = createNode()
						}
					}
				)

				node.elements.push( element )
			},

			remove: function(
				data,
				key,
				elementToRemove
			) {
				var node = getNode( data, key )

				node.elements = _.filter( node.elements, function( element ) {
					return element !== elementToRemove
				} )
			},

			get: function(
				data,
				key
			) {
				return getElements( getNode( data, key ) )
			}
		}
	}
)

define(
	'spell/shared/util/EventManager',
	[
		'spell/shared/util/forestMultiMap',
		'spell/shared/util/Events',

		'spell/functions'
	],
	function(
		forestMultiMap,
		Events,

		_
	) {
		'use strict'


		/*
		 * private
		 */

		var normalize = function( scope ) {
			return ( _.isArray( scope ) ? scope : [ scope ] )
		}

		var waitForChainConfig = false

		var registerWaitForChain = function( eventManager, config ) {
			var callback = config.callback

			// the lock is released after the n-th call ( n := config.events.length )
			var lock = _.after(
				config.events.length,
				function() {
					callback()
				}
			)

			// wire up all events to probe the lock
			_.each(
				config.events,
				function( event ) {
					eventManager.subscribe(
						event.scope,
						function( eventArgs ) {
							if( event.subscriber ) event.subscriber( eventArgs )

							lock()
						}
					)
				}
			)
		}


		/*
		 * public
		 */

		function EventManager() {
			this.subscribers = forestMultiMap.create()
		}

		EventManager.prototype = {
			subscribe: function( scope, subscriber ) {
				scope = normalize( scope )

				forestMultiMap.add(
					this.subscribers,
					scope,
					subscriber
				)

				this.publish( Events.SUBSCRIBE, [ scope, subscriber ] )
			},

			unsubscribe: function( scope, subscriber ) {
				scope = normalize( scope )

				forestMultiMap.remove(
					this.subscribers,
					scope,
					subscriber
				)

				this.publish( Events.UNSUBSCRIBE, [ scope, subscriber ] )
			},

			publish: function( scope, eventArgs ) {
				scope = normalize( scope )

				var subscribersInScope = forestMultiMap.get(
					this.subscribers,
					scope
				)

				_.each( subscribersInScope, function( subscriber ) {
					subscriber.apply( undefined, eventArgs )
				} )

				return true
			},

			waitFor: function( scope, subscriber ) {
				scope = normalize( scope )

				waitForChainConfig = {
					events : [ {
						scope      : scope,
						subscriber : subscriber
					} ]
				}

				return this
			},

			and: function( scope, subscriber ) {
				// check if pending chain call exists
				if( !waitForChainConfig ) throw 'A call to the method "and" must be chained to a previous call to "waitFor".'

				scope = normalize( scope )

				waitForChainConfig.events.push( {
					scope      : scope,
					subscriber : subscriber
				} )

				return this
			},

			resume: function( callback ) {
				// check if pending chain call exists, return otherwise
				if( !waitForChainConfig ) throw 'A call to the method "resume" must be chained to a previous call to "waitFor" or "and".'

				waitForChainConfig.callback = callback

				registerWaitForChain( this, waitForChainConfig )

				waitForChainConfig = false
			}
		}

		return EventManager
	}
)

define(
	"spell/shared/util/ConfigurationManager",
	[
		"spell/shared/util/platform/PlatformKit",
		"spell/shared/util/Events",

		'spell/functions'
	],
	function(
		PlatformKit,
		Events,

		_
	) {
		"use strict"


		/*
		 * private
		 */

		/*
		 * Generates a structure holding server host configuration information
		 *
		 * The returned structure looks like this:
		 * {
		 * 	host - the host, i.e. "acme.org:8080"
		 * 	type - This can take the value "internal" (same host as client was delivered from) or "external" (different host that the client was delivered from).
		 * }
		 *
		 * @param validValues
		 * @param value
		 */
		var extractServer = function( validValues, value ) {
			if( _.indexOf( validValues, '*' ) === -1 ) return false

			// TODO: validate that the value is a valid host
			var host = ( value === 'internal' ? PlatformKit.getHost() : value )
			var type = ( value === 'internal' ? 'internal' : 'external' )

			return {
				host : host,
				type : type
			}
		}

		var extractScreenSize = function( validValues, value ) {
			if( _.indexOf( validValues, value ) === -1 ) return false

			var parts = value.split( 'x' )

			return [ parseInt( parts[ 0 ] ), parseInt( parts[ 1 ] ) ]
		}

		var extractBoolean = function( validValues, value ) {
			return _.contains( validValues, value ) && value
		}

		/**
		 * These are the platform agnostic options.
		 *
		 * gameserver/resourceServer - "internal" means "same as the server that the client was delivered from"; "*" matches any valid host/port combination, i.e. "acme.org:8080"
		 *
		 * The property "configurable" controls if the option can be overridden by the environment configuration set up by the stage-0-loader.
		 */
		var validOptions = {
			drawCoordinateGrid : {
				validValues  : [ true, false ],
				configurable : true,
				extractor    : extractBoolean
			},
			screenSize : {
				validValues  : [ '640x480', '800x600', '1024x768' ],
				configurable : false,
				extractor    : extractScreenSize
			},
			gameServer : {
				validValues  : [ 'internal', '*' ],
				configurable : true,
				extractor    : extractServer
			},
			resourceServer : {
				validValues  : [ 'internal', '*' ],
				configurable : true,
				extractor    : extractServer
			},
			id : {
				configurable : true
			},
			debug : {
				validValues  : [ true, false ],
				configurable : true,
				extractor    : extractBoolean
			}
		}

		/*
		 * These options are used when they are not overridden by the environment configuration set up by the stage-0-loader.
		 */
		var defaultOptions = {
			drawCoordinateGrid : false,
			screenSize         : '1024x768',
			gameServer         : 'internal',
			resourceServer     : 'internal',
			id                 : 'spell' // dom node id
		}

		var createConfiguration = function( parameters, defaultOptions, validOptions ) {
			if( !defaultOptions ) defaultOptions = {}
			if( !validOptions ) validOptions = {}

			// PlatformKit.configurationOptions.* holds the platform specific options
			_.defaults( defaultOptions, PlatformKit.configurationOptions.defaultOptions )
			_.defaults( validOptions, PlatformKit.configurationOptions.validOptions )


			var suppliedParameters = parameters

			// filter out parameters that are not configurable
			suppliedParameters = _.reduce(
				suppliedParameters,
				function( memo, value, key ) {
					var option = validOptions[ key ]

					if( option &&
						!!option.configurable ) {

						memo[ key ] = value
					}

					return memo
				},
				{}
			)

			_.defaults( suppliedParameters, defaultOptions )

			var config = _.reduce(
				suppliedParameters,
				function( memo, optionValue, optionName ) {
					var option = validOptions[ optionName ],
						configValue = false

					if( option.extractor ) {
						configValue = option.extractor( option.validValues, optionValue )

					} else {
						configValue = optionValue
					}


					if( configValue !== false ) {
						memo[ optionName ] = configValue

					} else {
						// use the default value
						memo[ optionName ] = option.extractor( option.validValues, defaultOptions[ optionName ] )
					}

					return memo
				},
				{}
			)

			config.platform = PlatformKit.getPlatformInfo()

			return config
		}


		/*
		 * public
		 */

		var ConfigurationManager = function( eventManager, parameters ) {
			_.extend( this, createConfiguration( parameters, defaultOptions, validOptions ) )

			eventManager.subscribe(
				[ Events.SCREEN_RESIZE ],
				_.bind(
					function( newSize ) {
						this.screenSize = newSize
					},
					this
				)
			)
		}

		return ConfigurationManager
	}
)

define(
	'spell/shared/util/template/TemplateTypes',
	function() {
		'use strict'


		return {
			'ENTITY'    : 'entityTemplate',
			'COMPONENT' : 'componentTemplate',
			'SYSTEM'    : 'systemTemplate'
		}
	}
)

define(
	'spell/shared/util/deepClone',
	[
		'spell/functions'
	],
	function(
		_
	) {
		'use strict'


		return function deepClone( o ) {
			var isArray = _.isArray( o )

			if( isArray ||
				_.isObject( o ) ) {

				var clone = isArray ? [] : {}

				_.each( o, function( value, key ) {
					clone[ key ] = deepClone( value )
				} )

				return clone

			} else {
				return o
			}
		}
	}
)

define(
	'spell/shared/util/template/TemplateManager',
	[
		'spell/shared/util/deepClone',
		'spell/shared/util/template/TemplateTypes',

		'spell/functions'
	],
	function(
		deepClone,
		TemplateTypes,

		_
	) {
		'use strict'


		/*
		 * private
		 */

		var createName = function() {
		    return _.reduce(
		        arguments,
		        function( memo, argument ) {
		            if( argument === '' ) return memo

		            return memo + ( memo !== '' ? '.' : '' )  + argument
		        },
		        ''
		    )
		}

		var isValidComponentTemplate = function( template ) {
			// check for ambiguous attribute names
			var attributeNameCounts = _.reduce(
				template.attributes,
				function( memo, attributeConfig ) {
					var attributeName = attributeConfig.name

					memo[ attributeName ] = ( _.has( memo, attributeName ) ?
						memo[ attributeName ] += 1 :
						1
					)

					return memo
				},
				{}
			)

			return !_.any(
				attributeNameCounts,
				function( iter ) { return iter > 1 }
			)
		}

		var isValidEntityTemplate = function( template ) {
			// check for duplicate components
			var componentNameCounts = _.reduce(
				template.components,
				function( memo, componentConfig ) {
					var templateId = componentConfig.templateId

					memo[ templateId ] = ( _.has( memo, templateId ) ?
						memo[ templateId ] += 1 :
						1
					)

					return memo
				},
				{}
			)

			_.each(
				componentNameCounts,
				function( componentNameCount, componentName ) {
					if( componentNameCount > 1 ) {
						throw 'Error: Entity template \'' + template.templateId + '\' has duplicate component of type \'' + componentName + '\'.'
					}
				}
			)

			return true
		}

		var isValidDefinition = function( template ) {
			var templateType = template.type

			if( !_.contains( TemplateTypes, templateType ) ) return false


			if( templateType === TemplateTypes.COMPONENT ) {
				return isValidComponentTemplate( template )
			}

			if( templateType === TemplateTypes.ENTITY ) {
				return isValidEntityTemplate( template )
			}

			return true
		}

		var createComponentPrototype = function( componentTemplate ) {
			return _.reduce(
				componentTemplate.attributes,
				function( memo, attributeConfig ) {
					memo[ attributeConfig.name ] = _.clone( attributeConfig[ 'default' ] )

					return memo
				},
				{}
			)
		}

		var updateComponent = function( component, attributeConfig ) {
			if( attributeConfig === undefined ) {
				return component

			} else {
				return _.extend( component, attributeConfig )
			}
		}

		var addTemplate = function( assets, templates, entityPrototypes, definition ) {
			var templateId = createName( definition.namespace, definition.name )

			if( _.has( templates, templateId ) ) throw 'Error: Template definition \'' + templateId + '\' already exists.'

			templates[ templateId ] = definition

			if( definition.type === TemplateTypes.ENTITY ) {
				entityPrototypes[ templateId ] = createComponents( assets, templates, definition.config, null, templateId )
			}
		}

		var getTemplate = function( templates, templateId, templateType ) {
			var template = templates[ templateId ]

			return ( !template ?
				false :
				( !templateType ?
					template :
					( template.type !== templateType ?
						false :
						template
					)
				)
			)
		}

		var hasAssetIdAttribute = function( attributeConfig ) {
			return !!_.find(
				attributeConfig,
				function( attribute ) {
					return attribute.type.indexOf( 'assetId:' ) === 0
				}
			)
		}

		/**
		 * This function dereferences asset ids. If a component with an asset id attribute is found the reference is resolved and a additional asset attribute
		 * is added to the component instance.
		 *
		 * @param assets
		 * @param componentTemplate
		 * @param component
		 * @return {*}
		 */
		var injectAsset = function( assets, componentTemplate, component ) {
			if( hasAssetIdAttribute( componentTemplate.attributes ) ) {
				component.asset = assets[ component.assetId ]
			}

			return component
		}

		/**
		 * Applies a component config to an entity and returns the configured entity.
		 *
		 * @param entity
		 * @param componentConfig
		 * @return {*}
		 */
		var applyComponentConfig = function( entity, componentConfig ) {
			return _.reduce(
				componentConfig,
				function( entity, attributeConfig, componentId ) {
					entity[ componentId ] = _.extend(
						entity[ componentId ] || {},
						attributeConfig
					)

					return entity
				},
				entity
			)
		}

		var createComponents = function( assets, templates, componentConfig, entityPrototype, entityTemplateId ) {
			var entity = applyComponentConfig(
				entityPrototype ? deepClone( entityPrototype ) : {},
				componentConfig
			)

			_.each(
				entity,
				function( attributeConfig, componentId ) {
					var componentTemplate = getTemplate( templates, componentId, TemplateTypes.COMPONENT )

					if( !componentTemplate ) {
						throw 'Error: Could not find component template \'' + componentId +
							( entityTemplateId ?
								'\' referenced in entity template \'' + entityTemplateId + '\'.' :
								'\'.'
							)
					}

					entity[ componentId ] = injectAsset(
						assets,
						componentTemplate,
						updateComponent(
							createComponentPrototype( componentTemplate ),
							attributeConfig
						)
					)
				}
			)

			return entity
		}


		/*
		 * public
		 */

		function TemplateManager( assets ) {
			this.assets           = assets
			this.templates        = {}
			this.entityPrototypes = {}
		}

		TemplateManager.prototype = {
			add : function( definition ) {
				if( !definition.type ||
					!isValidDefinition( definition ) ) {

					throw 'Error: The format of the supplied template definition is invalid.'
				}

				addTemplate( this.assets, this.templates, this.entityPrototypes, definition )
			},

			createComponents : function( entityTemplateId, config ) {
				var entityPrototype

				if( entityTemplateId ) {
					entityPrototype = this.entityPrototypes[ entityTemplateId ]

					if( !entityPrototype ) throw 'Error: Could not find entity prototype for template id \'' + entityTemplateId + '\'.'
				}

				return createComponents( this.assets, this.templates, config, entityPrototype, entityTemplateId )
			},

			hasTemplate : function( templateId ) {
				return !!getTemplate( this.templates, templateId )
			},

			getTemplate : function( templateId ) {
				return getTemplate( this.templates, templateId )
			},

			getTemplateIds : function( templateType ) {
				if( !_.contains( TemplateTypes, templateType ) ) throw 'Error: Template type \'' + templateType + '\' is not supported.'

				return _.reduce(
					this.templates,
					function( memo, template, templateId ) {
						return template.type === templateType ? memo.concat( templateId ) : memo
					},
					[]
				)
			}
		}

		return TemplateManager
	}
)

define(
	"spell/math/hash/SHA256",
	function() {
		/* A JavaScript implementation of the SHA family of hashes, as defined in FIPS
		 * PUB 180-2 as well as the corresponding HMAC implementation as defined in
		 * FIPS PUB 198a
		 *
		 * Version 1.31 Copyright Brian Turek 2008-2012
		 * Distributed under the BSD License
		 * See http://caligatio.github.com/jsSHA/ for more information
		 *
		 * Several functions taken from Paul Johnson
		 */

		var charSize = 8,
		b64pad = "=",
		hexCase = 0,

		str2binb = function (str)
		{
			var bin = [], mask = (1 << charSize) - 1,
					length = str.length * charSize, i;

			for (i = 0; i < length; i += charSize)
			{
				bin[i >> 5] |= (str.charCodeAt(i / charSize) & mask) <<
						(32 - charSize - (i % 32));
			}

			return bin;
		},

		hex2binb = function (str)
		{
			var bin = [], length = str.length, i, num;

			for (i = 0; i < length; i += 2)
			{
				num = parseInt(str.substr(i, 2), 16);
				if (!isNaN(num))
				{
					bin[i >> 3] |= num << (24 - (4 * (i % 8)));
				}
				else
				{
					return "INVALID HEX STRING";
				}
			}

			return bin;
		},

		binb2hex = function (binarray)
		{
			var hex_tab = (hexCase) ? "0123456789ABCDEF" : "0123456789abcdef",
					str = "", length = binarray.length * 4, i, srcByte;

			for (i = 0; i < length; i += 1)
			{
				srcByte = binarray[i >> 2] >> ((3 - (i % 4)) * 8);
				str += hex_tab.charAt((srcByte >> 4) & 0xF) +
						hex_tab.charAt(srcByte & 0xF);
			}

			return str;
		},

		binb2b64 = function (binarray)
		{
			var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
							"0123456789+/", str = "", length = binarray.length * 4, i, j,
					triplet;

			for (i = 0; i < length; i += 3)
			{
				triplet = (((binarray[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16) |
						(((binarray[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8) |
						((binarray[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF);
				for (j = 0; j < 4; j += 1)
				{
					if (i * 8 + j * 6 <= binarray.length * 32)
					{
						str += tab.charAt((triplet >> 6 * (3 - j)) & 0x3F);
					}
					else
					{
						str += b64pad;
					}
				}
			}
			return str;
		},

		rotr = function (x, n)
		{
			return (x >>> n) | (x << (32 - n));
		},

		shr = function (x, n)
		{
			return x >>> n;
		},

		ch = function (x, y, z)
		{
			return (x & y) ^ (~x & z);
		},

		maj = function (x, y, z)
		{
			return (x & y) ^ (x & z) ^ (y & z);
		},

		sigma0 = function (x)
		{
			return rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
		},

		sigma1 = function (x)
		{
			return rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
		},

		gamma0 = function (x)
		{
			return rotr(x, 7) ^ rotr(x, 18) ^ shr(x, 3);
		},

		gamma1 = function (x)
		{
			return rotr(x, 17) ^ rotr(x, 19) ^ shr(x, 10);
		},

		safeAdd_2 = function (x, y)
		{
			var lsw = (x & 0xFFFF) + (y & 0xFFFF),
					msw = (x >>> 16) + (y >>> 16) + (lsw >>> 16);

			return ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);
		},

		safeAdd_4 = function (a, b, c, d)
		{
			var lsw = (a & 0xFFFF) + (b & 0xFFFF) + (c & 0xFFFF) + (d & 0xFFFF),
					msw = (a >>> 16) + (b >>> 16) + (c >>> 16) + (d >>> 16) +
							(lsw >>> 16);

			return ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);
		},

		safeAdd_5 = function (a, b, c, d, e)
		{
			var lsw = (a & 0xFFFF) + (b & 0xFFFF) + (c & 0xFFFF) + (d & 0xFFFF) +
							(e & 0xFFFF),
					msw = (a >>> 16) + (b >>> 16) + (c >>> 16) + (d >>> 16) +
							(e >>> 16) + (lsw >>> 16);

			return ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);
		},

		coreSHA2 = function (message, messageLen, variant)
		{
			var a, b, c, d, e, f, g, h, T1, T2, H, lengthPosition, i, t, K, W = [],
					appendedMessageLength;

			if (variant === "SHA-224" || variant === "SHA-256")
			{
				lengthPosition = (((messageLen + 65) >> 9) << 4) + 15;
				K = [
					0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
					0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
					0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
					0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
					0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
					0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
					0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
					0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
					0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
					0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
					0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
					0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
					0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
					0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
					0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
					0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
				];

				if (variant === "SHA-224")
				{
					H = [
						0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
						0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4
					];
				}
				else
				{
					H = [
						0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A,
						0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19
					];
				}
			}

			message[messageLen >> 5] |= 0x80 << (24 - messageLen % 32);
			message[lengthPosition] = messageLen;

			appendedMessageLength = message.length;

			for (i = 0; i < appendedMessageLength; i += 16)
			{
				a = H[0];
				b = H[1];
				c = H[2];
				d = H[3];
				e = H[4];
				f = H[5];
				g = H[6];
				h = H[7];

				for (t = 0; t < 64; t += 1)
				{
					if (t < 16)
					{
						W[t] = message[t + i];
					}
					else
					{
						W[t] = safeAdd_4(
								gamma1(W[t - 2]), W[t - 7],
								gamma0(W[t - 15]), W[t - 16]
						);
					}

					T1 = safeAdd_5(h, sigma1(e), ch(e, f, g), K[t], W[t]);
					T2 = safeAdd_2(sigma0(a), maj(a, b, c));
					h = g;
					g = f;
					f = e;
					e = safeAdd_2(d, T1);
					d = c;
					c = b;
					b = a;
					a = safeAdd_2(T1, T2);
				}

				H[0] = safeAdd_2(a, H[0]);
				H[1] = safeAdd_2(b, H[1]);
				H[2] = safeAdd_2(c, H[2]);
				H[3] = safeAdd_2(d, H[3]);
				H[4] = safeAdd_2(e, H[4]);
				H[5] = safeAdd_2(f, H[5]);
				H[6] = safeAdd_2(g, H[6]);
				H[7] = safeAdd_2(h, H[7]);
			}

			switch (variant)
			{
				case "SHA-224":
					return [
						H[0], H[1], H[2], H[3],
						H[4], H[5], H[6]
					];
				case "SHA-256":
					return H;
				default:
					return [];
			}
		},

		jsSHA = function (srcString, inputFormat)
		{

			this.sha224 = null;
			this.sha256 = null;

			this.strBinLen = null;
			this.strToHash = null;

			if ("HEX" === inputFormat)
			{
				if (0 !== (srcString.length % 2))
				{
					return "TEXT MUST BE IN BYTE INCREMENTS";
				}
				this.strBinLen = srcString.length * 4;
				this.strToHash = hex2binb(srcString);
			}
			else if (("ASCII" === inputFormat) ||
					('undefined' === typeof(inputFormat)))
			{
				this.strBinLen = srcString.length * charSize;
				this.strToHash = str2binb(srcString);
			}
			else
			{
				return "UNKNOWN TEXT INPUT TYPE";
			}
		};

		jsSHA.prototype = {
			getHash : function (variant, format)
			{
				var formatFunc = null, message = this.strToHash.slice();

				switch (format)
				{
					case "HEX":
						formatFunc = binb2hex;
						break;
					case "B64":
						formatFunc = binb2b64;
						break;
					default:
						return "FORMAT NOT RECOGNIZED";
				}

				switch (variant)
				{
					case "SHA-224":
						if (null === this.sha224)
						{
							this.sha224 = coreSHA2(message, this.strBinLen, variant);
						}
						return formatFunc(this.sha224);
					case "SHA-256":
						if (null === this.sha256)
						{
							this.sha256 = coreSHA2(message, this.strBinLen, variant);
						}
						return formatFunc(this.sha256);
					default:
						return "HASH NOT RECOGNIZED";
				}
			},

			getHMAC : function (key, inputFormat, variant, outputFormat)
			{
				var formatFunc, keyToUse, i, retVal, keyBinLen, hashBitSize,
						keyWithIPad = [], keyWithOPad = [];

				switch (outputFormat)
				{
					case "HEX":
						formatFunc = binb2hex;
						break;
					case "B64":
						formatFunc = binb2b64;
						break;
					default:
						return "FORMAT NOT RECOGNIZED";
				}

				switch (variant)
				{
					case "SHA-224":
						hashBitSize = 224;
						break;
					case "SHA-256":
						hashBitSize = 256;
						break;
					default:
						return "HASH NOT RECOGNIZED";
				}

				if ("HEX" === inputFormat)
				{
					if (0 !== (key.length % 2))
					{
						return "KEY MUST BE IN BYTE INCREMENTS";
					}
					keyToUse = hex2binb(key);
					keyBinLen = key.length * 4;
				}
				else if ("ASCII" === inputFormat)
				{
					keyToUse = str2binb(key);
					keyBinLen = key.length * charSize;
				}
				else
				{
					return "UNKNOWN KEY INPUT TYPE";
				}

				if (64 < (keyBinLen / 8))
				{
					keyToUse = coreSHA2(keyToUse, keyBinLen, variant);
					keyToUse[15] &= 0xFFFFFF00;
				}
				else if (64 > (keyBinLen / 8))
				{
					keyToUse[15] &= 0xFFFFFF00;
				}

				for (i = 0; i <= 15; i += 1)
				{
					keyWithIPad[i] = keyToUse[i] ^ 0x36363636;
					keyWithOPad[i] = keyToUse[i] ^ 0x5C5C5C5C;
				}

				retVal = coreSHA2(
						keyWithIPad.concat(this.strToHash),
						512 + this.strBinLen, variant);
				retVal = coreSHA2(
						keyWithOPad.concat(retVal),
						512 + hashBitSize, variant);

				return (formatFunc(retVal));
			}
		};

		return jsSHA
	}
)



define(
	'spell/shared/util/hashModuleIdentifier',
	[
		'spell/math/hash/SHA256'
	],
	function(
		SHA256
	) {
		'use strict'


		return function( text ) {
			var shaObj = new SHA256( text, 'ASCII' )

			return shaObj.getHash( 'SHA-256', 'B64' )
		}
	}
)

define(
	'spell/shared/util/entityConfig/flatten',
	[
		'spell/functions'
	],
	function(
		_
	) {
		'use strict'


		var flattenEntityConfig = function( entityConfigs ) {
			return _.reduce(
				entityConfigs,
				function( memo, entityConfig ) {
					memo.push( entityConfig )

					return _.has( entityConfig, 'children' ) ?
						memo.concat( flattenEntityConfig( entityConfig.children ) ) :
						memo
				},
				[]
			)
		}

		return function( arg0 ) {
			var entityConfigs = _.isArray( arg0 ) ? arg0 : [ arg0 ]

			return flattenEntityConfig( entityConfigs )
		}
	}
)

define(
	'spell/shared/util/scene/Scene',
	[
		'spell/shared/util/create',
		'spell/shared/util/entityConfig/flatten',
		'spell/shared/util/hashModuleIdentifier',
		'spell/shared/util/Events',

		'spell/functions'
	],
	function(
		create,
		flattenEntityConfig,
		hashModuleIdentifier,
		Events,

		_
	) {
		'use strict'


		/*
		 * private
		 */

		var cameraEntityTemplateId    = 'spell.entity.2d.graphics.camera',
			cameraComponentTemplateId = 'spell.component.2d.graphics.camera'

		var loadModule = function( moduleId, config ) {
			if( !moduleId ) throw 'Error: No module id provided.'

			var module = require( moduleId, undefined, config )

			if( !module ) throw 'Error: Could not resolve module id \'' + moduleId + '\' to module.'

			return module
		}

		/*
		 * TODO: Remove this custom invoke that knows how to handle the borked instances produced by the "create" constructor wrapper function.
		 * Instances created by "create" for some unknown reason do not support prototype chain method look-up. See "Fix create"
		 */
		var invoke = function( items, functionName, args ) {
			_.each(
				items,
				function( item ) {
					item.prototype[ functionName ].apply( item, args )
				}
			)
		}

		var createTemplateId = function( namespace, name ) {
			return namespace + '.' + name
		}

		var createModuleIdFromTemplateId = function( id ) {
			return id.replace( /\./g, '/' )
		}

		var createSystem = function( spell, templateManager, entityManager, anonymizeModuleIdentifiers, systemTemplateId ) {
			var template = templateManager.getTemplate( systemTemplateId ),
				moduleId = createModuleIdFromTemplateId( createTemplateId( template.namespace, template.name ) )

			var constructor = loadModule(
				anonymizeModuleIdentifiers ? hashModuleIdentifier( moduleId ) : moduleId,
				{
					baseUrl : 'library/templates'
				}
			)

			var componentsInput = _.reduce(
				template.input,
				function( memo, inputDefinition ) {
					memo[ inputDefinition.name ] = entityManager.getComponentsById( inputDefinition.templateId )

					return memo
				},
				{}
			)

			// TODO: Fix create. Returned instances do not support prototype chain method look-up. O_o
			return create( constructor, [ spell ], componentsInput )
		}

		var createSystems = function( spell, systemTemplateIds, anonymizeModuleIdentifiers ) {
			var templateManager = spell.templateManager,
				entityManager   = spell.entityManager

			return _.map(
				systemTemplateIds,
				function( systemTemplateId ) {
					return createSystem( spell, templateManager, entityManager, anonymizeModuleIdentifiers, systemTemplateId )
				}
			)
		}

		var hasActiveCamera = function( sceneConfig ) {
			return _.any(
				flattenEntityConfig( sceneConfig.entities ),
				function( entityConfig ) {
					if( entityConfig.templateId !== cameraEntityTemplateId ||
						!entityConfig.config ) {

						return false
					}

					var cameraComponent = entityConfig.config[ cameraComponentTemplateId ]

					if( !cameraComponent ) return false

					return cameraComponent.active
				}
			)
		}


		/*
		 * public
		 */

		var Scene = function( spell, entityManager ) {
			this.spell         = spell
			this.entityManager = entityManager
			this.renderSystems = null
			this.updateSystems = null
			this.script        = null
		}

		Scene.prototype = {
			render: function( timeInMs, deltaTimeInMs ) {
				invoke( this.renderSystems, 'process', [ this.spell, timeInMs, deltaTimeInMs ] )
			},
			update: function( timeInMs, deltaTimeInMs ) {
				invoke( this.updateSystems, 'process', [ this.spell, timeInMs, deltaTimeInMs ] )
			},
			init: function( spell, sceneConfig, anonymizeModuleIdentifiers ) {
				if( !hasActiveCamera( sceneConfig ) ) {
					spell.logger.error( 'Could not start scene "' + sceneConfig.name + '" because no camera entity was found. A scene must have at least one active camera entity.' )

					return
				}

				if( sceneConfig.scriptId ) {
					this.script = loadModule( sceneConfig.scriptId )
					this.script.init( this.spell, this.entityManager, sceneConfig )
				}

				if( sceneConfig.systems ) {
					this.renderSystems = createSystems( spell, sceneConfig.systems.render, anonymizeModuleIdentifiers )
					this.updateSystems = createSystems( spell, sceneConfig.systems.update, anonymizeModuleIdentifiers )

					invoke( this.renderSystems, 'init', [ this.spell, sceneConfig ] )
					invoke( this.updateSystems, 'init', [ this.spell, sceneConfig ] )
				}
			},
			destroy: function( spell, sceneConfig ) {
				invoke( this.renderSystems, 'cleanUp', [ this.spell, sceneConfig ] )
				invoke( this.updateSystems, 'cleanUp', [ this.spell, sceneConfig ] )

				this.script.cleanUp( this.spell )
			}
		}

		return Scene
	}
)

define(
	'spell/shared/util/scene/SceneManager',
	[
		'spell/shared/util/Events',
		'spell/shared/util/scene/Scene',

		'spell/functions'
	],
	function(
		Events,
		Scene,

		_
	) {
		'use strict'


		/*
		 * public
		 */

		var SceneManager = function( spell, entityManager, mainLoop ) {
			this.entityManager = entityManager
			this.mainLoop      = mainLoop
			this.spell         = spell
		}

		SceneManager.prototype = {
			startScene: function( sceneConfig, anonymizeModuleIdentifiers ) {
				var scene = new Scene( this.spell, this.entityManager )
				scene.init( this.spell, sceneConfig, anonymizeModuleIdentifiers )

				this.mainLoop.setRenderCallback( _.bind( scene.render, scene ) )
				this.mainLoop.setUpdateCallback( _.bind( scene.update, scene ) )
			}
		}

		return SceneManager
	}
)

define(
	'spell/shared/util/create',
	[
		'spell/functions'
	],
	function(
		_
	) {
		'use strict'


		var NO_CONSTRUCTOR_ERROR = 'The first argument for create must be a constructor. You passed in '


		/*
		 * public
		 */

		// TODO: Fix the issue that instances which where created with "create" do not support method look-up along the prototype chain.
		return function( constructor, constructorArguments, propertiesToInject ) {
			if ( constructor.prototype === undefined ) {
				throw NO_CONSTRUCTOR_ERROR + constructor
			}

			var object = {}

			if( !!propertiesToInject && _.isObject( propertiesToInject ) ) {
				_.extend( object, propertiesToInject )
			}

			object.prototype = constructor.prototype
			var returnedObject = constructor.apply( object, constructorArguments )
			return returnedObject || object
		}
	}
)

/**
 * @class spell.shared.util.entity.EntityManager
 */
define(
	'spell/shared/util/entity/EntityManager',
	[
		'spell/shared/util/create',

		'spell/functions'
	],
	function(
		create,

		_
	) {
		'use strict'


		/*
		 * private
		 */

		var nextEntityId        = 1,
			rootComponentId     = 'spell.component.entityComposite.root',
			childrenComponentId = 'spell.component.entityComposite.children'

		/**
		 * Returns an entity id. If an entity config already has an entity id it must be processed by this function too. This is necessary because otherwise
		 * the engine can not guarantee that a generated entity id is not already in use.
		 *
		 * @param {Integer} id
		 * @return {Integer}
		 */
		var getEntityId = function( id ) {
			if( id ) {
				nextEntityId = Math.max( id + 1, nextEntityId )

				return id

			} else {
				return nextEntityId++
			}
		}

		var createComponentList = function( componentTemplateIds ) {
			return _.reduce(
				componentTemplateIds,
				function( memo, componentTemplateId ) {
					memo[ componentTemplateId ] = {}

					return memo
				},
				{}
			)
		}

		var addComponents = function( components, entityId, entityComponents ) {
			_.each(
				entityComponents,
				function( component, componentId ) {
					if( !!components[ componentId ][ entityId ] ) {
						throw 'Error: Adding a component to the entity with id \'' + entityId + '\' failed because the requested id is already in use. ' +
							'Please make sure that no duplicate entity ids are used.'
					}

					components[ componentId ][ entityId ] = component
				}
			)
		}

		var removeComponents = function( components, entityId, entityComponentId ) {
			if( entityComponentId ) {
				// remove a single component from the entity
				delete components[ entityComponentId ][ entityId ]

			} else {
				// remove all components, that is "remove the entity"
				_.each(
					components,
					function( componentList ) {
						if( !_.has( componentList, entityId ) ) return

						delete componentList[ entityId ]
					}
				)
			}
		}

		/*
		 * Normalizes the provided entity config
		 *
		 * @param templateManager
		 * @param arg1 can be either a entity template id or a entity config
		 * @return {*}
		 */
		var normalizeEntityConfig = function( templateManager, arg1 ) {
			if( !arg1 ) return

			var config     = arg1.config || {},
				children   = arg1.children || [],
				templateId = _.isString( arg1 ) ? arg1 : arg1.templateId

			if( templateId ) {
				var template = templateManager.getTemplate( templateId )

				if( !template ) {
					throw 'Error: Unknown template \'' + templateId + '\'. Could not create entity.'
				}

				if( template.children &&
					template.children.length > 0 ) {

					children = children.concat( template.children )
				}
			}

			return {
				children   : children,
				config     : config,
				id         : arg1.id ? arg1.id : undefined,
				templateId : templateId
			}
		}

		/*
		 * Normalizes the provided component config
		 *
		 * @param arg0 can be either a component template id or a component config
		 * @return {*}
		 */
		var normalizeComponentConfig = function( arg0 ) {
			var templateId,
				config

			if( !arg0 ) return

			if( _.isString( arg0 ) ) {
				templateId = arg0
				config = {}

			} else if( _.isObject( arg0 ) ) {
				if( !_.has( arg0, 'templateId' ) ) {
					throw 'Error: Supplied invalid arguments.'
				}

				templateId = arg0.templateId
				config = arg0.config || {}
			}

			var result = {}
			result[ templateId ] = config

			return result
		}

		var createEntityCompositeConfig = function( isRoot, childEntityIds ) {
			var result = {}

			if( isRoot ) result[ rootComponentId ] = {}

			if( _.size( childEntityIds ) > 0 ) {
				result[ childrenComponentId ] = {
					"ids" : childEntityIds
				}
			}

			return result
		}

		var createEntity = function( components, templateManager, entityConfig, isRoot ) {
			isRoot       = ( isRoot === true || isRoot === undefined )
			entityConfig = normalizeEntityConfig( templateManager, entityConfig )

			if( !entityConfig ) throw 'Error: Supplied invalid arguments.'

			var templateId = entityConfig.templateId,
				config     = entityConfig.config || {}

			if( !templateId && !config ) {
				throw 'Error: Supplied invalid arguments.'
			}

			// creating child entities
			var childEntityIds = _.map(
				entityConfig.children,
				function( entityConfig ) {
					return createEntity( components, templateManager, entityConfig, false )
				}
			)

			// creating current entity
			_.extend( config, createEntityCompositeConfig( isRoot, childEntityIds ) )

			var entityId = getEntityId( parseInt( entityConfig.id ) )

			addComponents(
				components,
				entityId,
				templateManager.createComponents( templateId, config || {} )
			)

			return entityId
		}


		/*
		 * public
		 */

		var EntityManager = function( templateManager ) {
			this.components      = createComponentList( templateManager.getTemplateIds( 'componentTemplate' ) )
			this.templateManager = templateManager
		}

		EntityManager.prototype = {
			/**
			 * Creates an entity
			 *
			 * @param arg0 an entity template id or an entity config
			 * @return {*}
			 */
			createEntity : function( arg0 ) {
				return createEntity( this.components, this.templateManager, arg0 )
			},

			/**
			 * Removes an entity
			 *
			 * @param entityId the id of the entity to remove
			 */
			removeEntity : function( entityId ) {
				if( !entityId ) throw 'Error: Missing entity id.'

				removeComponents( this.components, entityId )
			},

			/**
			 * TBD
			 */
			createEntities : function( entityConfigs ) {
				var self = this

				_.each(
					entityConfigs,
					function( entityConfig ) {
						self.createEntity( entityConfig )
					}
				)
			},

			/**
			 * Adds a component to an entity
			 *
			 * @param entityId the id of the entity that the component belongs to
			 * @param arg1 can be a component template id or a component template config
			 * @return {*}
			 */
			addComponent : function( entityId, arg1 ) {
				if( !entityId ) throw 'Error: Missing entity id.'

				addComponents(
					this.components,
					entityId,
					this.templateManager.createComponents( null, normalizeComponentConfig( arg1 ) )
				)
			},

			/**
			 * Removes a component from an entity
			 *-
			 * @param entityId the id of the entity that the component belongs to
			 * @param componentId the id (template id) of the component to remove
			 * @return {*}
			 */
			removeComponent : function( entityId, componentId ) {
				if( !entityId ) throw 'Error: Missing entity id.'

				removeComponents( this.components, entityId, componentId )
			},

			/**
			 * Returns true if an entity has a component
			 *
			 * @param entityId the id of the entity to check
			 * @param componentId the id of the component to check
			 * @return {Boolean}
			 */
			hasComponent : function( entityId, componentId ) {
				var componentList = this.components[ componentId ]

				if( !componentList ) return false

				return !!componentList[ entityId ]
			},

			/**
			 * Returns a specific component
			 *
			 * @param entityId the id of the entity
			 * @param componentId the id of the component
			 * @return {Object}
			 */
			getComponent : function( entityId, componentId ) {
				var componentList = this.components[ componentId ]

				if( !componentList || !componentList[ entityId ]) return undefined

				return componentList[ entityId ]
			},

			getComponentsById : function( componentTemplateId ) {
				var components = this.components[ componentTemplateId ]

				if( !components ) throw 'Error: No component list for component template id \'' + componentTemplateId +  '\' available.'

				return components
			}
		}


		return EntityManager
	}
)

define(
	"spell/shared/util/Timer",
	[
		"spell/shared/util/Events",
		"spell/shared/util/platform/Types",

		'spell/functions'
	],
	function(
		Events,
		Types,

		_
	) {
		"use strict"


		/*
		 * private
		 */

//		var checkTimeWarp = function( newRemoteTime, updatedRemoteTime ) {
//			if( updatedRemoteTime > newRemoteTime ) return
//
//			var tmp = newRemoteTime - updatedRemoteTime
//			console.log( 'WARNING: clock reset into past by ' + tmp + ' ms' )
//		}


		/*
		 * public
		 */

		function Timer( eventManager, statisticsManager, initialTime ) {
			this.newRemoteTime        = initialTime
			this.remoteTime           = initialTime
			this.newRemoteTimPending  = false
			this.localTime            = initialTime
			this.previousSystemTime   = Types.Time.getCurrentInMs()
			this.elapsedTime          = 0
			this.deltaLocalRemoteTime = 0
			this.statisticsManager    = statisticsManager

			eventManager.subscribe(
				[ "clockSyncUpdate" ],
				_.bind(
					function( updatedRemoteTime ) {
//						checkTimeWarp( newRemoteTime, updatedRemoteTime )

						this.newRemoteTime = updatedRemoteTime
						this.newRemoteTimPending = true
					},
					this
				)
			)

			eventManager.subscribe(
				Events.CLOCK_SYNC_ESTABLISHED,
				_.bind(
					function( initialRemoteGameTimeInMs ) {
						this.newRemoteTime = this.remoteTime = this.localTime = initialRemoteGameTimeInMs
						this.newRemoteTimPending = false
					},
					this
				)
			)

			// setting up statistics
			statisticsManager.addSeries( 'remoteTime', '' )
			statisticsManager.addSeries( 'localTime', '' )
			statisticsManager.addSeries( 'deltaLocalRemoteTime', '' )
			statisticsManager.addSeries( 'relativeClockSkew', '' )
			statisticsManager.addSeries( 'newRemoteTimeTransfered', '' )
		}

		Timer.prototype = {
			update : function() {
				// TODO: think about incorporating the new value "softly" instead of directly replacing the old one
				if( this.newRemoteTimPending ) {
					this.remoteTime          = this.newRemoteTime
					this.newRemoteTimPending = false
				}

				// measuring time
				var systemTime            = Types.Time.getCurrentInMs()
				this.elapsedTime          = Math.max( systemTime - this.previousSystemTime, 0 ) // it must never be smaller than 0
				this.previousSystemTime   = systemTime

				this.localTime            += this.elapsedTime
				this.remoteTime           += this.elapsedTime
				this.deltaLocalRemoteTime = this.localTime - this.remoteTime

				// relative clock skew
				var factor = 1000000000
				this.relativeClockSkew = ( ( this.localTime / this.remoteTime * factor ) - factor ) * 2 + 1

				// updating statistics
				this.statisticsManager.updateSeries( 'remoteTime', this.remoteTime % 2000 )
				this.statisticsManager.updateSeries( 'localTime', this.localTime % 2000 )
				this.statisticsManager.updateSeries( 'deltaLocalRemoteTime', this.deltaLocalRemoteTime + 250 )
				this.statisticsManager.updateSeries( 'relativeClockSkew', this.relativeClockSkew )
			},
			getLocalTime : function() {
				return this.localTime
			},
			getElapsedTime : function() {
				return this.elapsedTime
			},
			getRemoteTime : function() {
				return this.remoteTime
			}//,
//			getDeltaLocalRemoteTime : function() {
//				return deltaRemoteLocalTime
//			},
//			getRelativeClockSkew : function() {
//				return relativeClockSkew
//			}
		}

		return Timer
	}
)

define(
	'spell/shared/util/createMainLoop',
	[
		'spell/shared/util/Events',
		'spell/shared/util/Timer',
		'spell/shared/util/platform/Types',
		'spell/shared/util/platform/PlatformKit',

		'spell/functions'
	],
	function(
		Events,
		Timer,
		Types,
		PlatformKit,

		_
	) {
		'use strict'


		/*
		 * private
		 */

		var allowedDeltaInMs = 20,
			DEFAULT_UPDATE_INTERVAL_IN_MS = 20


		var MainLoop = function( eventManager, statisticsManager, updateIntervalInMs ) {
			this.updateIntervalInMs  = updateIntervalInMs || DEFAULT_UPDATE_INTERVAL_IN_MS
			this.renderCallback      = null
			this.updateCallback      = null
			this.accumulatedTimeInMs = 0

			// Until the proper remote game time is computed local time will have to do.
			var initialLocalGameTimeInMs = Types.Time.getCurrentInMs()
			this.timer = new Timer( eventManager, statisticsManager, initialLocalGameTimeInMs )
		}

		MainLoop.prototype = {
			setRenderCallback : function( f ) {
				this.renderCallback = f
			},
			setUpdateCallback : function( f ) {
				this.updateCallback = f
			},
			callEveryFrame : function( currentTimeInMs ) {
				var timer = this.timer
				timer.update()

				var clockSpeedFactor    = 1.0,
					localTimeInMs       = timer.getLocalTime(),
					elapsedTimeInMs     = timer.getElapsedTime(),
					accumulatedTimeInMs = this.accumulatedTimeInMs + elapsedTimeInMs * clockSpeedFactor,
					updateIntervalInMs  = this.updateIntervalInMs

				if( this.updateCallback ) {
					/*
					 * Only simulate, if not too much time has accumulated to prevent CPU overload. This can happen when the browser tab has been in the
					 * background for a while and requestAnimationFrame is used.
					 */
					while( accumulatedTimeInMs > updateIntervalInMs ) {
						if( accumulatedTimeInMs <= 5 * updateIntervalInMs ) {
							this.updateCallback( localTimeInMs, updateIntervalInMs )
						}

						accumulatedTimeInMs -= updateIntervalInMs
						localTimeInMs += updateIntervalInMs
					}
				}

				if( this.renderCallback ) {
					this.renderCallback( localTimeInMs, elapsedTimeInMs )
				}

//				var localGameTimeDeltaInMs = timer.getRemoteTime() - localTimeInMs
//
//				if( Math.abs( localGameTimeDeltaInMs ) > allowedDeltaInMs ) {
//					if( localGameTimeDeltaInMs > 0 ) {
//						clockSpeedFactor = 1.25
//
//					} else {
//						clockSpeedFactor = 0.25
//					}
//
//				} else {
//					clockSpeedFactor = 1.0
//				}

				PlatformKit.callNextFrame( this.callEveryFramePartial )
			},
			run : function() {
				this.callEveryFramePartial = _.bind( this.callEveryFrame, this )
				this.callEveryFramePartial( Types.Time.getCurrentInMs() )
			}
		}


		/*
		 * public
		 */

		return function( eventManager, statisticsManager, updateInterval ) {
			return new MainLoop( eventManager, statisticsManager, updateInterval )
		}
	}
)

define(
	'spell/shared/util/createEntityEach',
	[
		'spell/functions'
	],
	function(
		_
	) {
		'use strict'


		return function( primaryComponents, argumentComponents, iterator ) {
			if( !_.isArray( argumentComponents ) ) {
				argumentComponents = [ argumentComponents ]
			}

			return function() {
				var ids    = _.keys( primaryComponents ),
					numIds = ids.length

				for( var i = 0; i < numIds; i++ ) {
					var id = ids[ i ],
						primaryComponent = [ primaryComponents[ id ] ],
						numArgumentComponentsList = argumentComponents.length,
						args = ( arguments ? _.toArray( arguments ).concat( primaryComponent ) : [ primaryComponent ] )

					for( var j = 0; j < numArgumentComponentsList; j++ ) {
						args.push( argumentComponents[ j ][ id ] )
					}

					iterator.apply( null, args )
				}
			}
		}
	}
)

/**
 * Xorshift is a pseudorandom number generator. It generates the next number in
 * a sequence by repeatly taking the exclusive OR of a number with a bit shifted version of itself.
 *
 * You can use it to always generate the same sequence of random numbers depending of the choosen seed.
 *
 * Example:
 *
 *     var randomNumberGenerator = new XorShift32( 12345 );
 *     //=> new Instance of Xorshift with seed 12345
 *
 *     var randomNumber1 = randomNumberGenerator.{@link #next}();
 *     var randomNumber2 = randomNumberGenerator.{@link #next}();
 *
 *     //=> always returns the same random number sequence depending on the seed
 *
 * @class spell.math.random.XorShift32
 */

/**
 * Create a new instance of XorShift32 and initialize the seed with the given parameter.
 *
 * @param {Number} seed
 * @constructor
 */
define(
	'spell/math/random/XorShift32',
	function() {
		'use strict'

		var XorShift32 = function( seed ) {
			this.x = seed
		}

		/**
		 * Return the next pseudorandom number in the sequence
		 * @return {Number}
		 */
		XorShift32.prototype.next = function() {
				var a = this.x,
					b = a

				a <<= 13
				b ^= a

				a >>= 17
				b ^= a

				a <<= 5
				b ^= a


				this.x = b

				return ( b + 2147483648 ) * ( 1 / 4294967296 )
			}

		/**
		 * Return the next pseudorandom number between min and max in the sequence
		 * @param {Number} min The minimum value
		 * @param {Number} max The maximum value
		 * @return {Number}
		 */
		XorShift32.prototype.nextBetween = function( min, max ) {
				return ( min + this.next() * ( max - min ) )
		}


		return XorShift32
	}
)

/*
 * This class is derived from glmatrix 1.3.7. Original Licence follows:
 *
 * Copyright (c) 2012 Brandon Jones, Colin MacKenzie IV
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 * 1. The origin of this software must not be misrepresented; you must not
 * claim that you wrote the original software. If you use this software
 * in a product, an acknowledgment in the product documentation would be
 * appreciated but is not required.
 *
 * 2. Altered source versions must be plainly marked as such, and must not
 * be misrepresented as being the original software.
 *
 * 3. This notice may not be removed or altered from any source
 * distribution.
 */

/**
 * **This class implements high performance 3 dimensional vector math.**
 *
 * Example usage:
 *
 *     var vecA = vec2.{@link #createFrom}(1, 2, 3);
 *     //=> vecA is now a Float32Array with [1,2,3]
 *
 *     var vecB = vec2.{@link #create}([3, 4, 5]);
 *     //=> vecB is now a Float32Array with [3,4,5], The original array has been converted to a Float32Array.
 *
 *     var vecC = vec2.{@link #add}(vecA, vecB);
 *     //=> vecB = vecC is now [4, 6, 8]. VecB has been overriden because we provided no destination vector as third argument..
 *
 *     var vecD = vec2.{@link #create}();
 *     //=> Allocate a new empty Float32Array with [0, 0, 0]
 *
 *     var vecD = vec2.{@link #add}(vecA, vecB, vecD);
 *     //=> vecA and vecB are not touched, the result is written in vecD = [5,8,11]
 *
 * Please note: This object does not hold the vector components itself, it defines helper functions which manipulate
 * highly optimized data structures. This is done for performance reasons. **You need to allocate new vectors
 * with the {@link #create} or {@link #createFrom} function. Don't try to allocate new vectors yourself, always use
 * these function to do so.**
 *
 * *This class is derived from [glMatrix](https://github.com/toji/gl-matrix) 1.3.7 originally written by Brandon Jones
 * and Colin MacKenzie IV. The original BSD licence is included in the source file of this class.*
 *
 * @class spell.math.vec3
 * @singleton
 * @requires Math
 * @requires spell.shared.util.platform.Types
 * @requires spell.math.quat4
 */
define(
	"spell/math/vec3",
	[
		"spell/shared/util/platform/Types",
		"spell/math/quat4",
		"spell/math/mat4"
	],
	function(
		Types,
		quat4,
		mat4
	) {

		"use strict";
		var createFloatArray = Types.createFloatArray;

		// Tweak to your liking
		var FLOAT_EPSILON = 0.000001;

		var vec3 = {};

		/**
		 * Creates a new instance of a vec3 using the default array type
		 * Any javascript array-like objects containing at least 3 numeric elements can serve as a vec3
		 *
		 * @param {Array} [vec3] vec3 containing values to initialize with
		 *
		 * @returns {Float32Array} New vec3
		 */
		vec3.create = function (vec) {
			var dest = createFloatArray(3);

			if (vec) {
				dest[0] = vec[0];
				dest[1] = vec[1];
				dest[2] = vec[2];
			} else {
				dest[0] = dest[1] = dest[2] = 0;
			}

			return dest;
		};

		/**
		 * Creates a new instance of a vec3, initializing it with the given arguments
		 *
		 * @param {number} x X value
		 * @param {number} y Y value
		 * @param {number} z Z value

		 * @returns {Float32Array} New vec3
		 */
		vec3.createFrom = function (x, y, z) {
			var dest = createFloatArray(3);

			dest[0] = x;
			dest[1] = y;
			dest[2] = z;

			return dest;
		};

		/**
		 * Copies the values of one vec3 to another
		 *
		 * @param {Float32Array} vec vec3 containing values to copy
		 * @param {Float32Array} dest vec3 receiving copied values
		 *
		 * @returns {Float32Array} dest
		 */
		vec3.set = function (vec, dest) {
			dest[0] = vec[0];
			dest[1] = vec[1];
			dest[2] = vec[2];

			return dest;
		};

		/**
		 * Compares two vectors for equality within a certain margin of error
		 *
		 * @param {Float32Array} a First vector
		 * @param {Float32Array} b Second vector
		 *
		 * @returns {Boolean} True if a is equivalent to b
		 */
		vec3.equal = function (a, b) {
			return a === b || (
				Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
					Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
					Math.abs(a[2] - b[2]) < FLOAT_EPSILON
				);
		};

		/**
		 * Performs a vector addition
		 *
		 * @param {Float32Array} vec First operand
		 * @param {Float32Array} vec2 Second operand
		 * @param {Float32Array} [dest] vec3 receiving operation result. If not specified result is written to vec
		 *
		 * @returns {Float32Array} dest if specified, vec otherwise
		 */
		vec3.add = function (vec, vec2, dest) {
			if (!dest || vec === dest) {
				vec[0] += vec2[0];
				vec[1] += vec2[1];
				vec[2] += vec2[2];
				return vec;
			}

			dest[0] = vec[0] + vec2[0];
			dest[1] = vec[1] + vec2[1];
			dest[2] = vec[2] + vec2[2];
			return dest;
		};

		/**
		 * Performs a vector subtraction
		 *
		 * @param {Float32Array} vec First operand
		 * @param {Float32Array} vec2 Second operand
		 * @param {Float32Array} [dest] vec3 receiving operation result. If not specified result is written to vec
		 *
		 * @returns {Float32Array} dest if specified, vec otherwise
		 */
		vec3.subtract = function (vec, vec2, dest) {
			if (!dest || vec === dest) {
				vec[0] -= vec2[0];
				vec[1] -= vec2[1];
				vec[2] -= vec2[2];
				return vec;
			}

			dest[0] = vec[0] - vec2[0];
			dest[1] = vec[1] - vec2[1];
			dest[2] = vec[2] - vec2[2];
			return dest;
		};

		/**
		 * Performs a vector multiplication
		 *
		 * @param {Float32Array} vec First operand
		 * @param {Float32Array} vec2 Second operand
		 * @param {Float32Array} [dest] vec3 receiving operation result. If not specified result is written to vec
		 *
		 * @returns {Float32Array} dest if specified, vec otherwise
		 */
		vec3.multiply = function (vec, vec2, dest) {
			if (!dest || vec === dest) {
				vec[0] *= vec2[0];
				vec[1] *= vec2[1];
				vec[2] *= vec2[2];
				return vec;
			}

			dest[0] = vec[0] * vec2[0];
			dest[1] = vec[1] * vec2[1];
			dest[2] = vec[2] * vec2[2];
			return dest;
		};

		/**
		 * Negates the components of a vec3
		 *
		 * @param {Float32Array} vec vec3 to negate
		 * @param {Float32Array} [dest] vec3 receiving operation result. If not specified result is written to vec
		 *
		 * @returns {Float32Array} dest if specified, vec otherwise
		 */
		vec3.negate = function (vec, dest) {
			if (!dest) {
				dest = vec;
			}

			dest[0] = -vec[0];
			dest[1] = -vec[1];
			dest[2] = -vec[2];
			return dest;
		};

		/**
		 * Multiplies the components of a vec3 by a scalar value
		 *
		 * @param {Float32Array} vec vec3 to scale
		 * @param {number} val Value to scale by
		 * @param {Float32Array} [dest] vec3 receiving operation result. If not specified result is written to vec
		 *
		 * @returns {Float32Array} dest if specified, vec otherwise
		 */
		vec3.scale = function (vec, val, dest) {
			if (!dest || vec === dest) {
				vec[0] *= val;
				vec[1] *= val;
				vec[2] *= val;
				return vec;
			}

			dest[0] = vec[0] * val;
			dest[1] = vec[1] * val;
			dest[2] = vec[2] * val;
			return dest;
		};

		/**
		 * Generates a unit vector of the same direction as the provided vec3
		 * If vector length is 0, returns [0, 0, 0]
		 *
		 * @param {Float32Array} vec vec3 to normalize
		 * @param {Float32Array} [dest] vec3 receiving operation result. If not specified result is written to vec
		 *
		 * @returns {Float32Array} dest if specified, vec otherwise
		 */
		vec3.normalize = function (vec, dest) {
			if (!dest) {
				dest = vec;
			}

			var x = vec[0], y = vec[1], z = vec[2],
				len = Math.sqrt(x * x + y * y + z * z);

			if (!len) {
				dest[0] = 0;
				dest[1] = 0;
				dest[2] = 0;
				return dest;
			} else if (len === 1) {
				dest[0] = x;
				dest[1] = y;
				dest[2] = z;
				return dest;
			}

			len = 1 / len;
			dest[0] = x * len;
			dest[1] = y * len;
			dest[2] = z * len;
			return dest;
		};

		/**
		 * Generates the cross product of two vec3s
		 *
		 * @param {Float32Array} vec First operand
		 * @param {Float32Array} vec2 Second operand
		 * @param {Float32Array} [dest] vec3 receiving operation result. If not specified result is written to vec
		 *
		 * @returns {Float32Array} dest if specified, vec otherwise
		 */
		vec3.cross = function (vec, vec2, dest) {
			if (!dest) {
				dest = vec;
			}

			var x = vec[0], y = vec[1], z = vec[2],
				x2 = vec2[0], y2 = vec2[1], z2 = vec2[2];

			dest[0] = y * z2 - z * y2;
			dest[1] = z * x2 - x * z2;
			dest[2] = x * y2 - y * x2;
			return dest;
		};

		/**
		 * Caclulates the length of a vec3
		 *
		 * @param {Float32Array} vec vec3 to calculate length of
		 *
		 * @returns {number} Length of vec
		 */
		vec3.length = function (vec) {
			var x = vec[0], y = vec[1], z = vec[2];
			return Math.sqrt(x * x + y * y + z * z);
		};

		/**
		 * Caclulates the squared length of a vec3
		 *
		 * @param {Float32Array} vec vec3 to calculate squared length of
		 *
		 * @returns {number} Squared Length of vec
		 */
		vec3.squaredLength = function (vec) {
			var x = vec[0], y = vec[1], z = vec[2];
			return x * x + y * y + z * z;
		};

		/**
		 * Caclulates the dot product of two vec3s
		 *
		 * @param {Float32Array} vec First operand
		 * @param {Float32Array} vec2 Second operand
		 *
		 * @returns {number} Dot product of vec and vec2
		 */
		vec3.dot = function (vec, vec2) {
			return vec[0] * vec2[0] + vec[1] * vec2[1] + vec[2] * vec2[2];
		};

		/**
		 * Generates a unit vector pointing from one vector to another
		 *
		 * @param {Float32Array} vec Origin vec3
		 * @param {Float32Array} vec2 vec3 to point to
		 * @param {Float32Array} [dest] vec3 receiving operation result. If not specified result is written to vec
		 *
		 * @returns {Float32Array} dest if specified, vec otherwise
		 */
		vec3.direction = function (vec, vec2, dest) {
			if (!dest) {
				dest = vec;
			}

			var x = vec[0] - vec2[0],
				y = vec[1] - vec2[1],
				z = vec[2] - vec2[2],
				len = Math.sqrt(x * x + y * y + z * z);

			if (!len) {
				dest[0] = 0;
				dest[1] = 0;
				dest[2] = 0;
				return dest;
			}

			len = 1 / len;
			dest[0] = x * len;
			dest[1] = y * len;
			dest[2] = z * len;
			return dest;
		};

		/**
		 * Performs a linear interpolation between two vec3
		 *
		 * @param {Float32Array} vec3_a First vector
		 * @param {Float32Array} vec3_b Second vector
		 * @param {Number} lerp Interpolation amount between the two inputs
		 * @param {Float32Array} [dest] vec3 receiving operation result. If not specified result is written to vec
		 *
		 * @returns {Float32Array} dest if specified, vec otherwise
		 */
		vec3.lerp = function (vec, vec2, lerp, dest) {
			if (!dest) {
				dest = vec;
			}

			dest[0] = vec[0] + lerp * (vec2[0] - vec[0]);
			dest[1] = vec[1] + lerp * (vec2[1] - vec[1]);
			dest[2] = vec[2] + lerp * (vec2[2] - vec[2]);

			return dest;
		};

		/**
		 * Calculates the euclidian distance between two vec3
		 *
		 * Params:
		 * @param {Float32Array} vec First vector
		 * @param {Float32Array} vec2 Second vector
		 *
		 * @returns {number} Distance between vec and vec2
		 */
		vec3.dist = function (vec, vec2) {
			var x = vec2[0] - vec[0],
				y = vec2[1] - vec[1],
				z = vec2[2] - vec[2];

			return Math.sqrt(x * x + y * y + z * z);
		};

		// Pre-allocated to prevent unecessary garbage collection
		var unprojectMat = null;
		var unprojectVec = createFloatArray(4);
		/**
		 * Projects the specified vec3 from screen space into object space
		 * Based on the [Mesa gluUnProject implementation](http://webcvs.freedesktop.org/mesa/Mesa/src/glu/mesa/project.c?revision=1.4&view=markup)
		 *
		 * @param {Float32Array} vec Screen-space vector to project
		 * @param {Float32Array} view mat4 View matrix
		 * @param {Float32Array} proj mat4 Projection matrix
		 * @param {Float32Array} viewport vec4 Viewport as given to gl.viewport [x, y, width, height]
		 * @param {Float32Array} [dest] vec3 receiving unprojected result. If not specified result is written to vec
		 *
		 * @returns {Float32Array} dest if specified, vec otherwise
		 */
		vec3.unproject = function (vec, view, proj, viewport, dest) {
			if (!dest) {
				dest = vec;
			}

			if (!unprojectMat) {
				unprojectMat = mat4.create();
			}

			var m = unprojectMat;
			var v = unprojectVec;

			v[0] = (vec[0] - viewport[0]) * 2.0 / viewport[2] - 1.0;
			v[1] = (vec[1] - viewport[1]) * 2.0 / viewport[3] - 1.0;
			v[2] = 2.0 * vec[2] - 1.0;
			v[3] = 1.0;

			mat4.multiply(proj, view, m);
			if (!mat4.inverse(m)) {
				return null;
			}

			mat4.multiplyVec4(m, v);
			if (v[3] === 0.0) {
				return null;
			}

			dest[0] = v[0] / v[3];
			dest[1] = v[1] / v[3];
			dest[2] = v[2] / v[3];

			return dest;
		};

		var xUnitVec3 = vec3.createFrom(1, 0, 0);
		var yUnitVec3 = vec3.createFrom(0, 1, 0);
		var zUnitVec3 = vec3.createFrom(0, 0, 1);

		var tmpvec3 = vec3.create();

		/**
		 * Generates a quaternion of rotation between two given normalized 3d-vectors
		 *
		 * @param {Float32Array} a Normalized source 3d-vector
		 * @param {Float32Array} b Normalized target 3d-vector
		 * @param {Float32Array} [dest] quat4 receiving operation result.
		 *
		 * @returns {Float32Array} dest if specified, a new quat4 otherwise
		 */
		vec3.rotationTo = function (a, b, dest) {
			if (!dest) {
				dest = quat4.create();
			}

			var d = vec3.dot(a, b);
			var axis = tmpvec3;
			if (d >= 1.0) {
				quat4.set(quat4.identity, dest);
			} else if (d < (0.000001 - 1.0)) {
				vec3.cross(xUnitVec3, a, axis);
				if (vec3.length(axis) < 0.000001)
					vec3.cross(yUnitVec3, a, axis);
				if (vec3.length(axis) < 0.000001)
					vec3.cross(zUnitVec3, a, axis);
				vec3.normalize(axis);
				quat4.fromAngleAxis(Math.PI, axis, dest);
			} else {
				var s = Math.sqrt((1.0 + d) * 2.0);
				var sInv = 1.0 / s;
				vec3.cross(a, b, axis);
				dest[0] = axis[0] * sInv;
				dest[1] = axis[1] * sInv;
				dest[2] = axis[2] * sInv;
				dest[3] = s * 0.5;
				quat4.normalize(dest);
			}
			if (dest[3] > 1.0) dest[3] = 1.0;
			else if (dest[3] < -1.0) dest[3] = -1.0;
			return dest;
		};

		/**
		 * Returns a string representation of a 3d-vector
		 *
		 * @param {Float32Array} vec3 3d-vector to represent as a string
		 *
		 * @returns {string} String representation of 3d-vector
		 */
		vec3.str = function (vec) {
			return '[' + vec[0] + ', ' + vec[1] + ', ' + vec[2] + ']';
		};

		return vec3
	}
)

/*
 * This class is derived from glmatrix 1.3.7. Original Licence follows:
 *
 * Copyright (c) 2012 Brandon Jones, Colin MacKenzie IV
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 * 1. The origin of this software must not be misrepresented; you must not
 * claim that you wrote the original software. If you use this software
 * in a product, an acknowledgment in the product documentation would be
 * appreciated but is not required.
 *
 * 2. Altered source versions must be plainly marked as such, and must not
 * be misrepresented as being the original software.
 *
 * 3. This notice may not be removed or altered from any source
 * distribution.
 */
/**
 * **This class implements high performance quaternion math.**
 *
 * Please note: This object does not hold the quaternion components itself, it defines helper functions which manipulate
 * highly optimized data structures. This is done for performance reasons. **You need to allocate new quaternions
 * with the {@link #create} or {@link #createFrom} function. Don't try to allocate new quaternions yourself, always use
 * these function to do so.**
 *
 *
 * *This class is derived from [glMatrix](https://github.com/toji/gl-matrix) 1.3.7 originally written by Brandon Jones
 * and Colin MacKenzie IV. The original BSD licence is included in the source file of this class.*
 *
 * @class spell.math.quat4
 * @singleton
 * @requires Math
 * @requires spell.shared.util.platform.Types
 * @requires spell.math.mat3
 * @requires spell.math.mat4
 * @requires spell.math.util
 */
define(
	"spell/math/quat4",
	[
		"spell/shared/util/platform/Types",
		"spell/math/mat3",
		"spell/math/mat4",
		"spell/math/util"
	],
	function(Types, mat3, mat4, mathUtil) {

		"use strict";
		var createFloatArray = Types.createFloatArray;


		// Tweak to your liking
		var FLOAT_EPSILON = 0.000001;

		var quat4 = {};

		/**
		 * Creates a new instance of a quat4 using the default array type
		 * Any javascript array containing at least 4 numeric elements can serve as a quat4
		 *
		 * @param {Float32Array} [quat] Quaternion containing values to initialize with
		 *
		 * @returns {Float32Array} New quaternion
		 */
		quat4.create = function (quat) {
			var dest = createFloatArray(4);

			if (quat) {
				dest[0] = quat[0];
				dest[1] = quat[1];
				dest[2] = quat[2];
				dest[3] = quat[3];
			} else {
				dest[0] = dest[1] = dest[2] = dest[3] = 0;
			}

			return dest;
		};

		/**
		 * Creates a new instance of a quaternion, initializing it with the given arguments
		 *
		 * @param {Number} x X value
		 * @param {Number} y Y value
		 * @param {Number} z Z value
		 * @param {Number} w W value

		 * @returns {Float32Array} New quaternion
		 */
		quat4.createFrom = function (x, y, z, w) {
			var dest = createFloatArray(4);

			dest[0] = x;
			dest[1] = y;
			dest[2] = z;
			dest[3] = w;

			return dest;
		};

		/**
		 * Copies the values of one quaternion to another
		 *
		 * @param {Float32Array} quat quaternion containing values to copy
		 * @param {Float32Array} dest quaternion receiving copied values
		 *
		 * @returns {Float32Array} dest
		 */
		quat4.set = function (quat, dest) {
			dest[0] = quat[0];
			dest[1] = quat[1];
			dest[2] = quat[2];
			dest[3] = quat[3];

			return dest;
		};

		/**
		 * Compares two quaternions for equality within a certain margin of error
		 *
		 * @param {Float32Array} a First quaternion
		 * @param {Float32Array} b Second quaternion
		 *
		 * @returns {Boolean} True if a is equivalent to b
		 */
		quat4.equal = function (a, b) {
			return a === b || (
				Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
					Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
					Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
					Math.abs(a[3] - b[3]) < FLOAT_EPSILON
				);
		};

		/**
		 * Creates a new identity quaternion
		 *
		 * @param {Float32Array} [dest] quaternion receiving copied values
		 *
		 * @returns {Float32Array} dest is specified, new quaternion otherwise
		 */
		quat4.identity = function (dest) {
			if (!dest) {
				dest = quat4.create();
			}
			dest[0] = 0;
			dest[1] = 0;
			dest[2] = 0;
			dest[3] = 1;
			return dest;
		};

		var identityQuat4 = quat4.identity();

		/**
		 * Calculates the W component of a quaternion from the X, Y, and Z components.
		 * Assumes that quaternion is 1 unit in length.
		 * Any existing W component will be ignored.
		 *
		 * @param {Float32Array} quat quaternion to calculate W component of
		 * @param {Float32Array} [dest] quaternion receiving calculated values. If not specified result is written to quat
		 *
		 * @returns {Float32Array} dest if specified, quat otherwise
		 */
		quat4.calculateW = function (quat, dest) {
			var x = quat[0], y = quat[1], z = quat[2];

			if (!dest || quat === dest) {
				quat[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
				return quat;
			}
			dest[0] = x;
			dest[1] = y;
			dest[2] = z;
			dest[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
			return dest;
		};

		/**
		 * Calculates the dot product of two quaternions
		 *
		 * @param {Float32Array} quat First operand quaternion
		 * @param {Float32Array} quat2 Second operand quaternion
		 *
		 * @return {Number} Dot product of quat and quat2
		 */
		quat4.dot = function (quat, quat2) {
			return quat[0] * quat2[0] + quat[1] * quat2[1] + quat[2] * quat2[2] + quat[3] * quat2[3];
		};

		/**
		 * Calculates the inverse of a quaternion
		 *
		 * @param {Float32Array} quat quaternion to calculate inverse of
		 * @param {Float32Array} [dest] quaternion receiving inverse values. If not specified result is written to quat
		 *
		 * @returns {Float32Array} dest if specified, quat otherwise
		 */
		quat4.inverse = function (quat, dest) {
			var q0 = quat[0], q1 = quat[1], q2 = quat[2], q3 = quat[3],
				dot = q0 * q0 + q1 * q1 + q2 * q2 + q3 * q3,
				invDot = dot ? 1.0 / dot : 0;

			// TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

			if (!dest || quat === dest) {
				quat[0] *= -invDot;
				quat[1] *= -invDot;
				quat[2] *= -invDot;
				quat[3] *= invDot;
				return quat;
			}
			dest[0] = -quat[0] * invDot;
			dest[1] = -quat[1] * invDot;
			dest[2] = -quat[2] * invDot;
			dest[3] = quat[3] * invDot;
			return dest;
		};


		/**
		 * Calculates the conjugate of a quaternion
		 * If the quaternion is normalized, this function is faster than quat4.inverse and produces the same result.
		 *
		 * @param {Float32Array} quat quaternion to calculate conjugate of
		 * @param {Float32Array} [dest] quaternion receiving conjugate values. If not specified result is written to quat
		 *
		 * @returns {Float32Array} dest if specified, quat otherwise
		 */
		quat4.conjugate = function (quat, dest) {
			if (!dest || quat === dest) {
				quat[0] *= -1;
				quat[1] *= -1;
				quat[2] *= -1;
				return quat;
			}
			dest[0] = -quat[0];
			dest[1] = -quat[1];
			dest[2] = -quat[2];
			dest[3] = quat[3];
			return dest;
		};

		/**
		 * Calculates the length of a quaternion
		 *
		 * Params:
		 * @param {Float32Array} quat Quaternion to calculate length of
		 *
		 * @returns {Number} Length of quat
		 */
		quat4.length = function (quat) {
			var x = quat[0], y = quat[1], z = quat[2], w = quat[3];
			return Math.sqrt(x * x + y * y + z * z + w * w);
		};

		/**
		 * Generates a unit quaternion of the same direction as the provided quat4
		 * If quaternion length is 0, returns [0, 0, 0, 0]
		 *
		 * @param {Float32Array} quat Quaternion to normalize
		 * @param {Float32Array} [dest] Quaternion receiving operation result. If not specified result is written to quat
		 *
		 * @returns {Float32Array} dest if specified, quat otherwise
		 */
		quat4.normalize = function (quat, dest) {
			if (!dest) {
				dest = quat;
			}

			var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
				len = Math.sqrt(x * x + y * y + z * z + w * w);
			if (len === 0) {
				dest[0] = 0;
				dest[1] = 0;
				dest[2] = 0;
				dest[3] = 0;
				return dest;
			}
			len = 1 / len;
			dest[0] = x * len;
			dest[1] = y * len;
			dest[2] = z * len;
			dest[3] = w * len;

			return dest;
		};

		/**
		 * Performs quaternion addition
		 *
		 * @param {Float32Array} quat First operand quaternion
		 * @param {Float32Array} quat2 Second operand quaternion
		 * @param {Float32Array} [dest] Quaternion receiving operation result. If not specified result is written to quat
		 *
		 * @returns {Float32Array} dest if specified, quat otherwise
		 */
		quat4.add = function (quat, quat2, dest) {
			if (!dest || quat === dest) {
				quat[0] += quat2[0];
				quat[1] += quat2[1];
				quat[2] += quat2[2];
				quat[3] += quat2[3];
				return quat;
			}
			dest[0] = quat[0] + quat2[0];
			dest[1] = quat[1] + quat2[1];
			dest[2] = quat[2] + quat2[2];
			dest[3] = quat[3] + quat2[3];
			return dest;
		};

		/**
		 * Performs a quaternion multiplication
		 *
		 * @param {Float32Array} quat First operand quaternion
		 * @param {Float32Array} quat2 Second operand quaternion
		 * @param {Float32Array} [dest] Quaternion receiving operation result. If not specified result is written to quat
		 *
		 * @returns {Float32Array} dest if specified, quat otherwise
		 */
		quat4.multiply = function (quat, quat2, dest) {
			if (!dest) {
				dest = quat;
			}

			var qax = quat[0], qay = quat[1], qaz = quat[2], qaw = quat[3],
				qbx = quat2[0], qby = quat2[1], qbz = quat2[2], qbw = quat2[3];

			dest[0] = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
			dest[1] = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
			dest[2] = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
			dest[3] = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

			return dest;
		};

		/**
		 * Transforms a 3d-vector with the given quaternion
		 *
		 * @param {Float32Array} quat quaternion to transform the vector with
		 * @param {Float32Array} vec 3d-vector to transform
		 * @param {Float32Array} [dest] 3d-vector receiving operation result. If not specified result is written to vec
		 *
		 * @returns dest if specified, vec otherwise
		 */
		quat4.multiplyVec3 = function (quat, vec, dest) {
			if (!dest) {
				dest = vec;
			}

			var x = vec[0], y = vec[1], z = vec[2],
				qx = quat[0], qy = quat[1], qz = quat[2], qw = quat[3],

			// calculate quat * vec
				ix = qw * x + qy * z - qz * y,
				iy = qw * y + qz * x - qx * z,
				iz = qw * z + qx * y - qy * x,
				iw = -qx * x - qy * y - qz * z;

			// calculate result * inverse quat
			dest[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
			dest[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
			dest[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;

			return dest;
		};

		/**
		 * Multiplies the components of a quaternion by a scalar value
		 *
		 * @param {Float32Array} quat quaternion to scale
		 * @param {Number} val Value to scale by
		 * @param {Float32Array} [dest] quaternion receiving operation result. If not specified result is written to quat
		 *
		 * @returns {Float32Array} dest if specified, quat otherwise
		 */
		quat4.scale = function (quat, val, dest) {
			if (!dest || quat === dest) {
				quat[0] *= val;
				quat[1] *= val;
				quat[2] *= val;
				quat[3] *= val;
				return quat;
			}
			dest[0] = quat[0] * val;
			dest[1] = quat[1] * val;
			dest[2] = quat[2] * val;
			dest[3] = quat[3] * val;
			return dest;
		};

		/**
		 * Calculates a 3x3 matrix from the given quaternion
		 *
		 * @param {Float32Array} quat quaternion to create matrix from
		 * @param {Float32Array} [dest] 3x3-matrix receiving operation result
		 *
		 * @returns {Float32Array} dest if specified, a new 3x3-matrix otherwise
		 */
		quat4.toMat3 = function (quat, dest) {
			if (!dest) {
				dest = mat3.create();
			}

			var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
				x2 = x + x,
				y2 = y + y,
				z2 = z + z,

				xx = x * x2,
				xy = x * y2,
				xz = x * z2,
				yy = y * y2,
				yz = y * z2,
				zz = z * z2,
				wx = w * x2,
				wy = w * y2,
				wz = w * z2;

			dest[0] = 1 - (yy + zz);
			dest[1] = xy + wz;
			dest[2] = xz - wy;

			dest[3] = xy - wz;
			dest[4] = 1 - (xx + zz);
			dest[5] = yz + wx;

			dest[6] = xz + wy;
			dest[7] = yz - wx;
			dest[8] = 1 - (xx + yy);

			return dest;
		};

		/**
		 * Calculates a 4x4 matrix from the given quaternion
		 *
		 * @param {Float32Array} quat quaternion to create matrix from
		 * @param {Float32Array} [dest] 4x4-matrix receiving operation result
		 *
		 * @returns {Float32Array} dest if specified, a new 4x4-matrix otherwise
		 */
		quat4.toMat4 = function (quat, dest) {
			if (!dest) {
				dest = mat4.create();
			}

			var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
				x2 = x + x,
				y2 = y + y,
				z2 = z + z,

				xx = x * x2,
				xy = x * y2,
				xz = x * z2,
				yy = y * y2,
				yz = y * z2,
				zz = z * z2,
				wx = w * x2,
				wy = w * y2,
				wz = w * z2;

			dest[0] = 1 - (yy + zz);
			dest[1] = xy + wz;
			dest[2] = xz - wy;
			dest[3] = 0;

			dest[4] = xy - wz;
			dest[5] = 1 - (xx + zz);
			dest[6] = yz + wx;
			dest[7] = 0;

			dest[8] = xz + wy;
			dest[9] = yz - wx;
			dest[10] = 1 - (xx + yy);
			dest[11] = 0;

			dest[12] = 0;
			dest[13] = 0;
			dest[14] = 0;
			dest[15] = 1;

			return dest;
		};

		/**
		 * Performs a spherical linear interpolation between two quarternion
		 *
		 * @param {Float32Array} quat First quaternion
		 * @param {Float32Array} quat2 Second quaternion
		 * @param {number} slerp Interpolation amount between the two inputs
		 * @param {Float32Array} [dest] quaternion receiving operation result. If not specified result is written to quat
		 *
		 * @returns {Float32Array} dest if specified, quat otherwise
		 */
		quat4.slerp = function (quat, quat2, slerp, dest) {
			if (!dest) {
				dest = quat;
			}

			var cosHalfTheta = quat[0] * quat2[0] + quat[1] * quat2[1] + quat[2] * quat2[2] + quat[3] * quat2[3],
				halfTheta,
				sinHalfTheta,
				ratioA,
				ratioB;

			if (Math.abs(cosHalfTheta) >= 1.0) {
				if (dest !== quat) {
					dest[0] = quat[0];
					dest[1] = quat[1];
					dest[2] = quat[2];
					dest[3] = quat[3];
				}
				return dest;
			}

			halfTheta = Math.acos(cosHalfTheta);
			sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

			if (Math.abs(sinHalfTheta) < 0.001) {
				dest[0] = (quat[0] * 0.5 + quat2[0] * 0.5);
				dest[1] = (quat[1] * 0.5 + quat2[1] * 0.5);
				dest[2] = (quat[2] * 0.5 + quat2[2] * 0.5);
				dest[3] = (quat[3] * 0.5 + quat2[3] * 0.5);
				return dest;
			}

			ratioA = Math.sin((1 - slerp) * halfTheta) / sinHalfTheta;
			ratioB = Math.sin(slerp * halfTheta) / sinHalfTheta;

			dest[0] = (quat[0] * ratioA + quat2[0] * ratioB);
			dest[1] = (quat[1] * ratioA + quat2[1] * ratioB);
			dest[2] = (quat[2] * ratioA + quat2[2] * ratioB);
			dest[3] = (quat[3] * ratioA + quat2[3] * ratioB);

			return dest;
		};

		/**
		 * Creates a quaternion from the given 3x3 rotation matrix.
		 * If dest is omitted, a new quaternion will be created.
		 *
		 * @param {Float32Array} mat the 3x3 rotation matrix
		 * @param {Float32Array} [dest] an optional receiving quaternion
		 *
		 * @returns {Float32Array} the quaternion constructed from the rotation matrix
		 *
		 */
		quat4.fromRotationMatrix = function (mat, dest) {
			if (!dest) dest = quat4.create();

			// Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
			// article "Quaternion Calculus and Fast Animation".

			var fTrace = mat[0] + mat[4] + mat[8];
			var fRoot;

			if (fTrace > 0.0) {
				// |w| > 1/2, may as well choose w > 1/2
				fRoot = Math.sqrt(fTrace + 1.0); // 2w
				dest[3] = 0.5 * fRoot;
				fRoot = 0.5 / fRoot; // 1/(4w)
				dest[0] = (mat[7] - mat[5]) * fRoot;
				dest[1] = (mat[2] - mat[6]) * fRoot;
				dest[2] = (mat[3] - mat[1]) * fRoot;
			} else {
				// |w| <= 1/2
				var s_iNext = quat4.fromRotationMatrix.s_iNext = quat4.fromRotationMatrix.s_iNext || [1, 2, 0];
				var i = 0;
				if (mat[4] > mat[0])
					i = 1;
				if (mat[8] > mat[i * 3 + i])
					i = 2;
				var j = s_iNext[i];
				var k = s_iNext[j];

				fRoot = Math.sqrt(mat[i * 3 + i] - mat[j * 3 + j] - mat[k * 3 + k] + 1.0);
				dest[i] = 0.5 * fRoot;
				fRoot = 0.5 / fRoot;
				dest[3] = (mat[k * 3 + j] - mat[j * 3 + k]) * fRoot;
				dest[j] = (mat[j * 3 + i] + mat[i * 3 + j]) * fRoot;
				dest[k] = (mat[k * 3 + i] + mat[i * 3 + k]) * fRoot;
			}

			return dest;
		};


		(function () {
			var mat = mat3.create();

			/**
			 * Creates a quaternion from the 3 given vectors. They must be perpendicular
			 * to one another and represent the X, Y and Z axes.
			 *
			 * If dest is omitted, a new quat4 will be created.
			 *
			 * Example: The default OpenGL orientation has a view vector [0, 0, -1],
			 * right vector [1, 0, 0], and up vector [0, 1, 0]. A quaternion representing
			 * this orientation could be constructed with:
			 *
			 * quat = quat4.fromAxes([0, 0, -1], [1, 0, 0], [0, 1, 0], quat4.create());
			 *
			 * @param {Float32Array} view the view 3d-vector, or direction the object is pointing in
			 * @param {Float32Array} right the right 3d-vector, or direction to the "right" of the object
			 * @param {Float32Array} up the up 3d-vector, or direction towards the object's "up"
			 * @param {Float32Array} [dest] an optional receiving quaternion
			 *
			 * @returns {Float32Array} dest quaternion
			 **/
			quat4.fromAxes = function (view, right, up, dest) {
				mat[0] = right[0];
				mat[3] = right[1];
				mat[6] = right[2];

				mat[1] = up[0];
				mat[4] = up[1];
				mat[7] = up[2];

				mat[2] = view[0];
				mat[5] = view[1];
				mat[8] = view[2];

				return quat4.fromRotationMatrix(mat, dest);
			};
		})();

		/**
		 * Sets a quaternion from the given angle and rotation axis,
		 * then returns it. If dest is not given, a new quaternion is created.
		 *
		 * @param {Number} angle the angle in radians
		 * @param {Float32Array} axis 3d-vector describing the axis around which to rotate
		 * @param {Float32Array} [dest] the optional quaternion to store the result
		 *
		 * @returns {Float32Array} dest
		 **/
		quat4.fromAngleAxis = function (angle, axis, dest) {
			// The quaternion representing the rotation is
			// q = cos(A/2)+sin(A/2)*(x*i+y*j+z*k)
			if (!dest) dest = quat4.create();

			var half = angle * 0.5;
			var s = Math.sin(half);
			dest[3] = Math.cos(half);
			dest[0] = s * axis[0];
			dest[1] = s * axis[1];
			dest[2] = s * axis[2];

			return dest;
		};

		/**
		 * Stores the angle and axis in a 4d-vector, where the XYZ components represent
		 * the axis and the W (4th) component is the angle in radians.
		 *
		 * If dest is not given, src will be modified in place and returned, after
		 * which it should not be considered not a quaternion (just an axis and angle).
		 *
		 * @param {Float32Array} quat the quaternion whose angle and axis to store
		 * @param {Float32Array} [dest] the optional 4d-vector to receive the data
		 *
		 * @returns {Float32Array} dest 4d-vector containing the result
		 */
		quat4.toAngleAxis = function (src, dest) {
			if (!dest) dest = src;
			// The quaternion representing the rotation is
			// q = cos(A/2)+sin(A/2)*(x*i+y*j+z*k)

			var sqrlen = src[0] * src[0] + src[1] * src[1] + src[2] * src[2];
			if (sqrlen > 0) {
				dest[3] = 2 * Math.acos(src[3]);
				var invlen = mathUtil.invsqrt(sqrlen);
				dest[0] = src[0] * invlen;
				dest[1] = src[1] * invlen;
				dest[2] = src[2] * invlen;
			} else {
				// angle is 0 (mod 2*pi), so any axis will do
				dest[3] = 0;
				dest[0] = 1;
				dest[1] = 0;
				dest[2] = 0;
			}

			return dest;
		};

		/**
		 * Returns a string representation of a quaternion
		 *
		 * @param {Float32Array} quat quaternion to represent as a string
		 *
		 * @returns {String} String representation of quaternion
		 */
		quat4.str = function (quat) {
			return '[' + quat[0] + ', ' + quat[1] + ', ' + quat[2] + ', ' + quat[3] + ']';
		};

		return quat4;
	}
)

/*
 * This class is derived from glmatrix 1.3.7. Original Licence follows:
 *
 * Copyright (c) 2012 Brandon Jones, Colin MacKenzie IV
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 * 1. The origin of this software must not be misrepresented; you must not
 * claim that you wrote the original software. If you use this software
 * in a product, an acknowledgment in the product documentation would be
 * appreciated but is not required.
 *
 * 2. Altered source versions must be plainly marked as such, and must not
 * be misrepresented as being the original software.
 *
 * 3. This notice may not be removed or altered from any source
 * distribution.
 */

/**
 * **This class implements high performance 4x4 Matrix math.**
 *
 * Please note: This object does not hold the matrix components itself, it defines helper functions which manipulate
 * highly optimized data structures. This is done for performance reasons. **You need to allocate new matrices
 * with the {@link #create} or {@link #createFrom} function. Don't try to allocate new matrices yourself, always use
 * these function to do so.**
 *
 *
 * *This class is derived from [glMatrix](https://github.com/toji/gl-matrix) 1.3.7 originally written by Brandon Jones
 * and Colin MacKenzie IV. The original BSD licence is included in the source file of this class.*
 *
 * @class spell.math.mat4
 * @singleton
 * @requires Math
 * @requires spell.shared.util.platform.Types
 * @requires spell.math.mat3
 */
define(
	"spell/math/mat4",
	["spell/shared/util/platform/Types", "spell/math/mat3"],
	function (Types, mat3) {

		"use strict";
		var createFloatArray = Types.createFloatArray;

		// Tweak to your liking
		var FLOAT_EPSILON = 0.000001;

		var mat4 = {};

		/**
		 * Creates a new instance of a 4x4-matrix using the default array type
		 * Any javascript array-like object containing at least 16 numeric elements can serve as a 4x4-matrix
		 *
		 * @param {Float32Array} [mat] 4x4-matrix containing values to initialize with
		 *
		 * @returns {Float32Array} New 4x4-matrix
		 */
		mat4.create = function (mat) {
			var dest = createFloatArray(16);

			if (mat) {
				dest[0] = mat[0];
				dest[1] = mat[1];
				dest[2] = mat[2];
				dest[3] = mat[3];
				dest[4] = mat[4];
				dest[5] = mat[5];
				dest[6] = mat[6];
				dest[7] = mat[7];
				dest[8] = mat[8];
				dest[9] = mat[9];
				dest[10] = mat[10];
				dest[11] = mat[11];
				dest[12] = mat[12];
				dest[13] = mat[13];
				dest[14] = mat[14];
				dest[15] = mat[15];
			}

			return dest;
		};

		/**
		 * Creates a new instance of a 4x4-matrix, initializing it with the given arguments
		 *
		 * @param {Number} m00
		 * @param {Number} m01
		 * @param {Number} m02
		 * @param {Number} m03
		 * @param {Number} m10
		 * @param {Number} m11
		 * @param {Number} m12
		 * @param {Number} m13
		 * @param {Number} m20
		 * @param {Number} m21
		 * @param {Number} m22
		 * @param {Number} m23
		 * @param {Number} m30
		 * @param {Number} m31
		 * @param {Number} m32
		 * @param {Number} m33

		 * @returns {Float32Array} New 4x4-matrix
		 */
		mat4.createFrom = function (m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
			var dest = createFloatArray(16);

			dest[0] = m00;
			dest[1] = m01;
			dest[2] = m02;
			dest[3] = m03;
			dest[4] = m10;
			dest[5] = m11;
			dest[6] = m12;
			dest[7] = m13;
			dest[8] = m20;
			dest[9] = m21;
			dest[10] = m22;
			dest[11] = m23;
			dest[12] = m30;
			dest[13] = m31;
			dest[14] = m32;
			dest[15] = m33;

			return dest;
		};

		/**
		 * Copies the values of one 4x4-matrix to another
		 *
		 * @param {Float32Array} mat 4x4-matrix containing values to copy
		 * @param {Float32Array} dest 4x4-matrix receiving copied values
		 *
		 * @returns {Float32Array} dest 4x4-matrix
		 */
		mat4.set = function (mat, dest) {
			dest[0] = mat[0];
			dest[1] = mat[1];
			dest[2] = mat[2];
			dest[3] = mat[3];
			dest[4] = mat[4];
			dest[5] = mat[5];
			dest[6] = mat[6];
			dest[7] = mat[7];
			dest[8] = mat[8];
			dest[9] = mat[9];
			dest[10] = mat[10];
			dest[11] = mat[11];
			dest[12] = mat[12];
			dest[13] = mat[13];
			dest[14] = mat[14];
			dest[15] = mat[15];
			return dest;
		};

		/**
		 * Compares two matrices for equality within a certain margin of error
		 *
		 * @param {Float32Array} a First 4x4-matrix
		 * @param {Float32Array} b Second 4x4-matrix
		 *
		 * @returns {Boolean} True if a is equivalent to b
		 */
		mat4.equal = function (a, b) {
			return a === b || (
				Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
					Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
					Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
					Math.abs(a[3] - b[3]) < FLOAT_EPSILON &&
					Math.abs(a[4] - b[4]) < FLOAT_EPSILON &&
					Math.abs(a[5] - b[5]) < FLOAT_EPSILON &&
					Math.abs(a[6] - b[6]) < FLOAT_EPSILON &&
					Math.abs(a[7] - b[7]) < FLOAT_EPSILON &&
					Math.abs(a[8] - b[8]) < FLOAT_EPSILON &&
					Math.abs(a[9] - b[9]) < FLOAT_EPSILON &&
					Math.abs(a[10] - b[10]) < FLOAT_EPSILON &&
					Math.abs(a[11] - b[11]) < FLOAT_EPSILON &&
					Math.abs(a[12] - b[12]) < FLOAT_EPSILON &&
					Math.abs(a[13] - b[13]) < FLOAT_EPSILON &&
					Math.abs(a[14] - b[14]) < FLOAT_EPSILON &&
					Math.abs(a[15] - b[15]) < FLOAT_EPSILON
				);
		};

		/**
		 * Sets a 4x4-matrix to an identity matrix
		 *
		 * @param {Float32Array} dest 4x4-matrix to set
		 *
		 * @returns {Float32Array} dest 4x4-matrix
		 */
		mat4.identity = function (dest) {
			if (!dest) {
				dest = mat4.create();
			}
			dest[0] = 1;
			dest[1] = 0;
			dest[2] = 0;
			dest[3] = 0;
			dest[4] = 0;
			dest[5] = 1;
			dest[6] = 0;
			dest[7] = 0;
			dest[8] = 0;
			dest[9] = 0;
			dest[10] = 1;
			dest[11] = 0;
			dest[12] = 0;
			dest[13] = 0;
			dest[14] = 0;
			dest[15] = 1;
			return dest;
		};

		/**
		 * Transposes a 4x4-matrix (flips the values over the diagonal)
		 *
		 * @param {Float32Array} mat 4x4-matrix to transpose
		 * @param {Float32Array} [dest] 4x4-matrix receiving transposed values. If not specified result is written to mat
		 *
		 * @returns {Float32Array} dest is specified, mat otherwise
		 */
		mat4.transpose = function (mat, dest) {
			// If we are transposing ourselves we can skip a few steps but have to cache some values
			if (!dest || mat === dest) {
				var a01 = mat[1], a02 = mat[2], a03 = mat[3],
					a12 = mat[6], a13 = mat[7],
					a23 = mat[11];

				mat[1] = mat[4];
				mat[2] = mat[8];
				mat[3] = mat[12];
				mat[4] = a01;
				mat[6] = mat[9];
				mat[7] = mat[13];
				mat[8] = a02;
				mat[9] = a12;
				mat[11] = mat[14];
				mat[12] = a03;
				mat[13] = a13;
				mat[14] = a23;
				return mat;
			}

			dest[0] = mat[0];
			dest[1] = mat[4];
			dest[2] = mat[8];
			dest[3] = mat[12];
			dest[4] = mat[1];
			dest[5] = mat[5];
			dest[6] = mat[9];
			dest[7] = mat[13];
			dest[8] = mat[2];
			dest[9] = mat[6];
			dest[10] = mat[10];
			dest[11] = mat[14];
			dest[12] = mat[3];
			dest[13] = mat[7];
			dest[14] = mat[11];
			dest[15] = mat[15];
			return dest;
		};

		/**
		 * Calculates the determinant of a 4x4-matrix
		 *
		 * @param {Float32Array} mat 4x4-matrix to calculate determinant of
		 *
		 * @returns {Float32Array} determinant of mat
		 */
		mat4.determinant = function (mat) {
			// Cache the matrix values (makes for huge speed increases!)
			var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
				a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
				a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
				a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];

			return (a30 * a21 * a12 * a03 - a20 * a31 * a12 * a03 - a30 * a11 * a22 * a03 + a10 * a31 * a22 * a03 +
				a20 * a11 * a32 * a03 - a10 * a21 * a32 * a03 - a30 * a21 * a02 * a13 + a20 * a31 * a02 * a13 +
				a30 * a01 * a22 * a13 - a00 * a31 * a22 * a13 - a20 * a01 * a32 * a13 + a00 * a21 * a32 * a13 +
				a30 * a11 * a02 * a23 - a10 * a31 * a02 * a23 - a30 * a01 * a12 * a23 + a00 * a31 * a12 * a23 +
				a10 * a01 * a32 * a23 - a00 * a11 * a32 * a23 - a20 * a11 * a02 * a33 + a10 * a21 * a02 * a33 +
				a20 * a01 * a12 * a33 - a00 * a21 * a12 * a33 - a10 * a01 * a22 * a33 + a00 * a11 * a22 * a33);
		};

		/**
		 * Calculates the inverse matrix of a 4x4-matrix
		 *
		 * @param {Float32Array} mat 4x4-matrix to calculate inverse of
		 * @param {Float32Array} [dest] 4x4-matrix receiving inverse matrix. If not specified result is written to mat
		 *
		 * @returns {Float32Array} dest is specified, mat otherwise, null if matrix cannot be inverted
		 */
		mat4.inverse = function (mat, dest) {
			if (!dest) {
				dest = mat;
			}

			// Cache the matrix values (makes for huge speed increases!)
			var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
				a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
				a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
				a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15],

				b00 = a00 * a11 - a01 * a10,
				b01 = a00 * a12 - a02 * a10,
				b02 = a00 * a13 - a03 * a10,
				b03 = a01 * a12 - a02 * a11,
				b04 = a01 * a13 - a03 * a11,
				b05 = a02 * a13 - a03 * a12,
				b06 = a20 * a31 - a21 * a30,
				b07 = a20 * a32 - a22 * a30,
				b08 = a20 * a33 - a23 * a30,
				b09 = a21 * a32 - a22 * a31,
				b10 = a21 * a33 - a23 * a31,
				b11 = a22 * a33 - a23 * a32,

				d = (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06),
				invDet;

			// Calculate the determinant
			if (!d) {
				return null;
			}
			invDet = 1 / d;

			dest[0] = (a11 * b11 - a12 * b10 + a13 * b09) * invDet;
			dest[1] = (-a01 * b11 + a02 * b10 - a03 * b09) * invDet;
			dest[2] = (a31 * b05 - a32 * b04 + a33 * b03) * invDet;
			dest[3] = (-a21 * b05 + a22 * b04 - a23 * b03) * invDet;
			dest[4] = (-a10 * b11 + a12 * b08 - a13 * b07) * invDet;
			dest[5] = (a00 * b11 - a02 * b08 + a03 * b07) * invDet;
			dest[6] = (-a30 * b05 + a32 * b02 - a33 * b01) * invDet;
			dest[7] = (a20 * b05 - a22 * b02 + a23 * b01) * invDet;
			dest[8] = (a10 * b10 - a11 * b08 + a13 * b06) * invDet;
			dest[9] = (-a00 * b10 + a01 * b08 - a03 * b06) * invDet;
			dest[10] = (a30 * b04 - a31 * b02 + a33 * b00) * invDet;
			dest[11] = (-a20 * b04 + a21 * b02 - a23 * b00) * invDet;
			dest[12] = (-a10 * b09 + a11 * b07 - a12 * b06) * invDet;
			dest[13] = (a00 * b09 - a01 * b07 + a02 * b06) * invDet;
			dest[14] = (-a30 * b03 + a31 * b01 - a32 * b00) * invDet;
			dest[15] = (a20 * b03 - a21 * b01 + a22 * b00) * invDet;

			return dest;
		};

		/**
		 * Copies the upper 3x3 elements of a 4x4-matrix into another 4x4-matrix
		 *
		 * @param {Float32Array} mat 4x4-matrix containing values to copy
		 * @param {Float32Array} [dest] 4x4-matrix receiving copied values
		 *
		 * @returns {Float32Array} dest is specified, a new 4x4-matrix otherwise
		 */
		mat4.toRotationMat = function (mat, dest) {
			if (!dest) {
				dest = mat4.create();
			}

			dest[0] = mat[0];
			dest[1] = mat[1];
			dest[2] = mat[2];
			dest[3] = mat[3];
			dest[4] = mat[4];
			dest[5] = mat[5];
			dest[6] = mat[6];
			dest[7] = mat[7];
			dest[8] = mat[8];
			dest[9] = mat[9];
			dest[10] = mat[10];
			dest[11] = mat[11];
			dest[12] = 0;
			dest[13] = 0;
			dest[14] = 0;
			dest[15] = 1;

			return dest;
		};

		/**
		 * Copies the upper 3x3 elements of a 4x4-matrix into a 3x3-matrix
		 *
		 * @param {Float32Array} mat 4x4-matrix containing values to copy
		 * @param {Float32Array} [dest] 3x3-matrix receiving copied values
		 *
		 * @returns {Float32Array} dest is specified, a new 3x3-matrix otherwise
		 */
		mat4.toMat3 = function (mat, dest) {
			if (!dest) {
				dest = mat3.create();
			}

			dest[0] = mat[0];
			dest[1] = mat[1];
			dest[2] = mat[2];
			dest[3] = mat[4];
			dest[4] = mat[5];
			dest[5] = mat[6];
			dest[6] = mat[8];
			dest[7] = mat[9];
			dest[8] = mat[10];

			return dest;
		};

		/**
		 * Calculates the inverse of the upper 3x3 elements of a 4x4-matrix and copies the result into a 3x3-matrix
		 * The resulting matrix is useful for calculating transformed normals
		 *
		 * Params:
		 * @param {Float32Array} mat 4x4-matrix containing values to invert and copy
		 * @param {Float32Array} [dest] 3x3-matrix receiving values
		 *
		 * @returns {Float32Array} dest is specified, a new 3x3-matrix otherwise, null if the matrix cannot be inverted
		 */
		mat4.toInverseMat3 = function (mat, dest) {
			// Cache the matrix values (makes for huge speed increases!)
			var a00 = mat[0], a01 = mat[1], a02 = mat[2],
				a10 = mat[4], a11 = mat[5], a12 = mat[6],
				a20 = mat[8], a21 = mat[9], a22 = mat[10],

				b01 = a22 * a11 - a12 * a21,
				b11 = -a22 * a10 + a12 * a20,
				b21 = a21 * a10 - a11 * a20,

				d = a00 * b01 + a01 * b11 + a02 * b21,
				id;

			if (!d) {
				return null;
			}
			id = 1 / d;

			if (!dest) {
				dest = mat3.create();
			}

			dest[0] = b01 * id;
			dest[1] = (-a22 * a01 + a02 * a21) * id;
			dest[2] = (a12 * a01 - a02 * a11) * id;
			dest[3] = b11 * id;
			dest[4] = (a22 * a00 - a02 * a20) * id;
			dest[5] = (-a12 * a00 + a02 * a10) * id;
			dest[6] = b21 * id;
			dest[7] = (-a21 * a00 + a01 * a20) * id;
			dest[8] = (a11 * a00 - a01 * a10) * id;

			return dest;
		};

		/**
		 * Performs a matrix multiplication
		 *
		 * @param {Float32Array} mat First operand 4x4-matrix
		 * @param {Float32Array} mat2 Second operand 4x4-matrix
		 * @param {Float32Array} [dest] 4x4-matrix receiving operation result. If not specified result is written to mat
		 *
		 * @returns {Float32Array} dest if specified, mat otherwise
		 */
		mat4.multiply = function (mat, mat2, dest) {
			if (!dest) {
				dest = mat;
			}

			// Cache the matrix values (makes for huge speed increases!)
			var a00 = mat[ 0], a01 = mat[ 1], a02 = mat[ 2], a03 = mat[3];
			var a10 = mat[ 4], a11 = mat[ 5], a12 = mat[ 6], a13 = mat[7];
			var a20 = mat[ 8], a21 = mat[ 9], a22 = mat[10], a23 = mat[11];
			var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];

			// Cache only the current line of the second matrix
			var b0 = mat2[0], b1 = mat2[1], b2 = mat2[2], b3 = mat2[3];
			dest[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
			dest[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
			dest[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
			dest[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

			b0 = mat2[4];
			b1 = mat2[5];
			b2 = mat2[6];
			b3 = mat2[7];
			dest[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
			dest[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
			dest[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
			dest[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

			b0 = mat2[8];
			b1 = mat2[9];
			b2 = mat2[10];
			b3 = mat2[11];
			dest[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
			dest[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
			dest[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
			dest[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

			b0 = mat2[12];
			b1 = mat2[13];
			b2 = mat2[14];
			b3 = mat2[15];
			dest[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
			dest[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
			dest[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
			dest[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

			return dest;
		};

		/**
		 * Transforms a 3d-vector with the given matrix
		 * 4th vector component is implicitly '1'
		 *
		 * @param {Float32Array} mat 4x4-matrix to transform the vector with
		 * @param {Float32Array} vec 3d-vector to transform
		 * @param {Float32Array} [dest] 3d-vector receiving operation result. If not specified result is written to vec
		 *
		 * @returns {Float32Array} dest if specified, vec otherwise
		 */
		mat4.multiplyVec3 = function (mat, vec, dest) {
			if (!dest) {
				dest = vec;
			}

			var x = vec[0], y = vec[1], z = vec[2];

			dest[0] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
			dest[1] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
			dest[2] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];

			return dest;
		};

		/**
		 * Transforms a 4d-vector with the given 4x4-matrix
		 *
		 * @param {Float32Array} mat 4x4-matrix to transform the vector with
		 * @param {Float32Array} vec 4d-vector to transform
		 * @param {Float32Array} [dest] 4d-vector receiving operation result. If not specified result is written to vec
		 *
		 * @returns {Float32Array} dest if specified, vec otherwise
		 */
		mat4.multiplyVec4 = function (mat, vec, dest) {
			if (!dest) {
				dest = vec;
			}

			var x = vec[0], y = vec[1], z = vec[2], w = vec[3];

			dest[0] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12] * w;
			dest[1] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13] * w;
			dest[2] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14] * w;
			dest[3] = mat[3] * x + mat[7] * y + mat[11] * z + mat[15] * w;

			return dest;
		};

		/**
		 * Translates a matrix by the given vector
		 *
		 * @param {Float32Array} mat 4x4-matrix to translate
		 * @param {Float32Array} vec 3d-vector specifying the translation
		 * @param {Float32Array} [dest] 4x4-matrix receiving operation result. If not specified result is written to mat
		 *
		 * @returns {Float32Array} dest if specified, mat otherwise
		 */
		mat4.translate = function (mat, vec, dest) {
			var x = vec[0], y = vec[1], z = vec[2],
				a00, a01, a02, a03,
				a10, a11, a12, a13,
				a20, a21, a22, a23;

			if (!dest || mat === dest) {
				mat[12] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
				mat[13] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
				mat[14] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];
				mat[15] = mat[3] * x + mat[7] * y + mat[11] * z + mat[15];
				return mat;
			}

			a00 = mat[0];
			a01 = mat[1];
			a02 = mat[2];
			a03 = mat[3];
			a10 = mat[4];
			a11 = mat[5];
			a12 = mat[6];
			a13 = mat[7];
			a20 = mat[8];
			a21 = mat[9];
			a22 = mat[10];
			a23 = mat[11];

			dest[0] = a00;
			dest[1] = a01;
			dest[2] = a02;
			dest[3] = a03;
			dest[4] = a10;
			dest[5] = a11;
			dest[6] = a12;
			dest[7] = a13;
			dest[8] = a20;
			dest[9] = a21;
			dest[10] = a22;
			dest[11] = a23;

			dest[12] = a00 * x + a10 * y + a20 * z + mat[12];
			dest[13] = a01 * x + a11 * y + a21 * z + mat[13];
			dest[14] = a02 * x + a12 * y + a22 * z + mat[14];
			dest[15] = a03 * x + a13 * y + a23 * z + mat[15];
			return dest;
		};

		/**
		 * Scales a 4x4-matrix by the given 3d-vector
		 *
		 * @param {Float32Array} mat 4x4-matrix to scale
		 * @param {Float32Array} vec 3d-vector specifying the scale for each axis
		 * @param {Float32Array} [dest] 4x4-matrix receiving operation result. If not specified result is written to mat
		 *
		 * @returns {Float32Array} dest if specified, mat otherwise
		 */
		mat4.scale = function (mat, vec, dest) {
			var x = vec[0], y = vec[1], z = vec[2];

			if (!dest || mat === dest) {
				mat[0] *= x;
				mat[1] *= x;
				mat[2] *= x;
				mat[3] *= x;
				mat[4] *= y;
				mat[5] *= y;
				mat[6] *= y;
				mat[7] *= y;
				mat[8] *= z;
				mat[9] *= z;
				mat[10] *= z;
				mat[11] *= z;
				return mat;
			}

			dest[0] = mat[0] * x;
			dest[1] = mat[1] * x;
			dest[2] = mat[2] * x;
			dest[3] = mat[3] * x;
			dest[4] = mat[4] * y;
			dest[5] = mat[5] * y;
			dest[6] = mat[6] * y;
			dest[7] = mat[7] * y;
			dest[8] = mat[8] * z;
			dest[9] = mat[9] * z;
			dest[10] = mat[10] * z;
			dest[11] = mat[11] * z;
			dest[12] = mat[12];
			dest[13] = mat[13];
			dest[14] = mat[14];
			dest[15] = mat[15];
			return dest;
		};

		/**
		 * Rotates a 4x4-matrix by the given angle around the specified axis
		 * If rotating around a primary axis (X,Y,Z) one of the specialized rotation functions should be used instead for performance
		 *
		 * @param {Float32Array} mat 4x4-matrix to rotate
		 * @param {Number} angle Angle (in radians) to rotate
		 * @param {Float32Array} axis 3d-vector representing the axis to rotate around
		 * @param {Float32Array} [dest] 4x4-matrix receiving operation result. If not specified result is written to mat
		 *
		 * @returns {Float32Array} dest if specified, mat otherwise
		 */
		mat4.rotate = function (mat, angle, axis, dest) {
			var x = axis[0], y = axis[1], z = axis[2],
				len = Math.sqrt(x * x + y * y + z * z),
				s, c, t,
				a00, a01, a02, a03,
				a10, a11, a12, a13,
				a20, a21, a22, a23,
				b00, b01, b02,
				b10, b11, b12,
				b20, b21, b22;

			if (!len) {
				return null;
			}
			if (len !== 1) {
				len = 1 / len;
				x *= len;
				y *= len;
				z *= len;
			}

			s = Math.sin(angle);
			c = Math.cos(angle);
			t = 1 - c;

			a00 = mat[0];
			a01 = mat[1];
			a02 = mat[2];
			a03 = mat[3];
			a10 = mat[4];
			a11 = mat[5];
			a12 = mat[6];
			a13 = mat[7];
			a20 = mat[8];
			a21 = mat[9];
			a22 = mat[10];
			a23 = mat[11];

			// Construct the elements of the rotation matrix
			b00 = x * x * t + c;
			b01 = y * x * t + z * s;
			b02 = z * x * t - y * s;
			b10 = x * y * t - z * s;
			b11 = y * y * t + c;
			b12 = z * y * t + x * s;
			b20 = x * z * t + y * s;
			b21 = y * z * t - x * s;
			b22 = z * z * t + c;

			if (!dest) {
				dest = mat;
			} else if (mat !== dest) { // If the source and destination differ, copy the unchanged last row
				dest[12] = mat[12];
				dest[13] = mat[13];
				dest[14] = mat[14];
				dest[15] = mat[15];
			}

			// Perform rotation-specific matrix multiplication
			dest[0] = a00 * b00 + a10 * b01 + a20 * b02;
			dest[1] = a01 * b00 + a11 * b01 + a21 * b02;
			dest[2] = a02 * b00 + a12 * b01 + a22 * b02;
			dest[3] = a03 * b00 + a13 * b01 + a23 * b02;

			dest[4] = a00 * b10 + a10 * b11 + a20 * b12;
			dest[5] = a01 * b10 + a11 * b11 + a21 * b12;
			dest[6] = a02 * b10 + a12 * b11 + a22 * b12;
			dest[7] = a03 * b10 + a13 * b11 + a23 * b12;

			dest[8] = a00 * b20 + a10 * b21 + a20 * b22;
			dest[9] = a01 * b20 + a11 * b21 + a21 * b22;
			dest[10] = a02 * b20 + a12 * b21 + a22 * b22;
			dest[11] = a03 * b20 + a13 * b21 + a23 * b22;
			return dest;
		};

		/**
		 * Rotates a matrix by the given angle around the X axis
		 *
		 * @param {Float32Array} mat 4x4-matrix to rotate
		 * @param {Number} angle Angle (in radians) to rotate
		 * @param {Float32Array} [dest] 4x4-matrix receiving operation result. If not specified result is written to mat
		 *
		 * @returns {Float32Array} dest if specified, mat otherwise
		 */
		mat4.rotateX = function (mat, angle, dest) {
			var s = Math.sin(angle),
				c = Math.cos(angle),
				a10 = mat[4],
				a11 = mat[5],
				a12 = mat[6],
				a13 = mat[7],
				a20 = mat[8],
				a21 = mat[9],
				a22 = mat[10],
				a23 = mat[11];

			if (!dest) {
				dest = mat;
			} else if (mat !== dest) { // If the source and destination differ, copy the unchanged rows
				dest[0] = mat[0];
				dest[1] = mat[1];
				dest[2] = mat[2];
				dest[3] = mat[3];

				dest[12] = mat[12];
				dest[13] = mat[13];
				dest[14] = mat[14];
				dest[15] = mat[15];
			}

			// Perform axis-specific matrix multiplication
			dest[4] = a10 * c + a20 * s;
			dest[5] = a11 * c + a21 * s;
			dest[6] = a12 * c + a22 * s;
			dest[7] = a13 * c + a23 * s;

			dest[8] = a10 * -s + a20 * c;
			dest[9] = a11 * -s + a21 * c;
			dest[10] = a12 * -s + a22 * c;
			dest[11] = a13 * -s + a23 * c;
			return dest;
		};

		/**
		 * Rotates a matrix by the given angle around the Y axis
		 *
		 * @param {Float32Array} mat 4x4-matrix to rotate
		 * @param {Number} angle Angle (in radians) to rotate
		 * @param {Float32Array} [dest] 4x4-matrix receiving operation result. If not specified result is written to mat
		 *
		 * @returns {Float32Array} dest if specified, mat otherwise
		 */
		mat4.rotateY = function (mat, angle, dest) {
			var s = Math.sin(angle),
				c = Math.cos(angle),
				a00 = mat[0],
				a01 = mat[1],
				a02 = mat[2],
				a03 = mat[3],
				a20 = mat[8],
				a21 = mat[9],
				a22 = mat[10],
				a23 = mat[11];

			if (!dest) {
				dest = mat;
			} else if (mat !== dest) { // If the source and destination differ, copy the unchanged rows
				dest[4] = mat[4];
				dest[5] = mat[5];
				dest[6] = mat[6];
				dest[7] = mat[7];

				dest[12] = mat[12];
				dest[13] = mat[13];
				dest[14] = mat[14];
				dest[15] = mat[15];
			}

			// Perform axis-specific matrix multiplication
			dest[0] = a00 * c + a20 * -s;
			dest[1] = a01 * c + a21 * -s;
			dest[2] = a02 * c + a22 * -s;
			dest[3] = a03 * c + a23 * -s;

			dest[8] = a00 * s + a20 * c;
			dest[9] = a01 * s + a21 * c;
			dest[10] = a02 * s + a22 * c;
			dest[11] = a03 * s + a23 * c;
			return dest;
		};

		/**
		 * Rotates a matrix by the given angle around the Z axis
		 *
		 * @param {Float32Array} mat 4x4-matrix to rotate
		 * @param {Number} angle Angle (in radians) to rotate
		 * @param {Float32Array} [dest] 4x4-matrix receiving operation result. If not specified result is written to mat
		 *
		 * @returns {Float32Array} dest if specified, mat otherwise
		 */
		mat4.rotateZ = function (mat, angle, dest) {
			var s = Math.sin(angle),
				c = Math.cos(angle),
				a00 = mat[0],
				a01 = mat[1],
				a02 = mat[2],
				a03 = mat[3],
				a10 = mat[4],
				a11 = mat[5],
				a12 = mat[6],
				a13 = mat[7];

			if (!dest) {
				dest = mat;
			} else if (mat !== dest) { // If the source and destination differ, copy the unchanged last row
				dest[8] = mat[8];
				dest[9] = mat[9];
				dest[10] = mat[10];
				dest[11] = mat[11];

				dest[12] = mat[12];
				dest[13] = mat[13];
				dest[14] = mat[14];
				dest[15] = mat[15];
			}

			// Perform axis-specific matrix multiplication
			dest[0] = a00 * c + a10 * s;
			dest[1] = a01 * c + a11 * s;
			dest[2] = a02 * c + a12 * s;
			dest[3] = a03 * c + a13 * s;

			dest[4] = a00 * -s + a10 * c;
			dest[5] = a01 * -s + a11 * c;
			dest[6] = a02 * -s + a12 * c;
			dest[7] = a03 * -s + a13 * c;

			return dest;
		};

		/**
		 * Generates a frustum matrix with the given bounds
		 *
		 * @param {Number} left Left bound of the frustum
		 * @param {Number} right Right bound of the frustum
		 * @param {Number} bottom Bottom bound of the frustum
		 * @param {Number} top Top bound of the frustum
		 * @param {Number} near Near bound of the frustum
		 * @param {Number} far Far bound of the frustum
		 * @param {Float32Array} [dest] 4x4 frustum matrix will be written into
		 *
		 * @returns {Float32Array} dest if specified, a new mat4 otherwise
		 */
		mat4.frustum = function (left, right, bottom, top, near, far, dest) {
			if (!dest) {
				dest = mat4.create();
			}
			var rl = (right - left),
				tb = (top - bottom),
				fn = (far - near);
			dest[0] = (near * 2) / rl;
			dest[1] = 0;
			dest[2] = 0;
			dest[3] = 0;
			dest[4] = 0;
			dest[5] = (near * 2) / tb;
			dest[6] = 0;
			dest[7] = 0;
			dest[8] = (right + left) / rl;
			dest[9] = (top + bottom) / tb;
			dest[10] = -(far + near) / fn;
			dest[11] = -1;
			dest[12] = 0;
			dest[13] = 0;
			dest[14] = -(far * near * 2) / fn;
			dest[15] = 0;
			return dest;
		};

		/**
		 * Generates a perspective projection matrix with the given bounds
		 *
		 * @param {Number} fovy Vertical field of view
		 * @param {Number} aspect Aspect ratio. typically viewport width/height
		 * @param {Number} near Near bound of the frustum
		 * @param {Number} far Far bound of the frustum
		 * @param {Float32Array} [dest] 4x4 frustum matrix will be written into
		 *
		 * @returns {Float32Array} dest if specified, a new mat4 otherwise
		 */
		mat4.perspective = function (fovy, aspect, near, far, dest) {
			var top = near * Math.tan(fovy * Math.PI / 360.0),
				right = top * aspect;
			return mat4.frustum(-right, right, -top, top, near, far, dest);
		};

		/**
		 * Generates a orthogonal projection matrix with the given bounds
		 *
		 * @param {Number} left Left bound of the frustum
		 * @param {Number} right Right bound of the frustum
		 * @param {Number} bottom Bottom bound of the frustum
		 * @param {Number} top Top bound of the frustum
		 * @param {Number} near Near bound of the frustum
		 * @param {Number} far Far bound of the frustum
		 * @param {Float32Array} [dest] 4x4 frustum matrix will be written into
		 *
		 * @returns {Float32Array} dest if specified, a new 4x4-matrix otherwise
		 */
		mat4.ortho = function (left, right, bottom, top, near, far, dest) {
			if (!dest) {
				dest = mat4.create();
			}
			var rl = (right - left),
				tb = (top - bottom),
				fn = (far - near);
			dest[0] = 2 / rl;
			dest[1] = 0;
			dest[2] = 0;
			dest[3] = 0;
			dest[4] = 0;
			dest[5] = 2 / tb;
			dest[6] = 0;
			dest[7] = 0;
			dest[8] = 0;
			dest[9] = 0;
			dest[10] = -2 / fn;
			dest[11] = 0;
			dest[12] = -(left + right) / rl;
			dest[13] = -(top + bottom) / tb;
			dest[14] = -(far + near) / fn;
			dest[15] = 1;
			return dest;
		};

		/**
		 * Generates a look-at matrix with the given eye position, focal point, and up axis
		 *
		 * @param {Float32Array} eye 3d-vector describing the position of the viewer
		 * @param {Float32Array} center 3d-vector describing the point the viewer is looking at
		 * @param {Float32Array} up 3d-vector pointing "up"
		 * @param {Float32Array} [dest] 4x4 frustum matrix will be written into
		 *
		 * @returns {Float32Array} dest if specified, a new 4x4-matrix otherwise
		 */
		mat4.lookAt = function (eye, center, up, dest) {
			if (!dest) {
				dest = mat4.create();
			}

			var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
				eyex = eye[0],
				eyey = eye[1],
				eyez = eye[2],
				upx = up[0],
				upy = up[1],
				upz = up[2],
				centerx = center[0],
				centery = center[1],
				centerz = center[2];

			if (eyex === centerx && eyey === centery && eyez === centerz) {
				return mat4.identity(dest);
			}

			//vec3.direction(eye, center, z);
			z0 = eyex - centerx;
			z1 = eyey - centery;
			z2 = eyez - centerz;

			// normalize (no check needed for 0 because of early return)
			len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
			z0 *= len;
			z1 *= len;
			z2 *= len;

			//vec3.normalize(vec3.cross(up, z, x));
			x0 = upy * z2 - upz * z1;
			x1 = upz * z0 - upx * z2;
			x2 = upx * z1 - upy * z0;
			len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
			if (!len) {
				x0 = 0;
				x1 = 0;
				x2 = 0;
			} else {
				len = 1 / len;
				x0 *= len;
				x1 *= len;
				x2 *= len;
			}

			//vec3.normalize(vec3.cross(z, x, y));
			y0 = z1 * x2 - z2 * x1;
			y1 = z2 * x0 - z0 * x2;
			y2 = z0 * x1 - z1 * x0;

			len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
			if (!len) {
				y0 = 0;
				y1 = 0;
				y2 = 0;
			} else {
				len = 1 / len;
				y0 *= len;
				y1 *= len;
				y2 *= len;
			}

			dest[0] = x0;
			dest[1] = y0;
			dest[2] = z0;
			dest[3] = 0;
			dest[4] = x1;
			dest[5] = y1;
			dest[6] = z1;
			dest[7] = 0;
			dest[8] = x2;
			dest[9] = y2;
			dest[10] = z2;
			dest[11] = 0;
			dest[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
			dest[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
			dest[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
			dest[15] = 1;

			return dest;
		};

		/**
		 * Creates a 4x4-matrix from a quaternion rotation and vector translation
		 * This is equivalent to (but much faster than):
		 *
		 *     mat4.identity(dest);
		 *     mat4.translate(dest, vec);
		 *     var quatMat = mat4.create();
		 *     quat4.toMat4(quat, quatMat);
		 *     mat4.multiply(dest, quatMat);
		 *
		 * @param {Float32Array} quat Rotation quaternion
		 * @param {Float32Array} vec Translation 3d-vector
		 * @param {Float32Array} [dest] 4x4-matrix receiving operation result. If not specified result is written to a new 4x4-matrix
		 *
		 * @returns {Float32Array} dest if specified, a new 4x4-matrix otherwise
		 */
		mat4.fromRotationTranslation = function (quat, vec, dest) {
			if (!dest) {
				dest = mat4.create();
			}

			// Quaternion math
			var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
				x2 = x + x,
				y2 = y + y,
				z2 = z + z,

				xx = x * x2,
				xy = x * y2,
				xz = x * z2,
				yy = y * y2,
				yz = y * z2,
				zz = z * z2,
				wx = w * x2,
				wy = w * y2,
				wz = w * z2;

			dest[0] = 1 - (yy + zz);
			dest[1] = xy + wz;
			dest[2] = xz - wy;
			dest[3] = 0;
			dest[4] = xy - wz;
			dest[5] = 1 - (xx + zz);
			dest[6] = yz + wx;
			dest[7] = 0;
			dest[8] = xz + wy;
			dest[9] = yz - wx;
			dest[10] = 1 - (xx + yy);
			dest[11] = 0;
			dest[12] = vec[0];
			dest[13] = vec[1];
			dest[14] = vec[2];
			dest[15] = 1;

			return dest;
		};

		/**
		 * Returns a string representation of a 4x4-matrix
		 *
		 * @param {Float32Array} mat 4x4-matrix to represent as a string
		 *
		 * @returns {String} String representation of mat
		 */
		mat4.str = function (mat) {
			return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + ', ' + mat[3] +
				', ' + mat[4] + ', ' + mat[5] + ', ' + mat[6] + ', ' + mat[7] +
				', ' + mat[8] + ', ' + mat[9] + ', ' + mat[10] + ', ' + mat[11] +
				', ' + mat[12] + ', ' + mat[13] + ', ' + mat[14] + ', ' + mat[15] + ']';
		};


		return mat4;
	}
)

/*
 * This class is derived from glmatrix 1.3.7. Original Licence follows:
 *
 * Copyright (c) 2012 Brandon Jones, Colin MacKenzie IV
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 * 1. The origin of this software must not be misrepresented; you must not
 * claim that you wrote the original software. If you use this software
 * in a product, an acknowledgment in the product documentation would be
 * appreciated but is not required.
 *
 * 2. Altered source versions must be plainly marked as such, and must not
 * be misrepresented as being the original software.
 *
 * 3. This notice may not be removed or altered from any source
 * distribution.
 */

/**
 * **This class implements high performance 2x2 Matrix math.**
 *
 * Example usage:
 *
 *
 *     var matA = mat2.{@link #createFrom}(1, 2, 3, 4);
 *     //=> matA is now a Float32Array with [1,2,3,4]
 *
 *     var matB = mat2.{@link #create}([5, 6, 7, 8]);
 *     //=> matB is now a Float32Array with [5,6,7,8], The original array has been converted to a Float32Array.
 *
 *     var matC = mat2.{@link #create}();
 *     //=> matC is now [0,0,0,0]
 *
 *     // Multiply matA with matB and write the result to matC
 *     mat2.{@link #multiply}(matA, matB, matC);
 *
 *
 *
 * Please note: This object does not hold the matrix components itself, it defines helper functions which manipulate
 * highly optimized data structures. This is done for performance reasons. **You need to allocate new matrices
 * with the {@link #create} or {@link #createFrom} function. Don't try to allocate new matrices yourself, always use
 * these function to do so.**
 *
 *
 * *This class is derived from [glMatrix](https://github.com/toji/gl-matrix) 1.3.7 originally written by Brandon Jones
 * and Colin MacKenzie IV. The original BSD licence is included in the source file of this class.*
 *
 * @class spell.math.mat2
 * @singleton
 * @requires Math
 * @requires spell.shared.util.platform.Types
 */
define(
	"spell/math/mat2",
	["spell/shared/util/platform/Types"],
	function (Types) {

		"use strict";
		var createFloatArray = Types.createFloatArray;

		// Tweak to your liking
		var FLOAT_EPSILON = 0.000001;


		var mat2 = {};

		/**
		 * Creates a new 2x2-matrix. If src is given, the new matrix
		 * is initialized to those values.
		 *
		 * @param {Array} [src] the seed values for the new 2x2-matrix, if any
		 * @returns {Float32Array} a new 2x2-matrix
		 */
		mat2.create = function (src) {
			var dest = createFloatArray(4);

			if (src) {
				dest[0] = src[0];
				dest[1] = src[1];
				dest[2] = src[2];
				dest[3] = src[3];
			} else {
				dest[0] = dest[1] = dest[2] = dest[3] = 0;
			}
			return dest;
		};

		/**
		 * Creates a new instance of a 2x2-matrix, initializing it with the given arguments
		 *
		 * @param {number} m00
		 * @param {number} m01
		 * @param {number} m10
		 * @param {number} m11

		 * @returns {Float32Array} New 2x2-matrix
		 */
		mat2.createFrom = function (m00, m01, m10, m11) {
			var dest = createFloatArray(4);

			dest[0] = m00;
			dest[1] = m01;
			dest[2] = m10;
			dest[3] = m11;

			return dest;
		};

		/**
		 * Copies the values of one 2x2-matrix to another
		 *
		 * @param {Float32Array} mat 2x2-matrix containing values to copy
		 * @param {Float32Array} dest 2x2-matrix receiving copied values
		 *
		 * @returns {Float32Array} dest 2x2-matrix
		 */
		mat2.set = function (mat, dest) {
			dest[0] = mat[0];
			dest[1] = mat[1];
			dest[2] = mat[2];
			dest[3] = mat[3];
			return dest;
		};

		/**
		 * Compares two matrices for equality within a certain margin of error
		 *
		 * @param {Float32Array} a First 2x2-matrix
		 * @param {Float32Array} b Second 2x2-matrix
		 *
		 * @returns {Boolean} True if a is equivalent to b
		 */
		mat2.equal = function (a, b) {
			return a === b || (
				Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
					Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
					Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
					Math.abs(a[3] - b[3]) < FLOAT_EPSILON
				);
		};

		/**
		 * Sets a 2x2-matrix to an identity matrix
		 *
		 * @param {Float32Array} [dest] 2x2-matrix to set. If omitted a new one will be created.
		 *
		 * @returns {Float32Array} dest 2x2-matrix
		 */
		mat2.identity = function (dest) {
			if (!dest) {
				dest = mat2.create();
			}
			dest[0] = 1;
			dest[1] = 0;
			dest[2] = 0;
			dest[3] = 1;
			return dest;
		};

		/**
		 * Transposes a 2x2-matrix (flips the values over the diagonal)
		 *
		 * @param {Float32Array} mat 2x2-matrix to transpose
		 * @param {Float32Array} [dest] 2x2-matrix receiving transposed values. If not specified result is written to mat
		 *
		 * @return {Float32Array} dest if specified, mat otherwise
		 */
		mat2.transpose = function (mat, dest) {
			// If we are transposing ourselves we can skip a few steps but have to cache some values
			if (!dest || mat === dest) {
				var a00 = mat[1];
				mat[1] = mat[2];
				mat[2] = a00;
				return mat;
			}

			dest[0] = mat[0];
			dest[1] = mat[2];
			dest[2] = mat[1];
			dest[3] = mat[3];
			return dest;
		};

		/**
		 * Calculates the determinant of a 2x2-matrix
		 *
		 * @param {Float32Array} mat 2x2-matrix to calculate determinant of
		 *
		 * @returns {Number} determinant of mat
		 */
		mat2.determinant = function (mat) {
			return mat[0] * mat[3] - mat[2] * mat[1];
		};

		/**
		 * Calculates the inverse matrix of a 2x2-matrix
		 *
		 * @param {Float32Array} mat 2x2-matrix to calculate inverse of
		 * @param {Float32Array} [dest] 2x2-matrix receiving inverse matrix. If not specified result is written to mat
		 *
		 * @returns {Float32Array} dest is specified, mat otherwise, null if matrix cannot be inverted
		 */
		mat2.inverse = function (mat, dest) {
			if (!dest) {
				dest = mat;
			}
			var a0 = mat[0], a1 = mat[1], a2 = mat[2], a3 = mat[3];
			var det = a0 * a3 - a2 * a1;
			if (!det) return null;

			det = 1.0 / det;
			dest[0] = a3 * det;
			dest[1] = -a1 * det;
			dest[2] = -a2 * det;
			dest[3] = a0 * det;
			return dest;
		};

		/**
		 * Performs a matrix multiplication
		 *
		 * @param {Float32Array} matA 2x2-matrix First operand
		 * @param {Float32Array} matB 2x2-matrix Second operand
		 * @param {Float32Array} [dest] 2x2-matrix receiving operation result. If not specified result is written to matA
		 *
		 * @returns {Float32Array} dest if specified, matA otherwise
		 */
		mat2.multiply = function (matA, matB, dest) {
			if (!dest) {
				dest = matA;
			}
			var a11 = matA[0],
				a12 = matA[1],
				a21 = matA[2],
				a22 = matA[3];
			dest[0] = a11 * matB[0] + a12 * matB[2];
			dest[1] = a11 * matB[1] + a12 * matB[3];
			dest[2] = a21 * matB[0] + a22 * matB[2];
			dest[3] = a21 * matB[1] + a22 * matB[3];
			return dest;
		};

		/**
		 * Rotates a 2x2-matrix by an angle
		 *
		 * @param {Float32Array} mat The 2x2-matrix to rotate
		 * @param {Number} angle The angle in radians
		 * @param {Float32Array} [dest] Optional 2x2-matrix receiving the result. If omitted mat will be used.
		 *
		 * @returns {Float32Array} dest if specified, mat otherwise
		 */
		mat2.rotate = function (mat, angle, dest) {
			if (!dest) {
				dest = mat;
			}
			var a11 = mat[0],
				a12 = mat[1],
				a21 = mat[2],
				a22 = mat[3],
				s = Math.sin(angle),
				c = Math.cos(angle);
			dest[0] = a11 * c + a12 * s;
			dest[1] = a11 * -s + a12 * c;
			dest[2] = a21 * c + a22 * s;
			dest[3] = a21 * -s + a22 * c;
			return dest;
		};

		/**
		 * Multiplies the 2d-vector by the given 2x2-matrix
		 *
		 * @param {Float32Array} matrix the 2x2-matrix to multiply against
		 * @param {Float32Array} vec the 2d-vector to multiply
		 * @param {Float32Array} [dest] an optional receiving 2d-vector. If not given, vec is used.
		 *
		 * @returns {Float32Array} The 2d-vector multiplication result
		 **/
		mat2.multiplyVec2 = function (matrix, vec, dest) {
			if (!dest) dest = vec;
			var x = vec[0], y = vec[1];
			dest[0] = x * matrix[0] + y * matrix[1];
			dest[1] = x * matrix[2] + y * matrix[3];
			return dest;
		};

		/**
		 * Scales the 2x2-matrix by the dimensions in the given 2d-vector
		 *
		 * @param {Float32Array} matrix the 2x2 matrix to scale
		 * @param {Float32Array} vec the 2d-vector containing the dimensions to scale by
		 * @param {Float32Array} [dest] an optional receiving 2x2-matrix. If not given, matrix is used.
		 *
		 * @returns {Float32Array} dest if specified, matrix otherwise
		 **/
		mat2.scale = function (matrix, vec, dest) {
			if (!dest) {
				dest = matrix;
			}
			var a11 = matrix[0],
				a12 = matrix[1],
				a21 = matrix[2],
				a22 = matrix[3],
				b11 = vec[0],
				b22 = vec[1];
			dest[0] = a11 * b11;
			dest[1] = a12 * b22;
			dest[2] = a21 * b11;
			dest[3] = a22 * b22;
			return dest;
		};

		/**
		 * Returns a string representation of a 2x2-matrix
		 *
		 * @param {Float32Array} mat 2x2-matrix to represent as a string
		 *
		 * @returns {String} String representation of 2x2-matrix
		 */
		mat2.str = function (mat) {
			return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + ', ' + mat[3] + ']';
		};


		return mat2;

	});
/*
 * This class is derived from glmatrix 1.3.7. Original Licence follows:
 *
 * Copyright (c) 2012 Brandon Jones, Colin MacKenzie IV
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 * 1. The origin of this software must not be misrepresented; you must not
 * claim that you wrote the original software. If you use this software
 * in a product, an acknowledgment in the product documentation would be
 * appreciated but is not required.
 *
 * 2. Altered source versions must be plainly marked as such, and must not
 * be misrepresented as being the original software.
 *
 * 3. This notice may not be removed or altered from any source
 * distribution.
 */

/**
 * **This class implements high performance 3x3 Matrix math.**
 *
 * Example usage:
 *
 *
 *     var matA = mat3.{@link #createFrom}(1, 2, 3, 4, 5, 6, 7, 8, 9);
 *     //=> matA is now a Float32Array with [1,2,3,4,5,6,7,8,9]
 *
 *     var matB = mat3.{@link #create}([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
 *     //=> matB is now a Float32Array with [10,11,12,13,14,15,16,17,18,19], The original array has been converted to a Float32Array.
 *
 *     var matC = mat3.{@link #create}();
 *     //=> matC is now [0,0,0,0,0,0,0,0,0]
 *
 *     // Multiply matA with matB and write the result to matC
 *     mat3.{@link #multiply}(matA, matB, matC);
 *
 *
 *
 * Please note: This object does not hold the matrix components itself, it defines helper functions which manipulate
 * highly optimized data structures. This is done for performance reasons. **You need to allocate new matrices
 * with the {@link #create} or {@link #createFrom} function. Don't try to allocate new matrices yourself, always use
 * these function to do so.**
 *
 *
 * *This class is derived from [glMatrix](https://github.com/toji/gl-matrix) 1.3.7 originally written by Brandon Jones
 * and Colin MacKenzie IV. The original BSD licence is included in the source file of this class.*
 *
 * @class spell.math.mat3
 * @singleton
 * @requires Math
 * @requires spell.shared.util.platform.Types
 */
define(
	"spell/math/mat3",
	[
		"spell/shared/util/platform/Types"
	],
	function(
		Types
	) {

		"use strict";
		var createFloatArray = Types.createFloatArray;

		// Tweak to your liking
		var FLOAT_EPSILON = 0.000001;

		var mat3 = {};

		/**
		 * Creates a new instance of a mat3 using the default array type
		 * Any javascript array-like object containing at least 9 numeric elements can serve as a mat3
		 *
		 * @param {Float32Array} [mat] 3x3-matrix containing values to initialize with
		 *
		 * @returns {Float32Array} New 3x3-matrix
		 */
		mat3.create = function (mat) {
			var dest = createFloatArray(9);

			if (mat) {
				dest[0] = mat[0];
				dest[1] = mat[1];
				dest[2] = mat[2];
				dest[3] = mat[3];
				dest[4] = mat[4];
				dest[5] = mat[5];
				dest[6] = mat[6];
				dest[7] = mat[7];
				dest[8] = mat[8];
			} else {
				dest[0] = dest[1] =
					dest[2] = dest[3] =
						dest[4] = dest[5] =
							dest[6] = dest[7] =
								dest[8] = 0;
			}

			return dest;
		};

		/**
		 * Creates a new instance of a mat3, initializing it with the given arguments
		 *
		 * @param {number} m00
		 * @param {number} m01
		 * @param {number} m02
		 * @param {number} m10
		 * @param {number} m11
		 * @param {number} m12
		 * @param {number} m20
		 * @param {number} m21
		 * @param {number} m22

		 * @returns {Float32Array} New 3x3-matrix
		 */
		mat3.createFrom = function (m00, m01, m02, m10, m11, m12, m20, m21, m22) {
			var dest = createFloatArray(9);

			dest[0] = m00;
			dest[1] = m01;
			dest[2] = m02;
			dest[3] = m10;
			dest[4] = m11;
			dest[5] = m12;
			dest[6] = m20;
			dest[7] = m21;
			dest[8] = m22;

			return dest;
		};

		/**
		 * Calculates the determinant of a mat3
		 *
		 * @param {Float32Array} mat 3x3-matrix to calculate determinant of
		 *
		 * @returns {Number} determinant of mat
		 */
		mat3.determinant = function (mat) {
			var a00 = mat[0], a01 = mat[1], a02 = mat[2],
				a10 = mat[3], a11 = mat[4], a12 = mat[5],
				a20 = mat[6], a21 = mat[7], a22 = mat[8];

			return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
		};

		/**
		 * Calculates the inverse matrix of a mat3
		 *
		 * @param {Float32Array} mat 3x3-matrix to calculate inverse of
		 * @param {Float32Array} [dest] 3x3-matrix receiving inverse matrix. If not specified result is written to mat
		 *
		 * @returns {Float32Array} dest is specified, mat otherwise, null if matrix cannot be inverted
		 */
		mat3.inverse = function (mat, dest) {
			var a00 = mat[0], a01 = mat[1], a02 = mat[2],
				a10 = mat[3], a11 = mat[4], a12 = mat[5],
				a20 = mat[6], a21 = mat[7], a22 = mat[8],

				b01 = a22 * a11 - a12 * a21,
				b11 = -a22 * a10 + a12 * a20,
				b21 = a21 * a10 - a11 * a20,

				d = a00 * b01 + a01 * b11 + a02 * b21,
				id;

			if (!d) {
				return null;
			}
			id = 1 / d;

			if (!dest) {
				dest = mat3.create();
			}

			dest[0] = b01 * id;
			dest[1] = (-a22 * a01 + a02 * a21) * id;
			dest[2] = (a12 * a01 - a02 * a11) * id;
			dest[3] = b11 * id;
			dest[4] = (a22 * a00 - a02 * a20) * id;
			dest[5] = (-a12 * a00 + a02 * a10) * id;
			dest[6] = b21 * id;
			dest[7] = (-a21 * a00 + a01 * a20) * id;
			dest[8] = (a11 * a00 - a01 * a10) * id;
			return dest;
		};

		/**
		 * Performs a matrix multiplication
		 *
		 * @param {Float32Array} mat 3x3-matrix First operand
		 * @param {Float32Array} mat2 3x3-matrix Second operand
		 * @param {Float32Array} [dest] 3x3-matrix receiving operation result. If not specified result is written to mat
		 *
		 * @returns {Float32Array} dest if specified, mat otherwise
		 */
		mat3.multiply = function (mat, mat2, dest) {
			if (!dest) {
				dest = mat;
			}


			// Cache the matrix values (makes for huge speed increases!)
			var a00 = mat[0], a01 = mat[1], a02 = mat[2],
				a10 = mat[3], a11 = mat[4], a12 = mat[5],
				a20 = mat[6], a21 = mat[7], a22 = mat[8],

				b00 = mat2[0], b01 = mat2[1], b02 = mat2[2],
				b10 = mat2[3], b11 = mat2[4], b12 = mat2[5],
				b20 = mat2[6], b21 = mat2[7], b22 = mat2[8];

			dest[0] = b00 * a00 + b01 * a10 + b02 * a20;
			dest[1] = b00 * a01 + b01 * a11 + b02 * a21;
			dest[2] = b00 * a02 + b01 * a12 + b02 * a22;

			dest[3] = b10 * a00 + b11 * a10 + b12 * a20;
			dest[4] = b10 * a01 + b11 * a11 + b12 * a21;
			dest[5] = b10 * a02 + b11 * a12 + b12 * a22;

			dest[6] = b20 * a00 + b21 * a10 + b22 * a20;
			dest[7] = b20 * a01 + b21 * a11 + b22 * a21;
			dest[8] = b20 * a02 + b21 * a12 + b22 * a22;

			return dest;
		};

		/**
		 * Transforms the given 2d-vector according to the given 3x3-matrix.
		 *
		 * @param {Float32Array} matrix 3x3-matrix to multiply against
		 * @param {Float32Array} vec the 2d-vector to multiply
		 * @param {Float32Array} [dest] an optional receiving 2d-vector. If not given, vec is used.
		 *
		 * @returns {Float32Array} The 2d-vector multiplication result
		 **/
		mat3.multiplyVec2 = function (matrix, vec, dest) {
			if (!dest) dest = vec;
			var x = vec[0], y = vec[1];
			dest[0] = x * matrix[0] + y * matrix[3] + matrix[6];
			dest[1] = x * matrix[1] + y * matrix[4] + matrix[7];
			return dest;
		};

		/**
		 * Transforms the 3d-vector according to the given 3x3-matrix
		 *
		 * @param {Float32Array} matrix 3x3-matrix to multiply against
		 * @param {Float32Array} vec the 3d-vector to multiply
		 * @param {Float32Array} [dest] an optional receiving 3d-vector. If not given, vec is used.
		 *
		 * @returns {Float32Array} The 3d-vector multiplication result
		 **/
		mat3.multiplyVec3 = function (matrix, vec, dest) {
			if (!dest) dest = vec;
			var x = vec[0], y = vec[1], z = vec[2];
			dest[0] = x * matrix[0] + y * matrix[3] + z * matrix[6];
			dest[1] = x * matrix[1] + y * matrix[4] + z * matrix[7];
			dest[2] = x * matrix[2] + y * matrix[5] + z * matrix[8];

			return dest;
		};

		/**
		 * Copies the values of one 3x3-matrix to another
		 *
		 * @param {Float32Array} mat 3x3-matrix containing values to copy
		 * @param {Float32Array} dest 3x3-matrix receiving copied values
		 *
		 * @returns {Float32Array} dest 3x3-matrix
		 */
		mat3.set = function (mat, dest) {
			dest[0] = mat[0];
			dest[1] = mat[1];
			dest[2] = mat[2];
			dest[3] = mat[3];
			dest[4] = mat[4];
			dest[5] = mat[5];
			dest[6] = mat[6];
			dest[7] = mat[7];
			dest[8] = mat[8];
			return dest;
		};

		/**
		 * Compares two matrices for equality within a certain margin of error
		 *
		 * @param {Float32Array} a First 3x3-matrix
		 * @param {Float32Array} b Second 3x3-matrix
		 *
		 * @returns {Boolean} True if a is equivalent to b
		 */
		mat3.equal = function (a, b) {
			return a === b || (
				Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
					Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
					Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
					Math.abs(a[3] - b[3]) < FLOAT_EPSILON &&
					Math.abs(a[4] - b[4]) < FLOAT_EPSILON &&
					Math.abs(a[5] - b[5]) < FLOAT_EPSILON &&
					Math.abs(a[6] - b[6]) < FLOAT_EPSILON &&
					Math.abs(a[7] - b[7]) < FLOAT_EPSILON &&
					Math.abs(a[8] - b[8]) < FLOAT_EPSILON
				);
		};

		/**
		 * Sets a 3x3-matrix to an identity matrix
		 *
		 * @param {Float32Array} dest 3x3-matrix to set
		 *
		 * @returns {Float32Array} dest if specified, otherwise a new 3x3-matrix
		 */
		mat3.identity = function (dest) {
			if (!dest) {
				dest = mat3.create();
			}
			dest[0] = 1;
			dest[1] = 0;
			dest[2] = 0;
			dest[3] = 0;
			dest[4] = 1;
			dest[5] = 0;
			dest[6] = 0;
			dest[7] = 0;
			dest[8] = 1;
			return dest;
		};

		/**
		 * Transposes a 3x3-matrix (flips the values over the diagonal)
		 *
		 * Params:
		 * @param {Float32Array} mat 3x3-matrix to transpose
		 * @param {Float32Array} [dest] 3x3-matrix receiving transposed values. If not specified result is written to mat
		 *
		 * @returns {Float32Array} dest is specified, mat otherwise
		 */
		mat3.transpose = function (mat, dest) {
			// If we are transposing ourselves we can skip a few steps but have to cache some values
			if (!dest || mat === dest) {
				var a01 = mat[1], a02 = mat[2],
					a12 = mat[5];

				mat[1] = mat[3];
				mat[2] = mat[6];
				mat[3] = a01;
				mat[5] = mat[7];
				mat[6] = a02;
				mat[7] = a12;
				return mat;
			}

			dest[0] = mat[0];
			dest[1] = mat[3];
			dest[2] = mat[6];
			dest[3] = mat[1];
			dest[4] = mat[4];
			dest[5] = mat[7];
			dest[6] = mat[2];
			dest[7] = mat[5];
			dest[8] = mat[8];
			return dest;
		};

		/**
		 * Copies the elements of a 3x3-matrix into the upper 3x3 elements of a 4x4-matrix
		 *
		 * @param {Float32Array} mat 3x3-matrix containing values to copy
		 * @param {Float32Array} [dest] 4x4-matrix receiving copied values
		 *
		 * @returns {Float32Array} dest if specified, a new 4x4-matrix otherwise
		 */
		mat3.toMat4 = function (mat, dest) {
			if (!dest) {
				dest = Types.createFloatArray( 16 );
			}

			dest[15] = 1;
			dest[14] = 0;
			dest[13] = 0;
			dest[12] = 0;

			dest[11] = 0;
			dest[10] = mat[8];
			dest[9] = mat[7];
			dest[8] = mat[6];

			dest[7] = 0;
			dest[6] = mat[5];
			dest[5] = mat[4];
			dest[4] = mat[3];

			dest[3] = 0;
			dest[2] = mat[2];
			dest[1] = mat[1];
			dest[0] = mat[0];

			return dest;
		};

		/**
		 * Returns a string representation of a 3x3-matrix
		 *
		 * @param {Float32Array} mat 3x3-matrix to represent as a string
		 *
		 * @returns {string} String representation of mat
		 */
		mat3.str = function (mat) {
			return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] +
				', ' + mat[3] + ', ' + mat[4] + ', ' + mat[5] +
				', ' + mat[6] + ', ' + mat[7] + ', ' + mat[8] + ']';
		};

		/**
		 * Translates a matrix by the given vector
		 *
		 * @param {Float32Array} mat 3x3-matrix to translate
		 * @param {Float32Array} vec 2d-vector specifying the translation
		 * @param {Float32Array} [dest] 3x3-matrix receiving operation result. If not specified result is written to mat
		 *
		 * @returns {Float32Array} dest if specified, mat otherwise
		 */
		mat3.translate = function (mat, vec, dest) {
			var x = vec[0], y = vec[1],
				a00, a01, a02,
				a10, a11, a12;

			if (!dest || mat === dest) {
				mat[6] = mat[0] * x + mat[3] * y + mat[6];
				mat[7] = mat[1] * x + mat[4] * y + mat[7];
				mat[8] = mat[2] * x + mat[5] * y + mat[8];
				return mat;
			}

			a00 = mat[0];
			a01 = mat[3];
			a02 = mat[6];
			a10 = mat[1];
			a11 = mat[4];
			a12 = mat[7];

			dest[0] = a00;
			dest[3] = a01;
			dest[6] = a02;
			dest[1] = a10;
			dest[4] = a11;
			dest[7] = a12;

			dest[6] = a00 * x + a10 * y + mat[6];
			dest[7] = a01 * x + a11 * y + mat[7];
			dest[8] = a02 * x + a12 * y + mat[8];
			return dest;
		};

		/**
		 * Scales a 3x3-matrix by the given 3d-vector
		 *
		 * @param {Float32Array} mat 3x3-matrix to scale
		 * @param {Float32Array} vec 2d-vector specifying the scale for each axis
		 * @param {Float32Array} [dest] 3x3-matrix receiving operation result. If not specified result is written to mat
		 *
		 * @returns {Float32Array} dest if specified, mat otherwise
		 */
		mat3.scale = function (mat, vec, dest) {
			var x = vec[0], y = vec[1];

			if (!dest || mat === dest) {
				mat[0] *= x;
				mat[1] *= x;
				mat[2] *= x;
				mat[3] *= y;
				mat[4] *= y;
				mat[5] *= y;
				return mat;
			}

			dest[0] = mat[0] * x;
			dest[1] = mat[1] * x;
			dest[2] = mat[2] * x;
			dest[3] = mat[3] * y;
			dest[4] = mat[4] * y;
			dest[5] = mat[5] * y;
			dest[6] = mat[6];
			dest[7] = mat[7];
			dest[8] = mat[8];
			return dest;
		};

		/**
		 * Rotates a 3x3-matrix by the given angle
		 *
		 * @param {Float32Array} mat 3x3-matrix to rotate
		 * @param {Number} angle Angle (in radians) to rotate
		 * @param {Float32Array} [dest] 3x3-matrix receiving operation result. If not specified result is written to mat
		 *
		 * @returns {Float32Array} dest if specified, mat otherwise
		 */
		mat3.rotate = function (mat, angle, dest) {
			if (!dest) {
				dest = mat;
			}

			var sine   = Math.sin( -angle ),
				cosine = Math.cos( -angle ),
				a00    = mat[ 0 ],
				a01    = mat[ 1 ],
				a02    = mat[ 2 ],
				a10    = mat[ 3 ],
				a11    = mat[ 4 ],
				a12    = mat[ 5 ]

			dest[ 0 ] = a00 * cosine + a10 * sine
			dest[ 1 ] = a01 * cosine + a11 * sine
			dest[ 2 ] = a02 * cosine + a12 * sine
			dest[ 3 ] = a00 * -sine  + a10 * cosine
			dest[ 4 ] = a01 * -sine  + a11 * cosine
			dest[ 5 ] = a02 * -sine  + a12 * cosine
			return dest;
		};

		/**
		 * Generates a orthogonal projection matrix with the given bounds
		 *
		 * @param {Number} left Left bound of the frustum
		 * @param {Number} right Right bound of the frustum
		 * @param {Number} bottom Bottom bound of the frustum
		 * @param {Number} top Top bound of the frustum
		 * @param {Float32Array} [dest] 3x3 frustum matrix will be written into
		 *
		 * @returns {Float32Array} dest if specified, a new 3x3-matrix otherwise
		 */
		mat3.ortho = function (left, right, bottom, top, dest) {
			if (!dest) {
				dest = mat3.create();
			}
			var rl = (right - left),
				tb = (top - bottom);
			dest[0] = 2 / rl;
			dest[1] = 0;
			dest[2] = 0;
			dest[3] = 0;
			dest[4] = 2 / tb;
			dest[5] = 0;
			dest[6] = -(left + right) / rl;
			dest[7] = -(top + bottom) / tb;
			dest[8] = 1;
			return dest;
		};

		return mat3;
	}
)

/*
 * This class is derived from glmatrix 1.3.7. Original Licence follows:
 *
 * Copyright (c) 2012 Brandon Jones, Colin MacKenzie IV
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 * 1. The origin of this software must not be misrepresented; you must not
 * claim that you wrote the original software. If you use this software
 * in a product, an acknowledgment in the product documentation would be
 * appreciated but is not required.
 *
 * 2. Altered source versions must be plainly marked as such, and must not
 * be misrepresented as being the original software.
 *
 * 3. This notice may not be removed or altered from any source
 * distribution.
 */

/**
 * **This class implements high performance 4 dimensional vector math.**
 *
 * Example usage:
 *
 *     var vecA = vec2.{@link #createFrom}(1, 2, 3, 4);
 *     //=> vecA is now a Float32Array with [1,2,3,4]
 *
 *     var vecB = vec2.{@link #create}([3, 4, 5, 6]);
 *     //=> vecB is now a Float32Array with [3,4,5,6], The original array has been converted to a Float32Array.
 *
 *     var vecC = vec2.{@link #add}(vecA, vecB);
 *     //=> vecB = vecC is now [4, 6, 8, 10]. VecB has been overriden because we provided no destination vector as third argument..
 *
 *     var vecD = vec2.{@link #create}();
 *     //=> Allocate a new empty Float32Array with [0, 0, 0, 0]
 *
 *     var vecD = vec2.{@link #add}(vecA, vecB, vecD);
 *     //=> vecA and vecB are not touched, the result is written in vecD = [5,8,11,14]
 *
 * Please note: This object does not hold the vector components itself, it defines helper functions which manipulate
 * highly optimized data structures. This is done for performance reasons. **You need to allocate new vectors
 * with the {@link #create} or {@link #createFrom} function. Don't try to allocate new vectors yourself, always use
 * these function to do so.**
 *
 * *This class is derived from [glMatrix](https://github.com/toji/gl-matrix) 1.3.7 originally written by Brandon Jones
 * and Colin MacKenzie IV. The original BSD licence is included in the source file of this class.*
 *
 * @class spell.math.vec4
 * @singleton
 * @requires Math
 * @requires spell.shared.util.platform.Types
 */
define(
	"spell/math/vec4",
	[
		"spell/shared/util/platform/Types"
	],
	function (Types) {

		"use strict";
		var createFloatArray = Types.createFloatArray;

		// Tweak to your liking
		var FLOAT_EPSILON = 0.000001;

		var vec4 = {};

		/**
		 * Creates a new 4d-vector, initializing it from vec if vec
		 * is given.
		 *
		 * @param {Array} [vec] the vector's initial contents
		 * @returns {Float32Array} a new 4d-vector
		 */
		vec4.create = function (vec) {
			var dest = createFloatArray(4);

			if (vec) {
				dest[0] = vec[0];
				dest[1] = vec[1];
				dest[2] = vec[2];
				dest[3] = vec[3];
			} else {
				dest[0] = 0;
				dest[1] = 0;
				dest[2] = 0;
				dest[3] = 0;
			}
			return dest;
		};

		/**
		 * Creates a new instance of a 4d-vector, initializing it with the given arguments
		 *
		 * @param {number} x X value
		 * @param {number} y Y value
		 * @param {number} z Z value
		 * @param {number} w W value
		 * @returns {Float32Array} New 4d-vector
		 */
		vec4.createFrom = function (x, y, z, w) {
			var dest = createFloatArray(4);

			dest[0] = x;
			dest[1] = y;
			dest[2] = z;
			dest[3] = w;

			return dest;
		};

		/**
		 * Adds the 4d-vector's together. If dest is given, the result
		 * is stored there. Otherwise, the result is stored in vecB.
		 *
		 * @param {Float32Array} vecA the first 4d-vector
		 * @param {Float32Array} vecB the second 4d-vector
		 * @param {Float32Array} [dest] the optional receiving 4d-vector
		 * @returns {Float32Array} dest 4d-vector
		 */
		vec4.add = function (vecA, vecB, dest) {
			if (!dest) dest = vecB;
			dest[0] = vecA[0] + vecB[0];
			dest[1] = vecA[1] + vecB[1];
			dest[2] = vecA[2] + vecB[2];
			dest[3] = vecA[3] + vecB[3];
			return dest;
		};

		/**
		 * Subtracts vecB from vecA. If dest is given, the result
		 * is stored there. Otherwise, the result is stored in vecB.
		 *
		 * @param {Float32Array} vecA the first 4d-vector
		 * @param {Float32Array} vecB the second 4d-vector
		 * @param {Float32Array} [dest] the optional receiving 4d-vector
		 * @returns {Float32Array} dest 4d-vector
		 */
		vec4.subtract = function (vecA, vecB, dest) {
			if (!dest) dest = vecB;
			dest[0] = vecA[0] - vecB[0];
			dest[1] = vecA[1] - vecB[1];
			dest[2] = vecA[2] - vecB[2];
			dest[3] = vecA[3] - vecB[3];
			return dest;
		};

		/**
		 * Multiplies vecA with vecB. If dest is given, the result
		 * is stored there. Otherwise, the result is stored in vecB.
		 *
		 * @param {Float32Array} vecA the first 4d-vector
		 * @param {Float32Array} vecB the second 4d-vector
		 * @param {Float32Array} [dest] the optional receiving 4d-vector
		 * @returns {Float32Array} dest 4d-vector
		 */
		vec4.multiply = function (vecA, vecB, dest) {
			if (!dest) dest = vecB;
			dest[0] = vecA[0] * vecB[0];
			dest[1] = vecA[1] * vecB[1];
			dest[2] = vecA[2] * vecB[2];
			dest[3] = vecA[3] * vecB[3];
			return dest;
		};

		/**
		 * Divides vecA by vecB. If dest is given, the result
		 * is stored there. Otherwise, the result is stored in vecB.
		 *
		 * @param {Float32Array} vecA the first 4d-vector
		 * @param {Float32Array} vecB the second 4d-vector
		 * @param {Float32Array} [dest] the optional receiving 4d-vector
		 * @returns {Float32Array} dest 4d-vector
		 */
		vec4.divide = function (vecA, vecB, dest) {
			if (!dest) dest = vecB;
			dest[0] = vecA[0] / vecB[0];
			dest[1] = vecA[1] / vecB[1];
			dest[2] = vecA[2] / vecB[2];
			dest[3] = vecA[3] / vecB[3];
			return dest;
		};

		/**
		 * Scales vecA by some scalar number. If dest is given, the result
		 * is stored there. Otherwise, the result is stored in vecA.
		 *
		 * This is the same as multiplying each component of vecA
		 * by the given scalar.
		 *
		 * @param {Float32Array} vecA the vector to be scaled
		 * @param {Number} scalar the amount to scale the vector by
		 * @param {Float32Array} [dest] the optional receiving vector
		 * @returns {Float32Array} dest
		 */
		vec4.scale = function (vecA, scalar, dest) {
			if (!dest) dest = vecA;
			dest[0] = vecA[0] * scalar;
			dest[1] = vecA[1] * scalar;
			dest[2] = vecA[2] * scalar;
			dest[3] = vecA[3] * scalar;
			return dest;
		};

		/**
		 * Copies the values of one 4d-vector to another
		 *
		 * @param {Float32Array} vec 4d-vector containing values to copy
		 * @param {Float32Array} dest 4d-vector receiving copied values
		 *
		 * @returns {Float32Array} dest
		 */
		vec4.set = function (vec, dest) {
			dest[0] = vec[0];
			dest[1] = vec[1];
			dest[2] = vec[2];
			dest[3] = vec[3];
			return dest;
		};

		/**
		 * Compares two vectors for equality within a certain margin of error
		 *
		 * @param {Float32Array} a First 4d-vector
		 * @param {Float32Array} b Second 4d-vector
		 *
		 * @returns {Boolean} True if a is equivalent to b
		 */
		vec4.equal = function (a, b) {
			return a === b || (
				Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
					Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
					Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
					Math.abs(a[3] - b[3]) < FLOAT_EPSILON
				);
		};

		/**
		 * Negates the components of a 4d-vector
		 *
		 * @param {Float32Array} vec 4d-vector to negate
		 * @param {Float32Array} [dest] 4d-vector receiving operation result. If not specified result is written to vec
		 *
		 * @returns {Float32Array} dest if specified, vec otherwise
		 */
		vec4.negate = function (vec, dest) {
			if (!dest) {
				dest = vec;
			}
			dest[0] = -vec[0];
			dest[1] = -vec[1];
			dest[2] = -vec[2];
			dest[3] = -vec[3];
			return dest;
		};

		/**
		 * Caclulates the length of a 4d-vector
		 *
		 * @param {Float32Array} vec 4d-vector to calculate length of
		 *
		 * @returns {Number} Length of 4d-vector
		 */
		vec4.length = function (vec) {
			var x = vec[0], y = vec[1], z = vec[2], w = vec[3];
			return Math.sqrt(x * x + y * y + z * z + w * w);
		};

		/**
		 * Caclulates the squared length of a 4d-vector
		 *
		 * @param {Float32Array} vec 4d-vector to calculate squared length of
		 *
		 * @returns {Number} Squared Length of 4d-vector
		 */
		vec4.squaredLength = function (vec) {
			var x = vec[0], y = vec[1], z = vec[2], w = vec[3];
			return x * x + y * y + z * z + w * w;
		};

		/**
		 * Performs a linear interpolation between two 4d-vector
		 *
		 * @param {Float32Array} vecA First 4d-vector
		 * @param {Float32Array} vecB Second 4d-vector
		 * @param {Number} lerp Interpolation amount between the two inputs
		 * @param {Float32Array} [dest] 4d-vector receiving operation result. If not specified result is written to vecA
		 *
		 * @returns {Float32Array} dest if specified, vecA otherwise
		 */
		vec4.lerp = function (vecA, vecB, lerp, dest) {
			if (!dest) {
				dest = vecA;
			}
			dest[0] = vecA[0] + lerp * (vecB[0] - vecA[0]);
			dest[1] = vecA[1] + lerp * (vecB[1] - vecA[1]);
			dest[2] = vecA[2] + lerp * (vecB[2] - vecA[2]);
			dest[3] = vecA[3] + lerp * (vecB[3] - vecA[3]);
			return dest;
		};

		/**
		 * Returns a string representation of a 4d-vector
		 *
		 * @param {Float32Array} vec 4d-vector to represent as a string
		 *
		 * @returns {String} String representation of 4d-vector
		 */
		vec4.str = function (vec) {
			return '[' + vec[0] + ', ' + vec[1] + ', ' + vec[2] + ', ' + vec[3] + ']';
		};


		return vec4;
	})

/*
 * This class is derived from glmatrix 1.3.7. Original Licence follows:
 *
 * Copyright (c) 2012 Brandon Jones, Colin MacKenzie IV
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 * 1. The origin of this software must not be misrepresented; you must not
 * claim that you wrote the original software. If you use this software
 * in a product, an acknowledgment in the product documentation would be
 * appreciated but is not required.
 *
 * 2. Altered source versions must be plainly marked as such, and must not
 * be misrepresented as being the original software.
 *
 * 3. This notice may not be removed or altered from any source
 * distribution.
 */

/**
 * **This class implements high performance 2 dimensional vector math.**
 *
 * Example usage:
 *
 *     var vecA = vec2.{@link #createFrom}(1, 2);
 *     //=> vecA is now a Float32Array with [1,2]
 *
 *     var vecB = vec2.{@link #create}([3, 4]);
 *     //=> vecB is now a Float32Array with [3,4], The original array has been converted to a Float32Array.
 *
 *     var vecC = vec2.{@link #add}(vecA, vecB);
 *     //=> vecB = vecC is now [4, 6]. VecB has been overriden because we provided no destination vector as third argument..
 *
 *     var vecD = vec2.{@link #create}();
 *     //=> Allocate a new empty Float32Array with [0, 0]
 *
 *     var vecD = vec2.{@link #add}(vecA, vecB, vecD);
 *     //=> vecA and vecB are not touched, the result is written in vecD = [5, 8]
 *
 *
 *     // you need to allocate a temporary vec2 if you want to chain vec2 operations
 *     var tmpVec2 = vec2.{@link #create}()
 *
 *     // the result of the scale operation is written to tmpVec2 and is being used
 *     // as second argument for vec2.{@link #subtract}, because vec2.{@link #scale} also returns tmpVec2
 *     // after that positionB - tmpVec2 is written to positionB
 *
 *     vec2.{@link #subtract}(
 *       positionB,
 *       vec2.{@link #scale}( positionA, 0.05, tmpVec2 ),
 *       positionB
 *     )
 *
 *     //=> result is positionB = positionB - scale(positionA, 0.05)
 *
 *
 * Please note: This object does not hold the vector components itself, it defines helper functions which manipulate
 * highly optimized data structures. This is done for performance reasons. **You need to allocate new vectors
 * with the {@link #create} or {@link #createFrom} function. Don't try to allocate new vectors yourself, always use
 * these function to do so.**
 *
 *
 * *This class is derived from [glMatrix](https://github.com/toji/gl-matrix) 1.3.7 originally written by Brandon Jones
 * and Colin MacKenzie IV. The original BSD licence is included in the source file of this class.*
 *
 * @class spell.math.vec2
 * @singleton
 * @requires Math
 * @requires spell.shared.util.platform.Types
 */
define(
	"spell/math/vec2",
	["spell/shared/util/platform/Types"],
	function (Types) {
		"use strict"

		var createFloatArray = Types.createFloatArray;

		// Tweak to your liking
		var FLOAT_EPSILON = 0.000001;

		var vec2 = {};

		/**
		 * Creates a new vec2, initializing it from vec if vec
		 * is given.
		 *
		 * @param {Array} [vec] Array-like datascructure with the vector's initial contents
		 * @returns {Float32Array} a new 2D vector
		 */
		vec2.create = function (vec) {
			var dest = createFloatArray(2);

			if (vec) {
				dest[0] = vec[0];
				dest[1] = vec[1];
			} else {
				dest[0] = 0;
				dest[1] = 0;
			}
			return dest;
		};

		/**
		 * Creates a new instance of a vec2, initializing it with the given arguments
		 *
		 * @param {number} x X value
		 * @param {number} y Y value

		 * @returns {Float32Array} New vec2
		 */
		vec2.createFrom = function (x, y) {
			var dest = createFloatArray(2);

			dest[0] = x;
			dest[1] = y;

			return dest;
		};

		/**
		 * Adds the vec2's together. If dest is given, the result
		 * is stored there. Otherwise, the result is stored in vecB.
		 *
		 * @param {Float32Array} vecA the first operand
		 * @param {Float32Array} vecB the second operand
		 * @param {Float32Array} [dest] the optional receiving vector
		 * @returns {Float32Array} dest
		 */
		vec2.add = function (vecA, vecB, dest) {
			if (!dest) dest = vecB;
			dest[0] = vecA[0] + vecB[0];
			dest[1] = vecA[1] + vecB[1];
			return dest;
		};

		/**
		 * Subtracts vecB from vecA. If dest is given, the result
		 * is stored there. Otherwise, the result is stored in vecB.
		 *
		 * @param {Float32Array} vecA the first operand
		 * @param {Float32Array} vecB the second operand
		 * @param {Float32Array} [dest] the optional receiving vector
		 * @returns {Float32Array} dest
		 */
		vec2.subtract = function (vecA, vecB, dest) {
			if (!dest) dest = vecB;
			dest[0] = vecA[0] - vecB[0];
			dest[1] = vecA[1] - vecB[1];
			return dest;
		};

		/**
		 * Multiplies vecA with vecB. If dest is given, the result
		 * is stored there. Otherwise, the result is stored in vecB.
		 *
		 * @param {Float32Array} vecA the first operand
		 * @param {Float32Array} vecB the second operand
		 * @param {Float32Array} [dest] the optional receiving vector
		 * @returns {Float32Array} dest
		 */
		vec2.multiply = function (vecA, vecB, dest) {
			if (!dest) dest = vecB;
			dest[0] = vecA[0] * vecB[0];
			dest[1] = vecA[1] * vecB[1];
			return dest;
		};

		/**
		 * Divides vecA by vecB. If dest is given, the result
		 * is stored there. Otherwise, the result is stored in vecB.
		 *
		 * @param {Float32Array} vecA the first operand
		 * @param {Float32Array} vecB the second operand
		 * @param {Float32Array} [dest] the optional receiving vector
		 * @returns {Float32Array} dest
		 */
		vec2.divide = function (vecA, vecB, dest) {
			if (!dest) dest = vecB;
			dest[0] = vecA[0] / vecB[0];
			dest[1] = vecA[1] / vecB[1];
			return dest;
		};

		/**
		 * Scales vecA by some scalar number. If dest is given, the result
		 * is stored there. Otherwise, the result is stored in vecA.
		 *
		 * This is the same as multiplying each component of vecA
		 * by the given scalar.
		 *
		 * @param {Float32Array} vecA the vector to be scaled
		 * @param {number} scalar the amount to scale the vector by
		 * @param {Float32Array} [dest] the optional receiving vector
		 * @returns {Float32Array} dest
		 */
		vec2.scale = function (vecA, scalar, dest) {
			if (!dest) dest = vecA;
			dest[0] = vecA[0] * scalar;
			dest[1] = vecA[1] * scalar;
			return dest;
		};

		/**
		 * Calculates the euclidian distance between two vec2
		 *
		 * Params:
		 * @param {Float32Array} vecA First vector
		 * @param {Float32Array} vecB Second vector
		 *
		 * @returns {number} Distance between vecA and vecB
		 */
		vec2.dist = function (vecA, vecB) {
			var x = vecB[0] - vecA[0],
				y = vecB[1] - vecA[1];
			return Math.sqrt(x * x + y * y);
		};

		/**
		 * Copies the values of one vec2 to another
		 *
		 * @param {Float32Array} vec vec2 containing values to copy
		 * @param {Float32Array} dest vec2 receiving copied values
		 *
		 * @returns {Float32Array} dest
		 */
		vec2.set = function (vec, dest) {
			dest[0] = vec[0];
			dest[1] = vec[1];
			return dest;
		};

		/**
		 * Compares two vectors for equality within a certain margin of error
		 *
		 * @param {Float32Array} a First vector
		 * @param {Float32Array} b Second vector
		 *
		 * @returns {Boolean} True if a is equivalent to b
		 */
		vec2.equal = function (a, b) {
			return a === b || (
				Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
					Math.abs(a[1] - b[1]) < FLOAT_EPSILON
				);
		};

		/**
		 * Negates the components of a vec2
		 *
		 * @param {Float32Array} vec vec2 to negate
		 * @param {Float32Array} [dest] vec2 receiving operation result. If not specified result is written to vec
		 *
		 * @returns {Float32Array} dest if specified, vec otherwise
		 */
		vec2.negate = function (vec, dest) {
			if (!dest) {
				dest = vec;
			}
			dest[0] = -vec[0];
			dest[1] = -vec[1];
			return dest;
		};

		/**
		 * Normlize a vec2
		 *
		 * @param {Float32Array} vec vec2 to normalize
		 * @param {Float32Array} [dest] vec2 receiving operation result. If not specified result is written to vec
		 *
		 * @returns {Float32Array} dest if specified, vec otherwise
		 */
		vec2.normalize = function (vec, dest) {
			if (!dest) {
				dest = vec;
			}
			var mag = vec[0] * vec[0] + vec[1] * vec[1];
			if (mag > 0) {
				mag = Math.sqrt(mag);
				dest[0] = vec[0] / mag;
				dest[1] = vec[1] / mag;
			} else {
				dest[0] = dest[1] = 0;
			}
			return dest;
		};

		/**
		 * Computes the cross product of two vec2's. Note that the cross product must by definition
		 * produce a 3D vector. If a dest vector is given, it will contain the resultant 3D vector.
		 * Otherwise, a scalar number will be returned, representing the vector's Z coordinate, since
		 * its X and Y must always equal 0.
		 *
		 * Examples:
		 *     var crossResult = vec3.create();
		 *     vec2.cross([1, 2], [3, 4], crossResult);
		 *     //=> [0, 0, -2]
		 *
		 *     vec2.cross([1, 2], [3, 4]);
		 *     //=> -2
		 *
		 * See [this page](http://stackoverflow.com/questions/243945/calculating-a-2d-vectors-cross-product)
		 * for some interesting facts.
		 *
		 * @param {Float32Array} vecA left operand
		 * @param {Float32Array} vecB right operand
		 * @param {Float32Array} [dest] optional vec2 receiving result. If not specified a scalar is returned
		 *
		 */
		vec2.cross = function (vecA, vecB, dest) {
			var z = vecA[0] * vecB[1] - vecA[1] * vecB[0];
			if (!dest) return z;
			dest[0] = dest[1] = 0;
			dest[2] = z;
			return dest;
		};

		/**
		 * Caclulates the length of a vec2
		 *
		 * @param {Float32Array} vec vec2 to calculate length of
		 *
		 * @returns {Number} Length of vec
		 */
		vec2.length = function (vec) {
			var x = vec[0], y = vec[1];
			return Math.sqrt(x * x + y * y);
		};

		/**
		 * Caclulates the squared length of a vec2
		 *
		 * @param {Float32Array} vec vec2 to calculate squared length of
		 *
		 * @returns {Number} Squared Length of vec
		 */
		vec2.squaredLength = function (vec) {
			var x = vec[0], y = vec[1];
			return x * x + y * y;
		};

		/**
		 * Caclulates the dot product of two vec2s
		 *
		 * @param {Float32Array} vecA First operand
		 * @param {Float32Array} vecB Second operand
		 *
		 * @returns {Number} Dot product of vecA and vecB
		 */
		vec2.dot = function (vecA, vecB) {
			return vecA[0] * vecB[0] + vecA[1] * vecB[1];
		};

		/**
		 * Generates a 2D unit vector pointing from one vector to another
		 *
		 * @param {Float32Array} vecA Origin vec2
		 * @param {Float32Array} vecB vec2 to point to
		 * @param {Float32Array} [dest] vec2 receiving operation result. If not specified result is written to vecA
		 *
		 * @returns {Float32Array} dest if specified, vecA otherwise
		 */
		vec2.direction = function (vecA, vecB, dest) {
			if (!dest) {
				dest = vecA;
			}

			var x = vecA[0] - vecB[0],
				y = vecA[1] - vecB[1],
				len = x * x + y * y;

			if (!len) {
				dest[0] = 0;
				dest[1] = 0;
				dest[2] = 0;
				return dest;
			}

			len = 1 / Math.sqrt(len);
			dest[0] = x * len;
			dest[1] = y * len;
			return dest;
		};

		/**
		 * Performs a linear interpolation between two vec2
		 *
		 * @param {Float32Array} vecA First vector
		 * @param {Float32Array} vecB Second vector
		 * @param {Number} lerp Interpolation amount between the two inputs
		 * @param {Float32Array} [dest] vec2 receiving operation result. If not specified result is written to vecA
		 *
		 * @returns {Float32Array} dest if specified, vecA otherwise
		 */
		vec2.lerp = function (vecA, vecB, lerp, dest) {
			if (!dest) {
				dest = vecA;
			}
			dest[0] = vecA[0] + lerp * (vecB[0] - vecA[0]);
			dest[1] = vecA[1] + lerp * (vecB[1] - vecA[1]);
			return dest;
		};

		/**
		 * Returns a string representation of a vector
		 *
		 * @param {Float32Array} vec Vector to represent as a string
		 *
		 * @returns {String} String representation of vec
		 */
		vec2.str = function (vec) {
			return '[' + vec[0] + ', ' + vec[1] + ']';
		};


		return vec2;
	}
)

define(
	'spell/client/2d/graphics/drawText',
	function() {
		'use strict'


		/**
		 * Draws a character on a context.
		 *
		 * @param context
		 * @param texture
		 * @param charData
		 * @param dx
		 * @param dy
		 * @param spacing the actual spacing to be used
		 * @param fontMapSpacing the fake spacing introduced by the font map
		 */
		var drawCharacter = function( context, texture, charData, dx, dy, spacing, fontMapSpacing ) {
			var doubledFontMapSpacing = fontMapSpacing * 2,
				width                 = charData.width,
				height                = charData.height

			context.drawSubTexture(
				texture,
				charData.x - fontMapSpacing,
				charData.y,
				width + doubledFontMapSpacing,
				height,
				dx - fontMapSpacing,
				dy,
				width + doubledFontMapSpacing,
				height
			)

			return charData.width + spacing + fontMapSpacing
		}

		return function( context, fontAsset, fontTexture, dx, dy, text, spacing ) {
			spacing = spacing || 0
			text    = text.toString()

			var numCharacters  = text.length,
				charset        = fontAsset.config.charset,
				fontMapSpacing = fontAsset.config.spacing

			for( var i = 0; i < numCharacters; i++ ) {
				var charData = charset[ text[ i ] ]

				// in case of unsupported character perform a fallback
				if( !charData ) {
					charData = charset[ ' ' ]
				}

				dx += drawCharacter( context, fontTexture, charData, dx, dy, spacing, fontMapSpacing )
			}
		}
    }
)

define(
	'spell/client/2d/graphics/drawCoordinateGrid',
	[
		'spell/client/2d/graphics/drawText',

		'spell/math/vec2',
		'spell/math/vec4',
		'spell/math/mat3'
	],
	function(
		drawText,

		vec2,
		vec4,
		mat3
	) {
		'use strict'


		var tmpMat3         = mat3.identity(),
			invScale        = vec2.create(),
			lineOpacity     = 0.5,
			paleLineColor   = vec4.create( [ 0.4, 0.4, 0.4, lineOpacity ] ),
			brightLineColor = vec4.create( [ 0.7, 0.7, 0.7, lineOpacity ] ),
			XAxisColor      = vec4.create( [ 0, 0, 0.7, lineOpacity ] ),
			YAxisColor      = vec4.create( [ 0, 0.7, 0, lineOpacity ] )

		var computeGridLineStepSize = function( s ) {
		    var log = Math.log( s ) / Math.log( 10 )
		    var exp = Math.round( log )

		    return Math.pow( 10, exp - 1 )
		}

		var computeGridStart = function( value, stepSize ) {
			var rest = value % stepSize

			return ( rest !== 0 ?
				( value > 0 ?
					value - rest + stepSize :
					value - rest
				) :
				value
			)
		}

		var computeNumLines = function( range, stepSize ) {
			return Math.floor( range / stepSize )
		}

		var drawGridLinesY = function( context, fontAsset, fontTexture, height, stepSize, startX, y, invScale, worldToScreenTranslation, numLines ) {
			var nextStepSize = stepSize * 10,
				scaledY = Math.round( ( y + worldToScreenTranslation[ 1  ] ) * invScale),
				scaledX,
				x

			for( var i = 0; i <= numLines; i++ ) {
				x = ( startX + i * stepSize )
				scaledX = Math.round( ( x + worldToScreenTranslation[ 0 ] ) * invScale )

				// determining the color
				context.setFillStyleColor(
					( x === 0 ?
						YAxisColor :
						( x % nextStepSize === 0 ?
							brightLineColor :
							paleLineColor
						)
					)
				)

				// draw line
				context.fillRect( scaledX, scaledY, 1, height )

				// draw label
				drawText( context, fontAsset, fontTexture, scaledX + 3, scaledY, x )
			}
		}

		var drawGridLinesX = function( context, fontAsset, fontTexture, width, stepSize, startY, x, invScale, worldToScreenTranslation, numLines ) {
			var nextStepSize = stepSize * 10,
				scaledX = Math.round( ( x + worldToScreenTranslation[ 0 ] ) * invScale ),
				scaledY,
				y

			for( var i = 0; i <= numLines; i++ ) {
				y = ( startY + i * stepSize )
				scaledY = Math.round( ( y + worldToScreenTranslation[ 1 ] ) * invScale )

				// determining the color
				context.setFillStyleColor(
					( y === 0 ?
						XAxisColor :
						( y % nextStepSize === 0 ?
							brightLineColor :
							paleLineColor
						)
					)
				)

				// draw line
				context.fillRect( scaledX, scaledY, width, 1 )

				// draw label
				drawText( context, fontAsset, fontTexture, scaledX + 3, scaledY, y )
			}
		}

		return function( context, fontAsset, screenSize, cameraDimensions, cameraTransform ) {
			var position     = cameraTransform.translation,
				cameraWidth  = cameraDimensions[ 0 ],
				cameraHeight = cameraDimensions[ 1 ],
				minX         = position[ 0 ] - cameraWidth / 2,
				minY         = position[ 1 ] - cameraHeight / 2,
				maxX         = minX + cameraWidth,
				maxY         = minY + cameraHeight,
				stepSize     = computeGridLineStepSize( cameraWidth ),
				worldToScreenTranslation = [ -minX, -minY ],
				fontTexture  = fontAsset.resource

			vec2.divide( screenSize, cameraDimensions, invScale )

			context.save()
			{
				// world to view matrix
				mat3.ortho( 0, screenSize[ 0 ], 0, screenSize[ 1 ], tmpMat3 )

				context.setViewMatrix( tmpMat3 )

				// grid lines parallel to y-axis
				drawGridLinesY(
					context,
					fontAsset,
					fontTexture,
					screenSize[ 1 ],
					stepSize,
					computeGridStart( minX, stepSize ),
					minY,
					invScale[ 1 ],
					worldToScreenTranslation,
					computeNumLines( cameraWidth, stepSize )
				)

				// grid lines parallel to x-axis
				drawGridLinesX(
					context,
					fontAsset,
					fontTexture,
					screenSize[ 0 ],
					stepSize,
					computeGridStart( minY, stepSize ),
					minX,
					invScale[ 0 ],
					worldToScreenTranslation,
					computeNumLines( cameraHeight, stepSize )
				)
			}
			context.restore()
		}
	}
)

/**
 * This module acts as a static include list for modules that must be included in the engine library even though they are not used by the engine itself. This is
 * the case for certain math modules or similar modules which are useful for end users/developers.
 */

define(
	'spell/client/staticInclude',
	[
		'spell/client/2d/graphics/drawCoordinateGrid',
		'spell/math/mat2',
		'spell/math/mat3',
		'spell/math/mat4',
		'spell/math/quat4',
		'spell/math/util',
		'spell/math/vec2',
		'spell/math/vec3',
		'spell/math/vec4',
		'spell/math/random/XorShift32',
		'spell/shared/util/createEntityEach'
	],
	function() {
		return undefined
	}
)

/**
 * @class spell.shared.util.platform.Types
 */
define(
	'spell/shared/util/platform/Types',
	[
		'spell/shared/util/platform/private/nativeType/createFloatArray',
		'spell/shared/util/platform/private/nativeType/createIntegerArray',
		'spell/shared/util/platform/private/nativeType/hasFloatArraySupport',
		'spell/shared/util/platform/private/nativeType/hasIntegerArraySupport',
		'spell/shared/util/platform/private/Time'
	],
	function(
		createFloatArray,
		createIntegerArray,
		hasFloatArraySupport,
		hasIntegerArraySupport,
		Time
	) {
		'use strict'

		return {
			createFloatArray       : createFloatArray,
			createIntegerArray     : createIntegerArray,
			hasFloatArraySupport   : hasFloatArraySupport,
			hasIntegerArraySupport : hasIntegerArraySupport,
			Time                   : Time
		}
	}
)

/**
 * Utility class which implements (high speed) math functions
 * @singleton
 * @class spell.math.util
 */

define("spell/math/util",
	["spell/shared/util/platform/Types"],

	function (Types) {
		"use strict";


		var mathUtil = {};

		var createFloatArray = Types.createFloatArray;

		// Tweak to your liking
		var FLOAT_EPSILON = 0.000001;

		if (Types.hasFloatArraySupport()) {
			var y = Types.createFloatArray(1);
			var i = Types.createIntegerArray(y.buffer);

			/**
			 * Fast way to calculate the inverse square root,
			 * see [this page](http://jsperf.com/inverse-square-root/5)
			 *
			 * If typed arrays are not available, a slower
			 * implementation will be used.
			 *
			 * @param {Number} number the number
			 * @returns {Number} Inverse square root
			 */
			mathUtil.invsqrt = function (number) {
				var x2 = number * 0.5;
				y[0] = number;
				var threehalfs = 1.5;

				i[0] = 0x5f3759df - (i[0] >> 1);

				var number2 = y[0];

				return number2 * (threehalfs - (x2 * number2 * number2));
			};
		} else {
			mathUtil.invsqrt = function (number) {
				return 1.0 / Math.sqrt(number);
			}
		}

		mathUtil.clamp = function( value, lowerBound, upperBound ) {
			if ( value < lowerBound) return lowerBound;
			if ( value > upperBound) return upperBound;

			return value;
		}

		mathUtil.isInInterval = function( value, lowerBound, upperBound ) {
			return ( value >= lowerBound && value <= upperBound )
		}

		return mathUtil;
	}

);

define(
	'spell/client/util/onScreenResize',
	[
		'spell/math/util',
		'spell/shared/util/Events'
	],
	function(
		mathUtil,
		Events
	) {
		'use strict'


		var constants = {
			minWidth : 320,
			minHeight : 240,
			maxWidth : 1024,
			maxHeight : 768
		}

		return function( eventManager, width, height ) {
			// clamping screen dimensions to allowed range
			width  = mathUtil.clamp( width, constants.minWidth, constants.maxWidth )
			height = mathUtil.clamp( height, constants.minHeight, constants.maxHeight )

			var aspectRatio = width / height

			// correcting aspect ratio
			if( aspectRatio <= ( 4 / 3 ) ) {
				height = Math.floor( width * 3 / 4 )

			} else {
				width = Math.floor( height * 4 / 3 )
			}

			eventManager.publish( Events.SCREEN_RESIZE, [ [ width, height ] ] )
		}
	}
)

define(
	'spell/shared/util/platform/PlatformKit',
	[
		'spell/shared/util/platform/private/callNextFrame',
		'spell/shared/util/platform/private/createHost',
		'spell/shared/util/platform/private/jsonCoder',
		'spell/shared/util/platform/private/createSocket',
		'spell/shared/util/platform/private/graphics/RenderingFactory',
		'spell/shared/util/platform/private/registerTimer',
		'spell/shared/util/platform/private/loader/ImageLoader',
		'spell/shared/util/platform/private/loader/SoundLoader',
		'spell/shared/util/platform/private/loader/TextLoader',
		'spell/shared/util/platform/private/createLoader',
		'spell/shared/util/platform/private/Input',
		'spell/shared/util/platform/private/configurationOptions',
		'spell/shared/util/platform/private/system/features',
        'spell/shared/util/platform/private/graphics/Viewporter',
		'spell/shared/util/platform/private/sound/SoundManager'
	],
	function(
		callNextFrame,
		createHost,
		jsonCoder,
		createSocket,
		RenderingFactory,
		registerTimer,
		ImageLoader,
		SoundLoader,
		TextLoader,
		createLoader,
		Input,
		configurationOptions,
		features,
        Viewporter,
		SoundManager
	) {
		'use strict'


		var getHost = function() {
			return createHost()
		}

		var getPlatformInfo = function() {
			return 'html5'
		}

		var createInput = function( eventManager, Events ) {
			return new Input( eventManager, Events )
		}

        var registerOnScreenResize = function( id, callback ) {
			var viewporter = new Viewporter( id )
			viewporter.renderViewport( callback )
        }

		var createSoundManager = function() {
			return new SoundManager()
		}

		return {
			callNextFrame          : callNextFrame,
			registerTimer          : registerTimer,
			createSocket           : createSocket,
			createSoundManager     : createSoundManager,
			RenderingFactory       : RenderingFactory,
			getHost                : getHost,
			configurationOptions   : configurationOptions,
			getPlatformInfo        : getPlatformInfo,
			jsonCoder              : jsonCoder,
			createInput            : createInput,
			features               : features,
			registerOnScreenResize : registerOnScreenResize,

			createImageLoader : function( eventManager, host, resourceBundleName, resourceUri, loadingCompletedcallback, timedOutCallback, renderingContext ) {
				return createLoader( ImageLoader, eventManager, host, resourceBundleName, resourceUri, loadingCompletedcallback, timedOutCallback, renderingContext )
			},

			createSoundLoader : function( eventManager, host, resourceBundleName, resourceUri, loadingCompletedcallback, timedOutCallback, soundManager ) {
				return createLoader( SoundLoader, eventManager, host, resourceBundleName, resourceUri, loadingCompletedcallback, timedOutCallback, soundManager )
			},

			createTextLoader : function( eventManager, host, resourceBundleName, resourceUri, loadingCompletedcallback, timedOutCallback ) {
				return createLoader( TextLoader, eventManager, host, resourceBundleName, resourceUri, loadingCompletedcallback, timedOutCallback )
			}
		}
	}
)

define(
	'spell/shared/util/createEnumesqueObject',
	[
		'spell/functions'
	],
	function(
		_
	) {
		'use strict'


		/*
		 * Creates an object with the properties defined by the array "keys". Each property has a unique Number.
		 */
		return function( keys ) {
			return _.reduce(
				keys,
				function( memo, key ) {
					memo.result[ key ] = memo.index++

					return memo
				},
				{
					index  : 0,
					result : {}
				}
			).result
		}
	}
)

define(
	'spell/shared/util/Events',
	[
		'spell/shared/util/createEnumesqueObject'
	],
	function(
		createEnumesqueObject
	) {
		'use strict'


		return createEnumesqueObject( [
			// CONNECTION
			'SERVER_CONNECTION_ESTABLISHED',
			'MESSAGE_RECEIVED',

			// clock synchronization
			'CLOCK_SYNC_ESTABLISHED',

			// EventManager
			'SUBSCRIBE',
			'UNSUBSCRIBE',

			// ResourceLoader
			'RESOURCE_PROGRESS',
			'RESOURCE_LOADING_COMPLETED',
			'RESOURCE_ERROR',

			// MISC
			'RENDER_UPDATE',
			'LOGIC_UPDATE',
			'CREATE_SCENE',
			'DESTROY_SCENE',
			'SCREEN_RESIZE'
		] )
	}
)

define(
	'spell/shared/util/platform/functions',
	[
		'spell/shared/util/platform/private/functions'
	],
	function(
		functions
	) {
		return functions
	}
)

/*
 * Licence Notice Underscore.js 1.3.3:
 *
 * Copyright (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * @class spell.functions
 * @singleton
 */
define(
	'spell/functions',
	[
		'spell/shared/util/platform/functions'
	],
	function(
		platformImpl
	) {
		var _ = {}

		/**
		 * Returns *true* if **object** is an Array.
		 *
		 * Examples:
		 *
		 *     (function(){ return _.isArray(arguments); })();
		 *     //=> false
		 *     _.isArray([1,2,3]);
		 *     => true
		 *
		 * @param {Object} object
		 * @returns {Boolean}
		 */
		_.isArray = platformImpl.isArray

		/**
		 * Returns *true* if **value** is an Object.
		 *
		 * Examples:
		 *
		 *     _.isObject({});
		 *     //=> true
		 *     _.isObject(1);
		 *     //=> false
		 *
		 * @param {Object} value
		 * @return {Boolean}
		 */
		_.isObject = platformImpl.isObject

		/**
		 * Return the number of values in the **list**.
		 *
		 * Example:
		 *
		 *     _.size({one : 1, two : 2, three : 3})
		 *     //=> 3
		 *
		 * @param {Object} list
		 * @return {Number}
		 */
		_.size = platformImpl.size

		/**
		 * Converts the **list** (anything that can be iterated over), into a real Array.
		 * Useful for transmuting the arguments object.
		 *
		 * Example:
		 *
		 *     (function(){ return _.toArray(arguments).slice(1); })(1, 2, 3, 4);
		 *     //=> [2, 3, 4]
		 *
		 * @param {Object} list
		 * @return {Array}
		 */
		_.toArray = platformImpl.toArray


		/**
		 * Iterates over a **list** of elements, yielding each in turn to an **iterator** function.
		 * The **iterator** is bound to the **context** object, if one is passed.
		 * Each invocation of **iterator** is called with three arguments:
		 * *(element, index, list)*. If **list** is a JavaScript object,
		 * **iterator**'s arguments will be *(value, key, list)*.
		 *
		 * Example:
		 *     _.each([1, 2, 3], function(num){ alert(num) })
		 *     //=> alerts each number in turn...
		 *     _.each({one : 1, two : 2, three : 3}, function(num, key){ alert(num) })
		 *     //=> alerts each number in turn...
		 *
		 * @param {Array|Object} list An Array or an Object with key/value pairs
		 * @param {Function} iterator Iterator function. The arguments for this function will be *(element, index, list)*
		 * if object is an Array and *(value, key, list)* if it's an Object
		 * @param {Object} [context] The context in which the iterator should be bound to
		 * @returns {void}
		 */
		_.each = platformImpl.each

		/**
		 * Produces a new array of values by mapping each value in **list** through a
		 * transformation function (**iterator**). If **list** is a JavaScript object, **iterator**'s
		 * arguments will be *(value, key, list)*.
		 *
		 * Example:
		 *
		 *     _.map([1, 2, 3], function(num){ return num * 3 })
		 *     //=> [3, 6, 9]
		 *
		 *     _.map({one : 1, two : 2, three : 3}, function(num, key){ return num * 3 })
		 *     //=> [3, 6, 9]
		 *
		 * @param {Array|Object} list An Array or an Object with key/value pairs
		 * @param {Function} iterator Iterator function. The arguments for this function will be *(element, index, list)*
		 * if object is an Array and *(value, key, list)* if it's an Object
		 * @param {Object} [context] The context in which the iterator should be bound to
		 * @returns {Array} Array with the values of **list** mapped through the **iterator** transformation function
		 */
		_.map = platformImpl.map

		/**
		 * Returns the last element of an **array**. Passing **n** will return the last n elements of the array.
		 *
		 * Example:
		 *
		 *     _.last([5, 4, 3, 2, 1]);
		 *     //=> 1
		 *
		 * @param {Array} array
		 * @param {Number} [n]
		 * @return {Array|Object}
		 */
		_.last = platformImpl.last

		/**
		 * Looks through each value in the **list**, returning an array of all the values that pass a
		 * truth test (**iterator**).
		 *
		 * Example:
		 *
		 *     var evens = _.filter([1, 2, 3, 4, 5, 6], function(num){ return num % 2 == 0; });
		 *     //=> [2, 4, 6]
		 *
		 * @param {Array} list
		 * @param {Function} iterator
		 * @param {Object} [context]
		 * @return {Array}
		 */
		_.filter = platformImpl.filter

		/**
		 * Does the object contain the given key?
		 *
		 * Example:
		 *
		 *     _.has({a: 1, b: 2, c: 3}, "b");
		 *     //=> true
		 *
		 * @param {Object} object
		 * @param {String} key
		 * @return {Boolean}
		 */
		_.has = platformImpl.has

		/**
		 * Returns *true* if any of the values in the **list** pass the **iterator** truth test.
		 * Short-circuits and stops traversing the list if a *true* element is found.
		 *
		 * Example:
		 *
		 *     _.any([null, 0, 'yes', false], function(value) { return value; });
		 *     //=> true
		 *
		 * @param {Array} object
		 * @param {Function} iterator
		 * @param [context]
		 * @return {Boolean}
		 */
		_.any = platformImpl.any

		/**
		 * Looks through each value in the **list**, returning the first one that passes a truth test (**iterator**).
		 * The function returns as soon as it finds an acceptable element, and doesn't traverse the entire list.
		 *
		 * Example:
		 *
		 *     var even = _.find([1, 2, 3, 4, 5, 6], function(num){ return num % 2 == 0 })
		 *     //=> 2
		 *
		 * @param {Array} list
		 * @param {Function} iterator
		 * @param {Object} [context]
		 * @return {Object}
		 */
		_.find = platformImpl.find

		/**
		 * Invokes the given **iterator** function *n* times.
		 *
		 * Example:
		 *
		 *     _.times(3, function(){ genie.grantWish(); });
		 *
		 * @param {Number} n
		 * @param {Function} iterator
		 * @param {Object} [context]
		 */
		_.times = platformImpl.times

		/**
		 * Copy all of the properties in the **source** objects over to the **destination** object,
		 * and return the **destination** object. It's in-order, so the last source will override
		 * properties of the same name in previous arguments.
		 *
		 * Example:
		 *
		 *     _.extend({name : 'moe'}, {age : 50});
		 *     //=> {name : 'moe', age : 50}
		 *
		 * @param {Object} destination
		 * @param {Object...} sources
		 * @return {Object}
		 */
		_.extend = platformImpl.extend

		/**
		 * Returns *true* if all of the values in the **list** pass the **iterator** truth test.
		 *
		 * Example:
		 *
		 *     _.all([true, 1, null, 'yes'], function(value) { return value; });
		 *     //=> false
		 *
		 * @param {Array} list
		 * @param {Function} iterator
		 * @param {Object} [context]
		 * @returns {Boolean}
		 */
		_.all = platformImpl.all

		/**
		 * A function to create flexibly-numbered lists of integers, handy for each and map loops.
		 * Returns a list of integers from **start** to **stop**, incremented (or decremented) by **step**.
		 *
		 * Examples:
		 *
		 *     _.range(10);
		 *     //=> [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
		 *     _.range(1, 11);
		 *     //=> [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		 *     _.range(0, 30, 5);
		 *     //=> [0, 5, 10, 15, 20, 25]
		 *     _.range(0, -10, -1);
		 *     //=> [0, -1, -2, -3, -4, -5, -6, -7, -8, -9]
		 *     _.range(0, 0);
		 *     => []
		 *
		 * @param {Number} start
		 * @param {Number} stop
		 * @param {Number} [step] defaults to 1 of omitted
		 * @return {Array}
		 */
		_.range = platformImpl.range

		/**
		 * **reduce** boils down a list of values into a single value.
		 * **memo** is the initial state of the reduction, and each successive step of it should be returned by iterator.
		 *
		 * Example:
		 *
		 *     var sum = _.reduce([1, 2, 3], function(memo, num){ return memo + num }, 0)
		 *     //=> 6
		 *
		 * @param {Array} list An array holding the values over which this functions iterates. Each value will be
		 * passed to the iterator function.
		 * @param {Function} iterator Iterator function which is called with the arguments **(memo, value, index, list)**
		 * @param {Object} [memo] Any object (e.g. a String or Number) that should be passed as initial value
		 * to the iterator function
		 * @param {Object} [context] Context in which the iterator should be called
		 * @return {Object}
		 */
		_.reduce = platformImpl.reduce

		/**
		 * Bind a **function** to an **object**, meaning that whenever the function is called,
		 * the value of *this* will be the **object**. Optionally, bind **arguments** to the **function**
		 * to pre-fill them, also known as partial application.
		 *
		 * Example:
		 *
		 *     var func = function(greeting){ return greeting + ': ' + this.name };
		 *     func = _.bind(func, {name : 'moe'}, 'hi');
		 *     func();
		 *     //=> 'hi: moe'
		 *
		 * @param {Function} function
		 * @param {Object} object
		 * @param {Object...} [arguments]
		 * @return {Function}
		 */
		_.bind = platformImpl.bind

		/**
		 * Returns the values in **list** without the elements that the truth test (**iterator**) passes.
		 * The opposite of {@link #filter}.
		 *
		 * Example:
		 *
		 *     var odds = _.reject([1, 2, 3, 4, 5, 6], function(num){ return num % 2 == 0; });
		 *     //=> [1, 3, 5]
		 *
		 * @param {Array} list
		 * @param {Function} iterator
		 * @param {Object} [context]
		 * @return {Array}
		 */
		_.reject = platformImpl.reject

		/**
		 * Create a shallow-copied clone of the **object**. Any nested objects or arrays will be
		 * copied by reference, not duplicated.
		 *
		 * Example:
		 *
		 *     _.clone({name : 'moe'});
		 *     //=> {name : 'moe'};
		 *
		 * @param {Object} object
		 * @return {Object}
		 */
		_.clone = platformImpl.clone

		/**
		 * Fill in missing properties in **object** with default values from the **defaults** objects,
		 * and return the object. As soon as the property is filled, further defaults will have no effect.
		 *
		 * Example:
		 *
		 *     var iceCream = {flavor : "chocolate"};
		 *     _.defaults(iceCream, {flavor : "vanilla", sprinkles : "lots"});
		 *     //=> {flavor : "chocolate", sprinkles : "lots"}
		 *
		 *
		 * @param {Object} object
		 * @param {Object...} defaults
		 * @return {Object}
		 */
		_.defaults = platformImpl.defaults

		/**
		 * Returns the index at which **value** can be found in the **array**, or -1 if value is not present
		 * in the **array**.  If you're working with a large array, and you know that the array is already
		 * sorted, pass *true* for **isSorted** to use a faster binary search.
		 *
		 * Example:
		 *
		 *     _.indexOf([1, 2, 3], 2);
		 *     //=> 1
		 *
		 * @param {Array} array
		 * @param {Object} value
		 * @param {Boolean} [isSorted]
		 * @return {Number}
		 */
		_.indexOf = platformImpl.indexOf

		/**
		 * Returns true if object is a String.
		 *
		 *     _.isString("moe");
		 *     //=> true
		 *
		 * @param {Object} object
		 * @return {Boolean}
		 */
		_.isString = platformImpl.isString

		/**
		 * Returns *true* if **object** contains no values.
		 *
		 * Example:
		 *
		 *     _.isEmpty([1, 2, 3]);
		 *     //=> false
		 *     _.isEmpty({});
		 *     //=> true
         *
		 * @param {Object} object
		 * @return {Boolean}
		 */
		_.isEmpty = platformImpl.isEmpty

		/**
		 * Retrieve all the names of the **object**'s properties.
		 *
		 * Example:
		 *
		 *     _.keys({one : 1, two : 2, three : 3});
		 *     //=> ["one", "two", "three"]
		 *
		 * @param {Object} object
		 * @returns {Array}
		 */
		_.keys = platformImpl.keys

		/**
		 * Returns true if object is a Function.
		 *
		 * Example:
		 *
		 *     _.isFunction(alert);
		 *     //=> true
		 *
		 * @param {Object} object
		 * @return {Boolean}
		 */
		_.isFunction = platformImpl.isFunction

		/**
		 * Returns *true* if the **value** is present in the **list**, using === to test equality.
		 *
		 * Example:
		 *
		 *     _.contains([1, 2, 3], 3);
		 *     //=> true
		 *
		 * @param {Array} list
		 * @param {Object} value
		 * @return {Boolean}
		 */
		_.contains = platformImpl.contains

		/**
		 * Calls the method named by **methodName** on each value in the list. Any extra **arguments**
		 * passed to invoke will be forwarded on to the method invocation.
		 *
		 * Example:
		 *
		 *     _.invoke([[5, 1, 7], [3, 2, 1]], 'sort');
		 *     //=> [[1, 5, 7], [1, 2, 3]]
		 *
		 * @param {Array} list
		 * @param {String} methodName
		 * @param {Object...} arguments
		 * @return {Array}
		 */
		_.invoke = platformImpl.invoke

		/**
		 * Flattens a nested **array** (the nesting can be to any depth). If you pass **shallow**,
		 * the array will only be flattened a single level.
		 *
		 * Examples:
		 *
		 *     _.flatten([1, [2], [3, [[4]]]]);
		 *     //=> [1, 2, 3, 4];
		 *
		 *     _.flatten([1, [2], [3, [[4]]]], true);
		 *     //=> [1, 2, 3, [[4]]];
		 *
		 * @param {Array} array
		 * @param {Boolean} shallow
		 * @return {Array}
		 */
		_.flatten = platformImpl.flatten

		/**
		 * Return a copy of the **object**, filtered to only have values for the whitelisted keys specified in **keys**.
		 *
		 * Example:
		 *
		 *     _.pick({name : 'moe', age: 50, userid : 'moe1'}, ['name', 'age']);
		 *     //=> {name : 'moe', age : 50}
		 *
		 * @param {Object} object
		 * @param {Array} keys Array containing the keys for the whitelist in **object**
		 * @return {Object}
		 */
		_.pick = platformImpl.pick

		/**
		 * Computes the union of the passed-in **arrays**: the list of unique items, in order,
		 * that are present in one or more of the **arrays**.
		 *
		 * Example:
		 *
		 *     _.union([1, 2, 3], [101, 2, 1, 10], [2, 1]);
		 *     //=> [1, 2, 3, 101, 10]
		 *
		 * @param {Array...} arrays
		 * @return {Array}
		 */
		_.union = platformImpl.union

		/**
		 * Returns the values from **array** that are not present in the **other** arrays.
		 *
		 * Example:
		 *
		 *     _.difference([1, 2, 3, 4, 5], [5, 2, 10]);
		 *     //=> [1, 3, 4]
		 *
		 * @param {Array} array
		 * @param {Array...} others
		 * @return {Array}
		 */
		_.difference = platformImpl.difference

		/**
		 * Return all of the values of the **object**'s properties.
		 *
		 * Example:
		 *
		 *     _.values({one : 1, two : 2, three : 3});
		 *     //=> [1, 2, 3]
		 *
		 * @param {Object} object
		 * @return {Array}
		 */
		_.values = platformImpl.values

		/**
		 * Produces a duplicate-free version of the **array**, using === to test object equality.
		 * If you know in advance that the array is sorted, passing *true* for **isSorted** will run a much faster
		 * algorithm.
		 *
		 * Example:
		 *     _.uniq([1, 2, 1, 3, 1, 4]);
		 *     //=> [1, 2, 3, 4]
		 *
		 * @param {Array} array
		 * @param {Boolean} [isSorted]
		 * @return {Array}
		 */
		_.unique = platformImpl.unique

		/**
		 * Returns everything but the last entry of the **array**.
		 * Especially useful on the arguments object. Pass **n** to exclude the last n elements from the result.
		 *
		 * Example:
		 *
		 *     _.initial([5, 4, 3, 2, 1]);
		 *     //=> [5, 4, 3, 2]
		 *
		 * @param {Array} array
		 * @param {Number} [n] Exclude the last n elments from the result
		 * @return {Array}
		 */
		_.initial = platformImpl.initial

		/**
		 * A convenient version of what is perhaps the most common use-case for {@link #map}:
		 * extracting a list of property values.
		 *
		 * Example:
		 *
		 *     var stooges = [{name : 'moe', age : 40}, {name : 'larry', age : 50}, {name : 'curly', age : 60}];
		 *     _.pluck(stooges, 'name');
		 *     //=> ["moe", "larry", "curly"]
		 *
		 * @param {Array} list Array with associative arrays in it
		 * @param {String|Number} propertyName key that will be used to lookup the value in the elements of **list**
		 * @return {Array}
		 */
		_.pluck = platformImpl.pluck

		/**
		 * Merges together the values of each of the **arrays** with the values at the corresponding position.
		 * Useful when you have separate data sources that are coordinated through matching array indexes.
		 *
		 * Example:
		 *
		 *     _.zip(['moe', 'larry', 'curly'], [30, 40, 50], [true, false, false]);
		 *     //=> [["moe", 30, true], ["larry", 40, false], ["curly", 50, false]]
		 *
		 * @param {Array...} arrays
		 * @return {Array}
		 */
		_.zip = platformImpl.zip

		/**
		 * Creates a version of the function that will only be run after first being called count times. Useful for
		 * grouping asynchronous responses, where you want to be sure that all the async calls have finished, before
		 * proceeding.
		 *
		 * Example:
		 *
		 *     var lock = _.after( 3, function() { // resuming with doing stuff after third call to "lock" function } )
		 *
		 * @param {Number} count The count after which the callback function is called.
		 * @param {Function} function The callback function to call after the **count** times.
		 */
		_.after = platformImpl.after

		/**
		 * Computes the list of values that are the intersection of all the arrays. Each value in the result is present in each of the arrays.
		 *
		 * Example:
		 *
		 *     _.intersection([1, 2, 3], [101, 2, 1, 10], [2, 1]);
		 *     //=> [1, 2]
		 *
		 * @param {Array...} arrays
		 * @return {Array}
		 */
		_.intersection = platformImpl.intersection

		return _
	}
)

define(
	"spell/shared/util/input/keyCodes",
	function() {
		return {
		    "BACKSPACE": 8,
		    "TAB": 9,
		    "ENTER": 13,
		    "SHIFT": 16,
		    "CTRL": 17,
		    "ALT": 18,
		    "PAUSE": 19,
		    "CAPS_LOCK": 20,
		    "ESCAPE": 27,
		    "SPACE": 32,
		    "PAGE_UP": 33,
		    "PAGE_DOWN": 34,
		    "END": 35,
		    "HOME": 36,
		    "LEFT_ARROW": 37,
		    "UP_ARROW": 38,
		    "RIGHT_ARROW": 39,
		    "DOWN_ARROW": 40,
		    "INSERT": 45,
		    "DELETE": 46,
		    "0": 48,
		    "1": 49,
		    "2": 50,
		    "3": 51,
		    "4": 52,
		    "5": 53,
		    "6": 54,
		    "7": 55,
		    "8": 56,
		    "9": 57,
		    "A": 65,
		    "B": 66,
		    "C": 67,
		    "D": 68,
		    "E": 69,
		    "F": 70,
		    "G": 71,
		    "H": 72,
		    "I": 73,
		    "J": 74,
		    "K": 75,
		    "L": 76,
		    "M": 77,
		    "N": 78,
		    "O": 79,
		    "P": 80,
		    "Q": 81,
		    "R": 82,
		    "S": 83,
		    "T": 84,
		    "U": 85,
		    "V": 86,
		    "W": 87,
		    "X": 88,
		    "Y": 89,
		    "Z": 90,
		    "LEFT_WINDOW_KEY": 91,
		    "RIGHT_WINDOW_KEY": 92,
		    "SELECT_KEY": 93,
		    "NUMPAD_0": 96,
		    "NUMPAD_1": 97,
		    "NUMPAD_2": 98,
		    "NUMPAD_3": 99,
		    "NUMPAD_4": 100,
		    "NUMPAD_5": 101,
		    "NUMPAD_6": 102,
		    "NUMPAD_7": 103,
		    "NUMPAD_8": 104,
		    "NUMPAD_9": 105,
		    "MULTIPLY": 106,
		    "ADD": 107,
		    "SUBTRACT": 109,
		    "DECIMAL_POINT": 110,
		    "DIVIDE": 111,
		    "F1": 112,
		    "F2": 113,
		    "F3": 114,
		    "F4": 115,
		    "F5": 116,
		    "F6": 117,
		    "F7": 118,
		    "F8": 119,
		    "F9": 120,
		    "F10": 121,
		    "F11": 122,
		    "F12": 123,
		    "NUM_LOCK": 144,
		    "SCROLL_LOCK": 145,
		    "SEMI-COLON": 186,
		    "EQUAL_SIGN": 187,
		    "COMMA": 188,
		    "DASH": 189,
		    "PERIOD": 190,
		    "FORWARD_SLASH": 191,
		    "GRAVE_ACCENT": 192,
		    "OPEN_BRACKET": 219,
		    "BACK_SLASH": 220,
		    "CLOSE_BRACKET": 221,
		    "SINGLE_QUOTE": 222
		}
	}
)

define(
	'spell/client/util/createAssets',
	[
		'spell/shared/util/input/keyCodes',

		'spell/functions'
	],
	function(
		keyCodes,

		_
	) {
		'use strict'


		/*
		 * private
		 */

		var createAssetId = function( type, resourceName ) {
			var baseName = resourceName.match( /(.*)\.[^.]+$/ )[ 1 ]

			return type + ':' + baseName.replace( /\//g, '.' )
		}

		var createFrameOffset = function( frameWidth, frameHeight, numX, numY, frameId ) {
			return [
				( frameId % numX ) * frameWidth,
				Math.floor( frameId / numX ) * frameHeight
			]
		}

		var createAnimationAsset = function( assets, asset ) {
			var spriteSheetAssetId = asset.assetId,
				spriteSheetAsset   = assets[ spriteSheetAssetId ]

			if( !spriteSheetAsset ) throw 'Error: Could not find asset with id \'' + spriteSheetAssetId + '\'.'

			var frameWidth  = spriteSheetAsset.config.frameWidth,
				frameHeight = spriteSheetAsset.config.frameHeight,
				numX        = Math.floor( spriteSheetAsset.config.textureWidth / frameWidth ),
				numY        = Math.floor( spriteSheetAsset.config.textureHeight / frameHeight ),
				numFrames   = _.size( asset.config.frameIds),
				createFrameOffsetPartial = _.bind( createFrameOffset, null, frameWidth, frameHeight )

			return {
				type            : asset.type,
				resourceId      : spriteSheetAsset.resourceId,
				frameDimensions : [ frameWidth, frameHeight ],
				frameDuration   : asset.config.duration / numFrames,
				frameOffsets    : _.map( asset.config.frameIds, function( frameId ) { return createFrameOffsetPartial( numX, numY, frameId ) } ),
				numFrames       : numFrames,
				looped          : asset.config.looped
			}
		}

		var createKeyToActionMapAsset = function( asset ) {
			return _.reduce(
				asset.config,
				function( memo, action, key ) {
					memo[ keyCodes[ key ] ] = action

					return memo
				},
				{}
			)
		}

		var injectResource = function( asset, resources, resourceId ) {
			if( !asset.resourceId ) return

			var resource = resources[ asset.resourceId ]

			if( !resource ) throw 'Error: Could not resolve resource id \'' + asset.resourceId + '\'.'

			asset.resource = resource
		}


		/*
		 * public
		 */

		return function( assetDefinitions ) {
			// in a first pass all assets which do not depend on other assets are created
			var assets = _.reduce(
				assetDefinitions,
				function( memo, assetDefinition, resourceName ) {
					var asset

					if( assetDefinition.type === 'appearance') {
						asset = {
							resourceId : assetDefinition.file,
							type       : assetDefinition.type
						}

					} else if( assetDefinition.type === 'spriteSheet' ||
						assetDefinition.type === 'font') {

						asset = {
							config     : assetDefinition.config,
							resourceId : assetDefinition.file,
							type       : assetDefinition.type
						}

					} else if( assetDefinition.type === 'keyToActionMap' ) {
						asset = createKeyToActionMapAsset( assetDefinition )
					}

					memo[ createAssetId( assetDefinition.type, resourceName ) ] = asset

					return memo
				},
				{}
			)

			// in a second pass all assets that reference other assets are created
			return _.reduce(
				assetDefinitions,
				function( memo, assetDefinition, resourceName ) {
					if( assetDefinition.type === 'animation' ) {
						memo[ createAssetId( assetDefinition.type, resourceName ) ] = createAnimationAsset( memo, assetDefinition )
					}

					return memo
				},
				assets
			)
		}
	}
)

define(
	'spell/client/util/loadResources',
	[
		'spell/client/util/createAssets',
		'spell/shared/util/Events',
		'spell/shared/util/platform/PlatformKit',
		'spell/functions'
	],
	function(
		createAssets,
		Events,
		PlatformKit,
		_
	) {
		'use strict'


		var startLoadingResources = function( resourceLoader, resourceBundleId, resourceIds, baseUrl, type, afterLoad ) {
			resourceLoader.addResourceBundle(
				resourceBundleId,
				resourceIds,
				{
					baseUrl   : baseUrl,
					type      : type,
					afterLoad : afterLoad
				}
			)

			resourceLoader.start()
		}

		var resourceIdsToJsonFilenames = function( resourceIds ) {
			return _.map(
				resourceIds,
				function( resourceId ) {
					return resourceId.replace( /\./g, '/' ) + '.json'
				}
			)
		}

		var resourceJsonDecoder = function( resource ) {
			return PlatformKit.jsonCoder.decode( resource )
		}

		var traceResourceIds = function( assets ) {
			return _.unique(
				_.reduce(
					assets,
					function( memo, asset ) {
						return asset.resourceId ? memo.concat( asset.resourceId ) : memo
					},
					[]
				)
			)
		}

		var injectResource = function( resources, asset ) {
			if( !asset.resourceId ) return

			var resource = resources[ asset.resourceId ]

			if( !resource ) throw 'Error: Could not resolve resource id \'' + asset.resourceId + '\'.'

			asset.resource = resource
		}


		return function( spell, next ) {
			var eventManager     = spell.eventManager,
				renderingContext = spell.renderingContext,
				resourceLoader   = spell.resourceLoader,
				resources        = spell.resources,
				runtimeModule    = spell.runtimeModule,
				templateManager  = spell.templateManager

			var templateBundleId = 'templates',
				assetBundleId    = 'assets',
				resourceBundleId = 'resources'

			eventManager.waitFor(
				[ Events.RESOURCE_LOADING_COMPLETED, assetBundleId ],
				function( loadedAssets ) {
					_.extend( spell.assets, createAssets( loadedAssets ) )

					// start loading template definition files
					startLoadingResources(
						resourceLoader,
						templateBundleId,
						resourceIdsToJsonFilenames( runtimeModule.templateIds ),
						'library/templates',
						'text',
						resourceJsonDecoder
					)

					// start loading resources
					startLoadingResources(
						resourceLoader,
						resourceBundleId,
						traceResourceIds( spell.assets ),
						'library/assets',
						'image',
						function( resource ) {
							return renderingContext.createTexture( resource )
						}
					)
				}

			).and(
				[ Events.RESOURCE_LOADING_COMPLETED, templateBundleId ],
				function( loadedTemplates ) {
					_.each( loadedTemplates, function( template ) { templateManager.add( template ) } )
				}

			).and(
				[ Events.RESOURCE_LOADING_COMPLETED, resourceBundleId ],
				function( loadedResources ) {
					_.each(
						spell.assets,
						_.bind( injectResource, null, loadedResources )
					)
				}

			).resume( function() {
				next()
			} )

			// start loading asset definition files
			startLoadingResources(
				resourceLoader,
				assetBundleId,
				resourceIdsToJsonFilenames( runtimeModule.assetIds ),
				'library/assets',
				'text',
				resourceJsonDecoder
			)
		}
	}
)

define(
	'spell/client/main',
	[
		'spell/client/util/loadResources',
		'spell/client/util/onScreenResize',
		'spell/client/staticInclude',
		'spell/shared/util/createMainLoop',
		'spell/shared/util/entity/EntityManager',
		'spell/shared/util/scene/SceneManager',
		'spell/shared/util/template/TemplateManager',
		'spell/shared/util/ConfigurationManager',
		'spell/shared/util/EventManager',
		'spell/shared/util/InputManager',
		'spell/shared/util/ResourceLoader',
		'spell/shared/util/StatisticsManager',
		'spell/shared/util/Logger',
		'spell/shared/util/createDebugMessageHandler',
		'spell/shared/util/platform/PlatformKit',
		'spell/shared/util/platform/initDebugEnvironment',

		'spell/functions'
	],
	function(
		loadResources,
		onScreenResize,
		staticInclude,
		createMainLoop,
		EntityManager,
		SceneManager,
		TemplateManager,
		ConfigurationManager,
		EventManager,
		InputManager,
		ResourceLoader,
		StatisticsManager,
		Logger,
		createDebugMessageHandler,
		PlatformKit,
		initDebugEnvironment,

		_,

		// configuration parameters passed in from stage zero loader
		stageZeroConfig
	) {
		'use strict'


		/**
		 * This function is called as soon as all external resources are loaded. From this moment on it is safe to assume that all static content has been
		 * loaded and is ready to use.
		 */
		var postLoadedResources = function() {
			var spell = this.spell

			spell.entityManager = new EntityManager( spell.templateManager )
			spell.sceneManager  = new SceneManager( spell, spell.entityManager, spell.mainLoop )

			spell.logger.debug( 'loading resources completed' )

			PlatformKit.registerOnScreenResize(
				spell.configurationManager.id,
				_.bind( onScreenResize, null, spell.eventManager )
			)

			var renderingContextConfig = spell.renderingContext.getConfiguration()
			spell.logger.debug( 'created rendering context (' + renderingContextConfig.type + ')' )


			var sceneConfig = _.find(
				spell.runtimeModule.scenes,
				function( iter ) {
					return iter.name === spell.runtimeModule.startScene
				}
			)

			if( !sceneConfig ) throw 'Error: Could not find start scene \'' + spell.runtimeModule.startScene + '\'.'

			var anonymizeModuleIdentifiers = !spell.configurationManager.debug
			spell.sceneManager.startScene( sceneConfig, anonymizeModuleIdentifiers )

			spell.mainLoop.run()
		}

		var start = function( runtimeModule, cachedContent ) {
			var spell = this.spell
			spell.runtimeModule = runtimeModule

			if( !runtimeModule ) {
				throw 'Error: No runtime module defined. Please provide a runtime module.'
			}

			spell.logger.debug( 'client started' )

			var resourceLoader = new ResourceLoader(
				spell,
				spell.soundManager,
				spell.renderingContext,
				spell.eventManager,
				spell.configurationManager.resourceServer
			)

			if( cachedContent ) resourceLoader.setCache( cachedContent )

			_.extend(
				spell,
				{
					resourceLoader : resourceLoader,
					resources      : resourceLoader.getResources()
				}
			)

			loadResources(
				spell,
				_.bind( postLoadedResources, this )
			)
		}

		var init = function( config ) {
			var spell                = {},
				assets               = {},
				logger               = new Logger(),
				eventManager         = new EventManager(),
				configurationManager = new ConfigurationManager( eventManager, config ),
				renderingContext     = PlatformKit.RenderingFactory.createContext2d(
					eventManager,
					configurationManager.id,
					1024,
					768,
					configurationManager.renderingBackEnd
				),
				soundManager         = PlatformKit.createSoundManager(),
				inputManager         = new InputManager( configurationManager ),
				statisticsManager    = new StatisticsManager(),
				templateManager      = new TemplateManager( assets ),
				mainLoop             = createMainLoop( eventManager, statisticsManager )

			statisticsManager.init()

			_.extend(
				spell,
				{
					assets               : assets,
					configurationManager : configurationManager,
					eventManager         : eventManager,
					inputEvents          : inputManager.getInputEvents(),
					inputManager         : inputManager,
					logger               : logger,
					mainLoop             : mainLoop,
					renderingContext     : renderingContext,
					runtimeModule        : undefined,
					soundManager         : soundManager,
					statisticsManager    : statisticsManager,
					templateManager      : templateManager
				}
			)

			this.spell = spell


			if( config.debug ) {
				logger.setLogLevel( logger.LOG_LEVEL_DEBUG )
				initDebugEnvironment( logger )

				this.debugMessageHandler = createDebugMessageHandler(
					this.spell,
					_.bind( this.start, this )
				)
			}
		}


		var main = function() {
			this.spell               = undefined
			this.debugMessageHandler = undefined
			init.call( this, stageZeroConfig )
		}

		main.prototype = {
			start : start,

			/*
			 * This callback is called when the engine instance sends message to the editing environment.
			 *
			 * @param {Function} fn
			 */
			setSendMessageToEditor : function( fn ) {
				this.spell.logger.setSendMessageToEditor( fn )
			},

			/*
			 * This method is used to send debug messages to the engine instance.
			 *
			 * @param {Object} message
			 */
			sendDebugMessage : function( message ) {
				this.debugMessageHandler( message )
			}
		}

		return new main()
	}
)

define(
	"modernizr",
	function() {
		var isBrowser = !!( typeof window !== "undefined" && navigator && document )

		if( !isBrowser ) return {}


 		/* Modernizr 2.5.3 (Custom Build) | MIT & BSD
		 * Build: http://www.modernizr.com/download/#-canvas-audio-websockets-touch-webgl-teststyles-prefixes-domprefixes
		 */
		;window.Modernizr=function(a,b,c){function y(a){i.cssText=a}function z(a,b){return y(l.join(a+";")+(b||""))}function A(a,b){return typeof a===b}function B(a,b){return!!~(""+a).indexOf(b)}function C(a,b,d){for(var e in a){var f=b[a[e]];if(f!==c)return d===!1?a[e]:A(f,"function")?f.bind(d||b):f}return!1}var d="2.5.3",e={},f=b.documentElement,g="modernizr",h=b.createElement(g),i=h.style,j,k={}.toString,l=" -webkit- -moz- -o- -ms- ".split(" "),m="Webkit Moz O ms",n=m.split(" "),o=m.toLowerCase().split(" "),p={},q={},r={},s=[],t=s.slice,u,v=function(a,c,d,e){var h,i,j,k=b.createElement("div"),l=b.body,m=l?l:b.createElement("body");if(parseInt(d,10))while(d--)j=b.createElement("div"),j.id=e?e[d]:g+(d+1),k.appendChild(j);return h=["&#173;","<style>",a,"</style>"].join(""),k.id=g,m.innerHTML+=h,m.appendChild(k),l||(m.style.background="",f.appendChild(m)),i=c(k,a),l?k.parentNode.removeChild(k):m.parentNode.removeChild(m),!!i},w={}.hasOwnProperty,x;!A(w,"undefined")&&!A(w.call,"undefined")?x=function(a,b){return w.call(a,b)}:x=function(a,b){return b in a&&A(a.constructor.prototype[b],"undefined")},Function.prototype.bind||(Function.prototype.bind=function(b){var c=this;if(typeof c!="function")throw new TypeError;var d=t.call(arguments,1),e=function(){if(this instanceof e){var a=function(){};a.prototype=c.prototype;var f=new a,g=c.apply(f,d.concat(t.call(arguments)));return Object(g)===g?g:f}return c.apply(b,d.concat(t.call(arguments)))};return e});var D=function(c,d){var f=c.join(""),g=d.length;v(f,function(c,d){var f=b.styleSheets[b.styleSheets.length-1],h=f?f.cssRules&&f.cssRules[0]?f.cssRules[0].cssText:f.cssText||"":"",i=c.childNodes,j={};while(g--)j[i[g].id]=i[g];e.touch="ontouchstart"in a||a.DocumentTouch&&b instanceof DocumentTouch||(j.touch&&j.touch.offsetTop)===9},g,d)}([,["@media (",l.join("touch-enabled),("),g,")","{#touch{top:9px;position:absolute}}"].join("")],[,"touch"]);p.canvas=function(){var a=b.createElement("canvas");return!!a.getContext&&!!a.getContext("2d")},p.webgl=function(){try{var d=b.createElement("canvas"),e;e=!(!a.WebGLRenderingContext||!d.getContext("experimental-webgl")&&!d.getContext("webgl")),d=c}catch(f){e=!1}return e},p.touch=function(){return e.touch},p.websockets=function(){for(var b=-1,c=n.length;++b<c;)if(a[n[b]+"WebSocket"])return!0;return"WebSocket"in a},p.audio=function(){var a=b.createElement("audio"),c=!1;try{if(c=!!a.canPlayType)c=new Boolean(c),c.ogg=a.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/,""),c.mp3=a.canPlayType("audio/mpeg;").replace(/^no$/,""),c.wav=a.canPlayType('audio/wav; codecs="1"').replace(/^no$/,""),c.m4a=(a.canPlayType("audio/x-m4a;")||a.canPlayType("audio/aac;")).replace(/^no$/,"")}catch(d){}return c};for(var E in p)x(p,E)&&(u=E.toLowerCase(),e[u]=p[E](),s.push((e[u]?"":"no-")+u));return y(""),h=j=null,e._version=d,e._prefixes=l,e._domPrefixes=o,e._cssomPrefixes=n,e.testStyles=v,e}(this,this.document);

		var modernizr = window.Modernizr

		return modernizr
	}
)



define(
	"spell/shared/util/platform/private/system/features",
	[
		"modernizr"
	],
	function(
		modernizr
	) {
		"use strict";


		return {
			touch : !!modernizr.touch
		}
	}
)

define(
	"spell/shared/util/platform/private/sound/SoundManager",
	[
		"spell/shared/components/sound/soundEmitter",

		'spell/functions'
	],
	function(
		soundEmitterConstructor,

		_
		) {
		"use strict"

		var maxAvailableChannels = 8
        var context              = undefined
        var muted                = false

		var checkMaxAvailableChannels = function() {
			if( (/iPhone|iPod|iPad/i).test( navigator.userAgent ) ) {
				maxAvailableChannels = 1

			} else {
				maxAvailableChannels = 8
			}

			return maxAvailableChannels
		}

		var basePath = "sounds"

		var channels = {}

		var getFreeChannel = function( resource, isBackground ) {
			var channel = _.find(
				channels,
				function( channel ) {
					if( channel.resource === resource &&
						!channel.playing &&
						!channel.selected )  {

						if( maxAvailableChannels === 1 ) {
							if(	isBackground ) return true
						} else {
							return true
						}
					}

					return false
				}
			)

			if( !!channel ) {
				channel.selected = true
				channel.playing = false
			}

			return channel
		}

		var remove = function( soundObject ) {
			soundObject.stop     = -1
			soundObject.start    = -1
			soundObject.selected = false
            soundObject.playing  = false
		}

		var audioFormats = {
			ogg: {
				mimeTypes: ['audio/ogg; codecs=vorbis']
			},
			mp3: {
				mimeTypes: ['audio/mpeg; codecs="mp3"', 'audio/mpeg', 'audio/mp3', 'audio/MPA', 'audio/mpa-robust']
			},
			wav: {
				mimeTypes: ['audio/wav; codecs="1"', 'audio/wav', 'audio/wave', 'audio/x-wav']
			}
		}

		var detectExtension = function() {

			var probe = new Audio();

			return _.reduce(
				audioFormats,
				function( memo, format, key ) {
					if( !!memo ) return memo

					var supportedMime = _.find(
						format.mimeTypes,
						function( mimeType ) {
							return probe.canPlayType( mimeType )
						}
					)

					return ( !!supportedMime ) ? key : null
				},
				null
			)
		}

		var createHTML5Audio = function ( config ) {
			var html5Audio = new Audio()

			if( !!config.onloadeddata ) {

				html5Audio.addEventListener(
					"canplaythrough", config.onloadeddata,
					false
				)
			}

			html5Audio.addEventListener( "error", function() {
				throw "Error: Could not load sound resource '"+html5Audio.src+"'"
			}, false )

			html5Audio.id       = config.id
			html5Audio.resource = config.resource
			html5Audio.playing  = false
			html5Audio.selected = false
			html5Audio.src      = basePath + "/" + config.resource + "."+ detectExtension()

			// old WebKit
			html5Audio.autobuffer = "auto"

			// new WebKit
			html5Audio.preload = "auto"
			html5Audio.load()

			return html5Audio
		}

		var cloneHTML5Audio = function( ObjectToClone ) {
			var html5Audioclone = ObjectToClone.cloneNode(true)

			html5Audioclone.resource = ObjectToClone.resource
			html5Audioclone.playing  = false
			html5Audioclone.selected = false

			return html5Audioclone
		}

        var createWebkitHTML5Audio = function ( config ) {
            var request = new XMLHttpRequest();
            request.open('GET', basePath + "/" + config.resource + "."+ detectExtension(), true);
            request.responseType = 'arraybuffer';

            if( !!config.onloadeddata ) {

                // Decode asynchronously
                request.onload = function() {
                  context.decodeAudioData( request.response,
                      function( buffer ) {

                          buffer.id       = config.id
                          buffer.resource = config.resource
                          buffer.playing  = false
                          buffer.selected = false

                          config.onloadeddata( buffer )
                      }

                  );
                }
            }

            request.onError = function() {
                throw "Error: Could not load sound resource '"+ config.resource +"'"
            }

            request.send()

            return request
        }

        var hasWebAudioSupport = function() {
            try{
                context = new webkitAudioContext()
                return true
            }catch( e ) {
                return false
            }
        }

        var toggleMuteSounds = function( muted ) {
            _.each(
                _.keys( channels ),
                function( key) {

                    if( hasWebAudioSupport() ) {
                        channels[key].gain  = ( muted === true ) ? 0 : 1

                    } else {
                        channels[key].muted = muted

                        if( maxAvailableChannels === 1 ) {
                            if( muted === true)
                                channels[ key ].pause()
                            else
                                channels[ key ].play()
                        }
                    }
                }
            )
        }

        var setMuted = function( value ) {
            muted = !!value
            toggleMuteSounds( muted )
        }

        var isMuted = function() {
            return muted
        }

        var SoundManager = function() {

            if( !hasWebAudioSupport() ) {
                this.createAudio = createHTML5Audio
                this.cloneAudio  = cloneHTML5Audio

            }else {
                this.createAudio = createWebkitHTML5Audio
                this.context          = context
            }

        }

        SoundManager.prototype = {
            soundSpriteConfig         : undefined,
            audioFormats              : audioFormats,
            channels                  : channels,
            getFreeChannel            : getFreeChannel,
            checkMaxAvailableChannels : checkMaxAvailableChannels,
            maxAvailableChannels      : maxAvailableChannels,
            remove                    : remove,
            setMuted                  : setMuted,
            isMuted                   : isMuted
        }

        return SoundManager
	}
)

define(
	'spell/shared/util/platform/private/log',
	[
		'spell/functions'
	],
	function(
		_
	) {
		'use strict'


		return _.bind( console.originalLog || console.log, console )
	}
)

define(
	"spell/shared/components/sound/soundEmitter",
	function() {
		"use strict"

		var soundEmitter = function( args ) {
			this.soundId    = args.soundId
			this.volume     = args.volume     || 1
			this.muted      = args.muted      || false
			this.onComplete = args.onComplete || ''
			this.start      = args.start      || false
			this.stop       = args.stop       || false
			this.background = args.background || false
		}

		soundEmitter.ON_COMPLETE_LOOP               = 1
		soundEmitter.ON_COMPLETE_REMOVE_COMPONENT   = 2
		soundEmitter.ON_COMPLETE_STOP               = 3

		return soundEmitter
	}
)

define(
	"spell/shared/util/platform/private/sound/createSound",
	[
		"spell/shared/components/sound/soundEmitter"
	],
	function(
		soundEmitterConstructor
	) {
		"use strict";

		var create = function( config, soundManager ) {

			var pauseCallback = function () {
				if ( parseFloat(this.currentTime) >= parseFloat( this.stop ) && this.paused === false) {
					this.playing = false
                    this.pause()
				}
			}

			var playingCallback = function() {
				if( this.playing === false ) {
					this.playing = true
					this.currentTime = this.start
					this.addEventListener( 'timeupdate', pauseCallback, false )
				}
			}


			var loopCallback = function() {
                if( this.playing === false ) {
                    this.removeEventListener( 'timeupdate', pauseCallback, false )
                    this.play()
                }
			}

			var removeCallback = function() {
                this.removeEventListener( 'ended', removeCallback, false )
                this.removeEventListener( 'timeupdate', pauseCallback, false )
                this.removeEventListener( 'pause', removeCallback, false )
                this.removeEventListener( 'playing', playingCallback, false )

                soundManager.remove( this )
			}

			return {
				onComplete: soundEmitterConstructor.ON_COMPLETE_STOP,
				start: config.start || 0,
				stop: config.start + config.length || config.length,
				volume: 1,
				background: false,
				resource: config.resource,

				play: function() {

                    var freeAudioObject = soundManager.getFreeChannel(this.resource, this.isBackgroundSound() )

                    if( freeAudioObject === undefined ) {
                        return
                    }

                    freeAudioObject.stop = ( freeAudioObject.duration < parseFloat(this.stop) ) ? freeAudioObject.duration : parseFloat(this.stop)
                    freeAudioObject.start = freeAudioObject.currentTime = parseFloat(this.start)
                    freeAudioObject.volume = this.volume

                    if( !soundManager.context ) {

                        if( this.onComplete === soundEmitterConstructor.ON_COMPLETE_LOOP ) {
                            freeAudioObject.addEventListener( 'pause', loopCallback, false )

                        } else {

                            if( this.onComplete === soundEmitterConstructor.ON_COMPLETE_REMOVE_COMPONENT ) {

                            }

                            freeAudioObject.addEventListener( 'pause', removeCallback, false )
                        }

                        //This should never happen, but if, then free object
                        freeAudioObject.addEventListener( 'ended', removeCallback, false )
                        freeAudioObject.addEventListener( 'play', playingCallback, false )

                        freeAudioObject.play()

                    } else {

                        var gainNode = soundManager.context.createGainNode()
                        var source    = soundManager.context.createBufferSource()
                        source.buffer = freeAudioObject

                        if( this.onComplete === soundEmitterConstructor.ON_COMPLETE_LOOP ) {
                            source.loop = true
                        } else {
                            soundManager.remove( freeAudioObject )
                        }

                        source.connect(gainNode);
                        gainNode.connect(soundManager.context.destination)

                        gainNode.gain.value = this.volume
                        source.noteGrainOn( 0, this.start, config.length )
                    }


                },

				setVolume: function( volume ) {
					this.volume = volume || 1
				},

				setLoop: function() {
					this.onComplete = soundEmitterConstructor.ON_COMPLETE_LOOP
				},

				setOnCompleteRemove: function() {
					this.onComplete = soundEmitterConstructor.ON_COMPLETE_REMOVE_COMPONENT
				},

			  	setStart: function( start ) {
					this.start = start
				},

				setStop: function( stop ) {
					this.stop = stop
				},

				setBackground: function( background ) {
					this.background = ( background === false) ? false : true
				},

				isBackgroundSound: function( ) {
					return this.background
				}
			}
		}

		return create
	}
)

define(
	"spell/shared/util/platform/private/sound/loadSounds",
	[
		"spell/shared/util/platform/private/sound/createSound",
		"spell/shared/components/sound/soundEmitter",

		'spell/functions'
	],
	function (
		createSound,
		soundEmitterConstructor,

		_
		) {
		"use strict"

		var loadSounds = function ( soundManager, soundSpriteConfig, callback ) {
			var sounds            = {}
			var waitingFor        = 0
			var waitingForClones  = 0
			var maxChannels       = soundManager.checkMaxAvailableChannels()
			var availableChannels = maxChannels

			soundManager.soundSpriteConfig = soundSpriteConfig

			var generateSounds = function( ) {

				if( _.has( soundSpriteConfig.music, "index" ) === true) {
					_.each (
						_.keys( soundSpriteConfig.music.index ),
						function( soundId ) {
							sounds[ soundId ] = createSound(
								_.extend( { resource: soundSpriteConfig.music.resource }, soundSpriteConfig.music.index[ soundId ] ),
								soundManager
							)
						}
					)
				}

				if( _.has( soundSpriteConfig.fx, "index" ) === true) {
					_.each (
						_.keys( soundSpriteConfig.fx.index ),
						function( soundId ) {
							sounds[ soundId ] = createSound(
								_.extend( { resource: soundSpriteConfig.fx.resource }, soundSpriteConfig.fx.index[ soundId ] ),
								soundManager
							)
						}
					)

				}

				return sounds
			}

			var createFunctionWrapper = function( resource ) {

				var cloneloadeddataCallback = function ( ) {

					this.removeEventListener( 'canplaythrough', cloneloadeddataCallback, false)
					waitingForClones -= 1

					if ( waitingForClones === 0 ) {
						return callback( generateSounds() )
					}

				}

				var loadeddataCallback = function( html5AudioObject ) {

                    if( !soundManager.context ) {
                        this.removeEventListener( 'canplaythrough', loadeddataCallback, false)
                        soundManager.channels[ resource ] = this
                    } else {
                        soundManager.channels[ resource ] = html5AudioObject
                    }

					waitingFor -= 1

					if ( waitingFor === 0 ) {

						// After loading the ressources, clone the FX sounds into the free Channels of the soundManager
						if( _.has( soundSpriteConfig.fx, "resource" ) &&
                            !soundManager.context ) {

							var ObjectToClone = soundManager.channels[ soundSpriteConfig.fx.resource ]

							for( var i = maxChannels; i > 0; i-- ) {
								waitingForClones += 1

								var html5Audioclone = soundManager.cloneAudio( ObjectToClone )
								html5Audioclone.id = html5Audioclone.id +"_"+i

								html5Audioclone.addEventListener(
									"canplaythrough",
									cloneloadeddataCallback,
									false
								)

								soundManager.channels[ html5Audioclone.id ] = html5Audioclone
							}
						}

						if( waitingForClones === 0 ) {
							callback( generateSounds() )
						}
					}
				}

				waitingFor += 1
				maxChannels -= 1

				return soundManager.createAudio({
					id: resource,
					resource: resource,
					onloadeddata: loadeddataCallback
				})
			}

			if( _.has( soundSpriteConfig.music, "resource" ) ) {
                var html5Audio = createFunctionWrapper( soundSpriteConfig.music.resource )

                //iOS Hack
				if( availableChannels === 1 ) {

					var iosHack = function() {

						if( _.has( soundSpriteConfig.music, "resource" ) ) {
							waitingFor = 1
							html5Audio.load()
						}

						document.getElementById('game').style.display = 'block'
                        document.getElementById('viewport').removeChild( this )
					}

					document.getElementById('game').style.display = 'none'
					var soundLoad = document.createElement( 'input')
					soundLoad.type  = "submit"
					soundLoad.onclick = iosHack
					soundLoad.value = "On iPad/iPhone you have to click on this button to enable loading the sounds"
                    document.getElementById('viewport').insertBefore( soundLoad, document.getElementById('game') )

				}
			}

			if( _.has( soundSpriteConfig.fx, "resource" ) ) {
				createFunctionWrapper( soundSpriteConfig.fx.resource )
			}

		}

		return loadSounds
	}
)

define(
	'spell/shared/util/platform/private/loader/TextLoader',
	[
		'spell/shared/util/Events',

		'spell/functions'
	],
	function(
		Events,

		_
	) {
		'use strict'


		/*
		 * private
		 */

		var onLoad = function( request ) {
			if( this.loaded === true ) return

			this.loaded = true

			if( request.status !== 200 ) {
				onError.call( this, request.response )

				return
			}

			this.onCompleteCallback( request.response )
		}

		var onError = function( event ) {
			this.eventManager.publish(
				[ Events.RESOURCE_ERROR, this.resourceBundleName ],
				[ this.resourceBundleName, event ]
			)
		}

		var onReadyStateChange = function( request ) {
			/*
			 * readyState === 4 means 'DONE'; see https://developer.mozilla.org/en/DOM/XMLHttpRequest
			 */
			if( request.readyState !== 4 ) return

			onLoad.call( this, request )
		}


		/*
		 * public
		 */

		var TextLoader = function( eventManager, resourcePath, resourceBundleName, resourceName, loadingCompletedCallback, timedOutCallback ) {
			this.eventManager       = eventManager
			this.resourcePath       = resourcePath
			this.resourceBundleName = resourceBundleName
			this.resourceName       = resourceName
			this.onCompleteCallback = loadingCompletedCallback
			this.loaded             = false
		}

		TextLoader.prototype = {
			start: function() {
				var url = this.resourcePath + '/' + this.resourceName

				var request = new XMLHttpRequest()
				request.onload             = _.bind( onLoad, this, request )
				request.onreadystatechange = _.bind( onReadyStateChange, this, request )
				request.onerror            = _.bind( onError, this )
				request.open( 'GET', url, true )
				request.send( null )
			}
		}

		return TextLoader
	}
)

define(
	"spell/shared/util/platform/private/loader/SoundLoader",
	[
		"spell/shared/util/platform/private/loader/TextLoader",
		"spell/shared/util/Events",
		"spell/shared/util/platform/private/sound/loadSounds",
		"spell/shared/util/platform/private/registerTimer",

		'spell/functions'
	],
	function(
		TextLoader,
		Events,
		loadSounds,
		registerTimer,

		_
	) {
		"use strict"


		/*
		 * private
		 */

		var processSoundSpriteConfig = function( soundSpriteConfig, onCompleteCallback ) {
			if( !_.has( soundSpriteConfig, "type" ) ||
				soundSpriteConfig.type !== 'spriteConfig' ||
				!_.has( soundSpriteConfig, "music" ) ||
				!_.has( soundSpriteConfig, "fx" ) ) {

				throw 'Not a valid sound sprite configuration.'
			}

			var loadingCompleted = false
			var timeOutLength = 5000

			// if loadSounds does not return in under 5000 ms a failed load is assumed
			registerTimer(
				_.bind(
					function() {
						if( loadingCompleted ) return

						this.onTimeOut( this.resourceBundleName, this.resourceUri )
					},
					this
				),
				timeOutLength
			)

			// creating the spell sound objects out of the sound sprite config
			loadSounds(
                this.soundManager,
				soundSpriteConfig,
				function( sounds ) {
					if( loadingCompleted ) return

					onCompleteCallback( sounds )
					loadingCompleted = true
				}
			)
		}

		var loadJson = function( uri, onCompleteCallback ) {
			var textLoader = new TextLoader(
				this.eventManager,
				this.host,
				this.resourceBundleName,
				uri,
				function( jsonString ) {
					var object = JSON.parse( jsonString )

					if( object === undefined ) throw 'Parsing json string failed.'


					onCompleteCallback( object )
				}
			)

			textLoader.start()
		}


		/*
		 * public
		 */

		var SoundLoader = function( eventManager, host, resourceBundleName, resourceUri, loadingCompletedCallback, timedOutCallback, soundManager ) {
			this.eventManager       = eventManager
            this.soundManager       = soundManager
			this.host               = host
			this.resourceBundleName = resourceBundleName
			this.resourceUri        = resourceUri
			this.onCompleteCallback = loadingCompletedCallback
			this.onTimeOut          = timedOutCallback
		}

		SoundLoader.prototype = {
			start: function() {
				var fileName = _.last( this.resourceUri.split( '/' ) )
				var extension = _.last( fileName.split( '.' ) )

				if( extension === "json" ) {
					/*
					 * The html5 back-end uses sound sprites by default. Therefore loading of the sound set config can be skipped and the sound sprite config
					 * can be loaded directly.
					 */
					var soundSpriteConfigUri = "sounds/output/" + fileName

					loadJson.call(
						this,
						soundSpriteConfigUri,
						_.bind(
							function( soundSpriteConfig ) {
								processSoundSpriteConfig.call( this, soundSpriteConfig, this.onCompleteCallback )
							},
							this
						)
					)

				} else /*if( extension === "" )*/ {
//					console.log( "Not yet implemented." )
				}
			}
		}

		return SoundLoader
	}
)

define(
	"spell/shared/util/platform/private/loader/ImageLoader",
	[
		"spell/shared/util/Events",

		'spell/functions'
	],
	function(
		Events,

		_
	) {
		"use strict"


		/*
		 * private
		 */

		var onLoad = function( image ) {
			if( this.loaded === true ) return

			this.loaded = true

			this.onCompleteCallback( image )
		}

		var onError = function( event ) {
			this.eventManager.publish(
				[ Events.RESOURCE_ERROR, this.resourceBundleName ],
				[ this.resourceBundleName, event ]
			)
		}

		var onReadyStateChange = function( image ) {
			if( image.readyState === "complete" ) {
				image.onload( image )
			}
		}


		/*
		 * public
		 */

		var ImageLoader = function( eventManager, resourcePath, resourceBundleName, resourceName, loadingCompletedCallback, timedOutCallback, renderingContext ) {
			this.eventManager       = eventManager
			this.renderingContext   = renderingContext
			this.resourceBundleName = resourceBundleName
			this.resourcePath       = resourcePath
			this.resourceName       = resourceName
			this.onCompleteCallback = loadingCompletedCallback
			this.loaded             = false
		}

		ImageLoader.prototype = {
			start: function() {
				var image = new Image()
				image.onload             = _.bind( onLoad, this, image )
				image.onreadystatechange = _.bind( onReadyStateChange, this, image )
				image.onerror            = _.bind( onError, this )
				image.src                = this.resourcePath + '/' + this.resourceName
			}
		}

		return ImageLoader
	}
)

define(
	'spell/shared/util/platform/private/jsonCoder',
	[
		'spell/functions'
	],
	function(
		_
	) {
		'use strict'


		/**
		 * Creates a string encoded json data structure out of a json data structure.
		 */
		var encode = _.bind( JSON.stringify, JSON )

		/**
		 * Creates a json data structure out of a string encoded json data structure.
		 */
		var decode = _.bind( JSON.parse, JSON )

		return {
			encode : encode,
			decode : decode
		}
	}
)

define(
	"spell/shared/util/platform/private/isBrowser",
	function() {
		"use strict"


		return !!( typeof window !== "undefined" && navigator && document )
	}
)

define(
	'spell/shared/util/platform/private/initDebugEnvironment',
	function() {
		'use strict'


		return function( logger ) {
			// rewiring console.log
			console.originalLog = console.log

			console.log = function() {
				logger.error( 'Usage of console.log is prohibited within the SpellJS framework. You can use the built-in <a href="http://docs.spelljs.com/index.html#!/guide/tutorials_using_console_logging" target="_blank">logging functionality</a> instead.' )
			}

			// putting global error handler in place
			if( window ) {
				window.onerror = function( message, url, line ) {
					logger.error( '\'' + message + '\' in ' + url + ':' + line )

					return true
				}
			}
		}
	}
)

define(
	"spell/shared/util/platform/private/graphics/flash/Flash2dRenderingFactory",
	function() {

		var createCanvasContext = function() {
			throw "Creating a 2d flash renderer is not valid in this context"
		}

		var renderingFactory = {
			createContext2d : createCanvasContext
		}


		return renderingFactory
	}
)

define(
	"spell/shared/util/platform/private/graphics/Viewporter",
	function () {
        "use strict"


		/**
		 * Viewporter constructor
		 *
		 * @param id the id of the spell container div
		 */
		return function( id ) {
			var viewporter = {}

			viewporter.renderViewport = function ( onScreenResized ) {
				var createViewportMetaTag = function( initialScale ) {
					var meta = document.createElement( 'meta' )
					meta.name    = 'viewport'
					meta.content = 'width=device-width; initial-scale=' + initialScale + '; maximum-scale=' + initialScale + '; user-scalable=0;'

					return meta
				}

				var getOffset = function( element ) {
					var box = element.getBoundingClientRect()

					var body    = document.body
					var docElem = document.documentElement

					var scrollTop  = window.pageYOffset || docElem.scrollTop || body.scrollTop
					var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft

					var clientTop  = docElem.clientTop || body.clientTop || 0
					var clientLeft = docElem.clientLeft || body.clientLeft || 0

					var top  = box.top + scrollTop - clientTop
					var left = box.left + scrollLeft - clientLeft

					return [ Math.round( left ), Math.round( top ) ]
				}

				var publishScreenResizedEvent = function() {
					var offset = getOffset( document.getElementById( id ) )
					var width  = window.innerWidth - offset[ 0 ]
					var height = window.innerHeight - offset[ 1 ]

					onScreenResized( width, height )
				}


				if( navigator.userAgent.match( /iPhone/i ) ||
					navigator.userAgent.match( /iPod/i ) ) {

					document.getElementsByTagName( 'head' )[ 0 ].appendChild( createViewportMetaTag( '0.5' ) )

				} else if( navigator.userAgent.match( /iPad/i ) ) {

					document.getElementsByTagName( 'head' )[ 0 ].appendChild( createViewportMetaTag( '1.0' ) )
				}


				// initialize viewporter object
				viewporter = {

					// options
					forceDetection: false,

					// constants
					ACTIVE: (('ontouchstart' in window) || (/webos/i).test(navigator.userAgent)),
					READY: false,

					// methods
					isLandscape: function() {
						return window.orientation === 90 || window.orientation === -90
					},

					ready: function(callback) {
						window.addEventListener('viewportready', callback, false)
					}

				}

				// if we are on Desktop, no need to go further
				if (!viewporter.ACTIVE) {
					window.onresize = publishScreenResizedEvent
					publishScreenResizedEvent()

					return
				}

				// create private constructor with prototype..just looks cooler
				var _Viewporter = function() {

					var that = this

					this.IS_ANDROID = /Android/.test(navigator.userAgent)

					var _onReady = function() {

						// scroll the shit away and fix the viewport!
						that.prepareVisualViewport()

						// listen for orientation change
						var cachedOrientation = window.orientation;
						window.addEventListener('orientationchange', function() {
							if(window.orientation != cachedOrientation) {
								that.prepareVisualViewport()
								cachedOrientation = window.orientation
							}
						}, false)

					}


					// listen for document ready if not already loaded
					// then try to prepare the visual viewport and start firing custom events
					_onReady()

				}

				_Viewporter.prototype = {

					getProfile: function() {

						if(viewporter.forceDetection) {
							return null
						}

						for(var searchTerm in viewporter.profiles) {
							if(new RegExp(searchTerm).test(navigator.userAgent)) {
								return viewporter.profiles[searchTerm]
							}
						}
						return null
					},

					postProcess: function(  ) {
						// let everyone know we're finally ready
						viewporter.READY = true

						this.triggerWindowEvent(!this._firstUpdateExecuted ? 'viewportready' : 'viewportchange')
						this._firstUpdateExecuted = true

						publishScreenResizedEvent()
					},

					prepareVisualViewport: function( ) {

						var that = this

						// if we're running in webapp mode (iOS), there's nothing to scroll away
						if(navigator.standalone) {
							return this.postProcess()
						}

						// maximize the document element's height to be able to scroll away the url bar
						document.documentElement.style.minHeight = '5000px'

						var startHeight = window.innerHeight
						var deviceProfile = this.getProfile()
						var orientation = viewporter.isLandscape() ? 'landscape' : 'portrait'

						// try scrolling immediately
						window.scrollTo(0, that.IS_ANDROID ? 1 : 0) // Android needs to scroll by at least 1px

						// start the checker loop
						var iterations = this.IS_ANDROID && !deviceProfile ? 20 : 5 // if we're on Android and don't know the device, brute force hard
						var check = window.setInterval(function() {

							// retry scrolling
							window.scrollTo(0, that.IS_ANDROID ? 1 : 0) // Android needs to scroll by at least 1px

							if(
								that.IS_ANDROID
									? (deviceProfile ? window.innerHeight === deviceProfile[orientation] : --iterations < 0) // Android: either match against a device profile, or brute force
									: (window.innerHeight > startHeight || --iterations < 0) // iOS is comparably easy!
							) {
								clearInterval(check)

								// set minimum height of content to new window height
								document.documentElement.style.minHeight = window.innerHeight + 'px'

								if( !document.getElementById(id) ) throw "Viewport element Missing"

								// set the right height for the body wrapper to allow bottom positioned elements
								document.getElementById(id).style.position = 'relative'
								document.getElementById(id).style.height = window.innerHeight + 'px'

								// fire events, get ready
								that.postProcess( )

							}

						}, 10)

					},

					triggerWindowEvent: function(name) {
						var event = document.createEvent("Event")
						event.initEvent(name, false, false)
						window.dispatchEvent(event)
					}

				};

				// initialize
				new _Viewporter()

			}

			viewporter.profiles = {
				// Motorola Xoom
				'MZ601': {
					portrait: 696,
					landscape: 1176
				},

				// Samsung Galaxy S, S2 and Nexus S
				'GT-I9000|GT-I9100|Nexus S': {
					portrait: 508,
					landscape: 295
				},

				// Samsung Galaxy Pad
				'GT-P1000': {
					portrait: 657,
					landscape: 400
				},

				// HTC Desire & HTC Desire HD
				'Desire_A8181|DesireHD_A9191': {
					portrait: 533,
					landscape: 320
				}
			}

			return viewporter
		}
	}
)

define(
	"spell/shared/util/platform/private/createSocket",
	function() {
		"use strict"

		return function( host ) {
			var WebSocket = window.MozWebSocket || window.WebSocket
			var socket = new WebSocket( "ws://" + host + "/", 'socketrocket-0.1');

			return {
				send: function( message ) {
					socket.send( message )
				},
				setOnMessage: function( callback ) {
					socket.onmessage = function( event ) {
						callback( event.data )
					}
				},
				setOnConnected: function( callback ) {
					socket.onopen = function( event ) {
						callback( event.data )
					}
				}
			}
		}
	}
)

define(
	"spell/shared/util/platform/private/createLoader",
	[
		'spell/functions'
	],
	function(
		_
	) {
		"use strict"

		return function( constructor, eventManager, host, resourceBundleName, resourceUri, loadingCompletedCallback, timedOutCallback, soundManager ) {
			if( constructor === undefined )              throw 'Argument 1 is missing.'
			if( eventManager === undefined )             throw 'Argument 2 is missing.'
			if( host === undefined )                     throw 'Argument 3 is missing.'
			if( resourceBundleName === undefined )       throw 'Argument 4 is missing.'
			if( resourceUri === undefined )              throw 'Argument 5 is missing.'
			if( loadingCompletedCallback === undefined ) throw 'Argument 6 is missing.'
			if( timedOutCallback === undefined )         throw 'Argument 7 is missing.'

			return new constructor(
				eventManager,
				host,
				resourceBundleName,
				resourceUri,
				loadingCompletedCallback,
				timedOutCallback,
                soundManager
			)
		}
	}
)

define(
	'spell/shared/util/platform/private/createHost',
	function() {
		'use strict'


		return function() {
			return document.location.host
		}
	}
)

define(
	"spell/shared/util/platform/private/graphics/createCanvasNode",
	function() {
		return function( id, width, height ) {
			var container = document.getElementById( id )

			if( !container ) throw 'Could not find a container with the id ' + id + ' in the DOM tree.'


			var canvas = document.createElement( "canvas" )
				canvas.id     = 'spell-canvas'
				canvas.width  = width
				canvas.height = height

			container.appendChild( canvas )

			return canvas
		}
	}
)

define(
	"spell/shared/util/platform/private/graphics/webgl/shaders",
	function() {
		return {
			vertex: [
				"attribute vec2 aVertexPosition;",

				"uniform mat3 uScreenSpaceShimMatrix;",
				"uniform mat3 uModelViewMatrix;",
				"uniform mat3 uTextureMatrix;",

				"varying vec2 vTextureCoord;",


				"void main( void ) {",
					"vTextureCoord = ( uTextureMatrix * vec3( aVertexPosition, 1.0 ) ).st;",
					"gl_Position = vec4( uScreenSpaceShimMatrix * uModelViewMatrix * vec3( aVertexPosition, 1.0 ), 1.0 );",
				"}"
			].join( "\n" ),

			fragment: [
				"precision mediump float;",

				"uniform sampler2D uTexture0;",
				"uniform vec4 uGlobalColor;",
				"uniform float uGlobalAlpha;",
				"uniform bool uFillRect;",

				"varying vec2 vTextureCoord;",


				"void main( void ) {",
					"if( !uFillRect ) {",
					"	vec4 color = texture2D( uTexture0, vTextureCoord );",
					"	gl_FragColor = color * vec4( 1.0, 1.0, 1.0, uGlobalAlpha );",

					"} else {",
					"	gl_FragColor = uGlobalColor * vec4( 1.0, 1.0, 1.0, uGlobalAlpha );",
					"}",
				"}"
			].join( "\n" )
		}
	}
)

define(
	"spell/shared/util/platform/private/graphics/webgl/createContext",
	[
		'spell/functions'
	],
	function(
		_
	) {
		"use strict"


		var gl

		/*
		 * Returns a rendering context. Performs some probing to account for different runtime environments.
		 *
		 * @param canvas
		 */
		var createContext = function( canvas ) {
			var gl = null
			var contextNames = [ "webgl", "experimental-webgl", "webkit-3d", "moz-webgl" ]
			var attributes = {
				alpha: false
			}

			_.find(
				contextNames,
				function( it ) {
					gl = canvas.getContext( it, attributes )

					return ( gl !== null )
				}
			)

			return gl
		}

		return createContext
	}
)

define(
	'spell/shared/util/platform/private/graphics/webgl/createWebGlContext',
	[
		'spell/shared/util/platform/private/graphics/StateStack',
		'spell/shared/util/platform/private/graphics/webgl/createContext',
		'spell/shared/util/platform/private/graphics/webgl/shaders',

		'spell/shared/util/color',
		'spell/shared/util/platform/private/nativeType/createFloatArray',

		'spell/math/vec3',
		'spell/math/mat3'
	],
	function(
		StateStack,
		createContext,
		shaders,

		color,
		createFloatArray,

		vec3,
		mat3
	) {
		'use strict'


		/*
		 * private
		 */

		var gl
		var stateStack   = new StateStack( 32 )
		var currentState = stateStack.getTop()

		var screenSpaceShimMatrix = mat3.create()
		var shaderProgram

		// view space to screen space transformation matrix
		var viewToScreen = mat3.create()
		mat3.identity( viewToScreen )

		// world space to view space transformation matrix
		var worldToView = mat3.create()
		mat3.identity( worldToView )

		// accumulated transformation world space to screen space transformation matrix
		var worldToScreen = mat3.create()
		mat3.identity( worldToScreen )

		var tmpMatrix     = mat3.create(),
			textureMatrix = mat3.create()


		/*
		 * Creates a projection matrix that normalizes the transformation behaviour to that of the normalized canvas-2d (that is origin is in bottom left,
		 * positive x-axis to the right, positive y-axis up, screen space coordinates as input. The matrix transforms from screen space to clip space.
		 *
		 * @param width
		 * @param height
		 * @param matrix
		 */
		var createScreenSpaceShimMatrix = function( width, height, matrix ) {
			mat3.ortho(
				0,
				width,
				0,
				height,
				matrix
			)

			return matrix
		}

		var createViewToScreenMatrix = function( width, height, matrix ) {
			mat3.identity( matrix )

			matrix[ 0 ] = width * 0.5
			matrix[ 4 ] = height * 0.5
			matrix[ 6 ] = width * 0.5
			matrix[ 7 ] = height * 0.5

			return matrix
		}

		var initWrapperContext = function() {
			viewport( 0, 0, gl.canvas.width, gl.canvas.height )

			// gl initialization
			gl.clearColor( 0.0, 0.0, 0.0, 1.0 )
			gl.clear( gl.COLOR_BUFFER_BIT )

			// setting up blending
			gl.enable( gl.BLEND )
			gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA )

			gl.disable( gl.DEPTH_TEST )

			gl.activeTexture( gl.TEXTURE0 )

			setupShader()
		}

		/*
		 * Creates a wrapper context for the backend context.
		 */
		var createWrapperContext = function() {
			initWrapperContext()

			return {
				clear             : clear,
				createTexture     : createWebGlTexture,
				drawTexture       : drawTexture,
				drawSubTexture    : drawSubTexture,
				fillRect          : fillRect,
				getConfiguration  : getConfiguration,
				resizeColorBuffer : resizeColorBuffer,
				restore           : restore,
				rotate            : rotate,
				save              : save,
				scale             : scale,
				setClearColor     : setClearColor,
				setFillStyleColor : setFillStyleColor,
				setGlobalAlpha    : setGlobalAlpha,
				setTransform      : setTransform,
				setViewMatrix     : setViewMatrix,
				transform         : transform,
				translate         : translate,
				viewport          : viewport
			}
		}

		/*
		 * Returns a rendering context. Once a context has been created additional calls to this method return the same context instance.
		 *
		 * @param canvas - the canvas dom element
		 */
		var createWebGlContext = function( canvas ) {
			if( canvas === undefined ) throw 'Missing first argument.'

			if( gl !== undefined ) return gl


			gl = createContext( canvas )

			if( gl === null ) return null


			return createWrapperContext()
		}

		var setupShader = function() {
			shaderProgram = gl.createProgram()

			var vertexShader = gl.createShader( gl.VERTEX_SHADER )
			gl.shaderSource( vertexShader, shaders.vertex )
			gl.compileShader (vertexShader )
			gl.attachShader( shaderProgram, vertexShader )

			var fragmentShader = gl.createShader( gl.FRAGMENT_SHADER )
			gl.shaderSource( fragmentShader, shaders.fragment )
			gl.compileShader( fragmentShader )
			gl.attachShader( shaderProgram, fragmentShader )

			gl.linkProgram( shaderProgram )
			gl.useProgram( shaderProgram )


			// setting up vertices
			var vertices = createFloatArray( 8 )
			vertices[ 0 ] = 0.0
			vertices[ 1 ] = 0.0
			vertices[ 2 ] = 1.0
			vertices[ 3 ] = 0.0
			vertices[ 4 ] = 0.0
			vertices[ 5 ] = 1.0
			vertices[ 6 ] = 1.0
			vertices[ 7 ] = 1.0


			var vertexPositionBuffer = gl.createBuffer()
			gl.bindBuffer( gl.ARRAY_BUFFER, vertexPositionBuffer )
			gl.bufferData( gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW )


			var attributeLocation = gl.getAttribLocation( shaderProgram, 'aVertexPosition' )
			gl.vertexAttribPointer( attributeLocation, 2, gl.FLOAT, false, 0, 0 )
			gl.enableVertexAttribArray( attributeLocation )


			// setting up screen space shim matrix
			var uniformLocation = gl.getUniformLocation( shaderProgram, 'uScreenSpaceShimMatrix' )
			gl.uniformMatrix3fv( uniformLocation, false, screenSpaceShimMatrix )


			// setting up texture matrix
			resetTextureMatrix( textureMatrix )
		}


		var isTextureMatrixIdentity = false

		var resetTextureMatrix = function( matrix ) {
			if( isTextureMatrixIdentity ) return

			matrix[ 0 ] = 1.0
			matrix[ 4 ] = 1.0
			matrix[ 6 ] = 0.0
			matrix[ 7 ] = 0.0

			gl.uniformMatrix3fv( gl.getUniformLocation( shaderProgram, 'uTextureMatrix' ), false, matrix )
		}

		var updateTextureMatrix = function( ss, st, tt, ts, matrix ) {
			isTextureMatrixIdentity = false

			matrix[ 0 ] = ss
			matrix[ 4 ] = st
			matrix[ 6 ] = tt
			matrix[ 7 ] = ts

			gl.uniformMatrix3fv( gl.getUniformLocation( shaderProgram, 'uTextureMatrix' ), false, matrix )
		}


		/*
		 * public
		 */

		var save = function() {
			stateStack.pushState()
			currentState = stateStack.getTop()
		}

		var restore = function() {
			stateStack.popState()
			currentState = stateStack.getTop()
		}

		var setFillStyleColor = function( vec ) {
			currentState.color = color.createRgba( vec )
		}

		var setGlobalAlpha = function( u ) {
			currentState.opacity = u
		}

		var setClearColor = function( vec ) {
			gl.clearColor( vec[ 0 ], vec[ 1 ], vec[ 2 ], 1.0 )
		}

		var scale = function( vec ) {
			mat3.scale( currentState.matrix, vec )
		}

		var translate = function( vec ) {
			mat3.translate( currentState.matrix, vec )
		}

		var rotate = function( u ) {
			mat3.rotate( currentState.matrix, u )
		}

		/*
		 * Clears the color buffer with the clear color
		 */
		var clear = function() {
			gl.clear( gl.COLOR_BUFFER_BIT )
		}

		var drawTexture = function( texture, dx, dy, dw, dh ) {
			if( texture === undefined ) throw 'Texture is undefined'


			if( !dw ) dw = 1.0
			if( !dh ) dh = 1.0

			// setting up fillRect mode
			var uniformLocation = gl.getUniformLocation( shaderProgram, 'uFillRect' )
			gl.uniform1i( uniformLocation, 0 )

			// setting up global alpha
			gl.uniform1f( gl.getUniformLocation( shaderProgram, 'uGlobalAlpha' ), currentState.opacity )

			// setting up global color
			gl.uniform4fv( gl.getUniformLocation( shaderProgram, 'uGlobalColor' ), currentState.color )

			// setting up texture
			gl.bindTexture( gl.TEXTURE_2D, texture.privateGlTextureResource )
			uniformLocation = gl.getUniformLocation( shaderProgram, 'uTexture0' )
			gl.uniform1i( uniformLocation, 0 )

			// setting up transformation
			mat3.multiply( worldToScreen, currentState.matrix, tmpMatrix )

			// rotating the image so that it is not upside down
			mat3.translate( tmpMatrix, [ dx, dy ] )
			mat3.rotate( tmpMatrix, Math.PI )
			mat3.scale( tmpMatrix, [ -dw, dh ] )
			mat3.translate( tmpMatrix, [ 0, -1 ] )

			gl.uniformMatrix3fv( gl.getUniformLocation( shaderProgram, 'uModelViewMatrix' ), false, tmpMatrix )

			// setting up the texture matrix
			resetTextureMatrix( textureMatrix )

			// drawing
			gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 )
		}

		var drawSubTexture = function( texture, sx, sy, sw, sh, dx, dy, dw, dh ) {
			if( texture === undefined ) throw 'Texture is undefined'


			if( !dw ) dw = 1.0
			if( !dh ) dh = 1.0

			// setting up fillRect mode
			var uniformLocation = gl.getUniformLocation( shaderProgram, 'uFillRect' )
			gl.uniform1i( uniformLocation, 0 )

			// setting up global alpha
			gl.uniform1f( gl.getUniformLocation( shaderProgram, 'uGlobalAlpha' ), currentState.opacity )

			// setting up global color
			gl.uniform4fv( gl.getUniformLocation( shaderProgram, 'uGlobalColor' ), currentState.color )

			// setting up texture
			gl.bindTexture( gl.TEXTURE_2D, texture.privateGlTextureResource )
			uniformLocation = gl.getUniformLocation( shaderProgram, 'uTexture0' )
			gl.uniform1i( uniformLocation, 0 )

			// setting up transformation
			mat3.multiply( worldToScreen, currentState.matrix, tmpMatrix )

			// rotating the image so that it is not upside down
			mat3.translate( tmpMatrix, [ dx, dy ] )
			mat3.rotate( tmpMatrix, Math.PI )
			mat3.scale( tmpMatrix, [ -dw, dh ] )
			mat3.translate( tmpMatrix, [ 0, -1 ] )

			gl.uniformMatrix3fv( gl.getUniformLocation( shaderProgram, 'uModelViewMatrix' ), false, tmpMatrix )

			// setting up the texture matrix
			var tw = texture.dimensions[ 0 ],
				th = texture.dimensions[ 1 ]

			updateTextureMatrix(
				sw / tw,
				sh / th,
				sx / tw,
				sy / th,
				textureMatrix
			)

			// drawing
			gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 )
		}

		var fillRect = function( dx, dy, dw, dh ) {
			// setting up fillRect mode
			var uniformLocation = gl.getUniformLocation( shaderProgram, 'uFillRect' )
			gl.uniform1i( uniformLocation, 1 )

			// setting up global alpha
			gl.uniform1f( gl.getUniformLocation( shaderProgram, 'uGlobalAlpha' ), currentState.opacity )

			// setting up global color
			gl.uniform4fv( gl.getUniformLocation( shaderProgram, 'uGlobalColor' ), currentState.color )

			// setting up transformation
			mat3.multiply( worldToScreen, currentState.matrix, tmpMatrix )

			// correcting position
			mat3.translate( tmpMatrix, [ dx, dy ] )
			mat3.scale( tmpMatrix, [ dw, dh ] )

			gl.uniformMatrix3fv( gl.getUniformLocation( shaderProgram, 'uModelViewMatrix' ), false, tmpMatrix )

			// drawing
			gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 )
		}

		var resizeColorBuffer = function( width, height ) {
			gl.canvas.width  = width
			gl.canvas.height = height

			createViewToScreenMatrix( width, height, viewToScreen )
			mat3.multiply( viewToScreen, worldToView, worldToScreen )
		}

		var transform = function( matrix ) {
			mat3.multiply( currentState.matrix, matrix )
		}

		var setTransform = function( matrix ) {
			mat3.set( matrix, currentState.matrix )
		}

		var setViewMatrix = function( matrix ) {
			mat3.set( matrix, worldToView )
			createViewToScreenMatrix( gl.canvas.width, gl.canvas.height, viewToScreen )
			mat3.multiply( viewToScreen, worldToView, worldToScreen )
		}

		var viewport = function( x, y, width, height ) {
			gl.viewport( x, y , width, height )

			// reinitialize screen space shim matrix
			createScreenSpaceShimMatrix( width, height, screenSpaceShimMatrix )

			var uniformLocation = gl.getUniformLocation( shaderProgram, 'uScreenSpaceShimMatrix' )
			gl.uniformMatrix3fv( uniformLocation, false, screenSpaceShimMatrix )
		}

		/*
		 * Returns an object describing the current configuration of the rendering backend.
		 */
		var getConfiguration = function() {
			return {
				type   : 'webgl',
				width  : gl.canvas.width,
				height : gl.canvas.height
			}
		}

		/*
		 * Returns instance of texture class
		 *
		 * The public interface of the texture class consists of the two attributes width and height.
		 *
		 * @param image
		 */
		var createWebGlTexture = function( image ) {
			var texture = gl.createTexture()
			gl.bindTexture( gl.TEXTURE_2D, texture )
			gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image )
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR )
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE )
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE )
			gl.generateMipmap( gl.TEXTURE_2D )
			gl.bindTexture( gl.TEXTURE_2D, null )


			return {
				/*
				 * Public
				 */
				dimensions : [ image.width, image.height ],

				/*
				 * Private
				 *
				 * This is an implementation detail of the class. If you write code that depends on this you better know what you are doing.
				 */
				privateGlTextureResource : texture
			}
		}

		return createWebGlContext
	}
)

define(
	'spell/shared/util/color',
	[
		'spell/math/util',

		'spell/math/vec3',
		'spell/functions'
	],
	function(
		mathUtil,

		vec3
	) {
		'use strict'


		var toRange = function( value ) {
			return Math.round( mathUtil.clamp( value, 0, 1 ) * 255 )
		}


		var createRgb = function( r, g, b ) {
			return [ r, g, b ]
		}


		var createRgba = function( vec ) {
			return ( vec.length === 4 ?
				[ vec[ 0 ], vec[ 1 ], vec[ 2 ], vec[ 3 ] ] :
				[ vec[ 0 ], vec[ 1 ], vec[ 2 ], 1.0 ] )
		}


		var createRandom = function() {
			var primaryColorIndex = Math.round( Math.random() * 3 )
			var colorVec = vec3.create( [ 0.8, 0.8, 0.8 ] )

			for( var i = 0; i < colorVec.length; i++ ) {
				if ( i === primaryColorIndex ) {
					colorVec[ i ] = 0.95

				} else {
					colorVec[ i ] *= Math.random()
				}
			}

			return colorVec
		}


		var formatCanvas = function( vec ) {
			if( vec.length === 4 ) {
				return 'rgba('
					+ toRange( vec[ 0 ] ) + ', '
					+ toRange( vec[ 1 ] ) + ', '
					+ toRange( vec[ 2 ] ) + ', '
					+ Math.max( 0, Math.min( vec[ 3 ], 1 ) ) + ')'
			}

			return 'rgb('
				+ toRange( vec[ 0 ] ) + ', '
				+ toRange( vec[ 1 ] ) + ', '
				+ toRange( vec[ 2 ] ) + ')'
		}


		return {
			createRgb    : createRgb,
			createRgba   : createRgba,
			createRandom : createRandom,
			formatCanvas : formatCanvas
		}
	}
)

define(
	'spell/shared/util/platform/private/graphics/StateStack',
	[
		'spell/shared/util/platform/private/nativeType/createFloatArray',

		'spell/math/mat3',
		'spell/functions'
	],
	function(
		createFloatArray,

		mat3,
		_
	) {
		'use strict'


		/*
		 * private
		 */

		var createState = function( opacity, fillStyleColor, matrix ) {
			return {
				opacity : opacity,
				color   : fillStyleColor,
				matrix  : matrix
			}
		}

		var createDefaultState = function() {
			var opacity        = 1.0,
				fillStyleColor = createFloatArray( 4 ),
				matrix         = mat3.create()

			fillStyleColor[ 0 ] = 1.0
			fillStyleColor[ 1 ] = 1.0
			fillStyleColor[ 2 ] = 1.0
			fillStyleColor[ 3 ] = 1.0

			mat3.identity( matrix )

			return createState( opacity, fillStyleColor, matrix )
		}

		var copyState = function( source, target ) {
			target.opacity = source.opacity

			target.color[ 0 ] = source.color[ 0 ]
			target.color[ 1 ] = source.color[ 1 ]
			target.color[ 2 ] = source.color[ 2 ]
			target.color[ 3 ] = source.color[ 3 ]

			mat3.set( source.matrix, target.matrix )
		}


		/*
		 * public
		 */

		var StateStack = function( depth ) {
			this.depth = depth
			this.stack = _.range( depth )
			this.index = 0

			// initializing stack
			for( var i = 0, stack = this.stack; i < depth; i++ ) {
				stack[ i ] = createDefaultState()
			}
		}

		StateStack.prototype = {
			pushState : function() {
				var index = this.index,
					stack = this.stack

				if( index === this.depth -1 ) throw 'Can not push state. Maximum state stack depth of ' + this.depth + ' was reached.'


				copyState( stack[ index ], stack[ ++this.index ] )
			},
			popState : function() {
				var index = this.index

				if( index > 0 ) {
					this.index--

				} else {
					throw 'Can not pop state. The state stack is already depleted.'
				}
			},
			getTop : function() {
				return this.stack[ this.index ]
			}
		}

		return StateStack
	}
)

define(
	'spell/shared/util/platform/private/graphics/canvas/createCanvasContext',
	[
		'spell/shared/util/platform/private/graphics/StateStack',
		'spell/shared/util/color',

		'spell/math/mat3'
	],
	function(
		StateStack,
		color,

		mat3
	) {
		'use strict'


		/*
		 * private
		 */

		var context
		var clearColor   = color.formatCanvas( [ 0.0, 0.0, 0.0, 1.0 ] )
		var stateStack   = new StateStack( 32 )
		var currentState = stateStack.getTop()

		// world space to view space transformation matrix
		var worldToView = mat3.create()
		mat3.identity( worldToView )

		// view space to screen space transformation matrix
		var viewToScreen = mat3.create()
		mat3.identity( viewToScreen )

		// accumulated transformation world space to screen space transformation matrix
		var worldToScreen = mat3.create()
		mat3.identity( worldToScreen )


		/*
		 * Returns true if the supplied quad covers the full screen, false otherwise.
		 *
		 * @param x
		 * @param y
		 * @param width
		 * @param height
		 */
		var isFullscreenCovered = function( x, y, width, height ) {
			var leftBorder   = x,
				rightBorder  = x + width,
				topBorder    = y + height,
				bottomBorder = y

			return ( leftBorder <= 0 &&
				rightBorder >= context.canvas.width &&
				topBorder >= context.canvas.height &&
				bottomBorder <= 0 )
		}

		var setClippingRegion = function( x, y, width, height ) {
			context.beginPath()
			context.rect( x, y, width, height )
			context.closePath()
			context.clip()
		}

		var updateWorldToScreen = function( viewToScreen, worldToView ) {
			mat3.multiply( viewToScreen, worldToView, worldToScreen )

			context.setTransform(
				worldToScreen[ 0 ],
				worldToScreen[ 1 ],
				worldToScreen[ 3 ],
				worldToScreen[ 4 ],
				worldToScreen[ 6 ],
				worldToScreen[ 7 ]
			)
		}

		var initWrapperContext = function() {
			viewport( 0, 0, context.canvas.width, context.canvas.height )

			// world space to view space matrix
			var cameraWidth  = context.canvas.width,
				cameraHeight = context.canvas.height

			mat3.ortho(
				-cameraWidth / 2,
				cameraWidth / 2,
				-cameraHeight / 2,
				cameraHeight / 2,
				worldToView
			)

			mat3.translate( worldToView, [ -cameraWidth / 2, -cameraHeight / 2 ] ) // WATCH OUT: apply inverse translation for camera position

			updateWorldToScreen( viewToScreen, worldToView )
		}

		/*
		 * Creates a wrapper context from the backend context.
		 */
		var createWrapperContext = function() {
			initWrapperContext()

			return {
				clear             : clear,
				createTexture     : createCanvasTexture,
				drawTexture       : drawTexture,
				drawSubTexture    : drawSubTexture,
				fillRect          : fillRect,
				getConfiguration  : getConfiguration,
				resizeColorBuffer : resizeColorBuffer,
				restore           : restore,
				rotate            : rotate,
				save              : save,
				scale             : scale,
				setClearColor     : setClearColor,
				setFillStyleColor : setFillStyleColor,
				setGlobalAlpha    : setGlobalAlpha,
				setTransform      : setTransform,
				setViewMatrix     : setViewMatrix,
				transform         : transform,
				translate         : translate,
				viewport          : viewport
			}
		}

		/*
		 * Returns a rendering context. Once a context has been created additional calls to this method return the same context instance.
		 *
		 * @param canvas - the canvas dom element
		 */
		var createCanvasContext = function( canvas ) {
			if( canvas === undefined ) throw 'Missing first argument.'

			if( context !== undefined ) return context


			context = canvas.getContext( '2d' )

			if( context === null ) return null


			return createWrapperContext()
		}


		/*
		 * public
		 */

		var setFillStyleColor = function( vec ) {
			currentState.color = color.createRgba( vec )
		}

		var setGlobalAlpha = function( u ) {
			currentState.opacity = u
		}

		var setClearColor = function( vec ) {
			clearColor = color.formatCanvas( vec )
		}

		var save = function() {
			stateStack.pushState()
			currentState = stateStack.getTop()
		}

		var restore = function() {
			stateStack.popState()
			currentState = stateStack.getTop()
		}

		var scale = function( vec ) {
			mat3.scale( currentState.matrix, vec )
		}

		var translate = function( vec ) {
			mat3.translate( currentState.matrix, vec )
		}

		var rotate = function( u ) {
			mat3.rotate( currentState.matrix, u )
		}

		/*
		 * Clears the color buffer with the clear color
		 */
		var clear = function() {
			context.save()
			{
				// reset transformation to identity
				context.setTransform( 1, 0, 0, 1, 0, 0 )

				context.fillStyle = clearColor
				context.fillRect( 0, 0, context.canvas.width, context.canvas.height )
			}
			context.restore()
		}

		var drawTexture = function( texture, dx, dy, dw, dh ) {
			if( texture === undefined ) throw 'Texture is undefined'

			if( !dw ) dw = 1.0
			if( !dh ) dh = 1.0

			context.save()
			{
				context.globalAlpha = currentState.opacity

				var modelToWorld = currentState.matrix

				context.transform(
					modelToWorld[ 0 ],
					modelToWorld[ 1 ],
					modelToWorld[ 3 ],
					modelToWorld[ 4 ],
					modelToWorld[ 6 ],
					modelToWorld[ 7 ]
				)

				// rotating the image so that it is not upside down
				context.translate( dx, dy )
				context.rotate( Math.PI )
				context.scale( -1, 1 )
				context.translate( 0, -dh )

				context.drawImage( texture.privateImageResource, 0 , 0, dw, dh )
			}
			context.restore()
		}

		var drawSubTexture = function( texture, sx, sy, sw, sh, dx, dy, dw, dh ) {
			if( texture === undefined ) throw 'Texture is undefined'

			context.save()
			{
				context.globalAlpha = currentState.opacity

				var modelToWorld = currentState.matrix

				context.transform(
					modelToWorld[ 0 ],
					modelToWorld[ 1 ],
					modelToWorld[ 3 ],
					modelToWorld[ 4 ],
					modelToWorld[ 6 ],
					modelToWorld[ 7 ]
				)

				// rotating the image so that it is not upside down
				context.translate( dx, dy )
				context.rotate( Math.PI )
				context.scale( -1, 1 )
				context.translate( 0, -dh )

				context.drawImage( texture.privateImageResource, sx, sy, sw, sh, 0 , 0, dw, dh )
			}
			context.restore()
		}

		var fillRect = function( dx, dy, dw, dh ) {
			context.save()
			{
				context.fillStyle   = color.formatCanvas( currentState.color )
				context.globalAlpha = currentState.opacity

				var modelToWorld = currentState.matrix

				context.transform(
					modelToWorld[ 0 ],
					modelToWorld[ 1 ],
					modelToWorld[ 3 ],
					modelToWorld[ 4 ],
					modelToWorld[ 6 ],
					modelToWorld[ 7 ]
				)

				// rotating the image so that it is not upside down
				context.translate( dx, dy )
				context.rotate( Math.PI )
				context.scale( -1, 1 )
				context.translate( 0, -dh )

				context.fillRect( 0, 0, dw, dh )
			}
			context.restore()
		}

		var resizeColorBuffer = function( width, height ) {
			context.canvas.width  = width
			context.canvas.height = height
		}

		var transform = function( matrix ) {
			mat3.multiply( currentState.matrix, matrix )
		}

		var setTransform = function( matrix ) {
			mat3.set( matrix, currentState.matrix )
		}

		var setViewMatrix = function( matrix ) {
			mat3.set( matrix, worldToView )

			updateWorldToScreen( viewToScreen, worldToView )
		}

		var viewport = function( x, y, width, height ) {
			mat3.identity( viewToScreen )

			viewToScreen[ 0 ] = width * 0.5
			viewToScreen[ 4 ] = height * 0.5 * -1 // mirroring y-axis
			viewToScreen[ 6 ] = x + width * 0.5
			viewToScreen[ 7 ] = y + height * 0.5

			updateWorldToScreen( viewToScreen, worldToView )

			if( !isFullscreenCovered( x, y, width, height ) ) {
				setClippingRegion( x, y, width, height )
			}
		}

		/*
		 * Returns an object describing the current configuration of the rendering backend.
		 */
		var getConfiguration = function() {
			return {
				type   : 'canvas-2d',
				width  : context.canvas.width,
				height : context.canvas.height
			}
		}

		/*
		 * Returns instance of texture class
		 *
		 * The public interface of the texture class consists of the two attributes width and height.
		 *
		 * @param image
		 */
		var createCanvasTexture = function( image ) {
			return {
				/*
				 * Public
				 */
				dimensions : [ image.width, image.height ],

				/*
				 * Private
				 *
				 * This is an implementation detail of the class. If you write code that depends on this you better know what you are doing.
				 */
				privateImageResource : image
			}
		}

		return createCanvasContext
	}
)

define(
	"spell/shared/util/platform/private/graphics/RenderingFactory",
	[
		"spell/shared/util/platform/private/graphics/canvas/createCanvasContext",
		"spell/shared/util/platform/private/graphics/webgl/createWebGlContext",
		"spell/shared/util/platform/private/graphics/createCanvasNode"
	],
	function(
		createCanvasContext,
		createWebGlContext,
		createCanvasNode
	) {
		"use strict"


		var BACK_END_WEBGL  = 0
		var BACK_END_CANVAS = 1

        var context = null

		/*
		 * Creates a rendering context
		 *
         * @param eventManager - Eventmanager
		 * @param id - the id of the dom node the engine instance is placed in
		 * @param width - width in pixels
		 * @param height - height in pixels
		 * @param requestedBackEnd - when supplied, overrides the automagic rendering back-end detection
		 */
		var createContext2d = function( eventManager, id, width, height, requestedBackEnd ) {
			var canvas = createCanvasNode( id, width, height )

			if( canvas === null || canvas === undefined ) throw "Could not create canvas node."


			// webgl
			if( requestedBackEnd === undefined ? true : ( requestedBackEnd === BACK_END_WEBGL ) ) {
				context = createWebGlContext( canvas )

				if( context ) return context
			}

			// canvas-2d
			if( requestedBackEnd === undefined ? true : ( requestedBackEnd === BACK_END_CANVAS ) ) {
				context = createCanvasContext( canvas )

				if( context ) return context
			}

			throw "Could not create a rendering back-end."
		}

		return {
			BACK_END_WEBGL  : BACK_END_WEBGL,
			BACK_END_CANVAS : BACK_END_CANVAS,
			createContext2d : createContext2d
		}
	}
)

define(
	"spell/shared/util/platform/private/configurationOptions",
	[
		"spell/shared/util/platform/private/graphics/RenderingFactory"
	],
	function(
		RenderingFactory
	) {
		"use strict"


		var extractRenderingBackEnd = function( validValues, value ) {
			if( value === 'webgl' ) {
				return RenderingFactory.BACK_END_WEBGL

			} else if( value === 'canvas-2d' ) {
				return RenderingFactory.BACK_END_CANVAS
			}

			return false
		}

		/*
		 * These are the platform specific options.
		 */
		var validOptions = {
			renderingBackEnd : {
				validValues  : [ 'webgl', 'canvas-2d' ],
				configurable : true,
				extractor    : extractRenderingBackEnd
			}
		}

		/*
		 * These options are used when they are not overridden by the environment configuration set up by the stage-0-loader.
		 */
		var defaultOptions = {
			renderingBackEnd : 'canvas-2d'
		}

		return {
			defaultOptions : defaultOptions,
			validOptions   : validOptions
		}
	}
)

define(
	"spell/shared/util/platform/private/registerTimer",
	function() {
		"use strict";


		/*
		 * callback - the callback to call
		 * timeInMs - the number of milliseconds that the callback is delayed by
		 */
		return function( callback, timeInMs ) {
			setTimeout( callback, timeInMs )
		}
	}
)

define(
	"spell/shared/util/platform/private/callNextFrame",
	[
		"spell/shared/util/platform/private/registerTimer"
	],
	function(
		registerTimer
	) {
		"use strict";


		// running in node context
		if( typeof window === "undefined" ) {
			return function( callback ) {
				registerTimer( callback, 5 )
			}
		}


		// running in browser
		var browserCallback = (
			window.requestAnimationFrame       ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame    ||
			window.oRequestAnimationFrame      ||
			window.msRequestAnimationFrame
		)

		var hasBrowserSupport = !!browserCallback

		if( hasBrowserSupport ) {
			return function( callback ) {
				browserCallback.call( window, callback )
			}
		}


		// no browser support
		return function( callback ) {
			registerTimer(
				function() {
					callback( new Date() )
				},
				1000 / 60 // 60 Hz
			)
		}
	}
)

define(
	'spell/shared/util/platform/private/functions',
	function() {
		//     Underscore.js 1.3.3
		//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
		//     Underscore is freely distributable under the MIT license.
		//     Portions of Underscore are inspired or borrowed from Prototype,
		//     Oliver Steele's Functional, and John Resig's Micro-Templating.
		//     For all details and documentation:
		//     http://documentcloud.github.com/underscore

		// Baseline setup
		// --------------

		// Establish the root object, `window` in the browser, or `global` on the server.
		var root = this;

		// Save the previous value of the `_` variable.
		var previousUnderscore = root._;

		// Establish the object that gets returned to break out of a loop iteration.
		var breaker = {};

		// Save bytes in the minified (but not gzipped) version:
		var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

		// Create quick reference variables for speed access to core prototypes.
		var slice            = ArrayProto.slice,
				unshift          = ArrayProto.unshift,
				toString         = ObjProto.toString,
				hasOwnProperty   = ObjProto.hasOwnProperty;

		// All **ECMAScript 5** native function implementations that we hope to use
		// are declared here.
		var
				nativeForEach      = ArrayProto.forEach,
				nativeMap          = ArrayProto.map,
				nativeReduce       = ArrayProto.reduce,
				nativeReduceRight  = ArrayProto.reduceRight,
				nativeFilter       = ArrayProto.filter,
				nativeEvery        = ArrayProto.every,
				nativeSome         = ArrayProto.some,
				nativeIndexOf      = ArrayProto.indexOf,
				nativeLastIndexOf  = ArrayProto.lastIndexOf,
				nativeIsArray      = Array.isArray,
				nativeKeys         = Object.keys,
				nativeBind         = FuncProto.bind;

		// Create a safe reference to the Underscore object for use below.
		var _ = function(obj) { return new wrapper(obj); };

		// Export the Underscore object for **Node.js**, with
		// backwards-compatibility for the old `require()` API. If we're in
		// the browser, add `_` as a global object via a string identifier,
		// for Closure Compiler "advanced" mode.
		if (typeof exports !== 'undefined') {
			if (typeof module !== 'undefined' && module.exports) {
				exports = module.exports = _;
			}
			exports._ = _;
		} else {
			root['_'] = _;
		}

		// Current version.
		_.VERSION = '1.3.3';

		// Collection Functions
		// --------------------

		// The cornerstone, an `each` implementation, aka `forEach`.
		// Handles objects with the built-in `forEach`, arrays, and raw objects.
		// Delegates to **ECMAScript 5**'s native `forEach` if available.
		var each = _.each = _.forEach = function(obj, iterator, context) {
			if (obj == null) return;
			if (nativeForEach && obj.forEach === nativeForEach) {
				obj.forEach(iterator, context);
			} else if (obj.length === +obj.length) {
				for (var i = 0, l = obj.length; i < l; i++) {
					if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) return;
				}
			} else {
				for (var key in obj) {
					if (_.has(obj, key)) {
						if (iterator.call(context, obj[key], key, obj) === breaker) return;
					}
				}
			}
		};

		// Return the results of applying the iterator to each element.
		// Delegates to **ECMAScript 5**'s native `map` if available.
		_.map = _.collect = function(obj, iterator, context) {
			var results = [];
			if (obj == null) return results;
			if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
			each(obj, function(value, index, list) {
				results[results.length] = iterator.call(context, value, index, list);
			});
			if (obj.length === +obj.length) results.length = obj.length;
			return results;
		};

		// **Reduce** builds up a single result from a list of values, aka `inject`,
		// or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
		_.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
			var initial = arguments.length > 2;
			if (obj == null) obj = [];
			if (nativeReduce && obj.reduce === nativeReduce) {
				if (context) iterator = _.bind(iterator, context);
				return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
			}
			each(obj, function(value, index, list) {
				if (!initial) {
					memo = value;
					initial = true;
				} else {
					memo = iterator.call(context, memo, value, index, list);
				}
			});
			if (!initial) throw new TypeError('Reduce of empty array with no initial value');
			return memo;
		};

		// The right-associative version of reduce, also known as `foldr`.
		// Delegates to **ECMAScript 5**'s native `reduceRight` if available.
		_.reduceRight = _.foldr = function(obj, iterator, memo, context) {
			var initial = arguments.length > 2;
			if (obj == null) obj = [];
			if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
				if (context) iterator = _.bind(iterator, context);
				return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
			}
			var reversed = _.toArray(obj).reverse();
			if (context && !initial) iterator = _.bind(iterator, context);
			return initial ? _.reduce(reversed, iterator, memo, context) : _.reduce(reversed, iterator);
		};

		// Return the first value which passes a truth test. Aliased as `detect`.
		_.find = _.detect = function(obj, iterator, context) {
			var result;
			any(obj, function(value, index, list) {
				if (iterator.call(context, value, index, list)) {
					result = value;
					return true;
				}
			});
			return result;
		};

		// Return all the elements that pass a truth test.
		// Delegates to **ECMAScript 5**'s native `filter` if available.
		// Aliased as `select`.
		_.filter = _.select = function(obj, iterator, context) {
			var results = [];
			if (obj == null) return results;
			if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
			each(obj, function(value, index, list) {
				if (iterator.call(context, value, index, list)) results[results.length] = value;
			});
			return results;
		};

		// Return all the elements for which a truth test fails.
		_.reject = function(obj, iterator, context) {
			var results = [];
			if (obj == null) return results;
			each(obj, function(value, index, list) {
				if (!iterator.call(context, value, index, list)) results[results.length] = value;
			});
			return results;
		};

		// Determine whether all of the elements match a truth test.
		// Delegates to **ECMAScript 5**'s native `every` if available.
		// Aliased as `all`.
		_.every = _.all = function(obj, iterator, context) {
			var result = true;
			if (obj == null) return result;
			if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
			each(obj, function(value, index, list) {
				if (!(result = result && iterator.call(context, value, index, list))) return breaker;
			});
			return !!result;
		};

		// Determine if at least one element in the object matches a truth test.
		// Delegates to **ECMAScript 5**'s native `some` if available.
		// Aliased as `any`.
		var any = _.some = _.any = function(obj, iterator, context) {
			iterator || (iterator = _.identity);
			var result = false;
			if (obj == null) return result;
			if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
			each(obj, function(value, index, list) {
				if (result || (result = iterator.call(context, value, index, list))) return breaker;
			});
			return !!result;
		};

		// Determine if a given value is included in the array or object using `===`.
		// Aliased as `contains`.
		_.include = _.contains = function(obj, target) {
			var found = false;
			if (obj == null) return found;
			if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
			found = any(obj, function(value) {
				return value === target;
			});
			return found;
		};

		// Invoke a method (with arguments) on every item in a collection.
		_.invoke = function(obj, method) {
			var args = slice.call(arguments, 2);
			return _.map(obj, function(value) {
				return (_.isFunction(method) ? method || value : value[method]).apply(value, args);
			});
		};

		// Convenience version of a common use case of `map`: fetching a property.
		_.pluck = function(obj, key) {
			return _.map(obj, function(value){ return value[key]; });
		};

		// Return the maximum element or (element-based computation).
		_.max = function(obj, iterator, context) {
			if (!iterator && _.isArray(obj) && obj[0] === +obj[0]) return Math.max.apply(Math, obj);
			if (!iterator && _.isEmpty(obj)) return -Infinity;
			var result = {computed : -Infinity};
			each(obj, function(value, index, list) {
				var computed = iterator ? iterator.call(context, value, index, list) : value;
				computed >= result.computed && (result = {value : value, computed : computed});
			});
			return result.value;
		};

		// Return the minimum element (or element-based computation).
		_.min = function(obj, iterator, context) {
			if (!iterator && _.isArray(obj) && obj[0] === +obj[0]) return Math.min.apply(Math, obj);
			if (!iterator && _.isEmpty(obj)) return Infinity;
			var result = {computed : Infinity};
			each(obj, function(value, index, list) {
				var computed = iterator ? iterator.call(context, value, index, list) : value;
				computed < result.computed && (result = {value : value, computed : computed});
			});
			return result.value;
		};

		// Shuffle an array.
		_.shuffle = function(obj) {
			var shuffled = [], rand;
			each(obj, function(value, index, list) {
				rand = Math.floor(Math.random() * (index + 1));
				shuffled[index] = shuffled[rand];
				shuffled[rand] = value;
			});
			return shuffled;
		};

		// Sort the object's values by a criterion produced by an iterator.
		_.sortBy = function(obj, val, context) {
			var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
			return _.pluck(_.map(obj, function(value, index, list) {
				return {
					value : value,
					criteria : iterator.call(context, value, index, list)
				};
			}).sort(function(left, right) {
						var a = left.criteria, b = right.criteria;
						if (a === void 0) return 1;
						if (b === void 0) return -1;
						return a < b ? -1 : a > b ? 1 : 0;
					}), 'value');
		};

		// Groups the object's values by a criterion. Pass either a string attribute
		// to group by, or a function that returns the criterion.
		_.groupBy = function(obj, val) {
			var result = {};
			var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
			each(obj, function(value, index) {
				var key = iterator(value, index);
				(result[key] || (result[key] = [])).push(value);
			});
			return result;
		};

		// Use a comparator function to figure out at what index an object should
		// be inserted so as to maintain order. Uses binary search.
		_.sortedIndex = function(array, obj, iterator) {
			iterator || (iterator = _.identity);
			var low = 0, high = array.length;
			while (low < high) {
				var mid = (low + high) >> 1;
				iterator(array[mid]) < iterator(obj) ? low = mid + 1 : high = mid;
			}
			return low;
		};

		// Safely convert anything iterable into a real, live array.
		_.toArray = function(obj) {
			if (!obj)                                     return [];
			if (_.isArray(obj))                           return slice.call(obj);
			if (_.isArguments(obj))                       return slice.call(obj);
			if (obj.toArray && _.isFunction(obj.toArray)) return obj.toArray();
			return _.values(obj);
		};

		// Return the number of elements in an object.
		_.size = function(obj) {
			return _.isArray(obj) ? obj.length : _.keys(obj).length;
		};

		// Array Functions
		// ---------------

		// Get the first element of an array. Passing **n** will return the first N
		// values in the array. Aliased as `head` and `take`. The **guard** check
		// allows it to work with `_.map`.
		_.first = _.head = _.take = function(array, n, guard) {
			return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
		};

		// Returns everything but the last entry of the array. Especcialy useful on
		// the arguments object. Passing **n** will return all the values in
		// the array, excluding the last N. The **guard** check allows it to work with
		// `_.map`.
		_.initial = function(array, n, guard) {
			return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
		};

		// Get the last element of an array. Passing **n** will return the last N
		// values in the array. The **guard** check allows it to work with `_.map`.
		_.last = function(array, n, guard) {
			if ((n != null) && !guard) {
				return slice.call(array, Math.max(array.length - n, 0));
			} else {
				return array[array.length - 1];
			}
		};

		// Returns everything but the first entry of the array. Aliased as `tail`.
		// Especially useful on the arguments object. Passing an **index** will return
		// the rest of the values in the array from that index onward. The **guard**
		// check allows it to work with `_.map`.
		_.rest = _.tail = function(array, index, guard) {
			return slice.call(array, (index == null) || guard ? 1 : index);
		};

		// Trim out all falsy values from an array.
		_.compact = function(array) {
			return _.filter(array, function(value){ return !!value; });
		};

		// Return a completely flattened version of an array.
		_.flatten = function(array, shallow) {
			return _.reduce(array, function(memo, value) {
				if (_.isArray(value)) return memo.concat(shallow ? value : _.flatten(value));
				memo[memo.length] = value;
				return memo;
			}, []);
		};

		// Return a version of the array that does not contain the specified value(s).
		_.without = function(array) {
			return _.difference(array, slice.call(arguments, 1));
		};

		// Produce a duplicate-free version of the array. If the array has already
		// been sorted, you have the option of using a faster algorithm.
		// Aliased as `unique`.
		_.uniq = _.unique = function(array, isSorted, iterator) {
			var initial = iterator ? _.map(array, iterator) : array;
			var results = [];
			// The `isSorted` flag is irrelevant if the array only contains two elements.
			if (array.length < 3) isSorted = true;
			_.reduce(initial, function (memo, value, index) {
				if (isSorted ? _.last(memo) !== value || !memo.length : !_.include(memo, value)) {
					memo.push(value);
					results.push(array[index]);
				}
				return memo;
			}, []);
			return results;
		};

		// Produce an array that contains the union: each distinct element from all of
		// the passed-in arrays.
		_.union = function() {
			return _.uniq(_.flatten(arguments, true));
		};

		// Produce an array that contains every item shared between all the
		// passed-in arrays. (Aliased as "intersect" for back-compat.)
		_.intersection = _.intersect = function(array) {
			var rest = slice.call(arguments, 1);
			return _.filter(_.uniq(array), function(item) {
				return _.every(rest, function(other) {
					return _.indexOf(other, item) >= 0;
				});
			});
		};

		// Take the difference between one array and a number of other arrays.
		// Only the elements present in just the first array will remain.
		_.difference = function(array) {
			var rest = _.flatten(slice.call(arguments, 1), true);
			return _.filter(array, function(value){ return !_.include(rest, value); });
		};

		// Zip together multiple lists into a single array -- elements that share
		// an index go together.
		_.zip = function() {
			var args = slice.call(arguments);
			var length = _.max(_.pluck(args, 'length'));
			var results = new Array(length);
			for (var i = 0; i < length; i++) results[i] = _.pluck(args, "" + i);
			return results;
		};

		// If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
		// we need this function. Return the position of the first occurrence of an
		// item in an array, or -1 if the item is not included in the array.
		// Delegates to **ECMAScript 5**'s native `indexOf` if available.
		// If the array is large and already in sort order, pass `true`
		// for **isSorted** to use binary search.
		_.indexOf = function(array, item, isSorted) {
			if (array == null) return -1;
			var i, l;
			if (isSorted) {
				i = _.sortedIndex(array, item);
				return array[i] === item ? i : -1;
			}
			if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item);
			for (i = 0, l = array.length; i < l; i++) if (i in array && array[i] === item) return i;
			return -1;
		};

		// Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
		_.lastIndexOf = function(array, item) {
			if (array == null) return -1;
			if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) return array.lastIndexOf(item);
			var i = array.length;
			while (i--) if (i in array && array[i] === item) return i;
			return -1;
		};

		// Generate an integer Array containing an arithmetic progression. A port of
		// the native Python `range()` function. See
		// [the Python documentation](http://docs.python.org/library/functions.html#range).
		_.range = function(start, stop, step) {
			if (arguments.length <= 1) {
				stop = start || 0;
				start = 0;
			}
			step = arguments[2] || 1;

			var len = Math.max(Math.ceil((stop - start) / step), 0);
			var idx = 0;
			var range = new Array(len);

			while(idx < len) {
				range[idx++] = start;
				start += step;
			}

			return range;
		};

		// Function (ahem) Functions
		// ------------------

		// Reusable constructor function for prototype setting.
		var ctor = function(){};

		// Create a function bound to a given object (assigning `this`, and arguments,
		// optionally). Binding with arguments is also known as `curry`.
		// Delegates to **ECMAScript 5**'s native `Function.bind` if available.
		// We check for `func.bind` first, to fail fast when `func` is undefined.
		_.bind = function bind(func, context) {
			var bound, args;
			if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
			if (!_.isFunction(func)) throw new TypeError;
			args = slice.call(arguments, 2);
			return bound = function() {
				if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
				ctor.prototype = func.prototype;
				var self = new ctor;
				var result = func.apply(self, args.concat(slice.call(arguments)));
				if (Object(result) === result) return result;
				return self;
			};
		};

		// Bind all of an object's methods to that object. Useful for ensuring that
		// all callbacks defined on an object belong to it.
		_.bindAll = function(obj) {
			var funcs = slice.call(arguments, 1);
			if (funcs.length == 0) funcs = _.functions(obj);
			each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
			return obj;
		};

		// Memoize an expensive function by storing its results.
		_.memoize = function(func, hasher) {
			var memo = {};
			hasher || (hasher = _.identity);
			return function() {
				var key = hasher.apply(this, arguments);
				return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
			};
		};

		// Delays a function for the given number of milliseconds, and then calls
		// it with the arguments supplied.
		_.delay = function(func, wait) {
			var args = slice.call(arguments, 2);
			return setTimeout(function(){ return func.apply(null, args); }, wait);
		};

		// Defers a function, scheduling it to run after the current call stack has
		// cleared.
		_.defer = function(func) {
			return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
		};

		// Returns a function, that, when invoked, will only be triggered at most once
		// during a given window of time.
		_.throttle = function(func, wait) {
			var context, args, timeout, throttling, more, result;
			var whenDone = _.debounce(function(){ more = throttling = false; }, wait);
			return function() {
				context = this; args = arguments;
				var later = function() {
					timeout = null;
					if (more) func.apply(context, args);
					whenDone();
				};
				if (!timeout) timeout = setTimeout(later, wait);
				if (throttling) {
					more = true;
				} else {
					result = func.apply(context, args);
				}
				whenDone();
				throttling = true;
				return result;
			};
		};

		// Returns a function, that, as long as it continues to be invoked, will not
		// be triggered. The function will be called after it stops being called for
		// N milliseconds. If `immediate` is passed, trigger the function on the
		// leading edge, instead of the trailing.
		_.debounce = function(func, wait, immediate) {
			var timeout;
			return function() {
				var context = this, args = arguments;
				var later = function() {
					timeout = null;
					if (!immediate) func.apply(context, args);
				};
				if (immediate && !timeout) func.apply(context, args);
				clearTimeout(timeout);
				timeout = setTimeout(later, wait);
			};
		};

		// Returns a function that will be executed at most one time, no matter how
		// often you call it. Useful for lazy initialization.
		_.once = function(func) {
			var ran = false, memo;
			return function() {
				if (ran) return memo;
				ran = true;
				return memo = func.apply(this, arguments);
			};
		};

		// Returns the first function passed as an argument to the second,
		// allowing you to adjust arguments, run code before and after, and
		// conditionally execute the original function.
		_.wrap = function(func, wrapper) {
			return function() {
				var args = [func].concat(slice.call(arguments, 0));
				return wrapper.apply(this, args);
			};
		};

		// Returns a function that is the composition of a list of functions, each
		// consuming the return value of the function that follows.
		_.compose = function() {
			var funcs = arguments;
			return function() {
				var args = arguments;
				for (var i = funcs.length - 1; i >= 0; i--) {
					args = [funcs[i].apply(this, args)];
				}
				return args[0];
			};
		};

		// Returns a function that will only be executed after being called N times.
		_.after = function(times, func) {
			if (times <= 0) return func();
			return function() {
				if (--times < 1) { return func.apply(this, arguments); }
			};
		};

		// Object Functions
		// ----------------

		// Retrieve the names of an object's properties.
		// Delegates to **ECMAScript 5**'s native `Object.keys`
		_.keys = nativeKeys || function(obj) {
			if (obj !== Object(obj)) throw new TypeError('Invalid object');
			var keys = [];
			for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
			return keys;
		};

		// Retrieve the values of an object's properties.
		_.values = function(obj) {
			return _.map(obj, _.identity);
		};

		// Return a sorted list of the function names available on the object.
		// Aliased as `methods`
		_.functions = _.methods = function(obj) {
			var names = [];
			for (var key in obj) {
				if (_.isFunction(obj[key])) names.push(key);
			}
			return names.sort();
		};

		// Extend a given object with all the properties in passed-in object(s).
		_.extend = function(obj) {
			each(slice.call(arguments, 1), function(source) {
				for (var prop in source) {
					obj[prop] = source[prop];
				}
			});
			return obj;
		};

		// Return a copy of the object only containing the whitelisted properties.
		_.pick = function(obj) {
			var result = {};
			each(_.flatten(slice.call(arguments, 1)), function(key) {
				if (key in obj) result[key] = obj[key];
			});
			return result;
		};

		// Fill in a given object with default properties.
		_.defaults = function(obj) {
			each(slice.call(arguments, 1), function(source) {
				for (var prop in source) {
					if (obj[prop] == null) obj[prop] = source[prop];
				}
			});
			return obj;
		};

		// Create a (shallow-cloned) duplicate of an object.
		_.clone = function(obj) {
			if (!_.isObject(obj)) return obj;
			return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
		};

		// Invokes interceptor with the obj, and then returns obj.
		// The primary purpose of this method is to "tap into" a method chain, in
		// order to perform operations on intermediate results within the chain.
		_.tap = function(obj, interceptor) {
			interceptor(obj);
			return obj;
		};

		// Internal recursive comparison function.
		function eq(a, b, stack) {
			// Identical objects are equal. `0 === -0`, but they aren't identical.
			// See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
			if (a === b) return a !== 0 || 1 / a == 1 / b;
			// A strict comparison is necessary because `null == undefined`.
			if (a == null || b == null) return a === b;
			// Unwrap any wrapped objects.
			if (a._chain) a = a._wrapped;
			if (b._chain) b = b._wrapped;
			// Invoke a custom `isEqual` method if one is provided.
			if (a.isEqual && _.isFunction(a.isEqual)) return a.isEqual(b);
			if (b.isEqual && _.isFunction(b.isEqual)) return b.isEqual(a);
			// Compare `[[Class]]` names.
			var className = toString.call(a);
			if (className != toString.call(b)) return false;
			switch (className) {
				// Strings, numbers, dates, and booleans are compared by value.
				case '[object String]':
					// Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
					// equivalent to `new String("5")`.
					return a == String(b);
				case '[object Number]':
					// `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
					// other numeric values.
					return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
				case '[object Date]':
				case '[object Boolean]':
					// Coerce dates and booleans to numeric primitive values. Dates are compared by their
					// millisecond representations. Note that invalid dates with millisecond representations
					// of `NaN` are not equivalent.
					return +a == +b;
				// RegExps are compared by their source patterns and flags.
				case '[object RegExp]':
					return a.source == b.source &&
							a.global == b.global &&
							a.multiline == b.multiline &&
							a.ignoreCase == b.ignoreCase;
			}
			if (typeof a != 'object' || typeof b != 'object') return false;
			// Assume equality for cyclic structures. The algorithm for detecting cyclic
			// structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
			var length = stack.length;
			while (length--) {
				// Linear search. Performance is inversely proportional to the number of
				// unique nested structures.
				if (stack[length] == a) return true;
			}
			// Add the first object to the stack of traversed objects.
			stack.push(a);
			var size = 0, result = true;
			// Recursively compare objects and arrays.
			if (className == '[object Array]') {
				// Compare array lengths to determine if a deep comparison is necessary.
				size = a.length;
				result = size == b.length;
				if (result) {
					// Deep compare the contents, ignoring non-numeric properties.
					while (size--) {
						// Ensure commutative equality for sparse arrays.
						if (!(result = size in a == size in b && eq(a[size], b[size], stack))) break;
					}
				}
			} else {
				// Objects with different constructors are not equivalent.
				if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) return false;
				// Deep compare objects.
				for (var key in a) {
					if (_.has(a, key)) {
						// Count the expected number of properties.
						size++;
						// Deep compare each member.
						if (!(result = _.has(b, key) && eq(a[key], b[key], stack))) break;
					}
				}
				// Ensure that both objects contain the same number of properties.
				if (result) {
					for (key in b) {
						if (_.has(b, key) && !(size--)) break;
					}
					result = !size;
				}
			}
			// Remove the first object from the stack of traversed objects.
			stack.pop();
			return result;
		}

		// Perform a deep comparison to check if two objects are equal.
		_.isEqual = function(a, b) {
			return eq(a, b, []);
		};

		// Is a given array, string, or object empty?
		// An "empty" object has no enumerable own-properties.
		_.isEmpty = function(obj) {
			if (obj == null) return true;
			if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
			for (var key in obj) if (_.has(obj, key)) return false;
			return true;
		};

		// Is a given value a DOM element?
		_.isElement = function(obj) {
			return !!(obj && obj.nodeType == 1);
		};

		// Is a given value an array?
		// Delegates to ECMA5's native Array.isArray
		_.isArray = nativeIsArray || function(obj) {
			return toString.call(obj) == '[object Array]';
		};

		// Is a given variable an object?
		_.isObject = function(obj) {
			return obj === Object(obj);
		};

		// Is a given variable an arguments object?
		_.isArguments = function(obj) {
			return toString.call(obj) == '[object Arguments]';
		};
		if (!_.isArguments(arguments)) {
			_.isArguments = function(obj) {
				return !!(obj && _.has(obj, 'callee'));
			};
		}

		// Is a given value a function?
		_.isFunction = function(obj) {
			return toString.call(obj) == '[object Function]';
		};

		// Is a given value a string?
		_.isString = function(obj) {
			return toString.call(obj) == '[object String]';
		};

		// Is a given value a number?
		_.isNumber = function(obj) {
			return toString.call(obj) == '[object Number]';
		};

		// Is a given object a finite number?
		_.isFinite = function(obj) {
			return _.isNumber(obj) && isFinite(obj);
		};

		// Is the given value `NaN`?
		_.isNaN = function(obj) {
			// `NaN` is the only value for which `===` is not reflexive.
			return obj !== obj;
		};

		// Is a given value a boolean?
		_.isBoolean = function(obj) {
			return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
		};

		// Is a given value a date?
		_.isDate = function(obj) {
			return toString.call(obj) == '[object Date]';
		};

		// Is the given value a regular expression?
		_.isRegExp = function(obj) {
			return toString.call(obj) == '[object RegExp]';
		};

		// Is a given value equal to null?
		_.isNull = function(obj) {
			return obj === null;
		};

		// Is a given variable undefined?
		_.isUndefined = function(obj) {
			return obj === void 0;
		};

		// Has own property?
		_.has = function(obj, key) {
			return hasOwnProperty.call(obj, key);
		};

		// Utility Functions
		// -----------------

		// Run Underscore.js in *noConflict* mode, returning the `_` variable to its
		// previous owner. Returns a reference to the Underscore object.
		_.noConflict = function() {
			root._ = previousUnderscore;
			return this;
		};

		// Keep the identity function around for default iterators.
		_.identity = function(value) {
			return value;
		};

		// Run a function **n** times.
		_.times = function (n, iterator, context) {
			for (var i = 0; i < n; i++) iterator.call(context, i);
		};

		// Escape a string for HTML interpolation.
		_.escape = function(string) {
			return (''+string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g,'&#x2F;');
		};

		// If the value of the named property is a function then invoke it;
		// otherwise, return it.
		_.result = function(object, property) {
			if (object == null) return null;
			var value = object[property];
			return _.isFunction(value) ? value.call(object) : value;
		};

		// Add your own custom functions to the Underscore object, ensuring that
		// they're correctly added to the OOP wrapper as well.
		_.mixin = function(obj) {
			each(_.functions(obj), function(name){
				addToWrapper(name, _[name] = obj[name]);
			});
		};

		// Generate a unique integer id (unique within the entire client session).
		// Useful for temporary DOM ids.
		var idCounter = 0;
		_.uniqueId = function(prefix) {
			var id = idCounter++;
			return prefix ? prefix + id : id;
		};

		// By default, Underscore uses ERB-style template delimiters, change the
		// following template settings to use alternative delimiters.
		_.templateSettings = {
			evaluate    : /<%([\s\S]+?)%>/g,
			interpolate : /<%=([\s\S]+?)%>/g,
			escape      : /<%-([\s\S]+?)%>/g
		};

		// When customizing `templateSettings`, if you don't want to define an
		// interpolation, evaluation or escaping regex, we need one that is
		// guaranteed not to match.
		var noMatch = /.^/;

		// Certain characters need to be escaped so that they can be put into a
		// string literal.
		var escapes = {
			'\\': '\\',
			"'": "'",
			'r': '\r',
			'n': '\n',
			't': '\t',
			'u2028': '\u2028',
			'u2029': '\u2029'
		};

		for (var p in escapes) escapes[escapes[p]] = p;
		var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
		var unescaper = /\\(\\|'|r|n|t|u2028|u2029)/g;

		// Within an interpolation, evaluation, or escaping, remove HTML escaping
		// that had been previously added.
		var unescape = function(code) {
			return code.replace(unescaper, function(match, escape) {
				return escapes[escape];
			});
		};

		// JavaScript micro-templating, similar to John Resig's implementation.
		// Underscore templating handles arbitrary delimiters, preserves whitespace,
		// and correctly escapes quotes within interpolated code.
		_.template = function(text, data, settings) {
			settings = _.defaults(settings || {}, _.templateSettings);

			// Compile the template source, taking care to escape characters that
			// cannot be included in a string literal and then unescape them in code
			// blocks.
			var source = "__p+='" + text
					.replace(escaper, function(match) {
				return '\\' + escapes[match];
			})
					.replace(settings.escape || noMatch, function(match, code) {
						return "'+\n_.escape(" + unescape(code) + ")+\n'";
					})
					.replace(settings.interpolate || noMatch, function(match, code) {
						return "'+\n(" + unescape(code) + ")+\n'";
					})
					.replace(settings.evaluate || noMatch, function(match, code) {
						return "';\n" + unescape(code) + "\n;__p+='";
					}) + "';\n";

			// If a variable is not specified, place data values in local scope.
			if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

			source = "var __p='';" +
					"var print=function(){__p+=Array.prototype.join.call(arguments, '')};\n" +
					source + "return __p;\n";

			var render = new Function(settings.variable || 'obj', '_', source);
			if (data) return render(data, _);
			var template = function(data) {
				return render.call(this, data, _);
			};

			// Provide the compiled function source as a convenience for build time
			// precompilation.
			template.source = 'function(' + (settings.variable || 'obj') + '){\n' +
					source + '}';

			return template;
		};

		// Add a "chain" function, which will delegate to the wrapper.
		_.chain = function(obj) {
			return _(obj).chain();
		};

		// The OOP Wrapper
		// ---------------

		// If Underscore is called as a function, it returns a wrapped object that
		// can be used OO-style. This wrapper holds altered versions of all the
		// underscore functions. Wrapped objects may be chained.
		var wrapper = function(obj) { this._wrapped = obj; };

		// Expose `wrapper.prototype` as `_.prototype`
		_.prototype = wrapper.prototype;

		// Helper function to continue chaining intermediate results.
		var result = function(obj, chain) {
			return chain ? _(obj).chain() : obj;
		};

		// A method to easily add functions to the OOP wrapper.
		var addToWrapper = function(name, func) {
			wrapper.prototype[name] = function() {
				var args = slice.call(arguments);
				unshift.call(args, this._wrapped);
				return result(func.apply(_, args), this._chain);
			};
		};

		// Add all of the Underscore functions to the wrapper object.
		_.mixin(_);

		// Add all mutator Array functions to the wrapper.
		each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
			var method = ArrayProto[name];
			wrapper.prototype[name] = function() {
				var wrapped = this._wrapped;
				method.apply(wrapped, arguments);
				var length = wrapped.length;
				if ((name == 'shift' || name == 'splice') && length === 0) delete wrapped[0];
				return result(wrapped, this._chain);
			};
		});

		// Add all accessor Array functions to the wrapper.
		each(['concat', 'join', 'slice'], function(name) {
			var method = ArrayProto[name];
			wrapper.prototype[name] = function() {
				return result(method.apply(this._wrapped, arguments), this._chain);
			};
		});

		// Start chaining a wrapped Underscore object.
		wrapper.prototype.chain = function() {
			this._chain = true;
			return this;
		};

		// Extracts the result from a wrapped and chained object.
		wrapper.prototype.value = function() {
			return this._wrapped;
		};

		return _.noConflict()
	}
)

define(
	"spell/shared/util/platform/private/Time",
	function() {
		"use strict"

		return {
			/*
			 * Returns the number of milliseconds since midnight January 1, 1970, UTC.
			 */
			getCurrentInMs: function() {
				return Date.now()
			}
		}
	}
)

define(
	'spell/shared/util/platform/private/nativeType/hasIntegerArraySupport',
	function() {
		'use strict'


		return function() {
			return typeof( Int32Array ) !== 'undefined'
		}
	}
)

define(
	'spell/shared/util/platform/private/nativeType/createIntegerArray',
	[
		'spell/shared/util/platform/private/nativeType/hasIntegerArraySupport'
	],
	function(
		hasIntegerArraySupport
	) {
		'use strict'


		var arrayType = ( hasIntegerArraySupport() ? Int32Array : Array )

		return function( length ) {
			return new arrayType( length )
		}
	}
)

define(
	'spell/shared/util/platform/private/nativeType/hasFloatArraySupport',
	function() {
		'use strict'


		return function() {
			return typeof( Float32Array ) !== 'undefined'
		}
	}
)

define(
	'spell/shared/util/platform/private/nativeType/createFloatArray',
	[
		'spell/shared/util/platform/private/nativeType/hasFloatArraySupport'
	],
	function(
		hasFloatArraySupport
	) {
		'use strict'


		var arrayType = ( hasFloatArraySupport() ? Float32Array : Array )

		return function( length ) {
			return new arrayType( length )
		}
	}
)

define(
	"spell/shared/util/platform/private/Input",
	[
		"spell/shared/util/input/keyCodes",
		"spell/math/util",

		'spell/functions'
	],
	function(
		keyCodes,
		mathUtil,

		_
	) {
		"use strict"


		/*
		 * private
		 */

		// for these key codes default handling is suppressed
		var preventDefaultKeyCodes = [
			keyCodes[ 'SPACE' ],
			keyCodes[ 'LEFT_ARROW' ],
			keyCodes[ 'UP_ARROW' ],
			keyCodes[ 'RIGHT_ARROW' ],
			keyCodes[ 'DOWN_ARROW' ],
		]

		/*
		 * Thanks to John Resig. http://ejohn.org/blog/flexible-javascript-events/
		 *
		 * @param obj
		 * @param type
		 * @param fn
		 */
		var addEvent = function( obj, type, fn ) {
		  if ( obj.attachEvent ) {
		    obj['e'+type+fn] = fn;
		    obj[type+fn] = function(){obj['e'+type+fn]( window.event );}
		    obj.attachEvent( 'on'+type, obj[type+fn] );
		  } else
		    obj.addEventListener( type, fn, false );
		}

		var isEventSupported = function( eventName ) {
			return _.has( nativeEventMap, eventName )
		}

		function getOffset( element ) {
			var box = element.getBoundingClientRect()

			var body    = document.body
			var docElem = document.documentElement

			var scrollTop  = window.pageYOffset || docElem.scrollTop || body.scrollTop
			var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft

			var clientTop  = docElem.clientTop || body.clientTop || 0
			var clientLeft = docElem.clientLeft || body.clientLeft || 0

			var top  = box.top + scrollTop - clientTop
			var left = box.left + scrollLeft - clientLeft

			return [ Math.round( left ), Math.round( top ) ]
		}

		var nativeTouchHandler = function( callback, event ) {
			event.stopPropagation()
			event.preventDefault()

			var touch = event.changedTouches[ 0 ]
			var offset = getOffset( this.container )
			var screenSize = this.configurationManager.screenSize

			var position = [
				( touch.pageX - offset[ 0 ] ) / screenSize[ 0 ],
				( touch.pageY - offset[ 1 ] ) / screenSize[ 1 ]
			]

			// if the event missed the display it gets ignored
			if( !mathUtil.isInInterval( position[ 0 ], 0.0, 1.0 ) ||
				!mathUtil.isInInterval( position[ 1 ], 0.0, 1.0 ) ) {

				return
			}

			callback( {
				type     : event.type,
				position : position
			} )
		}

		var nativeKeyHandler = function( callback, event ) {
			if( _.contains( preventDefaultKeyCodes, event.keyCode ) ) {
				event.preventDefault()
			}

			callback( event )
		}

        var nativeMouseHandler = function( callback, event ) {
			var offset = getOffset( this.container )
			var screenSize = this.configurationManager.screenSize

			var position = [
				( event.pageX - offset[ 0 ] ) / screenSize[ 0 ],
				( event.pageY - offset[ 1 ] ) / screenSize[ 1 ]
			]

            // if the event missed the display it gets ignored
            if( !mathUtil.isInInterval( position[ 0 ], 0.0, 1.0 ) ||
                !mathUtil.isInInterval( position[ 1 ], 0.0, 1.0 ) ) {

                return
            }

            callback( {
                type     : event.type,
                position : position
            } )
        }

		/*
		 * maps the internal event name to to native event name and callback
		 */
		var nativeEventMap = {
            touchstart : {
                eventName : 'touchstart',
                handler   : nativeTouchHandler
            },
            touchend : {
                eventName : 'touchend',
                handler   : nativeTouchHandler
            },
			mousedown : {
				eventName : 'mousedown',
				handler   : nativeMouseHandler
			},
			mouseup : {
				eventName : 'mouseup',
				handler   : nativeMouseHandler
			},
			keydown : {
				eventName : 'keydown',
				handler   : nativeKeyHandler
			},
			keyup : {
				eventName : 'keyup',
				handler   : nativeKeyHandler
			}
		}


		/*
		 * public
		 */

		var Input = function( configurationManager ) {
			this.configurationManager = configurationManager
			this.container = document.getElementById( configurationManager.id )
		}

		var setListener = function( eventName, callback ) {
			if( !isEventSupported( eventName ) ) return

			var nativeEvent = nativeEventMap[ eventName ]

			addEvent( document.body, nativeEvent.eventName, _.bind( nativeEvent.handler, this, callback ) )
		}

		var removeListener = function( eventName ) {
			if( !isEventSupported( eventName ) ) return

			var nativeEvent = nativeEventMap[ eventName ]

			this.container[ 'on' + nativeEvent.eventName ] = null
		}

		Input.prototype = {
			setInputEventListener    : setListener,
			removeInputEventListener : removeListener
		}

		return Input
	}
)

