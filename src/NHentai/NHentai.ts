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

import { Response, ImageObject } from "./Interfaces"

const NHENTAI_DOMAIN = "https://nhentai.net"
const NHENTAI_API = (type: "gallery" | "galleries") =>
  NHENTAI_DOMAIN + "/api/" + type + "/"

// Don't think about this too much, appends the missing letters to finish the extension. (￣ω￣)
const TYPE = (type: string) => {
  if (type === "j") return type + "pg"
  if (type === "p") return type + "ng"
  else return type + "if"
}

const IMAGES = (
  images: ImageObject,
  media_Id: string,
  type: "page" | "thumb"
) => {
  if (type === "page")
    return images.pages.map(
      (page, i) =>
        `https://i.nhentai.net/galleries/${media_Id}/${[i + 1]}.${TYPE(page.t)}`
    )
  else
    return `https://t.nhentai.net/galleries/${media_Id}/1t.${TYPE(
      images.thumbnail.t
    )}`
}
// Makes the first letter of a string capital.
const capitalize = (str: string) =>
  str
    .toString()
    .split("_")
    .map(
      (word) => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()
    )[0]

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
      image: IMAGES(json.images, json.media_id, "thumb").toString(), // Type checking problem... 	(--_--)
      rating: 0,
      status: 1,
      artist: artist.join(", "),
      author: artist.join(", "),
      tags: TagSections,
      hentai: false,
    })
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
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
    chapterId: string
  ): Promise<ChapterDetails> {
    const request = createRequestObject({
      url: `${NHENTAI_DOMAIN}/g/${mangaId}`,
      method: "GET",
    })
    let data = await this.requestManager.schedule(request, 1)
    let $ = this.cheerio.load(data.data)

    // Get the number of chapters, we can generate URLs using that as a basis
    let pages: string[] = []
    let thumbContainer = $("#thumbnail-container")
    let numChapters = $(".thumb-container", thumbContainer).length

    // Get the gallery number that it is assigned to
    let gallerySrc = $("img", thumbContainer).attr("data-src")

    // We can regular expression match out the gallery ID from this string
    let galleryId = parseInt(gallerySrc?.match(/.*\/(\d*)\//)![1]!)

    // Get all of the pages
    let counter = 1
    for (let obj of $($("img", ".thumb-container")).toArray()) {
      let imageType = $(obj)
        .attr("data-src")
        ?.match(/\.([png|jpg]{3,3})/g)![0]
      pages.push(
        `https://i.nhentai.net/galleries/${galleryId}/${counter}${imageType}`
      )
      counter++
    }

    let chapterDetails = createChapterDetails({
      id: chapterId,
      mangaId: mangaId,
      pages: pages,
      longStrip: false,
    })

    return chapterDetails
  }

  async searchRequest(
    query: SearchRequest,
    metadata: any
  ): Promise<PagedResults> {
    metadata = metadata ?? {}
    let page = metadata.page ?? 1
    let sixDigit: boolean = false

    // If h-sources are disabled for the search request, always return empty
    if (query.hStatus === false || !query.title) {
      // MARK: We only support title searches for now until advanced search is implemented
      return createPagedResults({ results: [] })
    }

    let request: Request | undefined = undefined

    // If the search query is a six digit direct link to a manga, create a request to just that URL and alert the handler via metadata
    if (query.title?.match(/\d{5,6}/)) {
      request = createRequestObject({
        url: `${NHENTAI_DOMAIN}/g/${query.title}`,
        method: "GET",
      })
      sixDigit = true
    } else {
      query.title = query.title?.trim()
      query.title = query.title.replace(/ /g, "+") + "+"

      request = createRequestObject({
        url: `${NHENTAI_DOMAIN}/search/?q=${query.title}&page=${page}`,
        method: "GET",
      })
      sixDigit = false
    }

    let data = await this.requestManager.schedule(request, 1)

    let $ = this.cheerio.load(data.data)
    let mangaTiles: MangaTile[] = []

    // Was this a six digit request?
    if (sixDigit) {
      // Retrieve the ID from the body
      let contextNode = $("#bigcontainer")
      let href = $("a", contextNode).attr("href")

      let mangaId = parseInt(href?.match(/g\/(\d*)\/\d/)![1]!)

      let title = $("[itemprop=name]").attr("content") ?? ""

      // Clean up the title by removing all metadata, these are items enclosed within [ ] brackets
      title = title.replace(/(\[.+?\])/g, "").trim()

      mangaTiles.push(
        createMangaTile({
          id: mangaId.toString(),
          title: createIconText({ text: title }),
          image: $("[itemprop=image]").attr("content") ?? "",
        })
      )

      return createPagedResults({
        results: mangaTiles,
      })
    }

    let containerNode = $(".index-container")
    for (let item of $(".gallery", containerNode).toArray()) {
      let currNode = $(item)
      let image = $("img", currNode).attr("data-src")!

      // If image is undefined, we've hit a lazyload part of the website. Adjust the scraping to target the other features
      if (image == undefined) {
        image = "http:" + $("img", currNode).attr("src")!
      }

      let title = $(".caption", currNode).text()
      let idHref = $("a", currNode)
        .attr("href")
        ?.match(/\/(\d*)\//)!

      // Clean up the title by removing all metadata, these are items enclosed within [ ] brackets
      title = title.replace(/(\[.+?\])/g, "").trim()

      mangaTiles.push(
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
      results: mangaTiles,
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
