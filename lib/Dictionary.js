/*jslint node: true, white: true, vars: true, plusplus: true, nomen: true */
"use strict";


function parseField( parsed ) {
	return {
		// rule : reqiuired, optional, repeated
		rule: parsed[0],
		required: parsed[0] === 'required',
		repeated: parsed[0] === 'repeated',
		//packed: packed,
		type: parsed[1],
		name: parsed[2]
	};
}

/**
 * parse a custom protocol buffers message definition JSON map.
 * <P>
 * The argument is a JSON object where each key is a message definition.
 * A message definition has a numeric key and associate a string describing the field definition
 */
function process( messages ) {
	
	if ( typeof messages === 'string' ) {
		var content = require( 'fs' ).readFileSync( messages );
		// replace inline comments
		content = content.replace( /\/\/.*$/g, '' );
		// replace multiline comments
		content = content.replace( /\/\*.*\*\//g, '' );
		console.log( 'file read: ' + messages );
		console.log( content );
		// transform to object
		messages = JSON.parse( content );
	}
	
	
	Object.keys( messages ).forEach( function (messageName) {
		var message = messages[ messageName ];
		
		Object.keys( message ).forEach( function ( num ) {
			
			// match a number 
			if( /^\d+$/.test( num ) ) {
				var parsed = message[num].split( /\s+/);
				var packed = /\[\s*packed\s*=\s*true\s*\]/.test( message[num] );
				if ( parsed.length !== 3 ) {
					throw new Error( 'invalid field defiintion. Message: ' + messageName + ' field: ' + num );	
				}
				// the key is the field number
				message[num] = parseField( parsed );
				message[num].packed = packed;
				var name = parsed[2];
				// the key is the field name
				message[ name ] = parseField( parsed );
				message[ name ].num = num;
				message[ name ].packed = packed;
				delete message[ name ].name;
				
			} else if ( num === '_enums') {
				// reverse key -> value 
				Object.keys( message[num] ).forEach( function (enumName) {
					var enume = message[num][enumName];
					Object.keys( enume ).forEach( function (k) {
						var v = enume[k];
						enume[v] = k;
					} );
					
				} );
			}
			
		} );
	} );
		
}



/**
 * Dictionary constructor. 
 * 
 * @param messages {Object|String} is either the path of the file to read the definition or the message definitions object
 */
function Dictionary( messages ) {
	process( messages );
	this.definitions = messages;
}

/**
 * add some messages definitions
 */
Dictionary.prototype.add = function ( messages ) {
	var def = this.definitions;
	process( messages );
	Object.keys( messages ).forEach( function ( key ) {
			def[ key ] = messages[ key ];
	} );
};


module.exports = Dictionary;
