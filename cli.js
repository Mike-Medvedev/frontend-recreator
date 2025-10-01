#!/usr/bin/env node

import * as cheerio from "cheerio"

var args = process.argv.slice(2)

// Okay first thing i want to do is when i run the command i want to display a list of options of commands
//I want to support help command
// Then i want basic args like check to see if there are source maps, inspect to see if there are scripts for js and css

if (args.length === 0) {
    console.error("try 'sourcemap --help' or 'sourcemap --manual' for more information")
    process.exit(1)
}

for(const [index, cmd] of args.entries()){
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
            try{
                url = URL.parse(args[index + 1])
                if(!url) throw Error()
                html = await inspect(url)
                parseIndexHTML(html)

            } catch(e){
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
    try {
        const response = await fetch(url)
        const result = await response.text()
        return result
    } catch (e) {
        console.error("Error fetching url", e)
        process.exit(1)
    }
}

async function parseIndexHTML(html){
    const $ = cheerio.load(html);
    console.log($.html())
    // console.log($('script[src]'))
    if ($('script[src]').length > 0) {
        console.log('Found div with src')
        console.log('Content:', $('script[src]').attr().src)
    } else {
        console.log('No script with src found')
    }
    // console.log($('id').text())
    // console.log($.html())
}