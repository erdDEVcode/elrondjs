import axios, { AxiosInstance } from 'axios'


/**
 * Options for API calls.
 */
export interface ApiCallOptions {
  timeout?: number,
  responseType?: string,
  headers?: Record<string, string>,
  body?: string,
  method?: "GET" | "POST",
}

/**
 * Base class for API interfaces.
 * 
 * This provides convenience methods for making request and performing basic response parsing.
 */
export class Api {
  _axios: AxiosInstance
  _baseUrl: string

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
   * @param urlPath The API path relative to the root endpoint configured in the constructor.
   * @param options Call options.
   * @return {any}
   */
  async _call(urlPath: string, options: ApiCallOptions = {}) {
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

  async _responseTransformer(ret: any): Promise<any> {
    const { data, error } = ret

    if (error) {
      throw new Error(error.message)
    }

    return data || ret
  }
}
