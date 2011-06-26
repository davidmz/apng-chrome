/**
 * @preserve
 * CRC32
 *
 * @author David Mzareulyan
 * @copyright 2011 David Mzareulyan
 * @license http://creativecommons.org/licenses/by/3.0/
 */
(function() {
    var
            global = (function(){ return this; })(),
            table = new Array(256);

    for(var i=0; i<256; i++) {
        var c=i;
        for (var k=0; k<8; k++) c = (c&1) ? 0xEDB88320 ^ (c>>>1) : c>>>1;
        table[i] = c;
    }

    global.crc32 = function(bytes, start, length) {
        start = start || 0;
        length = length || (bytes.length - start);
        var crc = -1;
        for( var i = start, l = start + length; i < l; i++ )
            crc = ( crc >>> 8 ) ^ table[( crc ^ bytes[i] ) & 0xFF];
        return crc ^ (-1);
    };
})();