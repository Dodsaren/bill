#!/usr/bin/env node
import { load } from 'cheerio'
import util from 'util'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const argv = yargs(hideBin(process.argv))
  .alias('t', 'terms')
  .alias('s', 'start')
  .alias('e', 'end')
  .array('terms')
  .number('start')
  .number('end')
  .demandOption(['terms', 'start', 'end']).argv

const baseUrl = 'https://www.tv4.se/arkiv'
const terms = argv.terms
const start = argv.start
const end = argv.end

function log(input) {
  console.log(util.inspect(input, false, null, true /* enable colors */))
}

function generate() {
  const urls = []
  console.log('preparing to scrape tv4 archive...')
  for (let i = start; i <= end; i++) {
    const year = i.toString()
    const yearUrls = []
    for (let j = 1; j <= 12; j++) {
      const month = j <= 9 ? `0${j}` : j
      for (let k = 1; k <= 31; k++) {
        const day = k <= 9 ? `0${k}` : k
        var url = `${baseUrl}/${year}/${month}/${day}`
        yearUrls.push(url)
      }
    }
    urls.push({ year, yearUrls })
    console.log(`${year}`)
  }
  return urls
}

async function main() {
  const urls = generate()
  let result = []
  for (const url of urls) {
    console.log(`scraping ${url.year} for term(s) ${terms.join(', ')}...`)
    result = await scrapeYear(url.yearUrls, result)
  }
  log(result)
}

async function scrapeYear(urls, previous = []) {
  const splitted = splitToChunks(urls, 12)
  const texts = []
  const interval = twirlTimer()
  for (const [i, split] of splitted.entries()) {
    texts.push(
      ...(await Promise.all(split.map((x) => fetch(x).then((x) => x.text())))),
    )
  }
  clearInterval(interval)
  return texts.reduce((p, c, i) => {
    const $ = load(c)
    const text = $('.kpPnww a').text().toLowerCase()
    terms.forEach((term) => {
      if (text.includes(term)) {
        const termFound = p.find((x) => x.term === term)
        if (termFound) {
          termFound.urls.push(urls[i])
        } else {
          p.push({
            term: term,
            urls: [urls[i]],
          })
        }
      }
    })
    return p
  }, previous)
}

function splitToChunks(array, parts) {
  const copy = [...array]
  let result = []
  for (let i = parts; i > 0; i--) {
    result.push(copy.splice(0, Math.ceil(copy.length / i)))
  }
  return result
}

function twirlTimer() {
  var P = ['\\', '|', '/', '-']
  var x = 0
  return setInterval(function () {
    process.stdout.write('\r' + P[x++])
    x &= 3
  }, 250)
}

main()
