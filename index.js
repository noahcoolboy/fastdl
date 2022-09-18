const fs = require('fs')
const events = require('events');
const stream = require('stream');
const undici = require('undici');

class Download extends events.EventEmitter {
    constructor(url, options) {
        super()

        this.url = url
        this.options = Object.assign({
            chunkSize: 1024 * 1024 * 10,
            threadCount: 5,
            file: null,
            autoFileFlush: true,
            headers: {},
            proxy: null,
            proxyAuth: null,
            stream: false
        }, options)
        this.client = this.options.proxy ? new undici.ProxyAgent({
            uri: this.options.proxy,
            auth: this.options.proxyAuth && Buffer.from(`${this.options.proxyAuth.username}:${this.options.proxyAuth.password}`).toString('base64'),
        }) : new undici.Client(new URL(this.url).origin)

        if (this.options.stream) {
            this.stream = new stream.Readable()
            this.stream._read = () => { }
        }

        if (this.options.file)
            this.handle = fs.openSync(this.options.file, 'w')

        this.queue = {}
        this.progress = 0
        this.count = 0
        this.flushing = false
        this.running = this.options.threadCount

        this.getSize().then(() => {
            let n = 0
            for (let i = 0; i < this.options.threadCount; i++) {
                setImmediate(async () => {
                    while (n * this.options.chunkSize < this.size) {
                        await this.downloadChunk(n++)
                        this.flush()
                    }
                    this.running--

                    if (this.running == 0) {
                        if (this.options.file)
                            fs.closeSync(this.handle)
                        if (this.options.stream)
                            this.stream.push(null)
                        this.emit("end")
                    }
                })
            }
        })
    }

    async getSize() {
        let req = await undici.request(this.url, {
            dispatcher: this.client,
            method: "HEAD",
            headers: this.options.headers
        })
        this.size = parseInt(req.headers["content-length"])
        this.emit("size", this.size)

        if (!this.options.chunkSize)
            this.options.chunkSize = Math.ceil(this.size / this.options.threadCount)

        return this.size
    }

    downloadChunk(n) {
        return new Promise(async (resolve, reject) => {
            let chunk = await undici.request(this.url, {
                headers: Object.assign(this.options.headers, {
                    Range: `bytes=${n * this.options.chunkSize}-${Math.min((n + 1) * this.options.chunkSize, this.size) - 1}`,
                }),
                dispatcher: this.client,
            })

            let buf = Buffer.allocUnsafe(parseInt(chunk.headers["content-length"]))
            let offset = 0

            let handler = (data) => {
                data.copy(buf, offset)
                offset += data.length
                this.progress += data.length
                this.emit("progress", this.progress, this.size)
            }
            chunk.body.on('data', handler)

            chunk.body.on("end", () => {
                this.queue[n] = buf
                this.emit("chunk", n)
                resolve()
            })
        })
    }

    flush() {
        if (this.flushing) return
        if (!this.queue[this.count]) return // Waiting on previous chunks

        this.flushing = true
        let length = 0

        for (let chunk in this.queue) {
            if (chunk != this.count) break

            if (this.options.file)
                fs.writeSync(this.handle, this.queue[chunk], 0, this.queue[chunk].length, null)

            if (this.options.stream)
                this.stream.push(this.queue[chunk])

            this.count++
            delete this.queue[chunk]
            length++
        }

        if (this.options.file && this.options.autoFileFlush)
            fs.fsyncSync(this.handle)

        this.emit("flush", length)
        this.flushing = false
    }
}

function download(url, options) {
    return new Download(url, options)
}

function downloadAsync(url, options = {}) {
    return new Promise((resolve, reject) => {
        options.stream = true
        let dl = new Download(url, options)
        dl.once("size", size => {
            let buf = Buffer.allocUnsafe(size)
            let offset = 0

            dl.stream.on("data", chunk => {
                chunk.copy(buf, offset)
                offset += chunk.length
            })
            dl.once("end", () => {
                resolve(buf)
            })
        })
    })
}

module.exports = {
    download,
    downloadAsync
};