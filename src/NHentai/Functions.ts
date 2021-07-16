import { ImageObject } from "./Interfaces"
export const NHENTAI_DOMAIN = "https://nhentai.net"

/**
 * Creates a `search` endpoint based url
 * https://nhentai.net/api/galleries/search
 */
export const QUERY = (
  query: string,
  sort: "popular-today" | "popular-week" | "popular" | "",
  page: number
): string =>
  NHENTAI_DOMAIN +
  "/api/galleries/search?" +
  `query=${encodeURI(query)}` +
  `&page=${page}` +
  `&sort=${sort}`

/**
 * nhentai API returns image extensions as `j | p | g` representing "jpg" | "png" | "gif" respectively
 */
export const TYPE = (type: "j" | "p" | "g"): "jpg" | "png" | "gif" => {
  switch (type) {
    case "j":
      return "jpg"
    case "p":
      return "png"
    case "g":
      return "gif"
  }
}

/**
 * Returns images/ pages from media_id and {@link ImageObject} <br />
 * https://i.nhentai.net/galleries/media_id/number/type
 */
export const PAGES = (images: ImageObject, media_Id: string): string[] =>
  images.pages.map(
    (page, i) =>
      `https://i.nhentai.net/galleries/${media_Id}/${[i + 1]}.${TYPE(page.t)}`
  )

/**
 * Capitalize the first character of a string: <br />
 * `bondage => Bondage`
 */
export const capitalize = (str: string): string => {
  const cappedString = str
    .toString()
    .split("_")
    .map(
      (word) => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()
    )[0]
  if (!cappedString) return "N/A"
  else return cappedString
}
