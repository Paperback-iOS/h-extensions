import { LanguageCode } from "paperback-extensions-common"
import { ImageObject } from "./Interfaces"
//https://github.com/Paperback-iOS/extensions-sources/blob/528cd46bfcd6310b567364d90eec0bd36efb6954/src/MangaDex/MangaDexHelper.ts#L325

export class Helper {
  /**
   * Capitalize the first character of a string: <br />
   * `bondage => Bondage`
   */
  capitalize(str: string): string {
    const cappedString = str
      .toString()
      .split("_")
      .map(
        (word) => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()
      )[0]
    if (!cappedString) return "N/A"
    else return cappedString
  }

  /**
   * Switch to turn language => {@link LanguageCode}
   */
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

  /**
   * Switch to turn `j | p | g` types to readable image extensions
   */
  convertToExtType(type: "j" | "p" | "g"): "jpg" | "png" | "gif" {
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
   * Returns images/ pages from media_id and {@link ImageObject}
   * @param thumb Whether images should be thumbnails or not.
   * @param id media_id not id
   *
   * https://i.nhentai.net/galleries/media_id/number.type
   * https://t.nhentai.net/galleries/media_id/numbert.type
   */
  getImageURLs(thumb: boolean, images: ImageObject, id: string): string[] {
    if (thumb) {
      const page = images.thumbnail
      return [
        "https://t.nhentai.net/galleries/" +
          `${id}/` +
          `1t.${this.convertToExtType(page.t)}`,
      ]
    } else
      return images.pages.map(
        (page, i) =>
          "https://i.nhentai.net/galleries/" +
          `${id}/` +
          [i + 1] +
          `.${this.convertToExtType(page.t)}`
      )
  }
}

/**
 * Nar1n's Lovely URLBuilder!
 */
export class URLBuilder {
  parameters: Record<string, any | any[]> = {}
  pathComponents: string[] = []
  baseUrl: string
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/(^\/)?(?=.*)(\/$)?/gim, "")
  }

  addPathComponent(component: string): URLBuilder {
    this.pathComponents.push(component.replace(/(^\/)?(?=.*)(\/$)?/gim, ""))
    return this
  }

  addQueryParameter(key: string, value: any | any[]): URLBuilder {
    this.parameters[key] = value
    return this
  }

  buildUrl(
    { addTrailingSlash, includeUndefinedParameters } = {
      addTrailingSlash: false,
      includeUndefinedParameters: false,
    }
  ): string {
    let finalUrl = this.baseUrl + "/"

    finalUrl += this.pathComponents.join("/")
    finalUrl += addTrailingSlash ? "/" : ""
    finalUrl += Object.values(this.parameters).length > 0 ? "?" : ""
    finalUrl += Object.entries(this.parameters)
      .map((entry) => {
        if (entry[1] == null && !includeUndefinedParameters) {
          return undefined
        }

        if (Array.isArray(entry[1])) {
          return entry[1]
            .map((value) =>
              value || includeUndefinedParameters
                ? `${entry[0]}[]=${value}`
                : undefined
            )
            .filter((x) => x !== undefined)
            .join("&")
        }

        if (typeof entry[1] === "object") {
          return Object.keys(entry[1])
            .map((key) => `${entry[0]}[${key}]=${entry[1][key]}`)
            .join("&")
        }

        return `${entry[0]}=${entry[1]}`
      })
      .filter((x) => x !== undefined)
      .join("&")

    return finalUrl
  }
}
