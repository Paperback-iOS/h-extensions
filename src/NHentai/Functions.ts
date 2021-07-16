import { ImageObject } from "./Interfaces"

// Exports
export const NHENTAI_DOMAIN = "https://nhentai.net"

// Makes a request into a url format.
export const QUERY = (
  query?: string,
  sort?: "popular-today" | "popular-week" | "popular" | "",
  page?: number
): string =>
  `${NHENTAI_DOMAIN}/api/galleries/search?query=${query ? query : ""}&sort=${
    sort ? sort : ""
  }&page=${page ? page : 1}`

// Don't think about this too much, appends the missing letters to finish the extension. (￣ω￣)
export const TYPE = (type: string): string => {
  if (type === "j") return type + "pg"
  if (type === "p") return type + "ng"
  else return type + "if"
}

export const PAGES = (images: ImageObject, media_Id: string): string[] =>
  images.pages.map(
    (page, i) =>
      `https://i.nhentai.net/galleries/${media_Id}/${[i + 1]}.${TYPE(page.t)}`
  )

// Makes the first letter of a string capital.
export const capitalize = (str: string): string => {
  const cappedString = str
    .toString()
    .split("_")
    .map(
      (word) => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()
    )[0]
  if (!cappedString) return "Not Available"
  else return cappedString
}
