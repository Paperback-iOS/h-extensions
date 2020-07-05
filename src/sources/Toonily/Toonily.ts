
import { Source, Manga, MangaStatus, Tag, Chapter, ChapterDetails, HomeSectionRequest, HomeSection, MangaTile, SearchRequest, LanguageCode, Request } from "paperback-extensions-common"

const TOONILY_DOMAIN = 'https://toonily.com'

export class Toonily extends Source {
  constructor(cheerio: CheerioAPI) {
    super(cheerio)
  }

  get version(): string { return '1.0.0' }
  get name(): string { return 'Toonily' }
  get description(): string { return 'Source full of Korean Manhwa content. Contains both 18+ and non-18+ material.' }
  get author(): string { return 'Conrad Weiser' }
  get authorWebsite(): string { return 'http://github.com/conradweiser'}
  get icon(): string { return "logo.png" } 
  get hentaiSource(): boolean { return false }


  getMangaDetailsRequest(ids: string[]): Request[] {
    let requests: Request[] = []
    for (let id of ids) {

        let metadata = {'id' : id}
        requests.push(createRequestObject({
          url: `${TOONILY_DOMAIN}/webtoon/${metadata.id}`,
          cookies: [{
              name: 'wpmanga-adault',
              value: '1',
              domain: 'toonily.com',
              path: '/'
          }],
          metadata: metadata,
          method: 'GET'
        }))
      }

    return requests
  }

  getMangaDetails(data: any, metadata: any): Manga[] {
    let manga: Manga[] = []
    let $ = this.cheerio.load(data)

    let title = $('h1', $('.post-title')).text().replace('18+', '').trim()
    let hentai = $('.adult').toArray().length > 0 ? true : false
    let image = $('img', $('.summary_image')).attr('data-src')
    let rating = $('.total_votes').text()
    let status: MangaStatus = $('.summary-content').text().toLowerCase().includes('ongoing') ? MangaStatus.ONGOING : MangaStatus.COMPLETED
    let artist = $('a', $('.artist-content')).text()
    let author = $('a', $('.author-content')).text()
    let desc = $('p', $('.summary__content ')).text()

    // Get all of the tags
    let tags: Tag[] = []
    for(let obj of $('a', $('.genres-content')).toArray()) {
        let tagId = $(obj).attr('href')?.replace('https://toonily.com/webtoon-genre/', '').replace('/', '')
        let tagName = $(obj).text()

        tags.push(createTag({id: tagId!, label: tagName}))
    }


    return [createManga({
        id: metadata.id,
        titles: [title],
        image: image!,
        rating: Number(rating),
        status: status,
        hentai: hentai,
        artist: artist,
        author: author,
        desc: desc,
        tags: [createTagSection({label: 'genres', id: 'genres', tags: tags})]
    })]
  }

  getChaptersRequest(mangaId: string): Request {

    let metadata = { 'id': mangaId }
    return createRequestObject({
        url: `${TOONILY_DOMAIN}/webtoon/${metadata.id}`,
        cookies: [{
            name: 'wpmanga-adault',
            value: '1',
            domain: 'toonily.com',
            path: '/'
        }],
        metadata: metadata,
        method: 'GET'
      })
    }

  getChapters(data: any, metadata: any): Chapter[] {
    let $ = this.cheerio.load(data)
    let chapters: Chapter[] = []

    for(let obj of $('.wp-manga-chapter  ').toArray()) {
        let id = $('a', $(obj)).attr('href')?.replace(`${TOONILY_DOMAIN}/webtoon/${metadata.id}/`, '').replace('/', '')!
        let chapNum = Number(/(\d+)/g.exec($('a', $(obj)).text())![1])
        let date = new Date($('i', $(obj)).text())

        chapters.push(createChapter({
            id: id, 
            mangaId: metadata.id,
            langCode: LanguageCode.ENGLISH,
            chapNum: chapNum,
            time: date
        }))
    }

    return chapters
  }

  getChapterDetailsRequest(mangaId: string, chapId: string): Request {

    let metadata = { 'mangaId': mangaId, 'chapterId': chapId}
    return createRequestObject({
      url: `${TOONILY_DOMAIN}/webtoon/${mangaId}/${chapId}/`,
      metadata: metadata,
      cookies: [{
        name: 'wpmanga-adault',
        value: '1',
        domain: 'toonily.com',
        path: '/'
    }],
      method: 'GET',
    })
  }

  getChapterDetails(data: any, metadata: any): ChapterDetails {
    let $ = this.cheerio.load(data)

    let pages: string[] = []
    for(let obj of $('.page-break', $('.reading-content')).toArray()) {
        pages.push(
            $('img', $(obj)).attr('data-src')?.trim()!
        )
    }

    return createChapterDetails({
        id: metadata.chapterId,
        mangaId: metadata.mangaId,
        pages: pages,
        longStrip: true
    })
  }


  searchRequest(query: SearchRequest, page: number): Request {
      query.title = query.title?.replace(" ", "+")
    return createRequestObject({
      //https://toonily.com/?s=Hero&post_type=wp-manga
      url: `${TOONILY_DOMAIN}/?s=${query.title}&post_type=wp-manga`,
      timeout: 4000,
      method: "GET"
    })
  }

  search(data: any, metadata: any): MangaTile[] {

    let $ = this.cheerio.load(data)
    let mangaTiles: MangaTile[] = []

    for(let obj of $('.row', $('.c-tabs-item')).toArray()) {
        let id = $('a', $(obj)).attr('href')?.replace(`${TOONILY_DOMAIN}/webtoon/`, '').replace('/', '')!
        let title = $('a', $(obj)).attr('title')!
        let image = $('img', $(obj)).attr('data-src')!

        let rating = $('.total_votes', $(obj)).text().trim()

        mangaTiles.push(createMangaTile({
            id: id,
            title: createIconText({text: title}),
            image: image,
            primaryText: createIconText({text: rating, icon: 'star.fill'})
        }))
    }

    return mangaTiles
  }

  getHomePageSectionRequest(): HomeSectionRequest[] | null { 
  
    let request = createRequestObject({url: `${TOONILY_DOMAIN}`, method: 'GET'})
    let latestUpdatesSection = createHomeSection({id: 'latest_updates', title: 'LATEST UPDATES'})

    return [createHomeSectionRequest({request: request, sections: [latestUpdatesSection]})]

  }


  getHomePageSections(data: any, section: HomeSection[]): HomeSection[] | null { 

    let $ = this.cheerio.load(data)
    let latestUpdates: MangaTile[] = []

    for(let row of $('.page-listing-item').toArray()) {
        for(let obj of $('.col-6', $(row)).toArray()) {
            let id = $('a', $('.item-thumb', $(obj))).attr('href')?.replace(`${TOONILY_DOMAIN}/webtoon/`, '').replace('/', '')
            let title = $('a', $('.item-thumb', $(obj))).attr('title')?.trim()
            let image = $('img', $(obj)).attr('data-src')
            let rating = $('.total_votes', $(obj)).text().trim()

            latestUpdates.push(createMangaTile({
                id: id!,
                title: createIconText({text: title!}),
                image: image!,
                primaryText: createIconText({text: rating, icon: 'star.fill'})
            }))
        }
    }

    section[0].items = latestUpdates
    return section
  }
}

