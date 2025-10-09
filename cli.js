#!/usr/bin/env node

import * as cheerio from "cheerio"
import { exec } from "child_process"
import { promisify } from "util"
import { mkdirSync, writeFileSync } from "fs"
import chalk from 'chalk';
import path from "path"



var args = process.argv.slice(2)
var BASE_URL = args[args.length - 1];
var outputPath; 

const log = console.log
const error = chalk.bold.red;
const warning = chalk.yellow

const execPromise = promisify(exec)


if (args.length === 0) {
    displayMenu()
    process.exit(0)
}


if(args.includes("-o") || args.includes("--output")){
    const flagIndex = args.findIndex(arg => arg === "-o" || arg === "--output")
    outputPath = args[flagIndex + 1]
    args.splice(flagIndex, 2)
}

if (args.includes("--help") || args.length === 0) {
    displayMenu()
    process.exit(0)
}

const command = args.find(arg => !arg.startsWith("-") && !arg.startsWith("http") && !arg.startsWith("www"))

if (!command) {
    console.error(chalk.red("❌ No command specified"))
    console.log(chalk.yellow("Try: ") + chalk.blue("reforge --help"))
    process.exit(1)
}

const validCommands = ["inspect", "generate"]
const suggestions = findClosestCommand(command, validCommands)

if (suggestions.length > 0) {
    console.error(chalk.red(`❌ Unknown command: "${command}"`))
    console.log(chalk.yellow("Did you mean: ") + chalk.blue(`reforge ${suggestions[0]}`))
    process.exit(1)
}

switch (command) {
    case "inspect":
        await findMaps()
        process.exit(0)
    case "generate":
        await generateClient()
        process.exit(0)
    default:
        console.error(chalk.red(`❌ Unknown command: "${command}"`))
        console.log(chalk.yellow("Available commands: ") + chalk.blue("inspect, generate"))
        console.log(chalk.yellow("Try: ") + chalk.blue("reforge --help"))
        process.exit(1)
}

async function findMaps() {
    let html, url;
    try {
        const urlArg = args.find(arg => arg.startsWith("http") || arg.startsWith("www"))
        
        if (!urlArg) {
            console.error(chalk.red("❌ No valid URL provided"))
            console.log(chalk.yellow("Usage: ") + chalk.blue("reforge inspect [options...] <url>"))
            console.log(chalk.yellow("Example: ") + chalk.blue("reforge inspect https://example.com"))
            process.exit(1)
        }
        
        url = URL.parse(urlArg)
        if (!url || !url.hostname) throw Error("ERROR PARSING URL")
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
        log(chalk.blue.bold("\n" + '⏳ ' + 'Executing:', curlCommand))

        const { stdout, stderr } = await execPromise(curlCommand)

        if (stderr) {
            log(warning('Curl stderr:', stderr))
        }
        if (stdout) {
            log(chalk.greenBright.bold('✅ ' + 'Success!'))
        }
        return stdout

    } catch (e) {
        console.log(error('\n 🛑 Curl execution failed: \n '))
        console.error('Error message:', e.message)
        console.error('Error code:', e.code)
        console.error('Command attempted:', `curl -s ${curlOptions}"${url}"`)
        process.exit(1)
    }

}

async function parseIndexHTML(html) {
    try {
        let sources = { js: [], css: [] }
        log(chalk.blue.bold("\n" + '⏳ ' + "Parsing html and looking for static assests"))
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
    log(chalk.blue.bold("\n" + '⏳ ' + "Parsing assets for sourcemaps"))
    for (const asset of [...sources.js, ...sources.css]) {
        try {
            const url = new URL(asset, BASE_URL)
            const res = await fetch(url)
            if (!res.ok) throw new Error("Error fetching asset")
            const result = await res.text()
            if (result.includes("sourceMappingURL=")) {
                sourceMapUrls.push(`${url.href}.map`)
            }
        }
        catch (e) {
            console.error("Error was", e)
            process.exit(1)
        }
    }
    return sourceMapUrls
}


function findClosestCommand(input, validCommands) {
    const suggestions = []
    const inputLower = input.toLowerCase()
    
    for (const cmd of validCommands) {
        if (cmd.toLowerCase() === inputLower) {
            return []
        }
        
        if (cmd.toLowerCase().startsWith(inputLower)) {
            suggestions.push(cmd)
        }
        else if (cmd.toLowerCase().includes(inputLower)) {
            suggestions.push(cmd)
        }
        else if (levenshteinDistance(inputLower, cmd.toLowerCase()) <= 2) {
            suggestions.push(cmd)
        }
    }
    
    return suggestions
}

function levenshteinDistance(str1, str2) {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1]
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                )
            }
        }
    }
    
    return matrix[str2.length][str1.length]
}

function displayMenu() {
    console.log(chalk.bold.cyan(`\n 🌋 Reforger CLI\n`))
    console.log(chalk.yellow(` Usage: `) + chalk.white(`reforge [command] [options...]\n`))
    
    console.log(chalk.bold.green(` Commands:\n`))
    
    console.log(chalk.blue(`   inspect `) + chalk.gray(`[curl-options...] `) + chalk.white(`<url>`))
    console.log(chalk.gray(`           Inspects a url for sourcemaps using curl\n`))
    
    console.log(chalk.blue(`   generate `) + chalk.gray(`[curl-options...] `) + chalk.white(`<url>`))
    console.log(chalk.gray(`           Recreates frontend code of a url if Sourcemaps are found\n`))
    
    console.log(chalk.bold.magenta(` Options:\n`))
    console.log(chalk.green(`   -o, --output `) + chalk.white(`<path>`) + chalk.gray(`  Specify a filepath to output generated code, defaults to ./temp1\n`))
    
    console.log(chalk.bold.yellow(` Examples:\n`))
    console.log(chalk.gray(`   `) + chalk.blue(`reforge generate `) + chalk.green(`-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." `) + chalk.white(`https://example.com`))
    console.log(chalk.gray(`   `) + chalk.blue(`reforge inspect `) + chalk.green(`--cookie "session=abc123" `) + chalk.white(`https://example.com`))
    console.log(chalk.gray(`   `) + chalk.blue(`reforge generate `) + chalk.green(`-o ./my-output `) + chalk.white(`https://example.com\n`))
}

async function generateClient() {
    const sourceMapURLs = await findMaps();
    if (sourceMapURLs.length === 0) return
    const sourceMaps = await fetchSourceMaps(sourceMapURLs)
    generateCode(sourceMaps)
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
async function fetchSourceMaps(sourceMapURLs) {
    log(chalk.blue.bold("⏳ Fetching Source Map Content"))
    try {
        const promises = sourceMapURLs.map(url => fetch(url))
        const responses = await Promise.all(promises)
        const sourceMaps = await Promise.all(responses.map(res => res.json()))

        log(chalk.greenBright.bold("✅ Source Content Successfully retrieved! \n"))
        return sourceMaps
    } catch (e) {
        if (e instanceof SyntaxError) {
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
    mkdirSync(path.join(outputPath || "temp1", directory), { recursive: true })
    writeFileSync(path.join(outputPath || "temp1", directory, file), sourcesContent[index] ?? "null")
}

function generateCode(sourceMaps) {
    log(chalk.blue.bold("⏳ Generating Code"))
    try {
        if(!outputPath) log(warning("⚠️ Output directory not specified with -o, defaulting to temp1 in current dir"))
        for(let sourceMap of sourceMaps){
            sourceMap.sources.forEach((source, index) => generateDirectory(source, index, sourceMap.sourcesContent))
        }
        log(chalk.greenBright.bold(`✅ Recreated Frontend Code to ${outputPath || "temp1"}`))
    } catch(e){
        console.log(error(e))
    }
    

}