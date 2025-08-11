const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

export interface AuthUser {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
  is_active: boolean
  date_joined: string
}

export interface User {
  id: number
  telegram_id: number
  full_name: string | null
  phone_number: string | null
  language: string | null
  created_at: string
  updated_at: string
}

export interface Driver {
  id: number
  user: User
  passport_photo: string
  passport_photo_url: string | null
  direction: string
  direction_display: string
  driver_license_photo: string
  driver_license_photo_url: string | null
  sts_photo: string
  sts_photo_url: string | null
  car_photo: string
  car_photo_url: string | null
  is_approved: boolean
  points: number
  rating: number
  created_at: string
  updated_at: string
}

export interface Order {
  id: number
  user: User
  driver: Driver | null
  claimed_by?: Driver | null
  claimed_at?: string | null
  order_type: string
  order_type_display: string
  full_name: string
  phone_number: string
  from_country: string | null
  from_location: string | null
  from_region: string | null
  to_country: string | null
  to_location: string | null
  to_region: string | null
  order_date: string | null
  num_passengers: number | null
  item_description: string | null
  weight_tons: number | null
  payment_amount: string | null
  terms: string | null
  comment: string | null
  status: string
  status_display: string
  created_at: string
  updated_at: string
}

export interface BotSettings {
  id: number
  driver_request_group_id: string
  taxi_group_id: string
  gruz_group_id: string
  avia_group_id: string
  point_purchase_group_id: string | null
  deport_check_group_id: string | null
  deport_price: number | null
  admin_username: string | null
  admins: User[]
}

export interface UpdateBotSettingsPayload {
  driver_request_group_id?: string
  taxi_group_id?: string
  gruz_group_id?: string
  avia_group_id?: string
  point_purchase_group_id?: string | null
  deport_check_group_id?: string | null
  deport_price?: number | null
  admin_username?: string | null
  admin_ids?: number[]
}

export interface PointTransaction {
  id: number
  driver: Driver
  driver_id?: number
  amount: number
  transaction_type: "add" | "subtract"
  transaction_type_display: string
  reason: string | null
  created_at: string
}

export interface Country {
  id: number
  code: string
  name_uz: string
  name_ru: string
  name_cy: string | null
  name_tj: string | null
  name_kz: string | null
  created_at: string
  updated_at: string
}

export interface PointPrice {
  id: number
  name: string
  service: "taxi_package"
  service_display: string
  point_amount: number
  price: number
  discount_percentage: number
  order_number: number
  is_active: boolean
  is_popular: boolean
  description: string | null
  created_at: string
  updated_at: string
  final_price: number
}

export interface Card {
  id: number
  card_number: string
  card_holder_name: string
  bank_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PointPurchaseRequest {
  id: number
  driver: Driver
  point_price: PointPrice
  card_number: string
  receipt_photo?: string
  receipt_photo_url: string | null
  status: "pending" | "approved" | "rejected"
  status_display: string
  admin_comment: string | null
  created_at: string
  updated_at: string
}

export interface UpdatePointPurchaseRequestPayload {
  status?: "pending" | "approved" | "rejected"
  admin_comment?: string | null
}

class ApiClient {
  private baseUrl: string
  private accessToken: string | null = null
  private refreshToken: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem("access_token")
      this.refreshToken = localStorage.getItem("refresh_token")
    }
  }

  private async request<T>(method: string, path: string, data?: any, isAuthRequest = false): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (this.accessToken && !isAuthRequest) {
      headers["Authorization"] = `Bearer ${this.accessToken}`
    }

    const config: RequestInit = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    }

    let response = await fetch(`${this.baseUrl}${path}`, config)

    if (response.status === 401 && this.refreshToken && !isAuthRequest) {
      const refreshed = await this.refreshAccessToken()
      if (refreshed) {
        headers["Authorization"] = `Bearer ${this.accessToken}`
        config.headers = headers
        response = await fetch(`${this.baseUrl}${path}`, config)
      } else {
        this.logout()
        throw new Error("Unauthorized: Could not refresh token")
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(errorData.detail || errorData.message || "API request failed")
    }

    return response.json()
  }

  async login(username: string, password: string): Promise<{ access: string; refresh: string }> {
    const data = await this.request<{ access: string; refresh: string }>("POST", "/token/", { username, password }, true)
    this.accessToken = data.access
    this.refreshToken = data.refresh
    localStorage.setItem("access_token", data.access)
    localStorage.setItem("refresh_token", data.refresh)
    return data
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false
    try {
      const data = await this.request<{ access: string }>(
        "POST",
        "/token/refresh/",
        { refresh: this.refreshToken },
        true,
      )
      this.accessToken = data.access
      localStorage.setItem("access_token", data.access)
      return true
    } catch (error) {
      console.error("Failed to refresh token:", error)
      return false
    }
  }

  logout(): void {
    this.accessToken = null
    this.refreshToken = null
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    window.location.href = "/login"
  }

  isAuthenticated(): boolean {
    return !!this.accessToken
  }

  // Helpers
  private buildQuery(params?: Record<string, any>): string {
    const qp = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qp.append(k, String(v))
      })
    }
    const qs = qp.toString()
    return qs ? `?${qs}` : ""
  }

  // Auth User
  async getCurrentAuthUser(): Promise<AuthUser> {
    return this.request("GET", "/auth/user/")
  }

  // Users
  async getUsers(page?: number): Promise<{ results: User[] }> {
    const qs = this.buildQuery({ page })
    return this.request("GET", `/users/${qs}`)
  }

  async getUser(id: number): Promise<User> {
    return this.request("GET", `/users/${id}/`)
  }

  async deleteUser(id: number): Promise<void> {
    return this.request("DELETE", `/users/${id}/`)
  }

  async searchUsers(query: string, page?: number): Promise<{ results: User[] }> {
    const qs = this.buildQuery({ query, page })
    return this.request("GET", `/users/search/${qs}`)
  }

  // Drivers
  async getDrivers(page?: number, params?: { is_approved?: string | boolean; direction?: string; region?: string }): Promise<{ results: Driver[] }> {
    const qs = this.buildQuery({ page, ...(params || {}) })
    return this.request("GET", `/drivers/${qs}`)
  }

  async getDriver(id: number): Promise<Driver> {
    return this.request("GET", `/drivers/${id}/`)
  }

  async updateDriver(id: number, data: Partial<Driver>): Promise<Driver> {
    return this.request("PATCH", `/drivers/${id}/`, data)
  }

  async deleteDriver(id: number): Promise<void> {
    return this.request("DELETE", `/drivers/${id}/`)
  }

  // Orders
  async getOrders(page?: number, params?: { order_type?: string; status?: string; date_from?: string; date_to?: string }): Promise<{ results: Order[] }> {
    const qs = this.buildQuery({ page, ...(params || {}) })
    return this.request("GET", `/orders/${qs}`)
  }

  async getOrder(id: number): Promise<Order> {
    return this.request("GET", `/orders/${id}/`)
  }

  async updateOrder(id: number, data: Partial<Order>): Promise<Order> {
    return this.request("PATCH", `/orders/${id}/`, data)
  }

  async deleteOrder(id: number): Promise<void> {
    return this.request("DELETE", `/orders/${id}/`)
  }

  // Point Transactions
  async getPointTransactions(page?: number, params?: { driver_id?: number; transaction_type?: "add" | "subtract" }): Promise<{ results: PointTransaction[] }> {
    const qs = this.buildQuery({ page, ...(params || {}) })
    return this.request("GET", `/point-transactions/${qs}`)
  }

  async createPointTransaction(data: {
    driver_id: number
    amount: number
    transaction_type: "add" | "subtract"
    reason?: string | null
  }): Promise<PointTransaction> {
    return this.request("POST", "/point-transactions/", data)
  }

  async getPointTransaction(id: number): Promise<PointTransaction> {
    return this.request("GET", `/point-transactions/${id}/`)
  }

  async updatePointTransaction(id: number, data: Partial<PointTransaction>): Promise<PointTransaction> {
    return this.request("PATCH", `/point-transactions/${id}/`, data)
  }

  async deletePointTransaction(id: number): Promise<void> {
    return this.request("DELETE", `/point-transactions/${id}/`)
  }

  // Bot Settings
  async getBotSettings(): Promise<BotSettings> {
    return this.request("GET", "/bot-settings/")
  }

  async updateBotSettings(data: UpdateBotSettingsPayload): Promise<BotSettings> {
    return this.request("PATCH", "/bot-settings/", data)
  }

  // Statistics
  async getOrderStatistics(): Promise<any> {
    return this.request("GET", "/statistics/")
  }

  // Invite Links
  async createInviteLink(group_id: string): Promise<{ success: boolean; invite_link?: string; message: string }> {
    return this.request("POST", "/invite-links/create/", { group_id })
  }

  async revokeInviteLink(group_id: string, invite_link: string): Promise<{ success: boolean; message: string }> {
    return this.request("POST", "/invite-links/revoke/", { group_id, invite_link })
  }

  // Countries
  async getCountries(page?: number): Promise<{ results: Country[] }> {
    const qs = this.buildQuery({ page })
    return this.request("GET", `/countries/${qs}`)
  }

  async createCountry(data: Omit<Country, "id" | "created_at" | "updated_at">): Promise<Country> {
    return this.request("POST", "/countries/", data)
  }

  async updateCountry(id: number, data: Partial<Omit<Country, "id" | "created_at" | "updated_at">>): Promise<Country> {
    return this.request("PATCH", `/countries/${id}/`, data)
  }

  async deleteCountry(id: number): Promise<void> {
    return this.request("DELETE", `/countries/${id}/`)
  }

  // Point Prices
  async getPointPrices(page?: number): Promise<{ results: PointPrice[] }> {
    const qs = this.buildQuery({ page })
    return this.request("GET", "/point-prices/" + qs)
  }

  async createPointPrice(
    data: Omit<PointPrice, "id" | "created_at" | "updated_at" | "service_display" | "final_price">,
  ): Promise<PointPrice> {
    return this.request("POST", "/point-prices/", data)
  }

  async updatePointPrice(
    id: number,
    data: Partial<Omit<PointPrice, "id" | "created_at" | "updated_at" | "service_display" | "final_price">>,
  ): Promise<PointPrice> {
    return this.request("PATCH", `/point-prices/${id}/`, data)
  }

  async deletePointPrice(id: number): Promise<void> {
    return this.request("DELETE", `/point-prices/${id}/`)
  }

  // Cards
  async getCards(page?: number): Promise<{ results: Card[] }> {
    const qs = this.buildQuery({ page })
    return this.request("GET", "/cards/" + qs)
  }

  async createCard(data: Omit<Card, "id" | "created_at" | "updated_at">): Promise<Card> {
    return this.request("POST", "/cards/", data)
  }

  async updateCard(id: number, data: Partial<Omit<Card, "id" | "created_at" | "updated_at">>): Promise<Card> {
    return this.request("PATCH", `/cards/${id}/`, data)
  }

  async deleteCard(id: number): Promise<void> {
    return this.request("DELETE", `/cards/${id}/`)
  }

  // Point Purchase Requests
  async getPointPurchaseRequests(page?: number, params?: { status?: "pending" | "approved" | "rejected"; driver_id?: number }): Promise<{ results: PointPurchaseRequest[] }> {
    const qs = this.buildQuery({ page, ...(params || {}) })
    return this.request("GET", `/point-purchase-requests/${qs}`)
  }

  async getPointPurchaseRequest(id: number): Promise<PointPurchaseRequest> {
    return this.request("GET", `/point-purchase-requests/${id}/`)
  }

  async updatePointPurchaseRequest(id: number, data: UpdatePointPurchaseRequestPayload): Promise<PointPurchaseRequest> {
    return this.request("PATCH", `/point-purchase-requests/${id}/`, data)
  }

  async deletePointPurchaseRequest(id: number): Promise<void> {
    return this.request("DELETE", `/point-purchase-requests/${id}/`)
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
