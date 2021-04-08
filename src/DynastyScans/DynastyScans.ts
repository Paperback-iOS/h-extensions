import {
    Chapter,
    ChapterDetails,
    HomeSection,
    Manga,
    MangaTile,
    MangaUpdates,
    PagedResults,
    Request,
    RequestManager,
    SearchRequest,
    Source,
    SourceInfo,
    TagSection,
    TagType,
} from "paperback-extensions-common"
import {DynastyScansParser} from "./DynastyScansParser";

const BASE = "https://dynasty-scans.com"

export const DynastyScansInfo: SourceInfo = {
    icon: "icon.png",
    version: "1.2.3",
    name: "DynastyScans",
    author: "PythonCoderAS",
    authorWebsite: "https://github.com/PythonCoderAS",
    description: "Extension that pulls manga from DynastyScans",
    language: "en",
    hentaiSource: false,
    websiteBaseURL: BASE,
    sourceTags: [
        {
            text: "18+",
            type: TagType.YELLOW
        },
        {
            text: "Slow",
            type: TagType.YELLOW
        }
    ]
}

export class DynastyScans extends Source {

    private readonly parser: DynastyScansParser = new DynastyScansParser();

    readonly requestManager: RequestManager = createRequestManager({
        requestsPerSecond: 3,
        requestTimeout: 30000 // Dynasty is slow. Very slow.
    });

    getMangaShareUrl(mangaId: string): string | null {
        return `${BASE}/${mangaId}`;
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {

        const parts: string[] = ["anthologies", "doujins", "issues", "series"]
        const promiseList: Promise<void>[] = [this.getHomePageFeatured(sectionCallback)];
        for (let i = 0; i < parts.length; i++) {
            promiseList.push(this.getDirectoryAndAddToHomePage(parts[i], sectionCallback));
        }
        await Promise.all(promiseList)
    }

    private async getHomePageFeatured(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const options: Request = createRequestObject({
            url: `${BASE}`,
            method: 'GET'
        });
        let response = await this.requestManager.schedule(options, 1);
        let $ = this.cheerio.load(response.data);
        const section = this.parser.parseFeatured($);
        if (section) {
            sectionCallback(section);
        }
    }

    private async getDirectoryAndAddToHomePage(category: string, sectionCallback: (section: HomeSection) => void): Promise<void> {
        sectionCallback(createHomeSection({
            id: category,
            items: await this.getDirectory(category),
            title: category.substring(0, 1).toUpperCase() + category.substring(1)
        }))
    }

    async getDirectory(category: string): Promise<MangaTile[]> {
        const options: Request = createRequestObject({
            url: `${BASE}/${category}?view=cover`,
            method: 'GET'
        });
        let response = await this.requestManager.schedule(options, 1);
        let $ = this.cheerio.load(response.data);
        return this.parser.parseSectionList($, BASE);
    }

    async getWebsiteMangaDirectory(metadata: any): Promise<PagedResults> {
        const parts: string[] = ["anthologies", "doujins", "issues", "series"]
        const promiseList: Promise<MangaTile[]>[] = [];
        for (let i = 0; i < parts.length; i++) {
            promiseList.push(this.getDirectory(parts[i]));
        }
        let results: MangaTile[] = [];
        results = results.concat(...await Promise.all(promiseList));
        return createPagedResults({
            results: results
        });
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const options: Request = createRequestObject({
            url: `${BASE}/chapters/${chapterId}`,
            method: 'GET'
        });
        let response = await this.requestManager.schedule(options, 1);
        let $: CheerioStatic = this.cheerio.load(response.data, {xmlMode: false});
        return createChapterDetails({
            id: chapterId,
            longStrip: false,
            mangaId: mangaId,
            pages: this.parser.parsePages($, BASE)
        })
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const options: Request = createRequestObject({
            url: `${BASE}/${mangaId}`,
            method: 'GET'
        });
        let response = await this.requestManager.schedule(options, 1);
        let $ = this.cheerio.load(response.data);
        return this.parser.parseChapterList($, mangaId);
    }

    async getMangaDetails(mangaId: string): Promise<Manga> {
        const options: Request = createRequestObject({
            url: `${BASE}/${mangaId}`,
            method: 'GET'
        });
        let response = await this.requestManager.schedule(options, 1);
        let $ = this.cheerio.load(response.data);
        return this.parser.parseManga($, mangaId, BASE);
    }

    async searchRequest(query: SearchRequest, metadata: any): Promise<PagedResults> {
        // TODO: Wait for search to be fixed on the website.
        /*
        let url = `${BASE}/search`
        if (query.title){
            url += `?q=${query.title}`
        }
        const options: Request = createRequestObject({
            url: url,
            method: 'GET'
        });
        let response = await this.requestManager.schedule(options, 1);
        let $ = this.cheerio.load(response.data);
        return createPagedResults({
            results: this.parser.parseSearchResult($, BASE)
        });
         */
        const results = (await this.getWebsiteMangaDirectory(null)).results;
        const data: MangaTile[] = [];
        for (let i = 0; i < results.length; i++) {
            const key = results[i];
            if (query.title) {
                if (key.title.text.toLowerCase().includes((query.title.toLowerCase()))) {
                    data.push(key);
                }
            }
        }
        return createPagedResults({
            results: data
        });
    }


    async getTags(): Promise<TagSection[]> {
        const options: Request = createRequestObject({
            url: `${BASE}/tags`,
            method: 'GET'
        });
        let response = await this.requestManager.schedule(options, 1);
        let $: CheerioStatic = this.cheerio.load(response.data, {xmlMode: false});
        return this.parser.parseTags($)
    }


    async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {
        mangaUpdatesFoundCallback(createMangaUpdates({
            ids: ids
        }));
    }
}