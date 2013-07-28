var fs      = require('fs'),
    xml2js  = require('xml2js'),
    wrench  = require('wrench'),
    ff      = require('ff'),
    parser  = new xml2js.Parser(),
    bambooJobConfiguration = {
        'SPELLJS-SPELLCLI-JOB1': {
            artifact: 'SPELLJS-SPELLCLI',
            dstDir: 'build-artifacts/spellCli'
        },
        'SPELLJS-SPELLANDROID-JOB1': {
            artifact: 'SPELLJS-SPELLANDROID',
            dstDir: 'build-artifacts/spellAndroid'
        },
        'SPELLJS-SPELLDOCS-JOB1': {
            artifact: 'SPELLJS-SPELLDOCS',
            dstDir: 'build-artifacts/spellDocs'
        },
        'SPELLJS-SPELLED-JOB1': {
            artifact: 'SPELLJS-SPELLED',
            dstDir: 'build-artifacts/spellEd'
        },
        'SPELLJS-SPELLFLASH-JOB1': {
            artifact: 'SPELLJS-SPELLFLASH',
            dstDir: 'build-artifacts/spellFlash'
        },
        'SPELLJS-SPELLCORE-JOB1': {
            artifact: 'SPELLJS-SPELLCORE',
            dstDir: 'build-artifacts/spellCore'
        }
    }

var get_last_successful_build = function(bambooJobKey, completeFn) {
    var baseDir = '/srv/atlassian/application-data/bamboo/xml-data/builds/' + bambooJobKey + '/results'

    var f = ff(this,
        function () {
            //read directory content
            fs.readdir(baseDir, f.slot())
        },
        function (directoryContent) {
            //read all files in directory
            directoryContent.forEach(function(filename) {
                fs.readFile( baseDir + '/' + filename, f.slot())
            })
        },
        function() {
            //parse XML into JS Objects
            for (var i=0; i<arguments.length; i++) {
                parser.parseString(arguments[i], f.slot())
            }
        },
        function() {
            var lastSuccessfulBuild = {
                jobKey: bambooJobKey,
                number: 0
            }

            for (var i=0; i<arguments.length; i++) {
                var result      = arguments[i],
                    buildState  = result.BuildResults.myBuildState[0].myState[0],
                    buildNumber = result.BuildResults.myBuildNumber[0],
                    buildDate   = result.BuildResults.myBuildDate[0]

                if( buildState == 'Successful' &&
                    lastSuccessfulBuild.number < buildNumber ) {

                    lastSuccessfulBuild.state = buildState
                    lastSuccessfulBuild.number = buildNumber
                    lastSuccessfulBuild.date  = buildDate
                }

            }

            if( lastSuccessfulBuild.number == 0 ) {
                f.fail('Could not find last successful build in ' + baseDir)
            } else {
                f.pass(lastSuccessfulBuild)
            }
        }
    ).onComplete( completeFn )
}

var copy_build_artifact = function(jobKey, buildNumber, completeFn) {
    var baseDir = '/var/atlassian/application-data/bamboo/artifacts/' + bambooJobConfiguration[ jobKey ].artifact + '/shared/build-' + String('00000' + buildNumber).slice(-5);

    console.log('copy artifact from ' + baseDir)
    console.log(jobKey + ' ' + buildNumber )
}

var f = ff(this,
    function() {
        //get latest successful build for every job
        for( var jobKey in bambooJobConfiguration ) {
            get_last_successful_build( jobKey, f.slot() )
        }
    },

    function() {
        //copy all build artifacts

        for (var i=0; i<arguments.length; i++) {
            var latestBuild = arguments[i]


            copy_build_artifact(latestBuild.jobKey, latestBuild.number)
        }
    }
).onSuccess(function(result) {
       //console.log(result)
})
