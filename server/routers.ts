import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { stripeRouter } from "./stripe";
import { uberDirectRouter } from "./uberdirect";
import { cloverRouter } from "./clover";
import { couponRouter } from "./coupon";
import { doordashRouter } from "./doordash";
import { settingsRouter } from "./settings";
import { cateringRouter } from "./catering";
import { ordersRouter } from "./orders";
import { orderRefundsRouter } from "./orderRefunds";
import { menuItemsRouter } from "./menuItems";
import { modifiersRouter } from "./modifiers";
import { elavonRouter } from "./elavon";
import { reservationsRouter } from "./reservations";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  stripe: stripeRouter,
  uber: uberDirectRouter,
  clover: cloverRouter,
  coupon: couponRouter,
  doordash: doordashRouter,
  settings: settingsRouter,
  catering: cateringRouter,
  orders: ordersRouter,
  orderRefunds: orderRefundsRouter,
  menuItems: menuItemsRouter,
  modifiers: modifiersRouter,
  elavon: elavonRouter,
  reservations: reservationsRouter,
});

export type AppRouter = typeof appRouter;
