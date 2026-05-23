import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import CartDrawer from "./components/CartDrawer";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Specials from "./pages/Specials";
import Order from "./pages/Order";
import OrderSuccess from "./pages/OrderSuccess";
import AdminOrders from "./pages/AdminOrders";
import AdminDoorDashTest from "./pages/AdminDoorDashTest";
import AdminSettings from "./pages/AdminSettings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/menu" component={Menu} />
      <Route path="/specials" component={Specials} />
      <Route path="/order" component={Order} />
      <Route path="/order-success" component={OrderSuccess} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/doordash-test" component={AdminDoorDashTest} />
      <Route path="/admin/settings" component={AdminSettings} />
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
          </TooltipProvider>
        </CartProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
