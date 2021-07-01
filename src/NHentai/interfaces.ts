interface ImagePageObject {
  t: "j" | "p" | "g" // JPG (≧◡≦)
  w: number
  h: number
}
export interface ImageObject {
  pages: ImagePageObject[]
  cover: ImagePageObject
  thumbnail: ImagePageObject
}

export interface TagObject {
  id: number
  type:
    | "artist"
    | "category"
    | "character"
    | "groups"
    | "language"
    | "parody"
    | "tag"
  name: string
  url: string
  count: number
}

interface resTitleObj {
  /**
   * English title of this object.
   *
   * `eg: [Azuma Tesshin] Ichigo Cake to Mont Blanc | Strawberry Cake & Mont Blanc - The cherry boy with Bitch sister. (COMIC Kairakuten 2018-05) [English] [Tamamo | GDS] [Digital]"`
   */
  english: string
  /**
   * Native title of this object.
   *
   * `eg: [東鉄神] イチゴのケーキとモンブラン (COMIC 快楽天 2018年5月号) [英訳] [DL版]`
   */
  japanese: string
  /**
   * Pretty title of this object.
   *
   * `eg: Ichigo Cake to Mont Blanc | Strawberry Cake & Mont Blanc - The cherry boy with Bitch sister.`
   */
  pretty: string
}
export interface Response {
  /**
   * id of this object.
   * `eg: 363636`
   */
  id: number
  /**
   * mediaId of this object.
   * `eg: 1940023`
   */
  media_id: string
  /**
   * Titles of this object.
   */
  title: resTitleObj
  /**
   * Images of this object.
   */
  images: ImageObject
  /**
   * Scanlator of this object.
   * Not available still. :-(
   */
  scanlator: string | undefined
  /**
   * Uploaded date of this object in unix timestamp
   */
  uploadedDate: number
  /**
   * Tags of this object.
   */
  tags: TagObject[]
  /**
   * Number of pages this object has.
   */
  numPages: number
  /**
   * Number of favorites of this object in nhentai
   */
  numFavorites: number
}
