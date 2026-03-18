import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else {
    const guestToken = localStorage.getItem('guest_token')
    if (guestToken) {
      config.headers['X-Guest-Token'] = guestToken
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export const ERROR_MESSAGES: Record<string, string> = {
  invalid_url_scheme: 'URL должен начинаться с http:// или https://',
  invalid_url_format: 'Некорректный формат URL',
  active_link_limit: 'Достигнут лимит активных ссылок',
  rate_limit_exceeded: 'Слишком много запросов. Попробуйте позже.',
  email_taken: 'Email уже зарегистрирован',
  invalid_credentials: 'Неверный email или пароль',
  captcha_failed: 'CAPTCHA не пройдена',
  invalid_date: 'Некорректная дата истечения',
  expires_too_far: 'Время жизни ссылки не может превышать 24 часа',
  invalid_email: 'Некорректный email',
  invalid_password: 'Пароль обязателен',
}

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const code = err.response?.data?.error
    if (typeof code === 'string' && ERROR_MESSAGES[code]) {
      return ERROR_MESSAGES[code]
    }
    if (typeof code === 'string') {
      return code
    }
    const msg = err.response?.data?.message
    if (typeof msg === 'string') {
      return msg
    }
    if (err.response?.status === 429) {
      return ERROR_MESSAGES.rate_limit_exceeded
    }
  }
  return 'Произошла ошибка'
}

export interface ShortenResponse {
  short_code: string
  short_url: string
  expires_at: string
}

export interface UrlItem {
  short_code: string
  short_url: string
  original_url: string
  title: string | null
  created_at: string
  expires_at: string | null
}

export interface PaginatedUrls {
  data: UrlItem[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export async function getGuestToken(): Promise<string> {
  const { data } = await api.get<{ guest_token: string }>('/guest-token')
  localStorage.setItem('guest_token', data.guest_token)
  return data.guest_token
}

export async function shortenUrl(
  url: string,
  title?: string,
  expiresAt?: string,
): Promise<ShortenResponse> {
  const body: Record<string, string> = { url }
  if (title) body.title = title
  if (expiresAt) body.expires_at = expiresAt
  const { data } = await api.post<ShortenResponse>('/shorten', body)
  return data
}

export async function getUserUrls(
  page = 1,
  limit = 20,
  sort = 'created_at',
  order = 'desc',
): Promise<PaginatedUrls> {
  const { data } = await api.get<PaginatedUrls>('/urls', {
    params: { page, limit, sort, order },
  })
  return data
}

export async function deleteUrl(code: string): Promise<void> {
  await api.delete(`/urls/${code}`)
}

export async function register(
  email: string,
  password: string,
): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/register', {
    email,
    password,
  })
  return data
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; expires_at: string }> {
  const credentials = btoa(`${email}:${password}`)
  const { data } = await api.post<{ token: string; expires_at: string }>(
    '/auth/login',
    null,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    },
  )
  return data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}
