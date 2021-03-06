import axios from 'axios';
import cheerio from 'cheerio'
import { APIWrapper, Source } from 'paperback-extensions-common';
import { ManhwaEighteen } from '../ManhwaEighteen/ManhwaEighteen';

const ME_DOMAIN = "https://manhwa18.com";

describe('ManhwaEighteen Tests', function () {

    var wrapper: APIWrapper = new APIWrapper();
    var source: Source = new ManhwaEighteen(cheerio);
    var chai = require('chai'), expect = chai.expect, should = chai.should();
    var chaiAsPromised = require('chai-as-promised');
    chai.use(chaiAsPromised);

    /**
     * The Manga ID which this unit test uses to base it's details off of.
     * Try to choose a manga which is updated frequently, so that the historical checking test can 
     * return proper results, as it is limited to searching 30 days back due to extremely long processing times otherwise.
     */
    var mangaId = "manga-return-girlfriend-raw";

    it("Retrieve Manga Details", async () => {
        let details = await wrapper.getMangaDetails(source, mangaId);

        // Validate that the fields are filled
        let data = details;
        expect(data.id, "Missing ID").to.be.not.empty;
        expect(data.image, "Missing Image").to.be.not.empty;
        expect(data.status, "Missing Status").to.exist;
        expect(data.author, "Missing Author").to.be.not.empty;
        expect(data.desc, "Missing Description").to.be.not.empty;
        expect(data.titles, "Missing Titles").to.be.not.empty;
        expect(data.rating, "Missing Rating").to.exist;
    });

    it("Get Chapters", async () => {
        let data = await wrapper.getChapters(source, mangaId);

        expect(data, "No chapters present for: [" + mangaId + "]").to.not.be.empty;
    });

    it("Get Chapter Details", async () => {

        let chapters = await wrapper.getChapters(source, mangaId);
        let data = await wrapper.getChapterDetails(source, mangaId, chapters[0].id);

        expect(data, "No server response").to.exist;
        expect(data, "Empty server response").to.not.be.empty;

        expect(data.id, "Missing ID").to.be.not.empty;
        expect(data.mangaId, "Missing MangaID").to.be.not.empty;
        expect(data.pages, "No pages present").to.be.not.empty;
    });

    it("Testing search", async () => {
        let testSearch = createSearchRequest({
            title: 'Silent War'
        });

        let search = await wrapper.searchRequest(source, testSearch);
        let result = search.results[0];

        expect(result, "No response from server").to.exist;

        expect(result.id, "No ID found for search query").to.be.not.empty;
        expect(result.image, "No image found for search").to.be.not.empty;
        expect(result.title, "No title").to.be.not.null;
        expect(result.subtitleText, "No subtitle text").to.be.not.null;
    });

    it("Testing invalid search", async () => {
        let testSearch = createSearchRequest({
            title: 'this_search_definitely_is_not_valid_asdklfhjawelorghawlehdsf'
        });

        let search = await wrapper.searchRequest(source, testSearch);
        let result = search.results[0];

        expect(result, "No response from server").to.not.exist;
    });

    it("Retrieve Home Page Sections", async () => {

        let data = await wrapper.getHomePageSections(source);
        expect(data, "No response from server").to.exist;
        expect(data, "No response from server").to.be.not.empty;

        // Do some MangaPark specific validation for this server response
        let latest = data[0];
        expect(latest.id, "Latest Manhwa ID does not exist").to.not.be.empty;
        expect(latest.title, "Latest Manhwa section does not exist").to.not.be.empty;
        expect(latest.items, "No items available for Latest Manhwa").to.not.be.empty;

    });

    it("Get view more sections for 'Latest Manhwa'", async () => {
        let data = await wrapper.getViewMoreItems(source, 'latest', {})
        
    })

    it("Check for updates", async () => {
        /* Manhwa18 only shows updates on the main page. In order to accurately test this functionality
           we make an axios call to the main page and gather all of the available titles on this front page.
        */

        let pageData = (await axios.get(ME_DOMAIN)).data
        let $ = cheerio.load(pageData)

        let availableItems: string[] = []
        for(let title of $('div.itemupdate').toArray()) {
            let item = $('a.cover', $(title)).attr('href')?.replace('.html', '')
            if(item) availableItems.push(item)
        }
        
        // Request the source to search for updates
        let sourceUpdates = await wrapper.filterUpdatedManga(source, new Date("2020-1-27"), availableItems)

        expect(sourceUpdates, "No available titles parsed").to.not.be.empty
    })

})
