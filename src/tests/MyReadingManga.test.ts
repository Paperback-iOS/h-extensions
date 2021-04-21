import cheerio from "cheerio"
import { APIWrapper, Source } from "paperback-extensions-common";
import { MyReadingManga } from "../MyReadingManga/MyReadingManga";

describe("MyReadingManga Tests", function () {

    var wrapper: APIWrapper = new APIWrapper();
    var source: Source = new MyReadingManga(cheerio);
    var chai = require("chai"), expect = chai.expect, should = chai.should();
    var chaiAsPromised = require("chai-as-promised");
    chai.use(chaiAsPromised);

    /**
     * The Manga ID which this unit test uses to base it"s details off of.
     * Try to choose a manga which is updated frequently, so that the historical checking test can 
     * return proper results, as it is limited to searching 30 days back due to extremely long processing times otherwise.
     */

    // ! Tests will fail because of cloudflare
    var mangaId = "milmil-untouchable-my-hero-academia-dj-eng";

    it("Retrieve Manga Details", async () => {
        let details = await wrapper.getMangaDetails(source, mangaId);
        expect(details, "No results found with test-defined ID [" + mangaId + "]").to.exist
        let data = details;
        expect(data.id, "Missing ID").to.be.not.empty;
        expect(data.image, "Missing Image").to.be.not.empty;
        expect(data.status, "Missing Status").to.exist;
        expect(data.author, "Missing Author").to.be.not.empty;
        expect(data.artist, "Missing Artist").to.be.not.empty;
        expect(data.desc, "Missing Description").to.be.not.empty;
        expect(data.titles, "Missing Titles").to.be.not.empty;
        expect(data.rating, "Missing Rating").to.exist;
    });

    it("Get Chapters", async () => {
        let data = await wrapper.getChapters(source, mangaId);
        expect(data, "No chapters present for: [" + mangaId + "]").to.not.be.empty;
        let entry = data[0]
        expect(entry.id, "No ID present").to.not.be.empty;
        expect(entry.time, "No date present").to.exist
        expect(entry.name, "No title available").to.not.be.empty
        expect(entry.chapNum, "No chapter number present").to.exist
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
            title: "Bakugo"
        });
        let search = await wrapper.searchRequest(source, testSearch, {page: 1});
        let result = search.results[0]
        expect(result, "No response from server").to.exist;
        expect(result.id, "No ID found for search query").to.be.not.empty;
        expect(result.image, "No image found for search").to.be.not.empty;
        expect(result.title, "No title").to.be.not.null;
        expect(result.subtitleText, "No subtitle text").to.be.not.null;
    });

    it("Testing Home-Page acquisition", async() => {
        let homePages = await wrapper.getHomePageSections(source)
        expect(homePages, "No response from server").to.exist
        expect(homePages[0], "No RECENTLY UPDATED section available").to.exist;
        expect(homePages[1], "No YAOI MANGAS section available").to.exist;
        expect(homePages[2], "No MANHWA section available").to.exist;
        expect(homePages[3], "No MANHUA section available").to.exist;
        expect(homePages[4], "No BARA section available").to.exist;
        expect(homePages[5], "No RANDOMLY SELECTED section available").to.exist;
    })

    it("Testing view more results for RECENTLY UPDATED titles", async () => {
        let results = await wrapper.getViewMoreItems(source, "1_recently_updated", {}, 1);
        let resultsWithPagedData = await wrapper.getViewMoreItems(source, "1_recently_updated", {page: 3}, 1);

        expect(results, "No results whatsoever for this section").to.exist;
        expect(resultsWithPagedData, "No results for page 3").to.exist;

        let data = results![0];
        expect(data.id, "No ID present").to.exist;
        expect(data.image, "No image present").to.exist;
        expect(data.title.text, "No title present").to.exist;
    });

    it("Testing view more results for YAOI MANGAS titles", async () => {
        let results = await wrapper.getViewMoreItems(source, "2_yaoi", {}, 1);
        let resultsWithPagedData = await wrapper.getViewMoreItems(source, "2_yaoi", {page: 3}, 1);

        expect(results, "No results whatsoever for this section").to.exist;
        expect(resultsWithPagedData, "No results for page 3").to.exist;

        let data = results![0];
        expect(data.id, "No ID present").to.exist;
        expect(data.image, "No image present").to.exist;
        expect(data.title.text, "No title present").to.exist;
        });
    
    it("Testing view more results for MANHWA titles", async () => {
        let results = await wrapper.getViewMoreItems(source, "3_manhwa", {}, 1);
        let resultsWithPagedData = await wrapper.getViewMoreItems(source, "3_manhwa", {page: 3}, 1);

        expect(results, "No results whatsoever for this section").to.exist;
        expect(resultsWithPagedData, "No results for page 3").to.exist;

        let data = results![0];
        expect(data.id, "No ID present").to.exist;
        expect(data.image, "No image present").to.exist;
        expect(data.title.text, "No title present").to.exist;
        });
    
    it("Testing view more results for MANHUA titles", async () => {
        let results = await wrapper.getViewMoreItems(source, "4_manhua", {}, 1);
        let resultsWithPagedData = await wrapper.getViewMoreItems(source, "4_manhua", {}, 3);

        expect(results, "No results whatsoever for this section").to.exist;
        expect(resultsWithPagedData, "No results for page 3").to.exist;

        let data = results![0];
        expect(data.id, "No ID present").to.exist;
        expect(data.image, "No image present").to.exist;
        expect(data.title.text, "No title present").to.exist;
        });
    
    it("Testing view more results for BARA titles", async () => {
        let results = await wrapper.getViewMoreItems(source, "5_bara", {}, 1);
        let resultsWithPagedData = await wrapper.getViewMoreItems(source, "5_bara", {page: 3}, 1);

        expect(results, "No results whatsoever for this section").to.exist;
        expect(resultsWithPagedData, "No results for page 3").to.exist;

        let data = results![0];
        expect(data.id, "No ID present").to.exist;
        expect(data.image, "No image present").to.exist;
        expect(data.title.text, "No title present").to.exist;
        });
    
    it("Testing view more results for RANDOMLY SELECTED titles", async () => {
        let results = await wrapper.getViewMoreItems(source, "6_randomly_selected", {}, 1);
        let resultsWithPagedData = await wrapper.getViewMoreItems(source, "6_randomly_selected", {page: 3}, 1);

        expect(results, "No results whatsoever for this section").to.exist;
        expect(resultsWithPagedData, "No results for page 3").to.exist;

        let data = results![0];
        expect(data.id, "No ID present").to.exist;
        expect(data.image, "No image present").to.exist;
        expect(data.title.text, "No title present").to.exist;
    });
})