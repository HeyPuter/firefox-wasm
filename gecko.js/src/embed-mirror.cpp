// DOM-mirror mode: serialize the live page to self-contained data: URLs (images,
// stylesheets, canvases) for the host to render in a native iframe. Split from
// embed-xul.cpp. See embed-xul.h.
#include "embed-xul.h"
// Per-page caches of encoded resource data URLs, cleared on navigation (xul_load).
// Steady-state mirroring is gated by a content-side dirty flag, but when the DOM DOES
// change (SPAs, dynamic pages) a dirty tick would otherwise re-encode every image and
// stylesheet from scratch even though they're unchanged. Keying by image URL / stylesheet
// pointer makes a dirty tick re-encode only genuinely-new resources.
static std::unordered_map<std::string, std::string> g_mirrorImgCache;
static std::unordered_map<std::string, std::string> g_mirrorCssCache;
void mirror_clear_caches() {
  g_mirrorImgCache.clear();
  g_mirrorCssCache.clear();
}

// Composed-tree walk for DOM-mirror resource collection. Visits elements in the EXACT
// order the JS serializer (mirrorSerializerFn) does, so the #MIRRORIMG{n}#/#MIRRORCANVAS{n}#
// token indices line up: at each element, descend the open shadow root FIRST (matching the
// <template shadowrootmode> emitted before light children), then a same-origin iframe's
// content document (matching the recursive srcdoc), then the light children. <script>/
// <noscript>/<style>/<link>/<template> subtrees are skipped (the serializer drops or
// raw-emits them, never indexing inside). Only OPEN, non-UA shadow roots
// (GetShadowRootForBindings) and same-origin iframes (GetContentDocument under the node's
// own principal) are entered -- exactly what the content-JS serializer can reach.
static void mirror_walk(nsINode* node,
                        nsTArray<RefPtr<mozilla::dom::Element>>& imgs,
                        nsTArray<RefPtr<mozilla::dom::Element>>& canvases) {
  using namespace mozilla::dom;
  for (nsIContent* c = node->GetFirstChild(); c; c = c->GetNextSibling()) {
    if (!c->IsElement()) continue;
    Element* el = c->AsElement();
    if (el->IsHTMLElement()) {
      nsAtom* tag = el->NodeInfo()->NameAtom();
      if (tag == nsGkAtoms::script || tag == nsGkAtoms::noscript ||
          tag == nsGkAtoms::style || tag == nsGkAtoms::link ||
          tag == nsGkAtoms::_template) {
        continue;
      }
      if (tag == nsGkAtoms::img) {
        imgs.AppendElement(el);
        continue;
      }
      if (tag == nsGkAtoms::canvas) {
        canvases.AppendElement(el);
        continue;
      }
      if (tag == nsGkAtoms::iframe) {
        // Same-origin only, matching the serializer's JS iframe.contentDocument access.
        if (Document* cd = el->OwnerDoc()->GetSubDocumentFor(el)) {
          bool same = false;
          el->NodePrincipal()->Equals(cd->NodePrincipal(), &same);
          if (same) {
            if (Element* de = cd->GetDocumentElement()) {
              mirror_walk(de, imgs, canvases);
            }
          }
        }
        continue;
      }
    }
    if (ShadowRoot* sr = el->GetShadowRootForBindings()) {
      mirror_walk(sr, imgs, canvases);
    }
    mirror_walk(el, imgs, canvases);
  }
}

// DOM-mirror image inlining (op=6). Gecko already downloaded + decoded the page's
// images using the PAGE's own privileges, so we can read their bytes here and hand the
// host data: URLs -- sidestepping the cross-origin canvas-taint / CORS wall that blocks
// the content-JS serializer (a content script can't toDataURL() a cross-origin image).
// Returns a JSON array of data: URLs (empty string for images not yet decoded), one per
// <img> in document order, so the JS side swaps them in by index. Caller owns the
// strdup'd result.
char* mirror_collect_images() {
  using namespace mozilla;
  using mozilla::dom::Document;
  if (!g_docShell) return strdup("[]");
  PresShell* ps = g_docShell->GetPresShell();
  if (!ps) return strdup("[]");
  Document* doc = ps->GetDocument();
  if (!doc) return strdup("[]");

  nsCOMPtr<imgITools> imgTools = do_GetService("@mozilla.org/image/tools;1");
  if (!imgTools) return strdup("[]");

  // Composed-tree order (shadow + same-origin iframes), matching the serializer's tokens.
  nsTArray<RefPtr<mozilla::dom::Element>> imgEls, cvEls;
  if (mozilla::dom::Element* root = doc->GetDocumentElement()) {
    mirror_walk(root, imgEls, cvEls);
  }
  uint32_t count = imgEls.Length();

  nsCString json;
  json.Append('[');
  for (uint32_t i = 0; i < count; i++) {
    if (i) json.Append(',');
    nsCString dataUrl;
    nsCOMPtr<nsIImageLoadingContent> ilc = do_QueryInterface(imgEls[i]);
    if (ilc) {
      nsCOMPtr<imgIRequest> req;
      ilc->GetRequest(nsIImageLoadingContent::CURRENT_REQUEST,
                      getter_AddRefs(req));
      if (req) {
        // Cache by the image's URL: identical URLs share one encode, and an unchanged
        // image is never re-encoded on a later dirty tick.
        std::string key;
        if (nsCOMPtr<nsIURI> uri = req->GetURI()) {
          nsAutoCString spec;
          uri->GetSpec(spec);
          key.assign(spec.get(), spec.Length());
          auto it = g_mirrorImgCache.find(key);
          if (it != g_mirrorImgCache.end()) {
            json.Append('"');
            json.Append(it->second.c_str());
            json.Append('"');
            continue;
          }
        }
        nsCOMPtr<imgIContainer> container;
        req->GetImage(getter_AddRefs(container));
        if (container) {
          nsCOMPtr<nsIInputStream> stream;
          imgTools->EncodeImage(container, "image/png"_ns, u""_ns,
                                getter_AddRefs(stream));
          // Vector (SVG) images decode to a VectorImage with no fixed frame, so
          // EncodeImage yields nothing. Re-encode at the intrinsic size, which forces
          // a raster of the SVG.
          uint64_t avail64 = 0;
          if (stream) stream->Available(&avail64);
          if (avail64 == 0) {
            int32_t iw = 0, ih = 0;
            container->GetWidth(&iw);
            container->GetHeight(&ih);
            if (iw > 0 && ih > 0) {
              if (iw > 1024) iw = 1024;
              if (ih > 1024) ih = 1024;
              stream = nullptr;
              imgTools->EncodeScaledImage(container, "image/png"_ns, iw, ih,
                                          u""_ns, getter_AddRefs(stream));
              avail64 = 0;
              if (stream) stream->Available(&avail64);
            }
          }
          if (stream && avail64) {
            uint32_t avail =
                avail64 > 0xFFFFFFFFu ? 0xFFFFFFFFu : (uint32_t)avail64;
            nsAutoCString b64;
            if (NS_SUCCEEDED(Base64EncodeInputStream(stream, b64, avail))) {
              dataUrl.AssignLiteral("data:image/png;base64,");
              dataUrl.Append(b64);
            }
          }
        }
        // Cache only a successful encode, keyed by URL. An image still decoding yields
        // empty -> not cached -> retried next dirty tick until it lands.
        if (!key.empty() && !dataUrl.IsEmpty()) {
          g_mirrorImgCache[key].assign(dataUrl.get(), dataUrl.Length());
        }
      }
    }
    // base64 + the literal prefix contain no JSON-special chars, so a bare quote
    // wrap is safe (no escaping needed).
    json.Append('"');
    json.Append(dataUrl);
    json.Append('"');
  }
  json.Append(']');
  return strdup(json.get());
}

// DOM-mirror CSS inlining (op=7). The content-JS serializer can only read same-origin
// document.styleSheets[i].cssRules (cross-origin throws SecurityError). Here we use the
// privileged StyleSheet::GetCssRulesInternal() (no security check) to serialize EVERY
// stylesheet -- same- and cross-origin -- to text, and hand back data:text/css URLs in
// document (cascade) order so the JS side can <link> them in. Caller owns the result.
char* mirror_collect_css() {
  using namespace mozilla;
  using mozilla::dom::Document;
  if (!g_docShell) return strdup("[]");
  PresShell* ps = g_docShell->GetPresShell();
  if (!ps) return strdup("[]");
  Document* doc = ps->GetDocument();
  if (!doc) return strdup("[]");

  size_t count = doc->SheetCount();
  nsCString json;
  json.Append('[');
  for (size_t i = 0; i < count; i++) {
    if (i) json.Append(',');
    nsCString dataUrl;
    StyleSheet* sheet = doc->SheetAt(i);
    if (sheet && !sheet->Disabled()) {
      // Cache by sheet identity (stable for the page's life; the map is cleared on
      // navigation). Stylesheets almost never change after load, so this turns repeated
      // dirty ticks' CSS cost into a map lookup.
      std::string key = std::to_string((uintptr_t)sheet);
      auto it = g_mirrorCssCache.find(key);
      if (it != g_mirrorCssCache.end()) {
        json.Append('"');
        json.Append(it->second.c_str());
        json.Append('"');
        continue;
      }
      if (ServoCSSRuleList* rules = sheet->GetCssRulesInternal()) {
        nsCString css;
        uint32_t n = rules->Length();
        for (uint32_t k = 0; k < n; k++) {
          if (css::Rule* rule = rules->GetRule(k)) {
            nsAutoCString t;
            rule->GetCssText(t);
            css.Append(t);
            css.Append('\n');
          }
        }
        if (!css.IsEmpty()) {
          nsAutoCString b64;
          if (NS_SUCCEEDED(Base64Encode(css.get(), css.Length(), b64))) {
            dataUrl.AssignLiteral("data:text/css;charset=utf-8;base64,");
            dataUrl.Append(b64);
          }
        }
      }
      if (!dataUrl.IsEmpty()) {
        g_mirrorCssCache[key].assign(dataUrl.get(), dataUrl.Length());
      }
    }
    json.Append('"');
    json.Append(dataUrl);
    json.Append('"');
  }
  json.Append(']');
  return strdup(json.get());
}

// DOM-mirror canvas inlining (op=8). A <canvas> can't be serialized as markup -- its
// pixels live in a backing surface. Snapshot each one (privileged readback, so WebGL and
// cross-origin-tainted canvases are fine) and hand back data:image/png URLs in document
// order; the JS side swaps each <canvas> for an <img> with these pixels.
char* mirror_collect_canvases() {
  using namespace mozilla;
  using mozilla::dom::Document;
  using mozilla::dom::HTMLCanvasElement;
  if (!g_docShell) return strdup("[]");
  PresShell* ps = g_docShell->GetPresShell();
  if (!ps) return strdup("[]");
  Document* doc = ps->GetDocument();
  if (!doc) return strdup("[]");

  // Composed-tree order (shadow + same-origin iframes), matching the serializer's tokens.
  nsTArray<RefPtr<mozilla::dom::Element>> imgEls, cvEls;
  if (mozilla::dom::Element* root = doc->GetDocumentElement()) {
    mirror_walk(root, imgEls, cvEls);
  }
  uint32_t count = cvEls.Length();
  nsCString json;
  json.Append('[');
  for (uint32_t i = 0; i < count; i++) {
    if (i) json.Append(',');
    nsCString dataUrl;
    HTMLCanvasElement* canvas = HTMLCanvasElement::FromNodeOrNull(cvEls[i]);
    if (canvas) {
      RefPtr<gfx::SourceSurface> surf = canvas->GetSurfaceSnapshot();
      if (surf) {
        Maybe<nsTArray<uint8_t>> bytes = gfxUtils::EncodeSourceSurfaceAsBytes(
            surf, ImageType::PNG, u""_ns);
        if (bytes && !bytes->IsEmpty()) {
          nsAutoCString b64;
          if (NS_SUCCEEDED(Base64Encode((const char*)bytes->Elements(),
                                        bytes->Length(), b64))) {
            dataUrl.AssignLiteral("data:image/png;base64,");
            dataUrl.Append(b64);
          }
        }
      }
    }
    json.Append('"');
    json.Append(dataUrl);
    json.Append('"');
  }
  json.Append(']');
  return strdup(json.get());
}
