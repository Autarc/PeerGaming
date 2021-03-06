/**
 *  Handler
 *  =======
 *
 *  A wrapper to enhance DataChannels and eases the work.
 */


/**
 *  Constructor to define the basic information
 *
 *  @param {String} channel   -
 *  @param {String} remote    -
 */

var Handler = function ( channel, remote ) {

  var label    = channel.label;

  this.info    = { label: label, remote: remote };

  this.channel = channel;

  this.stream  = new Stream({ readable: true, writable: true });

  this.actions = defaultHandlers[ label ] || defaultHandlers.custom;

  if ( typeof this.actions === 'function' ) this.actions = { end: this.actions };

  channel.binaryType = 'arraybuffer'; // binary

  channel.addEventListener( 'open', this.init.bind(this) );
};


/**
 *  Wrap the custom events around the native listener
 *
 *  @param {Object} e   -
 */

Handler.prototype.init = function ( e ) {

  var channel     = this.channel,

      actions     = this.actions,

      stream      = this.stream,

      connection  = CONNECTIONS[ this.info.remote ],

      events = [ 'open', 'data', 'end', 'close', 'error' ];

  for ( var i = 0, l = events.length; i < l; i++ ) { // defined service (see label)

    stream.on( events[i], actions[ events[i] ], connection );
  }

  stream.on( 'write', function send ( msg ) {

    // setTimeout( function(){

      try {

        channel.send( msg );

      } catch ( e ) {

        console.log('[FAILED]', e );

        // setTimeout( send, 100, msg );
      }

    // }, 100 );

  });


  channel.onmessage = stream.handle.bind( stream );

  channel.onclose   = function() { stream.emit( 'close' );  };

  channel.onerror   = function ( err ) { stream.emit( 'error', err ); };

  stream.emit( 'open', e );
};


/**
 *  Sends string based messages
 *
 *  @param {Object} msg   -
 */

Handler.prototype.send = function ( msg ) {

  var data    = JSON.stringify( msg ),

      buffer  = data; //stringToBuffer( data );

  // if ( buffer.byteLength > config.handlerConfig.MAX_BYTES ) {
  buffer = ( buffer.length <= config.handlerConfig.MAX_BYTES ) ? [buffer] : createChunks( buffer );

  for ( var i = 0, l = buffer.length; i < l; i++ ) {

    this.stream.write( buffer[i] );
  }
};


/**
 *  Splits a buffer into smaller chunks
 *
 *  @param {String} buffer   -
 */

function createChunks ( buffer ) {

  var maxBytes  = config.handlerConfig.MAX_BYTES,
      chunkSize = config.handlerConfig.CHUNK_SIZE,
      size      = buffer.length, //byteLength,
      chunks    = [],

      start     = 0,
      end       = chunkSize;

  while ( start < size ) {

    chunks.push( buffer.slice( start, end ) );

    start = end;
    end   = start + chunkSize;
  }

  var l = chunks.length,
      i = 0;

  while ( l-- ) {

    chunks[l] = JSON.stringify({ part: i++, data: chunks[l] });
  }

  return chunks;
}
