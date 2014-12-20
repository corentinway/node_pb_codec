
var fs = require( 'fs' );
var path = require( 'path' );
var assert = require( 'assert' );

var Dictionary = require( '../lib/codec/Dictionary' );
var Decoder = require( '../lib/codec/decoder' );

var messages = require( '../proto/riak.proto.js' );
var dictionary = new Dictionary( messages );

/**
 * A function for the decoder class.
 * return an encoding option if  the data type is bytes except if the fied descriptor name is 'vclock'.
 */
var options = function (messageName, fd) {
	if ( fd.name === 'vclock' && fd.type === 'bytes' ) {
		// return raw bytes
		return {};
	} else if ( fd.type === 'bytes' ) {
		return { encoding: 'utf8' };
	}
}
	
var decoder = new Decoder( dictionary.definitions, options );

// message name from the dictionary
var msg = 'RpbPutReq';
// folder: starting point to read pb and json object
var dir = 'C:/Users/Corentin Jechoux/git/node_java_pb';
// encoded protobuf message
var filename = path.join( dir, 'putReq.protobuf' );
// expected JSON decoded data
var expectedFile = path.join( dir, 'putReq.json' );
var expected = JSON.parse( fs.readFileSync( expectedFile ) );

/**
 * assert object
 */
function assertObject( actual, expected ) {
    
    for ( var k in expected) {
	if ( expected.hasOwnProperty(k) ) {
	    if ( actual.hasOwnProperty(k) ) {
		if ( typeof expected[k] === 'object') {
		    assertObject( actual[k], expected[k] );
		} else {
		    assert.equal( actual[k], expected[k] );
		}
	    } else {
		assert.fail( actual, expected, 'The expected property "' + k + '" is missing from the actual object', undefined );
	    }
	}
    }
    
}

fs.readFile( filename, function (err, buffer) {
    if (err) {
	console.error( err );
    } else {
	decoder.decode( buffer, 0, msg, function (err, data) {
	    if ( err ) {
		console.error( err );
	    } else {
    	    	console.log( 'data decoded:' );
				console.log( '-------------------' );
    	    	console.log( data );
    	    	
    	    	console.log( '\nexpected decoded:' );
				console.log( '-------------------' );
    	    	console.log( expected );
    	    	
    	    	assertObject( data, expected );
	    }
	});
    }
});