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

export async function loader({ request }) {
  const { admin } = await authenticate.public.appProxy(request);
  if (!admin) return Response.json(EMPTY);

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const group = url.searchParams.get("group") || "";
  const after = url.searchParams.get("after") || null;
  const isCymbals = group === "cymbals";
  const hasTerm = q.length >= 2;

  // escape quotes/backslashes so they can't break the query string
  const term = q.replace(/["\\]/g, "\\$&");

  const parts = [];
  if (hasTerm) parts.push(`title:*${term}*`);
  if (isCymbals) parts.push(`product_type:Cymbals`);
  const query = parts.join(" AND "); // may be "" (returns everything)

  // page size per fetch (a "chunk" the scroll appends)
  const first = 24;

  const res = await admin.graphql(
    `#graphql
     query Search($query: String!, $first: Int!, $after: String) {
       products(first: $first, query: $query, after: $after, sortKey: TITLE) {
         nodes {
           id
           title
           featuredImage { url }
           variants(first: 1) { nodes { sku } }
         }
         pageInfo { endCursor hasNextPage }
       }
     }`,
    { variables: { query, first, after } }
  );

  const conn = (await res.json()).data?.products;
  const products = (conn?.nodes || []).map((p) => ({
    id: p.id,
    title: p.title,
    image: p.featuredImage?.url || null,
    sku: p.variants?.nodes?.[0]?.sku || null,
  }));

  return Response.json({
    products,
    pageInfo: {
      endCursor: conn?.pageInfo?.endCursor || null,
      hasNextPage: !!conn?.pageInfo?.hasNextPage,
    },
  });
}