#!/usr/bin/env node

import * as cheerio from "cheerio"
import { exec } from "child_process"
import { promisify } from "util"
import { mkdirSync, writeFileSync } from "fs"
import chalk from 'chalk';
import path from "path"
var args = process.argv.slice(2)
var BASE_URL = args[args.length - 1];

const log = console.log
const error = chalk.bold.red;
const warning = chalk.yellow

const execPromise = promisify(exec)

if (args.length === 0) {
    console.error("try 'sourcemap --help' for more information")
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
            console.error("Invalid command: try 'sourcemap --help' for more information")
            process.exit(1)

    }
}

async function findMaps() {
    let html, url;
    try {
        url = URL.parse(args[args.length - 1])
        if (!url) throw Error("ERROR PARSING URL")
        html = await executeCurlCommand(url)
        const sources = await parseIndexHTML(html)
        const sourceMapUrls = await findSourceMaps(sources)
        log(chalk.greenBright.bold('✅ ' + "All Done!\n"))
        log(chalk.rgb(235, 159, 100)(`Source Maps Discovered: (${sourceMapUrls.length})`))
        console.log(sourceMapUrls, "\n")
        return sourceMapUrls
    } catch (e) {
        console.error(e)
        process.exit(1)
    }
}

async function executeCurlCommand(url) {
    try {
        let curlOptions = ""
        for (let x of args.slice(1, -1)) {
            curlOptions += `"${x}"` + " "
        }
        const curlCommand = `curl -s ${curlOptions}${url}`
        log(chalk.blue.bold("\n" + '⏳ '+ 'Executing:', curlCommand))

        const { stdout, stderr } = await execPromise(curlCommand)

        if (stderr) {
            log(warning('Curl stderr:', stderr))
        }
        if (stdout) {
            log(chalk.greenBright.bold('✅ ' + 'Success!'))
        }
        return stdout

    } catch (e) {
        console.log(error('🛑' + '\n Curl execution failed: \n '))
        console.error('Error message:', e.message)
        console.error('Error code:', e.code)
        console.error('Command attempted:', `curl -s ${curlOptions}"${url}"`)
        process.exit(1)
    }

}

async function parseIndexHTML(html) {
    try {
        let sources = { js: [], css: [] }
        log(chalk.blue.bold("\n" + '⏳ '+ "Parsing html and looking for static assests"))
        const $ = cheerio.load(html);
        if ($('script[src]').length > 0) {
            for (const x of $('script[src]')) {
                const asset = x.attribs.src
                if (asset.endsWith(".js")) {
                    sources.js.push(asset)
                }
            }
        } else {
            log(chalk.yellow('⚠️ No script with src found'))
        }
        if ($('link[href]').length > 0) {
            for (let x of $('link[href]')) {
                const asset = x.attribs.href
                if (asset.endsWith(".css")) {
                    sources.css.push(asset)
                }
            }
        }
        else {
            log(chalk.yellow('⚠️ No css assets found'))
        }
        log(chalk.greenBright.bold('✅ ' + "Completed Parsing website!"))
        log(chalk.blue.bold("\n\t Here are the discovered assets:"))
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
    log(chalk.blue.bold("\n" + '⏳ '+ "Parsing assets for sourcemaps"))
    for (const asset of [...sources.js, ...sources.css]) {
        try {
            const url = new URL(asset, BASE_URL)
            const res = await fetch(url)
            if (!res.ok) throw new Error("Error fetching asset")
            const result = await res.text()
            if (result.includes("sourceMappingURL=")) {
                sourceMapUrls.push(`${BASE_URL}${asset}.map`)
            }
        }
        catch (e) {
            console.error("Error was", e)
            process.exit(1)
        }
    }
    return sourceMapUrls
}


function displayMenu() {
    console.log(`Usage: sourcemap [command] [options...]
    
        Commands:

            inspect [curl-options...] <url> Inspects a url for sourcemaps using curl
            generate [curl-options...] <url> Recreates frontend code of a url if Sourcemaps are found
        
        Examples:

            Example sourcemap generate -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." https://example.com
            
            `)
}

async function generateClient() {
    const sourceMapURLs = await findMaps();
    if (sourceMapURLs.length === 0) return
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
async function fetchSourceMap(sourceMapURLs) {
    log(chalk.blue.bold("⏳ Fetching Source Map Content"))
    try {
        const promises = sourceMapURLs.map(url => fetch(url))
        const [jsData, cssData] = await Promise.all(promises)
        const js = await jsData.json()
        const css = await cssData.json()
        log(chalk.greenBright.bold("✅ Source Content Successfully retrieved! \n"))
        return { js,css }
    } catch (e) {
        if(e instanceof SyntaxError){
            log(error("\n Map Urls did not return json, its possible that you need to authenticate to retrieve this map url \n"), e)
        }
        else console.error("Error fetching sourcemaps:", e.message)
    }
}

function cleanPath(path) {
    if (typeof path != "string") throw new Error("Error path must be a string to clean")
    return path.replace(/(\.\.\/)+/g, "")
}

function generateDirectory(source, index, sourcesContent) {
    if (typeof source != "string") throw new Error("Error source must be a string")
    let cleanedSource = cleanPath(source)
    let directory = path.dirname(cleanedSource)
    let file = path.basename(cleanedSource)
    mkdirSync(path.join("temp1", directory), { recursive: true })
    writeFileSync(path.join("temp1", directory, file), sourcesContent[index] ?? "null")
}

function generateCode(sourceMap) {
    log(chalk.blue.bold("⏳ Generating Code"))
    const jsMap = sourceMap.js
    const jsCode = jsMap.sourcesContent
    const cssMap = sourceMap.css
    const cssCode = cssMap.sourcesContent


    jsMap.sources.forEach((source, index) => generateDirectory(source, index, jsCode))
    cssMap.sources.forEach((source, index) => generateDirectory(source, index, cssCode))

}