import axios, { AxiosInstance, AxiosRequestConfig, ResponseType, Method } from 'axios'

/**
 * Options for API calls.
 */
export interface ApiCallOptions {
  /**
   * Milliseconds to count until the request automatically times out.
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
  responseType?: ResponseType,
  /**
   * Additional HTTP headers to pass along with the request.
   */
  headers?: Record<string, string>,
  /**
   * Body to submit along with the request.
   */
  data?: string,
  /**
   * The HTTP method to call the endpoint with.
   * 
   * Default is `GET`.
   */
  method?: Method,
}

/**
 * Base class for API interfaces.
 * 
 * This provides convenience methods for making request and performing basic response parsing.
 */
export class Api {
  protected _axios: AxiosInstance
  protected _baseUrl: string
  protected _defaultOptions: ApiCallOptions

  /**
   * @param baseUrl The root endpoint for all API requests.
   * @param options Options to apply to all requests.
   */
  constructor(baseUrl: string, options?: ApiCallOptions) {
    this._baseUrl = baseUrl

    this._defaultOptions = {
      timeout: options?.timeout || 3000,
      responseType: options?.responseType || 'json',
      headers: options?.headers || {},
      data: options?.data,
      method: options?.method || 'GET',
    }

    this._axios = axios.create({
      baseURL: baseUrl,
    })
  }

  /**
   * Make a request.
   * 
   * @param urlPath The API path relative to the root endpoint configured in the constructor.
   * @param options Call options. These will override any options set in the constructor.
   * @return {any}
   * @throws {Error} If the response was an error.
   */
  protected async _call(urlPath: string, options?: ApiCallOptions) {
    let ret: any

    const finalOpts = {
      ...this._defaultOptions,
      ...options,
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
