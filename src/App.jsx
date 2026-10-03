import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { UIProvider } from './contexts/UIContext'
import { CartProvider } from './contexts/CartContext'
import { WishlistProvider } from './contexts/WishlistContext'

import AdminRoute from './routes/AdminRoute'

import ScrollToTop from './components/ScrollToTop'
import Navbar from './components/Navbar'
import MobileMenu from './components/MobileMenu'
import SearchOverlay from './components/SearchOverlay'
import CartDrawer from './components/CartDrawer'
import MobileNav from './components/MobileNav'
import Footer from './components/Footer'
import Toasts from './components/Toast'
import { QuickViewModal } from './components/ProductCard'

const Home = lazy(() => import('./pages/Home'))
const Shop = lazy(() => import('./pages/Shop'))
const Product = lazy(() => import('./pages/Product'))
const Collections = lazy(() => import('./pages/Collections'))
const Collection = lazy(() => import('./pages/Collection'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const FAQ = lazy(() => import('./pages/FAQ'))
const Wishlist = lazy(() => import('./pages/Wishlist'))
const NotFound = lazy(() => import('./pages/NotFound'))

const AdminLogin = lazy(() => import('./admin/AdminLogin'))

const AdminLayout = lazy(() => import('./admin/AdminLayout'))
const Dashboard = lazy(() => import('./admin/Dashboard'))
const Products = lazy(() => import('./admin/Products'))
const ProductForm = lazy(() => import('./admin/ProductForm'))
const Orders = lazy(() => import('./admin/Orders'))
const OrderDetail = lazy(() => import('./admin/OrderDetail'))
const Customers = lazy(() => import('./admin/Customers'))
const Categories = lazy(() => import('./admin/Categories'))
const AdminCollections = lazy(() => import('./admin/Collections'))
const Coupons = lazy(() => import('./admin/Coupons'))
const Shipping = lazy(() => import('./admin/Shipping'))
const Homepage = lazy(() => import('./admin/Homepage'))
const Settings = lazy(() => import('./admin/Settings'))

function PageLoader() {
  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center">
      <div className="skeleton h-8 w-48" />
    </div>
  )
}

function App() {
  const location = useLocation()
  const isAdminArea = location.pathname.startsWith('/admin')

  return (
    <UIProvider>
      <CartProvider>
        <WishlistProvider>
          <ScrollToTop />
          {!isAdminArea && <Navbar />}
          {!isAdminArea && <MobileMenu />}
          <SearchOverlay />
          <CartDrawer />
          <QuickViewModal />
          {!isAdminArea && <MobileNav />}

          <main id="main">
            <Suspense fallback={<PageLoader />}>
              <Routes>
              {/* Storefront */}
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/product/:slug" element={<Product />} />
              <Route path="/collections" element={<Collections />} />
              <Route path="/collections/:slug" element={<Collection />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-success" element={<OrderSuccess />} />
              <Route path="/order-success/:id" element={<OrderSuccess />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/wishlist" element={<Wishlist />} />

              {/* Admin */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="products/new" element={<ProductForm />} />
                <Route path="products/:id" element={<ProductForm />} />
                <Route path="orders" element={<Orders />} />
                <Route path="orders/:id" element={<OrderDetail />} />
                <Route path="customers" element={<Customers />} />
                <Route path="categories" element={<Categories />} />
                <Route path="collections" element={<AdminCollections />} />
                <Route path="coupons" element={<Coupons />} />
                <Route path="shipping" element={<Shipping />} />
                <Route path="homepage" element={<Homepage />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>

          {!isAdminArea && <Footer />}
          <Toasts />
        </WishlistProvider>
      </CartProvider>
    </UIProvider>
  )
}

export default App