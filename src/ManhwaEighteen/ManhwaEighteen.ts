import {
  Source,
  Manga,
  MangaStatus,
  Chapter,
  ChapterDetails,
  HomeSection,
  MangaTile,
  SearchRequest,
  LanguageCode,
  TagSection,
  Request,
  MangaUpdates,
  TagType,
  PagedResults,
  SourceInfo,
} from "paperback-extensions-common";
const ME_DOMAIN = "https://manhwa18.net";

export const ManhwaEighteenInfo: SourceInfo = {
  version: "2.0.6",
  name: "Manhwa18",
  description: `Extension which pulls content from Manhwa18.`,
  author: `VibrantClouds`,
  authorWebsite: `https://github.com/conradweiser`,
  icon: `logo.png`,
  //hentaiSource: true,
  hentaiSource: false,
  sourceTags: [{ text: "18+", type: TagType.YELLOW }],
  websiteBaseURL: ME_DOMAIN,
};

export class ManhwaEighteen extends Source {
  constructor(cheerio: CheerioAPI) {
    super(cheerio);
  }

  async getMangaDetails(mangaId: string): Promise<Manga> {
    const request = createRequestObject({
      url: `${ME_DOMAIN}/${mangaId}.html`,
      method: "GET",
    });

    let data = await this.requestManager.schedule(request, 1);

    let $ = this.cheerio.load(data.data);

    let titles: string[] = [];
    let author;

    let tags: TagSection[] = [
      createTagSection({ id: "0", label: "genre", tags: [] }),
    ];
    let status: MangaStatus = MangaStatus.ONGOING; // Default to ongoing
    let views;
    let lang;
    let image;

    let imageBase = $(".thumbnail").attr("src");
    if (
      imageBase?.includes("manhwa18") ||
      imageBase?.includes("smurfs.toptoon")
    ) {
      image = imageBase;
    } else {
      image = `${ME_DOMAIN}${imageBase}`;
    }

    let objContext = $("li", $(".manga-info")).toArray();
    for (let i = 0; i < objContext.length; i++) {
      switch (i) {
        case 0: {
          titles.push(
            $(objContext[i]).text().replace("Manga name:", "").trim()
          ) ?? "";
          break;
        }
        case 1: {
          titles.push(
            $(objContext[i]).text().replace("Other names: ", "").trim()
          ) ?? "";
          break;
        }
        case 2: {
          author = $("a", $(objContext[i])).text() ?? "";
          break;
        }
        case 3: {
          for (let obj of $("a", $(objContext[i]).toArray()).toArray()) {
            let text = $(obj).text();
            tags[0].tags.push(createTag({ label: text, id: text }));

            if (text.toLowerCase().includes("raw")) {
              lang = LanguageCode.KOREAN;
            } else {
              lang = LanguageCode.ENGLISH;
            }
          }
          break;
        }
        case 4: {
          let text = $("a", $(objContext[i])).text();
          status = text.includes("On going")
            ? MangaStatus.ONGOING
            : MangaStatus.COMPLETED;
          break;
        }
        case 6: {
          views = $(objContext[i]).text().replace(" Views: ", "") ?? "";
          break;
        }
      }
    }

    let rowContext = $(".row", $(".well-sm")).toArray();
    let description = $("p", $(rowContext[1])).text();

    let rating = $(".h0_ratings_active", $(".h0rating")).toArray().length;

    return createManga({
      id: mangaId,
      titles: titles,
      image: image!,
      status: status,
      desc: description,
      tags: tags,
      author: author,
      rating: rating,
      langFlag: lang,
      langName: lang,
      //hentai: true, // This is an 18+ source
      hentai: false
    });
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const request = createRequestObject({
      url: `${ME_DOMAIN}/${mangaId}.html`,
      method: "GET",
    });

    let data = await this.requestManager.schedule(request, 1);

    let $ = this.cheerio.load(data.data);
    let chapters: Chapter[] = [];

    let lang;

    let objContext = $("li", $(".manga-info")).toArray();
    for (let i = 0; i < objContext.length; i++) {
      switch (i) {
        case 3: {
          for (let obj of $("a", $(objContext[i]).toArray()).toArray()) {
            let text = $(obj).text();

            if (text.toLowerCase().includes("raw")) {
              lang = LanguageCode.KOREAN;
            } else {
              lang = LanguageCode.ENGLISH;
            }
          }
          break;
        }
      }
    }

    let i = 1;
    for (let obj of $("tr", $(".table")).toArray().reverse()) {
      let id = $(".chapter", $(obj)).attr("href");
      let name = $("b", $(obj)).text().trim();

      //TODO Add the date calculation into here
      let timeStr = /(\d+) ([hours|weeks|months]+) ago/.exec(
        $("time", $(obj)).text().trim()
      );
      let date = new Date();
      if (timeStr) {
        switch (timeStr[2]) {
          case "hours": {
            // Do nothing, we'll just call it today
            break;
          }
          case "weeks": {
            date.setDate(date.getDate() - Number(timeStr[1]) * 7);
            break;
          }
          case "months": {
            date.setDate(date.getDate() - Number(timeStr[1]) * 31); // We're just going to assume 31 days each month I guess. Can't be too specific
            break;
          }
        }
      }

      if (!id) {
        throw `Failed to parse chapter ID for manga: ${mangaId}`;
      }

      id = id.replace(".html", "");

      chapters.push(
        createChapter({
          id: id,
          mangaId: mangaId,
          chapNum: i,
          langCode: lang ?? LanguageCode.UNKNOWN,
          name: name,
          time: date,
        })
      );

      i++;
    }

    return chapters;
  }

  async getChapterDetails(
    mangaId: string,
    chapterId: string
  ): Promise<ChapterDetails> {
    const request = createRequestObject({
      url: `${ME_DOMAIN}/${chapterId}.html`,
      method: "GET",
    });

    let data = await this.requestManager.schedule(request, 1);

    let $ = this.cheerio.load(data.data);
    let pages: string[] = [];

    let containerHead = $(".chapter-content").toArray();
    for (let obj of $(
      "img",
      containerHead[containerHead.length - 1]
    ).toArray()) {
      let pageUrl = $(obj).attr("src")!.trim();
      // If the page URL is missing
      if (pageUrl.includes(`manhwa18`) || pageUrl.includes("i.ibb")) {
        pages.push(pageUrl);
      } else {
        // Append it manually
        pages.push(`${ME_DOMAIN}/${pageUrl}`);
      }
    }

    chapterId = chapterId.replace(".html", "");

    return createChapterDetails({
      id: chapterId,
      mangaId: mangaId,
      pages: pages,
      longStrip: true,
    });
  }

  async searchRequest(
    query: SearchRequest,
    metadata: any
  ): Promise<PagedResults> {
    // If h-sources are disabled for the search request, always return null
    if (query.hStatus === false) {
      return createPagedResults({ results: [] });
    }

    let title = query.title?.replace(" ", "+");

    const request = createRequestObject({
      url: `${ME_DOMAIN}/danh-sach-truyen.html?m_status=&author=&group=&name=${title}&genre=&ungenre=`,
      method: "GET",
    });

    let data = await this.requestManager.schedule(request, 1);

    let $ = this.cheerio.load(data.data);
    let mangaTiles: MangaTile[] = [];

    for (let obj of $(".row-list").toArray()) {
      let title = $("a", $(".media-heading", $(obj))).text() ?? "";
      let id = $("a", $(".media-heading", $(obj))).attr("href") ?? "";
      let img = `${ME_DOMAIN}${$("img", $(obj)).attr("src")}` ?? "";
      let textContext = $(".media-body", $(obj));
      let primaryText = createIconText({ text: $("span", textContext).text() });

      id = id.replace(".html", "");

      mangaTiles.push(
        createMangaTile({
          title: createIconText({ text: title }),
          id: id,
          image: img,
          primaryText: primaryText,
        })
      );
    }

    return createPagedResults({
      results: mangaTiles,
    });
  }

  async getHomePageSections(
    sectionCallback: (section: HomeSection) => void
  ): Promise<void> {
      let popularSection: HomeSection = createHomeSection({id: "popular", title: "Popular Manhwa", view_more: true})
      let latestSection: HomeSection = createHomeSection({id: "latest", title: "Latest Releases", view_more: true})
      sectionCallback(popularSection)
      sectionCallback(latestSection)

      const request = createRequestObject({
          url: `${ME_DOMAIN}`,
          method: 'GET'
      })

      let data = await this.requestManager.schedule(request, 1)
      let $ = this.cheerio.load(data.data)

      let popular: MangaTile[] = []
      let latest: MangaTile[] = []

      // Parse out all of the popular sections
      for(let obj of $('.item', $('.owl-carousel')).toArray()) {
          let img = `${ME_DOMAIN}${$('img', $(obj)).attr('data-src')}` ?? ''
          let title = createIconText({text: $('h3', $(obj)).text()})
          let id = $("a", $(obj)).attr("href")?.replace('.html', '') ?? ""

          // If the image came from a CDN, we need to remove the ME_DOMAIN prefix
          if(img.split('https').length > 2) {
            img = img.substring(ME_DOMAIN.length)
          }

        if(img && title && id) {
            popular.push(createMangaTile({image: img, title: title, id: id}))
        }
      }
      popularSection.items = popular
      sectionCallback(popularSection)

      // Parse out the latest raws
      for(let obj of $('div.itemupdate', $('div.doreamon')).toArray()) {
        let title = $('h3.title-h3', $(obj)).text() ?? ''
        let id = $("a", $(obj)).attr("href") ?? "";
        let img = `${ME_DOMAIN}${$("img", $(obj)).attr("src")}` ?? "";
        let textContext = $(".media-body", $(obj));
        let primaryText = createIconText({ text: $("span", textContext).text() });

        id = id.replace(".html", '')

        // If the image came from a CDN, we need to remove the ME_DOMAIN prefix
        if(img.split('https').length > 2) {
          img = img.substring(ME_DOMAIN.length)
        }

        latest.push(createMangaTile({
            title: createIconText({text: title}),
            image: img,
            id: id
        }))
      }

      latestSection.items = latest
      sectionCallback(latestSection)

  }

  async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults | null> { 
      let page = metadata.page ?? 1
    let request: Request | undefined = undefined

    if(homepageSectionId.includes("latest")) {
        request = createRequestObject({
            url: `${ME_DOMAIN}/manga-list.html?listType=pagination&page=${page}&artist=&author=&group=&m_status=&name=&genre=&ungenre=&sort=last_update&sort_type=DESC`,
            method: `GET`,
            headers: {
                referer: ME_DOMAIN
            }
        })
    }
    else if(homepageSectionId.includes("popular")) {
        request = createRequestObject({
            url: `${ME_DOMAIN}/manga-list.html?listType=pagination&page=${page}&artist=&author=&group=&m_status=&name=&genre=&ungenre=&sort=views&sort_type=DESC`,
            method: 'GET',
            headers: {
                referer: ME_DOMAIN
            }
        })
    }

    if(!request) {
        throw(`Failed to determine which section we should be getting more of for Manhwa18`)
    }

    let data = await this.requestManager.schedule(request, 1)
    let $ = this.cheerio.load(data.data)

    let results: MangaTile[] = []

    for(let obj of $('div.row-list').toArray()) {
        let img = $("img", $(obj)).attr("src")
        let title = createIconText({text: $('a', $('h3.media-heading', $(obj))).text()})
        let id = $('a.link-list', $(obj)).attr('href')?.replace('html', '').slice(0, -1)

        if(!img?.includes('http')) {
            img = `${ME_DOMAIN}${img}`
        }

        if(img && title && id) {
            results.push(createMangaTile({
                image: img,
                title: title,
                id: id
            }))
        }
    }

    // Determine if we need to continue on to another page. This source is strange.
    // The nav-bar has a class called 'disabled'. If 2 is disabled, you're on the last page.
    if($('a.disabled', $('ul.pagination')).toArray().length == 2) {
        metadata.page = ++page
    }
    else {
        metadata = undefined
    }

    return createPagedResults({
        results: results,
        metadata: metadata
    })

  }

  async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]) {
    //MW18 is kinda sketchy where the only place that shows update times is the main page. We'll do the best we can.

    const request = createRequestObject({
      url: `${ME_DOMAIN}`,
      method: 'GET'
    })

    let data = await this.requestManager.schedule(request, 1)

    let $ = this.cheerio.load(data.data);
    let returnObject: MangaUpdates = {
      ids: [],
    };
    for (let content of $("#contentstory").toArray()) {
      for (let item of $("div.itemupdate", $(content)).toArray()) {
        let id = $("a", $(item)).attr("href")?.replace(".html", "");
        let dateUpdated = $("time", $(item)).text().trim();
        let date: Date;
        // Was this updated minutes ago?
        if (dateUpdated.includes("minutes")) {
          let parsedDateNumeric = Number(dateUpdated.replace(/\D/g, ""));
          date = new Date();
          date.setMinutes(date.getMinutes() - parsedDateNumeric);
        }
        // Was it hours ago?
        else if (dateUpdated.includes("hours")) {
          let parsedDateNumeric = Number(dateUpdated.replace(/\D/g, ""));
          date = new Date();
          date.setHours(date.getHours() - parsedDateNumeric);
        }
        // Otherwise it was days
        else {
          let parsedDateNumeric = Number(dateUpdated.replace(/\D/g, ""));
          date = new Date();
          date.setDate(date.getDate() - parsedDateNumeric);
        }
        if (!id) {
          continue;
        }
        // If this was before our reference time, add it to the list of updates
        if (date > time) {
          returnObject.ids.push(id);
        }
      }
    }
    mangaUpdatesFoundCallback(returnObject)
    }
}
