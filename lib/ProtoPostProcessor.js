/* jslint node:true */
'use strict';

var fs = require( 'fs' );

var re = {
	new_line: '\n',
	equal: '=',
	spaces: /\s+/,
	non_stating_digit: /^[^\d+]/,
	message: /message\s*/,
	// start with 'optional' or 'required'
	// followed by any words and spaces
	// ending by '=' + <numeric> + ';'
	field: /\s*(required|optional|repeated)\s(\s|\w)+=\s*\d\s*;/,
	
	field_options: /\s*(required|optional|repeated)\s(\s|\w)+=\s*\d\s*(\[\s*=\s*\w*\s*\])+;/,
	
	
}

function ProtoPostProcessor() {
	
	
	/**
	 * parse expression like [foo=bar] [ham=alpha]
	 */
	var parseOptions =  function ( optionsExpression ) {
		optionsExpression = optionsExpression.trim().replace( /(^\[|\]$)/, '' );
		var options = optionsExpression.split( /\s*\]\s+\[\s*/ );
		
		return options;
	}
	
	/**
	 * process a file content
	 */
	var processFileContent = function ( data ) {
		var extracted = {
			messages: {},
			services: {}
		};

		var parts;
		var currentName;
		var lines = content.split( re.new_line );
		lines.forEach( function ( line ) {
			line = line.trim();
			if ( re.message.test( line ) ) {
				parts = line.split( re.spaces );
				extracted.messages[ parts[1] ] = {};
				currentName = parts[1];
			} else if ( currentName &&  re.field.test( line ) ) {
				parts = line.split( re.equal );
				var num = parts[1].replace( ';', '').trim();
				var expression = parts[0].trim();
				extracted.messages[ currentName ][ num ] = {
					expression: expression
				};
			} else if ( currentName &&  re.field_options.test( line ) ) {
				parts = line.split( re.equal );
				var num = parts[1].replace( re.non_stating_digit, '').trim();
				var expression = parts[0].trim();
				var options = line.replace( new RegExp( expression  + '\s*=\s*\d\s*'), '' );
				options = parseOptions( options );
				extracted.messages[ currentName ][ num ] = {
					expression: expression,
					options: options
				};
			}
		} );

		return extracted;
	};
	
	/**
	 * process a file name and all its declared import
	 */
	this.process = function ( filename, callback ) {
		fs.readFile( filename,function ( err, data ) {
			if ( err ) {
				callback( err );
			} else {
				var extracted = processFileContent( data.toString() );
				if ( extracted.err ) {
					callback( extracted.err );
				} else {
					callback( undefined, extracted );
				}
			}
		} );
					
	};
	
}

module.exports = ProtoPostProcessor;
