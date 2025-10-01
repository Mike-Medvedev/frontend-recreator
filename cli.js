#!/usr/bin/env node

import * as cheerio from "cheerio"
import {exec} from "child_process"
import {promisify} from "util"
import fs from "fs"
var args = process.argv.slice(2)
var BASE_URL = args[args.length-1];
console.log(args)

function log(msg) {
    console.log(msg + "...")
}

const execPromise = promisify(exec)

// Okay first thing i want to do is when i run the command i want to display a list of options of commands
//I want to support help command
// Then i want basic args like check to see if there are source maps, inspect to see if there are scripts for js and css

if (args.length === 0) {
    console.error("try 'sourcemap --help' or 'sourcemap --manual' for more information")
    process.exit(1)
}

for (const [index, cmd] of args.entries()) {
    switch (cmd) {
        case "--help":
            console.log(`Usage: sourcemap [command] [options...]
    
    Commands:
        inspect <url> Inspect a url for sourcemaps using curl`)
            break;
        case "--manual":
            console.log("Help Menu")
            break;
        case "inspect":
            let html, url;
            
            try {
                url = URL.parse(args[args.length-1])
                if (!url) throw Error("ERROR PARSING URL")
                html = await inspect(url)
                const sources = await parseIndexHTML(html)
                const sourceMaps = await findSourceMaps(sources)
                console.log("All Done!")
                console.log(`Source maps
                ${JSON.stringify(sourceMaps)}`)
                process.exit(0)

            } catch (e) {
                console.error(e)
                process.exit(1)
            }

            break;
        default:
            console.error("Invalid command: try 'sourcemap --help' or 'sourcemap --manual' for more information")
            process.exit(1)

    }
}

async function inspect(url) {
    try {
        let curlOptions = ""
        for(let x of args.slice(1, -1)){
            curlOptions += `"${x}"` + " "
        }
        console.log(`printing curl options ${curlOptions}`)
        const curlCommand = `curl -s ${curlOptions} ${url}`
        console.log('Executing:', curlCommand)
        
        const {stdout, stderr} = await execPromise(curlCommand)
        
        if (stderr) {
            console.warn('Curl stderr:', stderr)
        }
        if (stdout) {
            console.log('curl successful')
        }
        return stdout
        
    } catch (e) {
        console.error('❌ Curl execution failed:')
        console.error('Error message:', e.message)
        console.error('Error code:', e.code)
        console.error('Command attempted:', `curl -s ${curlOptions}"${url}"`)
        process.exit(1)
    }
    
}

async function parseIndexHTML(html) {
    try {
        let sources = { js: [], css: [] }
        log("Parsing html and looking for static assests")
        const $ = cheerio.load(html);
        // fs.writeFileSync("react.html", $.html())
        if ($('script[src]').length > 0) {
            for (const x of $('script[src]')) {
                const asset = x.attribs.src
                if (asset.endsWith(".js")) {
                    sources.js.push(asset)
                    console.log("Found Js asset: " + asset)
                }
            }
        } else {
            console.log('No script with src found')
        }
        if ($('link[href]').length > 0) {
            for (let x of $('link[href]')) {
                const asset = x.attribs.href
                if (asset.endsWith(".css")) {
                    sources.css.push(asset)
                    console.log("Found css asset: " + asset)
                }
            }
        }
        else {
            console.log("No css assets found")
        }
        console.log(`Completed Parsing website!

        Here are the discovered assets:`)
        console.log(sources)
        return sources
    }
    catch (e) {
        console.error(e)
        process.exit(1)
    }
    

}

async function findSourceMaps(sources) {
    const sourceMaps = [];
    log("Parsing assets for sourcemaps")
    for (const asset of [...sources.js, ...sources.css]) {
        try{
            const url = new URL(asset, BASE_URL)
            const res = await fetch(url)
            if(!res.ok) throw new Error("Error fetching asset")
            const result = await res.text()
            if(result.includes("sourceMappingURL=")) {
                console.log(`Found Source Map at ${asset}`)
                sourceMaps.push(`${BASE_URL}${asset}.map`)
            }
        }
        catch(e){
            console.error("Error was", e)
            process.exit(1)
        }        
    }
    return sourceMaps
}