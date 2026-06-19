// C implementations of the encoding_rs C API + misc Rust hooks that SpiderMonkey's
// libjs_static.a references but which aren't built in the standalone --enable-project=js
// objdir (no Rust staticlib). Correct for valid ASCII/UTF-8/UTF-16 (what the harness runs);
// invalid-input edge cases are handled conservatively. Signatures match dist/include/
// encoding_rs.h + encoding_rs_mem.h.
#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>
#include <stdlib.h>

void install_rust_hooks(void) {}
int pthread_setname_np(unsigned long t, const char* n) { (void)t; (void)n; return 0; }

// mozjemalloc arena API: this standalone build has no MOZ_MEMORY, so the GC/allocator use
// emscripten's libc malloc. SpiderMonkey still references the arena API -> map it to plain
// malloc (arena ignored). arena_id_t == size_t.
size_t moz_create_arena_with_params(void* params) { (void)params; return 1; }
void moz_dispose_arena(size_t a) { (void)a; }
void* moz_arena_malloc(size_t a, size_t n) { (void)a; return malloc(n); }
void* moz_arena_calloc(size_t a, size_t n, size_t s) { (void)a; return calloc(n, s); }
void* moz_arena_realloc(size_t a, void* p, size_t n) { (void)a; return realloc(p, n); }
void moz_arena_free(size_t a, void* p) { (void)a; free(p); }

// --- ASCII / UTF-8 validation ----------------------------------------------------------
size_t encoding_ascii_valid_up_to(const uint8_t* buf, size_t len) {
  for (size_t i = 0; i < len; i++) if (buf[i] >= 0x80) return i;
  return len;
}

static size_t utf8_valid_prefix(const uint8_t* b, size_t len) {
  size_t i = 0;
  while (i < len) {
    uint8_t c = b[i];
    if (c < 0x80) { i++; continue; }
    size_t n; uint32_t lo, hi;
    if ((c & 0xE0) == 0xC0) { n = 1; lo = 0x80; hi = 0x7FF; }
    else if ((c & 0xF0) == 0xE0) { n = 2; lo = 0x800; hi = 0xFFFF; }
    else if ((c & 0xF8) == 0xF0) { n = 3; lo = 0x10000; hi = 0x10FFFF; }
    else return i;
    if (i + n >= len + 0) { /* maybe incomplete */ }
    if (i + n > len - 0) {}
    if (i + 1 + n > len) return i;  // incomplete trailing sequence
    uint32_t cp = c & (0x7F >> n);
    for (size_t k = 1; k <= n; k++) {
      uint8_t t = b[i + k];
      if ((t & 0xC0) != 0x80) return i;
      cp = (cp << 6) | (t & 0x3F);
    }
    if (cp < lo || cp > hi || (cp >= 0xD800 && cp <= 0xDFFF)) return i;
    i += n + 1;
  }
  return len;
}
size_t encoding_utf8_valid_up_to(const uint8_t* buf, size_t len) {
  return utf8_valid_prefix(buf, len);
}

// --- latin1 <-> utf16 ------------------------------------------------------------------
void encoding_mem_convert_latin1_to_utf16(const char* src, size_t slen,
                                          uint16_t* dst, size_t dlen) {
  size_t n = slen < dlen ? slen : dlen;
  for (size_t i = 0; i < n; i++) dst[i] = (uint8_t)src[i];
}
void encoding_mem_convert_utf16_to_latin1_lossy(const uint16_t* src, size_t slen,
                                                char* dst, size_t dlen) {
  size_t n = slen < dlen ? slen : dlen;
  for (size_t i = 0; i < n; i++) dst[i] = (char)(uint8_t)src[i];
}

// --- utf8 -> utf16 (input assumed valid) -----------------------------------------------
size_t encoding_mem_convert_utf8_to_utf16_without_replacement(const char* src8,
                                                              size_t slen,
                                                              uint16_t* dst,
                                                              size_t dlen) {
  const uint8_t* s = (const uint8_t*)src8;
  size_t i = 0, o = 0;
  while (i < slen && o < dlen) {
    uint8_t c = s[i];
    uint32_t cp; size_t n;
    if (c < 0x80) { cp = c; n = 0; }
    else if ((c & 0xE0) == 0xC0) { cp = c & 0x1F; n = 1; }
    else if ((c & 0xF0) == 0xE0) { cp = c & 0x0F; n = 2; }
    else { cp = c & 0x07; n = 3; }
    if (i + n >= slen + 1) { if (i + 1 + n > slen) break; }
    for (size_t k = 1; k <= n; k++) cp = (cp << 6) | (s[i + k] & 0x3F);
    i += n + 1;
    if (cp <= 0xFFFF) { dst[o++] = (uint16_t)cp; }
    else {
      if (o + 2 > dlen) break;
      cp -= 0x10000;
      dst[o++] = (uint16_t)(0xD800 + (cp >> 10));
      dst[o++] = (uint16_t)(0xDC00 + (cp & 0x3FF));
    }
  }
  return o;
}

// --- utf16 -> utf8 ---------------------------------------------------------------------
static size_t utf16_to_utf8(const uint16_t* src, size_t slen, char* dst, size_t dlen,
                            size_t* readOut) {
  size_t i = 0, o = 0;
  while (i < slen) {
    uint32_t cp = src[i];
    size_t adv = 1;
    if (cp >= 0xD800 && cp <= 0xDBFF && i + 1 < slen &&
        src[i + 1] >= 0xDC00 && src[i + 1] <= 0xDFFF) {
      cp = 0x10000 + ((cp - 0xD800) << 10) + (src[i + 1] - 0xDC00);
      adv = 2;
    }
    size_t need = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    if (o + need > dlen) break;
    if (cp < 0x80) { dst[o++] = (char)cp; }
    else if (cp < 0x800) {
      dst[o++] = (char)(0xC0 | (cp >> 6)); dst[o++] = (char)(0x80 | (cp & 0x3F));
    } else if (cp < 0x10000) {
      dst[o++] = (char)(0xE0 | (cp >> 12));
      dst[o++] = (char)(0x80 | ((cp >> 6) & 0x3F));
      dst[o++] = (char)(0x80 | (cp & 0x3F));
    } else {
      dst[o++] = (char)(0xF0 | (cp >> 18));
      dst[o++] = (char)(0x80 | ((cp >> 12) & 0x3F));
      dst[o++] = (char)(0x80 | ((cp >> 6) & 0x3F));
      dst[o++] = (char)(0x80 | (cp & 0x3F));
    }
    i += adv;
  }
  if (readOut) *readOut = i;
  return o;
}
size_t encoding_mem_convert_utf16_to_utf8(const uint16_t* src, size_t slen,
                                          char* dst, size_t dlen) {
  return utf16_to_utf8(src, slen, dst, dlen, NULL);
}
void encoding_mem_convert_utf16_to_utf8_partial(const uint16_t* src, size_t* slen,
                                                char* dst, size_t* dlen) {
  size_t read = 0;
  size_t wrote = utf16_to_utf8(src, *slen, dst, *dlen, &read);
  *slen = read; *dlen = wrote;
}

// --- latin1 -> utf8 (partial) ----------------------------------------------------------
void encoding_mem_convert_latin1_to_utf8_partial(const char* src, size_t* slen,
                                                 char* dst, size_t* dlen) {
  const uint8_t* s = (const uint8_t*)src;
  size_t i = 0, o = 0, n = *slen, dn = *dlen;
  while (i < n) {
    uint8_t c = s[i];
    size_t need = c < 0x80 ? 1 : 2;
    if (o + need > dn) break;
    if (c < 0x80) dst[o++] = (char)c;
    else { dst[o++] = (char)(0xC0 | (c >> 6)); dst[o++] = (char)(0x80 | (c & 0x3F)); }
    i++;
  }
  *slen = i; *dlen = o;
}

// --- utf16 validity --------------------------------------------------------------------
size_t encoding_mem_utf16_valid_up_to(const uint16_t* buf, size_t len) {
  size_t i = 0;
  while (i < len) {
    uint16_t u = buf[i];
    if (u >= 0xD800 && u <= 0xDBFF) {
      if (i + 1 < len && buf[i + 1] >= 0xDC00 && buf[i + 1] <= 0xDFFF) { i += 2; continue; }
      return i;
    }
    if (u >= 0xDC00 && u <= 0xDFFF) return i;  // unpaired low surrogate
    i++;
  }
  return len;
}
void encoding_mem_ensure_utf16_validity(uint16_t* buf, size_t len) {
  size_t i = 0;
  while (i < len) {
    uint16_t u = buf[i];
    if (u >= 0xD800 && u <= 0xDBFF) {
      if (i + 1 < len && buf[i + 1] >= 0xDC00 && buf[i + 1] <= 0xDFFF) { i += 2; continue; }
      buf[i] = 0xFFFD; i++;
    } else if (u >= 0xDC00 && u <= 0xDFFF) { buf[i] = 0xFFFD; i++; }
    else i++;
  }
}

// --- latin1 predicates -----------------------------------------------------------------
bool encoding_mem_is_utf16_latin1(const uint16_t* buf, size_t len) {
  for (size_t i = 0; i < len; i++) if (buf[i] > 0xFF) return false;
  return true;
}
bool encoding_mem_is_utf8_latin1(const char* buf, size_t len) {
  const uint8_t* b = (const uint8_t*)buf;
  size_t i = 0;
  while (i < len) {
    uint8_t c = b[i];
    if (c < 0x80) { i++; continue; }
    if ((c & 0xE0) == 0xC0 && i + 1 < len) {
      uint32_t cp = ((c & 0x1F) << 6) | (b[i + 1] & 0x3F);
      if (cp > 0xFF) return false;
      i += 2;
    } else return false;
  }
  return true;
}

// String.prototype.normalize backing (intl Rust); not exercised by the JIT harness.
void js_normalize(void) { abort(); }
