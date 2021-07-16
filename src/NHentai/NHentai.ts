import {
  Source,
  Manga,
  Chapter,
  ChapterDetails,
  HomeSection,
  MangaTile,
  SearchRequest,
  LanguageCode,
  TagSection,
  Tag,
  TagType,
  PagedResults,
  SourceInfo,
} from "paperback-extensions-common"

import { Response, QueryResponse, RequestMetadata } from "./Interfaces"

import { NHENTAI_DOMAIN, QUERY, TYPE, PAGES, capitalize } from "./Functions"

export const NHentaiInfo: SourceInfo = {
  version: "2.2.2",
  name: "nHentai",
  description: `Extension which pulls 18+ content from nHentai. (Literally all of it. We know why you're here)`,
  author: `VibrantClouds`,
  authorWebsite: `https://github.com/conradweiser`,
  icon: `icon.png`,
  hentaiSource: false,
  sourceTags: [{ text: "18+", type: TagType.YELLOW }],
  websiteBaseURL: NHENTAI_DOMAIN,
}

export class NHentai extends Source {
  requestManager = createRequestManager({
    requestsPerSecond: 4,
    requestTimeout: 15000,
  })

  convertLanguageToCode(language: string): LanguageCode {
    switch (language.toLowerCase()) {
      case "english":
        return LanguageCode.ENGLISH
      case "japanese":
        return LanguageCode.JAPANESE
      case "chinese":
        return LanguageCode.CHINEESE
      default:
        return LanguageCode.UNKNOWN
    }
  }

  // Makes my life easy... ＼(≧▽≦)／
  async getResponse(mangaId: string, methodName: string): Promise<Response> {
    const request = createRequestObject({
      url: NHENTAI_DOMAIN + "/api/gallery/" + mangaId,
      method: "GET",
      headers: {
        "accept-encoding": "application/json",
      },
    })

    const response = await this.requestManager.schedule(request, 1)
    if (response.status > 400)
      throw new Error(
        `Failed to fetch data on ${methodName} with status code: ` +
          `${response.status}. Request URL: ${request.url}`
      )

    const json: Response =
      typeof response.data !== "object"
        ? JSON.parse(response.data)
        : response.data
    if (!json) throw new Error(`Failed to parse response on ${methodName}`)

    return json
  }

  async getResponseArray(
    query: string,
    sort: "" | "popular-today" | "popular-week" | "popular",
    page: number,
    methodName: string
  ): Promise<QueryResponse> {
    const request = createRequestObject({
      url: QUERY(query, sort, page),
      method: "GET",
      headers: {
        "accept-encoding": "application/json",
      },
    })

    const response = await this.requestManager.schedule(request, 1)
    if (response.status > 400)
      throw new Error(
        `Failed to fetch data on ${methodName} with status code: ` +
          `${response.status}. Request URL: ${request.url}`
      )

    const json: QueryResponse =
      typeof response.data !== "object"
        ? JSON.parse(response.data)
        : response.data
    if (!json) throw new Error(`Failed to parse response on ${methodName}`)

    return json
  }
  async getMangaDetails(mangaId: string): Promise<Manga> {
    const json = await this.getResponse(mangaId, this.getMangaDetails.name)

    const artist: string[] = []
    const categories: Tag[] = []
    const characters: Tag[] = []
    const tags: Tag[] = []

    // Iterates over tags and check for types while pushing them to the related arrays.
    json.tags.forEach((tag) => {
      switch (tag.type) {
        case "artist":
          return artist.push(capitalize(tag.name))
        case "category":
          return categories.push(
            createTag({ id: tag.id.toString(), label: capitalize(tag.name) })
          )
        case "character":
          return characters.push(
            createTag({ id: tag.id.toString(), label: capitalize(tag.name) })
          )
        case "language":
          return
        default:
          return tags.push(
            createTag({ id: tag.id.toString(), label: capitalize(tag.name) })
          )
      }
    })

    const TagSections: TagSection[] = []
    if (tags.length)
      TagSections.push(
        createTagSection({
          id: "tags",
          label: "Tags",
          tags: tags,
        })
      )
    if (characters.length)
      TagSections.push(
        createTagSection({
          id: "characters",
          label: "Characters",
          tags: characters,
        })
      )
    if (categories.length)
      TagSections.push(
        createTagSection({
          id: "category",
          label: "Categories",
          tags: categories,
        })
      )

    return createManga({
      id: json.id.toString(),
      titles: [json.title.pretty, json.title.english, json.title.japanese],
      image:
        "https://t.nhentai.net/galleries/" +
        json.media_id +
        `/1t.${TYPE(json.images.thumbnail.t)}`,
      rating: 0,
      status: 1,
      artist: artist.join(", "),
      author: artist.join(", "),
      hentai: false,
      tags: TagSections,
    })
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const json = await this.getResponse(mangaId, this.getChapters.name)

    let language = ""
    json.tags.forEach((tag) => {
      if (tag.type === "language" && tag.id !== 17249)
        return (language += capitalize(tag.name))
      // Tag id 17249 is "Translated" tag and it belongs to "language" type.
      else return
    })

    return [
      createChapter({
        id: json.media_id,
        name: json.title.pretty,
        mangaId: json.id.toString(),
        chapNum: 1, // No chapter clarification ┐('～`;)┌
        group: json.scanlator ? json.scanlator : undefined,
        langCode: this.convertLanguageToCode(language),
        time: new Date(json.upload_date * 1000),
      }),
    ]
  }

  async getChapterDetails(
    mangaId: string,
    chapterId?: string
  ): Promise<ChapterDetails> {
    const methodName = this.getChapterDetails.name
    if (!chapterId) throw new Error(`ChapterId is empty. ${methodName}.`)

    const json = await this.getResponse(mangaId, methodName)

    return createChapterDetails({
      id: json.media_id,
      mangaId: json.id.toString(),
      pages: PAGES(json.images, json.media_id),
      longStrip: false,
    })
  }

  async searchRequest(
    query: SearchRequest,
    metadata: RequestMetadata
  ): Promise<PagedResults> {
    const methodName = this.searchRequest.name

    // Sets metadata if not available.
    metadata = metadata ? metadata : { nextPage: 1, sort: "" }

    // Returns an empty result if the page limit is passed.
    if (metadata.nextPage == undefined)
      return createPagedResults({
        results: [],
        metadata: { nextPage: undefined, maxPages: metadata.maxPages },
      })

    let title = ""
    const queryTitle = query.title!

    // On URL title becomes a nhentai id.
    if (queryTitle.startsWith("https") || queryTitle.startsWith("nhentai.net"))
      title += queryTitle.replace(/[^0-9]/g, "")
    else title += query.title

    // If the query title is a number, returns the result with that number as it's id.
    if (!isNaN(parseInt(title))) {
      const response = await this.getResponse(title, methodName)

      let language = ""
      response.tags.forEach((tag) => {
        if (tag.type === "language" && tag.id !== 17249)
          return (language += capitalize(tag.name))
        // Tag id 17249 is "Translated" tag and it belongs to "language" type.
        else return
      })

      return createPagedResults({
        results: [
          createMangaTile({
            id: response.id.toString(),
            title: createIconText({ text: response.title.pretty }),
            image:
              "https://t.nhentai.net/galleries/" +
              response.media_id +
              `/1t.${TYPE(response.images.thumbnail.t)}`,
            subtitleText: createIconText({ text: language }),
          }),
        ],
        metadata: { nextPage: undefined, maxPages: 1 },
      })
    }

    const json = await this.getResponseArray(
      title,
      metadata.sort,
      metadata.nextPage,
      methodName
    )

    const cache: MangaTile[] = json.result.map((result) => {
      let language = ""
      result.tags.forEach((tag) => {
        if (tag.type === "language" && tag.id !== 17249)
          return (language += capitalize(tag.name))
        // Tag id 17249 is "Translated" tag and it belongs to "language" type.
        else return
      })

      return createMangaTile({
        id: result.id.toString(),
        title: createIconText({ text: result.title.pretty }),
        image:
          "https://t.nhentai.net/galleries/" +
          result.media_id +
          `/1t.${TYPE(result.images.thumbnail.t)}`, // Type checking problem... 	(--_--)
        subtitleText: createIconText({ text: language }),
      })
    })

    if (metadata.nextPage === json.num_pages || json.num_pages === 0)
      metadata = {
        nextPage: undefined,
        maxPages: json.num_pages,
        sort: metadata.sort,
      }
    else
      metadata = {
        nextPage: ++metadata.nextPage,
        maxPages: json.num_pages,
        sort: metadata.sort,
      }

    return createPagedResults({
      results: cache,
      metadata: metadata,
    })
  }

  async getHomePageSections(
    sectionCallback: (section: HomeSection) => void
  ): Promise<void> {
    const methodName = this.getHomePageSections.name

    const [popular, latest] = [
      createHomeSection({
        id: "popular",
        title: "Popular Now",
        view_more: true,
      }),
      createHomeSection({
        id: "latest",
        title: "New Uploads",
        view_more: true,
      }),
    ]
    sectionCallback(popular)
    sectionCallback(latest)

    /* prettier-ignore */ /* eslint-ignore */
    const popularResponse = await this.getResponseArray("'", "popular-today", 1, methodName)
    popular.items = popularResponse.result.map((result) => {
      let language = ""
      result.tags.forEach((tag) => {
        if (tag.type === "language" && tag.id !== 17249)
          return (language += capitalize(tag.name))
        // Tag id 17249 is "Translated" tag and it belongs to "language" type.
        else return
      })

      return createMangaTile({
        id: result.id.toString(),
        title: createIconText({ text: result.title.pretty }),
        image:
          "https://t.nhentai.net/galleries/" +
          result.media_id +
          `/1t.${TYPE(result.images.thumbnail.t)}`,
        subtitleText: createIconText({ text: language }),
      })
    })
    sectionCallback(popular)

    const latestResponse = await this.getResponseArray("'", "", 1, methodName)
    latest.items = latestResponse.result.map((result) => {
      let language = ""
      result.tags.forEach((tag) => {
        if (tag.type === "language" && tag.id !== 17249)
          return (language += capitalize(tag.name))
        // Tag id 17249 is "Translated" tag and it belongs to "language" type.
        else return
      })

      return createMangaTile({
        id: result.id.toString(),
        title: createIconText({ text: result.title.pretty }),
        image:
          "https://t.nhentai.net/galleries/" +
          result.media_id +
          `/1t.${TYPE(result.images.thumbnail.t)}`,
        subtitleText: createIconText({ text: language }),
      })
    })
    sectionCallback(latest)
  }

  async getViewMoreItems(
    homepageSectionId: string,
    metadata: RequestMetadata
  ): Promise<PagedResults> {
    const methodName = this.searchRequest.name

    switch (homepageSectionId) {
      case "popular":
        metadata = metadata ? metadata : { nextPage: 1, sort: "popular-today" }

      case "latest":
        metadata = metadata ? metadata : { nextPage: 1, sort: "" }
    }

    // Returns an empty result if the page limit is passed.
    if (metadata.nextPage == undefined)
      return createPagedResults({
        results: [],
        metadata: { nextPage: undefined, maxPages: metadata.maxPages },
      })

    const json = await this.getResponseArray(
      "'",
      metadata.sort,
      metadata.nextPage,
      methodName
    )

    const cache: MangaTile[] = json.result.map((result) => {
      let language = ""
      result.tags.forEach((tag) => {
        if (tag.type === "language" && tag.id !== 17249)
          return (language += capitalize(tag.name))
        // Tag id 17249 is "Translated" tag and it belongs to "language" type.
        else return
      })

      return createMangaTile({
        id: result.id.toString(),
        title: createIconText({ text: result.title.pretty }),
        image:
          "https://t.nhentai.net/galleries/" +
          result.media_id +
          `/1t.${TYPE(result.images.thumbnail.t)}`, // Type checking problem... 	(--_--)
        subtitleText: createIconText({ text: language }),
      })
    })

    if (metadata.nextPage === json.num_pages || json.num_pages === 0)
      metadata = {
        nextPage: undefined,
        maxPages: json.num_pages,
        sort: metadata.sort,
      }
    else
      metadata = {
        nextPage: ++metadata.nextPage,
        maxPages: json.num_pages,
        sort: metadata.sort,
      }

    return createPagedResults({
      results: cache,
      metadata: metadata,
    })
  }

  getMangaShareUrl(mangaId: string): string {
    return "https://nhentai.net/g/" + mangaId
  }
}
