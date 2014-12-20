//var definitions = require( '../lib/messages-proto' );

var path = require( 'path' );
var fs = require( 'fs' );
var Dictionary = require( '../lib/codec/Dictionary' );
var Decoder = require( '../lib/codec/decoder' );
var Encoder = require( '../lib/codec/encoder' );


var messages = require( '../proto/riak.proto.js' );
var dictionary = new Dictionary( messages );

var options = function (messageName, fd) {
	if ( fd.type === 'bytes' ) {
		return { encoding: 'utf8'};
	}
};

var decoder = new Decoder( dictionary.definitions, options );
var encoder = new Encoder( dictionary.definitions );

var msg = 'RpbPutReq';


/*
bucket: "b"
key: "k"
content {
  value: "{"foo":"bar"}"
}
w: 2
return_body: true
*/
var data = {
	bucket: 'b',
	key: 'k',
	content: {
		value: " { 'foo': 'bar'}"
	},
	w: 2,
	return_body: true
};

var pbMsg = encoder.encode( data, msg );

console.log( 'message encoded: \n' );
console.log( pbMsg );

var dir = 'C:/Users/Corentin Jechoux/git/node_java_pb';
var filename = path.join( dir, 'put_req_node.protobuf' );

fs.writeFile(filename, pbMsg, function (err) {
   if ( err ) {
       console.error( err );
   } else {
       console.log( 'file written: ' + filename );
   }
});
 
console.log( 'internal decoding' );

decoder.decode( pbMsg, 0, msg, function (err, data) {
	if ( err ) {
		console.error( err );	
	} else {
		console.log( 'data decoded' );
		console.log( data );
	}
} );


