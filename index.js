const http = require("http");
const https = require("https");
const fs = require("fs");

// CONFIGURATION
const prefix = "/web";
const blockedHostnames = ["https://sevenworks.eu.org/bad-site"];
const ssl = false;
const port = 6969;
const index_file = "index.html";
// END OF CONFIGURATION

const proxy = new (require("./lib/index"))(prefix, {
  blacklist: blockedHostnames,
});

const atob = (str) => Buffer.from(str, "base64").toString("utf-8");

const app = (req, res) => {
  if (req.url.startsWith(prefix)) {
    proxy.http(req, res);
    return;
  }

  req.pathname = req.url.split("#")[0].split("?")[0];
  req.query = {};
  req.url
    .split("#")[0]
    .split("?")
    .slice(1)
    .join("?")
    .split("&")
    .forEach((query) => {
      const [key, ...val] = query.split("=");
      req.query[key] = val.join("=");
    });

  if (
    req.query.url &&
    (req.pathname === "/prox" ||
      req.pathname === "/prox/" ||
      req.pathname === "/session" ||
      req.pathname === "/session/")
  ) {
    let url = atob(req.query.url);

    if (url.startsWith("https://") || url.startsWith("http://")) {
      // url is fine
    } else if (url.startsWith("//")) {
      url = (ssl ? "https:" : "http:") + url;
    } else {
      url = (ssl ? "https://" : "http://") + url;
    }

    const proxifiedPath = prefix + proxy.proxifyRequestURL(url);

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Redirecting...</title>
        <script>
          const url = ${JSON.stringify(proxifiedPath)};
          window.history.replaceState({}, "", "/session");
          window.location.replace(url);
        </script>
      </head>
      <body>
        <noscript>Please enable JavaScript</noscript>
      </body>
      </html>
    `);
    return;
  }

  const publicPath = __dirname + "/public" + req.pathname;

  const error = () => {
    res.statusCode = 404;
    res.end(
      fs
        .readFileSync(__dirname + "/lib/error.html", "utf-8")
        .replace("%ERR%", `Cannot ${req.method} ${req.pathname}`)
    );
  };

  fs.lstat(publicPath, (err, stats) => {
    if (err) return error();

    if (stats.isDirectory()) {
      fs.existsSync(publicPath + index_file)
        ? fs.createReadStream(publicPath + index_file).pipe(res)
        : error();
    } else if (stats.isFile()) {
      !publicPath.endsWith("/")
        ? fs.createReadStream(publicPath).pipe(res)
        : error();
    } else {
      error();
    }
  });
};

const server = ssl
  ? https.createServer(
      {
        key: fs.readFileSync("./ssl/default.key"),
        cert: fs.readFileSync("./ssl/default.crt"),
      },
      app
    )
  : http.createServer(app);

proxy.ws(server);
server.listen(process.env.PORT || port, () =>
  console.log(`${ssl ? "https://" : "http://"}0.0.0.0:${port}`)
);
