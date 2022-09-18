# faster-download
A minimal, performant and customisable library used to download files at high speeds using multiple sockets.
## Installation
Install the library via npm using the following command:
```bash
npm i faster-download
```
## Usage
2 methods will be at your disposal. They can be used as follows  

```js
const download = require("faster-download")
download.download(url, options) // Returns a Download instance
await download.downloadAsync(url, options) // Returns a Buffer
```

The download method should be used in most cases, but downloadAsync is also helpful when you only one the file buffer and do not need to do anything special.

## Options
Faster-download is able to cover a wide range of applications, which is why it has quite a few options.

* *number* **chunkSize**  
  Downloads are done in "chunks". Each thread downloads one chunk at a time.  
  You can specify how big a chunk is in bytes using this option.  
  *Default Value*: 10485760 (1024 * 1024 * 10, A.K.A. 10 Megabytes)
* *number* **threadCount**  
  This can specify the amount of threads used to download the file.  
  More threads mean more speed but also more network stress.  
  *Default Value*: 5
* *string* **file**  
  The library is able to write everything into a file for you.  
  You can specify the path of the file using this option.  
  *Default Value*: null
* *boolean* **autoFileFlush**  
  Every time the library is done emptying the chunk queue, it will force flush the changes to the file.  
  This behaviour can be deactivated, and your OS will handle flushing the file instead.  
  *Default Value*: true
* *object* **headers**  
  An object used to specify extra headers to use when requesting chunks.  
  Useful when the server uses authentication.  
  *Default Value*: {}
* *string* **proxy**  
  Specify a proxy to use when getting chunks.  
  NOTE: This may slow down the download process.  
  *Default Value*: null
* *object* **proxyAuth**
  Optional login information for the proxy.  
  Format: `{ username: string, password: string }`  
  *Default Value*: null
* *boolean* **stream**  
  An option to get a ReadableStream at your disposal, under the `Download.stream` property.  
  This is disabled by default for performance reasons.  
  *Default Value*: false

## The Download Class
NOTE: This does not apply to downloadAsync, as that method returns a promise for a Buffer.  
  
The download method will return an instance of the Download class which has a whole bunch of useful events and properties

* *Readable* **stream**
  As stated above, this will only be available when the `stream` option is set to true.  
  This is a Readable stream which can be used to pipe the download into other stuff.
* *number* **progress**  
  This property tells you how many bytes have been download up to this point.
* *number* **size**
  This property tells you how big the file you are trying to download is, in bytes.  
  This can be used in combination with the progress property to calculate the download percentage.
* *number* **count**
  The total amount of chunks which have been downloaded and flushed
* *number* **running**
  The amount of threads currently running.  
  This number will be zero once the download is done
* *event* **size**  
  This event gets fired once the library receives the file size from the server.  
  *Arguments*: (number size)
* *event* **progress**  
  This event gets fired every time one of the threads receives data.  
  This event is useful for displaying progress to the user.
  *Arguments*: (number progress, number size)
* *event* **chunk**
  This event gets fired every time one of the threads is done downloading a chunk.
  *Arguments*: (number chunkN)
* *event* **flush**
  This event gets fired every time the chunk queue gets cleared.
* *event* **end**
  This event gets fired once the download is fully finished.