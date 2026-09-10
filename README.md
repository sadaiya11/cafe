# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:


## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Payment demo

Run `npm run dev`, add a product, and choose **Pay online with Razorpay**. If the payment API is not connected, development mode opens the in-app demo payment sheet. Use any card number with expiry and CVV, or any UPI ID, to see the thank-you page. Use **Simulate failed payment** to see the failure page while keeping the cart.

The demo does not charge money. For a real Razorpay test payment, configure `VITE_RAZORPAY_KEY_ID` with a public `rzp_test_...` key and provide these backend endpoints:

- `POST /api/payments/create-order`: create a Razorpay order using the secret key and return `{ id, amount, currency }`.
- `POST /api/payments/verify`: verify `razorpay_signature` on the server using HMAC SHA256 and return a successful response only after verification.

Never expose `RAZORPAY_KEY_SECRET` in frontend code. Keep the cart and customer payload validation on the server before creating an order.

Copy `.env.example` to `.env` for local configuration.
