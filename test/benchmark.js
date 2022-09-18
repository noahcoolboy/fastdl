let lib = require("../index")

console.log("Downloading 100MB file with 5 threads and 10MB chunks")

let start = Date.now()

let download = lib.download("http://212.183.159.230/100MB.zip")

let x = 0
download.on("progress", (progress, size) => {
    if (x++ % 1000 == 0)
        console.log(`Progress:${(progress / size * 100).toFixed(2)}%, Time:${(Date.now() - start) / 1000}s`)
})

download.on("end", async () => {
    console.log(`Downloaded in ${(Date.now() - start) / 1000}s`)
})