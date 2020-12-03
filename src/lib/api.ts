import axios, { AxiosInstance, AxiosRequestConfig, ResponseType, Method } from 'axios'


/**
 * Base options for for all API  requests.
 *
 * This can be overridden on a per-request basis.
 */
export interface ApiOptions {
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
   * Additional HTTP headers to pass along with every request.
   */
  headers?: Record<string, string>,
}


/**
 * Options for individual API reqeusts.
 * 
 * This will override any equivalent `ApiOptions` options set at the instance level in the constructor.
 */
export interface ApiCallOptions extends ApiOptions {
  /**
   * Body to submit along with the request.
   */
  data?: string,
  /**
   * The HTTP method to call the endpoint with.
   * 
   * Valid values are as specified for `method` parameter passed to [Axios](https://www.npmjs.com/package/axios).
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
  protected _defaultOptions: ApiOptions

  /**
   * @param baseUrl The root endpoint for all API requests.
   * @param options Options to apply to all requests.
   */
  constructor(baseUrl: string, options?: ApiOptions) {
    this._baseUrl = baseUrl

    this._defaultOptions = {
      timeout: options?.timeout || 3000,
      responseType: options?.responseType || 'json',
      headers: options?.headers || {},
    }

    this._axios = axios.create({
      baseURL: baseUrl,
    })
  }

  /**
   * Make a request.
   * 
   * Note that any request options supplied via the `options` parameter will override those 
   * set in the constructor.
   * 
   * @param urlPath The API path relative to the root endpoint configured in the constructor.
   * @param options Request options. Will override those set in the constructor.
   * @return {any}
   * @throws {Error} If the response was an error.
   */
  protected async _call(urlPath: string, options?: ApiCallOptions) {
    let ret: any

    const finalOpts = {
      timeout: options?.timeout || this._defaultOptions.timeout,
      responseType: options?.responseType || this._defaultOptions.responseType,
      headers: Object.assign({}, this._defaultOptions.headers, options?.headers),
      data: options?.data || undefined,
      method: options?.method || 'GET'
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
