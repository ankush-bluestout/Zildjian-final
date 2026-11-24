// import { authenticate } from "../shopify.server";

// export async function loader({ request }) {
//   const { admin } = await authenticate.public.appProxy(request);
//   if (!admin) return Response.json({ products: [] });

//   const url = new URL(request.url);
//   const q = (url.searchParams.get("q") || "").trim();
//   const group = url.searchParams.get("group") || "";
//   const isCymbals = group === "cymbals";

//   if (!isCymbals && q.length < 2) return Response.json({ products: [] });

//   const term = q.replace(/["\\]/g, "\\$&");

//   const parts = [];
//   if (q.length >= 2) parts.push(`title:*${term}*`);
//   if (isCymbals) parts.push(`product_type:Cymbals`);
//   const query = parts.join(" AND ");

//   const first = isCymbals && q.length < 2 ? 100 : 20;

//   const res = await admin.graphql(
//     `#graphql
//      query Search($query: String!, $first: Int!) {
//        products(first: $first, query: $query, sortKey: TITLE) {
//          nodes {
//            id
//            title
//            featuredImage { url }
//            variants(first: 1) { nodes { sku } }
//          }
//        }
//      }`,
//     { variables: { query, first } }
//   );

//   const data = (await res.json()).data;
//   const products = (data?.products?.nodes || []).map((p) => ({
//     id: p.id,
//     title: p.title,
//     image: p.featuredImage?.url || null,
//     sku: p.variants?.nodes?.[0]?.sku || null,
//   }));

//   return Response.json({ products });
// }


/**
 * app/routes/search.jsx
 *
 * Product search for the artist form. The form fetches
 *   /apps/artist-form/search?q=...&group=cymbals|gotos
 * which Shopify proxies here (signed). Returns matching products as JSON:
 *   { products: [ { id, title, image, sku } ] }
 *
 * Modes (driven by group + whether a term is present):
 *  - cymbals, no term  -> browse all Type "Cymbals" (up to 100)
 *  - cymbals, term     -> title search within Type "Cymbals"
 *  - gotos, no term    -> initial suggestion batch (24) from full catalog
 *  - gotos, term       -> title search across the full catalog
 */





// import { authenticate } from "../shopify.server";

// export async function loader({ request }) {
//   const { admin } = await authenticate.public.appProxy(request);
//   if (!admin) return Response.json({ products: [] });

//   const url = new URL(request.url);
//   const q = (url.searchParams.get("q") || "").trim();
//   const group = url.searchParams.get("group") || "";
//   const isCymbals = group === "cymbals";
//   const hasTerm = q.length >= 2;

//   // escape quotes/backslashes so they can't break the query string
//   const term = q.replace(/["\\]/g, "\\$&");

//   const parts = [];
//   if (hasTerm) parts.push(`title:*${term}*`);
//   if (isCymbals) parts.push(`product_type:Cymbals`);
//   const query = parts.join(" AND "); // may be "" (returns everything)

//   // how many to pull:
//   //  - any term search: 20 matches
//   //  - cymbals browse (no term): up to 100 (bounded set)
//   //  - gotos initial (no term): 24 suggestions
//   let first;
//   if (hasTerm) first = 20;
//   else if (isCymbals) first = 100;
//   else first = 24;

//   const res = await admin.graphql(
//     `#graphql
//      query Search($query: String!, $first: Int!) {
//        products(first: $first, query: $query, sortKey: TITLE) {
//          nodes {
//            id
//            title
//            featuredImage { url }
//            variants(first: 1) { nodes { sku } }
//          }
//        }
//      }`,
//     { variables: { query, first } }
//   );

//   const data = (await res.json()).data;
//   const products = (data?.products?.nodes || []).map((p) => ({
//     id: p.id,
//     title: p.title,
//     image: p.featuredImage?.url || null,
//     sku: p.variants?.nodes?.[0]?.sku || null,
//   }));

//   return Response.json({ products });
// }









/**
 * app/routes/search.jsx
 *
 * Product search for the artist form. The form fetches
 *   /apps/artist-form/search?q=...&group=cymbals|gotos&after=CURSOR
 * which Shopify proxies here (signed). Returns:
 *   { products: [ { id, title, image, sku } ], pageInfo: { endCursor, hasNextPage } }
 *
 * Modes:
 *  - cymbals, no term  -> browse Type "Cymbals"
 *  - cymbals, term     -> title search within Type "Cymbals"
 *  - gotos, no term    -> full catalog (paginated as the user scrolls)
 *  - gotos, term       -> title search across the full catalog (paginated)
 *
 * `after` is a GraphQL cursor for the next page (infinite scroll). Omit it for
 * the first page.
 */

import { authenticate } from "../shopify.server";

const EMPTY = { products: [], pageInfo: { endCursor: null, hasNextPage: false } };

// Go-To's: products from these collections are listed first, then the rest.
const PRIORITY_HANDLES = ["gear-accessories", "apparel"];
let priorityIds = null; // cached numeric collection ids

async function getPriorityIds(admin) {
  if (priorityIds) return priorityIds;
  const res = await admin.graphql(
    `#graphql
     query Cols($query: String!) {
       collections(first: 10, query: $query) { nodes { id handle } }
     }`,
    {
      variables: {
        query: PRIORITY_HANDLES.map((h) => `handle:${h}`).join(" OR "),
      },
    }
  );
  const nodes = (await res.json()).data?.collections?.nodes || [];
  const ids = nodes
    .filter((c) => PRIORITY_HANDLES.includes(c.handle))
    .map((c) => c.id.split("/").pop());
  if (ids.length) priorityIds = ids; // don't cache failures
  return ids;
}

export async function loader({ request }) {
  const { admin } = await authenticate.public.appProxy(request);
  if (!admin) return Response.json(EMPTY);

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const group = url.searchParams.get("group") || "";
  const afterParam = url.searchParams.get("after") || "";
  const isCymbals = group === "cymbals";
  const hasTerm = q.length >= 2;

  // escape quotes/backslashes so they can't break the query string
  const term = q.replace(/["\]/g, "\$&");

  const base = [`status:active`]; // only active products
  if (hasTerm) base.push(`title:*${term}*`);
  if (isCymbals) base.push(`product_type:Cymbals`);
  else base.push(`NOT product_type:Cymbals`); // Go-To's: hide Cymbals-type products

  // Go-To's cursor is "p1:<cursor>" (priority collections) or "p2:<cursor>" (the rest)
  let phase = 2;
  let after = null;
  let query = base.join(" AND ");

  if (!isCymbals) {
    const ids = await getPriorityIds(admin);
    if (ids.length) {
      phase = afterParam.startsWith("p2:") ? 2 : 1;
      after = afterParam.replace(/^p[12]:/, "") || null;
      const inAny = "(" + ids.map((i) => `collection_id:${i}`).join(" OR ") + ")";
      query =
        base.join(" AND ") +
        (phase === 1
          ? ` AND ${inAny}`
          : ` AND NOT ${inAny}`);
    } else {
      after = afterParam.replace(/^p[12]:/, "") || null;
    }
  } else {
    after = afterParam || null;
  }

  // page size per fetch (a "chunk" the scroll appends)
  const first = 24;

  const res = await admin.graphql(
    `#graphql
     query Search($query: String!, $first: Int!, $after: String) {
       products(first: $first, query: $query, after: $after, sortKey: TITLE) {
         nodes {
           id
           title
           productType
           featuredImage { url }
           variants(first: 1) { nodes { sku } }
         }
         pageInfo { endCursor hasNextPage }
       }
     }`,
    { variables: { query, first, after } }
  );

  const conn = (await res.json()).data?.products;
  const products = (conn?.nodes || [])
    // safety net: Go-To's never shows Cymbals-type products
    .filter((p) => isCymbals || (p.productType || "").toLowerCase() !== "cymbals")
    .map((p) => ({
      id: p.id,
      title: p.title,
      image: p.featuredImage?.url || null,
      sku: p.variants?.nodes?.[0]?.sku || null,
    }));

  let endCursor = conn?.pageInfo?.endCursor || null;
  let hasNextPage = !!conn?.pageInfo?.hasNextPage;

  if (!isCymbals && priorityIds) {
    if (phase === 1) {
      if (hasNextPage) endCursor = "p1:" + endCursor;
      else {
        // priority collections exhausted -> continue with everything else
        endCursor = "p2:";
        hasNextPage = true;
      }
    } else if (endCursor) {
      endCursor = "p2:" + endCursor;
    }
  }

  return Response.json({ products, pageInfo: { endCursor, hasNextPage } });
}
