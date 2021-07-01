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
  Request,
  SourceTag,
  Tag,
  TagType,
  PagedResults,
  SourceInfo,
} from "paperback-extensions-common"

import { Response, QueryResponse } from "./Interfaces"
import {
  NHENTAI_DOMAIN,
  NHENTAI_API,
  QUERY,
  IMAGES,
  capitalize,
} from "./Functions"

export const NHentaiInfo: SourceInfo = {
  version: "2.1.0",
  name: "nHentai",
  description: `Extension which pulls 18+ content from nHentai. (Literally all of it. We know why you're here)`,
  author: `VibrantClouds`,
  authorWebsite: `https://github.com/conradweiser`,
  icon: `logo.png`,
  hentaiSource: false,
  sourceTags: [{ text: "18+", type: TagType.YELLOW }],
  websiteBaseURL: NHENTAI_DOMAIN,
}

export class NHentai extends Source {
  constructor(cheerio: CheerioAPI) {
    super(cheerio)
  }

  convertLanguageToCode(language: string) {
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

  async getMangaDetails(mangaId: string): Promise<Manga> {
    const methodName = this.getMangaDetails.name

    const request = createRequestObject({
      url: NHENTAI_API("gallery") + mangaId,
      method: "GET",
      headers: {
        "accept-encoding": "application/json",
      },
    })

    const response = await this.requestManager.schedule(request, 1)
    if (response.status > 400)
      throw new Error(
        `Failed to fetch data on ${methodName} with status code: ` +
          response.status
      )

    const json: Response =
      typeof response.data !== "object"
        ? JSON.parse(response.data)
        : response.data
    if (!json) throw new Error(`Failed to parse response on ${methodName}`)

    // Regular Tags
    let artist: string[] = []
    let categories: Tag[] = []
    let characters: Tag[] = []
    let tags: Tag[] = []

    // Iterates over tags and check for types while pushing them to the related arrays.
    json.tags.forEach((tag) => {
      const capped = capitalize(tag.name)

      if (tag.type === "artist") artist.push(capped)
      else if (tag.type === "category")
        categories.push(createTag({ id: tag.id.toString(), label: capped }))
      else if (tag.type === "character")
        characters.push(createTag({ id: tag.id.toString(), label: capped }))
      else tags.push(createTag({ id: tag.id.toString(), label: capped }))

      if (tag.type === "language") return
    })

    let TagSections: TagSection[] = [
      createTagSection({
        id: "category",
        label: "Categories",
        tags: categories,
      }),
      createTagSection({
        id: "characters",
        label: "Characters",
        tags: characters,
      }),
      createTagSection({
        id: "tags",
        label: "Tags",
        tags: tags,
      }),
    ]
    if (!characters.length) TagSections.splice(1, 1) // Removes character from TagSection if characters[].length is 0

    return createManga({
      id: json.id.toString(),
      titles: [json.title.pretty, json.title.english, json.title.japanese],
      image: IMAGES(json.images, json.media_id, false)[0], // Type checking problem... 	(--_--)
      rating: 0,
      status: 1,
      artist: artist.join(", "),
      author: artist.join(", "),
      tags: TagSections,
      hentai: false,
    })
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const methodName = this.getChapters.name

    const request = createRequestObject({
      url: NHENTAI_API("gallery") + mangaId,
      method: "GET",
      headers: {
        "accept-encoding": "application/json",
      },
    })

    const response = await this.requestManager.schedule(request, 1)
    if (response.status > 400)
      throw new Error(
        `Failed to fetch data on ${methodName} with status code: ` +
          response.status
      )

    const json: Response =
      typeof response.data !== "object"
        ? JSON.parse(response.data)
        : response.data
    if (!json) throw new Error(`Failed to parse response on ${methodName}`)

    let language: string = ""

    json.tags.forEach((tag) => {
      const capped = capitalize(tag.name)
      if (tag.type === "language" && tag.id !== 17249) language += capped
      // Tag id 17249 is "Translated" tag and it belongs to "language" type.
    })

    return [
      createChapter({
        id: json.id.toString(),
        name: json.title.pretty,
        mangaId: json.media_id,
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

    const request = createRequestObject({
      url: NHENTAI_API("gallery") + mangaId,
      method: "GET",
      headers: {
        "accept-encoding": "application/json",
      },
    })

    const response = await this.requestManager.schedule(request, 1)
    if (response.status > 400)
      throw new Error(
        `Failed to fetch data on ${methodName} with status code: ` +
          response.status
      )

    const json: Response =
      typeof response.data !== "object"
        ? JSON.parse(response.data)
        : response.data
    if (!json) throw new Error(`Failed to parse response on ${methodName}`)

    // Need to use chapterId for some reason 	╮(︶︿︶)╭
    if (!chapterId) chapterId = json.media_id
    if (json.media_id !== chapterId)
      throw new Error(
        `Requested chapterId is different that what it should be. ${methodName}`
      )

    return createChapterDetails({
      id: json.media_id,
      mangaId: json.id.toString(),
      pages: IMAGES(json.images, json.media_id, true),
      longStrip: false,
    })
  }

  async searchRequest(
    query: SearchRequest,
    metadata: any
  ): Promise<PagedResults> {
    const methodName = this.searchRequest.name

    metadata = metadata ?? {}
    let page = metadata.nextPage ?? 1

    // Returns an empty result if the page limit is passed.
    if (metadata.nextPage == undefined) {
      return createPagedResults({
        results: [],
        metadata: { nextPage: undefined, maxPages: metadata.maxPages },
      })
    }

    const request = createRequestObject({
      url:
        NHENTAI_API("galleries") +
        QUERY(
          query.title ? query.title : query.toString(),
          metadata.sort,
          metadata.page
        ),
      method: "GET",
      headers: {
        "accept-encoding": "application/json",
      },
    })

    const response = await this.requestManager.schedule(request, 1)
    if (response.status > 400)
      throw new Error(
        `Failed to fetch data on ${methodName} with status code: ` +
          response.status
      )

    const json: QueryResponse =
      typeof response.data !== "object"
        ? JSON.parse(response.data)
        : response.data
    if (!json) throw new Error(`Failed to parse response on ${methodName}`)

    let cache: MangaTile[] = []
    json.result.forEach((result) => {
      cache.push(
        createMangaTile({
          id: result.id.toString(),
          title: createIconText({ text: result.title.pretty }),
          image: IMAGES(result.images, result.media_id, false)[0],
        })
      )
    })

    if (page === json.num_pages) {
      metadata = { nextPage: undefined, maxPages: json.num_pages }
    } else metadata = { nextPage: ++page, maxPages: json.num_pages }

    return createPagedResults({
      results: cache,
      metadata: metadata,
    })
  }

  async getHomePageSections(
    sectionCallback: (section: HomeSection) => void
  ): Promise<void> {
    let popular: HomeSection = createHomeSection({
      id: "popular",
      title: "Popular Now",
    })
    let newUploads: HomeSection = createHomeSection({
      id: "new",
      title: "New Uploads",
      view_more: true,
    })
    sectionCallback(popular)
    sectionCallback(newUploads)

    const request = createRequestObject({
      url: `${NHENTAI_DOMAIN}`,
      method: "GET",
    })

    let data = await this.requestManager.schedule(request, 1)

    let popularHentai: MangaTile[] = []
    let newHentai: MangaTile[] = []
    let $ = this.cheerio.load(data.data)

    let containerNode = $(".index-container").first()
    for (let item of $(".gallery", containerNode).toArray()) {
      let currNode = $(item)
      let image = $("img", currNode).attr("data-src")!

      // If image is undefined, we've hit a lazyload part of the website. Adjust the scraping to target the other features
      if (image == undefined) {
        image = "http:" + $("img", currNode).attr("src")!
      }

      // Clean up the title by removing all metadata, these are items enclosed within [ ] brackets
      let title = $(".caption", currNode).text()
      title = title.replace(/(\[.+?\])/g, "").trim()

      let idHref = $("a", currNode)
        .attr("href")
        ?.match(/\/(\d*)\//)!

      popularHentai.push(
        createMangaTile({
          id: idHref[1],
          title: createIconText({ text: title }),
          image: image,
        })
      )
    }

    popular.items = popularHentai
    sectionCallback(popular)

    containerNode = $(".index-container").last()
    for (let item of $(".gallery", containerNode).toArray()) {
      let currNode = $(item)
      let image = $("img", currNode).attr("data-src")!

      // If image is undefined, we've hit a lazyload part of the website. Adjust the scraping to target the other features
      if (image == undefined) {
        image = "http:" + $("img", currNode).attr("src")!
      }

      // Clean up the title by removing all metadata, these are items enclosed within [ ] brackets
      let title = $(".caption", currNode).text()
      title = title.replace(/(\[.+?\])/g, "").trim()

      let idHref = $("a", currNode)
        .attr("href")
        ?.match(/\/(\d*)\//)!

      newHentai.push(
        createMangaTile({
          id: idHref[1],
          title: createIconText({ text: title }),
          image: image,
        })
      )
    }

    newUploads.items = newHentai
    sectionCallback(newUploads)
  }

  async getViewMoreItems(
    homepageSectionId: string,
    metadata: any
  ): Promise<PagedResults | null> {
    metadata = metadata ?? {}
    let page = metadata.page ?? 1

    // This function only works for New Uploads, no need to check the section ID
    const request = createRequestObject({
      url: `${NHENTAI_DOMAIN}/?page=${page}`,
      method: "GET",
    })

    let data = await this.requestManager.schedule(request, 1)

    let $ = this.cheerio.load(data.data)

    let discoveredObjects: MangaTile[] = []

    let containerNode = $(".index-container")
    for (let item of $(".gallery", containerNode).toArray()) {
      let currNode = $(item)
      let image = $("img", currNode).attr("data-src")!

      // If image is undefined, we've hit a lazyload part of the website. Adjust the scraping to target the other features
      if (image == undefined) {
        image = "http:" + $("img", currNode).attr("src")!
      }

      // Clean up the title by removing all metadata, these are items enclosed within [ ] brackets
      let title = $(".caption", currNode).text()
      title = title.replace(/(\[.+?\])/g, "").trim()

      let idHref = $("a", currNode)
        .attr("href")
        ?.match(/\/(\d*)\//)!

      discoveredObjects.push(
        createMangaTile({
          id: idHref[1],
          title: createIconText({ text: title }),
          image: image,
        })
      )
    }

    // Do we have any additional pages? If there is an `a.last` element, we do!
    if ($("a.last")) {
      metadata.page = ++page
    } else {
      metadata = undefined
    }

    return createPagedResults({
      results: discoveredObjects,
      metadata: metadata,
    })
  }
}
