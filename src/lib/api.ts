import axios, { AxiosInstance } from 'axios'


/**
 * Options for API calls.
 */
export interface ApiCallOptions {
  /**
   * Milliseconds to count until request automatically times out.
   * 
   * Default is `3000`.
   */
  timeout?: number,
  /**
   * The response type to accept from the endpoint being called.
   * 
   * Valid values are as specified for `responseType` parameter passed to [Axios](https://www.npmjs.com/package/axios).
   * 
   * Default is `json`.
   */
  responseType?: string,
  /**
   * Additional HTTP headers to pass along with the request.
   */
  headers?: Record<string, string>,
  /**
   * Body to submit along with the request.
   */
  body?: string,
  /**
   * The HTTP method to call the endpoint with.
   * 
   * Default is `GET`.
   */
  method?: "GET" | "POST",
}

/**
 * Base class for API interfaces.
 * 
 * This provides convenience methods for making request and performing basic response parsing.
 */
export class Api {
  protected _axios: AxiosInstance
  protected _baseUrl: string

  /**
   * @param baseUrl The root endpoint for all API requests.
   */
  constructor(baseUrl: string) {
    this._baseUrl = baseUrl

    this._axios = axios.create({
      baseURL: baseUrl,
    })
  }

  /**
   * Make a request.
   * 
   * @param urlPath The API path relative to the root endpoint configured in the constructor.
   * @param options Call options.
   * @return {any}
   * @throws {Error} If the response was an error.
   */
  protected async _call(urlPath: string, options: ApiCallOptions = {}) {
    let ret: any

    const finalOpts = {
      timeout: options.timeout || 3000,
      reponseType: options.responseType || 'json',
      headers: options.headers || {},
      data: options.body || undefined,
      method: options.method || 'GET',
    }

    ret = await this._axios.request({
      url: urlPath,
      ...finalOpts,
    })

    return this._responseTransformer(ret)
  }

  /**
   * Default response transformer.
   * 
   * This gets passed the response of every request. Subclasses may override 
   * this to customize resposne handling.
   * 
   * @param ret The Response.
   * @return {any} The transformed response.
   * @throws {Error} If the response was an error.
   */
  protected async _responseTransformer(ret: any): Promise<any> {
    const { data, error } = ret

    if (error) {
      throw new Error(error.message)
    }

    return data || ret
  }
}
