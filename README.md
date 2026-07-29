# Conversation Web App Template
This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Config App
Create a file named `.env.local` in the current directory and copy the contents from `.env.example`:
```bash
# APP ID: This is the unique identifier for your app. You can find it in the app's detail page URL. 
# For example, in the URL `https://cloud.dify.ai/app/xxx/workflow`, the value `xxx` is your APP ID.
NEXT_PUBLIC_APP_ID=

# Server-only app API key: This authenticates server requests to Dify.
# You can generate it on the app's "API Access" page by clicking the "API Key" button in the top-right corner.
DIFY_APP_KEY=

# Server-only Dify API base URL.
DIFY_API_URL=
```

`DIFY_APP_KEY` must remain server-side. Browser requests use this application's `/api` routes and must never send a Dify `Authorization` header. For deployment continuity, the server temporarily accepts `NEXT_PUBLIC_APP_KEY` as a fallback when `DIFY_APP_KEY` is not set; migrate deployments to `DIFY_APP_KEY`. The server also accepts `NEXT_PUBLIC_API_URL` as a temporary fallback for `DIFY_API_URL`.

Config more in `config/index.ts` file:   
```js
export const APP_INFO: AppInfo = {
  title: 'Chat APP',
  description: '',
  copyright: '',
  privacy_policy: '',
  default_language: 'zh-Hans'
}

export const isShowPrompt = true
export const promptTemplate = ''
```

## Getting Started
First, install dependencies:
```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Using Docker

```
docker build . -t <DOCKER_HUB_REPO>/webapp-conversation:latest
# now you can access it in port 3000
docker run -p 3000:3000 <DOCKER_HUB_REPO>/webapp-conversation:latest
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

> ⚠️ If you are using [Vercel Hobby](https://vercel.com/pricing), your message will be truncated due to the limitation of vercel.


The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
