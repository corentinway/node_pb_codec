/*jslint node: true, white: true, vars: true, plusplus: true, nomen: true */
"use strict";



/********************************
 *
 * protocol buffers decoder
 *
 *********************************/

/**
 * mask to read varints
 */ 
var VARINT_7_MASK = parseInt( '1111111', 2);
/**
 * parse varInts from the buffer
 * @param {Buffer} buffer
 * @param {number} offset starting point for reading in the buffer
 * 
 * @return {Object} number and new offset value
 */
function decodeVarInt( buffer, offset ) {
	var subs = [];
	var i;
	for ( i = 0; i< buffer.length; i++ ) {
		var byte = buffer[i + offset];
		var msb = byte >> 7;
		var sub = byte & VARINT_7_MASK ;	
		// register sub byte
		subs.push( sub );
		// if the msb equals to 0, there are no more bytes to read
		if ( msb === 0 ) {
			break;
		}
	}
	// update the buffer position
	offset += i + 1;
	// result
	var res = 0;
	for ( i = subs.length - 1 ; i >= 0 ; i-- ) {
		res = res + subs[i] << ( 7 * i );
	}
	return {
		num: res,
		offset: offset
	};
}
/**
 * decode a varInt numeric value.
 * <P>
 * It is the same algorithm as decodeVarInt except the number is replaced by a value field
 */
function decodeVarIntValue(buffer, offset) {
	var parsed = decodeVarInt( buffer, offset );
	return {
		value: parsed.num,
		offset: parsed.offset
	};
}
/**
 * decode a boolean field
 */
function decodeBool(buffer, offset) {
	var parsed = decodeVarInt( buffer, offset );
	return {
		value: parsed.num !== 0,
		offset: parsed.offset
	};
}
/**
 * decode an enum field
 */
function decodeEnum(buffer, offset, enume) {
	var parsed = decodeVarInt( buffer, offset );
	var val = enume[ parsed.num ];
	return {
		value: val,
		offset: parsed.offset
	};
}
/**
 * decode a float value
 */
function decodeFloat(buffer, offset) {
	return {
		value: buffer.readFloatBE( offset ),
		offset: offset + 4
	};
}
/**
 * bits mask to extract the key from a byte value
 */
var TYPE_MASK = 7;
/**
 * parse a protocol buffers key.
 * @return type : type of the fied
 * @return num : field number 
 * @return offset new offset value
 */
function decodeKey(buffer, offset) {
	// field key
	var fieldKey = buffer.readInt8( offset );
	var fieldType = fieldKey & TYPE_MASK;
	var fieldNum = fieldKey >> 3;
	
	return {
		type: fieldType,
		num: fieldNum,
		offset: offset + 1
	};
}

/**
 * parse a protocol buffers "length delimited" value
 * @return value new value
 * @return offset new buffer offset
 */
function decodeLengthDelimitedValue(buffer, offset, options) {
	var parsed = decodeVarInt( buffer, offset );
	var fieldLength = parsed.num;
	// update the buffer's offset
	offset = parsed.offset;
	var value;
	if ( options.encoding ) {
		value = buffer.toString( options.encoding, offset, offset + fieldLength );
	} else {
		value = buffer.slice( offset, offset + fieldLength );
	}
	
	return {
		value: value,
		offset: offset + fieldLength
	};
}

/**
 * Decode a String field.
 */
function decodeString(buffer, offset, options) {
	options.encoding = options.encoding || 'utf8';
	return decodeLengthDelimitedValue( buffer, offset, options );
}


/**
 * decode an embedded object.
 * @param {Object} decoder a decoder instance
 * @param {Object} definition the definition of the object to decode
 * @param {Buffer} the buffer to read
 * @param {Number} offset the offset in the buffer to read
 * @param {Function} callback the function to call when the new object if decoded: callback( err, object)
 */
function decodeEmbedded(decoder, definition, buffer, offset, callback) {
    	var parsed = decodeVarInt( buffer, offset );
	var fieldLength = parsed.num;
	offset = parsed.offset;
	
	decoder.decode( buffer, offset, definition, function (err, data) {
		callback( err, data, offset + fieldLength );
	}, fieldLength);
	
}

/**
 * protocol buffers message structures
 */
var pbTypes = {
	// In use for Riak - uint32, bool
	// ALL - int32, int64, uint32 uint64, sint32, sint64, bool, enum
	0: { meaning: "Varint", parsers: {
		int32: decodeVarIntValue,
		int64: decodeVarIntValue,
		uint32: decodeVarIntValue,
		uint64: decodeVarIntValue,
		sint32: undefined, // ZIGZAG impl
		sint64: undefined, // ZIGZAG impl
		bool: decodeBool,
		enum: decodeEnum
	} },
	
	// fixed64, sfixed64, double
	1: { meaning: "64-bit", parsers: {
		fixed64: undefined,
		sfixed64: undefined,
		double: undefined,
	} },
	
	// string, bytes, embedded messages, packed repeated fields
	2: { meaning: "Length-delimited", parsers: {
		string: decodeString,
		bytes: decodeLengthDelimitedValue,
		//embedded: undefined,
		//packed: undefined,
	} },
	
	3: { meaning: "Start group (deprecated)" },
	4: { meaning: "End group (deprecated)" },
	
	// fixed32, sfixed32, float
	5: { meaning: "32-bit", parsers: {
		fixed32: undefined,
		sfixed32: undefined,
		float: decodeFloat
	} }
	
};


/**
 * The decoder instance.
 * 
 * @param {Object} definitions map where all protocol buffers message are defined.
 */
function Decoder(definitions, options) {
	
	options = options || function () {};

	/**
	 * read one key value pair
	 * @return num field number
	 * @return value field value
	 * @return offset new offset value
	 */
	var parse = function (decoder, buffer, offset, definition, messageName) {
		var parsedKey = decodeKey( buffer, offset );
		offset = parsedKey.offset;
				
		var parsers = pbTypes[ parsedKey.type].parsers;
		
		if ( ! definition[parsedKey.num] ) {
			console.log( 'ATTENTION' );
			console.log( buffer );
			//console.log( buffer.slice( 21 ) );
			console.log( parsedKey );
		}
		
		var typeName = definition[parsedKey.num].type;
		var parse = parsers[typeName];
		
		var parsedValue = {};
		
		if ( parse ) {
			var opts = options( messageName, definition[parsedKey.num] ) || {} ;
			parsedValue = parse( buffer, offset, opts );
		} else {
			// is the type name is an embedded enum ?
			var enums = definition['_enums'];
			 
			var enume = enums ? enums[typeName] : undefined ;
			if ( enume ) {
				parsedValue = decodeEnum( buffer, offset, enume );
			} else {
				// if it an imported type: another message	
				if ( definitions.hasOwnProperty( typeName ) ) {
					// TODO decode included MSG	
					// invoke parseAll(buffer, offset, otherMsg, definitions) ???
					decodeEmbedded( decoder, typeName, buffer, offset, function (err, data, offset) {
						parsedValue.err = err;
						parsedValue.value = data;
						parsedValue.offset = offset;
					} );
				} else {
					parsedValue.err = new Error( 'Decoding Error. Type not found: ' + typeName );
				}
			}
		}
		
		offset = parsedValue.offset;
		
		return {
			num: parsedKey.num,
			value: parsedValue.value,
			err: parsedValue.err,
			offset: offset,
			repeated: definition[parsedKey.num].repeated
		};
	};
	
	var decoder = this;
	/**
	 * read all the key value pairs
	 */
	this.decode = function (buffer, offset, messageName, callback, end) {
		
		var message = {};
		var err;
		var definition = definitions[messageName];
		
		end = end || buffer.length;
		
		
		// parse all the buffer content
		while ( offset < end  ) {
			var parsed = parse( decoder, buffer, offset, definition, messageName );
			
			if ( parsed.err ) {
				callback( parsed.err );	
				return;
			}
			
			if ( parsed.repeated ) {
				// define an array and push the value
				if ( !message[parsed.num] ) {
					message[parsed.num] = [];	
				}
				message[parsed.num].push( parsed.value );
			} else {
				// override in any case
				message[parsed.num] = parsed.value;
			}
			
			offset = parsed.offset;
			
		}
		
		// check ALL required fields from the field number
		Object.keys( definition ).forEach( function (num) {
			if ( definition[num].required  && /\d+/.test( num ) ) {
				if ( !message.hasOwnProperty( num ) ) {
					err = new Error(' Error while decoding the message ' 
								   + messageName + '. The required field ' + num + '/' + definition[num].name+ ' was missing.');
					return ;
				}
			}
		} );
		
		if ( !err ) {
			// replace the field number by their field name
			Object.keys( message ).forEach( function (num) {
				// find the field name
				var fieldName = definition[num].name;
				// TODO embeded message
				message[fieldName] = message[num];
				// drop field name by number
				delete message[num];
			} );
		}
		
		callback( err, message );
		
	};
	
}

module.exports = Decoder;
