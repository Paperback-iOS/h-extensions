import { ImageObject } from "./Interfaces"

// Don't think about this too much, appends the missing letters to finish the extension. (￣ω￣)
const TYPE = (type: string) => {
  if (type === "j") return type + "pg"
  if (type === "p") return type + "ng"
  else return type + "if"
}

// Exports
export const NHENTAI_DOMAIN = "https://nhentai.net"

export const NHENTAI_API = (type: "gallery" | "galleries") =>
  NHENTAI_DOMAIN + "/api/" + type + "/"

// Makes a request into a url format.
export const QUERY = (
  query?: string,
  sort?: "popular-today" | "popular-week" | "popular",
  page?: number
) =>
  `search?query=${query ? query : ""}&sort=${sort ? sort : "popular"}&page=${
    page ? page : 1
  }`

export const IMAGES = (
  images: ImageObject,
  media_Id: string,
  page: boolean
) => {
  if (page == true)
    return images.pages.map(
      (page, i) =>
        `https://i.nhentai.net/galleries/${media_Id}/${[i + 1]}.${TYPE(page.t)}`
    )
  else
    return [
      `https://t.nhentai.net/galleries/${media_Id}/1t.${TYPE(
        images.thumbnail.t
      )}`,
    ]
}

// Makes the first letter of a string capital.
export const capitalize = (str: string) =>
  str
    .toString()
    .split("_")
    .map(
      (word) => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()
    )[0]
