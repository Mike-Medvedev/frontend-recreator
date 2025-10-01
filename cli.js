#!/usr/bin/env node

import * as cheerio from "cheerio"
import fs from "fs"
var args = process.argv.slice(2)

function log(msg) {
    console.log(msg + "...")
}

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
        inspect <url> Inspect a url for sourcemaps`)
            break;
        case "--manual":
            console.log("Help Menu")
            break;
        case "inspect":
            let url;
            let html;
            try {
                url = URL.parse(args[index + 1])
                if (!url) throw Error()
                html = await inspect(url)
                parseIndexHTML(html)

            } catch (e) {
                console.error("Error please provide a valid url to inspect")
                process.exit(1)
            }

            break;
        default:
            console.error("Invalid command: try 'sourcemap --help' or 'sourcemap --manual' for more information")
            process.exit(1)

    }
}

async function inspect(url) {
    log(`Fetching html from ${url}`)
    try {
        const response = await fetch(url)
        const result = await response.text()
        if(!response.ok) throw new Error(`Error fetching html from url ${url} with response ${result}`)
        log("Successfully fetched html")
        return result
    } catch (e) {
        console.error(e)
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
        process.exit(0)
    }
    catch (e) {
        console.error(e)
        process.exit(1)
    }

}