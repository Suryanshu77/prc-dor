const DynamicParam = Symbol.for("dynamic parameter");
const WildcardParam = Symbol.for("wildcard parameter");

function serializeRoutes(name, routes, options) {
  const imports = /* @__PURE__ */ new Set();
  const tree = {};
  for (const route of routes) {
    const { segments } = parsePath(route.path);
    let node = tree;
    for (const segment of segments) {
      node[segment] = node[segment] || {};
      node = node[segment];
    }
    if (route.type === "dynamic") {
      imports.add("DynamicParam");
      node[DynamicParam] = node[DynamicParam] || {};
      node = node[DynamicParam];
    }
    if (route.type === "wildcard") {
      imports.add("WildcardParam");
      node[WildcardParam] = node[WildcardParam] || {};
      node = node[WildcardParam];
    }
    Object.assign(node, route.metadata);
  }
  return [
    imports.size > 0 ? `import { ${[...imports].join(", ")} } from 'fetchdts'` : void 0,
    options?.export ? "export " : void 0,
    "",
    `interface ${name} {
${stringifyRouteTree(tree)}}`
  ].filter((s) => s !== void 0).join("\n");
}
const symbols = [DynamicParam, WildcardParam];
const keys = {
  [DynamicParam]: "[DynamicParam]",
  [WildcardParam]: "[WildcardParam]"
};
function stringifyRouteTree(tree, indent = 2) {
  let properties = "";
  const entries = [
    ...Object.entries(tree),
    ...symbols.map((symbol) => [symbol, tree[symbol]])
  ];
  for (const [_key, value] of entries) {
    if (!value) {
      continue;
    }
    const key = keys[_key] || JSON.stringify(_key.replace(/Type$/, ""));
    if (typeof value === "string") {
      properties += `${" ".repeat(indent)}${key}: ${value}
`;
    } else {
      const str = stringifyRouteTree(value, indent + 2);
      properties += `${" ".repeat(indent)}${key}: {
${str}${" ".repeat(indent)}}
`;
    }
  }
  return properties;
}
function parsePath(path) {
  const url = new URL(path, "http://localhost");
  const segments = url.pathname.split("/").map((s) => s.replace(/^\/?/, "/"));
  if (segments[0] === "/" && segments.length > 1) {
    segments.shift();
  }
  segments[segments.length - 1] += url.search + url.hash;
  if (!/^https?:\/\/localhost/.test(path) && url.host === "localhost") {
    return { segments };
  }
  segments.unshift(url.origin);
  return { segments };
}

export { serializeRoutes };
