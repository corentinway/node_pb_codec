/* jshint node:true*/
/* global describe, it, before, beforeEach */
var assert = require( 'chai' ).assert;

var lib =  '../' + ( process.env.LIB_COV ? 'lib-cov/' : 'lib/' );

var Dictionary = require( lib + 'Dictionary' );

describe( 'Dictionary', function () {
	"use strict";
	
	// TODO test dictionary reading file
	
	// TODO test dictionary json object...
	
	// TODO test add message types in the definition
	
	function assertField( expected, message, fieldName, property ) {
		//console.log( 'Testing ... ' + property );
		assert.equal( expected, message[ fieldName.toString() ][ property ], 'testing  ' + fieldName + '.' + property );
		var num = message[ fieldName.toString() ].num;
		assert.isNotNull( num );
		assert.isDefined( num );
		
		assert.equal( expected, message[ num.toString() ][ property ], 'testing ' + fieldName + '.' + property );
		assert.equal( fieldName, message[ num.toString() ][ 'name' ], 'testing name' );
		
	}

	var definitions = {
		Msg: {
			1: "required float amount",
			2: "required double super_amount",
			
			3: "required int32 id32",
			4: "required int64 id64",
			
			5: "required uint32 uid32",
			6: "required uint64 uid64",
			
			7: "required sint32 sid32",
			8: "required sint64 sid64",
			
			9: "required fixed32 fid32",
			10: "required fixed64 fid64",
			
			11: "required sfixed32 sfid32",
			12: "required sfixed64 sfid64",
			
			13: "required bool flag",
			14: "required string name",
			15: "required bytes bulk",
		}
	};
	
	describe( 'Parsing objects - required fields', function () {
		it( 'should read a required float field', function () {
			var dictionary = new Dictionary( definitions );
			
			assert.isNotNull( dictionary );
			assert.isDefined( dictionary );
			
			assert.isNotNull( dictionary.definitions );
			assert.isDefined( dictionary.definitions );
			
			//console.log( dictionary.definitions );
			var Msg = dictionary.definitions.Msg;
			
			function assertMsgField( name, type ) {
				assertField( 'required', Msg, name, 'rule' );
				assertField( true, Msg, name, 'required' );
				assertField( false, Msg, name, 'repeated' );
				assertField( false, Msg, name, 'packed' );
				assertField( type, Msg, name, 'type' );
				
			}
			
			assertMsgField( 'amount', 'float' );
			assertMsgField( 'super_amount', 'double' );
			
			assertMsgField( 'id32', 'int32' );
			assertMsgField( 'id64', 'int64' );
			
			assertMsgField( 'uid32', 'uint32' );
			assertMsgField( 'uid64', 'uint64' );
			
			assertMsgField( 'sid32', 'sint32' );
			assertMsgField( 'sid64', 'sint64' );
			
			assertMsgField( 'fid32', 'fixed32' );
			assertMsgField( 'fid64', 'fixed64' );
			
			assertMsgField( 'sfid32', 'sfixed32' );
			assertMsgField( 'sfid64', 'sfixed64' );
			
			assertMsgField( 'flag', 'bool' );
			assertMsgField( 'name', 'string' );
			assertMsgField( 'bulk', 'bytes' );
						

			
		} );
	} );

} );

/*
// DEBUG
var describe = function ( text, callback ) {
	console.log( text );
	callback();
};
var it = describe;
//*/