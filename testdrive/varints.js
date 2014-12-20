

// number : 1010 1100 0000 0010
 //         1010 1100 0000 0010



function log( msg, n ) {
	console.log( msg  + ' ' + n.toString ( 2 ) );
}

function convertToInt( bytes ) {

	var subs = [];
	
	
	for ( var i = 0; i< bytes.length; i++ ) {
	
		var byte = bytes[i];
		
		log( 'byte', byte );
		
		var msb = byte >> 7;
		
		var sub;
		// sub byte 
		// mask is 111 1111
		sub = byte & parseInt( '1111111', 2);	
		
		log( '\tsub', sub );
			
		// register sub byte
		subs.push( sub );
		
		if ( msb === 0 ) {
			break;
		}
		
	}
	
	
	var res = 0;
	
	
	for ( var i = subs.length - 1 ; i >= 0 ; i-- ) {
		res = res + subs[i] << ( 7 * i);
	}
	
	
	return res;
	
}

console.log( 'INT VALUE' );
var bytes = [ parseInt( '10101100', 2), parseInt( '00000010', 2) ];
console.log( bytes );
console.log( convertToInt( bytes ) );

console.log();
console.log();
console.log();

// -------------------
var MASK = parseInt( '1111111', 2);

function encodeVarInt(value) {
	var res = 0;
	var by;
	var length = 0;
	while( value > 0 ) {
		console.log( 'value: ' + value.toString( 2 ) );
		by = value & MASK;
		console.log( 'by: ' + by.toString( 2 ) ) ;
		// reste
		value = value >> 7;
		if ( value !== 0 ) {
			// add MSB
			//console.log( 'value is not ZERO' );
			by = by | parseInt( '10000000', 2);
			//console.log( 'NEW by: ' + by.toString( 2 ) );
			res = (res + by) << 8;
			console.log( '\t value: ' + value );
			length++;
		} 
	}
	
	res = res | by;	
	
	console.log( 'BYTE LENGTH: ' + ( length + 1 ) );
	
	return res;
}


// 1010 1100 0000 0010
   //1010 1100 0000 0010


var value = 300;
console.log( value );
var res = encodeVarInt(300);
console.log( res )
console.log( res.toString( 2 ) );


	
	
