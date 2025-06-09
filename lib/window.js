var alloy = JSON.parse(
  atob(document.currentScript.getAttribute("data-config"))
);
alloy.url = new URL(alloy.url);

var proxify = {
  url: (url, type) => {
    if (!url) return;
    var proxified;
    switch (type) {
      case true:
        proxified =
          atob(
            url
              .replace(alloy.prefix, "")
              .split("_")
              .slice(1)
              .splice(0, 1)
              .join()
          ) + url.split("_").slice(2).join("_");
        break;
      default:
        if (
          url.match(/^(#|about:|data:|blob:|mailto:|javascript:|{|\*)/) ||
          url.startsWith(alloy.prefix) ||
          url.startsWith(window.location.origin + alloy.prefix)
        )
          return url;
        if (
          url.startsWith(window.location.origin + "/") &&
          !url.startsWith(window.location.origin + alloy.prefix)
        )
          url = "/" + url.split("/").splice(3).join("/");
        if (url.startsWith("//")) url = "http:" + url;
        if (url.startsWith("/") && !url.startsWith(alloy.prefix))
          url = alloy.url.origin + url;
        if (url.startsWith("https://") || url.startsWith("http://"))
          url = new URL(url);
        else
          url = new URL(
            alloy.url.href.split("/").slice(0, -1).join("/") + "/" + url
          );
        proxified =
          alloy.prefix +
          "_" +
          btoa(url.href.split("/").splice(0, 3).join("/")) +
          "_" +
          "/" +
          url.href.split("/").splice(3).join("/");
        break;
    }
    return proxified;
  },
};

proxify.url_http = (url) => {
  if (
    url.match(/^(#|about:|data:|blob:|mailto:|javascript:|{|\*)/) ||
    url.startsWith(alloy.prefix) ||
    url.startsWith(window.location.origin + alloy.prefix)
  )
    return url;
  if (
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("//")
  )
    return proxify.url(url);
  else if (alloy.baseURL) {
    if (url.startsWith("/"))
      return proxify.url(alloy.baseURL.split("/").splice(0, 3).join("/") + url);
    else
      return proxify.url(
        alloy.baseURL.split("/").slice(0, -1).join("/") + "/" + url
      );
  } else return proxify.url(url);
};

window.alloyLocation = new Proxy(
  {},
  {
    set(obj, prop, value) {
      if (
        prop == "assign" ||
        prop == "reload" ||
        prop == "replace" ||
        prop == "toString"
      )
        return;
      return (location[prop] = proxify.url(
        alloy.url.href.replace(alloy.url[prop], value)
      ));
    },
    get(obj, prop) {
      if (
        alloy.url.origin == atob("aHR0cHM6Ly9kaXNjb3JkLmNvbQ==") &&
        alloy.url.pathname == "/app"
      )
        return window.location[prop];
      if (
        prop == "assign" ||
        prop == "reload" ||
        prop == "replace" ||
        prop == "toString"
      )
        return {
          assign: (arg) => window.location.assign(proxify.url(arg)),
          replace: (arg) => window.location.replace(proxify.url(arg)),
          reload: () => window.location.reload(),
          toString: () => {
            return alloy.url.href;
          },
        }[prop];
      else return alloy.url[prop];
    },
  }
);

window.document.alloyLocation = window.alloyLocation;

Object.defineProperty(document, "domain", {
  get() {
    return alloy.url.hostname;
  },
  set(value) {
    return value;
  },
});

let originalFetch = window.fetch,
  originalXMLOpen = window.XMLHttpRequest.prototype.open,
  originalOpen = window.open,
  originalPostMessage = window.postMessage,
  originalSendBeacon = window.Navigator.prototype.sendBeacon;

window.fetch = function (url, options) {
  if (url)
    url.replace(location.hostname, alloy.url.hostname),
      (url = proxify.url_http(url));
  return originalFetch.apply(this, arguments);
};
window.XMLHttpRequest.prototype.open = function (
  method,
  url,
  async,
  user,
  password
) {
  if (url)
    url.replace(location.hostname, alloy.url.hostname),
      (url = proxify.url_http(url));
  return originalXMLOpen.apply(this, arguments);
};
window.open = function (url, windowName, windowFeatures) {
  if (url) url = proxify.url(url);
  return originalOpen.apply(this, arguments);
};
window.postMessage = function (msg, origin, transfer) {
  if (origin) origin = location.origin;
  return originalPostMessage.apply(this, arguments);
};
window.Navigator.prototype.sendBeacon = function (url, data) {
  if (url) url = proxify.url(url);
  return originalSendBeacon.apply(this, arguments);
};

window.WebSocket = new Proxy(window.WebSocket, {
  construct(target, args) {
    var protocol;
    if (location.protocol == "https:") protocol = "wss://";
    else protocol = "ws://";
    args[0] =
      protocol +
      location.origin.split("/").splice(2).join("/") +
      alloy.prefix +
      "?ws=" +
      btoa(args[0]) +
      "&origin=" +
      btoa(alloy.url.origin);
    return Reflect.construct(target, args);
  },
});

proxify.elementHTML = (element_array) => {
  element_array.forEach((element) => {
    Object.defineProperty(element.prototype, "innerHTML", {
      set(value) {
        const elem = new DOMParser()
          .parseFromString(
            Object.getOwnPropertyDescriptor(
              window.Element.prototype,
              "outerHTML"
            ).get.call(this),
            "text/html"
          )
          .body.querySelectorAll("*")[0];
        Object.getOwnPropertyDescriptor(
          window.Element.prototype,
          "innerHTML"
        ).set.call(elem, value);
        elem
          .querySelectorAll(
            "script[src], iframe[src], embed[src], audio[src], img[src], input[src], source[src], track[src], video[src]"
          )
          .forEach((node) =>
            node.setAttribute("src", node.getAttribute("src"))
          );
        elem
          .querySelectorAll("object[data]")
          .forEach((node) =>
            node.setAttribute("data", node.getAttribute("data"))
          );
        elem
          .querySelectorAll("a[href], link[href], area[href")
          .forEach((node) =>
            node.setAttribute("href", node.getAttribute("href"))
          );
        return Object.getOwnPropertyDescriptor(
          window.Element.prototype,
          "innerHTML"
        ).set.call(this, elem.innerHTML);
      },
      get() {
        return Object.getOwnPropertyDescriptor(
          window.Element.prototype,
          "innerHTML"
        ).get.call(this);
      },
    });
    Object.defineProperty(element.prototype, "outerHTML", {
      set(value) {
        const elem = new DOMParser().parseFromString(
          Object.getOwnPropertyDescriptor(
            window.Element.prototype,
            "outerHTML"
          ).get.call(this),
          "text/html"
        ).body;
        Object.getOwnPropertyDescriptor(
          window.Element.prototype,
          "outerHTML"
        ).set.call(elem.querySelectorAll("*")[0], value);
        elem
          .querySelectorAll(
            "script[src], iframe[src], embed[src], audio[src], img[src], input[src], source[src], track[src], video[src]"
          )
          .forEach((node) =>
            node.setAttribute("src", node.getAttribute("src"))
          );
        elem
          .querySelectorAll("object[data]")
          .forEach((node) =>
            node.setAttribute("data", node.getAttribute("data"))
          );
        elem
          .querySelectorAll("a[href], link[href], area[href")
          .forEach((node) =>
            node.setAttribute("href", node.getAttribute("href"))
          );
        return Object.getOwnPropertyDescriptor(
          window.Element.prototype,
          "outerHTML"
        ).set.call(this, elem.innerHTML);
      },
      get() {
        return Object.getOwnPropertyDescriptor(
          window.Element.prototype,
          "outerHTML"
        ).get.call(this);
      },
    });
  });
};

proxify.elementAttribute = (element_array, attribute_array) => {
  element_array.forEach((element) => {
    if (element == window.HTMLScriptElement) {
      Object.defineProperty(element.prototype, "integrity", {
        set(value) {
          return this.removeAttribute("integrity");
        },
        get() {
          return this.getAttribute("integrity");
        },
      });
      Object.defineProperty(element.prototype, "nonce", {
        set(value) {
          return this.removeAttribute("nonce");
        },
        get() {
          return this.getAttribute("nonce");
        },
      });
    }
    element.prototype.setAttribute = new Proxy(element.prototype.setAttribute, {
      apply(target, thisArg, [element_attribute, value]) {
        attribute_array.forEach((array_attribute) => {
          if (
            array_attribute == "srcset" &&
            element_attribute.toLowerCase() == array_attribute
          ) {
            var arr = [];
            value.split(",").forEach((url) => {
              url = url.trimStart().split(" ");
              url[0] = proxify.url_http(url[0]);
              arr.push(url.join(" "));
            });
            return Reflect.apply(target, thisArg, [
              element_attribute,
              arr.join(", "),
            ]);
          }
          if (element_attribute.toLowerCase() == array_attribute)
            value = proxify.url_http(value);
        });
        return Reflect.apply(target, thisArg, [element_attribute, value]);
      },
    });
    attribute_array.forEach((attribute) => {
      Object.defineProperty(element.prototype, attribute, {
        set(value) {
          return this.setAttribute(attribute, value);
        },
        get() {
          return this.getAttribute(attribute);
        },
      });
    });
  });
};

document.write = new Proxy(document.write, {
  apply(target, thisArg, args) {
    var processedHTML = new DOMParser().parseFromString(args[0], "text/html");
    processedHTML
      .querySelectorAll(
        "script[src], iframe[src], embed[src], audio[src], img[src], input[src], source[src], track[src], video[src]"
      )
      .forEach((node) => node.setAttribute("src", node.getAttribute("src")));
    processedHTML
      .querySelectorAll("object[data]")
      .forEach((node) => node.setAttribute("data", node.getAttribute("data")));
    processedHTML
      .querySelectorAll("a[href], link[href], area[href")
      .forEach((node) => node.setAttribute("href", node.getAttribute("href")));
    return Reflect.apply(target, thisArg, [
      processedHTML.documentElement.outerHTML,
    ]);
  },
});

proxify.elementHTML([window.HTMLDivElement]);

proxify.elementAttribute(
  [window.HTMLAnchorElement, window.HTMLLinkElement, window.HTMLAreaElement],
  ["href"]
);

proxify.elementAttribute(
  [
    window.HTMLScriptElement,
    window.HTMLIFrameElement,
    window.HTMLEmbedElement,
    window.HTMLAudioElement,
    window.HTMLInputElement,
    window.HTMLTrackElement,
    window.HTMLVideoElement,
  ],
  ["src"]
);

proxify.elementAttribute(
  [window.HTMLImageElement, HTMLSourceElement],
  ["src", "srcset"]
);

proxify.elementAttribute([window.HTMLObjectElement], ["data"]);

proxify.elementAttribute([window.HTMLFormElement], ["action"]);

// --- Privacy/History Masking ---

function sanitizeHistoryURL() {
  if (location.pathname !== "/session") {
    history.replaceState({}, "", "/session");
  }
}

window.history.pushState = new Proxy(window.history.pushState, {
  apply(target, thisArg, args) {
    if (args.length >= 3) args[2] = "/session";
    return Reflect.apply(target, thisArg, args);
  },
});

window.history.replaceState = new Proxy(window.history.replaceState, {
  apply(target, thisArg, args) {
    if (args.length >= 3) args[2] = "/session";
    return Reflect.apply(target, thisArg, args);
  },
});

window.addEventListener("popstate", sanitizeHistoryURL);
window.addEventListener("DOMContentLoaded", sanitizeHistoryURL);

document.addEventListener("click", (event) => {
  const anchor = event.target.closest("a[href]");
  if (anchor && anchor.href) {
    event.preventDefault();
    window.location.assign(anchor.href);
    setTimeout(() => history.replaceState({}, "", "/session"), 100);
  }
});

Object.defineProperty(window.location, "href", {
  get() {
    return "/session";
  },
  set(value) {
    window.location.assign(proxify.url(value));
  },
});

const originalAssign = window.location.assign;
window.location.assign = function (url) {
  url = proxify.url(url);
  originalAssign.call(window.location, url);
  setTimeout(() => history.replaceState({}, "", "/session"), 100);
};

const originalReplace = window.location.replace;
window.location.replace = function (url) {
  url = proxify.url(url);
  originalReplace.call(window.location, url);
  setTimeout(() => history.replaceState({}, "", "/session"), 100);
};

const originalReload = window.location.reload;
window.location.reload = function () {
  originalReload.call(window.location);
  setTimeout(() => history.replaceState({}, "", "/session"), 100);
};

window.location.toString = function () {
  return "/session";
};

Object.defineProperty(window.location, "assign", {
  get() {
    return function (url) {
      window.location.href = proxify.url(url);
    };
  },
});

Object.defineProperty(window.location, "replace", {
  get() {
    return function (url) {
      window.location.href = proxify.url(url);
    };
  },
});

// Redirect /web/ or proxied URLs to /session on load
window.addEventListener("DOMContentLoaded", () => {
  if (
    location.pathname.startsWith("/web/") ||
    location.pathname.startsWith(alloy.prefix)
  ) {
    history.replaceState({}, "", "/session");
  }
});

proxify.elementHTML([window.HTMLDivElement]);

proxify.elementAttribute(
  [window.HTMLAnchorElement, window.HTMLLinkElement, window.HTMLAreaElement],
  ["href"]
);

proxify.elementAttribute(
  [
    window.HTMLScriptElement,
    window.HTMLIFrameElement,
    window.HTMLEmbedElement,
    window.HTMLAudioElement,
    window.HTMLInputElement,
    window.HTMLTrackElement,
    window.HTMLVideoElement,
  ],
  ["src"]
);

proxify.elementAttribute(
  [window.HTMLImageElement, HTMLSourceElement],
  ["src", "srcset"]
);

proxify.elementAttribute([window.HTMLObjectElement], ["data"]);

proxify.elementAttribute([window.HTMLFormElement], ["action"]);

document.currentScript.remove();
