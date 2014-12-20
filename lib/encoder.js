/*jslint node: true, white: true, vars: true, plusplus: true, nomen: true */
"use strict";

// enable / disable debug mode
var DEBUG = process.env['RIAK_JS_PB_CLIENT_DEBUG'] || false;

/**
 * mapping between the type name and the wire type
 */
var pbTypes = {
	"int32": 0,	"int64": 0,	"uint32": 0, "uint64": 0,
	"sint32": 0, "sint64": 0, "bool": 0, "enum": 0,
	
	"fixed64": 1, "sfixed62": 1, "double": 1,
	
	"string": 2, "bytes": 2, // embedded: 2 packed: 2
	// start group deprecated: 3
	// end group deprecated: 4
	
	"fixed32": 5, "sfixed32": 5, "float": 5
};
/**
 * Encode a protocol buffers wire key.
 *
 * @param {Number} num number of the message field
 * @param {Number} wierType number representing the way data are encoded
 *
 * @return the encoded key value
 */
function encodeWireKey( num, wireType) {
    return ( num << 3 ) | wireType;
}
/**
 * Encode a protocol buffers key
 * 
 * @param {Number} num number of the message field
 * @param {String} type name of the field
 */
function encodeKey(num, type) {
	return encodeWireKey( num,  pbTypes[type] );
}

/** some masks for byte operation */
/**
 * mask to extract the first 7 bits of a number if this mask is use with a '&' operator.
 * 0x7F
 */
var MASK_7_VARINT = parseInt( '1111111', 2);
/**
 * the most significant bit: usefull when encoding into varint format.
 */
var MSB = parseInt( '10000000', 2);
/**
 * Encode a number in a varint format.
 *
 * @param {Number} number value (decimal base)
 *
 * @return {Object} encoding result
 * @return object.num number convertion
 * @return object.length byte length of the format
 */
function encodeVarInt(value) {
	var res = 0;
	var by;
	// length in byte
	var length = 0;
	while( value > 0 ) {
		by = value & MASK_7_VARINT;
		value = value >> 7;
		if ( value !== 0 ) {
			// add MSB
			by = by | MSB;
			res = (res + by) << 8;
			length++;
		}
	}
	res = res | by;	
	
	return {
		num: res,
		length: length + 1
	};
}

/**
 * Compute the byte length of a varint encoded value.
 *
 * @param {Number} value the numeric value to encode
 *
 * @return {Number} the byte length of the value encoded in varint format
 */
function computeVarIntLength(value) {
	// length in byte
	var length = 0;
	while( value > 0 ) {
		value = value >> 7;
		if ( value !== 0 ) {
			length++;
		}
	}
	
	return length + 1;
}

/**
 * write a value into a "varint" format.
 *
 * @param {Number} value: base 10 number
 * @param {Buffer} buffer: place where to encode and write the value
 * @param {Number} offset starting point for writing in the buffer
 *
 * @return the new offset position
 */
function writeVarInt(value, buffer, offset) {
	//var res = 0;
	var by;
	// length in byte
	//var length = 0;
	while( value > 0 ) {
		by = value & MASK_7_VARINT;
		value = value >> 7;
		if ( value !== 0 ) {
			// add MSB
			by = by | MSB;
			//res = (res + by) << 8;
			//length++;
			buffer[offset] = by;
			offset++;
		}
	}
	//res = res | by;	
	buffer[offset] = by;
	offset++;
	
	return offset;
}

/**
 * Encode a numeric value into a protocol buffers encoding using varint algorithm.
 * <P>
 * It returns actually a 2 field object: 
 * - the field 'length' deals with the key and value length of the encoding in the protocol buffers stream. It is a number of bytes.
 * - the 'enc' function: it should be call to encode the value once the buffer object size is allocated (thanks to the preceding length property).
 *
 * @param {Number} key the key associated with the value. 
 * @param {Number} value the numeric value to encode
 * 
 * @return the encoding object as described above.
 */
function encodeVarIntValue(key, value) {
	// value length
	var length = computeVarIntLength( value );
	
	return {
		length: 1 + length,
		enc: function (buffer, offset) {
			// write key
			buffer.writeUInt8( key, offset );
			offset++;
			
			return 	writeVarInt( value, buffer, offset );
		}
	};
}


function encodeEnum(key, value, enume) {
	
	// find the matching value
	var code = enume[value];
	
	return encodeVarIntValue( key, code );
}


/**
 * Encode a JS boolean value into a protocol buffers encoding.
 * <P>
 * It returns actually a 2 field object: 
 * - the field 'length' deals with the key and value length of the encoding in the protocol buffers stream. It is a number of bytes.
 * - the 'enc' function: it should be call to encode the value once the buffer object size is allocated (thanks to the preceding length property).
 *
 * @param {Number} key the key associated with the value. 
 * @param {Boolean} value boolean value to encode
 * 
 * @return the encoding object as described above.
 */
function encodeBool(key, value) {
	return {
		length: 2,
		enc: function (buffer, offset) {
			// write key
			buffer.writeUInt8( key, offset );
			offset++;
			// write bool value
			buffer.writeUInt8( value ? 1 : 0, offset );
			offset++;
			
			return offset;
		}
	};
}

function encodeFloat(key, value) {
	// byte length ?
	throw new Error( 'encodeFloat not supported yet' );
}

/**
 * Encode a a string value into a bytes protocol buffers encoding.
 * <P>
 * It returns actually a 2 field object: 
 * - the field 'length' deals with the key and value length of the encoding in the protocol buffers stream. It is a number of bytes.
 * - the 'enc' function: it should be call to encode the value once the buffer object size is allocated (thanks to the preceding length property).
 *
 * @param {Number} key the key associated with the value. 
 * @param {String} value string value to encode
 * 
 * @return the encoding object as described above.
 */
function encodeBytes(key, value) {
	// encode the value length
	var parsed = encodeVarInt( value.length );
	
	return {
		length: 1 + parsed.length + value.length,
		enc: function (buffer, offset) {
			// write key
			buffer.writeUInt8( key, offset );
			offset ++;
			
			// bytes length
			offset = writeVarInt( value.length, buffer, offset );
				
			// bytes data
			buffer.write( value, offset, value.length, 'utf8' );
			
			return offset + value.length;
		}
	};
}


/**
 * encoders
 */
var pbEncoders = {
	"int32": encodeVarIntValue,	
	"int64": encodeVarIntValue,	
	"uint32": encodeVarIntValue, 
	"uint64": encodeVarIntValue,
	"sint32": undefined, 
	"sint64": undefined, 
	"bool": encodeBool, 
	"enum": undefined,
	
	"fixed64": undefined,
	"sfixed64": undefined,
	"double": undefined,
	
	"bytes": encodeBytes,
	"string": encodeBytes,
	
	"fixed32": undefined,
	"sfixed32": undefined,
	"float": encodeFloat
};


	
/**
 * Encoder constructor
 *
 * @param {Obejct} protocol buffers messages definitions
 */
function Encoder(definitions) {
	
	var encoder = this;
	/**
	 * Encode Js object as embedded message within a message
	 * <P>
	 * It returns actually a 2 field object: 
	 * - the field 'length' deals with the key and value length of the encoding in the protocol buffers stream. It is a number of bytes.
	 * - the 'enc' function: it should be call to encode the value once the buffer object size is allocated (thanks to the preceding length property).
	 *
	 * @param {Object} encoder the encoder 
	 * @param {Object} value JS object to encode
	 * @param {String} messageName the message / type name
	 * 
	 * @return the encoding object as described above.
	 */
	var encodeEmbedded = function(value, fieldDefinition) {
	    
		var pbMsg = encoder.encode( value, fieldDefinition.type );
		
		return {
			length: 1 + 1 + pbMsg.length,
			enc: function (buffer, offset) {
			    
			    var key = encodeWireKey( fieldDefinition.num, 2 );
				
			    // write key
				buffer.writeUInt8( key, offset );
				offset++;
				
				// write length
				offset = writeVarInt( pbMsg.length, buffer, offset );
				
				// write the sub message
				pbMsg.copy( buffer, offset );
				
				return offset + pbMsg.length;
				
			}
		};
	};
	
	/**
	 * Encode a field from the JSON object.
	 * 
	 * @param {Number|String|Object|...} value any object value
	 * @param {Object} field definition
	 *
	 * @return object.length the encoded field length
	 * @return object.enc the encoder function (buffer, offset)
	 */
	var encodeField = function(value, fieldDefinition) {
		var typeName = fieldDefinition.type;
		var encoder = pbEncoders[ typeName ]; 
		
		if ( encoder ) {
			var pbKey = encodeKey( fieldDefinition.num, typeName );
			return encoder( pbKey, value ); 
		} else {
			// is the type name is an embedded enum ?
			var enums = fieldDefinition['_enums'];
			var enume = enums ? enums[typeName] : undefined ;
			if ( enume ) {
				return encodeEnum( pbKey, value, enume );
			} else {
				
				// if the type name comes from another message
				var otherMsg = definitions[fieldDefinition.type];
				if ( otherMsg ) {
					return encodeEmbedded(value, fieldDefinition );
				} else {
					
					return { 
						err: new Error( 'type not found: ' + fieldDefinition.type ) 
					};
				}
			}
			
		}
		
	};
	
	
	
	/**
	* Encode a JSON object.
	*
	* @param {Object} message: JSON object to encode
	* @param {String} messageName: protocol buffers' message name to encode.
	* @param {Buffer} buffer buffer where to append encoded field. Optional.
	* @param {Number} offset writing offset in the buffer. Optional. Default 0.
	*
	* @return the buffer with the encoded protocol buffers message
	*
	*/
	this.encode = function ( message, messageName, buffer, offset ) {
		
		var definition = definitions[messageName];
		
		var length = 0;
		var encoders = {};
		var key;
		var num;
		var k;
		var err;
		// encode each field in the buffer
		for ( key in message ) {
			if ( message.hasOwnProperty( key ) ) {
				var fieldDefinition = definition[key];
				if ( fieldDefinition ) {
					var field = encodeField( message[key], fieldDefinition );
					//console.log( 'field length: ' + key + ' ' + field.length + '\tfor the value: ' + message[key] );
					length += field.length;
					encoders[key] = field.enc;
				}
			}
		}
		
		// check ALL required fields from the field number
		for ( num in definition ) {
			if ( definition.hasOwnProperty( num ) && definition[num].required && /\d+/.test( num ) ) {
				var name = definition[num].name;
				// check if an encoders is defined
				if ( !encoders[name] ) {
					err = new Error(' Error while encoding the message ' 
								   + messageName + '. The required field ' + num + '/' + name+ ' was missing.');
					// TODO callback
					throw err;
				}
			}
		}
		
		
		buffer = buffer || new Buffer( length );
		// for DEBUG
		buffer.fill( 0 );
		offset = offset || 0;
		for ( k in encoders ) {
			if ( encoders.hasOwnProperty( k ) ) {
		// for DEBUG
				//console.log( 'encoding the field: ' + k );
		// for DEBUG
				//console.log( buffer );
				offset = encoders[k]( buffer, offset );
			}
		}
		
		//console.log( buffer );
		
		return buffer;
		
		
	};
	
}

module.exports = Encoder;