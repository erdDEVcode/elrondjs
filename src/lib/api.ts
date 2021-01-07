import axios, { AxiosInstance, AxiosRequestConfig, ResponseType, Method, AxiosError } from 'axios'



/**
 * Base options for for all API  requests.
 *
 * This can be overridden on a per-request basis.
 */
export interface ApiGlobalCallOptions {
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
export interface ApiCallOptions extends ApiGlobalCallOptions {
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
 * Configuration for an API.
 */
export interface ApiConfig {
  /**
   * Global call options for all requests.
   */
  callOptions?: ApiGlobalCallOptions,
  /**
   * Hook for debugging requests.
   * 
   * @param urlPath the URL path being called.
   * @param requestOptions the final request options passed to Axios.
   */
  onRequest?: (urlPath: string, requestOptions: ApiCallOptions) => void,
  /**
   * Hook for debugging responses.
   * 
   * @param urlPath the URL path being called.
   * @param requestOptions the final request options passed to Axios.
   * @param response the response. If set then `error` should be ignored.
   * @param error the error. If set then `response` should be ignored.
   */
  onResponse?: (urlPath: string, requestOptions: ApiCallOptions, response?: any, error?: Error) => void
}



/**
 * Base class for API interfaces.
 * 
 * This provides convenience methods for making request and performing basic response parsing.
 */
export class Api {
  protected _axios: AxiosInstance
  protected _baseUrl: string
  protected _config: ApiConfig | undefined
  protected _defaultOptions: ApiGlobalCallOptions

  /**
   * @param baseUrl The root endpoint for all API requests.
   * @param config Configuration
   */
  constructor(baseUrl: string, config?: ApiConfig) {
    this._baseUrl = baseUrl

    this._config = config

    this._defaultOptions = {
      timeout: config?.callOptions?.timeout || 3000,
      responseType: config?.callOptions?.responseType || 'json',
      headers: config?.callOptions?.headers || {},
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

    try {
      if (this._config?.onRequest) {
        this._config?.onRequest(urlPath, finalOpts)
      }

      ret = await this._axios.request({
        url: urlPath,
        ...finalOpts,
      })

      if (this._config?.onResponse) {
        this._config?.onResponse(urlPath, finalOpts, ret)
      }

      return this._responseTransformer(ret)
    } catch (err) {
      if (this._config?.onResponse) {
        this._config?.onResponse(urlPath, finalOpts, undefined, err)
      }

      return this._responseTransformer(undefined, err)
    }
  }

  /**
   * Default response transformer.
   * 
   * This gets passed the response of every request. Subclasses may override 
   * this to customize resposne handling.
   * 
   * @param ret The response.
   * @param error Request error that thrown.
   * @return {any} The transformed response.
   * @throws {Error} If the response was an error.
   */
  protected async _responseTransformer(ret?: any, error?: AxiosError): Promise<any> {
    if (error) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }
    } else if (ret) {
      const { data, error } = ret

      if (error) {
        throw new Error(error.message)
      }

      return data || ret
    } else {
      throw new Error('Invalid response transformer call')
    }
  }
}
