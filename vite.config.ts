import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// base './' + singlefile：构建产物可整包离线分发给亲友
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  // host: true → 监听 0.0.0.0，同网段平板可用本机局域网 IP 访问
  server: { host: true },
  preview: { host: true },
  build: {
    chunkSizeWarningLimit: 4000,
  },
});
