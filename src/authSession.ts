export interface AuthSession {
  displayName: string
  email: string
  provider: 'email' | 'Kakao' | 'Google' | 'Naver'
  loggedInAt: string
  role: 'customer' | 'admin'
}
