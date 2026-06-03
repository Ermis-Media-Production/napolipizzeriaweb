import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import CartDrawer from "./components/CartDrawer";
import FloatingCart from "./components/FloatingCart";
import EvaChat from "./components/EvaChat";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Specials from "./pages/Specials";
import Order from "./pages/Order";
import OrderSuccess from "./pages/OrderSuccess";
import AdminOrders from "./pages/AdminOrders";
import AdminDoorDashTest from "./pages/AdminDoorDashTest";
import AdminSettings from "./pages/AdminSettings";
import AdminDashboard from "./pages/AdminDashboard";
import AdminMenuManager from "./pages/AdminMenuManager";
import AdminModifierManager from "./pages/AdminModifierManager";
import AdminAiCosts from "@/pages/AdminAiCosts";
import AdminItemsDashboard from "@/pages/AdminItemsDashboard";
import Catering from "./pages/Catering";
import Terms from "./pages/Terms";
import Reservations from "./pages/Reservations";
import MyOrder from "./pages/MyOrder";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/menu" component={Menu} />
      <Route path="/specials" component={Specials} />
      <Route path="/catering" component={Catering} />
      <Route path="/reservations" component={Reservations} />
      <Route path="/order" component={Order} />
      <Route path="/terms" component={Terms} />
      <Route path="/order-success" component={OrderSuccess} />
      <Route path="/my-order/:orderRef" component={MyOrder} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/menu" component={AdminMenuManager} />
      <Route path="/admin/modifiers" component={AdminModifierManager} />
      <Route path="/admin/doordash-test" component={AdminDoorDashTest} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/ai-costs" component={AdminAiCosts} />
      <Route path="/admin/items" component={AdminItemsDashboard} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <CartProvider>
          <TooltipProvider>
            <Toaster richColors position="top-right" />
            <Router />
            <CartDrawer />
            <FloatingCart />
            <EvaChat />
          </TooltipProvider>
        </CartProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
