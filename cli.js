#!/usr/bin/env node

import * as cheerio from "cheerio"
import {exec} from "child_process"
import {promisify} from "util"
import {mkdirSync, writeFileSync} from "fs"
import path from "path"
import fs from "fs"
var args = process.argv.slice(2)
var BASE_URL = args[args.length-1];

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

for (const cmd of args) {
    switch (cmd) {
        case "--help":
            displayMenu()
            break;
        case "inspect":
            await findMaps()
            process.exit(0)
        case "generate":
            await generateClient()
            process.exit(0)
        default:
            console.error("Invalid command: try 'sourcemap --help' or 'sourcemap --manual' for more information")
            process.exit(1)

    }
}

async function findMaps(){
    let html, url;
            try {
                url = URL.parse(args[args.length-1])
                if (!url) throw Error("ERROR PARSING URL")
                html = await executeCurlCommand(url)
                const sources = await parseIndexHTML(html)
                const sourceMapUrls = await findSourceMaps(sources)
                console.log("All Done!")
                console.log("Source Maps Discovered: ")
                console.log(sourceMapUrls)
                return sourceMapUrls
            } catch (e) {
                console.error(e)
                process.exit(1)
            }
}

async function executeCurlCommand(url) {
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
        console.error('Curl execution failed:')
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
    const sourceMapUrls = [];
    log("Parsing assets for sourcemaps")
    for (const asset of [...sources.js, ...sources.css]) {
        try{
            const url = new URL(asset, BASE_URL)
            const res = await fetch(url)
            if(!res.ok) throw new Error("Error fetching asset")
            const result = await res.text()
            if(result.includes("sourceMappingURL=")) {
                console.log(`Found Source Map at ${asset}`)
                sourceMapUrls.push(`${BASE_URL}${asset}.map`)
            }
        }
        catch(e){
            console.error("Error was", e)
            process.exit(1)
        }        
    }
    return sourceMapUrls
}


function displayMenu(){
    console.log(`Usage: sourcemap [command] [options...]
    
        Commands:
            inspect <url> Inspect a url for sourcemaps using curl`)
}

async function generateClient(){
    const sourceMapURLs = await findMaps();
    log("Generating Code")
    const sourceMap = await fetchSourceMap(sourceMapURLs)
    generateCode(sourceMap)
}




/**
 * the Source Map structure
 * [
    'version',
    'file',
    'sources',
    'sourceRoot',
    'sourcesContent',
    'names',
    'mappings',
    'debug_id'
  ]
 */



async function fetchSourceMap(sourceMapURLs){
    const promises = sourceMapURLs.map(url => fetch(url))
    const [jsData, cssData] = await Promise.all(promises)
    console.log(sourceMapURLs)
    log("done")
    return { 
        js: await jsData.json(),
        css: await cssData.json() 
    }
}

function cleanPath(path){
    if(typeof path != "string") throw new Error("Error path must be a string to clean")
    return path.replace(/(\.\.\/)+/g, "")
}

function generateDirectory(source, index, sourcesContent){
    if(typeof source != "string") throw new Error("Error source must be a string")
    let cleanedSource = cleanPath(source)
    let directory = path.dirname(cleanedSource)
    let file = path.basename(cleanedSource)
    mkdirSync(path.join("temp1", directory), {recursive: true})
    writeFileSync(path.join("temp1", directory, file), sourcesContent[index] ?? "null")
}

function generateCode(sourceMap){
    const jsMap = sourceMap.js
    const jsCode = jsMap.sourcesContent
    const cssMap = sourceMap.css
    const cssCode = cssMap.sourcesContent


    jsMap.sources.forEach((source, index) => generateDirectory(source, index, jsCode))
    cssMap.sources.forEach((source, index) => generateDirectory(source, index, cssCode))

}