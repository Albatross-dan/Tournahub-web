/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare namespace NodeJS {
  interface ProcessEnv {
    APP_VERSION?: string;
  }
}
