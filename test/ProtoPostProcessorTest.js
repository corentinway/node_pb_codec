/* jshint node:true*/
/* global describe, it, before, beforeEach */
var assert = require( 'chai' ).assert;
var fs = require( 'fs' );

var lib =  '../' + ( process.env.LIB_COV ? 'lib-cov/' : 'lib/' );

var ProtoPostProcessor = require( lib + 'ProtoPostProcessor' );

describe( 'language', function () {
	"use strict";
	
	describe( 'Defining A Message Type', function ( done ) {
		it( 'should read a simple message definition', function () {
			
			var processor = new ProtoPostProcessor();
			var filename = __dirname + '/resources/SearchRequest.proto';
			var definitions = processor.process( filename, function ( err, definitions ) {
				if ( err ) {
					done( err );
				} else {
					assert.isNotNull( definitions );
					assert.isDefined( definitions );

					assert.isNotNull( definitions.messages );
					assert.isDefined( definitions.messages );

					var SearchRequest = definitions.messages.SearchRequest;
					assert.isNotNull( SearchRequest );
					assert.isDefined( SearchRequest );
					
					assert.equal( SearchRequest[ '1' ].expression, 'required string query' );
					assert.equal( SearchRequest[ '2' ].expression, 'optional int32 page_number' );
					assert.equal( SearchRequest[ '3' ].expression, 'optional int32 result_per_page' );
					
					assert.equal( SearchRequest[ '4' ].expression, 'repeated int32 samples' );
					assert.isArray( SearchRequest[ '4' ].options );
					assert.lengthOf( SearchRequest[ '4' ].options, 1 );
					
					assert.equal( SearchRequest[ '4' ].options[0], 'packed=true' );

					done();
				}
			} );
			
		} );
	} );

} );


// DEBUG
/*
function describe ( text, callback ) {
	console.log( text );
	callback();
}
function it ( text, callback ) {
	console.log( text );
	callback();
};
//*/