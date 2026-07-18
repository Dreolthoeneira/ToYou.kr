import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import type { AdminPost, AdminPostCategory } from '../adminData'
import type { AuthSession } from '../authSession'
import { SITE_BRAND } from '../siteBrand'

interface PostsPageProps {
  posts: AdminPost[]
  postId?: string
  authSession: AuthSession | null
  onGoHome: () => void
  onGoToLogin: () => void
  onGoToSignup: () => void
  onLogout: () => void
  onGoToProfile: () => void
  onOpenCart: () => void
  onGoPosts: () => void
  onOpenPost: (postId: string) => void
}

type PostFilter = 'all' | AdminPostCategory

const categoryLabels: Record<AdminPostCategory, string> = {
  notice: 'NOTICE',
  journal: 'JOURNAL',
  event: 'EVENT',
}

const categoryLabelsKo: Record<AdminPostCategory, string> = {
  notice: '공지',
  journal: '저널',
  event: '이벤트',
}

function formatPostDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value))
}

function PostCover({ post, featured = false }: { post: AdminPost; featured?: boolean }) {
  return (
    <div className={`community-cover community-cover--${post.category}${featured ? ' is-featured' : ''}`}>
      {post.coverImage ? <img src={post.coverImage} alt="" /> : (
        <div className="community-cover__art" aria-hidden="true">
          <span>TO YOU</span>
          <strong>{post.category === 'journal' ? 'J' : post.category === 'event' ? 'E' : 'N'}</strong>
          <i />
        </div>
      )}
      <small>{categoryLabels[post.category]}</small>
    </div>
  )
}

function CommunityHeader({ authSession, onGoHome, onGoPosts, onGoToLogin, onGoToSignup, onLogout, onGoToProfile, onOpenCart }: Pick<PostsPageProps, 'authSession' | 'onGoHome' | 'onGoPosts' | 'onGoToLogin' | 'onGoToSignup' | 'onLogout' | 'onGoToProfile' | 'onOpenCart'>) {
  return (
    <>
      <div className="community-announcement"><span>TO YOU STORIES</span><span>새로운 취향과 스토어 소식을 전합니다</span><span>매주 새로운 이야기 업데이트</span></div>
      <header className="community-header">
        <button type="button" className="community-header__brand" onClick={onGoHome}>{SITE_BRAND.toUpperCase()}</button>
        <nav aria-label="커뮤니티 메뉴"><button type="button" onClick={onGoHome}>SHOP</button><button type="button" className="is-active" onClick={onGoPosts}>COMMUNITY</button></nav>
        <div className="community-header__account">
          {authSession ? <><button type="button" className="community-header__member" onClick={onGoToProfile} aria-label={`${authSession.displayName} 회원정보 수정`}><i />{authSession.displayName}님</button><button type="button" onClick={onLogout}>로그아웃</button></> : <><button type="button" onClick={onGoToLogin}>로그인</button><button type="button" onClick={onGoToSignup}>회원가입</button></>}
          <button type="button" onClick={onOpenCart} aria-label="장바구니 열기"><ShoppingBag size={17} /></button>
        </div>
      </header>
    </>
  )
}

export function PostsPage({ posts, postId, authSession, onGoHome, onGoToLogin, onGoToSignup, onLogout, onGoToProfile, onOpenCart, onGoPosts, onOpenPost }: PostsPageProps) {
  const [filter, setFilter] = useState<PostFilter>('all')
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(6)
  const publishedPosts = useMemo(
    () => posts.filter((post) => post.status === 'published').sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.updatedAt.localeCompare(left.updatedAt)),
    [posts],
  )
  const selectedPost = postId ? publishedPosts.find((post) => post.id === postId) : undefined

  if (postId) {
    if (!selectedPost) {
      return (
        <div className="community-page">
          <CommunityHeader authSession={authSession} onGoHome={onGoHome} onGoPosts={onGoPosts} onGoToLogin={onGoToLogin} onGoToSignup={onGoToSignup} onLogout={onLogout} onGoToProfile={onGoToProfile} onOpenCart={onOpenCart} />
          <main className="community-empty"><span className="eyebrow">STORY NOT FOUND</span><h1>글을 찾을 수 없어요.</h1><button type="button" onClick={onGoPosts}>목록으로 돌아가기</button></main>
        </div>
      )
    }

    const relatedPosts = publishedPosts.filter((post) => post.id !== selectedPost.id).slice(0, 3)
    const contentParagraphs = selectedPost.content.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean)

    return (
      <div className="community-page">
        <CommunityHeader authSession={authSession} onGoHome={onGoHome} onGoPosts={onGoPosts} onGoToLogin={onGoToLogin} onGoToSignup={onGoToSignup} onLogout={onLogout} onGoToProfile={onGoToProfile} onOpenCart={onOpenCart} />
        <main className="community-detail">
          <button type="button" className="community-detail__back" onClick={onGoPosts}><ArrowLeft size={16} /> 전체 이야기</button>
          <header className="community-detail__heading">
            <div><span>{categoryLabelsKo[selectedPost.category]}</span><time>{formatPostDate(selectedPost.updatedAt)}</time></div>
            <h1>{selectedPost.title}</h1>
            <p>{selectedPost.excerpt}</p>
            <div className="community-detail__author"><span>TY</span><div><strong>TO YOU EDITORIAL</strong><small>Everyday objects, thoughtfully selected.</small></div></div>
          </header>
          <PostCover post={selectedPost} featured />
          <article className="community-detail__body">
            <span className="community-detail__index">STORY · {categoryLabels[selectedPost.category]}</span>
            {contentParagraphs.map((paragraph, index) => <p key={`${selectedPost.id}-${index}`}>{paragraph}</p>)}
            <blockquote>매일 가까이 두고 싶은 물건과 그 뒤의 이야기를 천천히 소개합니다.</blockquote>
          </article>
          <footer className="community-detail__footer"><span>TO YOU COMMUNITY</span><button type="button" onClick={onGoPosts}>다른 이야기 보기 <ArrowRight size={15} /></button></footer>
          {relatedPosts.length ? <section className="community-related"><div><span>MORE STORIES</span><h2>이어 읽기</h2></div><div>{relatedPosts.map((post) => <button type="button" key={post.id} onClick={() => onOpenPost(post.id)}><PostCover post={post} /><small>{categoryLabelsKo[post.category]} · {formatPostDate(post.updatedAt)}</small><strong>{post.title}</strong></button>)}</div></section> : null}
        </main>
      </div>
    )
  }

  const normalizedQuery = query.trim().toLowerCase()
  const filteredPosts = publishedPosts.filter((post) => {
    const matchesFilter = filter === 'all' || post.category === filter
    const matchesQuery = !normalizedQuery || `${post.title} ${post.excerpt} ${post.content}`.toLowerCase().includes(normalizedQuery)
    return matchesFilter && matchesQuery
  })
  const featuredPost = filteredPosts[0]
  const listPosts = filteredPosts.slice(1, visibleCount + 1)

  return (
    <div className="community-page">
      <CommunityHeader authSession={authSession} onGoHome={onGoHome} onGoPosts={onGoPosts} onGoToLogin={onGoToLogin} onGoToSignup={onGoToSignup} onLogout={onLogout} onGoToProfile={onGoToProfile} onOpenCart={onOpenCart} />
      <main className="community-main">
        <section className="community-intro">
          <span className="eyebrow">JOURNAL &amp; NOTICE</span>
          <h1>취향이 머무는<br />새로운 이야기</h1>
          <p>상품 너머의 영감과 스토어의 새로운 소식을 전합니다.</p>
        </section>

        <div className="community-toolbar">
          <nav aria-label="게시글 카테고리">{([['all', 'ALL'], ['journal', 'JOURNAL'], ['notice', 'NOTICE'], ['event', 'EVENT']] as const).map(([value, label]) => <button type="button" key={value} className={filter === value ? 'is-active' : ''} onClick={() => { setFilter(value); setVisibleCount(6) }}>{label}</button>)}</nav>
          <label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이야기 검색" aria-label="이야기 검색" />{query ? <button type="button" onClick={() => setQuery('')} aria-label="검색어 지우기"><X size={15} /></button> : null}</label>
        </div>

        {featuredPost ? (
          <>
            <section className="community-featured">
              <div className="community-featured__copy"><div><span>{categoryLabelsKo[featuredPost.category]}</span><time><CalendarDays size={14} /> {formatPostDate(featuredPost.updatedAt)}</time></div><h2>{featuredPost.title}</h2><p>{featuredPost.excerpt}</p><button type="button" onClick={() => onOpenPost(featuredPost.id)}>전체 글 읽기 <ArrowRight size={16} /></button></div>
              <button type="button" className="community-featured__cover" onClick={() => onOpenPost(featuredPost.id)} aria-label={`${featuredPost.title} 읽기`}><PostCover post={featuredPost} featured /></button>
            </section>

            <section className="community-feed"><div className="community-feed__heading"><span>LATEST STORIES</span><strong>{String(filteredPosts.length).padStart(2, '0')} ARTICLES</strong></div><div className="community-feed__grid">{listPosts.map((post) => <button type="button" className="community-card" key={post.id} onClick={() => onOpenPost(post.id)}><PostCover post={post} /><span>{categoryLabelsKo[post.category]} · {formatPostDate(post.updatedAt)}</span><h3>{post.title}</h3><p>{post.excerpt}</p><em>READ STORY <ArrowRight size={13} /></em></button>)}</div>{listPosts.length < filteredPosts.length - 1 ? <button type="button" className="community-load-more" onClick={() => setVisibleCount((count) => count + 6)}>더 보기 <span>{listPosts.length} / {filteredPosts.length - 1}</span></button> : null}</section>
          </>
        ) : <section className="community-no-results"><Search size={24} /><h2>검색 결과가 없어요.</h2><p>다른 카테고리나 검색어로 다시 찾아보세요.</p></section>}
      </main>
    </div>
  )
}
