/**
 * app/routes/submit.jsx
 *
 * Server route (app proxy). Receives the artist form JSON, creates a DRAFT
 * blog article with the submitted data as metafields + body.
 *
 * IMPORTANT: this file runs on the SERVER only. Do NOT put any browser code
 * here (no `document`, no `window`, no DOM). All form-UI behaviour lives in the
 * theme asset assets/artist-form.js.
 */

// import { authenticate } from "../shopify.server";

// function log(...args) {
//   console.log("🎯 [artist-form]", ...args);
// }

// function buildMetafields(d) {
//   const NS = "artist";
//   const mf = [];
//   const text = (key, val) => { if (val) mf.push({ namespace: NS, key, type: "single_line_text_field", value: String(val) }); };
//   text("band", d.band);
//   text("artist_type", d.artistType);
//   text("role", d.role);
//   text("country", d.country);
//   if (d.quote) mf.push({ namespace: NS, key: "quote", type: "multi_line_text_field", value: String(d.quote) });
//   text("website", d.website);
//   text("instagram", d.instagram);
//   text("youtube", d.youtube);
//   text("facebook", d.facebook);
//   text("twitter", d.twitter);
//   text("tiktok", d.tiktok);
//   text("video_1", d.video1);
//   text("video_2", d.video2);
//   text("profile_credit", d.profileCredit);
//   text("profile_rights", d.profileRights);
//   text("setup_credit", d.setupCredit);
//   text("setup_rights", d.setupRights);
//   const cymbalIds = (d.cymbals || []).map((p) => p.id).filter(Boolean);
//   const gotoIds = (d.gotos || []).map((p) => p.id).filter(Boolean);
//   if (cymbalIds.length) mf.push({ namespace: NS, key: "cymbal_setup", type: "list.product_reference", value: JSON.stringify(cymbalIds) });
//   if (gotoIds.length) mf.push({ namespace: NS, key: "go_tos", type: "list.product_reference", value: JSON.stringify(gotoIds) });
//   return mf;
// }

// function buildBody(d) {
//   const row = (label, value) => (value ? `<p><strong>${label}:</strong> ${value}</p>` : "");
//   return [
//     row("Band / Affiliation", d.band),
//     row("Artist Type", d.artistType),
//     row("Educator / Performer", d.role),
//     row("Country", d.country),
//     d.quote ? `<blockquote>${d.quote}</blockquote>` : "",
//   ].filter(Boolean).join("\n");
// }

// export async function action({ request }) {
//   log("STEP 0: action entered, method =", request.method);

//   if (request.method !== "POST") {
//     return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
//   }

//   let admin, session;
//   try {
//     log("STEP 1: authenticating app proxy...");
//     const ctx = await authenticate.public.appProxy(request);
//     admin = ctx.admin;
//     session = ctx.session;
//     log("STEP 1 done. admin present?", !!admin, "shop:", session?.shop);
//   } catch (e) {
//     log("STEP 1 FAILED:", e?.message);
//     return Response.json({ ok: false, error: "appProxy auth failed: " + (e?.message || e) }, { status: 500 });
//   }

//   if (!admin) {
//     return Response.json({ ok: false, error: "App not installed for this shop (admin undefined)." }, { status: 401 });
//   }

//   let d;
//   try {
//     log("STEP 2: reading JSON body...");
//     d = await request.json();
//     log("STEP 2 done. name =", d?.name);
//   } catch (e) {
//     log("STEP 2 FAILED:", e?.message);
//     return Response.json({ ok: false, error: "Bad JSON body: " + (e?.message || e) }, { status: 400 });
//   }

//   // Resolve blog id with a PROPER named query
//   let BLOG_ID = process.env.SHOPIFY_BLOG_ID;
//   try {
//     if (!BLOG_ID) {
//       log("STEP 3: querying first blog (named query)...");
//       const blogRes = await admin.graphql(
//         `#graphql
//          query GetFirstBlog {
//            blogs(first: 1) {
//              nodes { id title }
//            }
//          }`
//       );
//       const blogJson = await blogRes.json();
//       log("STEP 3 blogs response:", JSON.stringify(blogJson));
//       BLOG_ID = blogJson.data?.blogs?.nodes?.[0]?.id || null;
//     }
//     log("STEP 3 done. BLOG_ID =", BLOG_ID);
//   } catch (e) {
//     log("STEP 3 FAILED:", e?.message);
//     return Response.json({ ok: false, error: "blog lookup failed: " + (e?.message || e) }, { status: 500 });
//   }

//   if (!BLOG_ID) {
//     return Response.json({ ok: false, error: "No blog found. Create one in Content -> Blogs." }, { status: 500 });
//   }

//   // Create the draft article
//   try {
//     const article = {
//       blogId: BLOG_ID,
//       title: `${d.name}${d.band ? " — " + d.band : ""}`,
//       author: { name: d.name },
//       body: buildBody(d),
//       summary: d.quote ? String(d.quote).slice(0, 250) : undefined,
//       tags: ["artist-profile", "draft-submission"],
//       isPublished: false,
//       metafields: buildMetafields(d),
//     };
//     log("STEP 4: calling articleCreate...");

//     const res = await admin.graphql(
//       `#graphql
//        mutation CreateArticle($article: ArticleCreateInput!) {
//          articleCreate(article: $article) {
//            article { id handle title }
//            userErrors { field message code }
//          }
//        }`,
//       { variables: { article } }
//     );
//     const json = await res.json();
//     log("STEP 4 raw response:", JSON.stringify(json));

//     const payload = json.data?.articleCreate;
//     if (!payload) {
//       return Response.json({ ok: false, error: "articleCreate returned no data: " + JSON.stringify(json.errors || json) }, { status: 500 });
//     }
//     if (payload.userErrors?.length) {
//       return Response.json({ ok: false, error: payload.userErrors.map((e) => `${e.field}: ${e.message}`).join("; ") }, { status: 422 });
//     }

//     const created = payload.article;
//     const numericId = created.id.split("/").pop();
//     const adminUrl = session?.shop ? `https://${session.shop}/admin/articles/${numericId}` : null;
//     log("STEP 5: SUCCESS, article id =", created.id);
//     return Response.json({ ok: true, articleId: created.id, handle: created.handle, adminUrl });
//   } catch (e) {
//     log("STEP 4 FAILED:", e?.message);
//     return Response.json({ ok: false, error: "articleCreate threw: " + (e?.message || e) }, { status: 500 });
//   }
// }






















/**
 * app/routes/submit.jsx  (SERVER ONLY — no document/window)
 *
 * Receives the artist form JSON, uploads the profile photo to Shopify Files,
 * then creates a DRAFT blog article with the photo as its featured image,
 * the fields as metafields + body, and any manual cymbals saved too.
 *
 * Heavily logged so the dev-server terminal shows exactly what happens.
 */

import { authenticate } from "../shopify.server";

function log(...args) {
  console.log("🎯 [artist-form]", ...args);
}

function buildMetafields(d, definitions, setupImageId, profileImageId) {
  const NS = "artist";
  const mf = [];
  const text = (key, val) => { if (val) mf.push({ namespace: NS, key, type: "single_line_text_field", value: String(val) }); };
  text("artist_type", d.artistType);
  text("role", d.role);
  if (d.quote) mf.push({ namespace: NS, key: "quote", type: "multi_line_text_field", value: String(d.quote) });
  text("tiktok", d.tiktok);
  const videos = [d.video1, d.video2].filter(Boolean).join("\n");
  const cymbalSetup = (d.cymbals || [])
    .filter((product) => product && product.title)
    .map((product) => `${product.title}${product.sku ? ` (${product.sku})` : ""}`)
    .join("\n");
  const definitionValues = [
    ["Affiliation", d.band],
    ["country", d.country],
    ["Website", d.website],
    ["Instagram", d.instagram],
    ["YouTube", d.youtube],
    ["Facebook", d.facebook],
    ["Twitter", d.twitter],
    ["Video", videos],
    ["Cymbal Setup", cymbalSetup],
  ];
  definitionValues.forEach(([name, value]) => {
    if (!value) return;
    const matches = definitions.filter((definition) => definition.name.toLowerCase() === name.toLowerCase());
    if (matches.length !== 1) {
      throw new Error(`Expected one blog post metafield definition named "${name}", found ${matches.length}.`);
    }
    const definition = matches[0];
    mf.push({
      namespace: definition.namespace,
      key: definition.key,
      type: definition.type.name,
      value: String(value),
    });
  });
  if (profileImageId) {
    const matches = definitions.filter(
      (definition) => definition.name.toLowerCase() === "featured banner image",
    );
    if (matches.length === 1) {
      const definition = matches[0];
      if (definition.type.name !== "file_reference") {
        throw new Error(`"Featured Banner Image" must be a file metafield, found "${definition.type.name}".`);
      }
      mf.push({
        namespace: definition.namespace,
        key: definition.key,
        type: definition.type.name,
        value: profileImageId,
      });
    }
  }
  if (setupImageId) {
    const matches = definitions.filter(
      (definition) => definition.name.toLowerCase() === "cymbal setup image",
    );
    if (matches.length === 1) {
      const definition = matches[0];
      if (definition.type.name !== "file_reference") {
        throw new Error(`"Cymbal Setup Image" must be a file metafield, found "${definition.type.name}".`);
      }
      mf.push({
        namespace: definition.namespace,
        key: definition.key,
        type: definition.type.name,
        value: setupImageId,
      });
    }
  }
  text("profile_credit", d.profileCredit);
  text("profile_rights", d.profileRights);
  text("setup_credit", d.setupCredit);
  text("setup_rights", d.setupRights);

  const gotoIds = (d.gotos || []).map((p) => p.id).filter(Boolean);
  if (gotoIds.length) {
    const gotoDefinitions = definitions.filter(
      (definition) => definition.name.toLowerCase() === "go-to products",
    );
    if (gotoDefinitions.length !== 1) {
      throw new Error(`Expected one blog post metafield definition named "Go-To Products", found ${gotoDefinitions.length}.`);
    }
    const definition = gotoDefinitions[0];
    mf.push({
      namespace: definition.namespace,
      key: definition.key,
      type: definition.type.name,
      value: JSON.stringify(gotoIds),
    });
  }

  const manualCymbals = (d.cymbals || [])
    .filter((p) => p && p.manual && p.title)
    .map((p) => String(p.title));
  if (manualCymbals.length) {
    mf.push({ namespace: NS, key: "cymbal_setup_manual", type: "list.single_line_text_field", value: JSON.stringify(manualCymbals) });
  }
  return mf;
}

async function getArticleMetafieldDefinitions(admin) {
  const response = await admin.graphql(
    `#graphql
     query ArticleMetafieldDefinitions {
       metafieldDefinitions(ownerType: ARTICLE, first: 250) {
         nodes { name namespace key type { name } }
       }
     }`
  );
  const json = await response.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((error) => error.message).join("; "));
  }
  const definitions = json.data?.metafieldDefinitions?.nodes;
  if (!definitions) throw new Error("Shopify returned no blog post metafield definitions.");
  return definitions;
}

function buildBody(d) {
  const row = (label, value) => (value ? `<p><strong>${label}:</strong> ${value}</p>` : "");
  const manualCymbals = (d.cymbals || [])
    .filter((p) => p && p.manual && p.title)
    .map((p) => String(p.title));
  const manualBlock = manualCymbals.length
    ? `<p><strong>Manually added cymbals:</strong></p><ul>${manualCymbals.map((t) => `<li>${t}</li>`).join("")}</ul>`
    : "";
  return [
    d.quote ? `<blockquote>${d.quote}</blockquote>` : "",
    row("Band / Affiliation", d.band),
    row("Artist Type", d.artistType),
    row("Educator / Performer", d.role),
    row("Country", d.country),
    manualBlock,
  ].filter(Boolean).join("\n");
}

/* ---- upload a base64 image to Shopify Files, return { url, id } ---- */
async function uploadImage(admin, photo) {
  if (!photo || !photo.dataUrl) throw new Error("Image file data is missing.");

  const match = /^data:(.+?);base64,(.*)$/s.exec(photo.dataUrl);
  if (!match) throw new Error("Image data must be a base64 data URL.");
  const mimeType = match[1];
  const base64 = match[2];
  const bytes = Buffer.from(base64, "base64");
  const filename = (photo.name || "artist-photo.jpg").replace(/[^\w.-]+/g, "_");
  log("IMG: decoded", { mimeType, filename, bytes: bytes.length });

  const stagedRes = await admin.graphql(
    `#graphql
     mutation StagedUpload($input: [StagedUploadInput!]!) {
       stagedUploadsCreate(input: $input) {
         stagedTargets { url resourceUrl parameters { name value } }
         userErrors { field message }
       }
     }`,
    {
      variables: {
        input: [{
          filename,
          mimeType,
          httpMethod: "POST",
          resource: "FILE",
          fileSize: String(bytes.length),
        }],
      },
    }
  );
  const stagedJson = await stagedRes.json();
  if (stagedJson.errors?.length) {
    throw new Error(stagedJson.errors.map((error) => error.message).join("; "));
  }
  const stagedPayload = stagedJson.data?.stagedUploadsCreate;
  if (stagedPayload?.userErrors?.length) {
    throw new Error(stagedPayload.userErrors.map((error) => error.message).join("; "));
  }
  const target = stagedPayload?.stagedTargets?.[0];
  if (!target) throw new Error("Shopify did not return a staged upload target.");

  const fd = new FormData();
  (target.parameters || []).forEach((parameter) => fd.append(parameter.name, parameter.value));
  fd.append("file", new Blob([bytes], { type: mimeType }), filename);
  const upload = await fetch(target.url, { method: "POST", body: fd });
  log("IMG: staged POST status =", upload.status);
  if (!upload.ok) {
    throw new Error(`Shopify staged image upload failed with status ${upload.status}.`);
  }

  const fileRes = await admin.graphql(
    `#graphql
     mutation FileCreate($files: [FileCreateInput!]!) {
       fileCreate(files: $files) {
         files { id fileStatus alt ... on MediaImage { image { url } } }
         userErrors { field message }
       }
     }`,
    { variables: { files: [{ alt: filename, contentType: "IMAGE", originalSource: target.resourceUrl }] } }
  );
  const fileJson = await fileRes.json();
  if (fileJson.errors?.length) {
    throw new Error(fileJson.errors.map((error) => error.message).join("; "));
  }
  const filePayload = fileJson.data?.fileCreate;
  if (filePayload?.userErrors?.length) {
    throw new Error(filePayload.userErrors.map((error) => error.message).join("; "));
  }
  const file = filePayload?.files?.[0];
  if (!file?.id) throw new Error("Shopify did not create the uploaded image file.");

  let url = file.image?.url || null;
  if (!url) {
    for (let i = 0; i < 6 && !url; i++) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      const check = await admin.graphql(
        `#graphql
         query FileUrl($id: ID!) {
           node(id: $id) { ... on MediaImage { image { url } fileStatus } }
         }`,
        { variables: { id: file.id } }
      );
      const checkJson = await check.json();
      if (checkJson.errors?.length) {
        throw new Error(checkJson.errors.map((error) => error.message).join("; "));
      }
      url = checkJson.data?.node?.image?.url || null;
      log("IMG: poll", i, "url =", url);
    }
  }
  log("IMG: FINAL url =", url, "id =", file.id);
  return { url, id: file.id };
}

export async function action({ request }) {
  log("STEP 0: action entered, method =", request.method);

  if (request.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  let admin, session;
  try {
    const ctx = await authenticate.public.appProxy(request);
    admin = ctx.admin;
    session = ctx.session;
    log("STEP 1 done. admin?", !!admin, "shop:", session?.shop);
  } catch (e) {
    log("STEP 1 FAILED:", e?.message);
    return Response.json({ ok: false, error: "appProxy auth failed: " + (e?.message || e) }, { status: 500 });
  }

  if (!admin) {
    return Response.json({ ok: false, error: "App not installed for this shop (admin undefined)." }, { status: 401 });
  }

  let d;
  try {
    d = await request.json();
    log("STEP 2 done. name =", d?.name, "hasProfilePhoto?", !!(d?.profilePhoto && d.profilePhoto.dataUrl));
  } catch (e) {
    log("STEP 2 FAILED:", e?.message);
    return Response.json({ ok: false, error: "Bad JSON body: " + (e?.message || e) }, { status: 400 });
  }
  if (!d.profilePhoto?.dataUrl || !d.setupPhoto?.dataUrl) {
    return Response.json({ ok: false, error: "Please include both the profile photo and setup photo." }, { status: 400 });
  }

  let BLOG_ID = process.env.SHOPIFY_BLOG_ID;
  try {
    if (!BLOG_ID) {
      const blogRes = await admin.graphql(
        `#graphql
         query GetFirstBlog { blogs(first: 1) { nodes { id title } } }`
      );
      const blogJson = await blogRes.json();
      BLOG_ID = blogJson.data?.blogs?.nodes?.[0]?.id || null;
    }
    log("STEP 3 done. BLOG_ID =", BLOG_ID);
  } catch (e) {
    log("STEP 3 FAILED:", e?.message);
    return Response.json({ ok: false, error: "blog lookup failed: " + (e?.message || e) }, { status: 500 });
  }

  if (!BLOG_ID) {
    return Response.json({ ok: false, error: "No blog found. Create one in Content -> Blogs." }, { status: 500 });
  }

  let metafieldDefinitions;
  try {
    metafieldDefinitions = await getArticleMetafieldDefinitions(admin);
  } catch (e) {
    log("STEP 3.2 FAILED: metafield definition lookup:", e?.message);
    return Response.json({ ok: false, error: "Could not load blog post metafield definitions: " + (e?.message || e) }, { status: 500 });
  }

  let image;
  let setupImage;
  try {
    log("STEP 3.5: uploading profile photo...");
    image = await uploadImage(admin, d.profilePhoto);
    log("STEP 3.6: uploading setup photo...");
    setupImage = await uploadImage(admin, d.setupPhoto);
  } catch (e) {
    log("IMAGE UPLOAD FAILED:", e?.message);
    return Response.json({ ok: false, error: "Could not upload submitted images: " + (e?.message || e) }, { status: 502 });
  }

  try {
    const article = {
      blogId: BLOG_ID,
      title: d.name,
      author: { name: d.name },
      body: buildBody(d),
      summary: d.quote ? String(d.quote).slice(0, 250) : undefined,
      tags: ["artist-profile", "draft-submission"],
      isPublished: false,
      metafields: buildMetafields(d, metafieldDefinitions, setupImage.id, image.id),
    };
    if (image && image.url) {
      article.image = { url: image.url, altText: `${d.name} profile photo` };
    }
    log("STEP 4: articleCreate", image?.url ? "WITH image " + image.url : "NO image");

    const res = await admin.graphql(
      `#graphql
       mutation CreateArticle($article: ArticleCreateInput!) {
         articleCreate(article: $article) {
           article { id handle title image { url } }
           userErrors { field message code }
         }
       }`,
      { variables: { article } }
    );
    const json = await res.json();
    log("STEP 4 response:", JSON.stringify(json));

    const payload = json.data?.articleCreate;
    if (!payload) {
      return Response.json({ ok: false, error: "articleCreate returned no data: " + JSON.stringify(json.errors || json) }, { status: 500 });
    }
    if (payload.userErrors?.length) {
      // if the image field was the problem, retry WITHOUT it so the post still saves
      const imgErr = payload.userErrors.some((e) => (e.field || []).join(".").includes("image"));
      if (imgErr && article.image) {
        log("STEP 4b: image field rejected, retrying without image");
        delete article.image;
        const res2 = await admin.graphql(
          `#graphql
           mutation CreateArticle($article: ArticleCreateInput!) {
             articleCreate(article: $article) {
               article { id handle title }
               userErrors { field message code }
             }
           }`,
          { variables: { article } }
        );
        const json2 = await res2.json();
        log("STEP 4b response:", JSON.stringify(json2));
        const p2 = json2.data?.articleCreate;
        if (p2 && !p2.userErrors?.length) {
          const created2 = p2.article;
          const numericId2 = created2.id.split("/").pop();
          const adminUrl2 = session?.shop ? `https://${session.shop}/admin/articles/${numericId2}` : null;
          return Response.json({ ok: true, articleId: created2.id, handle: created2.handle, adminUrl: adminUrl2, imageWarning: "Image could not be attached." });
        }
      }
      return Response.json({ ok: false, error: payload.userErrors.map((e) => `${e.field}: ${e.message}`).join("; ") }, { status: 422 });
    }

    const created = payload.article;
    const numericId = created.id.split("/").pop();
    const adminUrl = session?.shop ? `https://${session.shop}/admin/articles/${numericId}` : null;
    log("STEP 5: SUCCESS", created.id, "image:", created.image?.url || "(none)");
    return Response.json({ ok: true, articleId: created.id, handle: created.handle, adminUrl, image: created.image?.url || null });
  } catch (e) {
    log("STEP 4 THREW:", e?.message);
    return Response.json({ ok: false, error: "articleCreate threw: " + (e?.message || e) }, { status: 500 });
  }
}
