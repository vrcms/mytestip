// Railway 反向代理：把 /ai-api/* 转发到 https://opencode.ai/*
// 上游看到的是 Railway 的出口 IP，不带用户原始 IP。

const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.PORT || 3000;
const UPSTREAM = "https://opencode.ai";
const VERSION = "0.1.20261020-1";

// 根路径：版本号，确认跑的是哪版
app.get("/", (req, res) => {
  res.type("text/plain").send("railway-proxy " + VERSION + "\n");
});

// 看出口 IP
app.get("/my-ip", async (req, res) => {
  try {
    const r = await fetch("https://api.ipify.org");
    const ip = await r.text();
    res.type("text/plain").send("railway egress ip: " + ip + "\n");
  } catch (e) {
    res.status(502).type("text/plain").send("ip check failed: " + e.message + "\n");
  }
});

// 反向代理 /ai-api/* -> https://opencode.ai/*
app.use(
  "/ai-api",
  createProxyMiddleware({
    target: UPSTREAM,
    changeOrigin: true,
    pathRewrite: { "^/ai-api": "" },
    // 删掉透传用户 IP 的头，上游只看到 Railway 出口 IP
    onProxyReq: (proxyReq) => {
      proxyReq.removeHeader("x-forwarded-for");
      proxyReq.removeHeader("x-real-ip");
      proxyReq.removeHeader("forwarded");
      proxyReq.removeHeader("true-client-ip");
      proxyReq.removeHeader("cf-connecting-ip");
    },
    onError: (err, req, res) => {
      res.status(502).type("text/plain").send("Upstream fetch failed: " + err.message + "\n");
    },
  })
);

app.listen(PORT, () => {
  console.log("railway-proxy " + VERSION + " listening on " + PORT);
});
