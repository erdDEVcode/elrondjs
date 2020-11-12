import axios, { AxiosInstance } from 'axios'

export interface ApiCallOptions {
  timeout?: number,
  responseType?: string,
  headers?: Record<string, string>,
  body?: string,
  method?: "GET" | "POST",
}

export class Api {
  _axios: AxiosInstance
  _baseUrl: string

  constructor(baseUrl: string) {
    this._baseUrl = baseUrl

    this._axios = axios.create({
      baseURL: baseUrl,
    })
  }

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
