import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { stripeRouter } from "./stripe";
import { authorizeNetRouter } from "./authorizenet";
import { uberDirectRouter } from "./uberdirect";
import { cloverRouter } from "./clover";
import { couponRouter } from "./coupon";
import { doordashRouter } from "./doordash";
import { settingsRouter } from "./settings";
import { cateringRouter } from "./catering";
import { ordersRouter } from "./orders";
import { orderRefundsRouter } from "./orderRefunds";
import { cloverCheckoutRouter } from "./cloverCheckout";

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
  authorizenet: authorizeNetRouter,
  uber: uberDirectRouter,
  clover: cloverRouter,
  coupon: couponRouter,
  doordash: doordashRouter,
  settings: settingsRouter,
  catering: cateringRouter,
  orders: ordersRouter,
  orderRefunds: orderRefundsRouter,
  cloverCheckout: cloverCheckoutRouter,
});

export type AppRouter = typeof appRouter;
