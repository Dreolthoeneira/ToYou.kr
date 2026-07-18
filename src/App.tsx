import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LocaleSuggestionPrompt } from './components/LocaleSuggestionPrompt'
import { HomePage } from './pages/HomePage'
import { StorePage } from './pages/StorePage'
import { CatalogAdminPage } from './pages/CatalogAdminPage'
import { CatalogProductPage } from './pages/CatalogProductPage'
import { AuthPage } from './pages/AuthPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { SeasonalCollectionPage } from './pages/SeasonalCollectionPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { PostsPage } from './pages/PostsPage'
import { ProfilePage } from './pages/ProfilePage'
import { loadCatalog, type CatalogProduct } from './catalog'
import {
  loadAdminOrders,
  loadAdminPosts,
  loadAdminReviews,
  loadStoreSettings,
  type AdminOrder,
  type AdminOrderStatus,
  type AdminPost,
  type AdminReviewStatus,
  type StoreSettings,
} from './adminData'
import { detectNavigatorLocale, getLocaleOption, useI18n, type Locale } from './i18n'
import { getAppPathname, getBrowserPath, getCheckoutPath, getCollectionPath, getImportedProductPath, getPostPath, getPostsPath, getProductPath, parseRoute } from './router'
import type { AuthSession } from './authSession'
import { loadServerAccount, logoutServerAccount } from './accountApi'
import { clearCustomerProfile, saveCustomerProfile } from './customerProfile'
import { loadImportedProducts, replaceImportedProducts } from './importedProducts'
import {
  bootstrapStoreData,
  addServerCartItems,
  createServerPurchaseRequest,
  createServerOrder,
  deleteServerPost,
  deleteServerProduct,
  deleteServerReview,
  loadAdminSnapshot,
  loadAccountActivity,
  loadStorefrontSnapshot,
  updateServerOrderStatus,
  updateServerReviewStatus,
  updateServerSettings,
  requestServerRestock,
  setServerWishlist,
  upsertServerPost,
  upsertServerProduct,
  type AdminSnapshot,
  type AccountActivity,
  type CartInput,
  type StorefrontSnapshot,
} from './storeApi'

const LOCALE_SUGGESTION_HANDLED_KEY = 'toyou-locale-suggestion-handled'
const EMPTY_ACCOUNT_ACTIVITY: AccountActivity = { cartCount: 0, wishlistProductIds: [], restockProductIds: [] }

const COUNTRY_LOCALE_GROUPS: Array<{ locale: Locale; countries: string[] }> = [
  { locale: 'ko', countries: ['KR'] },
  { locale: 'ja', countries: ['JP'] },
  { locale: 'zh', countries: ['CN', 'HK', 'TW', 'MO'] },
  {
    locale: 'es',
    countries: ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'UY', 'PY', 'BO', 'CR', 'PA', 'DO', 'GT', 'SV', 'HN', 'NI', 'PR'],
  },
  { locale: 'fr', countries: ['FR', 'BE', 'CH', 'LU', 'MC', 'CA', 'CI', 'CM', 'SN', 'HT', 'MG'] },
]

function resolveSuggestedLocale(countryCode?: string | null) {
  const normalizedCountry = String(countryCode ?? '').trim().toUpperCase()

  if (!normalizedCountry) {
    return null
  }

  const matchedGroup = COUNTRY_LOCALE_GROUPS.find((group) => group.countries.includes(normalizedCountry))

  if (matchedGroup) {
    return matchedGroup.locale
  }

  return 'en'
}

export default function App() {
  const { hasLocalePreference, setLocale } = useI18n()
  const [route, setRoute] = useState(() => parseRoute(getAppPathname(window.location.pathname)))
  const [catalog, setCatalog] = useState(loadCatalog)
  const [posts, setPosts] = useState(loadAdminPosts)
  const [orders, setOrders] = useState(loadAdminOrders)
  const [reviews, setReviews] = useState(loadAdminReviews)
  const [storeSettings, setStoreSettings] = useState(loadStoreSettings)
  const [authSession, setAuthSession] = useState<AuthSession | null>(null)
  const [accountActivity, setAccountActivity] = useState<AccountActivity>(EMPTY_ACCOUNT_ACTIVITY)
  const [localeSuggestion, setLocaleSuggestion] = useState<{ country?: string; locale: Locale } | null>(null)
  const suggestionCheckedRef = useRef(false)

  useEffect(() => {
    function handlePopState() {
      setRoute(parseRoute(getAppPathname(window.location.pathname)))
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function initializeBackend() {
      try {
        const account = await loadServerAccount()
        await bootstrapStoreData({
          products: loadCatalog(),
          posts: loadAdminPosts(),
          orders: loadAdminOrders(),
          reviews: loadAdminReviews(),
          settings: loadStoreSettings(),
          importedProducts: loadImportedProducts(),
        })
        const snapshot = account?.session.role === 'admin'
          ? await loadAdminSnapshot()
          : await loadStorefrontSnapshot()

        if (!active) return
        applyStoreSnapshot(snapshot)

        if (account) {
          saveCustomerProfile(account.profile)
          setAuthSession(account.session)
          setAccountActivity(await loadAccountActivity())
        } else {
          clearCustomerProfile()
          setAuthSession(null)
          setAccountActivity(EMPTY_ACCOUNT_ACTIVITY)
        }
      } catch {
        if (active) setAuthSession(null)
      }
    }

    void initializeBackend()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (suggestionCheckedRef.current) {
      return
    }

    suggestionCheckedRef.current = true

    if (typeof window === 'undefined') {
      return
    }

    if (hasLocalePreference || window.localStorage.getItem(LOCALE_SUGGESTION_HANDLED_KEY) === '1') {
      return
    }

    const controller = new AbortController()

    async function loadLocaleSuggestion() {
      let timeoutId: number | undefined

      try {
        timeoutId = window.setTimeout(() => controller.abort(), 2600)
        const response = await fetch('https://ipwho.is/', {
          signal: controller.signal,
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Failed to resolve country.')
        }

        const payload = (await response.json()) as {
          success?: boolean
          country?: string
          country_code?: string
        }

        const nextLocale = resolveSuggestedLocale(payload.country_code)

        if (!payload.success || !nextLocale || nextLocale === 'ko') {
          return
        }

        setLocaleSuggestion({ country: payload.country, locale: nextLocale })
      } catch {
        const fallbackLocale = detectNavigatorLocale(window.navigator.language)

        if (fallbackLocale !== 'ko') {
          setLocaleSuggestion({ locale: fallbackLocale })
        }
      } finally {
        if (timeoutId) {
          window.clearTimeout(timeoutId)
        }
      }
    }

    void loadLocaleSuggestion()

    return () => {
      controller.abort()
    }
  }, [hasLocalePreference])

  function navigate(pathname: string) {
    const nextUrl = new URL(getBrowserPath(pathname), window.location.origin)
    const currentPath = `${window.location.pathname}${window.location.search}`
    const nextPath = `${nextUrl.pathname}${nextUrl.search}`

    if (currentPath !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }

    setRoute(parseRoute(getAppPathname(nextUrl.pathname)))
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }

  function openProduct(productId: string) {
    navigate(getProductPath(productId))
  }

  function openImportedProduct(productId: string) {
    navigate(getImportedProductPath(productId))
  }

  function openCheckout(productId: string, quantity: number, option: string) {
    navigate(getCheckoutPath(productId, quantity, option))
  }

  function applyStoreSnapshot(snapshot: StorefrontSnapshot | AdminSnapshot) {
    setCatalog(snapshot.products)
    setPosts(snapshot.posts)
    setReviews(snapshot.reviews)
    setStoreSettings(snapshot.settings)
    replaceImportedProducts(snapshot.importedProducts)
    setOrders('orders' in snapshot ? snapshot.orders : [])
  }

  async function refreshStoreData(role: AuthSession['role'] = authSession?.role ?? 'customer') {
    const snapshot = role === 'admin' ? await loadAdminSnapshot() : await loadStorefrontSnapshot()
    applyStoreSnapshot(snapshot)
  }

  function completeAuth(session: AuthSession) {
    setAuthSession(session)
    void refreshStoreData(session.role).catch(() => undefined)
    void loadAccountActivity().then(setAccountActivity).catch(() => setAccountActivity(EMPTY_ACCOUNT_ACTIVITY))
  }

  async function logout() {
    setAuthSession(null)
    setAccountActivity(EMPTY_ACCOUNT_ACTIVITY)
    clearCustomerProfile()

    try {
      await logoutServerAccount()
    } catch {
      // The local session is still cleared when the server is temporarily unavailable.
    }
    void refreshStoreData('customer').catch(() => undefined)
  }

  function updateAuthProfile(session: AuthSession) {
    setAuthSession(session)
  }

  async function addItemsToCart(items: CartInput[]) {
    const activity = await addServerCartItems(items)
    setAccountActivity(activity)
  }

  async function toggleWishlist(productId: string, liked: boolean) {
    const activity = await setServerWishlist(productId, liked)
    setAccountActivity(activity)
  }

  async function requestRestock(productId: string) {
    const activity = await requestServerRestock(productId)
    setAccountActivity(activity)
  }

  async function submitPurchaseRequest(input: { productId: string; option: string; note: string; estimatedTotal: number }) {
    return createServerPurchaseRequest(input)
  }

  async function saveManagedProduct(product: CatalogProduct) {
    try {
      const savedProduct = await upsertServerProduct(product)
      setCatalog((current) => {
      const exists = current.some((item) => item.id === savedProduct.id)
      return exists
        ? current.map((item) => item.id === savedProduct.id ? savedProduct : item)
        : [savedProduct, ...current]
      })
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '상품을 저장하지 못했습니다.')
    }
  }

  async function deleteManagedProduct(productId: string) {
    try {
      await deleteServerProduct(productId)
      setCatalog((current) => current.filter((product) => product.id !== productId))
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '상품을 삭제하지 못했습니다.')
    }
  }

  async function saveManagedPost(post: AdminPost) {
    try {
      const savedPost = await upsertServerPost(post)
      setPosts((current) => current.some((item) => item.id === savedPost.id)
        ? current.map((item) => item.id === savedPost.id ? savedPost : item)
        : [savedPost, ...current])
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '게시글을 저장하지 못했습니다.')
    }
  }

  async function deleteManagedPost(postId: string) {
    try {
      await deleteServerPost(postId)
      setPosts((current) => current.filter((post) => post.id !== postId))
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '게시글을 삭제하지 못했습니다.')
    }
  }

  async function createOrder(order: AdminOrder) {
    const result = await createServerOrder(order)
    setOrders((current) => [result.order, ...current])
    setCatalog((current) => current.map((product) => product.id === result.product.id ? result.product : product))
    return result.order
  }

  async function updateOrderStatus(orderId: string, status: AdminOrderStatus) {
    try {
      const result = await updateServerOrderStatus(orderId, status)
      setOrders((current) => current.map((item) => item.id === result.order.id ? result.order : item))
      if (result.product) {
        const updatedProduct = result.product
        setCatalog((current) => current.map((item) => item.id === updatedProduct.id ? updatedProduct : item))
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '주문 상태를 변경하지 못했습니다.')
    }
  }

  async function updateReviewStatus(reviewId: string, status: AdminReviewStatus) {
    try {
      const review = await updateServerReviewStatus(reviewId, status)
      setReviews((current) => current.map((item) => item.id === review.id ? review : item))
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '리뷰 상태를 변경하지 못했습니다.')
    }
  }

  async function deleteReview(reviewId: string) {
    try {
      await deleteServerReview(reviewId)
      setReviews((current) => current.filter((review) => review.id !== reviewId))
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '리뷰를 삭제하지 못했습니다.')
    }
  }

  async function updateStoreSettings(settings: StoreSettings) {
    try {
      setStoreSettings(await updateServerSettings(settings))
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '스토어 설정을 저장하지 못했습니다.')
    }
  }

  function handleDismissLocaleSuggestion() {
    window.localStorage.setItem(LOCALE_SUGGESTION_HANDLED_KEY, '1')
    setLocaleSuggestion(null)
  }

  function handleAcceptLocaleSuggestion() {
    if (!localeSuggestion) {
      return
    }

    setLocale(localeSuggestion.locale)
    window.localStorage.setItem(LOCALE_SUGGESTION_HANDLED_KEY, '1')
    setLocaleSuggestion(null)
  }

  const pageShellClassName =
    route.page === 'login' || route.page === 'signup' ? 'page-shell page-shell--auth' : 'page-shell'

  return (
    <div className={pageShellClassName}>
      <div className="ambient ambient--pink" />
      <div className="ambient ambient--blue" />

      <AnimatePresence>
        {localeSuggestion ? (
          <LocaleSuggestionPrompt
            detectedCountry={localeSuggestion.country}
            suggestedOption={getLocaleOption(localeSuggestion.locale)}
            onDismiss={handleDismissLocaleSuggestion}
            onAccept={handleAcceptLocaleSuggestion}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={route.page + (route.page === 'product' || route.page === 'import-product' || route.page === 'checkout' ? route.productId : route.page === 'collection' ? route.season : '')}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="page-transition-wrapper"
        >
          {route.page === 'checkout' ? (
            <CheckoutPage
              product={catalog.find((product) => product.id === route.productId)}
              authSession={authSession}
              onGoBack={() => navigate(getProductPath(route.productId))}
              onGoHome={() => navigate('/')}
              onCreateOrder={createOrder}
              onProfileUpdated={updateAuthProfile}
            />
          ) : route.page === 'profile' ? (
            <ProfilePage
              authSession={authSession}
              onGoHome={() => navigate('/')}
              onGoToLogin={() => navigate('/login')}
              onSave={updateAuthProfile}
              onLogout={logout}
            />
          ) : route.page === 'posts' || route.page === 'post' ? (
            <PostsPage
              posts={posts}
              postId={route.page === 'post' ? route.postId : undefined}
              authSession={authSession}
              onGoHome={() => navigate('/')}
              onGoToLogin={() => navigate('/login')}
              onGoToSignup={() => navigate('/signup')}
              onLogout={logout}
              onGoToProfile={() => navigate('/account/profile')}
              onGoPosts={() => navigate(getPostsPath())}
              onOpenPost={(postId) => navigate(getPostPath(postId))}
            />
          ) : route.page === 'collection' ? (
            <SeasonalCollectionPage
              season={route.season}
              products={catalog}
              onGoHome={() => navigate('/')}
              onOpenCollection={(season) => navigate(getCollectionPath(season))}
              onOpenProduct={openProduct}
              onCheckout={openCheckout}
            />
          ) : route.page === 'import-product' ? (
            <ProductDetailPage
              productId={route.productId}
              authSession={authSession}
              onGoHome={() => navigate('/import')}
              onGoToLogin={() => navigate('/login')}
              onOpenProduct={openImportedProduct}
              onSubmitPurchaseRequest={submitPurchaseRequest}
            />
          ) : route.page === 'product' ? (
            <CatalogProductPage
              product={catalog.find((product) => product.id === route.productId)}
              products={catalog}
              reviews={reviews}
              cartCount={accountActivity.cartCount}
              wishlistProductIds={accountActivity.wishlistProductIds}
              restockProductIds={accountActivity.restockProductIds}
              onGoHome={() => navigate('/')}
              onGoToLogin={() => navigate('/login')}
              onGoToSignup={() => navigate('/signup')}
              authSession={authSession}
              onLogout={logout}
              onGoToProfile={() => navigate('/account/profile')}
              onOpenPosts={() => navigate(getPostsPath())}
              onOpenProduct={openProduct}
              onCheckout={openCheckout}
              onAddToCart={addItemsToCart}
              onToggleWishlist={toggleWishlist}
              onRequestRestock={requestRestock}
            />
          ) : route.page === 'admin-products' ? (
            authSession?.role === 'admin' ? <CatalogAdminPage
              products={catalog}
              posts={posts}
              orders={orders}
              reviews={reviews}
              settings={storeSettings}
              onSave={saveManagedProduct}
              onDelete={deleteManagedProduct}
              onSavePost={saveManagedPost}
              onDeletePost={deleteManagedPost}
              onUpdateOrderStatus={updateOrderStatus}
              onUpdateReviewStatus={updateReviewStatus}
              onDeleteReview={deleteReview}
              onSaveSettings={updateStoreSettings}
              onGoStore={() => navigate('/')}
              onOpenProduct={openProduct}
            /> : <AuthPage
              mode="login"
              onGoHome={() => navigate('/')}
              onSwitchMode={() => navigate('/signup')}
              onAuthComplete={(session) => {
                completeAuth(session)
                if (session.role === 'admin') navigate('/admin/products')
              }}
            />
          ) : route.page === 'login' ? (
            <AuthPage mode="login" onGoHome={() => navigate('/')} onSwitchMode={() => navigate('/signup')} onAuthComplete={completeAuth} />
          ) : route.page === 'signup' ? (
            <AuthPage mode="signup" onGoHome={() => navigate('/')} onSwitchMode={() => navigate('/login')} onAuthComplete={completeAuth} />
          ) : route.page === 'import' ? (
            <HomePage
              onOpenProduct={openImportedProduct}
              onGoToStore={() => navigate('/')}
              onGoToLogin={() => navigate('/login')}
              onGoToSignup={() => navigate('/signup')}
            />
          ) : (
            <StorePage
              products={catalog}
              posts={posts.filter((post) => post.status === 'published')}
              settings={storeSettings}
              authSession={authSession}
              cartCount={accountActivity.cartCount}
              onOpenProduct={openProduct}
              onGoToLogin={() => navigate('/login')}
              onGoToSignup={() => navigate('/signup')}
              onLogout={logout}
              onGoToProfile={() => navigate('/account/profile')}
              onOpenPosts={() => navigate(getPostsPath())}
              onOpenPost={(postId) => navigate(getPostPath(postId))}
              onGoToAdmin={() => navigate('/admin/products')}
              onOpenCollection={(season) => navigate(getCollectionPath(season))}
              onCheckout={openCheckout}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
